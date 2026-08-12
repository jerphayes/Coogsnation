import type { GamePhase, ReconciledGame, ScoreObservation, SourceHealth } from "../../shared/ngfSportsTypes";

const FINAL_PHASES = new Set<GamePhase>(["final", "cancelled", "postponed"]);

function observationKey(observation: ScoreObservation): string {
  return [
    observation.awayScore ?? "-",
    observation.homeScore ?? "-",
    observation.phase,
    observation.period ?? "-",
    observation.clock ?? "-",
  ].join("|");
}

function weightFor(observation: ScoreObservation, health: Map<string, SourceHealth>, nowMs: number): number {
  const source = health.get(observation.sourceId);
  const reliability = Math.max(0.1, Math.min(1, source?.reliability ?? 0.7));
  const ageSeconds = Math.max(0, (nowMs - Date.parse(observation.observedAt)) / 1000);
  const freshness = Math.max(0.15, 1 - ageSeconds / 300);
  return reliability * freshness;
}

export function reconcileGame(
  observations: ScoreObservation[],
  sourceHealth: SourceHealth[] = [],
  now = new Date(),
): ReconciledGame | null {
  if (observations.length === 0) return null;

  const gameId = observations[0].game.ngfGameId;
  const relevant = observations.filter((item) => item.game.ngfGameId === gameId);
  if (relevant.length === 0) return null;

  const health = new Map(sourceHealth.map((item) => [item.sourceId, item]));
  const groups = new Map<string, { observation: ScoreObservation; weight: number; sources: string[] }>();

  for (const observation of relevant) {
    const key = observationKey(observation);
    const weight = weightFor(observation, health, now.getTime());
    const existing = groups.get(key);
    if (existing) {
      existing.weight += weight;
      if (!existing.sources.includes(observation.sourceId)) existing.sources.push(observation.sourceId);
      if (Date.parse(observation.observedAt) > Date.parse(existing.observation.observedAt)) {
        existing.observation = observation;
      }
    } else {
      groups.set(key, { observation, weight, sources: [observation.sourceId] });
    }
  }

  const ranked = [...groups.values()].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return Date.parse(b.observation.observedAt) - Date.parse(a.observation.observedAt);
  });

  const winner = ranked[0];
  const totalWeight = ranked.reduce((sum, group) => sum + group.weight, 0);
  const confidence = totalWeight > 0 ? winner.weight / totalWeight : 0;
  const agreeing = new Set(winner.sources);
  const conflicting = relevant.map((item) => item.sourceId).filter((source) => !agreeing.has(source));

  // A lone source may publish FINAL early. Keep the state but deliberately cap confidence.
  const finalPenalty = FINAL_PHASES.has(winner.observation.phase) && winner.sources.length === 1 ? 0.8 : 1;

  return {
    game: winner.observation.game,
    awayScore: winner.observation.awayScore,
    homeScore: winner.observation.homeScore,
    phase: winner.observation.phase,
    period: winner.observation.period,
    clock: winner.observation.clock,
    statusText: winner.observation.statusText,
    acceptedAt: now.toISOString(),
    confidence: Math.max(0, Math.min(1, confidence * finalPenalty)),
    agreeingSources: [...agreeing],
    conflictingSources: [...new Set(conflicting)],
  };
}
