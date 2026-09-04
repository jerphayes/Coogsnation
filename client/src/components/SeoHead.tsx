import { useEffect } from "react";
import { useLocation } from "wouter";

const SITE = "https://coogsnation.com";

const PUBLIC_META: Record<string, { title: string; description: string }> = {
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

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }

  element.content = content;
}

function setProperty(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }

  link.href = url;
}

export default function SeoHead() {
  const [location] = useLocation();

  useEffect(() => {
    const path = location.split("?")[0] || "/";
    const isPrivate = PRIVATE_PREFIXES.some(
      prefix => path === prefix || path.startsWith(`${prefix}/`),
    );

    const meta = PUBLIC_META[path] ?? {
      title: "CoogsNation | University of Houston Fan Community",
      description:
        "CoogsNation is an independent University of Houston fan community for Cougar sports, news, forums and fan experiences.",
    };

    const canonical = `${SITE}${path === "/" ? "/" : path}`;

    document.title = meta.title;
    setMeta("description", meta.description);
    setMeta("robots", isPrivate ? "noindex, nofollow" : "index, follow");

    setCanonical(canonical);

    setProperty("og:type", "website");
    setProperty("og:site_name", "CoogsNation");
    setProperty("og:title", meta.title);
    setProperty("og:description", meta.description);
    setProperty("og:url", canonical);

    setMeta("twitter:card", "summary");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);
  }, [location]);

  return null;
}
