export const SITE_URL = "https://coogsnation.com";

export type SeoMeta = {
  title: string;
  description: string;
};

export const PUBLIC_META: Record<string, SeoMeta> = {
  "/": {
    title: "CoogsNation | University of Houston Fan Community",
    description:
      "CoogsNation is an independent University of Houston fan community for Cougar sports, news, forums, live scores, events and fan experiences.",
  },
  "/forums": {
    title: "Houston Cougars Forums | CoogsNation",
    description:
      "Join University of Houston fans discussing Cougar football, basketball, recruiting, athletics and campus sports.",
  },
  "/news": {
    title: "Houston Cougars News | CoogsNation",
    description:
      "Follow University of Houston Cougars sports news, updates and fan coverage from CoogsNation.",
  },
  "/store": {
    title: "CoogsNation Store | Houston Cougar Fan Gear",
    description:
      "Browse CoogsNation merchandise and fan gear for University of Houston supporters.",
  },
  "/events": {
    title: "Houston Cougar Events | CoogsNation",
    description:
      "Discover events and fan activities for the University of Houston Cougar community.",
  },
  "/community": {
    title: "CoogsNation Community | Houston Cougar Fans",
    description:
      "Connect with fellow University of Houston fans across the CoogsNation community.",
  },
  "/members": {
    title: "CoogsNation Members | Houston Cougar Community",
    description:
      "Explore the CoogsNation community of University of Houston Cougar fans.",
  },
  "/live-sports": {
    title: "Houston Cougars Live Sports & Scores | CoogsNation",
    description:
      "Follow University of Houston sports, live scores and game information on CoogsNation.",
  },
  "/intramurals": {
    title: "CoogsNation Intramurals",
    description:
      "CoogsNation intramural sports, teams, competition and community participation.",
  },
  "/get-em": {
    title: "Get 'Em Pick 'Em | CoogsNation",
    description:
      "Make your CoogsNation game picks and follow the competition.",
  },
  "/terms": {
    title: "Terms & Privacy | CoogsNation",
    description:
      "CoogsNation terms of use, privacy information and legal policies.",
  },
};

const DEFAULT_META: SeoMeta = {
  title: "CoogsNation | University of Houston Fan Community",
  description:
    "CoogsNation is an independent University of Houston fan community for Cougar sports, news, forums and fan experiences.",
};

const PRIVATE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/member-dashboard",
  "/profile",
  "/messages",
  "/event-management",
  "/login",
  "/reset-password",
  "/join",
  "/signup",
  "/complete-profile",
  "/verify-email",
];

const PRIVATE_EXACT = new Set([
  "/admin-full",
  "/verify-email-pending",
]);

const SPA_EXACT_PATHS = new Set([
  "/",
  "/dashboard",
  "/forums",
  "/news",
  "/store",
  "/store/wear-your-pride",
  "/store/everyday-alumni",
  "/store/keepsakes-gifts",
  "/store/limited-editions",
  "/store/legacy-jewelry",
  "/store/coogsnation-originals",
  "/store/concierge",
  "/cart",
  "/profile",
  "/profile/edit",
  "/profile/advanced",
  "/events",
  "/admin/news",
  "/messages",
  "/event-management",
  "/admin",
  "/admin-full",
  "/life-happens",
  "/life-solutions",
  "/community",
  "/members",
  "/terms",
  "/complete-profile",
  "/login",
  "/login/email",
  "/login/other",
  "/reset-password",
  "/join/email",
  "/signup",
  "/join",
  "/verify-email-pending",
  "/verify-email",
  "/member-dashboard",
  "/live-sports",
  "/intramurals/live",
  "/intramurals/agreement",
  "/intramurals",
  "/intramurals/demo",
  "/get-em",
  "/venues",
  "/coogpaws-chat",
]);

const SPA_DYNAMIC_PATHS = [
  /^\/intramurals\/teams\/[^/]+$/,
  /^\/venues\/[^/]+$/,
  /^\/forums\/topics\/[^/]+$/,
  /^\/forums\/categories\/[^/]+$/,
  /^\/forums\/[^/]+$/,
];

export function normalizeSeoPath(input: string): string {
  const raw = input.split("?")[0]?.split("#")[0] || "/";
  if (raw === "/") return "/";
  return raw.replace(/\/+$/, "") || "/";
}

export function isPrivatePath(input: string): boolean {
  const path = normalizeSeoPath(input);

  if (PRIVATE_EXACT.has(path)) return true;

  return PRIVATE_PREFIXES.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isKnownSpaPath(input: string): boolean {
  const path = normalizeSeoPath(input);

  return (
    SPA_EXACT_PATHS.has(path) ||
    SPA_DYNAMIC_PATHS.some(pattern => pattern.test(path))
  );
}

export function getSeoMeta(input: string): SeoMeta {
  const path = normalizeSeoPath(input);
  const exact = PUBLIC_META[path];

  if (exact) return exact;

  if (path.startsWith("/forums/")) return PUBLIC_META["/forums"];
  if (path.startsWith("/store/")) return PUBLIC_META["/store"];
  if (path.startsWith("/intramurals/")) return PUBLIC_META["/intramurals"];

  if (path === "/venues" || path.startsWith("/venues/")) {
    return {
      title: "CoogsNation Virtual Venues",
      description:
        "Enter CoogsNation virtual venues and immersive Houston Cougar fan experiences.",
    };
  }

  return DEFAULT_META;
}
