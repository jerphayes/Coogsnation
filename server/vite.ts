import express, { type Express, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type Server } from "node:http";
import { pathToFileURL } from "node:url";
import {
  SITE_URL,
  getSeoMeta,
  isKnownSpaPath,
  isPrivatePath,
  normalizeSeoPath,
} from "../shared/seo";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function requestPath(originalUrl: string): string {
  try {
    return normalizeSeoPath(new URL(originalUrl, SITE_URL).pathname);
  } catch {
    return "/";
  }
}

function renderSeoHtml(
  template: string,
  pathName: string,
  status: number,
): string {
  const notFound = status === 404;
  const meta = notFound
    ? {
        title: "Page Not Found | CoogsNation",
        description: "The requested CoogsNation page could not be found.",
      }
    : getSeoMeta(pathName);

  const robots =
    notFound || isPrivatePath(pathName)
      ? "noindex, nofollow"
      : "index, follow";

  const canonical = `${SITE_URL}${pathName === "/" ? "/" : pathName}`;

  let page = template.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(meta.title)}</title>`,
  );

  page = page.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
  );

  const tags = [
    `<meta name="robots" content="${robots}">`,
    ...(notFound
      ? []
      : [
          `<link rel="canonical" href="${escapeHtml(canonical)}">`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:site_name" content="CoogsNation">`,
          `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
          `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
          `<meta property="og:url" content="${escapeHtml(canonical)}">`,
          `<meta name="twitter:card" content="summary">`,
          `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
          `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
        ]),
  ];

  return page.replace("</head>", `${tags.join("\n    ")}\n</head>`);
}

function sendSpaHtml(
  res: Response,
  template: string,
  pathName: string,
  status: number,
) {
  if (status === 404 || isPrivatePath(pathName)) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }

  res
    .status(status)
    .type("html")
    .send(renderSeoHtml(template, pathName, status));
}

/**
 * Development-only Vite middleware.
 *
 * Vite and vite.config are imported dynamically so they never enter the
 * production server bundle's static import graph. The runtime image can
 * therefore install production dependencies only.
 */
export async function setupVite(app: Express, server: Server) {
  const viteConfigUrl = pathToFileURL(
    path.resolve(process.cwd(), "vite.config.ts"),
  ).href;
  const [{ createServer: createViteServer, createLogger }, viteConfigModule] =
    await Promise.all([import("vite"), import(viteConfigUrl)]);
  const viteConfig = viteConfigModule.default;
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exitCode = 1;
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const pathName = requestPath(url);
    const status = isKnownSpaPath(pathName) ? 200 : 404;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${randomUUID()}"`,
      );

      const transformed = await vite.transformIndexHtml(url, template);

      sendSpaHtml(
        res,
        transformed,
        pathName,
        status,
      );
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

/** Production static-file server. It has no Vite dependency. */
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  const template = fs.readFileSync(indexPath, "utf-8");

  // SPA document requests must reach the SEO/status handler below.
  app.use(express.static(distPath, { index: false }));

  app.use("*", (req, res) => {
    const pathName = requestPath(req.originalUrl);
    const status = isKnownSpaPath(pathName) ? 200 : 404;

    sendSpaHtml(
      res,
      template,
      pathName,
      status,
    );
  });
}
