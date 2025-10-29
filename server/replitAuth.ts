import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import "./types"; // Import session type extensions

// SECURITY: Open Redirect Prevention - validate returnTo URLs
function validateReturnToUrl(returnTo: string): string {
  // Only allow relative paths within the app
  if (!returnTo || typeof returnTo !== 'string') {
    return '/dashboard';
  }
  
  // Block external URLs (starts with http:// or https://)
  if (returnTo.match(/^https?:\/\//)) {
    console.warn('[SECURITY] Blocked external redirect attempt:', returnTo);
    return '/dashboard';
  }
  
  // Block protocol-relative URLs (starts with //)
  if (returnTo.startsWith('//')) {
    console.warn('[SECURITY] Blocked protocol-relative redirect attempt:', returnTo);
    return '/dashboard';
  }
  
  // Block javascript: or data: URLs
  if (returnTo.match(/^(javascript|data|vbscript):/i)) {
    console.warn('[SECURITY] Blocked script injection redirect attempt:', returnTo);
    return '/dashboard';
  }
  
  // Must start with / to be a relative path
  if (!returnTo.startsWith('/')) {
    console.warn('[SECURITY] Blocked non-relative redirect attempt:', returnTo);
    return '/dashboard';
  }
  
  // Block paths that go outside the app (../ traversal)
  if (returnTo.includes('../')) {
    console.warn('[SECURITY] Blocked path traversal redirect attempt:', returnTo);
    return '/dashboard';
  }
  
  // Block encoded attempts
  if (returnTo.includes('%') && decodeURIComponent(returnTo) !== returnTo) {
    const decoded = decodeURIComponent(returnTo);
    if (decoded.includes('../') || decoded.match(/^https?:\/\//)) {
      console.warn('[SECURITY] Blocked encoded redirect attempt:', returnTo);
      return '/dashboard';
    }
  }
  
  // Allow valid relative paths
  console.log('[SECURITY] Valid returnTo URL:', returnTo);
  return returnTo;
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // CSRF protection
      maxAge: sessionTtl,
    },
  });
}

// REMOVED: updateUserSession function no longer needed with secure token-less approach

async function handleUserAuthentication(
  claims: any,
  provider: string = 'replit'
): Promise<string> {
  const providerUserId = claims["sub"] || claims.id;
  const email = claims["email"] || claims.emailAddress;
  
  if (!providerUserId) {
    throw new Error(`No provider user ID found for ${provider} authentication`);
  }

  // First, check if this identity already exists
  let existingIdentity = await storage.getUserIdentity(provider, providerUserId);
  
  if (existingIdentity) {
    // Identity exists, just return the user ID
    // SECURITY: No token storage - tokens never persisted to database
    return existingIdentity.userId;
  }

  // Identity doesn't exist, need to create it
  let userId: string;
  
  // SECURITY FIX: Only merge accounts with verified emails and explicit user consent
  // For now, create separate accounts - implement proper merge flow later
  if (email) {
    // TODO: Implement secure account merging with email verification and user consent
    // For security, we're creating separate accounts until proper merge flow is implemented
    const newUser = await storage.upsertUser({
      email: email,
      firstName: claims["first_name"] || claims.firstName || claims.givenName,
      lastName: claims["last_name"] || claims.lastName || claims.familyName,
      profileImageUrl: claims["profile_image_url"] || claims.picture || claims.pictureUrl,
      isLocalAccount: false,
    });
    userId = newUser.id;
  } else {
    // No email provided, create new user without email
    const newUser = await storage.upsertUser({
      firstName: claims["first_name"] || claims.firstName || claims.givenName,
      lastName: claims["last_name"] || claims.lastName || claims.familyName,
      profileImageUrl: claims["profile_image_url"] || claims.picture || claims.pictureUrl,
      isLocalAccount: false,
    });
    userId = newUser.id;
  }

  // Create the new identity without storing tokens for security
  await storage.createUserIdentity({
    userId: userId,
    provider: provider,
    providerUserId: providerUserId,
    emailAtAuth: email || null,
    profileData: {
      email: claims["email"] || claims.emailAddress,
      firstName: claims["first_name"] || claims.firstName || claims.givenName,
      lastName: claims["last_name"] || claims.lastName || claims.familyName,
      profileImageUrl: claims["profile_image_url"] || claims.picture || claims.pictureUrl,
    },
    // SECURITY: Token fields completely removed from schema - no longer stored
  });

  return userId;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  // Replit Auth strategy with identity architecture
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      const userId = await handleUserAuthentication(claims, 'replit');
      
      // SECURITY: Standardized user object - no claims/tokens in session
      const user = {
        id: userId,
        provider: 'replit',
      };
      
      verified(null, user);
    } catch (error) {
      console.error('Replit authentication error:', error);
      verified(error, null);
    }
  };

  // Register Replit auth strategy for all configured domains plus localhost for development
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Add localhost for development
  if (!domains.includes("localhost")) {
    domains.push("localhost");
  }
  
  console.log(`[AUTH SETUP] Registering Replit auth strategies for domains:`, domains);
  
  for (const domain of domains) {
    try {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: domain === "localhost" ? `http://${domain}:5000/api/callback` : `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      console.log(`[AUTH SETUP] ✅ Registered Replit auth strategy: replitauth:${domain}`);
    } catch (error) {
      console.error(`[AUTH SETUP] ❌ Failed to register Replit strategy for ${domain}:`, error);
    }
  }

  // Facebook OAuth strategy with state protection
  let facebookEnabled = false;
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    try {
      passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: "/api/auth/facebook/callback",
        profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
        enableProof: true, // Enable app secret proof for additional security
        state: true // Enable OAuth state verification for CSRF protection
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // SECURITY: Don't include tokens in claims object
          const claims = {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value,
            // Tokens intentionally excluded for security
          };
          
          const userId = await handleUserAuthentication(claims, 'facebook');
          
          // SECURITY: Standardized user object across all providers
          const user = {
            id: userId,
            provider: 'facebook',
          };
          
          done(null, user);
        } catch (error) {
          console.error('Facebook authentication error:', error);
          done(error, null);
        }
      }));
      facebookEnabled = true;
      console.log(`[AUTH SETUP] ✅ Facebook OAuth strategy registered`);
    } catch (error) {
      console.error(`[AUTH SETUP] ❌ Failed to register Facebook strategy:`, error);
    }
  } else {
    console.log(`[AUTH SETUP] ⚠️  Facebook OAuth not configured (missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET)`);
  }

  // LinkedIn OAuth strategy with state protection
  let linkedinEnabled = false;
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    try {
      passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: "/api/auth/linkedin/callback",
        scope: ['r_emailaddress', 'r_liteprofile'],
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // SECURITY: Don't include tokens in claims object
          const claims = {
            id: profile.id,
            email: profile.emails?.[0]?.value || profile.emailAddress,
            firstName: profile.name?.givenName || profile.firstName,
            lastName: profile.name?.familyName || profile.lastName,
            picture: profile.photos?.[0]?.value || profile.pictureUrl,
            // Tokens intentionally excluded for security
          };
          
          const userId = await handleUserAuthentication(claims, 'linkedin');
          
          
          // SECURITY: Standardized user object across all providers
          const user = {
            id: userId,
            provider: 'linkedin',
          };
          
          done(null, user);
        } catch (error) {
          console.error('LinkedIn authentication error:', error);
          done(error, null);
        }
      }));
      linkedinEnabled = true;
      console.log(`[AUTH SETUP] ✅ LinkedIn OAuth strategy registered`);
    } catch (error) {
      console.error(`[AUTH SETUP] ❌ Failed to register LinkedIn strategy:`, error);
    }
  } else {
    console.log(`[AUTH SETUP] ⚠️  LinkedIn OAuth not configured (missing LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET)`);
  }

  // CRITICAL SECURITY: Store only user ID in session, nothing else
  passport.serializeUser((user: Express.User, cb) => {
    const userAny = user as any;
    // Store ONLY the user ID to minimize session payload and prevent token leakage
    cb(null, { id: userAny.id, provider: userAny.provider });
  });
  
  // SECURITY: Deserialize with graceful handling of old/new session formats
  passport.deserializeUser(async (sessionUser: any, cb) => {
    try {
      // Handle both old and new session formats during transition
      let userId: string;
      let provider: string;
      
      if (sessionUser && typeof sessionUser === 'object') {
        // New format: { id: 'userId', provider: 'providerName' }
        if (sessionUser.id) {
          userId = sessionUser.id;
          provider = sessionUser.provider || 'unknown';
        }
        // Old format: user object with claims or direct user properties
        else if (sessionUser.claims?.sub) {
          userId = sessionUser.claims.sub;
          provider = sessionUser.provider || 'replit';
        }
        // Fallback for any other old formats
        else {
          console.warn('Unknown session format during transition, logging out user');
          return cb(null, false); // Force re-authentication
        }
      } else {
        console.warn('Invalid session user format, logging out user');
        return cb(null, false);
      }
      
      // Verify user still exists in database
      const user = await storage.getUser(userId);
      if (!user) {
        console.warn(`User ${userId} not found in database, invalidating session`);
        return cb(null, false); // Force re-authentication
      }
      
      // Return standardized user object
      cb(null, { id: user.id, provider: provider });
    } catch (error) {
      console.error('Deserialize user error:', error);
      cb(null, false); // Force re-authentication on error
    }
  });

  // Replit Auth routes with secure redirect handling
  app.get("/api/login", (req, res, next) => {
    // Store return URL in session if provided as query parameter (with validation)
    if (req.query.returnTo && typeof req.query.returnTo === 'string') {
      req.session.returnTo = validateReturnToUrl(req.query.returnTo);
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err) {
        return res.redirect("/api/login?error=auth_failed");
      }
      if (!user) {
        return res.redirect("/api/login");
      }
      
      // Preserve returnTo before session regeneration
      const savedReturnTo = req.session?.returnTo;
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return res.redirect("/api/login?error=session_error");
        }
        
        req.logIn(user, (err) => {
          if (err) {
            return res.redirect("/api/login?error=login_failed");
          }
          
          // Get return URL from saved value or default to dashboard (with validation)
          const returnTo = validateReturnToUrl(savedReturnTo || '/dashboard');
          res.redirect(returnTo);
        });
      });
    })(req, res, next);
  });

  // Facebook OAuth routes (only if Facebook is configured)
  if (facebookEnabled) {
    app.get("/api/auth/facebook", (req, res, next) => {
      // Store return URL in session if provided as query parameter (with validation)
      if (req.query.returnTo && typeof req.query.returnTo === 'string') {
        req.session.returnTo = validateReturnToUrl(req.query.returnTo);
      }
      
      passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
    });

    app.get("/api/auth/facebook/callback", (req, res, next) => {
      passport.authenticate("facebook", (err: any, user: any) => {
        if (err) {
          return res.redirect("/?error=facebook_auth_failed");
        }
        if (!user) {
          return res.redirect("/?error=facebook_auth_failed");
        }
        
        // Preserve returnTo before session regeneration
        const savedReturnTo = req.session?.returnTo;
        
        // Regenerate session to prevent session fixation attacks
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration failed:', err);
            return res.redirect("/?error=session_error");
          }
          
          req.logIn(user, (err) => {
            if (err) {
              return res.redirect("/?error=login_failed");
            }
            
            // Get return URL from saved value or default to dashboard (with validation)
            const returnTo = validateReturnToUrl(savedReturnTo || '/dashboard');
            res.redirect(returnTo);
          });
        });
      })(req, res, next);
    });
    console.log(`[AUTH SETUP] ✅ Facebook OAuth routes registered`);
  } else {
    // Return 404 for Facebook routes when not configured
    app.get("/api/auth/facebook", (req, res) => {
      res.status(404).json({ message: "Facebook OAuth is not configured" });
    });
    app.get("/api/auth/facebook/callback", (req, res) => {
      res.status(404).json({ message: "Facebook OAuth is not configured" });
    });
  }

  // LinkedIn OAuth routes (only if LinkedIn is configured)
  if (linkedinEnabled) {
    app.get("/api/auth/linkedin", (req, res, next) => {
      // Store return URL in session if provided as query parameter (with validation)
      if (req.query.returnTo && typeof req.query.returnTo === 'string') {
        req.session.returnTo = validateReturnToUrl(req.query.returnTo);
      }
      
      passport.authenticate("linkedin", { scope: ["r_emailaddress", "r_liteprofile"] })(req, res, next);
    });

    app.get("/api/auth/linkedin/callback", (req, res, next) => {
      passport.authenticate("linkedin", (err: any, user: any) => {
        if (err) {
          return res.redirect("/?error=linkedin_auth_failed");
        }
        if (!user) {
          return res.redirect("/?error=linkedin_auth_failed");
        }
        
        // Preserve returnTo before session regeneration
        const savedReturnTo = req.session?.returnTo;
        
        // Regenerate session to prevent session fixation attacks
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration failed:', err);
            return res.redirect("/?error=session_error");
          }
          
          req.logIn(user, (err) => {
            if (err) {
              return res.redirect("/?error=login_failed");
            }
            
            // Get return URL from saved value or default to dashboard (with validation)
            const returnTo = validateReturnToUrl(savedReturnTo || '/dashboard');
            res.redirect(returnTo);
          });
        });
      })(req, res, next);
    });
    console.log(`[AUTH SETUP] ✅ LinkedIn OAuth routes registered`);
  } else {
    // Return 404 for LinkedIn routes when not configured
    app.get("/api/auth/linkedin", (req, res) => {
      res.status(404).json({ message: "LinkedIn OAuth is not configured" });
    });
    app.get("/api/auth/linkedin/callback", (req, res) => {
      res.status(404).json({ message: "LinkedIn OAuth is not configured" });
    });
  }

  // General logout route (works for all providers)
  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    req.logout(() => {
      // For Replit users, use the proper logout URL
      if (user?.provider === 'replit') {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        // For other providers, redirect to home
        res.redirect("/");
      }
    });
  });
}

// SECURITY: Simplified authentication check without token dependencies
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via passport session
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  // Verify user still exists in database
  if (!user.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(user.id);
    if (!dbUser) {
      // User was deleted from database, invalidate session
      req.logout(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }
    return next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// UH Community Verification Middleware
// Only allow users with UH email domains to access Coog Paws
export async function isUHCommunityMember(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // SECURITY FIX: Fetch user from authoritative database source instead of relying on req.user
    const dbUser = await storage.getUser(req.user.id);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    const userEmail = dbUser.email;
    if (!userEmail) {
      return res.status(403).json({ 
        message: "UH Community Access Required", 
        details: "Coog Paws is only available to verified UH community members. Please ensure your UH email is associated with your account." 
      });
    }

    // Check for valid UH email domains
    const uhDomains = [
      '@uh.edu',
      '@cougarnet.uh.edu',
      '@central.uh.edu',
      '@uhcl.edu',
      '@uhd.edu',
      '@uhv.edu'
    ];

    const isUHEmail = uhDomains.some(domain => userEmail.toLowerCase().endsWith(domain.toLowerCase()));
    
    if (!isUHEmail) {
      return res.status(403).json({ 
        message: "UH Community Access Required", 
        details: "Coog Paws is exclusively for University of Houston community members. Please use your official UH email address." 
      });
    }

    // Additional check: ensure user has completed basic profile (helps with verification)
    if (!dbUser.firstName || !dbUser.lastName) {
      return res.status(403).json({ 
        message: "Complete Profile Required", 
        details: "Please complete your basic profile information to access Coog Paws." 
      });
    }

    next();
  } catch (error) {
    console.error('UH verification failed:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Combined middleware for Coog Paws routes (authentication + UH verification)
export function requireUHAuthentication(req: any, res: any, next: any) {
  isAuthenticated(req, res, async (err: any) => {
    if (err) return next(err);
    await isUHCommunityMember(req, res, next);
  });
}
