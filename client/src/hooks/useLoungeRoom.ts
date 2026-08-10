/**
 * useLoungeRoom
 * ---------------------------------------------------------------------------
 * Real-time membership of one lounge room: connection state, occupants,
 * messages, and sending.
 *
 * Room-agnostic by construction. `useLoungeRoom("football-lounge")` works the
 * day that room is enabled in `shared/lounge.ts`, with no change here.
 *
 *
 * THE BUG THIS HOOK EXISTS TO NOT REPEAT
 * --------------------------------------
 * The previous page created a socket and listened for `connect` and
 * `disconnect` only. Socket.IO reports a REJECTED HANDSHAKE as `connect_error`
 * — a third event, on a socket that will never emit `connect`. With no
 * listener for it, a refusal was indistinguishable from a slow network, and
 * the header rendered "Connecting…" forever.
 *
 * So: `connect_error` is handled first here, and `state` has an `error` value
 * with somewhere to put the reason. `canSend` is derived from a live socket
 * AND a confirmed room join — never from optimism. If the server has not
 * confirmed the join, the composer stays disabled and says why.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  LOUNGE_NAMESPACE,
  LOUNGE_EVENTS,
  type LoungeChatMessage,
  type LoungeConnectionState,
  type LoungeErrorPayload,
  type LoungeJoinedPayload,
  type LoungeMembershipPayload,
  type LoungeOccupant,
  type LoungePresencePayload,
} from "@shared/lounge";

export interface UseLoungeRoomResult {
  state: LoungeConnectionState;
  /** Human-readable reason when `state` is `error`, or a refusal after join. */
  problem: LoungeErrorPayload | null;
  /** True once the SERVER has confirmed this member is in the room. */
  inRoom: boolean;
  occupants: LoungeOccupant[];
  messages: LoungeChatMessage[];
  /** The only correct condition for enabling a send control. */
  canSend: boolean;
  sendMessage: (text: string) => boolean;
  /** Manual retry after a terminal error. */
  reconnect: () => void;
}

const MAX_RENDERED_MESSAGES = 300;

export function useLoungeRoom(
  roomId: string,
  options: { enabled?: boolean } = {},
): UseLoungeRoomResult {
  const enabled = options.enabled !== false;

  const [state, setState] = useState<LoungeConnectionState>("disconnected");
  const [problem, setProblem] = useState<LoungeErrorPayload | null>(null);
  const [inRoom, setInRoom] = useState(false);
  const [occupants, setOccupants] = useState<LoungeOccupant[]>([]);
  const [messages, setMessages] = useState<LoungeChatMessage[]>([]);
  const [attempt, setAttempt] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  const append = useCallback((incoming: LoungeChatMessage | LoungeChatMessage[]) => {
    setMessages((prior) => {
      const next = prior.concat(incoming);
      return next.length > MAX_RENDERED_MESSAGES
        ? next.slice(next.length - MAX_RENDERED_MESSAGES)
        : next;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) {
      setState("disconnected");
      return;
    }

    setState("connecting");
    setProblem(null);
    setInRoom(false);

    /* Same-origin, session cookie carried by the handshake. `withCredentials`
     * is required or the session middleware sees an anonymous request and the
     * handshake is refused — which would look exactly like the old bug. */
    const socket = io(LOUNGE_NAMESPACE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 800,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setState("connected");
      setProblem(null);
      // Connected is not joined. The server decides that.
      socket.emit(LOUNGE_EVENTS.join, { roomId });
    });

    /* The listener whose absence caused the original defect. */
    socket.on("connect_error", (error: Error) => {
      setState("error");
      setInRoom(false);
      setProblem({
        code: "UNAUTHENTICATED",
        message:
          error?.message === "Unauthorized"
            ? "Your session was not accepted. Sign in again to enter the lounge."
            : error?.message || "The lounge connection was refused.",
        roomId,
        retryable: true,
      });
    });

    socket.on("disconnect", (reason: string) => {
      setInRoom(false);
      setOccupants([]);
      /* An explicit server-side disconnect will not auto-reconnect, so it is
       * an error the member must act on; anything else is a transient drop. */
      setState(reason === "io server disconnect" ? "error" : "disconnected");
    });

    socket.io.on("reconnect_attempt", () => setState("connecting"));
    socket.io.on("reconnect_failed", () => {
      setState("error");
      setProblem({
        code: "UNAUTHENTICATED",
        message: "Could not reconnect to the lounge.",
        roomId,
        retryable: true,
      });
    });

    socket.on(LOUNGE_EVENTS.joined, (payload: LoungeJoinedPayload) => {
      if (payload.roomId !== roomId) return;
      setInRoom(true);
      setProblem(null);
      setOccupants(payload.occupants);
    });

    socket.on(LOUNGE_EVENTS.history, (payload: { roomId: string; messages: LoungeChatMessage[] }) => {
      if (payload.roomId !== roomId) return;
      setMessages(payload.messages.slice(-MAX_RENDERED_MESSAGES));
    });

    socket.on(LOUNGE_EVENTS.chat, (payload: LoungeChatMessage) => {
      if (payload.roomId !== roomId) return;
      append(payload);
    });

    socket.on(LOUNGE_EVENTS.presence, (payload: LoungePresencePayload) => {
      if (payload.roomId !== roomId) return;
      setOccupants(payload.occupants);
    });

    const onMembership = (payload: LoungeMembershipPayload) => {
      if (payload.roomId !== roomId) return;
      // Presence is authoritative and follows immediately; nothing to do here
      // beyond letting the notice message render itself.
    };
    socket.on(LOUNGE_EVENTS.userJoined, onMembership);
    socket.on(LOUNGE_EVENTS.userLeft, onMembership);

    socket.on(LOUNGE_EVENTS.error, (payload: LoungeErrorPayload) => {
      setProblem(payload);
      /* A refusal to ENTER means not in the room, even though the socket is
       * healthy. Keep the connection state honest about each fact separately. */
      if (
        payload.code === "UH_VERIFICATION_REQUIRED" ||
        payload.code === "PROFILE_INCOMPLETE" ||
        payload.code === "MODERATOR_ONLY" ||
        payload.code === "ROOM_DISABLED" ||
        payload.code === "ROOM_FULL" ||
        payload.code === "UNKNOWN_ROOM"
      ) {
        setInRoom(false);
      }
    });

    return () => {
      socket.emit(LOUNGE_EVENTS.leave, { roomId });
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setInRoom(false);
      setOccupants([]);
      setState("disconnected");
    };
  }, [roomId, enabled, attempt, append]);

  const canSend = state === "connected" && inRoom;

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const socket = socketRef.current;
      if (!trimmed || !socket || !socket.connected) return false;
      socket.emit(LOUNGE_EVENTS.message, { roomId, message: trimmed });
      return true;
    },
    [roomId],
  );

  const reconnect = useCallback(() => setAttempt((n) => n + 1), []);

  return useMemo(
    () => ({ state, problem, inRoom, occupants, messages, canSend, sendMessage, reconnect }),
    [state, problem, inRoom, occupants, messages, canSend, sendMessage, reconnect],
  );
}

export default useLoungeRoom;
