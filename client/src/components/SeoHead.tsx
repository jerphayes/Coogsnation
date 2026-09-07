import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  SITE_URL,
  getSeoMeta,
  isPrivatePath,
  normalizeSeoPath,
} from "@shared/seo";

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
    const path = normalizeSeoPath(location);
    const isPrivate = isPrivatePath(path);
    const meta = getSeoMeta(path);
    const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;

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
