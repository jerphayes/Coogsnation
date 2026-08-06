/**
 * LoungeChatOverlay
 * ---------------------------------------------------------------------------
 * Chat, presence and connection state, laid over a rendered venue.
 *
 * Room-agnostic: it takes the result of `useLoungeRoom` and renders it. The
 * Football Lounge will use this component unchanged.
 *
 * MOBILE FIRST. Below `sm` the overlay is a bottom sheet that collapses to a
 * single bar, because a chat panel covering a 3D scene on a phone means the
 * member paid the download cost of the engine to look at a text box. On
 * desktop it is a right-hand rail.
 *
 * The composer is disabled unless `canSend` — which the hook derives from a
 * live socket AND a server-confirmed room join. There is no optimistic path.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  LoungeChatMessage,
  LoungeConnectionState,
  LoungeErrorPayload,
  LoungeOccupant,
} from "@shared/lounge";

const STATE_LABEL: Record<LoungeConnectionState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection error",
};

const STATE_DOT: Record<LoungeConnectionState, string> = {
  connecting: "bg-amber-400 animate-pulse",
  connected: "bg-emerald-400",
  disconnected: "bg-zinc-500",
  error: "bg-red-500",
};

export interface LoungeChatOverlayProps {
  roomLabel: string;
  state: LoungeConnectionState;
  problem: LoungeErrorPayload | null;
  inRoom: boolean;
  occupants: LoungeOccupant[];
  messages: LoungeChatMessage[];
  canSend: boolean;
  onSend: (text: string) => boolean;
  onRetry: () => void;
}

export function LoungeChatOverlay(props: LoungeChatOverlayProps) {
  const { roomLabel, state, problem, inRoom, occupants, messages, canSend, onSend, onRetry } = props;

  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* Follow the conversation, but only when already near the bottom — yanking
   * someone out of scrollback to show a new arrival notice is hostile. */
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const submit = () => {
    if (!canSend) return;
    if (onSend(draft)) setDraft("");
  };

  const composerHint = !canSend
    ? state === "connecting"
      ? "Connecting to the lounge…"
      : problem?.message || "You are not connected to the lounge."
    : "";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-end p-2 sm:inset-y-0 sm:left-auto sm:w-[22rem] sm:p-4",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex w-full flex-col overflow-hidden rounded-lg border border-white/15 bg-black/70 text-white backdrop-blur-md",
          open ? "max-h-[70vh]" : "max-h-14",
          "sm:max-h-none sm:h-full",
        )}
      >
        {/* ── header: room, state, roster toggle ─────────────────── */}
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", STATE_DOT[state])} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{roomLabel}</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60">
              {STATE_LABEL[state]}
              {state === "connected" && !inRoom && " · not in room"}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            aria-pressed={showRoster}
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
          >
            {occupants.length} online
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10 sm:hidden"
          >
            {open ? "Hide" : "Chat"}
          </button>
        </div>

        {/* ── roster ─────────────────────────────────────────────── */}
        {showRoster && (
          <div className="max-h-32 overflow-y-auto border-b border-white/10 px-3 py-2">
            {occupants.length === 0 ? (
              <p className="text-xs text-white/50">Nobody else is here yet.</p>
            ) : (
              <ul className="space-y-1">
                {occupants.map((occupant) => (
                  <li key={occupant.userId} className="flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    <span className="truncate">{occupant.displayName}</span>
                    {occupant.seatIndex !== null && (
                      <span className="ml-auto text-white/40">seat {occupant.seatIndex + 1}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── refusal / error ────────────────────────────────────── */}
        {problem && (
          <div className="border-b border-amber-400/30 bg-amber-500/10 px-3 py-2">
            <p className="text-xs text-amber-100">{problem.message}</p>
            {problem.retryable && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-xs underline underline-offset-2 hover:text-white"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {/* ── messages ───────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className={cn("flex-1 space-y-2 overflow-y-auto px-3 py-3", !open && "hidden sm:block")}
          role="log"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="text-xs text-white/50">
              {inRoom
                ? "No messages yet. Say hello."
                : "Messages appear once you are in the lounge."}
            </p>
          ) : (
            messages.map((message) =>
              message.system ? (
                <p key={message.id} className="text-center text-[11px] italic text-white/45">
                  {message.message}
                </p>
              ) : (
                <div key={message.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-xs font-semibold text-amber-200">
                      {message.displayName}
                    </span>
                    <time className="text-[10px] text-white/40">
                      {new Date(message.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="break-words text-white/90">{message.message}</p>
                </div>
              ),
            )
          )}
        </div>

        {/* ── composer ───────────────────────────────────────────── */}
        <div className={cn("border-t border-white/10 p-2", !open && "hidden sm:block")}>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              disabled={!canSend}
              maxLength={2000}
              placeholder={canSend ? "Type a message…" : composerHint}
              aria-label="Message the lounge"
              className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
            />
            <Button type="button" onClick={submit} disabled={!canSend || !draft.trim()} size="sm">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoungeChatOverlay;
