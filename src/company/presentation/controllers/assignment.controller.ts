import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { CompanyService, AssignmentService } from '../../application/services';
import {
  AssignToRiderDto,
  SelfAssignDto,
  ReassignDto,
  CancelAssignmentDto,
  DeclineAssignmentDto,
  SmartAssignRequestDto,
  SmartAssignResponseDto,
  AssignmentResponseDto,
  AssignmentQueryDto,
} from '../../application/dtos';

interface AuthUser {
  uid: string;
  email: string;
  role: string;
}

// Mock interface for verification request - would come from verification module
interface VerificationRequest {
  id: string;
  title: string;
  verificationType: string;
  businessName?: string;
  fullName?: string;
  address: string;
  location?: { lat: number; lng: number };
  payout: number;
  priority: string;
  dueDate?: Date;
  createdAt: Date;
}

@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentController {
  private readonly logger = new Logger(AssignmentController.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly assignmentService: AssignmentService
  ) {}

  // ==================== INCOMING REQUESTS ====================

  /**
   * Get incoming verification requests for the company
   * These are requests that have been routed to this company but not yet assigned
   */
  @Get('requests/incoming')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getIncomingRequests(@CurrentUser() user: AuthUser): Promise<any[]> {
    // Note: This would typically query from a verification requests service
    // For now, return empty - would integrate with verification module
    this.logger.log(`Getting incoming requests for user: ${user.uid}`);
    return [];
  }

  // ==================== SMART ASSIGNMENT ====================

  /**
   * Get smart assignment candidates for a request
   */
  @Post('requests/:requestId/smart-assign')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getSmartAssignCandidates(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() dto: SmartAssignRequestDto & { requestLocation?: { lat: number; lng: number } }
  ): Promise<SmartAssignResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);

    // For demo, use the location from the DTO
    const requestLocation = dto.requestLocation || { lat: 6.5244, lng: 3.3792 }; // Default to Lagos

    return this.assignmentService.getSmartAssignmentCandidates(company.id, requestLocation, dto);
  }

  // ==================== ASSIGN TO RIDER ====================

  /**
   * Assign a verification request to a rider
   */
  @Post('requests/:requestId/assign')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async assignToRider(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() dto: AssignToRiderDto
  ): Promise<AssignmentResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);

    // Note: In real implementation, fetch request from verification service
    const mockRequest: VerificationRequest = {
      id: requestId,
      title: 'Business Verification',
      verificationType: 'business',
      address: 'Lagos, Nigeria',
      location: { lat: 6.5244, lng: 3.3792 },
      payout: 5000,
      priority: dto.priority || 'normal',
      createdAt: new Date(),
    };

    const assignment = await this.assignmentService.assignToRider(
      company.id,
      mockRequest,
      dto,
      user.uid
    );

    return this.assignmentService.mapToResponse(assignment);
  }

  /**
   * Self-assign a verification request (owner takes it themselves)
   */
  @Post('requests/:requestId/self-assign')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async selfAssign(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() dto?: SelfAssignDto
  ): Promise<AssignmentResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);

    // Note: In real implementation, fetch request from verification service
    const mockRequest: VerificationRequest = {
      id: requestId,
      title: 'Business Verification',
      verificationType: 'business',
      address: 'Lagos, Nigeria',
      location: { lat: 6.5244, lng: 3.3792 },
      payout: 5000,
      priority: 'normal',
      createdAt: new Date(),
    };

    const assignment = await this.assignmentService.selfAssign(
      company.id,
      user.uid,
      mockRequest,
      dto
    );

    return this.assignmentService.mapToResponse(assignment);
  }

  // ==================== ASSIGNMENTS ====================

  /**
   * Get all assignments for the company
   */
  @Get('assignments')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAssignments(
    @CurrentUser() user: AuthUser,
    @Query() query: AssignmentQueryDto
  ): Promise<AssignmentResponseDto[]> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const assignments = await this.assignmentService.getAssignmentsByCompany(company.id, query);
    return assignments.map((a) => this.assignmentService.mapToResponse(a));
  }

  /**
   * Get a specific assignment
   */
  @Get('assignments/:id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<AssignmentResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const assignment = await this.assignmentService.getAssignmentById(id);

    if (assignment.companyId !== company.id) {
      throw new BadRequestException('Assignment does not belong to this company');
    }

    return this.assignmentService.mapToResponse(assignment);
  }

  /**
   * Reassign an assignment to a different rider
   */
  @Post('assignments/:id/reassign')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async reassign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReassignDto
  ): Promise<AssignmentResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const assignment = await this.assignmentService.getAssignmentById(id);

    if (assignment.companyId !== company.id) {
      throw new BadRequestException('Assignment does not belong to this company');
    }

    const updated = await this.assignmentService.reassign(id, dto, user.uid);
    return this.assignmentService.mapToResponse(updated);
  }

  /**
   * Cancel an assignment
   */
  @Post('assignments/:id/cancel')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async cancelAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelAssignmentDto
  ): Promise<AssignmentResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const assignment = await this.assignmentService.getAssignmentById(id);

    if (assignment.companyId !== company.id) {
      throw new BadRequestException('Assignment does not belong to this company');
    }

    const updated = await this.assignmentService.cancelAssignment(id, dto, user.uid);
    return this.assignmentService.mapToResponse(updated);
  }
}

/**
 * Rider-side controller for assignment actions
 */
@Controller('rider')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiderAssignmentController {
  private readonly logger = new Logger(RiderAssignmentController.name);

  constructor(private readonly assignmentService: AssignmentService) {}

  /**
   * Get assignments for the current rider
   */
  @Get('assignments')
  @AuthWithRoles(UserRole.RIDER, UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMyAssignments(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string
  ): Promise<AssignmentResponseDto[]> {
    // Note: In real implementation, we'd get riderId from user
    const riderId = user.uid; // For now, assume rider uid is riderId
    const assignments = await this.assignmentService.getAssignmentsByRider(riderId, {
      status: status as any,
    });
    return assignments.map((a) => this.assignmentService.mapToResponse(a));
  }

  /**
   * Accept an assignment
   */
  @Post('assignments/:id/accept')
  @AuthWithRoles(UserRole.RIDER, UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async acceptAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<AssignmentResponseDto> {
    const riderId = user.uid;
    const assignment = await this.assignmentService.acceptAssignment(id, riderId);
    return this.assignmentService.mapToResponse(assignment);
  }

  /**
   * Start verification (begin the task)
   */
  @Post('assignments/:id/start')
  @AuthWithRoles(UserRole.RIDER, UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async startVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<AssignmentResponseDto> {
    const riderId = user.uid;
    const assignment = await this.assignmentService.startVerification(id, riderId);
    return this.assignmentService.mapToResponse(assignment);
  }

  /**
   * Complete verification
   */
  @Post('assignments/:id/complete')
  @AuthWithRoles(UserRole.RIDER, UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async completeAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<AssignmentResponseDto> {
    const riderId = user.uid;
    const assignment = await this.assignmentService.completeAssignment(id, riderId);
    return this.assignmentService.mapToResponse(assignment);
  }

  /**
   * Decline an assignment
   */
  @Post('assignments/:id/decline')
  @AuthWithRoles(UserRole.RIDER, UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async declineAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeclineAssignmentDto
  ): Promise<AssignmentResponseDto> {
    const riderId = user.uid;
    const assignment = await this.assignmentService.declineAssignment(id, riderId, dto);
    return this.assignmentService.mapToResponse(assignment);
  }
}
