const TIME_ZONES: Record<string, { zone: string; label: string }> = {
  houston: { zone: "America/Chicago", label: "Houston, Texas" },
  "houston texas": { zone: "America/Chicago", label: "Houston, Texas" },
  texas: { zone: "America/Chicago", label: "Houston, Texas" },

  bangkok: { zone: "Asia/Bangkok", label: "Bangkok, Thailand" },
  "bangkok thailand": { zone: "Asia/Bangkok", label: "Bangkok, Thailand" },
  thailand: { zone: "Asia/Bangkok", label: "Bangkok, Thailand" },

  "new york": { zone: "America/New_York", label: "New York City" },
  "new york city": { zone: "America/New_York", label: "New York City" },
  chicago: { zone: "America/Chicago", label: "Chicago" },
  denver: { zone: "America/Denver", label: "Denver" },
  phoenix: { zone: "America/Phoenix", label: "Phoenix" },
  "los angeles": { zone: "America/Los_Angeles", label: "Los Angeles" },
  seattle: { zone: "America/Los_Angeles", label: "Seattle" },
  honolulu: { zone: "Pacific/Honolulu", label: "Honolulu" },

  london: { zone: "Europe/London", label: "London" },
  paris: { zone: "Europe/Paris", label: "Paris" },
  berlin: { zone: "Europe/Berlin", label: "Berlin" },
  madrid: { zone: "Europe/Madrid", label: "Madrid" },
  rome: { zone: "Europe/Rome", label: "Rome" },

  tokyo: { zone: "Asia/Tokyo", label: "Tokyo" },
  seoul: { zone: "Asia/Seoul", label: "Seoul" },
  singapore: { zone: "Asia/Singapore", label: "Singapore" },
  hongkong: { zone: "Asia/Hong_Kong", label: "Hong Kong" },
  "hong kong": { zone: "Asia/Hong_Kong", label: "Hong Kong" },
  manila: { zone: "Asia/Manila", label: "Manila" },
  delhi: { zone: "Asia/Kolkata", label: "Delhi" },
  mumbai: { zone: "Asia/Kolkata", label: "Mumbai" },
  dubai: { zone: "Asia/Dubai", label: "Dubai" },

  sydney: { zone: "Australia/Sydney", label: "Sydney" },
  melbourne: { zone: "Australia/Melbourne", label: "Melbourne" },

  utc: { zone: "UTC", label: "UTC" },
};

export interface MerlinToolResult {
  handled: boolean;
  answer?: string;
  tool?: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findLocation(message: string) {
  const normalized = normalize(message);

  const names = Object.keys(TIME_ZONES).sort((a, b) => b.length - a.length);

  for (const name of names) {
    if (normalized.includes(name)) {
      return TIME_ZONES[name];
    }
  }

  return null;
}

export function tryLiveTimeTool(message: string): MerlinToolResult {
  const normalized = normalize(message);

  const asksForTime =
    /\bwhat(?:'s| is)?\s+(?:the\s+)?(?:current\s+|local\s+)?time\b/.test(normalized) ||
    /\bcurrent\s+time\b/.test(normalized) ||
    /\blocal\s+time\b/.test(normalized) ||
    /\btime\s+in\b/.test(normalized);

  if (!asksForTime) return { handled: false };

  const location = findLocation(message);
  if (!location) return { handled: false };

  const now = new Date();

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: location.zone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(now);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: location.zone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  return {
    handled: true,
    tool: "live-time",
    answer: `The current local time in ${location.label} is ${time}, ${date}.`,
  };
}
