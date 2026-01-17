import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { OnboardingService } from '../../application/services/onboarding.service';
import { CompanyService } from '../../application/services/company.service';
import { CreateCompanyDto, CompanyResponseDto } from '../../application/dtos';

interface AuthenticatedRequest {
  user: {
    uid: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Admin Company Controller
 * 
 * Endpoints for Zigo admins to manage verification companies:
 * - Create new companies
 * - View all companies
 * - Update company status
 * - Resend invites
 */
@ApiTags('Admin - Companies')
@ApiBearerAuth()
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Create a new verification company
   * Creates Firebase Auth user and sends invite email
   */
  @Post()
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new verification company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Company or email already exists' })
  async createCompany(
    @Body() dto: CreateCompanyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    company: CompanyResponseDto;
    inviteSent: boolean;
    message: string;
  }> {
    const result = await this.onboardingService.createCompanyByAdmin(dto, req.user.uid);
    
    return {
      company: this.companyService.mapToResponse(result.company),
      inviteSent: result.inviteSent,
      message: result.inviteSent 
        ? `Company created successfully. Invite email sent to ${dto.ownerEmail}`
        : `Company created successfully. Please share credentials manually: Password: ${result.temporaryPassword}`,
    };
  }

  /**
   * Get all companies with optional filters
   */
  @Get()
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all verification companies' })
  @ApiResponse({ status: 200, description: 'List of companies' })
  async getAllCompanies(
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    companies: CompanyResponseDto[];
    total: number;
  }> {
    // For now, get all companies - pagination can be enhanced later
    const companies = await this.companyService.getAllCompanies({
      status,
      city,
      search,
      limit: limit || 50,
      offset: offset || 0,
    });

    return {
      companies: companies.map(c => this.companyService.mapToResponse(c)),
      total: companies.length,
    };
  }

  /**
   * Get company by ID
   */
  @Get(':id')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Company details' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyById(@Param('id') id: string): Promise<CompanyResponseDto> {
    const company = await this.companyService.getCompanyById(id);
    return this.companyService.mapToResponse(company);
  }

  /**
   * Update company status (activate, suspend, deactivate)
   */
  @Patch(':id/status')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update company status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateCompanyStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended' | 'inactive' },
  ): Promise<CompanyResponseDto> {
    const company = await this.companyService.updateCompanyStatus(id, body.status);
    return this.companyService.mapToResponse(company);
  }

  /**
   * Resend invite email to company owner
   */
  @Post(':id/resend-invite')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend invite email to company' })
  @ApiResponse({ status: 200, description: 'Invite resent' })
  async resendInvite(@Param('id') id: string): Promise<{
    inviteSent: boolean;
    message: string;
    temporaryPassword?: string;
  }> {
    const result = await this.onboardingService.resendCompanyInvite(id);
    
    return {
      inviteSent: result.inviteSent,
      message: result.inviteSent 
        ? 'Invite email resent successfully'
        : `Email failed. Share credentials manually.`,
      temporaryPassword: result.inviteSent ? undefined : result.temporaryPassword,
    };
  }

  /**
   * Get company statistics summary for admin dashboard
   */
  @Get('stats/summary')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get companies statistics summary' })
  @ApiResponse({ status: 200, description: 'Statistics summary' })
  async getStatsSummary(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    pendingCompanies: number;
    suspendedCompanies: number;
    totalRiders: number;
    activeRiders: number;
  }> {
    return this.companyService.getAdminStatsSummary();
  }
}
