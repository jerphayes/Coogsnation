// Side-effect import, and it MUST stay the first one.
//
// ES modules evaluate every imported module before any statement in the
// importing module's body. The previous form —
//
//   import dotenv from "dotenv";
//   dotenv.config();
//   import { registerRoutes } from "./routes";
//
// looked correct but ran config() too late: `./routes` (and through it
// `./storage` and `./db`) was already fully evaluated, and `db.ts` throws at
// module scope when DATABASE_URL is unset. `import "dotenv/config"` performs
// the load during its own evaluation, which happens before the imports below.
//
// This was invisible under Docker, where compose supplies DATABASE_URL as a
// real environment variable, and only appeared when running `npm run dev`
// against a .env file.
import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import type { Server } from "http";
import { assertDatabaseReady, checkDatabaseHealth } from "./databaseReadiness";

const app = express();
let activeServer: Server | null = null;
let shuttingDown = false;

function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`[SHUTDOWN] ${reason}`);

  const forceTimer = setTimeout(() => {
    console.error("[SHUTDOWN] Forced exit after timeout");
    process.exit(exitCode || 1);
  }, 10_000);
  forceTimer.unref();

  if (!activeServer) {
    process.exit(exitCode);
    return;
  }

  activeServer.close((error) => {
    if (error) {
      console.error("[SHUTDOWN] Server close failed", error);
      process.exit(1);
      return;
    }
    process.exit(exitCode);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM received"));
process.on("SIGINT", () => shutdown("SIGINT received"));
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection", reason);
  shutdown("Unhandled promise rejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception", error);
  shutdown("Uncaught exception", 1);
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/healthz", async (_req, res) => {
  if (shuttingDown) {
    return res.status(503).json({ status: "shutting_down", database: "unknown" });
  }

  const database = await checkDatabaseHealth();
  if (!database.ok) {
    return res.status(503).json({ status: "degraded", database: "unavailable" });
  }

  return res.status(200).json({ status: "ok", database: "ok" });
});

// Authentication and the authoritative session middleware are configured in setupAuth().

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await assertDatabaseReady();
  const server = await registerRoutes(app);
  activeServer = server;

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[ERROR] ${status} ${message}`, err);
    if (res.headersSent) {
      return;
    }
    res.status(status).json({ message: status >= 500 ? "Internal Server Error" : message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
