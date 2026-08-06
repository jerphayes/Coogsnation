import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { registerLoungeNamespace } from "./lounge/rooms";
import { storage } from "./storage";
import { recordAuthEvent, clientIpOf, userAgentOf } from "./authAudit";
import { setupAuth, isAuthenticated, requireAdmin, evaluateSessionState } from "./auth";
import {
  insertForumTopicSchema,
  insertForumPostSchema,
  insertForumPostReportSchema,
  updateForumTopicSchema,
  updateForumPostSchema,
  insertNewsCommentSchema,
  insertEventSchema,
  insertNotificationSchema,
  insertCampusLocationSchema,
  userProfileCompletionSchema,
  userProfileUpdateSchema,
  localAccountRegistrationSchema,
  localLoginSchema,
  passwordResetRequestSchema,
  passwordResetVerifyMfaSchema,
  passwordResetCompleteSchema,
  phoneNumberSchema,
  createSafeUser,
  createSelfUser,
  createAdminSafeUser,
  aiQuestionSchema,
  aiChatRequestSchema,
  aiModerationRequestSchema,
  aiFeedbackSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { sendAchievementEmail } from "./emailService";
import { checkForNewAchievement, achievementLevels, getNextAchievement } from "@shared/schema";
import { PasswordService } from "./passwordService";
import { mfaService } from "./mfaService";
import { FileStorageService, FileNotFoundError } from "./fileStorage";
import { rateLimit } from "express-rate-limit";
import { getAIService } from "./ai/service";
import { AIServiceError } from "./ai/types";
import { registerAdminDashboardRoutes } from "./adminDashboard";
import { registerPublicAIRoutes } from "./publicAI";
import { registerCommerceRoutes } from "./commerce/routes";
import { registerVenueRoutes } from "./venue/routes";

// Helper function to verify Google reCAPTCHA
async function verifyRecaptcha(recaptchaResponse: string, clientIP?: string): Promise<boolean> {
  // Codespaces/local development can opt into an explicit bypass. The bypass
  // is ignored in production even if the variable is accidentally present.
  if (process.env.NODE_ENV !== "production" && process.env.RECAPTCHA_DEV_BYPASS === "true") {
    console.log(`[RECAPTCHA] Development bypass accepted from IP: ${clientIP}`);
    return true;
  }

  if (!recaptchaResponse) {
    console.log(`[RECAPTCHA] No captcha response provided from IP: ${clientIP}`);
    return false;
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('[RECAPTCHA] Secret key not configured');
    return false;
  }

  try {
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;
    const response = await fetch(verifyUrl, { method: "POST" });
    const data = await response.json() as any;

    if (data.success) {
      console.log(`[RECAPTCHA] ✅ Successful verification from IP: ${clientIP}`);
      return true;
    } else {
      console.log(`[RECAPTCHA] 🚫 Failed verification from IP: ${clientIP}, errors:`, data['error-codes']);
      return false;
    }
  } catch (error) {
    console.error(`[RECAPTCHA] ⚠️ Error verifying captcha for IP: ${clientIP}`, error);
    return false;
  }
}

// Helper function to update user statistics and check for achievements with enhanced error handling
async function updateUserStatisticsAndCheckAchievements(userId: string): Promise<void> {
  console.log(`[ACHIEVEMENT TRACKING] Starting achievement check for user ${userId}`);
  
  try {
    // Get user before updating statistics to compare old vs new post count
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`[ACHIEVEMENT TRACKING] ❌ User not found for achievement tracking: ${userId}`);
      return;
    }
    
    const oldPostCount = user.postCount || 0;
    console.log(`[ACHIEVEMENT TRACKING] User ${userId} current stats: posts=${oldPostCount}, threads=${user.threadCount || 0}, level=${user.achievementLevel}`);
    
    // Update user statistics (this will calculate new post counts and achievement level)
    const updatedStats = await storage.updateUserStatistics(userId);
    console.log(`[ACHIEVEMENT TRACKING] Updated stats for user ${userId}: posts=${updatedStats.postCount}, threads=${updatedStats.threadCount}`);
    
    // Check if a new achievement was earned
    const achievementCheck = checkForNewAchievement(oldPostCount, updatedStats.postCount);
    
    if (achievementCheck.earned && achievementCheck.newLevel) {
      console.log(`[ACHIEVEMENT TRACKING] 🏆 User ${userId} earned new achievement: ${achievementCheck.newLevel} (posts: ${oldPostCount} → ${updatedStats.postCount})`);
      
      // Get updated user data for email
      const updatedUser = await storage.getUser(userId);
      if (updatedUser) {
        // Send achievement email (async, don't wait for it but log the result)
        sendAchievementEmail(updatedUser, achievementCheck.newLevel)
          .then(success => {
            if (success) {
              console.log(`[ACHIEVEMENT TRACKING] ✅ Achievement email queued successfully for user ${userId}, level: ${achievementCheck.newLevel}`);
            } else {
              console.error(`[ACHIEVEMENT TRACKING] ❌ Failed to queue achievement email for user ${userId}, level: ${achievementCheck.newLevel}`);
            }
          })
          .catch(error => {
            console.error(`[ACHIEVEMENT TRACKING] 💥 Error sending achievement email for user ${userId}:`, {
              userId,
              newLevel: achievementCheck.newLevel,
              error: error.message || error
            });
          });
      } else {
        console.error(`[ACHIEVEMENT TRACKING] ❌ Could not retrieve updated user data for email sending: ${userId}`);
      }
    } else {
      console.log(`[ACHIEVEMENT TRACKING] No new achievements for user ${userId} (posts: ${oldPostCount} → ${updatedStats.postCount})`);
    }
    
    console.log(`[ACHIEVEMENT TRACKING] ✅ Achievement check completed for user ${userId}`);
  } catch (error: any) {
    console.error(`[ACHIEVEMENT TRACKING] 💥 Critical error in updateUserStatisticsAndCheckAchievements for user ${userId}:`, {
      userId,
      error: error.message || error,
      stack: error.stack
    });
    
    // Don't throw - this is called asynchronously and shouldn't break the main flow
  }
}

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all standard image formats
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed! Supported formats: JPG, PNG, GIF, WebP, BMP, TIFF'));
    }
  },
});

// Helper to render nav menu
function renderNav(role: string, username?: string) {
  let userDisplay = username ? username : "Guest";

  // Add gavel icon if admin
  if (role === "admin") {
    userDisplay = `<img src="/gavel.svg" alt="Admin" style="width:16px; vertical-align:middle; margin-right:4px;"> ${userDisplay}`;
  }

  return `
    <nav style="background:#c8102e; padding:10px; color:white;">
      <a href="/" style="color:white;">Home</a> |
      <a href="/forums" style="color:white;">Forums</a> |
      <a href="/sports" style="color:white;">Sports News</a> |
      <a href="/alumni" style="color:white;">Alumni Store</a> |
      <a href="/events" style="color:white;">Events</a> |
      <a href="/community" style="color:white;">Community</a>
      ${role === "admin" ? ' | <a href="/admin" style="color:white;">Admin Dashboard</a>' : ""}
      <span style="float:right;">👤 ${userDisplay}</span>
    </nav>
  `;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Auth middleware
  const sessionMiddleware = await setupAuth(app);
  const aiService = getAIService();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again later." },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many AI requests. Please try again shortly." },
  });

  // CSRF/origin guard for authenticated browser requests that change state.
  app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !req.isAuthenticated()) {
      return next();
    }

    const source = req.get("origin") || req.get("referer");
    if (!source) {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ message: "Request origin could not be verified" });
      }
      return next();
    }

    try {
      const sourceUrl = new URL(source);
      const configuredOrigins = [
        process.env.APP_ORIGIN,
        process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : undefined,
      ].filter(Boolean) as string[];
      const requestOrigin = `${req.protocol}://${req.get("host")}`;
      const allowedOrigins = new Set([requestOrigin, ...configuredOrigins]);
      if (!allowedOrigins.has(sourceUrl.origin)) {
        return res.status(403).json({ message: "Untrusted request origin" });
      }
      return next();
    } catch {
      return res.status(403).json({ message: "Invalid request origin" });
    }
  });

  // Owner-controlled administrator dashboard and read-only administrator AI.
  // Registered after the origin guard so every state-changing action receives
  // the same CSRF/origin protection as the rest of the authenticated API.
  registerAdminDashboardRoutes(app);
  registerPublicAIRoutes(app, { aiService, isAuthenticated, aiLimiter });
  registerCommerceRoutes(app);
  registerVenueRoutes(app, isAuthenticated);

  // Optional social-login aliases. Core email/password authentication is always available.
  app.get("/auth/linkedin", (req, res) => {
    const returnTo = encodeURIComponent(String(req.query.redirect || "/dashboard"));
    res.redirect(`/api/auth/linkedin?returnTo=${returnTo}`);
  });

  app.get("/auth/facebook", (req, res) => {
    const returnTo = encodeURIComponent(String(req.query.redirect || "/dashboard"));
    res.redirect(`/api/auth/facebook?returnTo=${returnTo}`);
  });

  app.get("/auth/email", (_req, res) => {
    res.redirect("/login");
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // SECURITY: Use standardized user.id from fixed passport serialization
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Return safe user object without sensitive fields
      res.json(createSelfUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current user profile (for ProfileDisplay component)
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Return profile data compatible with ProfileDisplay
      res.json({
        handle: user.handle,
        displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Coogs Fan",
        avatar_url: user.profileImageUrl || ""
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Check handle availability
  app.get('/api/auth/check-handle', async (req, res) => {
    try {
      const { handle } = req.query;
      
      if (!handle || typeof handle !== 'string') {
        return res.status(400).json({ message: "Handle is required" });
      }

      const normalizedHandle = handle.trim();
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalizedHandle)) {
        return res.status(400).json({
          message: "Handle must be 3-30 characters and contain only letters, numbers, and underscores",
        });
      }

      const existingUser = await storage.getUserByHandle(normalizedHandle);
      const currentUserId = (req.user as any)?.id;
      res.json({ available: !existingUser || existingUser.id === currentUserId });
    } catch (error) {
      console.error("Error checking handle:", error);
      res.status(500).json({ message: "Failed to check handle availability" });
    }
  });

  // Check email availability (for local accounts)
  app.get('/api/auth/check-email', async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      res.json({ available: !existingUser });
    } catch (error) {
      console.error("Error checking email:", error);
      res.status(500).json({ message: "Failed to check email availability" });
    }
  });

  // Local account registration (password-based)
  app.post('/api/auth/register-local', async (req, res) => {
    try {
      const validatedData = localAccountRegistrationSchema.parse(req.body);
      
      // Verify reCAPTCHA
      const recaptchaResponse = req.body["g-recaptcha-response"];
      const clientIP = Array.isArray(req.headers["x-forwarded-for"]) 
        ? req.headers["x-forwarded-for"][0] 
        : req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      
      const isRecaptchaValid = await verifyRecaptcha(recaptchaResponse, clientIP);
      if (!isRecaptchaValid) {
        console.log(`[SECURITY] Registration blocked - reCAPTCHA failed from IP: ${clientIP}`);
        return res.status(400).json({ 
          message: "Please complete the reCAPTCHA verification to continue.",
          error: "recaptcha_failed"
        });
      }

      // Check if email is already taken
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email is already registered" });
      }

      // A custom handle is optional. When supplied, it must still be unique.
      if (validatedData.handle) {
        const existingUserByHandle = await storage.getUserByHandle(validatedData.handle);
        if (existingUserByHandle) {
          return res.status(400).json({ message: "Handle is already taken" });
        }
      }

      // Hash the password
      const passwordHash = await PasswordService.hashPassword(validatedData.password);

      // Create local user
      const newUser = await storage.createLocalUser({
        id: undefined, // Let database generate UUID
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        nickname: validatedData.nickname || null,
        handle: validatedData.handle || null,
        passwordHash,
        backupEmail: validatedData.backupEmail || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        zipCode: validatedData.zipCode || null,
        dateOfBirth: validatedData.dateOfBirth,
        fanType: validatedData.fanType || null,
        memberCategory: validatedData.memberCategory || null,
        commentsAndSuggestions: validatedData.commentsAndSuggestions || null,
        favoriteSports: validatedData.favoriteSports ? JSON.stringify(validatedData.favoriteSports) : null,
        otherSportComment: validatedData.otherSportComment,
        hasConsentedToDataUse: validatedData.hasConsentedToDataUse,
        hasConsentedToMarketing: validatedData.hasConsentedToMarketing || false,
        consentedAt: new Date(),
        isProfileComplete: true,
        profileCompletedAt: new Date(),
        isLocalAccount: true,
        // Enhanced membership fields
        aboutMe: validatedData.aboutMe || null,
        interests: validatedData.interests || null,
        affiliation: validatedData.affiliation || null,
        defaultAvatarChoice: validatedData.defaultAvatarChoice || null,
        graduationYear: validatedData.graduationYear || null,
        majorOrDepartment: validatedData.majorOrDepartment || null,
        socialLinks: validatedData.socialLinks || null,
        addressLine1: validatedData.addressLine1 || null,
        country: validatedData.country || null,
        optInOffers: validatedData.optInOffers || false,
      });

      res.status(201).json({ 
        message: "Account created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          handle: newUser.handle,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating local account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Local login verification - uses handle as username with account lockout
  app.post('/api/auth/login-local', loginLimiter, async (req, res) => {
    try {
      const validatedData = localLoginSchema.parse(req.body);
      
      // Accept either an email address or a handle as the login identifier.
      // Resolved server-side so the client sends one field either way.
      const identifier = validatedData.handle.trim();
      const user = identifier.includes("@")
        ? await storage.getUserByEmail(identifier.toLowerCase())
        : await storage.getUserByHandle(identifier);
      if (!user || !user.isLocalAccount || !user.passwordHash) {
        // Don't reveal if user exists or not - just generic error
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      // Check if account is locked
      const isLocked = await storage.isAccountLocked(user.id);
      if (isLocked) {
        console.log(`[SECURITY] Login attempt on locked account: ${user.handle} (ID: ${user.id})`);
        return res.status(423).json({ 
          message: "Account is temporarily locked due to multiple failed login attempts. Please try again later or contact support.",
          lockedUntil: user.lockedUntil
        });
      }

      // Verify password
      const isPasswordValid = await PasswordService.verifyPassword(
        validatedData.password, 
        user.passwordHash
      );
      
      if (!isPasswordValid) {
        // Record failed login attempt
        await storage.recordFailedLoginAttempt(user.id);
        console.log(`[SECURITY] Failed login attempt for user: ${user.handle} (ID: ${user.id}), attempts: ${(user.failedLoginAttempts || 0) + 1}`);
        
        // Check if this attempt resulted in account lockout
        const nowLocked = await storage.isAccountLocked(user.id);
        if (nowLocked) {
          console.log(`[SECURITY] Account locked due to failed attempts: ${user.handle} (ID: ${user.id})`);
          return res.status(423).json({ 
            message: "Account has been temporarily locked due to multiple failed login attempts. Please try again in 30 minutes or contact support."
          });
        }
        
        void recordAuthEvent({
          eventType: "login",
          outcome: "failure",
          userId: user.id,
          identifier,
          clientIp: clientIpOf(req as any),
          userAgent: userAgentOf(req as any),
          detail: "invalid_password",
        });
        return res.status(401).json({ message: "Invalid username/email or password" });
      }

      // Enforce account lifecycle state: only active accounts may authenticate.
      const status = user.accountStatus ?? "active";
      if (status !== "active") {
        await recordAuthEvent({
          eventType: "login",
          outcome: "blocked",
          userId: user.id,
          identifier,
          clientIp: clientIpOf(req as any),
          userAgent: userAgentOf(req as any),
          detail: `account_status=${status}`,
        });
        return res.status(403).json({
          message: "This account is not active. Please contact support.",
        });
      }

      // Successful login - clear any failed attempts
      await storage.clearFailedLoginAttempts(user.id);
      console.log(`[SECURITY] Successful login for user: ${user.handle} (ID: ${user.id})`);

      // CRITICAL SECURITY: Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration failed during local login:', err);
          return res.status(500).json({ message: "Login failed - session error" });
        }
        
        // Capture the account's session version. isAuthenticated compares this
        // against the database on every request, so incrementing
        // users.session_version revokes all outstanding sessions.
        (req.session as any).sessionVersion = user.sessionVersion ?? 0;

        // Create standardized user object for passport
        const authUser = {
          id: user.id,
          provider: 'local',
        };
        
        // Log in user via passport
        req.logIn(authUser, (err) => {
          if (err) {
            console.error('Local login session establishment failed:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          void recordAuthEvent({
            eventType: "login",
            outcome: "success",
            userId: user.id,
            identifier,
            clientIp: clientIpOf(req as any),
            userAgent: userAgentOf(req as any),
          });

          // Return success with basic user info
          res.json({ 
            message: "Login successful",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              handle: user.handle,
            }
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // SECURE Password reset endpoints with durable rate limiting and brute force protection
  
  // Step 1: Request password reset (sends MFA code via SMS/email) - RATE LIMITED
  app.post('/api/auth/password-reset/request', async (req, res) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      
      // SECURITY: Database-backed rate limiting - max 3 requests per IP per 15 minutes
      const ipKey = `ip:${clientIp}`;
      const rateLimitCheck = await storage.checkRateLimit(ipKey, 'password_reset', 3, 15);
      
      if (!rateLimitCheck.allowed) {
        console.log(`[SECURITY] Rate limit exceeded for password reset requests from IP ${clientIp}`);
        return res.status(429).json({ 
          message: `Too many password reset requests. Please wait ${rateLimitCheck.remainingTime} minutes before trying again.` 
        });
      }
      
      const validatedData = passwordResetRequestSchema.parse(req.body);
      
      // Always return success response to prevent user enumeration
      const successResponse = {
        message: "If an account with that identifier exists, a password reset code has been sent.",
        success: true
      };

      // Find user by email or handle
      let user = await storage.getUserByEmail(validatedData.identifier);
      if (!user) {
        user = await storage.getUserByHandle(validatedData.identifier);
      }

      // Record rate limit attempt in database
      await storage.recordRateLimitAttempt(ipKey, 'password_reset');

      if (!user || !user.isLocalAccount) {
        console.log(`[SECURITY] Password reset requested for non-existent/non-local account: ${validatedData.identifier} from IP ${clientIp}`);
        // Add delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        return res.json(successResponse);
      }

      // SECURITY: Check if user is MFA locked
      if (user.mfaLockedUntil && new Date(user.mfaLockedUntil) > new Date()) {
        console.log(`[SECURITY] Password reset blocked - MFA locked until ${user.mfaLockedUntil} for user: ${user.handle} (ID: ${user.id})`);
        return res.json(successResponse); // Don't reveal MFA lock status
      }

      // Check if account is locked
      const isLocked = await storage.isAccountLocked(user.id);
      if (isLocked) {
        console.log(`[SECURITY] Password reset requested for locked account: ${user.handle} (ID: ${user.id})`);
        return res.json(successResponse); // Don't reveal account is locked
      }

      console.log(`[SECURITY] Password reset requested for user: ${user.handle} (ID: ${user.id}) from IP ${clientIp}`);
      
      // Reset MFA attempts for new password reset flow
      await storage.clearMfaAttempts(user.id);
      
      // Send MFA token via SMS and email
      const { smsSuccess, emailSuccess } = await mfaService.sendMfaToken(user.id, 'password_reset');
      
      if (!smsSuccess && !emailSuccess) {
        console.error(`[SECURITY] Failed to send MFA token for password reset: ${user.handle} (ID: ${user.id})`);
        return res.json(successResponse); // Still return success to prevent enumeration
      }
      
      console.log(`[SECURITY] MFA token sent for password reset: ${user.handle} (SMS: ${smsSuccess}, Email: ${emailSuccess})`);
      
      res.json(successResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Step 2: Verify MFA token - BRUTE FORCE PROTECTED
  app.post('/api/auth/password-reset/verify-mfa', async (req, res) => {
    try {
      const validatedData = passwordResetVerifyMfaSchema.parse(req.body);
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Find user by email or handle
      let user = await storage.getUserByEmail(validatedData.identifier);
      if (!user) {
        user = await storage.getUserByHandle(validatedData.identifier);
      }

      // SECURITY: Generic response whether user exists or not (prevent enumeration)
      const genericErrorResponse = { message: "Invalid verification code" };

      if (!user || !user.isLocalAccount) {
        console.log(`[SECURITY] MFA verification attempt for non-existent/non-local account: ${validatedData.identifier} from IP ${clientIp}`);
        // Add delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        return res.status(400).json(genericErrorResponse);
      }

      // SECURITY: Check if MFA is locked due to too many failed attempts
      if (user.mfaLockedUntil && new Date(user.mfaLockedUntil) > new Date()) {
        const remainingTime = Math.ceil((new Date(user.mfaLockedUntil).getTime() - Date.now()) / 1000 / 60);
        console.log(`[SECURITY] MFA verification blocked - locked for ${remainingTime} more minutes for user: ${user.handle} (ID: ${user.id})`);
        return res.status(400).json(genericErrorResponse); // Don't reveal lock status
      }

      // Record the MFA attempt BEFORE verification
      await storage.recordMfaAttempt(user.id);
      
      // Verify MFA token
      const isValidToken = await mfaService.verifyMfaToken(user.id, validatedData.mfaToken);
      
      if (!isValidToken) {
        console.log(`[SECURITY] Invalid MFA token for password reset: ${user.handle} (ID: ${user.id}, attempts: ${(user.mfaAttempts || 0) + 1}) from IP ${clientIp}`);
        
        // Check if we need to lock MFA due to too many attempts
        const updatedUser = await storage.getUser(user.id);
        if (updatedUser && (updatedUser.mfaAttempts || 0) >= 5) {
          await storage.lockMfaForUser(user.id, 15); // 15 minutes lockout
          console.log(`[SECURITY] MFA locked for 15 minutes due to ${updatedUser.mfaAttempts} failed attempts for user: ${user.handle} (ID: ${user.id})`);
        }
        
        return res.status(400).json(genericErrorResponse);
      }
      
      // Success! Clear MFA attempts
      await storage.clearMfaAttempts(user.id);
      console.log(`[SECURITY] MFA token verified for password reset: ${user.handle} (ID: ${user.id}) from IP ${clientIp}`);
      
      res.json({
        message: "Verification code confirmed. You can now set your new password.",
        verified: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error verifying MFA for password reset:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Step 3: Complete password reset with new password - BRUTE FORCE PROTECTED
  app.post('/api/auth/password-reset/complete', async (req, res) => {
    try {
      const validatedData = passwordResetCompleteSchema.parse(req.body);
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Find user by email or handle
      let user = await storage.getUserByEmail(validatedData.identifier);
      if (!user) {
        user = await storage.getUserByHandle(validatedData.identifier);
      }

      const genericErrorResponse = { message: "Invalid request" };

      if (!user || !user.isLocalAccount) {
        console.log(`[SECURITY] Password reset completion attempt for non-existent/non-local account: ${validatedData.identifier} from IP ${clientIp}`);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        return res.status(400).json(genericErrorResponse);
      }

      // SECURITY: Check if MFA is locked
      if (user.mfaLockedUntil && new Date(user.mfaLockedUntil) > new Date()) {
        console.log(`[SECURITY] Password reset completion blocked - MFA locked for user: ${user.handle} (ID: ${user.id})`);
        return res.status(400).json(genericErrorResponse);
      }

      // Record MFA attempt before verification
      await storage.recordMfaAttempt(user.id);
      
      // Verify MFA token one more time for security
      const isValidToken = await mfaService.verifyMfaToken(user.id, validatedData.mfaToken);
      
      if (!isValidToken) {
        console.log(`[SECURITY] Invalid MFA token for password reset completion: ${user.handle} (ID: ${user.id}) from IP ${clientIp}`);
        
        // Check if we need to lock MFA
        const updatedUser = await storage.getUser(user.id);
        if (updatedUser && (updatedUser.mfaAttempts || 0) >= 5) {
          await storage.lockMfaForUser(user.id, 15);
          console.log(`[SECURITY] MFA locked for password reset completion due to failed attempts for user: ${user.handle} (ID: ${user.id})`);
        }
        
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      // Hash the new password
      const newPasswordHash = await PasswordService.hashPassword(validatedData.newPassword);
      
      // Update password and clear any account locks and MFA attempts
      await Promise.all([
        storage.updatePassword(user.id, newPasswordHash),
        storage.clearFailedLoginAttempts(user.id),
        storage.clearMfaAttempts(user.id),
        mfaService.clearMfaToken(user.id)
      ]);

      console.log(`[SECURITY] Password reset completed successfully for user: ${user.handle} (ID: ${user.id}) from IP ${clientIp}`);
      
      res.json({ 
        message: "Password reset successful. You can now log in with your new password.",
        success: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error completing password reset:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // SECURE Avatar upload endpoint with comprehensive validation and object storage
  const secureAvatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB limit (security requirement)
      files: 1, // Only allow 1 file
    },
    fileFilter: (req, file, cb) => {
      // SECURITY: Only allow JPEG, PNG, WebP (no SVG, GIF, BMP, TIFF for XSS protection)
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];
      
      // Check both declared MIME type and file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        console.log(`[SECURITY] Avatar upload blocked - invalid type: ${file.mimetype}, ext: ${fileExtension}`);
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
      }
    },
  });

  app.post('/api/auth/upload-avatar', isAuthenticated, secureAvatarUpload.single('avatar'), async (req: any, res) => {
    const userId = req.user.id;
    const startTime = Date.now();
    
    try {
      const file = req.file;

      if (!file) {
        console.log(`[SECURITY] Avatar upload failed - no file provided by user ${userId}`);
        return res.status(400).json({ message: "No file uploaded" });
      }

      // SECURITY: Validate file size again (defense in depth)
      if (file.size > 2 * 1024 * 1024) {
        console.log(`[SECURITY] Avatar upload blocked - file too large: ${file.size} bytes for user ${userId}`);
        return res.status(400).json({ message: "File too large. Maximum size is 2MB" });
      }

      // SECURITY: Content-Type sniffing - verify actual file format using Sharp
      let imageMetadata;
      try {
        imageMetadata = await sharp(file.buffer, { limitInputPixels: 16_777_216 }).metadata();
      } catch (sharpError: any) {
        console.log(`[SECURITY] Avatar upload blocked - invalid image format for user ${userId}: ${sharpError?.message || sharpError}`);
        return res.status(400).json({ message: "Invalid image format" });
      }

      // SECURITY: Validate image format matches allowed types
      const allowedFormats = ['jpeg', 'png', 'webp'];
      if (!imageMetadata.format || !allowedFormats.includes(imageMetadata.format)) {
        console.log(`[SECURITY] Avatar upload blocked - unsupported format: ${imageMetadata.format} for user ${userId}`);
        return res.status(400).json({ message: "Unsupported image format" });
      }

      // SECURITY: Reject decompression-bomb-sized inputs, then resize normal
      // photos down to a 500x500 avatar. Requiring the original upload to
      // already be 500x500 made most phone photos unusable.
      if (!imageMetadata.width || !imageMetadata.height) {
        console.log(`[SECURITY] Avatar upload blocked - unable to determine dimensions for user ${userId}`);
        return res.status(400).json({ message: "Unable to determine image dimensions" });
      }

      if (imageMetadata.width * imageMetadata.height > 16_777_216) {
        console.log(`[SECURITY] Avatar upload blocked - pixel count too large: ${imageMetadata.width}x${imageMetadata.height} for user ${userId}`);
        return res.status(400).json({ message: "Image is too large to process safely" });
      }

      // SECURITY: Process image to strip EXIF data and ensure clean format
      let processedImageBuffer;
      try {
        processedImageBuffer = await sharp(file.buffer, { limitInputPixels: 16_777_216 })
          .rotate()
          .resize({
            width: 500,
            height: 500,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 }) // Convert all to JPEG for consistency and security
          .toBuffer();
      } catch (processError) {
        console.error(`[SECURITY] Avatar processing failed for user ${userId}:`, processError);
        return res.status(500).json({ message: "Image processing failed" });
      }

      // Upload to secure object storage
      const fileStorageService = new FileStorageService();
      let avatarUrl;
      
      try {
        avatarUrl = await fileStorageService.uploadAvatarDirect(
          userId,
          processedImageBuffer,
          'image/jpeg'
        );
      } catch (storageError) {
        console.error(`[SECURITY] File storage upload failed for user ${userId}:`, storageError);
        return res.status(500).json({ message: "Failed to save avatar" });
      }

      // Update user's profile image URL in database
      const updatedUser = await storage.updateProfileImage(userId, avatarUrl);
      
      const duration = Date.now() - startTime;
      console.log(`[SECURITY] ✅ Secure avatar upload completed for user ${userId}: ${avatarUrl} (${duration}ms)`);
      
      res.json({
        message: "Avatar uploaded successfully",
        avatarUrl: avatarUrl,
        user: createSelfUser(updatedUser)
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          console.log(`[SECURITY] Avatar upload blocked - size limit exceeded for user ${userId} (${duration}ms)`);
          return res.status(400).json({ message: "File too large. Maximum size is 2MB" });
        }
        console.log(`[SECURITY] Avatar upload blocked - multer error for user ${userId}: ${error.code} (${duration}ms)`);
        return res.status(400).json({ message: "File upload error" });
      }
      
      console.error(`[SECURITY] 💥 Avatar upload failed for user ${userId} (${duration}ms):`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ message: "Avatar upload failed" });
    }
  });

  // Delete the signed-in user's current avatar.
  app.delete('/api/delete-avatar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const currentUser = await storage.getUser(userId);
      const currentAvatar = currentUser?.profileImageUrl || "";
      if (currentAvatar.startsWith("/objects/")) {
        const fileStorage = new FileStorageService();
        await fileStorage.deleteByObjectPath(currentAvatar, userId);
      }
      await storage.updateProfileImage(userId, "");
      res.json({ message: "Avatar deleted successfully" });
    } catch (error) {
      console.error("Avatar deletion error:", error);
      res.status(500).json({ error: "Error deleting avatar" });
    }
  });

  // Serve application-managed files. Public files do not require a login; private
  // files are available only to their owner.
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const fileStorage = new FileStorageService();
    try {
      const file = await fileStorage.getFile(req.path);
      const userId = req.isAuthenticated?.() ? req.user?.id : undefined;
      if (!fileStorage.canAccess(file, userId)) return res.sendStatus(404);
      fileStorage.download(file, res);
    } catch (error) {
      if (error instanceof FileNotFoundError) return res.sendStatus(404);
      console.error(`Error accessing stored file ${req.path}:`, error);
      return res.sendStatus(500);
    }
  });

  // Account unlocks are handled by the password-confirmed, transactionally audited
  // /api/admin/users/:id/unlock route in adminDashboard.ts.

  // Get account security status (admin only)
  app.get('/api/admin/account-status/:identifier', requireAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const identifier = req.params.identifier;

      // Find user by ID or handle
      let user = await storage.getUser(identifier);
      if (!user) {
        user = await storage.getUserByHandle(identifier);
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isLocked = await storage.isAccountLocked(user.id);
      
      console.log(`[ADMIN] Account status checked by admin ${adminUserId} for user: ${user.handle} (ID: ${user.id})`);
      
      res.json({
        user: {
          id: user.id,
          handle: user.handle,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isLocalAccount: user.isLocalAccount
        },
        security: {
          isLocked: isLocked,
          failedLoginAttempts: user.failedLoginAttempts || 0,
          lockedUntil: user.lockedUntil,
          lastFailedAttempt: user.lastFailedAttempt,
          hasPhoneNumber: !!user.phoneNumber,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt
        }
      });
    } catch (error) {
      console.error("Error checking account status:", error);
      res.status(500).json({ message: "Failed to check account status" });
    }
  });

  // User statistics routes for testing
  app.get('/api/user/statistics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserStatistics(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      res.status(500).json({ message: "Failed to fetch user statistics" });
    }
  });

  app.post('/api/user/statistics/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updatedStats = await storage.updateUserStatistics(userId);
      res.json(updatedStats);
    } catch (error) {
      console.error("Error updating user statistics:", error);
      res.status(500).json({ message: "Failed to update user statistics" });
    }
  });

  // Achievement routes
  app.get('/api/achievements/levels', async (req, res) => {
    try {
      res.json(achievementLevels);
    } catch (error) {
      console.error("Error fetching achievement levels:", error);
      res.status(500).json({ message: "Failed to fetch achievement levels" });
    }
  });

  app.get('/api/user/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const nextInfo = getNextAchievement(user.postCount || 0);
      
      res.json({
        currentLevel: user.achievementLevel,
        postCount: user.postCount || 0,
        threadCount: user.threadCount || 0,
        lastAchievementDate: user.lastAchievementDate,
        nextLevel: nextInfo.nextLevel,
        postsNeeded: nextInfo.postsNeeded
      });
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  app.get('/api/achievements/leaderboard', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Get top users by achievement level and post count
      const topUsers = await storage.getAllUsersWithStatistics();
      
      // Sort by achievement level (using index) and then by post count
      const sortedUsers = topUsers
        .map(user => ({
          ...user,
          achievementIndex: achievementLevels.findIndex(level => level.level === user.achievementLevel)
        }))
        .sort((a, b) => {
          // First sort by achievement level (higher index = higher level)
          if (a.achievementIndex !== b.achievementIndex) {
            return b.achievementIndex - a.achievementIndex;
          }
          // Then sort by post count
          return b.postCount - a.postCount;
        })
        .slice(0, limit)
        .map(({ achievementIndex, ...user }) => user); // Remove the temporary index
      
      res.json(sortedUsers);
    } catch (error) {
      console.error("Error fetching achievement leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch achievement leaderboard" });
    }
  });

  // File upload route for images
  app.post('/api/upload/image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const file = req.file;
      const userId = req.user.id;
      const timestamp = Date.now();
      
      // Get file extension, default to .jpg if none
      let extension = path.extname(file.originalname).toLowerCase();
      if (!extension) {
        // Determine extension from mimetype
        if (file.mimetype === 'image/jpeg') extension = '.jpg';
        else if (file.mimetype === 'image/png') extension = '.png';
        else if (file.mimetype === 'image/gif') extension = '.gif';
        else if (file.mimetype === 'image/webp') extension = '.webp';
        else extension = '.jpg'; // default
      }
      
      const filename = `${userId}-${timestamp}${extension}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'uploads');
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, filename);

      // Write file to uploads directory
      await fs.writeFile(filePath, file.buffer);

      // Return the public URL that can be used in content
      const publicUrl = `/api/assets/images/${filename}`;
      
      res.json({ 
        url: publicUrl,
        filename: filename,
        size: file.size,
        mimetype: file.mimetype
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
      }
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Serve uploaded images
  app.get('/api/assets/images/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      // Sanitize filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), 'uploads', sanitizedFilename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
        
        // Set appropriate content type
        const ext = path.extname(sanitizedFilename).toLowerCase();
        const contentType = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg', 
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.bmp': 'image/bmp',
          '.tiff': 'image/tiff',
          '.svg': 'image/svg+xml'
        }[ext] || 'image/jpeg';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.sendFile(path.resolve(filePath));
      } catch {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // Forum routes
  app.get('/api/forums/categories', async (req, res) => {
    try {
      const categories = await storage.getForumCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching forum categories:", error);
      res.status(500).json({ message: "Failed to fetch forum categories" });
    }
  });

  app.get('/api/forums/categories/:categoryId/topics', async (req, res) => {
    try {
      const categoryId = Number(req.params.categoryId);
      if (!Number.isInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({ message: "Invalid forum category" });
      }

      const category = await storage.getForumCategory(categoryId);
      if (!category || category.slug === "coogpaws") {
        return res.status(404).json({ message: "Forum category not found" });
      }

      const requestedLimit = req.query.limit ? Number(req.query.limit) : 20;
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
      const topics = await storage.getForumTopicsByCategory(categoryId, limit);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching forum topics:", error);
      res.status(500).json({ message: "Failed to fetch forum topics" });
    }
  });

  app.get('/api/forums/topics/:topicId', async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const topic = await storage.getForumTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      res.json(topic);
    } catch (error) {
      console.error("Error fetching forum topic:", error);
      res.status(500).json({ message: "Failed to fetch forum topic" });
    }
  });

  app.post('/api/forums/topics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Generate slug from title
      const slug = req.body.title
        ? req.body.title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
        : '';
      
      const validatedData = insertForumTopicSchema.parse({
        ...req.body,
        slug: `${slug}-${Date.now()}`, // Add timestamp for uniqueness
        authorId: userId,
      });

      const category = await storage.getForumCategory(validatedData.categoryId);
      if (!category || category.slug === "coogpaws") {
        return res.status(400).json({ message: "A valid active forum category is required" });
      }
      
      const topic = await storage.createForumTopic(validatedData);
      
      // Update user statistics and check for achievements (async, don't block response)
      updateUserStatisticsAndCheckAchievements(userId).catch(error => {
        console.error("Error updating user statistics after topic creation:", error);
      });
      
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating forum topic:", error);
      res.status(500).json({ message: "Failed to create forum topic" });
    }
  });

  app.get('/api/forums/topics/:topicId/posts', async (req, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const posts = await storage.getForumPostsByTopic(topicId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching forum posts:", error);
      res.status(500).json({ message: "Failed to fetch forum posts" });
    }
  });

  app.post('/api/forums/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validatedData = insertForumPostSchema.parse({
        ...req.body,
        authorId: userId,
      });

      const topic = await storage.getForumTopic(validatedData.topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      if (topic.isLocked) {
        return res.status(409).json({ message: "This topic is locked" });
      }
      const category = await storage.getForumCategory(topic.categoryId);
      if (!category || category.slug === "coogpaws") {
        return res.status(404).json({ message: "Forum category not found" });
      }
      
      const post = await storage.createForumPost(validatedData);
      
      // Update user statistics and check for achievements (async, don't block response)
      updateUserStatisticsAndCheckAchievements(userId).catch(error => {
        console.error("Error updating user statistics after post creation:", error);
      });
      
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating forum post:", error);
      res.status(500).json({ message: "Failed to create forum post" });
    }
  });

  app.post('/api/forums/posts/:postId/report', isAuthenticated, async (req: any, res) => {
    try {
      const postId = Number(req.params.postId);
      if (!Number.isInteger(postId) || postId < 1) {
        return res.status(400).json({ message: "Invalid forum post" });
      }

      const post = await storage.getForumPost(postId);
      if (!post || post.isDeleted) {
        return res.status(404).json({ message: "Forum post not found" });
      }

      const rateLimitKey = `forum_report_${req.user.id}`;
      const rateLimitCheck = await storage.checkRateLimit(rateLimitKey, "forum_post_report", 5, 60);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ message: "Too many reports. Please wait before submitting another." });
      }

      const validatedData = insertForumPostReportSchema.parse({
        ...req.body,
        postId,
      });
      const report = await storage.createForumPostReport({
        ...validatedData,
        reportedById: req.user.id,
      });
      await storage.recordRateLimitAttempt(rateLimitKey, "forum_post_report");
      res.status(201).json({ report, message: "Report submitted for moderator review" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report", errors: error.errors });
      }
      console.error("Error reporting forum post:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // Update topic (owner only)
  app.patch('/api/forums/topics/:topicId', isAuthenticated, async (req: any, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const topic = await storage.getForumTopic(topicId);
      
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      // Check if user is the owner
      if (topic.authorId !== req.user.id) {
        return res.status(403).json({ message: "You can only edit your own topics" });
      }
      
      const validatedData = updateForumTopicSchema.parse(req.body);
      
      const updatedTopic = await storage.updateForumTopic(topicId, validatedData);
      res.json(updatedTopic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating forum topic:", error);
      res.status(500).json({ message: "Failed to update forum topic" });
    }
  });

  // Delete topic (owner only)
  app.delete('/api/forums/topics/:topicId', isAuthenticated, async (req: any, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const topic = await storage.getForumTopic(topicId);
      
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      // Check if user is the owner
      if (topic.authorId !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own topics" });
      }
      
      await storage.deleteForumTopic(topicId);
      res.status(200).json({ message: "Topic deleted successfully" });
    } catch (error) {
      console.error("Error deleting forum topic:", error);
      res.status(500).json({ message: "Failed to delete forum topic" });
    }
  });

  // Update post (owner only)
  app.patch('/api/forums/posts/:postId', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const post = await storage.getForumPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Check if user is the owner
      if (post.authorId !== req.user.id) {
        return res.status(403).json({ message: "You can only edit your own posts" });
      }
      
      const validatedData = updateForumPostSchema.parse(req.body);
      
      const updatedPost = await storage.updateForumPost(postId, validatedData);
      res.json(updatedPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating forum post:", error);
      res.status(500).json({ message: "Failed to update forum post" });
    }
  });

  // Delete post (owner only)
  app.delete('/api/forums/posts/:postId', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.postId);
      const post = await storage.getForumPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Check if user is the owner
      if (post.authorId !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }
      
      await storage.deleteForumPost(postId);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting forum post:", error);
      res.status(500).json({ message: "Failed to delete forum post" });
    }
  });

  // News routes
  app.get('/api/news', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const articles = await storage.getNewsArticles(limit);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news articles:", error);
      res.status(500).json({ message: "Failed to fetch news articles" });
    }
  });

  app.get('/api/news/:articleId', async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      const article = await storage.getNewsArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({ message: "Failed to fetch news article" });
    }
  });

  app.get('/api/news/:articleId/comments', async (req, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      const comments = await storage.getNewsCommentsByArticle(articleId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching news comments:", error);
      res.status(500).json({ message: "Failed to fetch news comments" });
    }
  });

  app.post('/api/news/:articleId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const articleId = parseInt(req.params.articleId);
      const validatedData = insertNewsCommentSchema.parse({
        ...req.body,
        articleId,
        authorId: req.user.id,
      });
      const comment = await storage.createNewsComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating news comment:", error);
      res.status(500).json({ message: "Failed to create news comment" });
    }
  });

  // Events routes
  app.get('/api/events', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const events = await storage.getUpcomingEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertEventSchema.parse({
        ...req.body,
        createdById: req.user.id,
      });
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Legacy custom product and POD routes retired. The active storefront is registered under /api/commerce.

  // Community stats routes
  app.get('/api/community/stats', async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ message: "Failed to fetch community stats" });
    }
  });

  app.get('/api/community/members/active', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const members = await storage.getActiveMembers(limit);
      res.json(members);
    } catch (error) {
      console.error("Error fetching active members:", error);
      res.status(500).json({ message: "Failed to fetch active members" });
    }
  });

  // Search route
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      const results = await storage.searchContent(query);
      res.json(results);
    } catch (error) {
      console.error("Error searching content:", error);
      res.status(500).json({ message: "Failed to search content" });
    }
  });

  // Legacy local cart and fake checkout routes retired. Shopify and partner merchants own checkout.

  // User routes
  app.get('/api/users/:userId/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const orders = await storage.getOrders(userId, limit);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/users/:userId/posts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const posts = await storage.getUserPosts(userId, limit);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  app.get('/api/users/:userId/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const unreadOnly = req.query.unread === 'true';
      const notifications = await storage.getUserNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:notificationId/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      await storage.markNotificationRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate the input using our enhanced membership schema
      const validatedData = userProfileUpdateSchema.parse(req.body);
      
      // Update user profile with validated data
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      // Return safe user data (without sensitive fields)
      res.json(createSelfUser(updatedUser));
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: error.errors 
        });
      }
      
      // Handle database constraint violations
      if (error.code === '23505') {
        if (error.detail?.includes('handle')) {
          return res.status(400).json({ message: "Handle is already taken" });
        }
        if (error.detail?.includes('email')) {
          return res.status(400).json({ message: "Email is already in use" });
        }
      }
      
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.delete('/api/users/profile/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestedUserId = req.params.userId;
      
      // Only allow users to delete their own profile
      if (userId !== requestedUserId) {
        return res.status(403).json({ message: "You can only delete your own profile" });
      }
      
      await storage.deleteUserProfile(userId);
      res.json({ message: "Profile deleted successfully" });
    } catch (error) {
      console.error("Error deleting user profile:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // Hall of Fame routes
  app.get('/api/hall-of-fame', async (req, res) => {
    try {
      const category = req.query.category as string;
      const entries = await storage.getHallOfFameEntries(category);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching Hall of Fame entries:", error);
      res.status(500).json({ message: "Failed to fetch Hall of Fame entries" });
    }
  });

  // Recent forum activity for dashboard
  app.get('/api/forums/recent', async (req, res) => {
    try {
      const requestedLimit = req.query.limit ? Number(req.query.limit) : 10;
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
      const topics = await storage.getRecentForumTopics(limit);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching recent forum activity:", error);
      res.status(500).json({ message: "Failed to fetch recent forum activity" });
    }
  });

  // Campus locations routes
  app.get('/api/campus/locations', async (req, res) => {
    try {
      const locations = await storage.getCampusLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching campus locations:', error);
      res.status(500).json({ error: 'Failed to fetch campus locations' });
    }
  });

  app.get('/api/campus/locations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getCampusLocation(id);
      if (!location) {
        return res.status(404).json({ error: 'Campus location not found' });
      }
      res.json(location);
    } catch (error) {
      console.error('Error fetching campus location:', error);
      res.status(500).json({ error: 'Failed to fetch campus location' });
    }
  });

  app.post('/api/campus/locations', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const locationData = insertCampusLocationSchema.parse(req.body);
      const location = await storage.createCampusLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      console.error('Error creating campus location:', error);
      res.status(500).json({ error: 'Failed to create campus location' });
    }
  });

  app.put('/api/campus/locations/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const locationData = insertCampusLocationSchema.partial().parse(req.body);
      const location = await storage.updateCampusLocation(id, locationData);
      res.json(location);
    } catch (error) {
      console.error('Error updating campus location:', error);
      res.status(500).json({ error: 'Failed to update campus location' });
    }
  });

  app.delete('/api/campus/locations/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCampusLocation(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting campus location:', error);
      res.status(500).json({ error: 'Failed to delete campus location' });
    }
  });

  app.get('/api/campus/locations/category/:category', async (req, res) => {
    try {
      const category = req.params.category;
      const locations = await storage.getCampusLocationsByCategory(category);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching campus locations by category:', error);
      res.status(500).json({ error: 'Failed to fetch campus locations by category' });
    }
  });

  // Events with locations routes
  app.get('/api/events/with-locations', async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const events = await storage.getEventsWithLocations(startDate, endDate);
      res.json(events);
    } catch (error) {
      console.error('Error fetching events with locations:', error);
      res.status(500).json({ error: 'Failed to fetch events with locations' });
    }
  });

  app.get('/api/campus/locations/:id/events', async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const events = await storage.getActiveEventsAtLocation(locationId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching events at location:', error);
      res.status(500).json({ error: 'Failed to fetch events at location' });
    }
  });

  // Profile completion routes

  app.post('/api/auth/complete-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = userProfileCompletionSchema.parse(req.body);

      // A custom handle is optional. Names and household addresses are not
      // unique identifiers and must never block legitimate members.
      if (profileData.handle) {
        const existingUser = await storage.getUserByHandle(profileData.handle);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Handle is already taken' });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        handle: profileData.handle || null,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        nickname: profileData.nickname || null,
        email: profileData.email || null,
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        zipCode: profileData.zipCode || null,
        dateOfBirth: profileData.dateOfBirth,
        fanType: profileData.fanType || null,
        memberCategory: profileData.memberCategory || null,
        commentsAndSuggestions: profileData.commentsAndSuggestions || null,
        favoriteSports: profileData.favoriteSports ? JSON.stringify(profileData.favoriteSports) : null,
        otherSportComment: profileData.otherSportComment || null,
        hasConsentedToDataUse: profileData.hasConsentedToDataUse,
        hasConsentedToMarketing: profileData.hasConsentedToMarketing || false,
        consentedAt: new Date(),
        isProfileComplete: true,
        profileCompletedAt: new Date(),
        // Enhanced membership fields
        aboutMe: profileData.aboutMe || null,
        interests: profileData.interests || null,
        affiliation: profileData.affiliation || null,
        defaultAvatarChoice: profileData.defaultAvatarChoice || null,
        graduationYear: profileData.graduationYear || null,
        majorOrDepartment: profileData.majorOrDepartment || null,
        socialLinks: profileData.socialLinks || null,
        addressLine1: profileData.addressLine1 || null,
        country: profileData.country || null,
        optInOffers: profileData.optInOffers || false,
      });

      res.json(createSelfUser(updatedUser));
    } catch (error: any) {
      console.error('Error completing profile:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid profile data', details: error.errors });
      }
      // Handle unique constraint violation for handle
      if (error.code === '23505' && error.detail?.includes('handle')) {
        return res.status(400).json({ error: 'Handle is already taken' });
      }
      res.status(500).json({ error: 'Failed to complete profile' });
    }
  });

  app.put('/api/auth/update-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = userProfileUpdateSchema.parse(req.body);

      // If handle is being updated, check availability
      if (profileData.handle) {
        const existingUser = await storage.getUserByHandle(profileData.handle);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Handle is already taken' });
        }
      }

      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(createSelfUser(updatedUser));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid profile data', details: error.errors });
      }
      // Handle unique constraint violation for handle
      if (error.code === '23505' && error.detail?.includes('handle')) {
        return res.status(400).json({ error: 'Handle is already taken' });
      }
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithStatistics();
      // Filter sensitive data from admin response
      const safeUsers = users.map(user => ({
        ...createAdminSafeUser(user),
        postCount: user.postCount,
        threadCount: user.threadCount,
        daysSinceSignup: user.daysSinceSignup,
        lastActivityDays: user.lastActivityDays,
      }));
      res.json(safeUsers);
    } catch (error: any) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.get('/api/admin/recent-members', requireAdmin, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentMembers = await storage.getRecentMembers(limit);
      // Filter sensitive data from admin response
      const safeRecentMembers = recentMembers.map(member => ({
        ...createAdminSafeUser(member),
        daysSinceSignup: member.daysSinceSignup,
      }));
      res.json(safeRecentMembers);
    } catch (error: any) {
      console.error("Error fetching recent members:", error);
      res.status(500).json({ message: "Failed to fetch recent members" });
    }
  });

  app.get('/api/admin/achievement-summary', requireAdmin, async (req: any, res) => {
    try {
      const achievementSummary = await storage.getAchievementSummary();
      res.json(achievementSummary);
    } catch (error: any) {
      console.error("Error fetching achievement summary:", error);
      res.status(500).json({ message: "Failed to fetch achievement summary" });
    }
  });

  // ========== UNIVERSAL AI API ENDPOINTS ==========

  const FAQS = [
    { q: "How do I create an account?", a: "Click the 'Join' button in the header, fill out the signup form, complete the reCAPTCHA, and submit." },
    { q: "What are the community rules?", a: "Be respectful, no spam, and keep posts on UH and sports topics. Check our Community Guidelines for more details." },
    { q: "How do I reset my password?", a: "Use the 'Forgot password' link on the login page or contact our support team." },
    { q: "Can I promote my business?", a: "Business promotions are only allowed in designated marketplace areas. Please respect our community guidelines." },
    { q: "How do I report a post?", a: "Click 'Report' on any post. Automated safety checks review reports first, then the admin team follows up." },
    { q: "How do I join forums?", a: "Navigate to the Forums section and click a category. Authenticated members can participate immediately." },
    { q: "What is CoogsNation?", a: "CoogsNation is an online community for University of Houston Cougar fans, students, alumni, faculty, staff, and friends." },
  ];

  function findBestFAQMatch(question: string) {
    const q = question.toLowerCase();
    let best: typeof FAQS[number] | null = null;
    let score = 0;
    for (const faq of FAQS) {
      const text = `${faq.q} ${faq.a}`.toLowerCase();
      let current = 0;
      for (const word of q.split(/\W+/).filter((value) => value.length > 2)) {
        if (text.includes(word)) current += 1;
      }
      if (current > score) {
        score = current;
        best = faq;
      }
    }
    return score >= 2 ? best : null;
  }

  function sendAIError(res: any, error: unknown, fallback = "AI service unavailable") {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid AI request", errors: error.errors });
    }
    if (error instanceof AIServiceError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    console.error(fallback, error);
    return res.status(503).json({ message: fallback, code: "AI_SERVICE_ERROR" });
  }

  app.post('/api/ask', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const validated = aiQuestionSchema.parse(req.body);
      const bestFAQ = findBestFAQMatch(validated.question);
      if (bestFAQ) {
        return res.json({
          answer: bestFAQ.a,
          source: "faq",
          conversationId: validated.conversationId || null,
        });
      }
      const result = await aiService.ask({
        userId: req.user.id,
        message: validated.question,
        conversationId: validated.conversationId,
        providerPreference: validated.providerPreference,
      });
      return res.json(result);
    } catch (error) {
      return sendAIError(res, error);
    }
  });

  app.post('/api/moderate-post', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const validated = aiModerationRequestSchema.parse(req.body);
      const result = await aiService.moderate(req.user.id, `${validated.title}\n${validated.content}`.trim());
      if (!result.allowed) {
        return res.json({ ok: false, message: result.reason || "Content blocked by safety moderation", categories: result.categories });
      }
      return res.json({ ok: true, message: "Content approved", categories: [] });
    } catch (error) {
      // Moderation fails closed: provider errors never approve content.
      if (error instanceof z.ZodError) {
        return res.status(400).json({ ok: false, message: "Invalid moderation request", errors: error.errors });
      }
      if (error instanceof AIServiceError) {
        return res.status(error.statusCode).json({ ok: false, message: error.message, code: error.code });
      }
      console.error("Moderation service unavailable:", error);
      return res.status(503).json({ ok: false, message: "Moderation service unavailable" });
    }
  });

  app.post('/api/vote', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const validated = aiFeedbackSchema.parse({
        id: req.body?.id,
        feedback: String(req.body?.delta ?? req.body?.feedback),
      });
      const value = validated.feedback === "1" ? 1 : -1;
      const score = await aiService.vote(validated.id, req.user.id, value);
      return res.json({ success: true, score, message: "Feedback recorded" });
    } catch (error) {
      return sendAIError(res, error, "Failed to record AI feedback");
    }
  });

  // Additional signup endpoint for chat widget (redirects to main registration)
  app.post('/api/signup', async (req, res) => {
    try {
      const captchaResponse = req.body["g-recaptcha-response"];
      
      if (!captchaResponse) {
        return res.status(400).json({ message: "Captcha required" });
      }

      const isValid = await verifyRecaptcha(captchaResponse, req.ip);
      if (!isValid) {
        return res.status(400).json({ message: "Captcha verification failed" });
      }

      res.json({ 
        success: true, 
        message: "Captcha verified! Please use the main 'Join' button in the header to complete registration.",
        redirect: "/login"
      });
    } catch (error) {
      console.error("Error in chat widget signup:", error);
      res.status(500).json({ message: "Registration error" });
    }
  });

  // Feature flags endpoint exposes capabilities, never API keys or secrets.
  app.get("/api/feature-flags", async (_req, res) => {
    res.json({ success: true, flags: { aiEnabled: aiService.publicStatus().enabled }, ai: aiService.publicStatus() });
  });

  app.post('/api/ai/chat', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const validated = aiChatRequestSchema.parse(req.body);
      const result = await aiService.ask({
        userId: req.user.id,
        message: validated.message,
        conversationId: validated.conversationId,
        providerPreference: validated.providerPreference,
      });
      return res.json({
        id: result.knowledgeId || result.requestId,
        response: result.answer,
        source: result.source,
        provider: result.provider,
        model: result.model,
        routeReason: result.routeReason,
        requestId: result.requestId,
        conversationId: result.conversationId,
        usage: result.usage,
      });
    } catch (error) {
      return sendAIError(res, error, "AI chat unavailable");
    }
  });

  app.post('/api/ai/feedback', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const validated = aiFeedbackSchema.parse(req.body);
      const score = await aiService.vote(validated.id, req.user.id, validated.feedback === "1" ? 1 : -1);
      return res.json({ success: true, score, message: "Feedback recorded" });
    } catch (error) {
      return sendAIError(res, error, "Failed to record AI feedback");
    }
  });

  // Private administrator AI routes are registered in adminDashboard.ts.
  // The accepted first release is read-only and exposes no knowledge-write endpoint.

  /* The legacy standalone Coog Paws chat page is gone. It served its own HTML
   * document with its own inline Socket.IO client against the root namespace —
   * a second, parallel chat implementation alongside the immersive lounge.
   * Old bookmarks are redirected to the lounge rather than 404'd. */
  app.get("/coogpaws", (_req, res) => res.redirect(301, "/coogpaws-chat"));

  const httpServer = createServer(app);
  
  // Initialize Socket.IO with the same authenticated session used by Express.
  const configuredSocketOrigins = [
    process.env.APP_ORIGIN,
    process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : undefined,
  ].filter(Boolean) as string[];
  if (process.env.NODE_ENV !== "production") {
    configuredSocketOrigins.push("http://localhost:5000", "http://localhost:5173");
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: configuredSocketOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  io.engine.use(sessionMiddleware as any);

  /**
   * Socket authentication — the SAME security HTTP requests get.
   *
   * This previously checked only that a session user id existed and that the
   * row was still in the database. It did not check `accountStatus` and did
   * not check `sessionVersion`, so a suspended account or a session revoked by
   * a password change kept working over Socket.IO after it had stopped working
   * over HTTP. That gap is closed here by calling the same authoritative
   * evaluator the HTTP middleware uses — `evaluateSessionState()` in
   * server/auth.ts — rather than restating its rules and letting the two
   * definitions drift.
   *
   * This is an intentional tightening. Sessions that are suspended, disabled,
   * deleted or version-revoked will now be refused a socket.
   *
   * The client-facing error is deliberately generic: the member learns their
   * session was not accepted, not which account condition caused it.
   */
  const requireSocketUser = async (socket: any, next: (error?: Error) => void) => {
    try {
      const sessionUser = socket.request.session?.passport?.user;
      const userId = sessionUser?.id;
      if (!userId) return next(new Error("Unauthorized"));

      const dbUser = await storage.getUser(userId);
      if (!dbUser) return next(new Error("Unauthorized"));

      const rejection = evaluateSessionState(
        dbUser,
        socket.request.session?.sessionVersion,
      );
      if (rejection) {
        console.warn("Socket session rejected:", rejection);
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = dbUser.id;
      socket.data.user = dbUser;
      return next();
    } catch (error) {
      console.error("Socket authentication failed:", error);
      return next(new Error("Unauthorized"));
    }
  };

  io.of("/").use((_socket, next) => {
    next(new Error("Namespace disabled"));
  });

  // Provider-neutral AI streaming namespace.
  const aiNamespace = io.of("/ai");
  aiNamespace.use(requireSocketUser);

  aiNamespace.on("connection", (socket) => {
    console.log("User connected to AI Chat:", socket.id);

    socket.on("ai-message", async (data) => {
      let conversationId: string | undefined;
      try {
        const validated = aiChatRequestSchema.parse(data);
        conversationId = validated.conversationId;
        const userId = socket.data.userId as string;
        aiService.assertSocketRate(userId);
        let fullResponse = "";
        const result = await aiService.stream(
          {
            userId,
            message: validated.message,
            conversationId,
            providerPreference: validated.providerPreference,
            requestType: "stream",
          },
          async (chunk) => {
            fullResponse += chunk;
            socket.emit("ai-chunk", {
              chunk,
              fullResponse,
              isComplete: false,
              conversationId,
            });
          },
        );
        socket.emit("ai-chunk", {
          id: result.knowledgeId || result.requestId,
          chunk: "",
          fullResponse: result.answer,
          isComplete: true,
          conversationId: result.conversationId,
          source: result.source,
          provider: result.provider,
          model: result.model,
          routeReason: result.routeReason,
          requestId: result.requestId,
          usage: result.usage,
        });
      } catch (error) {
        const statusCode = error instanceof AIServiceError ? error.statusCode : 400;
        const code = error instanceof AIServiceError ? error.code : "INVALID_AI_REQUEST";
        socket.emit("ai-response", {
          error: error instanceof Error ? error.message : "AI service unavailable",
          code,
          statusCode,
          conversationId,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected from AI Chat:", socket.id);
    });
  });


  return httpServer;
}
