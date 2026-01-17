/**
 * Verification Token Value Object
 * Handles OTP and verification token generation/validation
 */
import * as crypto from 'crypto';

export class VerificationToken {
  private readonly _token: string;
  private readonly _otp: string;
  private readonly _createdAt: Date;
  private readonly _expiresAt: Date;
  private _usedAt: Date | null = null;

  constructor(
    token?: string,
    otp?: string,
    createdAt?: Date,
    expiresAt?: Date,
    usedAt?: Date | null,
  ) {
    this._token = token || this.generateToken();
    this._otp = otp || this.generateOtp();
    this._createdAt = createdAt || new Date();
    // Default expiry: 24 hours for token, 30 minutes for OTP
    this._expiresAt = expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    this._usedAt = usedAt || null;
  }

  get token(): string {
    return this._token;
  }

  get otp(): string {
    return this._otp;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  get isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  get isUsed(): boolean {
    return this._usedAt !== null;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isUsed;
  }

  /**
   * Generate a unique verification token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Verify OTP
   */
  verifyOtp(inputOtp: string): boolean {
    if (!this.isValid) {
      return false;
    }
    return this._otp === inputOtp;
  }

  /**
   * Mark token as used
   */
  markAsUsed(): VerificationToken {
    return new VerificationToken(
      this._token,
      this._otp,
      this._createdAt,
      this._expiresAt,
      new Date(),
    );
  }

  /**
   * Regenerate OTP (new OTP, same token)
   */
  regenerateOtp(expiryMinutes: number = 30): VerificationToken {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    return new VerificationToken(
      this._token,
      newOtp,
      this._createdAt,
      new Date(Date.now() + expiryMinutes * 60 * 1000),
      null,
    );
  }

  /**
   * Get masked OTP for display (e.g., "1**4**")
   */
  get maskedOtp(): string {
    return `${this._otp[0]}**${this._otp[3]}**`;
  }

  toJSON(): Record<string, unknown> {
    return {
      token: this._token,
      otp: this._otp,
      createdAt: this._createdAt.toISOString(),
      expiresAt: this._expiresAt.toISOString(),
      usedAt: this._usedAt?.toISOString() || null,
    };
  }

  static fromJSON(data: Record<string, unknown>): VerificationToken {
    return new VerificationToken(
      data.token as string,
      data.otp as string,
      new Date(data.createdAt as string),
      new Date(data.expiresAt as string),
      data.usedAt ? new Date(data.usedAt as string) : null,
    );
  }
}
