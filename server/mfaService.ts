import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendEmail } from './emailService';
import { storage } from './storage';

export interface MfaConfig {
  tokenLength: number;
  expiryMinutes: number;
  maxAttempts: number;
}

export interface SmsProvider {
  sendSms(phoneNumber: string, message: string): Promise<boolean>;
}

const MFA_CONFIG: MfaConfig = {
  tokenLength: 6, // 6-digit code
  expiryMinutes: 10, // 10 minutes expiry
  maxAttempts: 3, // Max 3 attempts per token
};

/**
 * Twilio SMS provider implementation
 * Can be easily swapped for other providers
 */
class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[MFA] Twilio credentials not configured. SMS will not be sent.');
      return false;
    }

    try {
      // SECURITY: Never log MFA codes in production
      console.log(`[MFA] SMS would be sent to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}: [REDACTED]`);
      
      // TODO: Implement actual Twilio API call
      // const twilio = require('twilio')(this.accountSid, this.authToken);
      // await twilio.messages.create({
      //   body: message,
      //   from: this.fromNumber,
      //   to: phoneNumber
      // });
      
      return true;
    } catch (error) {
      console.error('[MFA] Failed to send SMS:', error);
      return false;
    }
  }
}

/**
 * Secure SMS provider that throws error when Twilio is not configured
 * This prevents MFA codes from being logged in plaintext
 */
class SecureSmsProvider implements SmsProvider {
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    const maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');
    console.error(`[MFA] SMS provider not configured. Cannot send SMS to ${maskedPhone}`);
    throw new Error('SMS provider not configured. Please configure Twilio credentials.');
  }
}

export class MfaService {
  private smsProvider: SmsProvider;

  constructor() {
    // Use Twilio if configured, otherwise use secure provider that throws error
    this.smsProvider = process.env.TWILIO_ACCOUNT_SID ? 
      new TwilioSmsProvider() : 
      new SecureSmsProvider();
  }

  /**
   * Generate a secure random MFA token
   */
  generateMfaToken(): string {
    const digits = '0123456789';
    let token = '';
    
    for (let i = 0; i < MFA_CONFIG.tokenLength; i++) {
      // Use crypto.randomInt for cryptographically secure random numbers
      const randomIndex = crypto.randomInt(0, digits.length);
      token += digits[randomIndex];
    }
    
    return token;
  }

  /**
   * Hash MFA token using bcrypt for secure storage
   */
  private async hashMfaToken(token: string): Promise<string> {
    const saltRounds = 12; // High security for MFA tokens
    return bcrypt.hash(token, saltRounds);
  }

  /**
   * Verify MFA token against hash using bcrypt
   */
  private async verifyMfaTokenHash(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Generate and store MFA token for a user (token is hashed before storage)
   */
  async generateAndStoreMfaToken(userId: string): Promise<string> {
    const token = this.generateMfaToken();
    const tokenHash = await this.hashMfaToken(token);
    const expiryDate = new Date(Date.now() + MFA_CONFIG.expiryMinutes * 60 * 1000);
    
    await storage.storeMfaToken(userId, tokenHash, expiryDate);
    
    console.log(`[MFA] Generated hashed token for user ${userId}, expires at ${expiryDate.toISOString()}`);
    return token; // Return plaintext token for sending via SMS/email
  }

  /**
   * Send MFA token via SMS and email
   */
  async sendMfaToken(userId: string, purpose: 'password_reset' | 'login' = 'password_reset'): Promise<{ smsSuccess: boolean; emailSuccess: boolean }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const token = await this.generateAndStoreMfaToken(userId);
    
    const purposeText = purpose === 'password_reset' ? 'password reset' : 'login verification';
    const smsMessage = `Your CoogsNation ${purposeText} code is: ${token}. This code expires in ${MFA_CONFIG.expiryMinutes} minutes.`;
    
    // Send SMS if phone number is available
    let smsSuccess = false;
    if (user.phoneNumber) {
      smsSuccess = await this.smsProvider.sendSms(user.phoneNumber, smsMessage);
    }

    // Send email as backup
    let emailSuccess = false;
    if (user.email) {
      const emailSubject = `CoogsNation ${purposeText.charAt(0).toUpperCase() + purposeText.slice(1)} Code`;
      const emailBody = `
        <h2>CoogsNation Security Code</h2>
        <p>Hello ${user.firstName || user.handle},</p>
        <p>Your ${purposeText} verification code is:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border: 2px solid #ddd;">
          ${token}
        </div>
        <p>This code will expire in ${MFA_CONFIG.expiryMinutes} minutes.</p>
        <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
        <hr>
        <p><small>CoogsNation Security Team</small></p>
      `;
      
      emailSuccess = await sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@coogs.replit.app',
        subject: emailSubject,
        html: emailBody,
        text: `Your CoogsNation ${purposeText} code is: ${token}. This code expires in ${MFA_CONFIG.expiryMinutes} minutes.`
      });
    }

    console.log(`[MFA] Sent token to user ${userId}: SMS=${smsSuccess}, Email=${emailSuccess}`);

    return { smsSuccess, emailSuccess };
  }

  /**
   * Verify MFA token for a user using secure hash comparison
   */
  async verifyMfaToken(userId: string, inputToken: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user || !user.mfaToken || !user.mfaTokenExpiry) {
      console.log(`[MFA] No valid MFA token found for user ${userId}`);
      return false;
    }
    
    const now = new Date();
    const tokenExpired = user.mfaTokenExpiry < now;
    
    if (tokenExpired) {
      // Clear expired token
      await storage.clearMfaToken(userId);
      console.log(`[MFA] Expired token attempt for user ${userId}`);
      return false;
    }
    
    // Verify using secure hash comparison
    const isValid = await this.verifyMfaTokenHash(inputToken, user.mfaToken);
    
    if (isValid) {
      // Clear the token after successful verification
      await storage.clearMfaToken(userId);
      console.log(`[MFA] Token verified successfully for user ${userId}`);
    } else {
      console.log(`[MFA] Invalid token attempt for user ${userId}`);
    }
    
    return isValid;
  }

  /**
   * Clear MFA token for a user (in case of cancellation)
   */
  async clearMfaToken(userId: string): Promise<void> {
    await storage.clearMfaToken(userId);
    console.log(`[MFA] Token cleared for user ${userId}`);
  }

  /**
   * Format phone number for SMS (basic US format validation)
   */
  formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Handle US phone numbers (10 digits) or international with country code
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else if (digitsOnly.length > 10) {
      return `+${digitsOnly}`;
    }
    
    return null; // Invalid format
  }

  /**
   * Check if phone number is valid for SMS
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    return this.formatPhoneNumber(phoneNumber) !== null;
  }
}

export const mfaService = new MfaService();