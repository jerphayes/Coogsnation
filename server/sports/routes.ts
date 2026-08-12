import type { Express } from "express";
import type { Namespace } from "socket.io";
import { sportsFactsEngine, type UpsetAlert } from "./engine";
import { sportsFactsService } from "./service";

export function registerSportsHttpRoutes(app: Express) {
  app.get("/api/sports/ticker", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(sportsFactsEngine.snapshot());
  });
  app.get("/api/sports/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, generatedAt: new Date().toISOString(), games: sportsFactsEngine.snapshot().games.length });
  });
}

export function registerSportsSocketNamespace(namespace: Namespace) {
  namespace.on("connection", (socket) => socket.emit("ticker:snapshot", sportsFactsEngine.snapshot()));
  const onTicker = (snapshot: ReturnType<typeof sportsFactsEngine.snapshot>) => namespace.emit("ticker:snapshot", snapshot);
  const onUpset = (alert: UpsetAlert) => namespace.emit("upset:alert", alert);
  sportsFactsEngine.on("ticker:update", onTicker);
  sportsFactsEngine.on("upset:alert", onUpset);
  return () => {
    sportsFactsEngine.off("ticker:update", onTicker);
    sportsFactsEngine.off("upset:alert", onUpset);
  };
}

export async function startSportsFactsService() {
  await sportsFactsService.start();
}
