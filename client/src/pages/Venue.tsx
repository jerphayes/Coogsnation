import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  VENUE_API,
  isVenueId,
  type VenueUserContext,
  type VenueBridgeEvent,
} from "@shared/venue";
import type { VenueSession } from "@/venue-engine";
import UniversalParticipationGate from "@/components/UniversalParticipationGate";

/**
 * Immersive venue page.
 *
 * LAZY LOADING is the whole point of this file's shape. The engine and
 * Three.js together are roughly 700 KB, and CoogsNation is mobile-first — so
 * they must not exist in the initial bundle. The dynamic `import()` inside the
 * effect means the browser downloads the engine only when a member actually
 * enters a venue, and normal pages keep loading at their current speed.
 *
 * The engine is created imperatively and torn down on unmount. React owns the
 * container; the engine owns everything inside it and nothing outside it.
 */
export default function Venue() {
  const params = useParams<{ venueId?: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<VenueSession | null>(null);
  /** Guards against React 18 StrictMode double-invoking the effect. */
  const bootingRef = useRef(false);

  const [progress, setProgress] = useState({ fraction: 0, message: "Preparing" });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);

  const venueId = params.venueId ?? "football";

  /* Permission context. The server computes it; the engine only consumes it. */
  const { data: contextData, isLoading: contextLoading, error: contextError } =
    useQuery<{ context: VenueUserContext }>({
      queryKey: [VENUE_API.context],
      enabled: isAuthenticated,
      retry: false,
      staleTime: 5 * 60 * 1000,
    });

  const handleBridgeEvent = useCallback((event: VenueBridgeEvent) => {
    if (event.name === "venue:error") {
      const payload = event.payload as { scope: string; message: string; fatal: boolean };
      if (payload.fatal) setError(payload.message);
      else setNotices((prior) => [...prior.slice(-4), `${payload.scope}: ${payload.message}`]);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !contextData?.context || !containerRef.current) return;
    if (!isVenueId(venueId)) {
      setError(`Unknown venue "${venueId}".`);
      return;
    }
    if (bootingRef.current) return;
    bootingRef.current = true;

    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      try {
        // Dynamic import: the engine and Three.js download only now.
        const { createVenueSession } = await import("@/venue-engine/session");
        if (cancelled) return;

        const session = await createVenueSession({
          container,
          venueId,
          user: contextData.context,
          onProgress: (fraction, message) => {
            if (!cancelled) setProgress({ fraction, message });
          },
        });

        if (cancelled) {
          // Navigated away mid-boot. Tear down rather than leak a renderer.
          await session.dispose();
          return;
        }

        sessionRef.current = session;
        session.bridge.onAny(handleBridgeEvent);
        setReady(true);
      } catch (caught) {
        if (cancelled) return;
        const message = caught instanceof Error ? caught.message : "Failed to load the venue";
        console.error("[venue] boot failed:", caught);
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      bootingRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      setReady(false);
      if (session) void session.dispose();
    };
  }, [isAuthenticated, contextData, venueId, handleBridgeEvent]);

  /* Release GPU work while the tab is hidden — battery matters on mobile. */
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

  if (authLoading || contextLoading) {
    return <VenueMessage title="Loading" detail="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <UniversalParticipationGate
          open
          onOpenChange={(open) => {
            if (!open) navigate("/");
          }}
          returnTo={`${window.location.pathname}${window.location.search}`}
          description="CoogsNation venues are member participation spaces. Join or sign in to enter the venue."
        />

        <VenueMessage
          title="Membership required"
          detail="Join or sign in to enter this CoogsNation venue."
        />
      </div>
    );
  }

  if (contextError) {
    return (
      <VenueMessage
        title="Unable to enter"
        detail="Your venue access could not be confirmed. Please try again."
        action={{ label: "Back", onClick: () => navigate("/") }}
      />
    );
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-black">
      <div ref={containerRef} className="venue-container absolute inset-0" />

      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 text-white">
          <div className="text-sm uppercase tracking-[0.2em] text-white/70">
            {progress.message}
          </div>
          <div className="h-1 w-64 overflow-hidden rounded bg-white/15">
            <div
              className="h-full bg-white/80 transition-[width] duration-200"
              style={{ width: `${Math.round(progress.fraction * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 p-6 text-center text-white">
          <div className="text-lg font-semibold">This venue could not be opened</div>
          <p className="max-w-md text-sm text-white/70">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
          >
            Back to CoogsNation
          </button>
        </div>
      )}

      {notices.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 space-y-1">
          {notices.map((notice, index) => (
            <div key={index} className="rounded bg-black/70 px-3 py-1 text-xs text-amber-200">
              {notice}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VenueMessage(props: {
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-lg font-semibold">{props.title}</div>
      <p className="max-w-md text-sm text-muted-foreground">{props.detail}</p>
      {props.action && (
        <button
          type="button"
          onClick={props.action.onClick}
          className="rounded border px-4 py-2 text-sm hover:bg-accent"
        >
          {props.action.label}
        </button>
      )}
    </div>
  );
}
