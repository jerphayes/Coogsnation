export const SCORE_PUBLISH_QUORUM = 3;

/**
 * Authority/confidence hierarchy.
 *
 * THIS DOES NOT CONTROL WHETHER A SOURCE GETS POLLED.
 * Every eligible adapter is queried every poll cycle.
 */
export const SOURCE_HIERARCHY = [
  "ncaa",
  "conference",
  "espn",
  "cbs",
  "fox",
  "nbc",
  "usatoday",
  "yahoo",
  "massey",
] as const;

export type SourceHierarchyLineage =
  typeof SOURCE_HIERARCHY[number];

export function canonicalSourceLineage(
  value: string,
): string {
  const lower = value.toLowerCase();

  if (lower === "ncaa" || lower.startsWith("ncaa-")) return "ncaa";
  if (lower === "conference" || lower.startsWith("conference-")) return "conference";
  if (lower === "espn" || lower.startsWith("espn-")) return "espn";
  if (lower === "cbs" || lower.startsWith("cbs-")) return "cbs";
  if (lower === "fox" || lower.startsWith("fox-")) return "fox";
  if (lower === "nbc" || lower.startsWith("nbc-")) return "nbc";

  if (
    lower === "usatoday" ||
    lower === "usa-today" ||
    lower.startsWith("usatoday-") ||
    lower.startsWith("usa-today-")
  ) {
    return "usatoday";
  }

  if (lower === "yahoo" || lower.startsWith("yahoo-")) return "yahoo";
  if (lower === "massey" || lower.startsWith("massey-")) return "massey";

  return lower;
}

export function hierarchyPosition(
  lineage: string,
): number {
  const canonical =
    canonicalSourceLineage(lineage);

  const index =
    SOURCE_HIERARCHY.indexOf(
      canonical as SourceHierarchyLineage,
    );

  return index < 0
    ? SOURCE_HIERARCHY.length
    : index;
}
