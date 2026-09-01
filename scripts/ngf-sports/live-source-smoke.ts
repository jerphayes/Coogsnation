import { createDefaultSportsSources } from "../../server/sports/sourceCatalog";
import type { GameRef } from "../../shared/ngfSportsTypes";

const game: GameRef = {
  ngfGameId: "unc-tcu-2026-08-29",
  sport: "football",
  season: 2026,
  scheduledStart: "2026-08-29T16:00:00Z",
  away: {
    ngfTeamId: "unc",
    name: "North Carolina",
    abbreviation: "UNC",
    conference: "ACC",
    division: "fbs",
  },
  home: {
    ngfTeamId: "tcu",
    name: "TCU",
    abbreviation: "TCU",
    conference: "Big 12",
    division: "fbs",
  },
};

const expectedAway = 15;
const expectedHome = 10;

type ProbeRow = {
  source: string;
  lineage: string;
  result: string;
  phase: string;
  elapsedMs: number;
  detail?: string;
};

const adapters = createDefaultSportsSources(fetch)
  .filter((adapter) => adapter.canHandle?.(game) !== false);

const rows: ProbeRow[] = [];
const matchingLineages = new Set<string>();

for (const adapter of adapters) {
  const started = Date.now();
  try {
    const observation = await adapter.fetchGame(game);
    const elapsedMs = Date.now() - started;
    const lineage = observation?.sourceLineage ?? adapter.lineageId ?? adapter.sourceId;

    if (!observation) {
      rows.push({
        source: adapter.sourceId,
        lineage,
        result: "NO MATCH",
        phase: "-",
        elapsedMs,
      });
      continue;
    }

    const score = `${observation.awayScore ?? "-"}-${observation.homeScore ?? "-"}`;
    const matches = observation.awayScore === expectedAway && observation.homeScore === expectedHome;
    if (matches) matchingLineages.add(lineage);

    rows.push({
      source: adapter.sourceId,
      lineage,
      result: matches ? `MATCH ${score}` : `OBS ${score}`,
      phase: observation.phase,
      elapsedMs,
      detail: observation.statusText ?? undefined,
    });
  } catch (error) {
    rows.push({
      source: adapter.sourceId,
      lineage: adapter.lineageId ?? adapter.sourceId,
      result: "ERROR",
      phase: "-",
      elapsedMs: Date.now() - started,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(rows.map(({ detail, ...row }) => row));
for (const row of rows.filter((item) => item.detail)) {
  console.log(`[${row.source}] ${row.detail}`);
}
