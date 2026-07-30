import { Strategy as FacebookStrategy } from "passport-facebook";
import { recordAuthEvent, clientIpOf, userAgentOf } from "./authAudit";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import "./types";

function validateReturnToUrl(returnTo: string): string {
  if (!returnTo || typeof returnTo !== "string") return "/dashboard";
  if (/^https?:\/\//i.test(returnTo)) return "/dashboard";
  if (returnTo.startsWith("//")) return "/dashboard";
  if (/^(javascript|data|vbscript):/i.test(returnTo)) return "/dashboard";
  if (!returnTo.startsWith("/")) return "/dashboard";
  if (returnTo.includes("../")) return "/dashboard";

  try {
    const decoded = decodeURIComponent(returnTo);
    if (decoded.includes("../") || /^https?:\/\//i.test(decoded)) {
      return "/dashboard";
    }
  } catch {
    return "/dashboard";
  }

  return returnTo;
}

function configureTrustProxy(app: Express): void {
  const configured = process.env.TRUST_PROXY?.trim();
  if (!configured) {
    app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
    return;
  }

  if (configured === "true") {
    app.set("trust proxy", true);
  } else if (configured === "false") {
    app.set("trust proxy", false);
  } else if (/^\d+$/.test(configured)) {
    app.set("trust proxy", Number(configured));
  } else {
    app.set("trust proxy", configured);
  }
}

function getAppOrigin(): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN is required in production");
  }
  return `http://localhost:${process.env.PORT || "5000"}`;
}

export function getSession(): RequestHandler {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for session storage");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    name: process.env.SESSION_COOKIE_NAME || "coogsnation.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

async function handleOAuthAuthentication(
  claims: Record<string, unknown>,
  provider: string,
): Promise<string> {
  const providerUserId = String(claims.sub || claims.id || "");
  const email = typeof claims.email === "string"
    ? claims.email
    : typeof claims.emailAddress === "string"
      ? claims.emailAddress
      : undefined;

  if (!providerUserId) {
    throw new Error(`No provider user ID found for ${provider} authentication`);
  }

  const existingIdentity = await storage.getUserIdentity(provider, providerUserId);
  if (existingIdentity) return existingIdentity.userId;

  const newUser = await storage.upsertUser({
    email,
    firstName: String(claims.first_name || claims.firstName || claims.givenName || "") || undefined,
    lastName: String(claims.last_name || claims.lastName || claims.familyName || "") || undefined,
    profileImageUrl: String(claims.profile_image_url || claims.picture || claims.pictureUrl || "") || undefined,
    isLocalAccount: false,
  });

  await storage.createUserIdentity({
    userId: newUser.id,
    provider,
    providerUserId,
    emailAtAuth: email || null,
    profileData: {
      email,
      firstName: claims.first_name || claims.firstName || claims.givenName,
      lastName: claims.last_name || claims.lastName || claims.familyName,
      profileImageUrl: claims.profile_image_url || claims.picture || claims.pictureUrl,
    },
  });

  return newUser.id;
}

function completeLogin(req: any, res: any, user: Express.User, fallbackErrorPath: string): void {
  const savedReturnTo = req.session?.returnTo;
  req.session.regenerate((sessionError: Error | null) => {
    if (sessionError) {
      console.error("Session regeneration failed:", sessionError);
      res.redirect(`${fallbackErrorPath}?error=session_error`);
      return;
    }

    req.logIn(user, (loginError: Error | null) => {
      if (loginError) {
        res.redirect(`${fallbackErrorPath}?error=login_failed`);
        return;
      }
      res.redirect(validateReturnToUrl(savedReturnTo || "/dashboard"));
    });
  });
}

export async function setupAuth(app: Express): Promise<RequestHandler> {
  configureTrustProxy(app);

  const sessionMiddleware = getSession();
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  const appOrigin = getAppOrigin();
  let facebookEnabled = false;
  let linkedinEnabled = false;

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${appOrigin}/api/auth/facebook/callback`,
      profileFields: ["id", "emails", "name", "picture.type(large)"],
      enableProof: true,
      state: true,
    }, async (_accessToken, _refreshToken, profile: any, done) => {
      try {
        const userId = await handleOAuthAuthentication({
          id: profile.id,
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          picture: profile.photos?.[0]?.value,
        }, "facebook");
        done(null, { id: userId, provider: "facebook" });
      } catch (error) {
        console.error("Facebook authentication error:", error);
        done(error as Error, false);
      }
    }));
    facebookEnabled = true;
  }

  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(new LinkedInStrategy({
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: `${appOrigin}/api/auth/linkedin/callback`,
      scope: ["r_emailaddress", "r_liteprofile"],
    }, async (_accessToken, _refreshToken, profile: any, done) => {
      try {
        const userId = await handleOAuthAuthentication({
          id: profile.id,
          email: profile.emails?.[0]?.value || profile.emailAddress,
          firstName: profile.name?.givenName || profile.firstName,
          lastName: profile.name?.familyName || profile.lastName,
          picture: profile.photos?.[0]?.value || profile.pictureUrl,
        }, "linkedin");
        done(null, { id: userId, provider: "linkedin" });
      } catch (error) {
        console.error("LinkedIn authentication error:", error);
        done(error as Error, false);
      }
    }));
    linkedinEnabled = true;
  }

  passport.serializeUser((user: Express.User, cb) => {
    cb(null, { id: user.id, provider: user.provider });
  });

  passport.deserializeUser(async (sessionUser: unknown, cb) => {
    try {
      if (!sessionUser || typeof sessionUser !== "object") return cb(null, false);
      const candidate = sessionUser as { id?: string; provider?: string };
      if (!candidate.id) return cb(null, false);

      const user = await storage.getUser(candidate.id);
      if (!user) return cb(null, false);
      cb(null, { id: user.id, provider: candidate.provider || "local" });
    } catch (error) {
      console.error("Deserialize user error:", error);
      cb(null, false);
    }
  });

  app.get("/api/auth/providers", (_req, res) => {
    res.json({ local: true, facebook: facebookEnabled, linkedin: linkedinEnabled });
  });

  if (facebookEnabled) {
    app.get("/api/auth/facebook", (req, res, next) => {
      if (typeof req.query.returnTo === "string") {
        req.session.returnTo = validateReturnToUrl(req.query.returnTo);
      }
      passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
    });

    app.get("/api/auth/facebook/callback", (req, res, next) => {
      passport.authenticate("facebook", (error: Error | null, user: Express.User | false) => {
        if (error || !user) return res.redirect("/login?error=facebook_auth_failed");
        completeLogin(req, res, user, "/login");
      })(req, res, next);
    });
  } else {
    app.get("/api/auth/facebook", (_req, res) => res.status(404).json({ message: "Facebook login is not configured" }));
    app.get("/api/auth/facebook/callback", (_req, res) => res.status(404).json({ message: "Facebook login is not configured" }));
  }

  if (linkedinEnabled) {
    app.get("/api/auth/linkedin", (req, res, next) => {
      if (typeof req.query.returnTo === "string") {
        req.session.returnTo = validateReturnToUrl(req.query.returnTo);
      }
      passport.authenticate("linkedin")(req, res, next);
    });

    app.get("/api/auth/linkedin/callback", (req, res, next) => {
      passport.authenticate("linkedin", (error: Error | null, user: Express.User | false) => {
        if (error || !user) return res.redirect("/login?error=linkedin_auth_failed");
        completeLogin(req, res, user, "/login");
      })(req, res, next);
    });
  } else {
    app.get("/api/auth/linkedin", (_req, res) => res.status(404).json({ message: "LinkedIn login is not configured" }));
    app.get("/api/auth/linkedin/callback", (_req, res) => res.status(404).json({ message: "LinkedIn login is not configured" }));
  }

  // Logout is POST-only: a GET logout can be triggered cross-site by any
  // <img>/<link> tag, which is a CSRF vector. The client must POST.
  app.post("/api/logout", (req, res, next) => {
    const loggingOutUserId = req.user?.id ?? null;
    req.logout((logoutError) => {
      if (logoutError) return next(logoutError);
      req.session.destroy((sessionError) => {
        if (sessionError) return next(sessionError);
        res.clearCookie(process.env.SESSION_COOKIE_NAME || "coogsnation.sid");
        void recordAuthEvent({
          eventType: "logout",
          outcome: "success",
          userId: loggingOutUserId,
          clientIp: clientIpOf(req as any),
          userAgent: userAgentOf(req as any),
        });
        res.status(200).json({ message: "Logged out" });
      });
    });
  });

  // Legacy GET alias: does not log the user out (that would reintroduce the
  // CSRF vector); it simply redirects to the home page.
  app.get("/api/logout", (_req, res) => {
    res.redirect("/");
  });

  return sessionMiddleware;
}


/**
 * Enforce account state and session revocation for an authenticated request.
 * Returns an error message if the session must be rejected, or null if valid.
 *
 * - accountStatus: only 'active' accounts may hold a session.
 * - sessionVersion: the value captured at login must still match the database.
 *   Incrementing users.session_version invalidates every outstanding session
 *   (password reset/change, suspension, explicit security revocation).
 */
function evaluateSessionState(
  dbUser: { accountStatus?: string | null; sessionVersion?: number | null },
  sessionVersionAtLogin: number | undefined,
): string | null {
  const status = dbUser.accountStatus ?? "active";
  if (status !== "active") {
    return status === "suspended"
      ? "Account suspended"
      : status === "disabled"
        ? "Account disabled"
        : "Account not active";
  }
  const current = dbUser.sessionVersion ?? 0;
  if (typeof sessionVersionAtLogin === "number" && sessionVersionAtLogin !== current) {
    return "Session revoked";
  }
  return null;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(req.user.id);
    if (!dbUser) {
      req.logout(() => undefined);
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rejection = evaluateSessionState(
      dbUser,
      (req.session as any)?.sessionVersion,
    );
    if (rejection) {
      req.logout(() => undefined);
      req.session?.destroy(() => undefined);
      return res.status(401).json({ message: rejection });
    }

    return next();
  } catch (error) {
    console.error("Authentication check failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(req.user.id);
    if (!dbUser) return res.status(401).json({ message: "Unauthorized" });

    const rejection = evaluateSessionState(
      dbUser,
      (req.session as any)?.sessionVersion,
    );
    if (rejection) {
      req.logout(() => undefined);
      req.session?.destroy(() => undefined);
      return res.status(401).json({ message: rejection });
    }

    if (dbUser.role !== "admin") {
      return res.status(403).json({ message: "Administrator access required" });
    }
    return next();
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/** Return true only for the single configured platform owner. */
export function isConfiguredOwner(userId: string | null | undefined): boolean {
  const configuredOwnerId = process.env.OWNER_USER_ID?.trim();
  return Boolean(configuredOwnerId && userId && configuredOwnerId === userId);
}

/**
 * Owner-only authorization for changing administrator access.
 *
 * OWNER_USER_ID is deliberately server-side configuration. A database role is
 * still required, so knowing an ID alone never grants access.
 */
export const requireOwner: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const configuredOwnerId = process.env.OWNER_USER_ID?.trim();
  if (!configuredOwnerId) {
    return res.status(503).json({ message: "Platform owner is not configured" });
  }

  try {
    const dbUser = await storage.getUser(req.user.id);
    if (!dbUser) return res.status(401).json({ message: "Unauthorized" });

    const rejection = evaluateSessionState(
      dbUser,
      (req.session as any)?.sessionVersion,
    );
    if (rejection) {
      req.logout(() => undefined);
      req.session?.destroy(() => undefined);
      return res.status(401).json({ message: rejection });
    }

    if (dbUser.role !== "admin" || dbUser.id !== configuredOwnerId) {
      return res.status(403).json({ message: "Platform owner access required" });
    }
    return next();
  } catch (error) {
    console.error("Owner authorization check failed:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const isUHCommunityMember: RequestHandler = async (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const dbUser = await storage.getUser(req.user.id);
    if (!dbUser) return res.status(401).json({ message: "User not found" });

    const userEmail = dbUser.email?.toLowerCase();
    if (!userEmail) {
      return res.status(403).json({
        message: "UH Community Access Required",
        details: "Associate an official UH email address with your account.",
      });
    }

    const uhDomains = ["@uh.edu", "@cougarnet.uh.edu", "@central.uh.edu", "@uhcl.edu", "@uhd.edu", "@uhv.edu"];
    if (!uhDomains.some((domain) => userEmail.endsWith(domain))) {
      return res.status(403).json({
        message: "UH Community Access Required",
        details: "This feature is reserved for verified University of Houston community members.",
      });
    }

    if (!dbUser.firstName || !dbUser.lastName) {
      return res.status(403).json({
        message: "Complete Profile Required",
        details: "Complete your basic profile information to continue.",
      });
    }

    return next();
  } catch (error) {
    console.error("UH verification failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const requireUHAuthentication: RequestHandler = (req, res, next) => {
  isAuthenticated(req, res, (authenticationError?: unknown) => {
    if (authenticationError) return next(authenticationError);
    return isUHCommunityMember(req, res, next);
  });
};
