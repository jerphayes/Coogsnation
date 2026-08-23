/**
 * CoogpawsChat — the Coog Paws Lounge
 * ---------------------------------------------------------------------------
 * The Coog Paws page is now an immersive room: the Virtual Venue Engine
 * renders the lounge, and chat, presence and connection state are laid over
 * it. It is the first lounge and the template for the rest.
 *
 * WHAT THIS PAGE IS AND IS NOT
 * ----------------------------
 * It is NOT a Three.js page. There is no renderer, no scene, no geometry and
 * no `three` import anywhere in this file — a second parallel 3D system was
 * explicitly rejected. The lounge is a VENUE (`venue-engine/venues/
 * CoogPawsLounge.js`) loaded through the same registry, session factory and
 * teardown path as the stadium venues. Everything here is composition:
 *
 *   the room      → `LOUNGE_ROOMS.coogpaws` in shared/lounge.ts
 *   the rendering → `createVenueSession({ venueId: room.venueId })`
 *   the chat      → `useLoungeRoom(room.id)`
 *   the controls  → `session.venueOptions()` / `setVenueOption()` (ADR-020)
 *
 * Nothing above names Coog Paws except the room id, which is why the Football
 * Lounge is a registry entry rather than a copy of this file.
 *
 * LAZY LOADING is preserved from `Venue.tsx` and matters more here, not less:
 * the engine and Three.js are ~700 KB and must stay out of the initial bundle
 * on a mobile-first site.
 *
 * DEGRADATION. If the engine cannot boot — no WebGL, a lost context, a driver
 * failure — the room does not fail. The 3D drops away and the chat continues
 * on its own, because a member on a device that cannot render a lounge should
 * still be able to talk to the people in it.
 */

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLoungeRoom } from "@/hooks/useLoungeRoom";
import { LoungeChatOverlay } from "@/components/lounge/LoungeChatOverlay";
import { VENUE_API, type VenueUserContext } from "@shared/venue";
import { getLoungeRoom } from "@shared/lounge";
import type { VenueOption, VenueSession } from "@/venue-engine";

/** The room this page presents. The only Coog Paws-specific value in the file. */
const ROOM_ID = "coogpaws";

/** Chairs in the lounge. Matches the venue's measured seat manifest. */
const SEAT_COUNT = 8;

/** Cheap capability probe. Cheaper than booting 700 KB to find out. */
function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export default function CoogpawsChat() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // TEMP TEST MODE:
  // Coog Paws uses direct anonymous /lounge socket access.
  // Do not create or poll an HTTP guest session.

  const room = getLoungeRoom(ROOM_ID);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<VenueSession | null>(null);
  /** Guards against React 18 StrictMode double-invoking the boot effect. */
  const bootingRef = useRef(false);

  const [progress, setProgress] = useState({ fraction: 0, message: "Preparing the lounge" });
  const [ready, setReady] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [options, setOptions] = useState<VenueOption[]>([]);
  const [seatIndex, setSeatIndex] = useState<number | null>(null);
  const [seatNotice, setSeatNotice] = useState<string | null>(null);
  const [seatBusy, setSeatBusy] = useState(false);
  // 3D venue intentionally quarantined on 2026-08-19.
  // Preserved at client/src/legacy/coogpaws-3d/.
  // Active Coog Paws Lounge is transitioning to the 2D visual-environment design.
  const render3d = false;

  // Clock-based A → B → C rotation. Every visitor sees the same room.
  const loungeBackgrounds = [
    "/coogpaws/lounge/rotation/A.png",
    "/coogpaws/lounge/rotation/B.png",
    "/coogpaws/lounge/rotation/C.png",
  ];

  const currentLoungeBackground = () =>
    loungeBackgrounds[
      Math.floor(Date.now() / 3_600_000) % loungeBackgrounds.length
    ];

  const [loungeBackground, setLoungeBackground] =
    useState(currentLoungeBackground);

  useEffect(() => {
    const updateBackground = () =>
      setLoungeBackground(currentLoungeBackground());

    let intervalId: number | undefined;

    const timeoutId = window.setTimeout(() => {
      updateBackground();
      intervalId = window.setInterval(
        updateBackground,
        3_600_000,
      );
    }, 3_600_000 - (Date.now() % 3_600_000) + 100);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  /* Chat runs independently of the renderer, and starts as soon as the member
   * is authenticated. A failed venue must never take the room down with it. */
  const lounge = useLoungeRoom(ROOM_ID, { enabled: true });

  const { data: contextData, isLoading: contextLoading } = useQuery<{ context: VenueUserContext }>({
    queryKey: [VENUE_API.context],
    enabled: isAuthenticated && render3d,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  /* ── boot the venue ─────────────────────────────────────────────── */

  useEffect(() => {
    if (!render3d || !room) return;
    if (!isAuthenticated || !contextData?.context || !containerRef.current) return;
    if (bootingRef.current) return;
    bootingRef.current = true;

    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      try {
        const { createVenueSession } = await import("@/venue-engine/session");
        if (cancelled) return;

        const session = await createVenueSession({
          container,
          venueId: room.venueId,
          user: contextData.context,
          onProgress: (fraction, message) => {
            if (!cancelled) setProgress({ fraction, message });
          },
        });

        if (cancelled) {
          await session.dispose();
          return;
        }

        sessionRef.current = session;
        setOptions(session.venueOptions());
        setReady(true);
      } catch (caught) {
        if (cancelled) return;
        console.error("[coogpaws] lounge boot failed:", caught);
        setVenueError(
          caught instanceof Error ? caught.message : "The lounge could not be rendered.",
        );
      }
    })();

    return () => {
      cancelled = true;
      bootingRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      setReady(false);
      setSeatIndex(null);
      if (session) void session.dispose();
    };
  }, [isAuthenticated, contextData, room, render3d]);

  /* Stop rendering while the tab is hidden. Battery matters on mobile, and the
   * chat socket stays open regardless — presence should not flap on tab-out. */
  useEffect(() => {
    const onVisibility = () => {
      const session = sessionRef.current;
      if (!session) return;
      if (document.hidden) session.pause();
      else session.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /* ── venue controls ─────────────────────────────────────────────── */

  const setOption = useCallback((key: string, value: string | boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.setVenueOption(key, value)) setOptions(session.venueOptions());
  }, []);

  /**
   * Take the next AVAILABLE chair.
   *
   * The server owns seat ownership, so this asks and reports the answer. It
   * does not assume seat 0 is free, and it does not stop at the first refusal
   * — an occupied chair means try the next one, which is what a person walking
   * into a lounge would do. A network failure is different and stops the walk
   * immediately, because retrying seven more times against a dead server just
   * produces seven more failures.
   */
  const takeSeat = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    setSeatNotice(null);
    setSeatBusy(true);
    try {
      const start = seatIndex === null ? 0 : seatIndex + 1;
      for (let step = 0; step < SEAT_COUNT; step++) {
        const candidate = (start + step) % SEAT_COUNT;
        if (candidate === seatIndex) continue;      // already sitting there

        const result = await session.claimSeat(candidate);
        if (result.ok) {
          setSeatIndex(result.seatIndex);
          return;
        }
        if (result.reason === "occupied") continue; // try the next chair
        setSeatNotice(result.message);              // network / auth — stop
        return;
      }
      setSeatNotice("Every chair is taken right now.");
    } finally {
      setSeatBusy(false);
    }
  }, [seatIndex]);

  const standUp = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setSeatNotice(null);
    await session.releaseSeat();
    setSeatIndex(null);
    session.setCameraView("lounge-home");
  }, []);

  /* ── gates ──────────────────────────────────────────────────────── */

  if (!room) {
    return <PageMessage title="Lounge unavailable" detail="This room is not configured." />;
  }

  // TEMP TEST MODE:
  // Coog Paws guest access does not wait on the normal account session.

  // TEMP TEST MODE: Coog Paws is intentionally open to anonymous guests.
  // Normal site authentication remains unchanged elsewhere.

  const projection = options.find((option) => option.key === "projection");
  const houseLights = options.find((option) => option.key === "houseLights");

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-black">

        <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {render3d && <div ref={containerRef} className="absolute inset-0" />}

        <nav className="absolute left-2 top-2 z-30 flex gap-2" aria-label="Lounge navigation">
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="rounded border border-white/25 bg-black/75 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md hover:bg-white hover:text-black"
            data-testid="button-exit-lounge"
          >
            Exit Lounge
          </button>
        </nav>

        {/* Boot progress. Chat is already usable underneath. */}
        {render3d && !ready && !venueError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">
              {contextLoading ? "Checking access" : progress.message}
            </div>
            <div className="h-1 w-56 overflow-hidden rounded bg-white/15">
              <div
                className="h-full bg-amber-300/80 transition-[width] duration-200"
                style={{ width: `${Math.round(progress.fraction * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Active 2D Lounge environment.
            The member + conversation are now the centerpiece.
            3D is preserved separately under client/src/legacy/coogpaws-3d/. */}
        {!render3d && (
          <div
            className="absolute inset-0 bg-black bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.30)), url('${loungeBackground}')`,
            }}
            aria-label="Coog Paws Lounge"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,.18)_62%,rgba(0,0,0,.55)_100%)]" />
          </div>
        )}

        {venueError && render3d && (
          <div className="absolute inset-0 bg-black" />
        )}

        {/* ── venue controls ─────────────────────────────────────── */}
        {ready && (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex flex-col items-center gap-2 px-2 sm:top-4">
            {projection?.kind === "enum" && (
              <div
                className="pointer-events-auto flex gap-1 rounded border border-amber-300/25 bg-black/65 p-1 backdrop-blur-md"
                role="group"
                aria-label="Projection"
              >
                {projection.values?.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => setOption("projection", choice.value)}
                    aria-pressed={projection.value === choice.value}
                    className={
                      "rounded px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition " +
                      (projection.value === choice.value
                        ? "bg-amber-300 text-black"
                        : "text-white/70 hover:bg-white/10 hover:text-white")
                    }
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}

            <div className="pointer-events-auto flex gap-1 rounded border border-amber-300/25 bg-black/65 p-1 backdrop-blur-md">
              {houseLights && (
                <button
                  type="button"
                  onClick={() => setOption("houseLights", !(houseLights.value === true))}
                  aria-pressed={houseLights.value === true}
                  className={
                    "rounded px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition " +
                    (houseLights.value === true
                      ? "bg-amber-300 text-black"
                      : "text-white/70 hover:bg-white/10 hover:text-white")
                  }
                >
                  House lights
                </button>
              )}
              <button
                type="button"
                onClick={takeSeat}
                disabled={seatBusy}
                className="rounded px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                {seatBusy ? "Seating…" : seatIndex === null ? "Take a seat" : `Seat ${seatIndex + 1} · move`}
              </button>
              {seatIndex !== null && (
                <button
                  type="button"
                  onClick={standUp}
                  className="rounded px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  Stand
                </button>
              )}
            </div>
          </div>
        )}

        {seatNotice && (
          <div className="pointer-events-none absolute inset-x-0 top-28 z-20 flex justify-center px-4">
            <p
              role="status"
              className="rounded border border-amber-300/40 bg-black/80 px-3 py-2 text-xs text-amber-100 backdrop-blur-md"
            >
              {seatNotice}
            </p>
          </div>
        )}



        <LoungeChatOverlay
          roomLabel={room.label}
          state={lounge.state}
          problem={lounge.problem}
          inRoom={lounge.inRoom}
          occupants={lounge.occupants}
          messages={lounge.messages}
          blockedUserIds={lounge.blockedUserIds}
          canSend={lounge.canSend}
          onSend={lounge.sendMessage}
          onTogglePaw={lounge.togglePaw}
          onReport={lounge.reportMessage}
          onToggleBlock={lounge.toggleBlock}
          onRetry={lounge.reconnect}
        />
        </div>
      </div>
    </div>
  );
}

function PageMessage(props: {
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-lg font-semibold">{props.title}</div>
        <p className="max-w-md text-sm text-muted-foreground">{props.detail}</p>
        {props.action && (
          <Button type="button" variant="outline" onClick={props.action.onClick}>
            {props.action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
