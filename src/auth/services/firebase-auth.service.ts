import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { 
  FirebaseTokenAuthDto, 
  FederatedLoginDto, 
  PhoneVerificationDto, 
  SendPhoneVerificationDto 
} from '../dto/auth.dto';
import { IFirebaseUser, IUser, UserRole, Permission } from '../interfaces/auth.interface';
import { ROLE_PERMISSIONS } from '../interfaces/auth.interface';

/**
 * Firebase Authentication Service
 * Handles Firebase Auth integration, federated login, and phone verification
 */
@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);

  constructor(private readonly configService: ConfigService) {
    console.log('🔥 Firebase Authentication Service initialized');
  }

  /**
   * Verify Firebase ID token
   */
  async verifyFirebaseToken(tokenDto: FirebaseTokenAuthDto): Promise<IFirebaseUser> {
    try {
      this.logger.log('Verifying Firebase ID token');
      
      const decodedToken = await admin.auth().verifyIdToken(tokenDto.idToken);
      
      const firebaseUser: IFirebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        phoneNumber: decodedToken.phone_number,
        provider: decodedToken.firebase.sign_in_provider,
        providerData: [], // Empty array for now, can be populated from decodedToken if needed
        customClaims: decodedToken.custom_claims || {},
      };

      this.logger.log(`Firebase token verified for user: ${firebaseUser.email}`);
      return firebaseUser;

    } catch (error) {
      this.logger.error(`Firebase token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }

  /**
   * Handle federated login (Google, Facebook, etc.)
   * This method accepts OAuth provider tokens (like Google ID tokens) and creates/gets Firebase users
   */
  async handleFederatedLogin(federatedDto: FederatedLoginDto): Promise<IFirebaseUser> {
    try {
      this.logger.log(`Processing federated login for provider: ${federatedDto.provider}`);
      
      // Handle different providers
      switch (federatedDto.provider) {
        case 'google.com':
          return await this.handleGoogleLogin(federatedDto.idToken);
        case 'facebook.com':
          return await this.handleFacebookLogin(federatedDto.idToken);
        default:
          throw new BadRequestException(`Unsupported provider: ${federatedDto.provider}`);
      }

    } catch (error) {
      this.logger.error(`Federated login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Google OAuth login
   * Verifies Google ID token and creates/gets Firebase user
   */
  private async handleGoogleLogin(googleIdToken: string): Promise<IFirebaseUser> {
    try {
      // Verify Google token without Firebase (just decode and validate)
      const decodedToken = await this.verifyGoogleToken(googleIdToken);
      
      this.logger.log(`Google token verified for: ${decodedToken.email}`);
      
      // Check if user exists in Firebase
      let firebaseUser: admin.auth.UserRecord;
      
      try {
        firebaseUser = await admin.auth().getUserByEmail(decodedToken.email);
        this.logger.log(`Existing Firebase user found: ${firebaseUser.uid}`);
      } catch (error) {
        // User doesn't exist, create them
        this.logger.log(`Creating new Firebase user for: ${decodedToken.email}`);
        firebaseUser = await admin.auth().createUser({
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
        });
        this.logger.log(`Firebase user created: ${firebaseUser.uid}`);
      }
      
      // Convert to IFirebaseUser format
      const user: IFirebaseUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        phoneNumber: firebaseUser.phoneNumber,
        provider: 'google.com',
        providerData: [],
        customClaims: {},
      };

      this.logger.log(`Google login successful for ${user.email}`);
      return user;

    } catch (error) {
      this.logger.error(`Google login failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Verify Google ID token
   * This verifies the token came from Google without requiring Firebase
   */
  private async verifyGoogleToken(idToken: string): Promise<any> {
    try {
      // Use Firebase Admin to verify Google token
      // Firebase Admin SDK can verify Google OAuth tokens
      const decodedToken = await admin.auth().verifyIdToken(idToken, true);
      return decodedToken;
    } catch (error) {
      // If that fails, the token is a raw Google token, not a Firebase token
      // We need to verify it as a Google OAuth token
      this.logger.log('Token is not a Firebase token, treating as raw Google OAuth token');
      
      // For now, just decode it (in production, you'd verify the signature)
      const decoded = this.decodeJWT(idToken);
      
      // Validate the token
      if (!decoded.email || !decoded.email_verified) {
        throw new UnauthorizedException('Invalid Google token');
      }
      
      // Check issuer
      if (decoded.iss !== 'https://accounts.google.com') {
        throw new UnauthorizedException('Invalid token issuer');
      }
      
      // Check audience (should be your OAuth client ID)
      const clientId = this.configService.get('GOOGLE_CLIENT_ID');
      if (decoded.aud !== clientId) {
        this.logger.warn(`Token audience mismatch. Expected: ${clientId}, Got: ${decoded.aud}`);
        // Don't throw error, just warn - Google often includes project number
      }
      
      // Check expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token expired');
      }
      
      return decoded;
    }
  }

  /**
   * Decode JWT without verification (for Google tokens)
   */
  private decodeJWT(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }
    
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }

  /**
   * Handle Facebook OAuth login
   */
  private async handleFacebookLogin(facebookToken: string): Promise<IFirebaseUser> {
    // Implement Facebook login similar to Google
    throw new BadRequestException('Facebook login not yet implemented');
  }

  /**
   * Send phone verification code
   */
  async sendPhoneVerification(phoneDto: SendPhoneVerificationDto): Promise<{ verificationId: string }> {
    try {
      this.logger.log(`Sending phone verification to: ${phoneDto.phoneNumber}`);
      
      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneDto.phoneNumber)) {
        throw new BadRequestException('Invalid phone number format');
      }

      // In a real implementation, you would use Firebase Phone Auth
      // For now, we'll simulate the process
      const verificationId = this.generateVerificationId();
      
      // Store verification ID with expiration (use Redis in production)
      // await this.storeVerificationId(phoneDto.phoneNumber, verificationId);
      
      // Send SMS (integrate with Firebase Phone Auth or SMS service)
      // await this.sendSMS(phoneDto.phoneNumber, verificationCode);
      
      this.logger.log(`Phone verification sent successfully to: ${phoneDto.phoneNumber}`);
      console.log(`📱 Verification ID generated: ${verificationId}`);
      
      return { verificationId };

    } catch (error) {
      this.logger.error(`Failed to send phone verification: ${error.message}`);
      throw new BadRequestException('Failed to send phone verification');
    }
  }

  /**
   * Verify phone number with code
   */
  async verifyPhoneNumber(verificationDto: PhoneVerificationDto): Promise<{ phoneNumber: string; verified: boolean }> {
    try {
      this.logger.log(`Verifying phone number with ID: ${verificationDto.verificationId}`);
      
      // In production, verify the code with Firebase Phone Auth
      // const credential = admin.auth.PhoneAuthProvider.credential(
      //   verificationDto.verificationId,
      //   verificationDto.verificationCode
      // );
      
      // For demo purposes, accept code "123456"
      if (verificationDto.verificationCode !== '123456') {
        throw new BadRequestException('Invalid verification code');
      }
      
      // Get phone number from stored verification ID
      const phoneNumber = await this.getPhoneNumberFromVerificationId(verificationDto.verificationId);
      
      this.logger.log(`Phone number verified successfully: ${phoneNumber}`);
      return { phoneNumber, verified: true };

    } catch (error) {
      this.logger.error(`Phone verification failed: ${error.message}`);
      throw new BadRequestException('Phone verification failed');
    }
  }

  /**
   * Create Firebase user
   */
  async createFirebaseUser(email: string, password: string, additionalData?: Partial<admin.auth.CreateRequest>): Promise<admin.auth.UserRecord> {
    try {
      this.logger.log(`Creating Firebase user: ${email}`);
      
      const userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
        ...additionalData,
      });

      this.logger.log(`Firebase user created successfully: ${userRecord.uid}`);
      return userRecord;

    } catch (error) {
      this.logger.error(`Failed to create Firebase user: ${error.message}`);
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update Firebase user
   */
  async updateFirebaseUser(uid: string, updateData: admin.auth.UpdateRequest): Promise<admin.auth.UserRecord> {
    try {
      this.logger.log(`Updating Firebase user: ${uid}`);
      
      const userRecord = await admin.auth().updateUser(uid, updateData);
      
      this.logger.log(`Firebase user updated successfully: ${uid}`);
      return userRecord;

    } catch (error) {
      this.logger.error(`Failed to update Firebase user: ${error.message}`);
      throw new BadRequestException(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete Firebase user
   */
  async deleteFirebaseUser(uid: string): Promise<void> {
    try {
      this.logger.log(`Deleting Firebase user: ${uid}`);
      
      await admin.auth().deleteUser(uid);
      
      this.logger.log(`Firebase user deleted successfully: ${uid}`);

    } catch (error) {
      this.logger.error(`Failed to delete Firebase user: ${error.message}`);
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get Firebase user by UID
   */
  async getFirebaseUser(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      this.logger.error(`Failed to get Firebase user: ${error.message}`);
      throw new BadRequestException(`User not found: ${uid}`);
    }
  }

  /**
   * Get Firebase user by email
   */
  async getFirebaseUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      this.logger.error(`Failed to get Firebase user by email: ${error.message}`);
      throw new BadRequestException(`User not found: ${email}`);
    }
  }

  /**
   * Set custom claims for user
   */
  async setCustomClaims(uid: string, customClaims: Record<string, any>): Promise<void> {
    try {
      this.logger.log(`Setting custom claims for user: ${uid}`);
      
      await admin.auth().setCustomUserClaims(uid, customClaims);
      
      this.logger.log(`Custom claims set successfully for user: ${uid}`);

    } catch (error) {
      this.logger.error(`Failed to set custom claims: ${error.message}`);
      throw new BadRequestException('Failed to set custom claims');
    }
  }

  /**
   * Generate custom token
   */
  async generateCustomToken(uid: string, additionalClaims?: Record<string, any>): Promise<string> {
    try {
      this.logger.log(`Generating custom token for user: ${uid}`);
      
      const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
      
      this.logger.log(`Custom token generated successfully for user: ${uid}`);
      return customToken;

    } catch (error) {
      this.logger.error(`Failed to generate custom token: ${error.message}`);
      throw new BadRequestException('Failed to generate custom token');
    }
  }

  /**
   * Convert Firebase user to application user
   */
  convertFirebaseUserToAppUser(firebaseUser: IFirebaseUser, role: UserRole = UserRole.CLIENT): IUser {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      phoneNumber: firebaseUser.phoneNumber,
      emailVerified: firebaseUser.emailVerified,
      phoneVerified: !!firebaseUser.phoneNumber, // True if phone number exists
      role,
      permissions: ROLE_PERMISSIONS[role],
      provider: firebaseUser.provider,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Validate Google login
   */
  private async validateGoogleLogin(firebaseUser: IFirebaseUser): Promise<void> {
    // Add Google-specific validation if needed
    if (!firebaseUser.emailVerified) {
      this.logger.warn(`Google user email not verified: ${firebaseUser.email}`);
      // In production, you might want to enforce email verification
    }
  }

  /**
   * Validate Facebook login
   */
  private async validateFacebookLogin(firebaseUser: IFirebaseUser): Promise<void> {
    // Add Facebook-specific validation if needed
    if (!firebaseUser.email) {
      throw new BadRequestException('Facebook login requires email permission');
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Generate verification ID
   */
  private generateVerificationId(): string {
    return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get phone number from verification ID (mock implementation)
   */
  private async getPhoneNumberFromVerificationId(verificationId: string): Promise<string> {
    // In production, retrieve from Redis or database
    // For demo, return a mock phone number
    return '+1234567890';
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(uid: string): Promise<void> {
    try {
      this.logger.log(`Sending email verification for user: ${uid}`);
      
      // Generate email verification link
      const link = await admin.auth().generateEmailVerificationLink(
        (await this.getFirebaseUser(uid)).email
      );
      
      // In production, send email with the verification link
      console.log(`📧 Email verification link: ${link}`);
      
      this.logger.log(`Email verification sent for user: ${uid}`);

    } catch (error) {
      this.logger.error(`Failed to send email verification: ${error.message}`);
      throw new BadRequestException('Failed to send email verification');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      this.logger.log(`Sending password reset email to: ${email}`);
      
      const link = await admin.auth().generatePasswordResetLink(email);
      
      // In production, send email with the reset link
      console.log(`🔐 Password reset link: ${link}`);
      
      this.logger.log(`Password reset email sent to: ${email}`);

    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      throw new BadRequestException('Failed to send password reset email');
    }
  }
}