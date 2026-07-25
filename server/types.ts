// Extend express-session types to include custom properties
declare global {
  namespace Express {
    interface User {
      id: string;
      provider: string;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

export {};