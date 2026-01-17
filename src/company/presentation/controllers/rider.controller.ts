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
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { CompanyService, RiderService } from '../../application/services';
import {
  CreateRiderDto,
  UpdateRiderDto,
  RiderResponseDto,
  RiderQueryDto,
  RiderDocumentDto,
  RiderScheduleDto,
  CreateTimeOffRequestDto,
  RiderLocationDto,
} from '../../application/dtos';

interface AuthUser {
  uid: string;
  email: string;
  role: string;
}

@Controller('company/riders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiderController {
  private readonly logger = new Logger(RiderController.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly riderService: RiderService
  ) {}

  // ==================== RIDER CRUD ====================

  /**
   * Get all riders for the company
   */
  @Get()
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRiders(
    @CurrentUser() user: AuthUser,
    @Query() query: RiderQueryDto
  ): Promise<RiderResponseDto[]> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const riders = await this.riderService.getRidersByCompany(company.id, query);
    return riders.map((r) => this.riderService.mapToResponse(r));
  }

  /**
   * Get available riders for the company
   */
  @Get('available')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAvailableRiders(@CurrentUser() user: AuthUser): Promise<RiderResponseDto[]> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const riders = await this.riderService.getAvailableRiders(company.id);
    return riders.map((r) => this.riderService.mapToResponse(r));
  }

  /**
   * Get a specific rider by ID
   */
  @Get(':id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRiderById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    // Verify rider belongs to this company
    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    return this.riderService.mapToResponse(rider);
  }

  /**
   * Create a new rider
   */
  @Post()
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createRider(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRiderDto
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    this.logger.log(`Creating rider for company: ${company.id}`);
    const rider = await this.riderService.createRider(company.id, dto);
    return this.riderService.mapToResponse(rider);
  }

  /**
   * Update a rider
   */
  @Patch(':id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateRider(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRiderDto
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.updateRider(id, dto);
    return this.riderService.mapToResponse(updated);
  }

  /**
   * Delete a rider
   */
  @Delete(':id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRider(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    await this.riderService.deleteRider(id);
  }

  // ==================== STATUS & LOCATION ====================

  /**
   * Update rider status
   */
  @Patch(':id/status')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateRiderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: string
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.updateRiderStatus(id, status);
    return this.riderService.mapToResponse(updated);
  }

  /**
   * Update rider online/availability status
   */
  @Patch(':id/online')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateOnlineStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { isOnline: boolean; isAvailable?: boolean }
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.updateOnlineStatus(id, body);
    return this.riderService.mapToResponse(updated);
  }

  // ==================== DOCUMENTS ====================

  /**
   * Add rider document
   */
  @Post(':id/documents')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async addDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RiderDocumentDto
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.addDocument(id, dto);
    return this.riderService.mapToResponse(updated);
  }

  /**
   * Update document status (approve/reject)
   */
  @Patch(':id/documents/:documentType/status')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateDocumentStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('documentType') documentType: string,
    @Body() body: { status: string; notes?: string }
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.updateDocumentStatus(
      id,
      documentType as any,
      body.status as any,
      body.notes
    );
    return this.riderService.mapToResponse(updated);
  }

  // ==================== SCHEDULE & TIME OFF ====================

  /**
   * Update rider's schedule
   */
  @Put(':id/schedule')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateSchedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RiderScheduleDto
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.updateSchedule(id, dto);
    return this.riderService.mapToResponse(updated);
  }

  /**
   * Request time off
   */
  @Post(':id/time-off')
  @AuthWithRoles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async requestTimeOff(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTimeOffRequestDto
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.requestTimeOff(id, dto);
    return this.riderService.mapToResponse(updated);
  }

  // ==================== BIKE ASSIGNMENT ====================

  /**
   * Assign a bike to the rider
   */
  @Post(':id/assign-bike')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async assignBike(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('bikeId') bikeId: string
  ): Promise<RiderResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const rider = await this.riderService.getRiderById(id);

    if (rider.companyId !== company.id) {
      throw new BadRequestException('Rider does not belong to this company');
    }

    const updated = await this.riderService.assignBike(id, bikeId);
    return this.riderService.mapToResponse(updated);
  }
}
