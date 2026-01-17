import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { CompanyService } from '../../application/services';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CompanyStatsResponseDto,
  CompanySettingsDto,
} from '../../application/dtos';

interface AuthUser {
  uid: string;
  email: string;
  role: string;
}

@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  // ==================== COMPANY PROFILE ====================

  /**
   * Get current user's company profile
   */
  @Get('me')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMyCompany(@CurrentUser() user: AuthUser): Promise<CompanyResponseDto> {
    this.logger.log(`Getting company profile for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    return this.companyService.mapToResponse(company);
  }

  /**
   * Create a new company
   */
  @Post()
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createCompany(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCompanyDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Creating company for user: ${user.uid}`);
    const company = await this.companyService.createCompany({ ...dto, ownerId: user.uid });
    return this.companyService.mapToResponse(company);
  }

  /**
   * Update company profile
   */
  @Patch('me')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateMyCompany(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCompanyDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Updating company for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.updateCompany(company.id, dto);
    return this.companyService.mapToResponse(updated);
  }

  /**
   * Update company settings
   */
  @Patch('me/settings')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompanySettingsDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Updating settings for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.updateSettings(company.id, dto);
    return this.companyService.mapToResponse(updated);
  }

  // ==================== COMPANY STATS ====================

  /**
   * Get company statistics
   */
  @Get('me/stats')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMyStats(@CurrentUser() user: AuthUser): Promise<CompanyStatsResponseDto> {
    this.logger.log(`Getting stats for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    return this.companyService.getStats(company.id);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get company by ID (admin only)
   */
  @Get(':id')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getCompanyById(@Param('id') id: string): Promise<CompanyResponseDto> {
    const company = await this.companyService.getCompanyById(id);
    return this.companyService.mapToResponse(company);
  }

  /**
   * Update company status (admin only)
   */
  @Patch(':id/status')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateCompanyStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ): Promise<CompanyResponseDto> {
    const updated = await this.companyService.updateCompanyStatus(id, status);
    return this.companyService.mapToResponse(updated);
  }
}
