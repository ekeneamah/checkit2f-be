import {
  Controller,
  Post,
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
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { Public } from '../../../auth/decorators/public.decorator';
import { RegisterAgentUseCase } from '../../application/use-cases/register-agent.use-case';
import { GetAgentUseCase } from '../../application/use-cases/get-agent.use-case';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';

/**
 * Agent Login DTO
 */
class AgentLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
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
    @Inject('IAgentRepository') private readonly agentRepository: IAgentRepository,
  ) {
    this.firebaseApiKey = this.configService.get<string>('FIREBASE_API_KEY') || '';
    console.log('🔐 Agent Authentication Controller initialized');
  }

  /**
   * Sign in with Firebase REST API
   */
  private async firebaseSignIn(email: string, password: string): Promise<{ idToken: string; localId: string; email: string }> {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.firebaseApiKey}`;
    
    try {
      const response = await axios.post(url, {
        email,
        password,
        returnSecureToken: true,
      });
      
      return {
        idToken: response.data.idToken,
        localId: response.data.localId,
        email: response.data.email,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Authentication failed';
      this.logger.error(`Firebase sign-in failed: ${errorMessage}`);
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  /**
   * Generate JWT tokens for agent
   */
  private generateTokens(agent: any): { accessToken: string; refreshToken: string; expiresIn: number } {
    const payload = {
      sub: agent.id,
      email: agent.email,
      role: 'agent',
      firstName: agent.firstName,
      lastName: agent.lastName,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }

  /**
   * Agent login with email and password
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
      // Check FIREBASE_API_KEY is configured
      if (!this.firebaseApiKey) {
        this.logger.error('FIREBASE_API_KEY not configured');
        throw new BadRequestException('Server configuration error');
      }

      // Special handling for test user john.lagos@checkit24.com
      if (loginDto.email === 'john.lagos@checkit24.com') {
        await this.createTestUserIfNotExists(loginDto.email, loginDto.password);
      }

      // Authenticate with Firebase REST API
      const firebaseResult = await this.firebaseSignIn(loginDto.email, loginDto.password);
      this.logger.log(`Firebase auth successful for: ${firebaseResult.email}`);

      // Get agent from agents collection
      let agent;
      try {
        agent = await this.getAgentUseCase.getByEmail(loginDto.email);
      } catch (error) {
        // Agent not found in agents collection
        throw new UnauthorizedException('Agent account not found. Please register first.');
      }

      // Generate JWT tokens
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
    } catch (error) {
      this.logger.error(`Agent login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create test user if not exists
   */
  private async createTestUserIfNotExists(email: string, password: string): Promise<void> {
    try {
      // Check if Firebase Auth user exists
      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
        this.logger.log(`Firebase Auth user already exists: ${firebaseUser.uid}`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create Firebase Auth user
          firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName: 'John Adebayo',
          });
          this.logger.log(`Created Firebase Auth user: ${firebaseUser.uid}`);
        } else {
          throw error;
        }
      }

      // Check if agent exists in Firestore
      try {
        await this.getAgentUseCase.getByEmail(email);
        this.logger.log(`Agent already exists in Firestore: ${email}`);
      } catch (error) {
        // Create agent in Firestore
        const { v4: uuidv4 } = require('uuid');
        const { Agent } = require('../../domain/entities/agent.entity');
        const { ContactInfo, ServiceArea } = require('../../domain/value-objects');
        const { VerificationSpecialization } = require('../../domain/enums/agent.enum');

        const contactInfo = ContactInfo.create(email, '+2348012345678', '+2348012345679');
        const serviceArea = ServiceArea.create('Lagos', ['Lekki', 'Victoria Island', 'Ikoyi', 'Ajah'], 20);
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
        this.logger.log(`Created agent in Firestore: ${email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create test user: ${error.message}`);
    }
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

      // Verify current password via Firebase REST API
      await this.firebaseSignIn(dto.email, dto.currentPassword);

      // Get Firebase user and update password
      const firebaseUser = await admin.auth().getUserByEmail(dto.email);
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
}
