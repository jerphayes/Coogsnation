import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { setupAuth, isAuthenticated, requireUHAuthentication } from "./replitAuth";
import {
  insertForumTopicSchema,
  insertForumPostSchema,
  updateForumTopicSchema,
  updateForumPostSchema,
  insertNewsCommentSchema,
  insertEventSchema,
  insertShoppingCartSchema,
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
  insertCoogpawsProfileSchema,
  insertCoogpawsSwipeSchema,
  insertCoogpawsMessageSchema,
  insertCoogpawsBlockSchema,
  insertCoogpawsReportSchema,
  createSafeUser,
  aiChatRequestSchema,
  aiFeedbackSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { promises as fs } from "fs";
import * as fsSync from "fs";
import path from "path";
import sharp from "sharp";
import { sendAchievementEmail } from "./emailService";
import { checkForNewAchievement, achievementLevels, getNextAchievement } from "@shared/schema";
import { PasswordService } from "./passwordService";
import { mfaService } from "./mfaService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { PODManagerService, PODHelpers } from "./podServices";
import fetch from "node-fetch";

// SQLite3 Learning Database Setup with Enhanced Error Handling
let learningDB: any = null;

(async () => {
  try {
    learningDB = await open({
      filename: "./coogsnation_ai_learning.db",
      driver: sqlite3.Database
    });

    // Create table for learned Q&A pairs
    await learningDB.exec(`
      CREATE TABLE IF NOT EXISTS learned (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        votes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("📚 AI Learning database initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize learning database:", error);
    // Continue without crashing - database functionality will be disabled
    learningDB = null;
  }
})();

// Helper function to verify Google reCAPTCHA
async function verifyRecaptcha(recaptchaResponse: string, clientIP?: string): Promise<boolean> {
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
      'image/tiff',
      'image/svg+xml'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed! Supported formats: JPG, PNG, GIF, WebP, BMP, TIFF, SVG'));
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

  // Redirect /login to main app (OAuth handled by frontend)
  app.get("/login", (req: any, res: any) => {
    res.redirect("/?showLogin=true");
  });

  // Redirect /signup to Replit Auth login (which includes signup options)
  app.get("/signup", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  // Redirect /signup/other to login page for local account creation
  app.get("/signup/other", (req, res) => {
    res.redirect("/login");
  });

  // Admin dashboard redirects to main admin interface
  app.get("/admin", (req: any, res: any) => {
    res.redirect("/dashboard?admin=true");
  });

  // Logout
  app.get("/logout", (req: any, res: any) => {
    req.session.destroy(() => {
      res.send("Logged out. <a href='/login'>Login again</a>");
    });
  });

  // Auth middleware
  await setupAuth(app);

  // Simple redirect routes to existing Replit Auth system
  app.get("/auth/google", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  app.get("/auth/apple", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  app.get("/auth/linkedin", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  app.get("/auth/facebook", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  app.get("/auth/twitter", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  app.get("/auth/x", (req, res) => {
    res.redirect("/api/login?returnTo=/dashboard");
  });

  app.get("/auth/email", (req, res) => {
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
      res.json(createSafeUser(user));
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

      const existingUser = await storage.getUserByHandle(handle);
      res.json({ available: !existingUser });
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

      // Check for duplicate name
      const duplicateName = await storage.checkDuplicateName(
        validatedData.firstName,
        validatedData.lastName
      );
      if (duplicateName) {
        return res.status(400).json({ 
          message: 'A user with this name already exists. If this is your name, please contact support for assistance.' 
        });
      }

      // Check for duplicate address
      const duplicateAddress = await storage.checkDuplicateAddress(
        validatedData.address,
        validatedData.city,
        validatedData.state,
        validatedData.zipCode
      );
      if (duplicateAddress) {
        return res.status(400).json({ 
          message: 'A user with this address already exists. Please ensure you are not creating a duplicate account.' 
        });
      }
      
      // Check if email is already taken
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email is already registered" });
      }

      // Check if handle is already taken
      const existingUserByHandle = await storage.getUserByHandle(validatedData.handle);
      if (existingUserByHandle) {
        return res.status(400).json({ message: "Handle is already taken" });
      }

      // Hash the password
      const passwordHash = await PasswordService.hashPassword(validatedData.password);

      // Create local user
      const newUser = await storage.createLocalUser({
        id: undefined, // Let database generate UUID
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        nickname: validatedData.nickname,
        handle: validatedData.handle,
        passwordHash,
        backupEmail: validatedData.backupEmail,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        dateOfBirth: validatedData.dateOfBirth,
        fanType: validatedData.fanType,
        memberCategory: validatedData.memberCategory,
        commentsAndSuggestions: validatedData.commentsAndSuggestions,
        favoriteSports: validatedData.favoriteSports ? JSON.stringify(validatedData.favoriteSports) : null,
        otherSportComment: validatedData.otherSportComment,
        hasConsentedToDataUse: validatedData.hasConsentedToDataUse,
        hasConsentedToMarketing: validatedData.hasConsentedToMarketing,
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
        country: validatedData.country || 'USA',
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
  app.post('/api/auth/login-local', async (req, res) => {
    try {
      const validatedData = localLoginSchema.parse(req.body);
      
      // Find user by handle
      const user = await storage.getUserByHandle(validatedData.handle);
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
        
        return res.status(401).json({ message: "Invalid username/email or password" });
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
    const userId = req.user.claims.sub;
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
        imageMetadata = await sharp(file.buffer).metadata();
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

      // SECURITY: Validate pixel dimensions (max 500x500 as per requirement)
      if (!imageMetadata.width || !imageMetadata.height) {
        console.log(`[SECURITY] Avatar upload blocked - unable to determine dimensions for user ${userId}`);
        return res.status(400).json({ message: "Unable to determine image dimensions" });
      }

      if (imageMetadata.width > 500 || imageMetadata.height > 500) {
        console.log(`[SECURITY] Avatar upload blocked - dimensions too large: ${imageMetadata.width}x${imageMetadata.height} for user ${userId}`);
        return res.status(400).json({ message: "Image dimensions must not exceed 500x500 pixels" });
      }

      // SECURITY: Process image to strip EXIF data and ensure clean format
      let processedImageBuffer;
      try {
        processedImageBuffer = await sharp(file.buffer)
          .resize({
            width: Math.min(imageMetadata.width, 500),
            height: Math.min(imageMetadata.height, 500),
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
      const objectStorageService = new ObjectStorageService();
      let avatarUrl;
      
      try {
        avatarUrl = await objectStorageService.uploadAvatarDirect(
          userId,
          processedImageBuffer,
          'image/jpeg'
        );
      } catch (storageError) {
        console.error(`[SECURITY] Object storage upload failed for user ${userId}:`, storageError);
        return res.status(500).json({ message: "Failed to save avatar" });
      }

      // Update user's profile image URL in database
      const updatedUser = await storage.updateProfileImage(userId, avatarUrl);
      
      const duration = Date.now() - startTime;
      console.log(`[SECURITY] ✅ Secure avatar upload completed for user ${userId}: ${avatarUrl} (${duration}ms)`);
      
      res.json({
        message: "Avatar uploaded successfully",
        avatarUrl: avatarUrl,
        user: createSafeUser(updatedUser)
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

  // Simple avatar upload endpoint for AvatarUpload component with disk storage
  const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
  if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
  }

  const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });

  const diskAvatarUpload = multer({
    storage: diskStorage,
    fileFilter: (req, file, cb) => {
      if (!["image/jpeg", "image/png"].includes(file.mimetype)) {
        return cb(new Error("Only JPG and PNG allowed"));
      }
      cb(null, true);
    },
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  });

  app.post('/api/upload-avatar', diskAvatarUpload.single('avatar'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId." });
      }

      // Get current user to check for existing avatar
      const currentUser = await storage.getUser(userId);
      
      const originalPath = req.file.path;
      const resizedPath = path.join(uploadDir, `resized-${req.file.filename}`);

      // ✅ Resize image to 256x256 px
      await sharp(originalPath)
        .resize(256, 256)
        .toFile(resizedPath);

      // Delete original large file
      fsSync.unlinkSync(originalPath);

      const avatarUrl = `/uploads/avatars/${path.basename(resizedPath)}`;

      // ✅ Clean up old avatar file if exists (disk storage only)
      if (currentUser?.profileImageUrl && currentUser.profileImageUrl.startsWith('/uploads/avatars/')) {
        const oldFilename = path.basename(currentUser.profileImageUrl);
        const oldFilePath = path.join(uploadDir, oldFilename);
        if (fsSync.existsSync(oldFilePath)) {
          fsSync.unlinkSync(oldFilePath);
          console.log(`Deleted old disk avatar: ${oldFilename}`);
        }
      }
      // Note: Object storage avatars are not automatically deleted to prevent data loss
      // They should be manually managed through object storage admin panel

      // ✅ Save URL in database
      await storage.updateProfileImage(userId, avatarUrl);

      res.json({
        message: "Avatar uploaded and resized successfully!",
        filePath: avatarUrl,
      });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Error uploading avatar." });
    }
  });

  // Delete avatar endpoint
  app.delete('/api/delete-avatar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get current user to check for existing avatar
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.profileImageUrl) {
        return res.status(404).json({ error: "No avatar to delete." });
      }

      // ✅ Clean up avatar file (disk storage only)
      if (currentUser.profileImageUrl.startsWith('/uploads/avatars/')) {
        const filename = path.basename(currentUser.profileImageUrl);
        const filePath = path.join(uploadDir, filename);
        if (fsSync.existsSync(filePath)) {
          fsSync.unlinkSync(filePath);
          console.log(`Deleted disk avatar: ${filename}`);
        }
      }
      // Note: Object storage avatars are not automatically deleted to prevent data loss
      // They should be manually managed through object storage admin panel

      // ✅ Remove avatar URL from database
      await storage.updateProfileImage(userId, "");

      res.json({
        message: "Avatar deleted successfully!",
      });
    } catch (error: any) {
      console.error("Avatar deletion error:", error);
      res.status(500).json({ error: "Error deleting avatar." });
    }
  });

  // Serve uploaded avatars statically with Cache-Control headers
  app.use('/uploads/avatars', express.static(uploadDir, {
    maxAge: '1y', // Cache for 1 year
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }));

  // Object storage serving route (for protected objects like avatars)
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        console.log(`[SECURITY] Access denied to object ${req.path} for user ${userId}`);
        return res.sendStatus(404); // Return 404 instead of 401 to prevent enumeration
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      console.error(`[SECURITY] Error accessing object ${req.path}:`, error);
      return res.sendStatus(500);
    }
  });

  // Public object serving route
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin security management endpoints
  // Unlock user account (admin only - for now checking if user is authenticated, would need proper admin role check)
  app.post('/api/admin/unlock-account', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const { userId, handle } = req.body;

      if (!userId && !handle) {
        return res.status(400).json({ message: "User ID or handle is required" });
      }

      // Find target user
      let targetUser;
      if (userId) {
        targetUser = await storage.getUser(userId);
      } else {
        targetUser = await storage.getUserByHandle(handle);
      }

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if account is currently locked
      const isLocked = await storage.isAccountLocked(targetUser.id);
      
      if (!isLocked) {
        return res.status(400).json({ 
          message: "Account is not currently locked",
          accountStatus: "unlocked"
        });
      }

      // Unlock the account
      await storage.unlockUserAccount(targetUser.id);
      
      console.log(`[ADMIN] Account unlocked by admin ${adminUserId} for user: ${targetUser.handle} (ID: ${targetUser.id})`);
      
      res.json({
        message: "Account unlocked successfully",
        user: {
          id: targetUser.id,
          handle: targetUser.handle,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName
        },
        unlockedBy: adminUserId,
        unlockedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error unlocking account:", error);
      res.status(500).json({ message: "Failed to unlock account" });
    }
  });

  // Get account security status (admin only)
  app.get('/api/admin/account-status/:identifier', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStatistics(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      res.status(500).json({ message: "Failed to fetch user statistics" });
    }
  });

  app.post('/api/user/statistics/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const categoryId = parseInt(req.params.categoryId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
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
      const userId = req.user.claims.sub;
      
      // Generate slug from title
      const slug = req.body.title
        ? req.body.title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
        : '';
      
      const validatedData = insertForumTopicSchema.parse({
        ...req.body,
        slug: `${slug}-${Date.now()}`, // Add timestamp for uniqueness
        authorId: userId,
      });
      
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
      const userId = req.user.claims.sub;
      
      const validatedData = insertForumPostSchema.parse({
        ...req.body,
        authorId: userId,
      });
      
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

  // Update topic (owner only)
  app.patch('/api/forums/topics/:topicId', isAuthenticated, async (req: any, res) => {
    try {
      const topicId = parseInt(req.params.topicId);
      const topic = await storage.getForumTopic(topicId);
      
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      // Check if user is the owner
      if (topic.authorId !== req.user.claims.sub) {
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
      if (topic.authorId !== req.user.claims.sub) {
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
      if (post.authorId !== req.user.claims.sub) {
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
      if (post.authorId !== req.user.claims.sub) {
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
        authorId: req.user.claims.sub,
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
        createdById: req.user.claims.sub,
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

  // Products routes
  app.get('/api/products', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const products = await storage.getProducts(limit);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:productId', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // POD (Print on Demand) Store Routes
  // Initialize POD configuration on startup
  PODHelpers.logApiStatus();

  /**
   * ==========================
   * WEAR YOUR PRIDE (Printful)
   * ==========================
   * Apparel: Polos, Jackets, Embroidered Hats
   */
  app.get('/api/store/wear-your-pride', async (req, res) => {
    try {
      console.log('[API] Fetching Wear Your Pride products from Printful...');
      const result = await PODManagerService.fetchCategoryProducts('wear-your-pride');
      
      if (!result.success) {
        console.warn('[API] Printful API issue:', result.error);
        return res.status(503).json({ 
          error: 'Unable to fetch products at this time',
          category: result.category,
          products: [],
          note: result.error || 'Service temporarily unavailable'
        });
      }

      // Sync products to database and get local product IDs for cart integration
      let syncedProducts = result.products;
      if (result.products.length > 0) {
        console.log(`[API] Syncing ${result.products.length} Printful products to database...`);
        
        try {
          const syncPromises = result.products.map(product =>
            storage.syncPODProduct(product, 'printful', 'Wear Your Pride')
          );
          const localProducts = await Promise.all(syncPromises);
          console.log('[API] Successfully synced Printful products to database');
          
          // Map provider products to their local database products for cart compatibility
          syncedProducts = result.products.map((product, index) => ({
            ...product,
            localId: localProducts[index].id, // Add local DB ID for cart operations
          }));
        } catch (syncError) {
          console.error('[API] Error syncing Printful products:', syncError);
          // Continue even if sync fails - we still have the API data
        }
      }

      res.json({
        category: result.category,
        products: syncedProducts.map(p => ({
          id: (p as any).localId || p.id, // Use local DB ID for cart compatibility, fallback to provider ID
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          category: p.category,
          type: p.type,
          provider: p.provider,
          url: `/store/wear-your-pride/${(p as any).localId || p.id}`,
        })),
      });

    } catch (error: any) {
      console.error('[API] Error in wear-your-pride endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Wear Your Pride items',
        details: error.message || 'Unknown error'
      });
    }
  });

  /**
   * ==========================
   * EVERYDAY ALUMNI (Teelaunch)
   * ==========================
   * Engraved mugs, tumblers, plaques
   */
  app.get('/api/store/everyday-alumni', async (req, res) => {
    try {
      console.log('[API] Fetching Everyday Alumni products from Teelaunch...');
      const result = await PODManagerService.fetchCategoryProducts('everyday-alumni');
      
      if (!result.success) {
        console.warn('[API] Teelaunch API issue:', result.error);
        return res.status(503).json({ 
          error: 'Unable to fetch products at this time',
          category: result.category,
          products: [],
          note: result.error || 'Service temporarily unavailable'
        });
      }

      // Sync products to database and get local product IDs for cart integration
      let syncedProducts = result.products;
      if (result.products.length > 0) {
        console.log(`[API] Syncing ${result.products.length} Teelaunch products to database...`);
        
        try {
          const syncPromises = result.products.map(product =>
            storage.syncPODProduct(product, 'teelaunch', 'Everyday Alumni')
          );
          const localProducts = await Promise.all(syncPromises);
          console.log('[API] Successfully synced Teelaunch products to database');
          
          // Map provider products to their local database products for cart compatibility
          syncedProducts = result.products.map((product, index) => ({
            ...product,
            localId: localProducts[index].id, // Add local DB ID for cart operations
          }));
        } catch (syncError) {
          console.error('[API] Error syncing Teelaunch products:', syncError);
        }
      }

      res.json({
        category: result.category,
        products: syncedProducts.map(p => ({
          id: (p as any).localId || p.id, // Use local DB ID for cart compatibility, fallback to provider ID
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          category: p.category,
          type: p.type,
          provider: p.provider,
          url: `/store/everyday-alumni/${(p as any).localId || p.id}`,
        })),
      });

    } catch (error: any) {
      console.error('[API] Error in everyday-alumni endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Everyday Alumni items',
        details: error.message || 'Unknown error'
      });
    }
  });

  /**
   * ==========================
   * KEEPSAKES & GIFTS (Trendsi)
   * ==========================
   * Premium jewelry and accessories
   */
  app.get('/api/store/keepsakes-gifts', async (req, res) => {
    try {
      console.log('[API] Fetching Keepsakes & Gifts products from Trendsi...');
      const result = await PODManagerService.fetchCategoryProducts('keepsakes-gifts');
      
      if (!result.success) {
        console.warn('[API] Trendsi API issue:', result.error);
        return res.status(503).json({ 
          error: 'Unable to fetch products at this time',
          category: result.category,
          products: [],
          note: result.error || 'Service temporarily unavailable'
        });
      }

      // Sync products to database and get local product IDs for cart integration
      let syncedProducts = result.products;
      if (result.products.length > 0) {
        console.log(`[API] Syncing ${result.products.length} Trendsi products to database...`);
        
        try {
          const syncPromises = result.products.map(product =>
            storage.syncPODProduct(product, 'trendsi', 'Keepsakes & Gifts')
          );
          const localProducts = await Promise.all(syncPromises);
          console.log('[API] Successfully synced Trendsi products to database');
          
          // Map provider products to their local database products for cart compatibility
          syncedProducts = result.products.map((product, index) => ({
            ...product,
            localId: localProducts[index].id, // Add local DB ID for cart operations
          }));
        } catch (syncError) {
          console.error('[API] Error syncing Trendsi products:', syncError);
        }
      }

      res.json({
        category: result.category,
        products: syncedProducts.map(p => ({
          id: (p as any).localId || p.id, // Use local DB ID for cart compatibility, fallback to provider ID
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          category: p.category,
          type: p.type,
          provider: p.provider,
          url: `/store/keepsakes-gifts/${(p as any).localId || p.id}`,
        })),
      });

    } catch (error: any) {
      console.error('[API] Error in keepsakes-gifts endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Keepsakes & Gifts items',
        details: error.message || 'Unknown error'
      });
    }
  });

  /**
   * ==========================
   * LIMITED EDITIONS (Placeholders)
   * ==========================
   * Subcategories ready for future integrations
   */

  // Native Jewelry
  app.get('/api/store/limited-editions/native-jewelry', async (req, res) => {
    try {
      const result = await PODManagerService.fetchLimitedEditionProducts('native-jewelry');
      res.json({
        category: result.category,
        products: result.products,
        note: result.error || 'Future supplier API integration pending',
      });
    } catch (error: any) {
      console.error('[API] Error in native-jewelry endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Neo-Western Boots
  app.get('/api/store/limited-editions/neo-western-boots', async (req, res) => {
    try {
      const result = await PODManagerService.fetchLimitedEditionProducts('neo-western-boots');
      res.json({
        category: result.category,
        products: result.products,
        note: result.error || 'Future supplier API integration pending',
      });
    } catch (error: any) {
      console.error('[API] Error in neo-western-boots endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Navajo Blanket Series
  app.get('/api/store/limited-editions/navajo-blanket-series', async (req, res) => {
    try {
      const result = await PODManagerService.fetchLimitedEditionProducts('navajo-blanket-series');
      res.json({
        category: result.category,
        products: result.products,
        note: result.error || 'Future supplier API integration pending',
      });
    } catch (error: any) {
      console.error('[API] Error in navajo-blanket-series endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Legacy Rings & Pendants
  app.get('/api/store/limited-editions/legacy-rings', async (req, res) => {
    try {
      const result = await PODManagerService.fetchLimitedEditionProducts('legacy-rings');
      res.json({
        category: result.category,
        products: result.products,
        note: result.error || 'Future supplier API integration pending',
      });
    } catch (error: any) {
      console.error('[API] Error in legacy-rings endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Alumni Artifacts
  app.get('/api/store/limited-editions/alumni-artifacts', async (req, res) => {
    try {
      const result = await PODManagerService.fetchLimitedEditionProducts('alumni-artifacts');
      res.json({
        category: result.category,
        products: result.products,
        note: result.error || 'Future supplier API integration pending',
      });
    } catch (error: any) {
      console.error('[API] Error in alumni-artifacts endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all POD categories at once
  app.get('/api/store/all-categories', async (req, res) => {
    try {
      console.log('[API] Fetching all POD categories...');
      const results = await PODManagerService.fetchAllCategories();
      
      // Transform results for frontend consumption
      const response = results.map(result => ({
        category: result.category,
        success: result.success,
        products: result.products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          category: p.category,
          type: p.type,
          provider: p.provider,
        })),
        error: result.error,
        productCount: result.products.length,
      }));

      res.json({
        categories: response,
        summary: {
          totalCategories: results.length,
          totalProducts: results.reduce((sum, r) => sum + r.products.length, 0),
          successfulCategories: results.filter(r => r.success).length,
        }
      });

    } catch (error: any) {
      console.error('[API] Error in all-categories endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to fetch store categories',
        details: error.message || 'Unknown error'
      });
    }
  });

  // Get cached POD products from database
  app.get('/api/store/cached-products', async (req, res) => {
    try {
      const { provider, category } = req.query;
      const products = await storage.getPODProducts(
        provider as string, 
        category as string
      );
      
      res.json({
        source: 'database_cache',
        products: products,
        count: products.length,
        filters: {
          provider: provider || 'all',
          category: category || 'all',
        }
      });

    } catch (error: any) {
      console.error('[API] Error fetching cached products:', error);
      res.status(500).json({ 
        error: 'Failed to fetch cached products',
        details: error.message || 'Unknown error'
      });
    }
  });

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

  // Shopping cart routes
  app.get('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      res.status(500).json({ message: "Failed to fetch cart items" });
    }
  });

  app.post('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertShoppingCartSchema.parse({
        ...req.body,
        userId: req.user.claims.sub,
      });
      const cartItem = await storage.addToCart(validatedData);
      res.status(201).json(cartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.put('/api/cart/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { quantity } = req.body;
      const updatedItem = await storage.updateCartQuantity(itemId, quantity);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete('/api/cart/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      await storage.removeFromCart(itemId);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing cart item:", error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  // Checkout route
  app.post('/api/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { promoCode } = req.body;
      
      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Calculate totals
      const subtotal = cartItems.reduce((total, item: any) => {
        return total + (parseFloat(item.product.price) * item.quantity);
      }, 0);
      
      const tax = subtotal * 0.0825; // 8.25% Texas sales tax
      const shipping = subtotal > 50 ? 0 : 9.99;
      const total = subtotal + tax + shipping;

      // Create order
      const orderData = {
        userId,
        subtotalAmount: subtotal.toFixed(2),
        taxAmount: tax.toFixed(2),
        shippingAmount: shipping.toFixed(2),
        totalAmount: total.toFixed(2),
        status: 'pending',
        promoCode: promoCode || null,
      };

      // Create order items
      const orderItemsData = cartItems.map((item: any) => ({
        orderId: 0, // Will be set by storage
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const order = await storage.createOrder(orderData, orderItemsData);
      
      // Clear cart
      await storage.clearCart(userId);

      // Create notification
      await storage.createNotification({
        userId,
        type: 'order',
        title: 'Order Confirmed',
        message: `Your order #${order.id} has been placed successfully!`,
        isRead: false,
      });

      res.status(201).json({ orderId: order.id, order });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ message: "Checkout failed" });
    }
  });

  // User routes
  app.get('/api/users/:userId/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
      // Validate the input using our enhanced membership schema
      const validatedData = userProfileUpdateSchema.parse(req.body);
      
      // Update user profile with validated data
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      // Return safe user data (without sensitive fields)
      res.json(createSafeUser(updatedUser));
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
      const userId = req.user.claims.sub;
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      // Get recent topics with category and author info
      const topics = await storage.getForumTopicsByCategory(1, limit); // Simplified for now
      res.json(topics);
    } catch (error) {
      console.error("Error fetching recent forum activity:", error);
      res.status(500).json({ message: "Failed to fetch recent forum activity" });
    }
  });

  // Admin API endpoints
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      const postCount = await storage.getPostCount();
      const eventCount = await storage.getEventCount();
      const articleCount = await storage.getArticleCount();
      const forumCount = await storage.getForumCount();
      
      res.json({
        totalUsers: userCount || 0,
        totalPosts: postCount || 0,
        totalEvents: eventCount || 0,
        totalOrders: 0,
        totalArticles: articleCount || 0,
        activeForums: forumCount || 0,
        todaySignups: 0,
        monthlyRevenue: 0
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  app.get('/api/admin/activities', async (req, res) => {
    try {
      res.json([
        { id: '1', type: 'user_signup', description: 'New user registered', timestamp: new Date().toISOString(), user: 'Admin' },
        { id: '2', type: 'new_post', description: 'New forum post created', timestamp: new Date().toISOString(), user: 'User123' }
      ]);
    } catch (error) {
      console.error('Error fetching admin activities:', error);
      res.status(500).json({ error: 'Failed to fetch admin activities' });
    }
  });

  app.get('/api/admin/users', async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users || []);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
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

  app.post('/api/campus/locations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const locationData = insertCampusLocationSchema.parse(req.body);
      const location = await storage.createCampusLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      console.error('Error creating campus location:', error);
      res.status(500).json({ error: 'Failed to create campus location' });
    }
  });

  app.put('/api/campus/locations/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/campus/locations/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/auth/check-handle', async (req, res) => {
    try {
      const handle = req.query.handle as string;
      if (!handle || handle.length < 3) {
        return res.status(400).json({ error: 'Handle must be at least 3 characters' });
      }
      
      if (handle.length > 30) {
        return res.status(400).json({ error: 'Handle must be less than 30 characters' });
      }
      
      // Apply same regex validation as schema
      const handleRegex = /^[a-zA-Z0-9_]+$/;
      if (!handleRegex.test(handle)) {
        return res.status(400).json({ error: 'Handle can only contain letters, numbers, and underscores' });
      }

      // Check if handle exists
      const existingUser = await storage.getUserByHandle(handle);
      res.json({ available: !existingUser });
    } catch (error) {
      console.error('Error checking handle availability:', error);
      res.status(500).json({ error: 'Failed to check handle availability' });
    }
  });

  app.post('/api/auth/complete-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = userProfileCompletionSchema.parse(req.body);

      // Check for duplicate name (excluding current user)
      const duplicateName = await storage.checkDuplicateName(
        profileData.firstName,
        profileData.lastName,
        userId
      );
      if (duplicateName) {
        return res.status(400).json({ 
          error: 'A user with this name already exists. If this is your name, please contact support for assistance.' 
        });
      }

      // Check for duplicate address (excluding current user)
      const duplicateAddress = await storage.checkDuplicateAddress(
        profileData.address || '',
        profileData.city || '',
        profileData.state || '',
        profileData.zipCode || '',
        userId
      );
      if (duplicateAddress) {
        return res.status(400).json({ 
          error: 'A user with this address already exists. Please ensure you are not creating a duplicate account.' 
        });
      }

      // Check if handle is available (excluding current user)
      const existingUser = await storage.getUserByHandle(profileData.handle);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Handle is already taken' });
      }

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, {
        handle: profileData.handle,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        nickname: profileData.nickname || null,
        email: profileData.email || null,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zipCode: profileData.zipCode,
        dateOfBirth: profileData.dateOfBirth,
        fanType: profileData.fanType || null,
        memberCategory: profileData.memberCategory,
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
        country: profileData.country || 'USA',
        optInOffers: profileData.optInOffers || false,
      });

      res.json(updatedUser);
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
      const userId = req.user.claims.sub;
      const profileData = userProfileUpdateSchema.parse(req.body);

      // If handle is being updated, check availability
      if (profileData.handle) {
        const existingUser = await storage.getUserByHandle(profileData.handle);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Handle is already taken' });
        }
      }

      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(createSafeUser(updatedUser));
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
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithStatistics();
      // Filter sensitive data from admin response
      const safeUsers = users.map(user => ({
        ...createSafeUser(user),
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

  app.get('/api/admin/recent-members', isAuthenticated, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentMembers = await storage.getRecentMembers(limit);
      // Filter sensitive data from admin response
      const safeRecentMembers = recentMembers.map(member => ({
        ...createSafeUser(member),
        daysSinceSignup: member.daysSinceSignup,
      }));
      res.json(safeRecentMembers);
    } catch (error: any) {
      console.error("Error fetching recent members:", error);
      res.status(500).json({ message: "Failed to fetch recent members" });
    }
  });

  app.get('/api/admin/achievement-summary', isAuthenticated, async (req: any, res) => {
    try {
      const achievementSummary = await storage.getAchievementSummary();
      res.json(achievementSummary);
    } catch (error: any) {
      console.error("Error fetching achievement summary:", error);
      res.status(500).json({ message: "Failed to fetch achievement summary" });
    }
  });

  // Coogpaws Dating App Routes
  
  // Get user's Coogpaws profile
  app.get('/api/coogpaws/profile', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check rate limit - max 300 profile reads per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `profile_read_${userId}`, 
        'profile_read', 
        300, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before accessing profile again.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      const profile = await storage.getCoogpawsProfile(userId);
      
      // Record rate limit attempt after successful read
      await storage.recordRateLimitAttempt(`profile_read_${userId}`, 'profile_read');
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error fetching Coogpaws profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Create or update Coogpaws profile
  app.post('/api/coogpaws/profile', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check rate limit - max 10 profile updates per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `profile_update_${userId}`, 
        'profile_update', 
        10, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before updating profile again.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      const validatedData = insertCoogpawsProfileSchema.parse(req.body);
      
      // Check if profile already exists
      const existingProfile = await storage.getCoogpawsProfile(userId);
      
      let profile;
      if (existingProfile) {
        profile = await storage.updateCoogpawsProfile(userId, validatedData);
      } else {
        profile = await storage.createCoogpawsProfile({
          ...validatedData,
          userId,
        });
      }
      
      // Record rate limit attempt after successful update
      await storage.recordRateLimitAttempt(`profile_update_${userId}`, 'profile_update');
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error saving Coogpaws profile:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  // Get profiles to swipe on (exclude already swiped and own profile)
  app.get('/api/coogpaws/profiles', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check rate limit - max 200 profile browsing requests per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `profiles_browse_${userId}`, 
        'profiles_browse', 
        200, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before browsing more profiles.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const profiles = await storage.getActiveCoogpawsProfiles(userId, limit);
      
      // Record rate limit attempt after successful browse
      await storage.recordRateLimitAttempt(`profiles_browse_${userId}`, 'profiles_browse');
      
      res.json(profiles);
    } catch (error: any) {
      console.error("Error fetching Coogpaws profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  // Record a swipe (like or pass)
  app.post('/api/coogpaws/swipe', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertCoogpawsSwipeSchema.parse(req.body);
      
      // Verify the swiper is the authenticated user
      if (validatedData.swiperId !== userId) {
        return res.status(403).json({ message: "Cannot swipe on behalf of another user" });
      }

      // Check rate limit - max 100 swipes per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `swipe_${userId}`, 
        'swipe', 
        100, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before swiping more profiles.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }

      // Check if user has already swiped on this profile
      const hasAlreadySwiped = await storage.hasUserSwiped(userId, validatedData.swipedUserId);
      if (hasAlreadySwiped) {
        return res.status(400).json({ message: "You have already swiped on this profile" });
      }

      // Record the swipe (storage automatically handles match creation)
      const swipe = await storage.recordSwipe(validatedData);
      
      // Check if a match was created (only for likes)
      let match = null;
      let isMatch = false;
      if (validatedData.isLike) {
        // Check if this swipe resulted in a match
        const userMatches = await storage.getUserMatches(userId);
        const newMatch = userMatches.find(m => 
          (m.user1Id === userId && m.user2Id === validatedData.swipedUserId) ||
          (m.user2Id === userId && m.user1Id === validatedData.swipedUserId)
        );
        
        if (newMatch) {
          isMatch = true;
          match = newMatch;
        }
      }

      // Record rate limit attempt after successful swipe
      await storage.recordRateLimitAttempt(`swipe_${userId}`, 'swipe');
      
      res.json({ 
        swipe, 
        isMatch, 
        match: isMatch ? match : undefined 
      });
    } catch (error: any) {
      console.error("Error recording swipe:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid swipe data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record swipe" });
    }
  });

  // Get user's matches
  app.get('/api/coogpaws/matches', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check rate limit - max 100 match queries per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `matches_query_${userId}`, 
        'matches_query', 
        100, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before checking matches again.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      const matches = await storage.getUserMatches(userId);
      
      // Enhance matches with user profile data
      const enhancedMatches = await Promise.all(matches.map(async (match) => {
        const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
        const otherUser = await storage.getUser(otherUserId);
        const otherProfile = await storage.getCoogpawsProfile(otherUserId);
        
        return {
          ...match,
          otherUser: otherUser ? createSafeUser(otherUser) : null,
          otherProfile,
        };
      }));

      // Record rate limit attempt after successful match query
      await storage.recordRateLimitAttempt(`matches_query_${userId}`, 'matches_query');

      res.json(enhancedMatches);
    } catch (error: any) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Get messages for a specific match
  app.get('/api/coogpaws/messages/:matchId', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const matchId = parseInt(req.params.matchId);
      
      // Check rate limit - max 200 message reads per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `message_read_${userId}`, 
        'message_read', 
        200, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before reading more messages.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      // Verify user is part of this match and match is active
      const match = await storage.getMatch(matchId);
      if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      if (!match.isActive) {
        return res.status(410).json({ message: "This conversation is no longer available" });
      }

      const messages = await storage.getMatchMessages(matchId);
      
      // Mark messages as read for this user
      await storage.markMessagesAsRead(matchId, userId);
      
      // Record rate limit attempt after successful message read
      await storage.recordRateLimitAttempt(`message_read_${userId}`, 'message_read');
      
      res.json(messages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message to a match
  app.post('/api/coogpaws/messages', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertCoogpawsMessageSchema.parse(req.body);
      
      // Verify the sender is the authenticated user
      if (validatedData.senderId !== userId) {
        return res.status(403).json({ message: "Cannot send messages on behalf of another user" });
      }

      // Check rate limit - max 50 messages per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `message_${userId}`, 
        'message', 
        50, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before sending more messages.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }

      // Verify user is part of this match and match is active
      const match = await storage.getMatch(validatedData.matchId);
      if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
        return res.status(403).json({ message: "Access denied to this conversation" });
      }
      
      if (!match.isActive) {
        return res.status(410).json({ message: "This conversation is no longer available" });
      }
      
      // Basic content validation (prevent empty/whitespace-only messages)
      if (!validatedData.content.trim()) {
        return res.status(400).json({ message: "Message content cannot be empty" });
      }

      const message = await storage.sendMessage(validatedData);
      
      // Record rate limit attempt after successful message send
      await storage.recordRateLimitAttempt(`message_${userId}`, 'message');
      
      res.json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get unread message count for user
  app.get('/api/coogpaws/unread-count', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check rate limit - max 600 unread count checks per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `unread_count_${userId}`, 
        'unread_count', 
        600, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before checking unread count again.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      const count = await storage.getUnreadMessageCount(userId);
      
      // Record rate limit attempt after successful count check
      await storage.recordRateLimitAttempt(`unread_count_${userId}`, 'unread_count');
      
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Delete/deactivate Coogpaws profile
  app.delete('/api/coogpaws/profile', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check rate limit - max 3 profile deletions per hour (very restrictive for destructive action)
      const rateLimitCheck = await storage.checkRateLimit(
        `profile_delete_${userId}`, 
        'profile_delete', 
        3, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before attempting profile deletion again.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }
      
      await storage.deleteCoogpawsProfile(userId);
      
      // Record rate limit attempt after successful deletion
      await storage.recordRateLimitAttempt(`profile_delete_${userId}`, 'profile_delete');
      
      res.json({ message: "Profile deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting Coogpaws profile:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // Block a user
  app.post('/api/coogpaws/block', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertCoogpawsBlockSchema.parse(req.body);
      
      // Verify the blocker is the authenticated user
      if (validatedData.blockerId !== userId) {
        return res.status(403).json({ message: "Cannot block on behalf of another user" });
      }

      // Prevent self-blocking
      if (validatedData.blockerId === validatedData.blockedUserId) {
        return res.status(400).json({ message: "Cannot block yourself" });
      }

      // Check rate limit - max 10 blocks per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `block_${userId}`, 
        'block', 
        10, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before blocking more users.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }

      const block = await storage.blockUser(validatedData);
      await storage.recordRateLimitAttempt(`block_${userId}`, 'block');
      
      res.json({ block, message: "User blocked successfully" });
    } catch (error: any) {
      console.error("Error blocking user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid block data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  // Report a user
  app.post('/api/coogpaws/report', requireUHAuthentication, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertCoogpawsReportSchema.parse(req.body);
      
      // Verify the reporter is the authenticated user
      if (validatedData.reporterId !== userId) {
        return res.status(403).json({ message: "Cannot report on behalf of another user" });
      }

      // Prevent self-reporting
      if (validatedData.reporterId === validatedData.reportedUserId) {
        return res.status(400).json({ message: "Cannot report yourself" });
      }

      // Check rate limit - max 5 reports per hour
      const rateLimitCheck = await storage.checkRateLimit(
        `report_${userId}`, 
        'report', 
        5, 
        60
      );
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({ 
          message: "Rate limit exceeded. Please wait before submitting more reports.",
          remainingTime: rateLimitCheck.remainingTime
        });
      }

      const report = await storage.reportUser(validatedData);
      await storage.recordRateLimitAttempt(`report_${userId}`, 'report');
      
      res.json({ report, message: "Report submitted successfully" });
    } catch (error: any) {
      console.error("Error reporting user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // ========== CHAT WIDGET API ENDPOINTS ==========
  
  // FAQ data for chat widget
  const FAQS = [
    { q: "How do I create an account?", a: "Click the 'Join' button in the header, fill out the signup form, complete the reCAPTCHA, and submit." },
    { q: "What are the community rules?", a: "Be respectful, no spam, and keep posts on UH and sports topics. Check our Community Guidelines for more details." },
    { q: "How do I reset my password?", a: "Use the 'Forgot password' link on the login page or contact our support team." },
    { q: "Can I promote my business?", a: "Business promotions are only allowed in designated marketplace areas. Please respect our community guidelines." },
    { q: "How do I report a post?", a: "Click 'Report' on any post. Our AI system reviews reports first, then our admin team follows up." },
    { q: "How do I join forums?", a: "Navigate to the Forums section and click on any category that interests you. You can start participating immediately!" },
    { q: "What is CoogsNation?", a: "CoogsNation is the premier online community for University of Houston Cougar fans, students, alumni, and supporters." }
  ];

  function findBestFAQMatch(question = "") {
    const q = question.toLowerCase();
    let best = null, score = 0;
    for (const f of FAQS) {
      const text = (f.q + " " + f.a).toLowerCase();
      let s = 0;
      for (const w of q.split(/\W+/)) if (text.includes(w)) s++;
      if (s > score) { score = s; best = f; }
    }
    return score >= 2 ? best : null;
  }

  // Enhanced AI Ask Endpoint with Learning Capabilities
  app.post('/api/ask', async (req, res) => {
    try {
      const question = req.body.question || "";
      
      if (!question.trim()) {
        return res.json({ answer: "Please ask me a question!", source: "error" });
      }

      // 1. First check static FAQ
      const bestFAQ = findBestFAQMatch(question);
      if (bestFAQ) {
        return res.json({ answer: bestFAQ.a, source: "faq" });
      }

      // 2. Check Learned Database for previously answered questions
      if (learningDB) {
        try {
          const learnedAnswer = await learningDB.get(
            "SELECT * FROM learned WHERE question LIKE ? ORDER BY votes DESC LIMIT 1", 
            [`%${question}%`]
          );
          
          if (learnedAnswer) {
            console.log("📖 Found learned answer for question:", question);
            return res.json({ 
              answer: learnedAnswer.answer, 
              source: "learned",
              learnedId: learnedAnswer.id 
            });
          }
        } catch (dbError) {
          console.error("Learning DB query error:", dbError);
        }
      }

      // 3. Fallback to OpenAI for new questions
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.json({ answer: "AI chat is currently unavailable. Please try again later or contact support for help.", source: "error" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system", 
              content: "You are CoogsNation AI Assistant, helping users with questions about the University of Houston fan community platform. Be helpful, concise, and friendly. Focus on CoogsNation features, UH sports, and community topics."
            },
            {
              role: "user", 
              content: question
            }
          ]
        })
      });

      const data = await response.json() as any;
      const answer = data.choices?.[0]?.message?.content?.trim() || "I'm sorry, I couldn't process your question right now. Please try again or contact support.";

      // 4. Save new Q&A pair to learning database for future use
      if (learningDB && answer !== "I'm sorry, I couldn't process your question right now. Please try again or contact support.") {
        try {
          await learningDB.run(
            "INSERT INTO learned (question, answer) VALUES (?, ?)", 
            [question, answer]
          );
          console.log("💡 Saved new Q&A to learning database");
        } catch (saveError) {
          console.error("Failed to save to learning DB:", saveError);
        }
      }

      res.json({ answer, source: "openai" });
    } catch (error) {
      console.error("Error in enhanced AI chat:", error);
      res.json({ 
        answer: "I'm experiencing technical difficulties. Please try again later or contact our support team.", 
        source: "error" 
      });
    }
  });

  // Post moderation endpoint for chat widget
  app.post('/api/moderate-post', async (req, res) => {
    try {
      const { title = "", content = "" } = req.body || {};
      const text = `${title}\n${content}`;

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        return res.json({ ok: true, message: "Content accepted (moderation unavailable)" });
      }

      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "omni-moderation-latest",
          input: text
        })
      });

      const data = await response.json() as any;
      if (data.results?.[0]?.flagged) {
        return res.json({ ok: false, message: "Content blocked by AI moderation" });
      }
      
      res.json({ ok: true, message: "Content approved" });
    } catch (error) {
      console.error("Error in post moderation:", error);
      res.json({ ok: true, message: "Content accepted (moderation error)" });
    }
  });

  // Voting system for AI answer feedback
  app.post('/api/vote', async (req, res) => {
    try {
      const { id, delta } = req.body;
      
      if (!id || !delta || (delta !== 1 && delta !== -1)) {
        return res.status(400).json({ message: "Invalid vote data" });
      }
      
      if (learningDB) {
        await learningDB.run(
          "UPDATE learned SET votes = votes + ? WHERE id = ?", 
          [delta, id]
        );
        
        console.log(`📊 Vote recorded: ${delta > 0 ? 'upvote' : 'downvote'} for answer ID ${id}`);
        res.json({ success: true, message: "Vote recorded" });
      } else {
        res.status(500).json({ message: "Learning database not available" });
      }
    } catch (error) {
      console.error("Error recording vote:", error);
      res.status(500).json({ message: "Failed to record vote" });
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
        redirect: "/api/login"
      });
    } catch (error) {
      console.error("Error in chat widget signup:", error);
      res.status(500).json({ message: "Registration error" });
    }
  });

  // Feature flags endpoint
  app.get("/api/feature-flags", async (req, res) => {
    try {
      const flags = {
        aiEnabled: process.env.AI_ENABLED === "true" || false
      };
      
      res.json({ success: true, flags });
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch feature flags" 
      });
    }
  });

  // AI Chat endpoints for enhanced Chat with Memory
  app.post('/api/ai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = aiChatRequestSchema.parse(req.body);
      
      // Check if AI features are enabled
      const aiEnabled = process.env.AI_ENABLED === 'true' || process.env.VITE_AI_ENABLED === 'true';
      if (!aiEnabled) {
        return res.status(503).json({ message: "AI features are currently disabled" });
      }
      
      const { message, conversationId } = validatedData;
      
      // Generate response using existing AI system
      let memory = [];
      if (learningDB) {
        try {
          const stmt = await learningDB.prepare(
            "SELECT * FROM learned WHERE question LIKE ? ORDER BY votes DESC LIMIT 5"
          );
          memory = await stmt.all(`%${message}%`);
        } catch (error) {
          console.error("Error fetching AI memory:", error);
        }
      }
      
      // Build enhanced prompt with memory
      let enhancedPrompt = message;
      if (memory.length > 0) {
        enhancedPrompt += "\n\nRelevant past Q&A:\n";
        memory.forEach((item: any) => {
          enhancedPrompt += `Q: ${item.question}\nA: ${item.answer}\nVotes: ${item.votes}\n\n`;
        });
      }
      
      // Generate AI response (placeholder - integrate with actual AI service)
      const aiResponse = `🐾 CoogAI: I understand you're asking about "${message}". Based on our University of Houston community knowledge, here's what I can help with...`;
      
      // Store the interaction for learning
      if (learningDB) {
        try {
          await learningDB.run(
            "INSERT INTO learned (question, answer, context, votes, user_id) VALUES (?, ?, ?, 0, ?)",
            [message, aiResponse, "ai-chat", userId]
          );
        } catch (error) {
          console.error("Error storing AI interaction:", error);
        }
      }
      
      res.json({
        id: Date.now(),
        response: aiResponse,
        conversationId: conversationId || `conv_${Date.now()}`,
        memory: memory.length
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "AI chat error" });
    }
  });
  
  app.post('/api/ai/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = aiFeedbackSchema.parse(req.body);
      const { id, feedback } = validatedData;
      
      if (learningDB) {
        const delta = feedback === "1" ? 1 : -1;
        await learningDB.run(
          "UPDATE learned SET votes = votes + ? WHERE id = ?", 
          [delta, id]
        );
        
        console.log(`🤖 AI Feedback recorded: ${feedback === "1" ? 'positive' : 'negative'} for ID ${id}`);
        res.json({ success: true, message: "Feedback recorded" });
      } else {
        res.status(500).json({ message: "Learning system unavailable" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error recording AI feedback:", error);
      res.status(500).json({ message: "Failed to record feedback" });
    }
  });

  // Coog Paws Chat Route - Serve Socket.IO real-time chat interface
  const coogPawsHandler = (req: any, res: any) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>🐾 Coog Paws Chat - CoogsNation</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              background: linear-gradient(135deg, #c8102e, #d62d20); 
              color: white; 
              margin: 0; 
              padding: 20px; 
              min-height: 100vh;
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: rgba(255,255,255,0.1); 
              border-radius: 15px; 
              padding: 20px;
              backdrop-filter: blur(10px);
            }
            h1 { 
              text-align: center; 
              margin-bottom: 30px; 
              font-size: 2.5em;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            #messages { 
              border: 2px solid rgba(255,255,255,0.3); 
              height: 400px; 
              overflow-y: auto; 
              padding: 15px; 
              margin-bottom: 15px;
              background: rgba(255,255,255,0.1);
              border-radius: 10px;
              font-size: 16px;
            }
            .input-container {
              display: flex;
              gap: 10px;
              align-items: center;
            }
            #msg { 
              flex: 1;
              padding: 12px 15px; 
              border: none;
              border-radius: 25px;
              font-size: 16px;
              outline: none;
            }
            button { 
              padding: 12px 20px; 
              background: white; 
              color: #c8102e; 
              border: none; 
              border-radius: 25px; 
              cursor: pointer;
              font-weight: bold;
              font-size: 16px;
            }
            button:hover { 
              background: #f0f0f0; 
            }
            .message {
              margin: 8px 0;
              padding: 8px 12px;
              background: rgba(255,255,255,0.2);
              border-radius: 15px;
              word-wrap: break-word;
            }
            .back-link {
              display: inline-block;
              margin-bottom: 20px;
              color: white;
              text-decoration: none;
              padding: 8px 16px;
              background: rgba(255,255,255,0.2);
              border-radius: 20px;
              transition: all 0.3s ease;
            }
            .back-link:hover {
              background: rgba(255,255,255,0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <a href="/" class="back-link">← Back to CoogsNation</a>
            <h1>🐾 Coog Paws Chat</h1>
            <p style="text-align: center; margin-bottom: 30px; font-size: 18px;">Real-time chat for meaningful connections in the Cougar community</p>
            
            <div id="messages"></div>
            <div class="input-container">
              <input 
                id="msg" 
                placeholder="Type your message here..." 
                autocomplete="off"
                maxlength="500"
              />
              <button onclick="send()">Send 🐾</button>
            </div>
          </div>

          <script src="/socket.io/socket.io.js"></script>
          <script>
            const socket = io();
            const messages = document.getElementById("messages");
            const input = document.getElementById("msg");

            // Handle incoming chat messages
            socket.on("chat", data => {
              const messageDiv = document.createElement("div");
              messageDiv.className = "message";
              messageDiv.textContent = data.message || data;
              messages.appendChild(messageDiv);
              messages.scrollTop = messages.scrollHeight;
            });

            // Send message function
            function send() {
              const message = input.value.trim();
              if (!message) return;
              
              socket.emit("chat", { message: message });
              input.value = "";
            }

            // Send message on Enter key
            input.addEventListener("keypress", function(e) {
              if (e.key === "Enter") {
                send();
              }
            });

            // Focus on input when page loads
            window.addEventListener("load", () => {
              input.focus();
            });

            // Connection status
            socket.on("connect", () => {
              console.log("Connected to Coog Paws Chat");
            });

            socket.on("disconnect", () => {
              console.log("Disconnected from Coog Paws Chat");
            });
          </script>
        </body>
      </html>
    `);
  };

  // Only /coogpaws route available
  app.get("/coogpaws", coogPawsHandler);

  const httpServer = createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Handle Socket.IO connections
  io.on("connection", (socket) => {
    console.log("👤 User connected to Coog Paws Chat:", socket.id);
    
    // Broadcast join message
    socket.broadcast.emit("chat", { 
      message: "Someone joined the Coog Paws chat! 🐾" 
    });
    
    // Handle chat messages
    socket.on("chat", (data) => {
      console.log("💬 Coog Paws message:", data);
      // Broadcast message to all connected clients
      io.emit("chat", { 
        message: data.message || data 
      });
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("👋 User disconnected from Coog Paws Chat:", socket.id);
      socket.broadcast.emit("chat", { 
        message: "Someone left the Coog Paws chat 🐾💔" 
      });
    });
  });

  // AI Chat Namespace for streaming responses
  const aiNamespace = io.of("/ai");
  
  aiNamespace.on("connection", (socket) => {
    console.log("🤖 User connected to AI Chat:", socket.id);
    
    // Handle AI chat message requests with streaming
    socket.on("ai-message", async (data) => {
      try {
        console.log("🤖 AI request:", data);
        const { message, conversationId, userId } = data;
        
        // Check if AI features are enabled
        const aiEnabled = process.env.AI_ENABLED === 'true' || process.env.VITE_AI_ENABLED === 'true';
        if (!aiEnabled) {
          socket.emit("ai-response", { 
            error: "AI features are currently disabled",
            conversationId 
          });
          return;
        }
        
        // Get memory from learning database
        let memory = [];
        if (learningDB) {
          try {
            const stmt = await learningDB.prepare(
              "SELECT * FROM learned WHERE question LIKE ? ORDER BY votes DESC LIMIT 3"
            );
            memory = await stmt.all(`%${message}%`);
          } catch (error) {
            console.error("Error fetching AI memory:", error);
          }
        }
        
        // Simulate streaming response by sending chunks
        const responseId = Date.now();
        const fullResponse = `🤖 CoogAI: I understand you're asking about "${message}". Based on our University of Houston community knowledge and ${memory.length} similar past conversations, here's what I can help with...\n\nThis is a simulated AI response that would integrate with a real AI service like OpenAI. The memory system is working and learning from user interactions.`;
        
        // Send response in chunks to simulate streaming
        const words = fullResponse.split(' ');
        let currentResponse = '';
        
        for (let i = 0; i < words.length; i++) {
          currentResponse += words[i] + ' ';
          
          // Send chunk every few words
          if (i % 5 === 0 || i === words.length - 1) {
            socket.emit("ai-chunk", {
              id: responseId,
              chunk: words.slice(Math.max(0, i - 4), i + 1).join(' '),
              fullResponse: currentResponse.trim(),
              isComplete: i === words.length - 1,
              conversationId,
              memoryUsed: memory.length
            });
            
            // Small delay to simulate real streaming
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Store the interaction for learning if we have a database
        if (learningDB) {
          try {
            await learningDB.run(
              "INSERT INTO learned (question, answer, context, votes, user_id) VALUES (?, ?, ?, 0, ?)",
              [message, fullResponse, "ai-streaming-chat", userId || 'anonymous']
            );
          } catch (error) {
            console.error("Error storing AI interaction:", error);
          }
        }
        
      } catch (error) {
        console.error("Error in AI streaming:", error);
        socket.emit("ai-response", { 
          error: "AI service unavailable",
          conversationId: data.conversationId 
        });
      }
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("🤖 User disconnected from AI Chat:", socket.id);
    });
  });

  // Avatar upload endpoints
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/avatar-upload", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const { url, objectPath } = await objectStorageService.getAvatarUploadURL(userId);
      res.json({ 
        method: "PUT",
        url: url,
        objectPath: objectPath 
      });
    } catch (error) {
      console.error("Error getting avatar upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/objects/avatar-complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const { avatarURL } = req.body;
      
      if (!avatarURL) {
        return res.status(400).json({ error: "Avatar URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      // Set ACL policy for the uploaded avatar
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        avatarURL,
        {
          owner: userId,
          visibility: "public", // Avatars should be publicly accessible
        }
      );

      // Update user's profile image URL in database
      await storage.updateUserProfile(userId, {
        profileImageUrl: objectPath
      });

      res.json({ 
        success: true,
        objectPath: objectPath,
        message: "Avatar uploaded successfully" 
      });
    } catch (error) {
      console.error("Error completing avatar upload:", error);
      res.status(500).json({ error: "Failed to complete avatar upload" });
    }
  });

  return httpServer;
}
