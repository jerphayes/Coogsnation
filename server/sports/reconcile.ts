import type { GamePhase, ReconciledGame, ScoreObservation, SourceHealth } from "../../shared/ngfSportsTypes";

const FINAL_PHASES = new Set<GamePhase>(["final", "cancelled", "postponed"]);

function hasCompleteScore(observation: ScoreObservation): boolean {
  return observation.awayScore != null && observation.homeScore != null;
}

function scoreKey(observation: ScoreObservation): string {
  return `${observation.awayScore}|${observation.homeScore}`;
}

function phaseProgress(observation: ScoreObservation): number {
  if (observation.phase === "final") return 1000;
  if (observation.phase === "cancelled" || observation.phase === "postponed") return 900;
  if (observation.phase === "scheduled") return 0;
  if (observation.phase === "pregame") return 5;

  const period = Math.max(1, observation.period ?? 1);
  if (observation.phase === "halftime") return period * 10 + 5;
  return period * 10;
}

function weightFor(observation: ScoreObservation, health: Map<string, SourceHealth>, nowMs: number): number {
  const source = health.get(observation.sourceId);
  const reliability = Math.max(0.1, Math.min(1, source?.reliability ?? 0.7));
  const ageSeconds = Math.max(0, (nowMs - Date.parse(observation.observedAt)) / 1000);
  const freshness = Math.max(0.15, 1 - ageSeconds / 300);
  return reliability * freshness;
}

function freshestObservation(observations: ScoreObservation[], health: Map<string, SourceHealth>, nowMs: number): ScoreObservation {
  return [...observations].sort((a, b) => {
    const observedDelta = Date.parse(b.observedAt) - Date.parse(a.observedAt);
    if (observedDelta !== 0) return observedDelta;
    return weightFor(b, health, nowMs) - weightFor(a, health, nowMs);
  })[0];
}

function mostAdvancedObservation(observations: ScoreObservation[], health: Map<string, SourceHealth>, nowMs: number): ScoreObservation {
  return [...observations].sort((a, b) => {
    const progressDelta = phaseProgress(b) - phaseProgress(a);
    if (progressDelta !== 0) return progressDelta;
    const weightDelta = weightFor(b, health, nowMs) - weightFor(a, health, nowMs);
    if (weightDelta !== 0) return weightDelta;
    return Date.parse(b.observedAt) - Date.parse(a.observedAt);
  })[0];
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

  const nowMs = now.getTime();
  const health = new Map(sourceHealth.map((item) => [item.sourceId, item]));
  const scored = relevant.filter(hasCompleteScore);

  // Score is reconciled independently from phase/period/clock. Sources can agree
  // on 24-17 while legitimately showing clocks a few seconds apart.
  const scoreGroups = new Map<string, { observations: ScoreObservation[]; weight: number; sources: string[] }>();
  for (const observation of scored) {
    const key = scoreKey(observation);
    const existing = scoreGroups.get(key);
    const weight = weightFor(observation, health, nowMs);
    if (existing) {
      existing.observations.push(observation);
      existing.weight += weight;
      if (!existing.sources.includes(observation.sourceId)) existing.sources.push(observation.sourceId);
    } else {
      scoreGroups.set(key, { observations: [observation], weight, sources: [observation.sourceId] });
    }
  }

  const rankedScores = [...scoreGroups.values()].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    const aFresh = Math.max(...a.observations.map((item) => Date.parse(item.observedAt)));
    const bFresh = Math.max(...b.observations.map((item) => Date.parse(item.observedAt)));
    return bFresh - aFresh;
  });

  const scoreWinner = rankedScores[0] ?? null;
  const phaseCandidates = scoreWinner?.observations.length ? scoreWinner.observations : relevant;
  const phaseWinner = mostAdvancedObservation(phaseCandidates, health, nowMs);

  const periods = phaseCandidates.filter((item) => item.period != null);
  const selectedPeriod = periods.length ? Math.max(...periods.map((item) => item.period as number)) : phaseWinner.period ?? null;
  const clockCandidates = phaseCandidates.filter((item) => item.clock && (selectedPeriod == null || item.period === selectedPeriod));
  const clockWinner = clockCandidates.length ? freshestObservation(clockCandidates, health, nowMs) : null;

  const agreeing = new Set(scoreWinner?.sources ?? [phaseWinner.sourceId]);
  const conflicting = scored
    .filter((item) => scoreWinner && !agreeing.has(item.sourceId))
    .map((item) => item.sourceId);

  const totalScoreWeight = rankedScores.reduce((sum, group) => sum + group.weight, 0);
  const scoreConfidence = scoreWinner && totalScoreWeight > 0 ? scoreWinner.weight / totalScoreWeight : 0;
  const fallbackConfidence = weightFor(phaseWinner, health, nowMs);
  const confidence = scoreWinner ? scoreConfidence : fallbackConfidence;

  // A lone source may publish FINAL early. Keep the state but deliberately cap confidence.
  const finalPenalty = FINAL_PHASES.has(phaseWinner.phase) && agreeing.size === 1 ? 0.8 : 1;

  return {
    game: phaseWinner.game,
    awayScore: scoreWinner?.observations[0].awayScore ?? phaseWinner.awayScore,
    homeScore: scoreWinner?.observations[0].homeScore ?? phaseWinner.homeScore,
    phase: phaseWinner.phase,
    period: selectedPeriod,
    clock: clockWinner?.clock ?? null,
    statusText: phaseWinner.statusText,
    acceptedAt: now.toISOString(),
    confidence: Math.max(0, Math.min(1, confidence * finalPenalty)),
    agreeingSources: [...agreeing],
    conflictingSources: [...new Set(conflicting)],
  };
}
