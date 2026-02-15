import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { PartnerOnboardingService } from '@/company/application/services/partner-onboarding.service';
import {
  CreatePartnerOnboardingDto,
  UpdateOnboardingStatusDto,
  PartnerOnboardingQueryDto,
} from '@/company/application/dtos/partner-onboarding.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/auth/guards/admin.guard';
import { Request } from 'express';

/**
 * Partner Onboarding Controller
 * Handles partner company onboarding requests
 * 
 * Public endpoints: Submit onboarding request
 * Admin endpoints: Review, approve, create companies
 */
@ApiTags('Partner Onboarding')
@Controller('partner-onboarding')
export class PartnerOnboardingController {
  private readonly logger = new Logger(PartnerOnboardingController.name);

  constructor(
    private readonly partnerOnboardingService: PartnerOnboardingService,
  ) {}

  /**
   * PUBLIC: Submit partner onboarding request
   * No authentication required - open to public
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Submit partner onboarding request',
    description: 'Public endpoint for companies to submit partnership applications'
  })
  @ApiBody({ type: CreatePartnerOnboardingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Onboarding request submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Duplicate request or email already exists',
  })
  async submitOnboardingRequest(
    @Body() dto: CreatePartnerOnboardingDto,
    @Req() req: Request,
  ) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const request = await this.partnerOnboardingService.submitOnboardingRequest(
        dto,
        ipAddress,
        userAgent,
      );

      return {
        success: true,
        message: 'Your partner application has been submitted successfully. You will receive an email confirmation shortly.',
        data: {
          id: request.id,
          status: request.status,
          submittedAt: request.submittedAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to submit onboarding request: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ADMIN: Get all onboarding requests with pagination
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all onboarding requests (Admin only)',
    description: 'Retrieve paginated list of partner onboarding requests with filtering'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding requests retrieved successfully',
  })
  async getOnboardingRequests(@Query() query: PartnerOnboardingQueryDto) {
    try {
      const result = await this.partnerOnboardingService.getOnboardingRequests(query);

      return {
        success: true,
        data: result.requests,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get onboarding requests: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ADMIN: Get single onboarding request by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get onboarding request by ID (Admin only)',
    description: 'Retrieve detailed information about a specific onboarding request'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding request retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Onboarding request not found',
  })
  async getOnboardingRequestById(@Param('id') id: string) {
    try {
      const request = await this.partnerOnboardingService.getOnboardingRequestById(id);

      return {
        success: true,
        data: request,
      };
    } catch (error) {
      this.logger.error(`Failed to get onboarding request: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ADMIN: Update onboarding request status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update onboarding request status (Admin only)',
    description: 'Change the status of an onboarding request (e.g., approve, reject)'
  })
  @ApiBody({ type: UpdateOnboardingStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition or missing required fields',
  })
  async updateOnboardingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOnboardingStatusDto,
    @Req() req: any,
  ) {
    try {
      const adminId = req.user?.uid || req.user?.id;
      const request = await this.partnerOnboardingService.updateOnboardingStatus(
        id,
        dto,
        adminId,
      );

      return {
        success: true,
        message: `Onboarding request status updated to ${dto.status}`,
        data: request,
      };
    } catch (error) {
      this.logger.error(`Failed to update onboarding status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ADMIN: Create company from approved onboarding request
   */
  @Post(':id/create-company')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create company from approved request (Admin only)',
    description: 'Convert an approved onboarding request into an active company account'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Company created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Request not approved or already converted',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Company with this email already exists',
  })
  async createCompanyFromRequest(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    try {
      const adminId = req.user?.uid || req.user?.id;
      const result = await this.partnerOnboardingService.createCompanyFromRequest(
        id,
        adminId,
      );

      return {
        success: true,
        message: 'Company created successfully and welcome email sent',
        data: {
          company: result.company,
          request: result.request,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create company from request: ${error.message}`, error.stack);
      throw error;
    }
  }
}
