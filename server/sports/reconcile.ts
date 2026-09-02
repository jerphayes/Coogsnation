import type { GamePhase, ReconciledGame, ScoreObservation, SourceHealth } from "../../shared/ngfSportsTypes";
import { hierarchyPosition } from "./sourceHierarchy";

const FINAL_PHASES = new Set<GamePhase>(["final", "cancelled", "postponed"]);

function hasCompleteScore(observation: ScoreObservation): boolean {
  return observation.awayScore != null && observation.homeScore != null;
}

function scoreKey(observation: ScoreObservation): string {
  return `${observation.awayScore}|${observation.homeScore}`;
}

function lineageFor(observation: ScoreObservation): string {
  return observation.sourceLineage || observation.sourceId;
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

function reliabilityFor(
  observation: ScoreObservation,
  health: Map<string, SourceHealth>,
): number {
  return Math.max(
    0.1,
    Math.min(
      1,
      health.get(observation.sourceId)?.reliability ?? 0.7,
    ),
  );
}

function bestClockObservation(
  observations: ScoreObservation[],
  health: Map<string, SourceHealth>,
): ScoreObservation {
  return [...observations].sort((a, b) => {
    // Highest source-health confidence first.
    const reliabilityDelta =
      reliabilityFor(b, health) -
      reliabilityFor(a, health);

    if (reliabilityDelta !== 0) {
      return reliabilityDelta;
    }

    // Equal confidence: authority hierarchy breaks the tie.
    const hierarchyDelta =
      hierarchyPosition(a.sourceLineage ?? a.sourceId) -
      hierarchyPosition(b.sourceLineage ?? b.sourceId);

    if (hierarchyDelta !== 0) {
      return hierarchyDelta;
    }

    // Same confidence + same hierarchy: freshest wins.
    return (
      Date.parse(b.observedAt) -
      Date.parse(a.observedAt)
    );
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

function bestObservationPerLineage(
  observations: ScoreObservation[],
  health: Map<string, SourceHealth>,
  nowMs: number,
): ScoreObservation[] {
  const byLineage = new Map<string, ScoreObservation>();
  for (const observation of observations) {
    const lineage = lineageFor(observation);
    const existing = byLineage.get(lineage);
    if (!existing) {
      byLineage.set(lineage, observation);
      continue;
    }
    const observedDelta = Date.parse(observation.observedAt) - Date.parse(existing.observedAt);
    if (observedDelta > 0 || (observedDelta === 0 && weightFor(observation, health, nowMs) > weightFor(existing, health, nowMs))) {
      byLineage.set(lineage, observation);
    }
  }
  return [...byLineage.values()];
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
  const independentScored = bestObservationPerLineage(scored, health, nowMs);

  // One upstream lineage gets one vote. Ten mirrors of the same feed cannot
  // outvote two genuinely independent observations.
  const scoreGroups = new Map<string, {
    observations: ScoreObservation[];
    weight: number;
    lineages: string[];
  }>();
  for (const observation of independentScored) {
    const key = scoreKey(observation);
    const existing = scoreGroups.get(key);
    const weight = weightFor(observation, health, nowMs);
    const lineage = lineageFor(observation);
    if (existing) {
      existing.observations.push(observation);
      existing.weight += weight;
      if (!existing.lineages.includes(lineage)) existing.lineages.push(lineage);
    } else {
      scoreGroups.set(key, { observations: [observation], weight, lineages: [lineage] });
    }
  }

  const rankedScores = [...scoreGroups.values()].sort((a, b) => {
    // Independent agreement is the primary truth signal.
    if (b.lineages.length !== a.lineages.length) return b.lineages.length - a.lineages.length;
    if (b.weight !== a.weight) return b.weight - a.weight;
    const aFresh = Math.max(...a.observations.map((item) => Date.parse(item.observedAt)));
    const bFresh = Math.max(...b.observations.map((item) => Date.parse(item.observedAt)));
    return bFresh - aFresh;
  });

  const scoreWinner = rankedScores[0] ?? null;
  const winnerKey = scoreWinner ? scoreKey(scoreWinner.observations[0]) : null;
  const winnerLineages = new Set(scoreWinner?.lineages ?? [lineageFor(relevant[0])]);

  // Use every matching mirror from the winning lineages for freshness/clock,
  // but only one representative per lineage affected the score vote above.
  const phaseCandidates = winnerKey
    ? scored.filter((item) => winnerLineages.has(lineageFor(item)) && scoreKey(item) === winnerKey)
    : relevant;
  const phaseWinner = mostAdvancedObservation(phaseCandidates.length ? phaseCandidates : relevant, health, nowMs);

  const periods = phaseCandidates.filter((item) => item.period != null);
  const selectedPeriod = periods.length ? Math.max(...periods.map((item) => item.period as number)) : phaseWinner.period ?? null;
  const clockCandidates = phaseCandidates.filter((item) => item.clock && (selectedPeriod == null || item.period === selectedPeriod));
  const clockWinner = clockCandidates.length
    ? bestClockObservation(clockCandidates, health)
    : null;

  const agreeingSources = scored
    .filter((item) => winnerKey && winnerLineages.has(lineageFor(item)) && scoreKey(item) === winnerKey)
    .map((item) => item.sourceId);
  const conflictingSources = scored
    .filter((item) => winnerKey && !(winnerLineages.has(lineageFor(item)) && scoreKey(item) === winnerKey))
    .map((item) => item.sourceId);
  const conflictingLineages = independentScored
    .filter((item) => winnerKey && !winnerLineages.has(lineageFor(item)))
    .map(lineageFor);

  const totalScoreWeight = rankedScores.reduce((sum, group) => sum + group.weight, 0);
  const scoreConfidence = scoreWinner && totalScoreWeight > 0 ? scoreWinner.weight / totalScoreWeight : 0;
  const fallbackConfidence = weightFor(phaseWinner, health, nowMs);
  const confidence = scoreWinner ? scoreConfidence : fallbackConfidence;

  // FINAL still requires independent corroboration. Multiple mirrors from one
  // upstream family remain a single lineage for this penalty.
  const finalPenalty = FINAL_PHASES.has(phaseWinner.phase) && winnerLineages.size === 1 ? 0.8 : 1;

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
    agreeingSources: [...new Set(agreeingSources.length ? agreeingSources : [phaseWinner.sourceId])],
    conflictingSources: [...new Set(conflictingSources)],
    agreeingLineages: [...winnerLineages],
    conflictingLineages: [...new Set(conflictingLineages)],
  };
}
