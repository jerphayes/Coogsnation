import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function must(path, text) {
  const content = read(path);
  if (!content.includes(text)) {
    throw new Error(`${path} missing required SEO contract: ${text}`);
  }
}

function mustNot(path, text) {
  const content = read(path);
  if (content.includes(text)) {
    throw new Error(`${path} contains prohibited SEO content: ${text}`);
  }
}

must("client/public/robots.txt", "User-agent: *");
must(
  "client/public/robots.txt",
  "Sitemap: https://coogsnation.com/sitemap.xml",
);
must("client/public/robots.txt", "Disallow: /admin");
must("client/public/robots.txt", "Disallow: /profile");
must("client/public/robots.txt", "Disallow: /login");

must(
  "client/public/sitemap.xml",
  "<loc>https://coogsnation.com/</loc>",
);
mustNot(
  "client/public/sitemap.xml",
  "https://www.coogsnation.com",
);
mustNot(
  "client/public/sitemap.xml",
  "/admin",
);
mustNot(
  "client/public/sitemap.xml",
  "/dashboard",
);
mustNot(
  "client/public/sitemap.xml",
  "/login",
);

must(
  "client/src/components/SeoHead.tsx",
  'const SITE = "https://coogsnation.com"',
);
must(
  "client/src/components/SeoHead.tsx",
  'link[rel="canonical"]',
);
must(
  "client/src/components/SeoHead.tsx",
  "noindex, nofollow",
);
must(
  "client/src/App.tsx",
  "<SeoHead />",
);

must(
  "server/index.ts",
  "COOGSNATION_CANONICAL_HOST_REDIRECT",
);
must(
  "server/index.ts",
  'req.hostname.toLowerCase() === "www.coogsnation.com"',
);
must(
  "server/index.ts",
  "https://coogsnation.com",
);

console.log("PASS: CoogsNation SEO contract");
