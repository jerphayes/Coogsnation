import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const VISITOR_KEY = "ngf_visitor_id";
const SESSION_KEY = "ngf_traffic_session";
const ATTRIBUTION_KEY = "ngf_session_attribution";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;

type SessionState = {
  id: string;
  lastActivityAt: number;
};

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

let memoryVisitorId: string | null = null;
let memorySession: SessionState | null = null;
let memoryAttribution: Attribution | null = null;

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Analytics storage is best-effort and must never break navigation.
  }
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getVisitorId(): string {
  let id = safeGet(localStorage, VISITOR_KEY) || memoryVisitorId;
  if (!id) {
    id = uuid();
    memoryVisitorId = id;
    safeSet(localStorage, VISITOR_KEY, id);
  }
  setCookie("ngf_vid", id, 60 * 60 * 24 * 730);
  return id;
}

function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
    campaign: params.get("utm_campaign") || undefined,
    content: params.get("utm_content") || undefined,
    term: params.get("utm_term") || undefined,
    referrer: document.referrer || undefined,
  };
}

function getSession(): { state: SessionState; attribution: Attribution } {
  const now = Date.now();
  const existing = safeJsonParse<SessionState>(safeGet(localStorage, SESSION_KEY)) || memorySession;

  if (
    existing?.id &&
    Number.isFinite(existing.lastActivityAt) &&
    now - existing.lastActivityAt <= SESSION_TIMEOUT_MS
  ) {
    const state = { ...existing, lastActivityAt: now };
    memorySession = state;
    safeSet(localStorage, SESSION_KEY, JSON.stringify(state));
    setCookie("ngf_sid", state.id, 30 * 60);
    const attribution =
      safeJsonParse<Attribution>(safeGet(localStorage, ATTRIBUTION_KEY)) ||
      memoryAttribution ||
      captureAttribution();
    memoryAttribution = attribution;
    return { state, attribution };
  }

  const state: SessionState = { id: uuid(), lastActivityAt: now };
  const attribution = captureAttribution();
  memorySession = state;
  memoryAttribution = attribution;
  safeSet(localStorage, SESSION_KEY, JSON.stringify(state));
  safeSet(localStorage, ATTRIBUTION_KEY, JSON.stringify(attribution));
  setCookie("ngf_sid", state.id, 30 * 60);
  return { state, attribution };
}

function touchSession(sessionId: string): void {
  const state: SessionState = { id: sessionId, lastActivityAt: Date.now() };
  memorySession = state;
  safeSet(localStorage, SESSION_KEY, JSON.stringify(state));
  setCookie("ngf_sid", sessionId, 30 * 60);
}

function postEvent(payload: Record<string, unknown>): void {
  void fetch("/api/analytics/event", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export default function AnalyticsTracker() {
  const [location] = useLocation();
  const lastPageRef = useRef("");
  const sessionRef = useRef<SessionState | null>(null);
  const attributionRef = useRef<Attribution>({});

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;

    const visitorId = getVisitorId();
    const { state, attribution } = getSession();
    sessionRef.current = state;
    attributionRef.current = attribution;

    const fullPath = `${window.location.pathname}${window.location.search}`;
    if (lastPageRef.current !== fullPath) {
      lastPageRef.current = fullPath;
      touchSession(state.id);

      postEvent({
        visitorId,
        sessionId: state.id,
        eventType: "pageview",
        path: fullPath,
        title: document.title,
        attribution,
      });

      if (
        window.location.pathname === "/signup" ||
        window.location.pathname === "/join" ||
        window.location.pathname === "/join/email"
      ) {
        const marker = `ngf_signup_started_${state.id}`;
        if (!safeGet(sessionStorage, marker)) {
          safeSet(sessionStorage, marker, "1");
          postEvent({
            visitorId,
            sessionId: state.id,
            eventType: "signup_started",
            path: fullPath,
            attribution,
          });
        }
      }
    }
  }, [location]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (window.location.pathname.startsWith("/admin")) return;

      const visitorId = getVisitorId();
      const current = sessionRef.current;
      if (!current || Date.now() - current.lastActivityAt > SESSION_TIMEOUT_MS) {
        const fresh = getSession();
        sessionRef.current = fresh.state;
        attributionRef.current = fresh.attribution;
      }

      const active = sessionRef.current;
      if (!active) return;
      const touched = { id: active.id, lastActivityAt: Date.now() };
      sessionRef.current = touched;
      touchSession(touched.id);

      postEvent({
        visitorId,
        sessionId: active.id,
        eventType: "heartbeat",
        path: window.location.pathname,
        attribution: attributionRef.current,
      });
    }, HEARTBEAT_MS);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
