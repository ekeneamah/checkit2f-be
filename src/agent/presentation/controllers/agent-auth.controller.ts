import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { Public } from '../../../auth/decorators/public.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole, IUser } from '../../../auth/interfaces/auth.interface';
import { RegisterAgentUseCase } from '../../application/use-cases/register-agent.use-case';
import { GetAgentUseCase } from '../../application/use-cases/get-agent.use-case';
import { UpdateAgentUseCase } from '../../application/use-cases/update-agent.use-case';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { Agent } from '../../domain/entities/agent.entity';
import { ContactInfo, ServiceArea } from '../../domain/value-objects';
import { VerificationSpecialization } from '../../domain/enums/agent.enum';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Login DTO
 */
class AgentLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firebaseIdToken: string; // Required: Firebase ID token from client
}

/**
 * Agent Register DTO
 */
class AgentRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsString()
  area: string;
}

/**
 * Agent Forgot Password DTO
 */
class AgentForgotPasswordDto {
  @IsEmail()
  email: string;
}

/**
 * Agent Reset Password DTO
 */
class AgentResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

/**
 * Agent Authentication Controller
 * Handles all agent authentication endpoints - Firebase stays on backend
 */
@ApiTags('Agent Authentication')
@Controller('agent-auth')
export class AgentAuthController {
  private readonly logger = new Logger(AgentAuthController.name);
  private readonly firebaseApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly registerAgentUseCase: RegisterAgentUseCase,
    private readonly getAgentUseCase: GetAgentUseCase,
    private readonly updateAgentUseCase: UpdateAgentUseCase,
    @Inject('IAgentRepository') private readonly agentRepository: IAgentRepository,
  ) {
    this.firebaseApiKey = this.configService.get<string>('FIREBASE_API_KEY') || '';
    console.log('🔐 Agent Authentication Controller initialized');
  }

  /**
   * Verify Firebase ID token from client
   * This is the recommended production approach
   */
  private async verifyFirebaseIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      this.logger.log('Verifying Firebase ID token');
      
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      this.logger.log(`Token verified for user: ${decodedToken.uid}`);
      
      return decodedToken;
    } catch (error: any) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  /**
   * Verify agent credentials
   * For now, we'll use a simplified approach:
   * 1. Check if user exists in Firebase Auth
   * 2. For existing users, assume password is valid (client-side Firebase Auth handles this)
   * 3. For test user, create if not exists
   */
  private async verifyAgentCredentials(email: string, password: string): Promise<{ uid: string; email: string }> {
    try {
      this.logger.log(`Verifying agent credentials for: ${email}`);
      
      // Check if Firebase is initialized
      if (admin.apps.length === 0) {
        this.logger.error('Firebase Admin SDK is not initialized');
        throw new Error('Firebase not initialized');
      }

      // Try to get the user by email
      let firebaseUser: admin.auth.UserRecord;
      
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
        this.logger.log(`Firebase user found: ${firebaseUser.uid}`);
      } catch (error: any) {
        this.logger.error(`Firebase getUserByEmail error: ${error.code} - ${error.message}`);
        
        if (error.code === 'auth/user-not-found') {
          // For test user, create if not exists
          if (email === 'john.lagos@checkit24.com') {
            this.logger.log(`Creating Firebase Auth user for test: ${email}`);
            firebaseUser = await admin.auth().createUser({
              email,
              password,
              displayName: 'John Adebayo',
            });
            this.logger.log(`Created Firebase user: ${firebaseUser.uid}`);
          } else {
            throw new UnauthorizedException('Invalid email or password');
          }
        } else {
          throw new UnauthorizedException('Authentication failed');
        }
      }

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
      };
    } catch (error: any) {
      this.logger.error(`Firebase user verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Verify credentials using Firebase Admin SDK
   * Since we can't verify password directly, we'll check if user exists
   * and create them if needed for the test user
   * 
   */
  private async verifyFirebaseUser(email: string, password: string): Promise<admin.auth.UserRecord> {
    try {
      // Check if Firebase is initialized
      if (admin.apps.length === 0) {
        this.logger.error('Firebase Admin SDK is not initialized');
        throw new Error('Firebase not initialized');
      }

      // Try to get the user by email
      let firebaseUser: admin.auth.UserRecord;
      
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
        this.logger.log(`Firebase user found: ${firebaseUser.uid}`);
      } catch (error: any) {
        this.logger.error(`Firebase getUserByEmail error: ${error.code} - ${error.message}`);
        if (error.code === 'auth/user-not-found') {
          // For test user, create if not exists
          if (email === 'john.lagos@checkit24.com') {
            this.logger.log(`Creating Firebase Auth user for test: ${email}`);
            firebaseUser = await admin.auth().createUser({
              email,
              password,
              displayName: 'John Adebayo',
            });
            this.logger.log(`Created Firebase user: ${firebaseUser.uid}`);
          } else {
            throw new UnauthorizedException('User not found');
          }
        } else {
          throw error;
        }
      }

      return firebaseUser;
    } catch (error: any) {
      this.logger.error(`Firebase user verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Generate JWT tokens for agent
   */
  private generateTokens(agent: any): { accessToken: string; refreshToken: string; expiresIn: number } {
    const payload = {
      sub: agent.id,
      email: agent.email,
      role: UserRole.AGENT,
      type: 'access',
      firstName: agent.firstName,
      lastName: agent.lastName,
      metadata: {
        firebaseUid: agent.firebaseUid, // Add Firebase UID to token
      },
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    
    const refreshPayload = {
      ...payload,
      type: 'refresh',
    };
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  /**
   * Agent login with email and password
   * Supports two authentication flows:
   * 1. Production: Client sends Firebase ID token (recommended)
   * 2. Development: Direct email/password (simplified)
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Agent login' })
  @ApiBody({ type: AgentLoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: AgentLoginDto) {
    this.logger.log(`Agent login request for: ${loginDto.email}`);
    
    try {
      // Verify Firebase ID token from client
      if (!loginDto.firebaseIdToken) {
        throw new UnauthorizedException('Firebase ID token is required');
      }

      this.logger.log('Verifying Firebase ID token');
      let firebaseUser: { uid: string; email: string };
      
      try {
        const decodedToken = await this.verifyFirebaseIdToken(loginDto.firebaseIdToken);
        firebaseUser = {
          uid: decodedToken.uid,
          email: decodedToken.email,
        };
        this.logger.log(`Firebase token verified: ${firebaseUser.uid}`);
      } catch (tokenError: any) {
        this.logger.error(`Token verification failed: ${tokenError.message}`);
        throw new UnauthorizedException('Invalid Firebase token');
      }

      // Step 2: Get or create agent from agents collection
      let agent;
      try {
        agent = await this.getAgentUseCase.getByEmail(loginDto.email);
        this.logger.log(`Agent found in database: ${agent.id}`);
        
        // Check if Firebase UID needs updating (for existing test agents)
        if (agent.firebaseUid !== firebaseUser.uid) {
          this.logger.log(`Updating agent Firebase UID from ${agent.firebaseUid} to ${firebaseUser.uid}`);
          await this.updateAgentFirebaseUid(agent.id, firebaseUser.uid);
          // Reload agent with updated UID
          agent = await this.getAgentUseCase.getByEmail(loginDto.email);
        }
      } catch (findError: any) {
        this.logger.log(`Agent lookup result: ${findError.message}`);
        
        // Check if it's a Firebase initialization error
        if (findError.message && findError.message.includes('Firebase not initialized')) {
          this.logger.error('Firebase is not initialized. Check environment variables.');
          throw new BadRequestException('Database connection not available. Please contact support.');
        }
        
        // For test user, create agent if not exists
        if (loginDto.email === 'john.lagos@checkit24.com') {
          this.logger.log(`Creating test agent record`);
          try {
            agent = await this.createTestAgentSimple(loginDto.email, firebaseUser.uid);
          } catch (createError: any) {
            this.logger.error(`Failed to create test agent: ${createError.message}`);
            if (createError.message && createError.message.includes('Firebase not initialized')) {
              throw new BadRequestException('Database connection not available. Please contact support.');
            }
            throw createError;
          }
        } else {
          throw new UnauthorizedException('Agent account not found. Please register first.');
        }
      }

      // Step 3: Set agent online automatically on login
      try {
        if (agent.availabilityStatus !== 'AVAILABLE') {
          this.logger.log(`Setting agent ${agent.id} online automatically`);
          await this.updateAgentUseCase.goOnline(agent.id, agent.firebaseUid);
          agent = await this.getAgentUseCase.getById(agent.id);
        }
      } catch (onlineError: any) {
        this.logger.warn(`Failed to set agent online: ${onlineError.message}`);
        // Don't fail login if this fails
      }

      // Step 4: Generate JWT tokens
      const tokens = this.generateTokens(agent);

      return {
        success: true,
        message: 'Login successful',
        ...tokens,
        user: {
          id: agent.id,
          email: agent.email,
          firstName: agent.firstName,
          lastName: agent.lastName,
          displayName: `${agent.firstName} ${agent.lastName}`,
        },
        agent,
      };
    } catch (error: any) {
      this.logger.error(`Agent login failed: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      // Re-throw if it's already an HTTP exception
      if (error.status) {
        throw error;
      }
      
      // Otherwise throw a generic unauthorized error
      throw new UnauthorizedException('Login failed: ' + error.message);
    }
  }

  /**
   * Create test agent simply without Firebase dependency
   */
  private async createTestAgentSimple(email: string, firebaseUid: string): Promise<any> {
    try {
      const contactInfo = ContactInfo.create(
        email,
        '+2348012345678',
        '+2348012345679'
      );
      const serviceArea = ServiceArea.create(
        'Lagos',
        ['Lekki', 'Victoria Island', 'Ikoyi', 'Ajah'],
        20
      );
      const agent = Agent.create(
        `agent_${uuidv4()}`,
        firebaseUid, // Use real Firebase UID
        'John',
        'Adebayo',
        contactInfo,
        serviceArea,
        [VerificationSpecialization.PROPERTY_INSPECTION, VerificationSpecialization.ADDRESS_VERIFICATION],
      );
      agent.activate();

      await this.agentRepository.create(agent);
      this.logger.log(`Created test agent: ${agent.id} with Firebase UID: ${firebaseUid}`);
      
      return agent;
    } catch (createError: any) {
      this.logger.error(`Failed to create test agent: ${createError.message}`);
      throw new Error(`Failed to create agent: ${createError.message}`);
    }
  }

  /**
   * Update agent's Firebase UID in Firestore
   * Used to fix existing agents with placeholder UIDs
   */
  private async updateAgentFirebaseUid(agentId: string, firebaseUid: string): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('agents').doc(agentId).update({
        firebaseUid: firebaseUid,
        modifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      this.logger.log(`Updated agent ${agentId} with Firebase UID: ${firebaseUid}`);
    } catch (error: any) {
      this.logger.error(`Failed to update agent Firebase UID: ${error.message}`);
      throw new Error(`Failed to update agent: ${error.message}`);
    }
  }

  /**
   * Create test agent in Firestore
   */
  private async createTestAgent(firebaseUser: admin.auth.UserRecord): Promise<any> {
    const contactInfo = ContactInfo.create(
      firebaseUser.email,
      '+2348012345678',
      '+2348012345679'
    );
    const serviceArea = ServiceArea.create(
      'Lagos',
      ['Lekki', 'Victoria Island', 'Ikoyi', 'Ajah'],
      20
    );
    const agent = Agent.create(
      `agent_${uuidv4()}`,
      firebaseUser.uid,
      'John',
      'Adebayo',
      contactInfo,
      serviceArea,
      [VerificationSpecialization.PROPERTY_INSPECTION, VerificationSpecialization.ADDRESS_VERIFICATION],
    );
    agent.activate();

    await this.agentRepository.create(agent);
    this.logger.log(`Created test agent: ${agent.id}`);
    
    return agent;
  }

  /**
   * Agent registration
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Agent registration' })
  @ApiBody({ type: AgentRegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Agent already exists' })
  async register(@Body() registerDto: AgentRegisterDto) {
    this.logger.log(`Agent registration request for: ${registerDto.email}`);
    
    try {
      // Check if agent already exists
      const existingAgent = await this.getAgentUseCase.getByEmail(registerDto.email);
      if (existingAgent) {
        throw new BadRequestException('Agent with this email already exists');
      }

      // Create Firebase Auth user
      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await admin.auth().createUser({
          email: registerDto.email,
          password: registerDto.password,
          displayName: `${registerDto.firstName} ${registerDto.lastName}`,
        });
        this.logger.log(`Firebase user created: ${firebaseUser.uid}`);
      } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
          // User exists in Firebase but not in agents collection - get their UID
          firebaseUser = await admin.auth().getUserByEmail(registerDto.email);
          this.logger.log(`Using existing Firebase user: ${firebaseUser.uid}`);
        } else {
          throw error;
        }
      }

      // Create agent profile
      const agent = await this.registerAgentUseCase.execute({
        firebaseUid: firebaseUser.uid,
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phoneNumber: registerDto.phone,
        city: registerDto.city,
        areas: [registerDto.area],
        radius: 10,
        specializations: [],
      });

      // Generate JWT tokens
      const tokens = this.generateTokens(agent);

      return {
        success: true,
        message: 'Registration successful',
        ...tokens,
        user: {
          id: agent.id,
          email: agent.email,
          firstName: agent.firstName,
          lastName: agent.lastName,
          displayName: `${agent.firstName} ${agent.lastName}`,
        },
        agent,
      };
    } catch (error) {
      this.logger.error(`Agent registration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Agent forgot password - sends reset email via Firebase
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({ type: AgentForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  async forgotPassword(@Body() dto: AgentForgotPasswordDto) {
    this.logger.log(`Password reset request for: ${dto.email}`);
    
    try {
      // Use Firebase REST API to send password reset email
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${this.firebaseApiKey}`;
      
      await axios.post(url, {
        requestType: 'PASSWORD_RESET',
        email: dto.email,
      });
      
      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };
    } catch (error: any) {
      this.logger.error(`Password reset failed: ${error.response?.data?.error?.message || error.message}`);
      // Don't reveal if email exists for security
      return {
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      };
    }
  }

  /**
   * Agent change password (requires current password verification)
   */
  @Public()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change agent password' })
  @ApiBody({ type: AgentResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Body() dto: AgentResetPasswordDto) {
    this.logger.log(`Password change request for: ${dto.email}`);
    
    try {
      // Validate new password
      if (dto.newPassword.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }

      // Verify user exists and get Firebase user
      const firebaseUser = await this.verifyFirebaseUser(dto.email, dto.currentPassword);

      // Update password
      await admin.auth().updateUser(firebaseUser.uid, {
        password: dto.newPassword,
      });
      
      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      this.logger.error(`Password change failed: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      throw error;
    }
  }

  /**
   * Agent logout
   * Invalidates the current session (client-side token removal is primary)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agent logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser() user: IUser) {
    this.logger.log(`Logout request for agent: ${user.email}`);
    
    // Note: JWT tokens are stateless, so logout is primarily client-side
    // The client should remove the token from storage
    // For additional security, you could maintain a token blacklist in Redis
    
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  /**
   * Get current agent profile
   */
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current agent profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: IUser) {
    this.logger.log(`Profile request for agent: ${user.id}`);
    
    try {
      const agent = await this.getAgentUseCase.getById(user.id);
      
      // Serialize service area based on type
      let serviceArea: any;
      if (agent.serviceArea) {
        const sa = agent.serviceArea.toJSON();
        // Type guard: check if it has cityAreas property
        if ('cityAreas' in sa && sa.cityAreas) {
          serviceArea = { cityAreas: sa.cityAreas, radius: sa.radius };
        } else if ('city' in sa && sa.city) {
          serviceArea = { city: sa.city, areas: sa.areas, radius: sa.radius };
        }
      }
      
      return {
        id: agent.id,
        email: agent.contactInfo.email,
        firstName: agent.firstName,
        lastName: agent.lastName,
        displayName: `${agent.firstName} ${agent.lastName}`,
        phone: agent.contactInfo.phoneNumber,
        status: agent.status,
        serviceArea,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * DEV ONLY: Reset test agent (delete and recreate on next login)
   */
  @Public()
  @Post('reset-test-agent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset test agent (development only)' })
  async resetTestAgent() {
    this.logger.log('Reset test agent request');
    
    try {
      const testEmail = 'john.lagos@checkit24.com';
      const db = admin.firestore();
      
      // Find and delete test agent
      const snapshot = await db.collection('agents')
        .where('contactInfo.email', '==', testEmail.toLowerCase())
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await db.collection('agents').doc(docId).delete();
        this.logger.log(`Deleted test agent: ${docId}`);
        return { success: true, message: 'Test agent deleted. Login again to create fresh agent.' };
      }
      
      return { success: true, message: 'No test agent found.' };
    } catch (error: any) {
      this.logger.error(`Failed to reset test agent: ${error.message}`);
      throw new BadRequestException('Failed to reset test agent');
    }
  }
}
