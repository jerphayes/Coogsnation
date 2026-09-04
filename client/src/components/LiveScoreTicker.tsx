import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { io } from "socket.io-client";

type TickerItem = {
  gameId: string;
  awayLabel: string;
  awayScore: number | null;
  homeLabel: string;
  homeScore: number | null;
  status: string;
  priority: number;
  accentKey: string;
};

type TickerSnapshot = {
  generatedAt: string;
  games: TickerItem[];
};

type UpsetAlert = {
  gameId: string;
  winner: { abbreviation: string };
  loser: { abbreviation: string; rank?: number | null };
  winnerScore: number;
  loserScore: number;
  severity: "top25" | "top10" | "top5" | "number1";
  holdMs: number;
  flashCount: number;
};

const RAINBOW = [
  ["#c8102e", "#7c3aed"],
  ["#2563eb", "#06b6d4"],
  ["#dc2626", "#f59e0b"],
  ["#9333ea", "#ec4899"],
  ["#059669", "#0ea5e9"],
  ["#d97706", "#dc2626"],
];

const TICKER_PIXELS_PER_SECOND = 50;

function score(value: number | null) {
  return value == null ? "–" : String(value);
}

function rankFromLabel(label: string): number | null {
  const match = label.match(/^#(\d{1,2})\s+/);
  if (!match) return null;
  const rank = Number(match[1]);
  return Number.isInteger(rank) && rank >= 1 && rank <= 25 ? rank : null;
}

function isPersistentUpset(game: TickerItem): boolean {
  if (game.status !== "FINAL") return false;
  if (game.awayScore == null || game.homeScore == null || game.awayScore === game.homeScore) {
    return false;
  }

  const awayRank = rankFromLabel(game.awayLabel);
  const homeRank = rankFromLabel(game.homeLabel);
  const awayWon = game.awayScore > game.homeScore;

  const winnerRank = awayWon ? awayRank : homeRank;
  const loserRank = awayWon ? homeRank : awayRank;

  if (loserRank == null || loserRank > 25) return false;
  return winnerRank == null || winnerRank > loserRank;
}

export function LiveScoreTicker() {
  const [snapshot, setSnapshot] = useState<TickerSnapshot>({
    generatedAt: new Date(0).toISOString(),
    games: [],
  });
  const [latestUpset, setLatestUpset] = useState<UpsetAlert | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/sports/ticker", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error(`Ticker HTTP ${response.status}`)),
      )
      .then((data: TickerSnapshot) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((error) =>
        console.warn("[SPORTS] Initial ticker fetch failed", error),
      );

    const socket = io("/sports", { withCredentials: true });
    socket.on("ticker:snapshot", (data: TickerSnapshot) => setSnapshot(data));
    socket.on("upset:alert", (alert: UpsetAlert) => setLatestUpset(alert));

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  const loopGames = useMemo(
    () => (snapshot.games.length ? [...snapshot.games, ...snapshot.games] : []),
    [snapshot.games],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !snapshot.games.length) return;

    const applyReadableSpeed = () => {
      const loopDistance = track.scrollWidth / 2;
      const durationSeconds = Math.max(
        1,
        loopDistance / TICKER_PIXELS_PER_SECOND,
      );

      track.style.animationDuration = `${durationSeconds}s`;
    };

    applyReadableSpeed();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(applyReadableSpeed)
        : null;

    observer?.observe(track);
    window.addEventListener("resize", applyReadableSpeed);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", applyReadableSpeed);
    };
  }, [snapshot.games.length]);

  if (!snapshot.games.length) return null;

  return (
    <section
      className="ngf-score-ticker"
      aria-label="College football live scores"
      data-testid="live-score-ticker"
    >
      <style>{`
        .ngf-score-ticker{
          height:52px;
          display:flex;
          overflow:hidden;
          background:#07101f;
          color:#fff;
          border-top:1px solid rgba(255,255,255,.12);
          border-bottom:1px solid rgba(255,255,255,.2)
        }
        .ngf-score-badge{
          height:52px;
          display:flex;
          align-items:center;
          gap:8px;
          padding:0 15px;
          background:linear-gradient(135deg,#b91c1c,#dc2626,#f97316);
          font-size:12px;
          font-weight:900;
          letter-spacing:.1em;
          white-space:nowrap;
          box-shadow:5px 0 18px rgba(0,0,0,.35);
          z-index:2
        }
        .ngf-score-dot{
          width:8px;
          height:8px;
          border-radius:999px;
          background:#6ee7b7;
          box-shadow:0 0 10px #6ee7b7
        }
        .ngf-score-window{overflow:hidden;flex:1}
        .ngf-score-track{
          height:52px;
          display:flex;
          width:max-content;
          align-items:stretch;
          animation:ngfScoreScroll 70s linear infinite
        }
        .ngf-score-game{
          display:flex;
          align-items:center;
          gap:8px;
          padding:0 20px;
          border-right:1px solid rgba(255,255,255,.2);
          font-size:15px;
          font-weight:900;
          white-space:nowrap;
          position:relative;
          overflow:hidden;
          isolation:isolate
        }
        .ngf-score-game:before{
          content:"";
          position:absolute;
          inset:0;
          z-index:-1;
          background:linear-gradient(110deg,var(--ngf-a),var(--ngf-b),transparent 92%);
          opacity:.58
        }
        .ngf-score-sep{color:rgba(255,255,255,.55)}
        .ngf-score-status{
          font-size:11px;
          background:rgba(255,255,255,.16);
          padding:4px 8px;
          border-radius:999px;
          color:#dff7ff;
          letter-spacing:.04em
        }
        .ngf-score-game.is-upset-game{
          border-left:3px solid #fff7ad;
          border-right:3px solid #fff7ad;
          animation:ngfUpsetGamePulse 1.25s ease-in-out infinite;
          z-index:3
        }
        .ngf-score-game.is-upset-game:before{
          opacity:.95;
          background:linear-gradient(
            110deg,
            #7c3aed 0%,
            #c8102e 28%,
            #f59e0b 62%,
            #0891b2 100%
          )
        }
        .ngf-score-upset-badge{
          font-size:10px;
          font-weight:950;
          background:#fff7ad;
          color:#7f1d1d;
          padding:4px 7px;
          border-radius:999px;
          letter-spacing:.08em;
          box-shadow:0 0 14px rgba(255,247,173,.95)
        }
        @keyframes ngfScoreScroll{
          from{transform:translateX(0)}
          to{transform:translateX(-50%)}
        }
        @keyframes ngfUpsetGamePulse{
          0%,100%{
            filter:brightness(1);
            box-shadow:
              inset 0 0 0 rgba(255,247,173,0),
              0 0 0 rgba(245,158,11,0)
          }
          50%{
            filter:brightness(2.05) saturate(1.4);
            box-shadow:
              inset 0 0 26px rgba(255,247,173,.92),
              0 0 24px rgba(245,158,11,.95)
          }
        }
        @media(max-width:620px){
          .ngf-score-badge{padding:0 10px;font-size:10px}
          .ngf-score-game{padding:0 14px;font-size:13px}
          .ngf-score-upset-badge{font-size:9px;padding:3px 6px}
        }
        @media(prefers-reduced-motion:reduce){
          .ngf-score-track{animation:none!important}
          .ngf-score-game.is-upset-game{
            animation:none!important;
            outline:3px solid #fff7ad;
            filter:brightness(1.65)
          }
        }
      `}</style>

      <div className="ngf-score-badge">
        <span className="ngf-score-dot" />
        CFB LIVE
      </div>

      <div className="ngf-score-window">
                <div
          ref={trackRef}
          className="ngf-score-track"
        >
          {loopGames.map((game, index) => {
            const colors = RAINBOW[index % RAINBOW.length];
            const isUpsetGame =
              isPersistentUpset(game) || latestUpset?.gameId === game.gameId;

            return (
              <div
                key={`${game.gameId}-${index}`}
                className={`ngf-score-game ${isUpsetGame ? "is-upset-game" : ""}`}
                style={
                  {
                    "--ngf-a": colors[0],
                    "--ngf-b": colors[1],
                  } as CSSProperties
                }
              >
                {isUpsetGame && (
                  <span className="ngf-score-upset-badge">🚨 UPSET</span>
                )}
                <span>
                  {game.awayLabel} {score(game.awayScore)}
                </span>
                <span className="ngf-score-sep">•</span>
                <span>
                  {game.homeLabel} {score(game.homeScore)}
                </span>
                <span className="ngf-score-status">{game.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {latestUpset && (
        <span className="sr-only" role="status" aria-live="assertive">
          Upset alert: {latestUpset.winner.abbreviation}{" "}
          {latestUpset.winnerScore},{" "}
          {latestUpset.loser.rank ? `number ${latestUpset.loser.rank} ` : ""}
          {latestUpset.loser.abbreviation} {latestUpset.loserScore}, final.
        </span>
      )}
    </section>
  );
}
