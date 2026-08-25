import { formatCentralChatTimestamp } from "@/lib/chatPresentation";
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

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type WindowMode = "normal" | "docked-left" | "docked-right" | "maximized" | "minimized";
type WindowRect = { x: number; y: number; width: number; height: number };

const WINDOW_STORAGE_KEY = "coogsnation-lounge-window-v2";
const WINDOW_GUTTER = 18;
const DESKTOP_BREAKPOINT = 768;

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export interface LoungeChatOverlayProps {
  roomLabel: string;
  state: LoungeConnectionState;
  problem: LoungeErrorPayload | null;
  inRoom: boolean;
  occupants: LoungeOccupant[];
  messages: LoungeChatMessage[];
  blockedUserIds?: string[];
  canSend: boolean;
  onSend: (text: string) => boolean;
  onTogglePaw?: (messageId: string) => boolean;
  onReport?: (messageId: string, reportedUserId: string, reason: string, details?: string) => boolean;
  onToggleBlock?: (blockedUserId: string) => boolean;
  onRetry: () => void;
}

export function LoungeChatOverlay(props: LoungeChatOverlayProps) {
  const { roomLabel, state, problem, inRoom, occupants, messages, blockedUserIds = [], canSend, onSend, onTogglePaw, onReport, onToggleBlock, onRetry } = props;

  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [displayMode, setDisplayMode] = useState<"dark" | "light">("dark");
  const [contrast, setContrast] = useState(100);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolValue, setToolValue] = useState("");
  const [reportReason, setReportReason] = useState("harassment");
  const [safetyTarget, setSafetyTarget] = useState<{ messageId: string; userId: string; displayName: string } | null>(null);
  const [windowMode, setWindowMode] = useState<WindowMode>("normal");
  const [windowRect, setWindowRect] = useState<WindowRect | null>(null);
  const isLight = displayMode === "light";

  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const restoreRectRef = useRef<WindowRect | null>(null);

  const isDesktop = () =>
    typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT;

  const getBounds = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { width: rect.width, height: rect.height } : null;
  };

  const fitRect = (rect: WindowRect, bounds: { width: number; height: number }) => {
    const width = clampValue(rect.width, 420, Math.max(420, bounds.width - 36));
    const height = clampValue(rect.height, 300, Math.max(300, bounds.height - 36));

    return {
      x: clampValue(rect.x, WINDOW_GUTTER, Math.max(WINDOW_GUTTER, bounds.width - width - WINDOW_GUTTER)),
      y: clampValue(rect.y, WINDOW_GUTTER, Math.max(WINDOW_GUTTER, bounds.height - height - WINDOW_GUTTER)),
      width,
      height,
    };
  };

  const defaultRect = (bounds: { width: number; height: number }) =>
    fitRect(
      {
        x: bounds.width * 0.025,
        y: bounds.height * 0.06,
        width: bounds.width * 0.42,
        height: bounds.height * 0.82,
      },
      bounds,
    );

  const modeRect = (
    mode: "docked-left" | "docked-right" | "maximized",
    bounds: { width: number; height: number },
  ): WindowRect => {
    if (mode === "maximized") {
      return {
        x: WINDOW_GUTTER,
        y: WINDOW_GUTTER,
        width: bounds.width - WINDOW_GUTTER * 2,
        height: bounds.height - WINDOW_GUTTER * 2,
      };
    }

    const width = Math.max(360, bounds.width * 0.42);
    return {
      x: mode === "docked-left" ? WINDOW_GUTTER : bounds.width - width - WINDOW_GUTTER,
      y: WINDOW_GUTTER * 2,
      width,
      height: bounds.height - WINDOW_GUTTER * 4,
    };
  };

  const restoreNormal = () => {
    const bounds = getBounds();
    if (!bounds) return;
    const rect = fitRect(restoreRectRef.current ?? defaultRect(bounds), bounds);
    restoreRectRef.current = rect;
    setWindowMode("normal");
    setWindowRect(rect);
  };

  const toggleMode = (mode: "docked-left" | "docked-right" | "maximized") => {
    if (!isDesktop()) return;
    const bounds = getBounds();
    if (!bounds) return;

    if (windowMode === mode) {
      restoreNormal();
      return;
    }

    if (windowMode === "normal" && windowRect) {
      restoreRectRef.current = fitRect(windowRect, bounds);
    }

    setWindowMode(mode);
    setWindowRect(modeRect(mode, bounds));
  };

  const toggleMinimize = () => {
    if (!isDesktop()) return;
    if (windowMode === "minimized") {
      restoreNormal();
      return;
    }

    const bounds = getBounds();
    if (!bounds || !windowRect) return;
    if (windowMode === "normal") restoreRectRef.current = fitRect(windowRect, bounds);

    const rect = fitRect(restoreRectRef.current ?? windowRect, bounds);
    setWindowMode("minimized");
    setWindowRect({ ...rect, height: 52 });
  };

  const resetWindowLayout = () => {
    const bounds = getBounds();
    if (!bounds) return;
    window.localStorage.removeItem(WINDOW_STORAGE_KEY);
    const rect = defaultRect(bounds);
    restoreRectRef.current = rect;
    setWindowMode("normal");
    setWindowRect(rect);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !isDesktop() ||
      windowMode !== "normal" ||
      !windowRect ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button")
    ) return;

    const bounds = getBounds();
    if (!bounds) return;

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = windowRect;
    document.body.style.userSelect = "none";

    const move = (moveEvent: PointerEvent) => {
      const rect = {
        ...start,
        x: clampValue(
          start.x + moveEvent.clientX - startX,
          WINDOW_GUTTER,
          Math.max(WINDOW_GUTTER, bounds.width - start.width - WINDOW_GUTTER),
        ),
        y: clampValue(
          start.y + moveEvent.clientY - startY,
          WINDOW_GUTTER,
          Math.max(WINDOW_GUTTER, bounds.height - start.height - WINDOW_GUTTER),
        ),
      };
      restoreRectRef.current = rect;
      setWindowRect(rect);
    };

    const stop = () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  const startResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    direction: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
  ) => {
    if (
      !isDesktop() ||
      windowMode !== "normal" ||
      !windowRect ||
      event.button !== 0
    ) return;

    const bounds = getBounds();
    if (!bounds) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const start = windowRect;
    const minWidth = Math.min(600, Math.max(320, bounds.width - WINDOW_GUTTER * 2));
    const minHeight = Math.min(400, Math.max(260, bounds.height - WINDOW_GUTTER * 2));
    const maxRight = bounds.width - WINDOW_GUTTER;
    const maxBottom = bounds.height - WINDOW_GUTTER;

    document.body.style.userSelect = "none";

    const move = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let x = start.x;
      let y = start.y;
      let width = start.width;
      let height = start.height;

      if (direction.includes("e")) {
        width = clampValue(
          start.width + deltaX,
          minWidth,
          Math.max(minWidth, maxRight - start.x),
        );
      }

      if (direction.includes("w")) {
        const nextX = clampValue(
          start.x + deltaX,
          WINDOW_GUTTER,
          start.x + start.width - minWidth,
        );
        width = start.width + (start.x - nextX);
        x = nextX;
      }

      if (direction.includes("s")) {
        height = clampValue(
          start.height + deltaY,
          minHeight,
          Math.max(minHeight, maxBottom - start.y),
        );
      }

      if (direction.includes("n")) {
        const nextY = clampValue(
          start.y + deltaY,
          WINDOW_GUTTER,
          start.y + start.height - minHeight,
        );
        height = start.height + (start.y - nextY);
        y = nextY;
      }

      const rect = fitRect({ x, y, width, height }, bounds);
      restoreRectRef.current = rect;
      setWindowRect(rect);
    };

    const stop = () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  useEffect(() => {
    if (!isDesktop()) return;
    const bounds = getBounds();
    if (!bounds) return;

    const fallback = defaultRect(bounds);
    try {
      const stored = JSON.parse(window.localStorage.getItem(WINDOW_STORAGE_KEY) || "null") as
        | { mode?: WindowMode; rect?: WindowRect; restoreRect?: WindowRect }
        | null;

      const valid =
        stored?.rect &&
        [stored.rect.x, stored.rect.y, stored.rect.width, stored.rect.height].every(Number.isFinite);

      if (!valid || !stored?.rect) {
        restoreRectRef.current = fallback;
        setWindowRect(fallback);
        return;
      }

      const restore =
        stored.restoreRect &&
        [stored.restoreRect.x, stored.restoreRect.y, stored.restoreRect.width, stored.restoreRect.height].every(Number.isFinite)
          ? fitRect(stored.restoreRect, bounds)
          : fitRect(stored.rect, bounds);

      restoreRectRef.current = restore;

      if (stored.mode === "docked-left" || stored.mode === "docked-right" || stored.mode === "maximized") {
        setWindowMode(stored.mode);
        setWindowRect(modeRect(stored.mode, bounds));
      } else if (stored.mode === "minimized") {
        setWindowMode("minimized");
        setWindowRect({ ...restore, height: 52 });
      } else {
        setWindowMode("normal");
        setWindowRect(fitRect(stored.rect, bounds));
      }
    } catch {
      restoreRectRef.current = fallback;
      setWindowRect(fallback);
    }
  }, []);

  useEffect(() => {
    if (!windowRect || !isDesktop()) return;
    window.localStorage.setItem(
      WINDOW_STORAGE_KEY,
      JSON.stringify({
        mode: windowMode,
        rect: windowRect,
        restoreRect: restoreRectRef.current,
      }),
    );
  }, [windowMode, windowRect]);

  useEffect(() => {
    const handleViewportResize = () => {
      if (!isDesktop()) {
        setWindowRect(null);
        return;
      }

      const bounds = getBounds();
      if (!bounds) return;

      if (windowMode === "normal") {
        setWindowRect((current) => {
          const rect = fitRect(
            current ?? restoreRectRef.current ?? defaultRect(bounds),
            bounds,
          );
          restoreRectRef.current = rect;
          return rect;
        });
      } else if (windowMode === "minimized") {
        const rect = fitRect(
          restoreRectRef.current ?? defaultRect(bounds),
          bounds,
        );
        restoreRectRef.current = rect;
        setWindowRect({ ...rect, height: 52 });
      } else {
        setWindowRect(modeRect(windowMode, bounds));
      }
    };

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, [windowMode]);

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

  // MEMBER CHAT UI PHASE 1
  const memberName = occupants[0]?.displayName || "Coog Member";
  const memberInitials =
    memberName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "CN";

  const composerTools = [
    ["coogpack", "🐾 Coog Pack"],
    ["attach", "＋ Attach"],
    ["article", "🔗 News / Article"],
    ["image", "🖼 Image"],
    ["video", "▶ Video"],
    ["commentary", "🎙 Fan Commentary"],
    ["ai", "✨ AI Entertainment"],
    ["pm", "✉ Message Request"],
    ["email", "📧 Private Email"],
  ] as const;

  const toolDetails: Record<string, { title: string; note: string }> = {
    coogpack: {
      title: "Coog Pack",
      note: "Choose a Coog reaction and add it to your message.",
    },
    attach: {
      title: "Attach",
      note: "Attach member media. Upload transport will be wired to the shared media service.",
    },
    article: {
      title: "News / Article",
      note: "Paste a public article URL. CoogsNation will create a safe preview card.",
    },
    image: {
      title: "Image",
      note: "Paste an image URL or use Attach for a local image.",
    },
    video: {
      title: "Video",
      note: "Paste a supported external video URL. CoogsNation stores the URL, not the video on the VPS.",
    },
    commentary: {
      title: "Fan Commentary",
      note: "Human-created audio or video only · 30 seconds maximum.",
    },
    ai: {
      title: "AI Entertainment",
      note: "Paste the URL to your AI creation. CoogsNation stores the URL, not the video payload.",
    },
    pm: {
      title: "Message Request",
      note: "Stranger → Message Request → recipient accepts → private conversation. First contact is text-only.",
    },
    email: {
      title: "Private Email",
      note: "CoogsNation relays approved email while keeping member email addresses hidden.",
    },
    safety: {
      title: "Block / Report",
      note: "Report abuse or block a member. Child-safety and grooming reports receive priority handling.",
    },
    rules: {
      title: "Posting Rules",
      note: "Read before posting. Violations may result in content removal, suspension, or permanent banning at CoogsNation's discretion.",
    },
    terms: {
      title: "Terms of Use",
      note: "Use of CoogsNation is subject to the Terms of Use and community rules.",
    },
    privacy: {
      title: "Privacy",
      note: "Private communications are not public, but may be processed for service operation, safety, abuse reports, enforcement, or legal obligations.",
    },
    copyright: {
      title: "Copyright / Content Removal",
      note: "Only post media you have the right to share. Unauthorized game broadcasts and other infringing material may be removed.",
    },
  };

  const toggleTool = (tool: string) => {
    setToolValue("");
    setActiveTool((current) => (current === tool ? null : tool));
  };

  const appendDraft = (value: string) => {
    setDraft((current) => (current.trim() ? `${current} ${value}` : value));
  };
  const panelStyle =
    windowRect && isDesktop()
      ? {
          left: `${windowRect.x}px`,
          top: `${windowRect.y}px`,
          width: `${windowRect.width}px`,
          height: `${windowRect.height}px`,
          filter: `contrast(${contrast}%)`,
        }
      : {
          filter: `contrast(${contrast}%)`,
        };

  const windowButtonClasses = cn(
    "inline-flex h-7 w-8 items-center justify-center rounded border text-xs",
    isLight
      ? "border-black/20 bg-white hover:bg-black/5"
      : "border-white/20 bg-black/40 hover:bg-white/10",
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto absolute inset-x-2 bottom-2 flex w-auto flex-col overflow-hidden rounded-[18px] border-2 backdrop-blur-md",
          isLight
            ? "border-zinc-300 bg-white/95 text-black"
            : "border-[#b7863d] bg-[#080706]/90 text-white",
          open ? "max-h-[72vh]" : "max-h-14",
          "sm:inset-auto sm:max-h-none sm:left-[5%] sm:top-[6%] sm:h-[88%] sm:w-[90%]",
          "ring-4 ring-black/80 outline outline-1 outline-[#e0b76a]/40",
        )}
        style={panelStyle}
      >
        {windowMode === "normal" && (
          <>
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "n")}
              className="absolute inset-x-4 top-0 z-50 hidden h-2 cursor-n-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "s")}
              className="absolute inset-x-4 bottom-0 z-50 hidden h-2 cursor-s-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "w")}
              className="absolute inset-y-4 left-0 z-50 hidden w-2 cursor-w-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "e")}
              className="absolute inset-y-4 right-0 z-50 hidden w-2 cursor-e-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "nw")}
              className="absolute left-0 top-0 z-[60] hidden h-4 w-4 cursor-nw-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "ne")}
              className="absolute right-0 top-0 z-[60] hidden h-4 w-4 cursor-ne-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "sw")}
              className="absolute bottom-0 left-0 z-[60] hidden h-4 w-4 cursor-sw-resize md:block"
            />
            <div
              aria-hidden="true"
              onPointerDown={(event) => startResize(event, "se")}
              className="absolute bottom-0 right-0 z-[60] hidden h-4 w-4 cursor-se-resize md:block"
            />
          </>
        )}

        {/* ── header: room, state, roster toggle ─────────────────── */}
        <div
          onPointerDown={startDrag}
          className={cn(
            "flex shrink-0 items-center gap-2 border-b px-4 py-3 md:cursor-move md:select-none",
            isLight
              ? "border-zinc-200 bg-white"
              : "border-[#b7863d]/40 bg-gradient-to-r from-[#160b0b]/95 via-black/95 to-[#160b0b]/95"
          )}
        >
          <span className={cn("h-2 w-2 shrink-0 rounded-full", STATE_DOT[state])} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{roomLabel}</div>
            <div className={cn("text-[11px] uppercase tracking-wider", isLight ? "text-black/55" : "text-white/60")}>
              {STATE_LABEL[state]}
              {state === "connected" && !inRoom && " · not in room"}
            </div>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => toggleMode("docked-left")}
              className={windowButtonClasses}
              title="Dock left"
              aria-label="Dock chat left"
            >
              ⇤
            </button>
            <button
              type="button"
              onClick={() => toggleMode("docked-right")}
              className={windowButtonClasses}
              title="Dock right"
              aria-label="Dock chat right"
            >
              ⇥
            </button>
            <button
              type="button"
              onClick={toggleMinimize}
              className={windowButtonClasses}
              title={windowMode === "minimized" ? "Restore" : "Minimize"}
              aria-label={windowMode === "minimized" ? "Restore chat" : "Minimize chat"}
            >
              —
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleMode("maximized")}
                  className={windowButtonClasses}
                  aria-label={
                    windowMode === "maximized"
                      ? "Restore chat"
                      : "Increase chat screen size"
                  }
                >
                  {windowMode === "maximized" ? "❐" : "□"}
                </button>
              </TooltipTrigger>

              <TooltipContent
                side="bottom"
                className="max-w-[230px] text-center"
              >
                <div className="text-xs font-semibold">
                  {windowMode === "maximized"
                    ? "Click to restore screen size"
                    : "Click to INCREASE SCREEN SIZE"}
                </div>

                <div className="mt-0.5 text-[10px] opacity-80">
                  DRAG EDGES TO CUSTOMIZE
                </div>
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              onClick={resetWindowLayout}
              className={windowButtonClasses}
              title="Reset layout"
              aria-label="Reset chat layout"
            >
              ↺
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            aria-pressed={showRoster}
            className={cn(
              "rounded border px-2 py-1 text-xs",
              isLight ? "border-black/20 hover:bg-black/5" : "border-white/20 hover:bg-white/10"
            )}
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
              <p className={cn("text-xs", isLight ? "text-black/50" : "text-white/50")}>Nobody else is here yet.</p>
            ) : (
              <ul className="space-y-1">
                {occupants.map((occupant) => (
                  <li key={occupant.userId} className="flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                    <span className="truncate">{occupant.displayName}</span>
                    {occupant.seatIndex !== null && (
                      <span className={cn("ml-auto", isLight ? "text-black/40" : "text-white/40")}>seat {occupant.seatIndex + 1}</span>
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

        {/* ── member identity + conversation ─────────────────────── */}
        <div className={cn("flex min-h-0 flex-1", !open && "hidden sm:flex")}>
          <aside
            className={cn(
              "hidden w-[220px] shrink-0 flex-col overflow-y-auto border-r p-3 md:flex",
              isLight ? "border-zinc-200 bg-zinc-50" : "border-[#b7863d]/30 bg-[#0d0909]",
            )}
            aria-label="Member identity and status"
          >
            <div className="mx-auto mt-1 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-[#b7863d] bg-gradient-to-br from-[#a7192a] to-black text-2xl font-black text-white shadow-lg">
              {memberInitials}
            </div>

            <div className="mt-2 truncate text-center text-sm font-black">{memberName}</div>

            <div className="mx-auto mt-2 rounded border border-[#b7863d]/70 bg-[#8d1420] px-2 py-1 text-[10px] font-black tracking-wider text-white">
              MEMBER STATUS
            </div>

            {[
              ["Member Since", "—"],
              ["Posts", "—"],
              ["Lounge Chats", "—"],
              ["Coog Paws", "—"],
              ["Active Streak", "—"],
              ["Next Level", "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className={cn(
                  "flex items-center justify-between gap-2 border-b py-2 text-[11px]",
                  isLight ? "border-black/10" : "border-white/10",
                )}
              >
                <span className={isLight ? "text-black/55" : "text-white/55"}>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}

            <div className="mt-3 flex justify-center gap-2" aria-label="Achievement slots">
              {["🏈", "🏀", "🐾", "🔥"].map((badge) => (
                <span
                  key={badge}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b7863d]/70 bg-black/20 text-sm"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <button
                type="button"
                className="col-span-2 rounded bg-[#8d1420] px-2 py-2 font-semibold text-white"
              >
                View Profile
              </button>
              <button
                type="button"
                onClick={() => toggleTool("pm")}
                className={cn("rounded border px-2 py-2", isLight ? "border-black/15" : "border-white/15")}
              >
                Message Request
              </button>
              <button
                type="button"
                onClick={() => toggleTool("email")}
                className={cn("rounded border px-2 py-2", isLight ? "border-black/15" : "border-white/15")}
              >
                Private Email
              </button>
              <button
                type="button"
                onClick={() => toggleTool("safety")}
                className={cn("col-span-2 rounded border px-2 py-2", isLight ? "border-black/15" : "border-white/15")}
              >
                Block / Report
              </button>
            </div>

            <p className={cn("mt-3 text-center text-[9px]", isLight ? "text-black/45" : "text-white/40")}>
              Rank, statistics and achievements populate from the member profile engine.
            </p>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* ── messages ─────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className={cn("text-xs", isLight ? "text-black/50" : "text-white/50")}>
                  {inRoom
                    ? "No messages yet. Say hello."
                    : "Messages appear once you are in the lounge."}
                </p>
              ) : (
                messages.filter((message) => message.system || !blockedUserIds.includes(message.userId)).map((message) =>
                  message.system ? (
                    <p
                      key={message.id}
                      className={cn(
                        "text-center text-[11px] italic",
                        isLight ? "text-black/45" : "text-white/45",
                      )}
                    >
                      {message.message}
                      <span className="ml-2 opacity-70">
                        {formatCentralChatTimestamp(message.sentAt)}
                      </span>
                    </p>
                  ) : (
                    <article key={message.id} className="text-sm">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className={cn(
                            "truncate text-xs font-bold",
                            isLight ? "text-amber-700" : "text-amber-200",
                          )}
                        >
                          {message.displayName}
                        </span>
                        <time className={cn("text-[10px]", isLight ? "text-black/40" : "text-white/40")}>
                          {formatCentralChatTimestamp(message.sentAt)}
                        </time>
                      </div>

                      <p className={cn("mt-1 break-words", isLight ? "text-black/90" : "text-white/90")}>
                        {message.message.split(/(https?:\/\/\S+)/g).map((part, index) =>
                          /^https?:\/\//i.test(part) ? (
                            <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">{part}</a>
                          ) : part,
                        )}
                      </p>

                      <div className="mt-1.5 flex items-center gap-4 text-[12px]">
                        <button
                          type="button"
                          onClick={() => appendDraft(`@${message.displayName}`)}
                          className={isLight ? "text-black/55 hover:text-black" : "text-white/55 hover:text-white"}
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => onTogglePaw?.(message.id)}
                          aria-pressed={Boolean(message.pawedByMe)}
                          aria-label={`Coog Paw. ${message.pawCount ?? 0} votes`}
                          title="Give this post a Coog Paw"
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[14px] font-bold transition",
                            message.pawedByMe
                              ? "bg-[#C8102E]/15"
                              : "hover:bg-[#C8102E]/10",
                          )}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 fill-current text-[#C8102E]",
                              message.pawedByMe && "drop-shadow-[0_0_4px_rgba(200,16,46,0.8)]",
                            )}
                            aria-hidden="true"
                          >
                            <circle cx="7.5" cy="5.5" r="2.2" />
                            <circle cx="16.5" cy="5.5" r="2.2" />
                            <circle cx="4.5" cy="10.5" r="2.2" />
                            <circle cx="19.5" cy="10.5" r="2.2" />
                            <path d="M12 9.5c-3.6 0-6.5 3.1-6.5 6.6 0 2.3 1.6 3.9 3.7 3.9 1 0 1.8-.4 2.8-.4s1.8.4 2.8.4c2.1 0 3.7-1.6 3.7-3.9 0-3.5-2.9-6.6-6.5-6.6Z" />
                          </svg>
                          <span className="font-bold">{message.pawCount ?? 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSafetyTarget({ messageId: message.id, userId: message.userId, displayName: message.displayName });
                            setReportReason("harassment");
                            setToolValue("");
                            setActiveTool("safety");
                          }}
                          className={isLight ? "text-black/50 hover:text-red-700" : "text-white/45 hover:text-red-300"}
                        >
                          Report
                        </button>
                      </div>
                    </article>
                  ),
                )
              )}
            </div>

            {/* ── widget panel ─────────────────────────────────────── */}
            {activeTool && (
              <div
                className={cn(
                  "mx-3 mb-2 rounded-lg border p-3 text-xs",
                  isLight ? "border-violet-200 bg-violet-50" : "border-[#b7863d]/45 bg-[#111]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className={isLight ? "text-violet-900" : "text-amber-200"}>
                    {toolDetails[activeTool]?.title || "Chat Tool"}
                  </strong>
                  <button
                    type="button"
                    onClick={() => setActiveTool(null)}
                    className="text-base opacity-60 hover:opacity-100"
                    aria-label="Close chat tool"
                  >
                    ×
                  </button>
                </div>

                <p className={cn("mt-1 text-[11px]", isLight ? "text-black/65" : "text-white/60")}>
                  {toolDetails[activeTool]?.note}
                </p>

                {activeTool === "coogpack" && (
                  <div className="mt-3 grid grid-cols-8 gap-1.5">
                    {["🐾", "🔥", "🏈", "🏀", "⚾", "❤️", "😂", "👏", "💥", "🏆", "📣", "🤘", "😎", "👀", "💪", "🎉"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => appendDraft(emoji)}
                        className={cn(
                          "h-8 rounded border text-base",
                          isLight ? "border-black/10 bg-white" : "border-white/10 bg-black/30",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {["article", "image", "video", "commentary", "ai", "pm", "email"].includes(activeTool) && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={toolValue}
                      onChange={(event) => setToolValue(event.target.value)}
                      placeholder={
                        activeTool === "ai"
                          ? "Paste your AI creation URL..."
                          : activeTool === "pm"
                            ? "Type first message request..."
                            : activeTool === "email"
                              ? "Type private email subject/message..."
                              : "Paste URL..."
                      }
                      className={cn(
                        "h-9 text-xs",
                        isLight
                          ? "border-black/15 bg-white text-black"
                          : "border-white/15 bg-white/10 text-white placeholder:text-white/35",
                      )}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!toolValue.trim()}
                      onClick={() => {
                        const title = toolDetails[activeTool]?.title || "Chat Tool";
                        const value = toolValue.trim();
                        if (["article", "image", "video", "commentary", "ai"].includes(activeTool) && !/^https?:\/\//i.test(value)) return;
                        appendDraft(`[${title}] ${value}`);
                        setToolValue("");
                        setActiveTool(null);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                )}

                {activeTool === "safety" && (
                  <div className="mt-3 space-y-2">
                    {safetyTarget ? (
                      <>
                        <p className="text-[11px]">Report / Block <strong>{safetyTarget.displayName}</strong></p>
                        <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="h-9 w-full rounded border border-white/15 bg-[#171717] px-2 text-xs text-white">
                          <option value="harassment">Harassment / Threat</option>
                          <option value="child-safety">Child Safety / Grooming</option>
                          <option value="sexual-content">Sexual / Exploitative Content</option>
                          <option value="private-information">Private Information / Doxxing</option>
                          <option value="spam-scam">Spam / Scam / Phishing</option>
                          <option value="impersonation">Impersonation</option>
                          <option value="copyright">Copyright</option>
                          <option value="other">Other</option>
                        </select>
                        <Input value={toolValue} onChange={(e) => setToolValue(e.target.value)} maxLength={1000} placeholder="Optional report details..." />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => { onReport?.(safetyTarget.messageId, safetyTarget.userId, reportReason, toolValue.trim()); setToolValue(""); setSafetyTarget(null); setActiveTool(null); }}>Submit Report</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => { onToggleBlock?.(safetyTarget.userId); setSafetyTarget(null); setActiveTool(null); }}>{blockedUserIds.includes(safetyTarget.userId) ? "Unblock Member" : "Block Member"}</Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] opacity-60">Use Report beneath a member post to report or block that member.</p>
                    )}
                  </div>
                )}

                {activeTool === "attach" && (
                  <input
                    type="file"
                    className="mt-3 block w-full text-[11px]"
                    aria-label="Attach media"
                  />
                )}

                {activeTool === "__legacy_commentary__" && (
                  <button
                    type="button"
                    onClick={() => {
                      appendDraft("[Fan Commentary · human-created · 30 sec max]");
                      setActiveTool(null);
                    }}
                    className="mt-3 rounded bg-[#8d1420] px-3 py-2 text-[11px] font-bold text-white"
                  >
                    Prepare Fan Commentary
                  </button>
                )}
              </div>
            )}

            {/* ── composer tools ───────────────────────────────────── */}
            <div
              className={cn(
                "border-t px-3 pt-2",
                isLight ? "border-zinc-200 bg-white" : "border-[#b7863d]/35 bg-black/85",
              )}
            >
              <div className="flex flex-wrap gap-1.5">
                {composerTools.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleTool(key)}
                    aria-pressed={activeTool === key}
                    className={cn(
                      "rounded border px-2 py-1.5 text-[10px] font-medium",
                      activeTool === key
                        ? "border-[#b7863d] bg-[#8d1420] text-white"
                        : isLight
                          ? "border-black/15 bg-zinc-50 text-black hover:bg-zinc-100"
                          : "border-white/15 bg-[#171717] text-white hover:bg-white/10",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── composer ─────────────────────────────────────────── */}
            <div
              className={cn(
                "p-3",
                isLight ? "bg-white" : "bg-black/85",
              )}
            >
              <div className="flex gap-2">
                <textarea
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
                  placeholder={canSend ? "Type a message, paste a link, or attach media…" : composerHint}
                  aria-label="Message the lounge"
                  className={cn(
                    "min-h-[46px] flex-1 resize-none rounded-md border px-3 py-2 text-sm outline-none",
                    isLight
                      ? "border-black/20 bg-white text-black placeholder:text-black/40"
                      : "border-white/20 bg-white/10 text-white placeholder:text-white/40",
                  )}
                />
                <Button
                  type="button"
                  onClick={submit}
                  disabled={!canSend || !draft.trim()}
                  className="self-stretch bg-[#a7192a] px-5 font-bold text-white hover:bg-[#8d1420]"
                >
                  SEND
                </Button>
              </div>
            </div>

            {/* ── display controls ─────────────────────────────────── */}
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 border-t px-3 py-2 text-[10px]",
                isLight ? "border-zinc-200 bg-white text-black" : "border-[#b7863d]/35 bg-black/90 text-white",
              )}
            >
              <span className="font-semibold">Display</span>

              <button
                type="button"
                onClick={() => setDisplayMode("dark")}
                className={cn(
                  "rounded border px-2 py-1",
                  displayMode === "dark"
                    ? "border-[#b7863d] bg-black text-white"
                    : "border-black/20 bg-zinc-100 text-black",
                )}
              >
                Black / White
              </button>

              <button
                type="button"
                onClick={() => setDisplayMode("light")}
                className={cn(
                  "rounded border px-2 py-1",
                  displayMode === "light"
                    ? "border-[#b7863d] bg-white text-black"
                    : "border-white/20 bg-zinc-900 text-white",
                )}
              >
                White / Black
              </button>

              <label className="ml-auto flex min-w-[180px] flex-1 items-center gap-2 sm:max-w-[300px]">
                <span className="whitespace-nowrap">Contrast</span>
                <input
                  type="range"
                  min="75"
                  max="125"
                  step="5"
                  value={contrast}
                  onChange={(event) => setContrast(Number(event.target.value))}
                  className="w-full"
                  aria-label="Screen contrast"
                />
                <span className="w-9 text-right">{contrast}%</span>
              </label>
            </div>

            {/* ── posting / policy bar ─────────────────────────────── */}
            <div
              className={cn(
                "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t px-3 py-2 text-[9px]",
                isLight ? "border-zinc-200 bg-zinc-50 text-black/60" : "border-white/10 bg-black/95 text-white/55",
              )}
            >
              <span>
                Read before posting. Violations may result in suspension or permanent banning at CoogsNation&apos;s discretion.
              </span>
              {[
                ["rules", "Posting Rules"],
                ["terms", "Terms of Use"],
                ["privacy", "Privacy"],
                ["copyright", "Copyright / Content Removal"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTool(key)}
                  className={cn(
                    "underline underline-offset-2",
                    isLight ? "text-amber-800" : "text-amber-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoungeChatOverlay;
