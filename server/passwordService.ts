import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export class PasswordService {
  /**
   * Hash a plaintext password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      return hash;
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a plaintext password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Check if a password meets basic security requirements
   */
  static isPasswordSecure(password: string): boolean {
    if (password.length < 9) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
    return true;
  }
}