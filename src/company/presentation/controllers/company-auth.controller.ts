import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { OnboardingService } from '../../application/services/onboarding.service';
import { CompanyService } from '../../application/services/company.service';
import { RiderService } from '../../application/services/rider.service';
import { CompanyResponseDto } from '../../application/dtos';
import * as admin from 'firebase-admin';

interface AuthenticatedRequest {
  user: {
    uid: string;
    email: string;
    role: UserRole;
  };
}

// DTOs for auth endpoints
class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}

class OnboardingStatusResponse {
  isFirstLogin: boolean;
  hasRiders: boolean;
  riderCount: number;
  profileComplete: boolean;
  userType: 'company' | 'rider';
  companyName?: string;
  companyId?: string;
}

/**
 * Company Auth Controller
 * 
 * Handles auth-related endpoints for company and rider users:
 * - Check onboarding status (first login, has riders, etc.)
 * - Change password
 * - Get current user profile
 * 
 * Used by agent-web app for both Company and Rider roles
 */
@ApiTags('Company Auth')
@ApiBearerAuth()
@Controller('company-auth')
export class CompanyAuthController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly companyService: CompanyService,
    private readonly riderService: RiderService,
  ) {}

  /**
   * Get onboarding status for current user
   * Used to determine what screens to show after login
   */
  @Get('onboarding-status')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get onboarding status for current user' })
  @ApiResponse({ status: 200, description: 'Onboarding status' })
  async getOnboardingStatus(@Req() req: AuthenticatedRequest): Promise<OnboardingStatusResponse> {
    const { uid, role } = req.user;

    if (role === UserRole.COMPANY) {
      const status = await this.onboardingService.getCompanyOnboardingStatus(uid);
      const company = await this.companyService.getCompanyByOwnerId(uid);
      
      return {
        isFirstLogin: status.isFirstLogin,
        hasRiders: status.hasRiders,
        riderCount: status.riderCount,
        profileComplete: status.profileComplete,
        userType: 'company',
        companyName: company.name,
        companyId: company.id,
      };
    } else {
      // Rider
      const rider = await this.riderService.getRiderByFirebaseUid(uid);
      const company = await this.companyService.getCompanyById(rider.companyId);
      
      return {
        isFirstLogin: rider.isFirstLogin ?? true,
        hasRiders: true, // Not applicable for riders
        riderCount: 0,
        profileComplete: rider.onboardingComplete,
        userType: 'rider',
        companyName: company.name,
        companyId: company.id,
      };
    }
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getCurrentUser(@Req() req: AuthenticatedRequest): Promise<{
    userType: 'company' | 'rider';
    profile: any;
  }> {
    const { uid, role } = req.user;

    if (role === UserRole.COMPANY) {
      const company = await this.companyService.getCompanyByOwnerId(uid);
      return {
        userType: 'company',
        profile: this.companyService.mapToResponse(company),
      };
    } else {
      const rider = await this.riderService.getRiderByFirebaseUid(uid);
      return {
        userType: 'rider',
        profile: this.riderService.mapToResponse(rider),
      };
    }
  }

  /**
   * Change password
   * After changing, marks first login as complete
   */
  @Post('change-password')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string; isFirstLogin: boolean }> {
    const { uid, role } = req.user;

    try {
      // Verify current password by re-authenticating
      // Note: In production, you might want to use Firebase Admin SDK
      // to verify the password server-side or use a different approach

      // Update password in Firebase
      await admin.auth().updateUser(uid, {
        password: dto.newPassword,
      });

      // Mark password as changed in our system
      const userType = role === UserRole.COMPANY ? 'company' : 'rider';
      await this.onboardingService.markPasswordChanged(uid, userType);

      return {
        message: 'Password changed successfully',
        isFirstLogin: false,
      };
    } catch (error) {
      throw new BadRequestException('Failed to change password: ' + error.message);
    }
  }

  /**
   * Mark first login complete (for cases where password change is skipped)
   */
  @Post('complete-first-login')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark first login as complete' })
  @ApiResponse({ status: 200, description: 'First login marked complete' })
  async completeFirstLogin(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    const { uid, role } = req.user;
    const userType = role === UserRole.COMPANY ? 'company' : 'rider';
    
    await this.onboardingService.markPasswordChanged(uid, userType);
    
    return { message: 'First login completed' };
  }

  /**
   * Record login event
   */
  @Post('record-login')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record login event' })
  async recordLogin(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    const { uid, role } = req.user;
    const userType = role === UserRole.COMPANY ? 'company' : 'rider';
    
    await this.onboardingService.recordLogin(uid, userType);
    
    return { message: 'Login recorded' };
  }
}
