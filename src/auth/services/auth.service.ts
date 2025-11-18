import { Injectable, Logger, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  LoginDto, 
  RegisterDto, 
  RefreshTokenDto,
  FirebaseTokenAuthDto,
  FederatedLoginDto,
  SendPhoneVerificationDto,
  PhoneVerificationDto,
  LoginResponseDto,
  RegisterResponseDto
} from '../dto/auth.dto';
import { IUser, IAuthResult, UserRole } from '../interfaces/auth.interface';
import { UserService } from './user.service';
import { JwtAuthService } from './jwt-auth.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { convertUserToResponseDto } from '../utils/user.utils';
import * as bcrypt from 'bcrypt';

/**
 * Main Authentication Service
 * Orchestrates all authentication methods and user management
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly configService: ConfigService,
  ) {
    console.log('🔐 Authentication Service initialized');
  }

  /**
   * User login with email and password
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    try {
      this.logger.log(`Login attempt for: ${loginDto.email}`);

      // Verify user credentials
      const user = await this.userService.verifyPassword(loginDto.email, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate tokens
      const tokenPair = await this.jwtAuthService.generateTokenPair(user);

      // Update last login
      await this.userService.updateLastLogin(user.id);

      this.logger.log(`Login successful for user: ${user.email}`);
      console.log(`✅ User logged in: ${user.email}`);

      return {
        success: true,
        message: 'Login successful',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: convertUserToResponseDto(user),
        tokens: tokenPair,
      };

    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * User registration with email and password
   * Best Practice: Creates Firebase Auth user first, then Firestore doc with matching UID
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    try {
      this.logger.log(`Registration attempt for: ${registerDto.email}`);

      // Check if user already exists in Firestore
      const existingUser = await this.userService.findUserByEmail(registerDto.email);
      if (existingUser) {
        throw new ConflictException('User already exists with this email');
      }

      let firebaseUid: string;
      
      // Step 1: Create Firebase Auth user first to get UID
      try {
        const firebaseUserRecord = await this.firebaseAuthService.createFirebaseUser(
          registerDto.email,
          registerDto.password,
          {
            displayName: registerDto.displayName,
            phoneNumber: registerDto.phoneNumber,
          }
        );
        firebaseUid = firebaseUserRecord.uid;
        this.logger.log(`Firebase Auth user created with UID: ${firebaseUid}`);
      } catch (firebaseError) {
        this.logger.error(`Firebase user creation failed: ${firebaseError.message}`);
        throw new BadRequestException(`Registration failed: ${firebaseError.message}`);
      }

      // Step 2: Create Firestore user document with matching UID
      let user: IUser;
      try {
        user = await this.userService.createUserWithAuth({
          email: registerDto.email,
          password: registerDto.password,
          displayName: registerDto.displayName,
          phoneNumber: registerDto.phoneNumber,
          role: registerDto.role || UserRole.CLIENT,
        }, firebaseUid);
      } catch (firestoreError) {
        // Rollback: Delete Firebase Auth user if Firestore creation fails
        this.logger.error(`Firestore user creation failed, rolling back: ${firestoreError.message}`);
        try {
          await this.firebaseAuthService.deleteFirebaseUser(firebaseUid);
        } catch (deleteError) {
          this.logger.error(`Failed to rollback Firebase Auth user: ${deleteError.message}`);
        }
        throw firestoreError;
      }

      // Generate tokens
      const tokenPair = await this.jwtAuthService.generateTokenPair(user);

      this.logger.log(`Registration successful: ${user.email} (UID: ${user.id})`);
      console.log(`🎉 User registered: ${user.email} (Firebase UID: ${user.id})`);

      return {
        success: true,
        message: 'Registration successful',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: convertUserToResponseDto(user),
        tokens: tokenPair,
      };

    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      this.logger.log('Token refresh attempt');

      // Validate refresh token
      const payload = await this.jwtAuthService.validateRefreshToken(refreshTokenDto.refreshToken);

      // Get current user
      const user = await this.userService.findUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate new access token
      const accessToken = await this.jwtAuthService.generateAccessToken(user);
      const expiresIn = this.jwtAuthService.getTimeToExpiry(accessToken);

      this.logger.log(`Token refreshed successfully for user: ${user.email}`);

      return {
        accessToken,
        expiresIn,
      };

    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Firebase token authentication
   * Best Practice: Firestore doc ID matches Firebase Auth UID
   */
  async authenticateWithFirebase(tokenDto: FirebaseTokenAuthDto): Promise<LoginResponseDto> {
    try {
      this.logger.log('Firebase token authentication attempt');

      // Verify Firebase token and get user data
      const firebaseUser = await this.firebaseAuthService.verifyFirebaseToken(tokenDto);

      // Create or update user in Firestore using Firebase Auth UID
      const user = await this.userService.createOrUpdateFromFirebaseAuth(
        firebaseUser.uid,
        firebaseUser.email,
        {
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
          emailVerified: firebaseUser.emailVerified,
          phoneVerified: !!firebaseUser.phoneNumber,
          provider: firebaseUser.provider,
        }
      );

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate tokens
      const tokenPair = await this.jwtAuthService.generateTokenPair(user);

      this.logger.log(`Firebase authentication successful: ${user.email} (UID: ${user.id})`);
      console.log(`✅ Firebase auth: ${user.email} (UID: ${user.id})`);

      return {
        success: true,
        message: 'Firebase authentication successful',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: convertUserToResponseDto(user),
        tokens: tokenPair,
      };

    } catch (error) {
      this.logger.error(`Firebase authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Federated login (Google, Facebook, etc.)
   */
  async federatedLogin(federatedDto: FederatedLoginDto): Promise<LoginResponseDto> {
    try {
      this.logger.log(`Federated login attempt with ${federatedDto.provider}`);

      // Handle federated login through Firebase (verifies Google token, creates/gets Firebase user)
      const firebaseUser = await this.firebaseAuthService.handleFederatedLogin(federatedDto);

      // Check if user exists in our database
      let user = await this.userService.findUserByEmail(firebaseUser.email);

      if (!user) {
        // Create new user from Firebase user data
        this.logger.log(`Creating new user from federated login: ${firebaseUser.email}`);
        user = await this.userService.createOrUpdateFromFirebaseAuth(
          firebaseUser.uid,
          firebaseUser.email,
          {
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            phoneNumber: firebaseUser.phoneNumber,
            emailVerified: firebaseUser.emailVerified,
            provider: firebaseUser.provider,
            role: UserRole.CLIENT, // Default role for new users
          }
        );
      } else {
        // Update last login
        this.logger.log(`Existing user found, updating last login: ${user.email}`);
        user.lastLoginAt = new Date();
        await this.userService.updateUser(user.id, user);
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate JWT tokens
      const tokenPair = await this.jwtAuthService.generateTokenPair(user);

      this.logger.log(`Federated login successful for user: ${user.email}`);

      return {
        success: true,
        message: 'Login successful',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        user: convertUserToResponseDto(user),
        tokens: tokenPair,
      };

    } catch (error) {
      this.logger.error(`Federated login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send phone verification code
   */
  async sendPhoneVerification(phoneDto: SendPhoneVerificationDto): Promise<{ verificationId: string; message: string }> {
    try {
      this.logger.log(`Phone verification request for: ${phoneDto.phoneNumber}`);

      const result = await this.firebaseAuthService.sendPhoneVerification(phoneDto);

      return {
        verificationId: result.verificationId,
        message: 'Verification code sent successfully',
      };

    } catch (error) {
      this.logger.error(`Phone verification send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify phone number
   */
  async verifyPhoneNumber(verificationDto: PhoneVerificationDto): Promise<{ phoneNumber: string; verified: boolean; message: string }> {
    try {
      this.logger.log(`Phone verification attempt with ID: ${verificationDto.verificationId}`);

      const result = await this.firebaseAuthService.verifyPhoneNumber(verificationDto);

      return {
        phoneNumber: result.phoneNumber,
        verified: result.verified,
        message: 'Phone number verified successfully',
      };

    } catch (error) {
      this.logger.error(`Phone verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Logout user (blacklist token)
   */
  async logout(token: string): Promise<{ message: string }> {
    try {
      this.logger.log('Logout attempt');

      // Blacklist the token
      await this.jwtAuthService.blacklistToken(token);

      this.logger.log('Logout successful');
      console.log('👋 User logged out');

      return { message: 'Logout successful' };

    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      throw new BadRequestException('Logout failed');
    }
  }

  /**
   * Validate user session
   */
  async validateSession(token: string): Promise<{ valid: boolean; user?: IUser; expiresIn?: number }> {
    try {
      // Validate access token
      const payload = await this.jwtAuthService.validateAccessToken(token);

      // Get user
      const user = await this.userService.findUserById(payload.sub);
      if (!user || !user.isActive) {
        return { valid: false };
      }

      const expiresIn = this.jwtAuthService.getTimeToExpiry(token);

      return {
        valid: true,
        user,
        expiresIn,
      };

    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Password change attempt for user: ${userId}`);

      await this.userService.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      this.logger.log(`Password changed successfully for user: ${userId}`);

      return { message: 'Password changed successfully' };

    } catch (error) {
      this.logger.error(`Password change failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Password reset request for: ${email}`);

      // Check if user exists
      const user = await this.userService.findUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // Send password reset email through Firebase
      await this.firebaseAuthService.sendPasswordResetEmail(email);

      this.logger.log(`Password reset email sent to: ${email}`);

      return { message: 'Password reset link has been sent to your email' };

    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`);
      return { message: 'If the email exists, a password reset link has been sent' };
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(userId: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Email verification request for user: ${userId}`);

      const user = await this.userService.findUserById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Send email verification through Firebase
      await this.firebaseAuthService.sendEmailVerification(user.id);

      this.logger.log(`Email verification sent for user: ${userId}`);

      return { message: 'Email verification sent successfully' };

    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get authentication statistics
   */
  async getAuthStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByProvider: Record<string, number>;
    usersByRole: Record<string, number>;
  }> {
    try {
      const userStats = await this.userService.getUserStats();

      // Get users by provider (simplified)
      const usersByProvider = {
        email: userStats.total, // Simplified for demo
        google: 0,
        facebook: 0,
      };

      return {
        totalUsers: userStats.total,
        activeUsers: userStats.active,
        usersByProvider,
        usersByRole: userStats.byRole as Record<string, number>,
      };

    } catch (error) {
      this.logger.error(`Failed to get auth stats: ${error.message}`);
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersByProvider: {},
        usersByRole: {},
      };
    }
  }
}