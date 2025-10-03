// Extend express-session types to include custom properties
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

export {};