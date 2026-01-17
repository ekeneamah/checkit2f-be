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
import { CompanyService, FleetService } from '../../application/services';
import {
  CreateBikeDto,
  UpdateBikeDto,
  BikeResponseDto,
  BikeQueryDto,
  CreateMaintenanceRecordDto,
  VehicleInsuranceDto,
} from '../../application/dtos';

interface AuthUser {
  uid: string;
  email: string;
  role: string;
}

@Controller('company/fleet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetController {
  private readonly logger = new Logger(FleetController.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly fleetService: FleetService
  ) {}

  // ==================== BIKE CRUD ====================

  /**
   * Get all bikes for the company
   */
  @Get()
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getBikes(
    @CurrentUser() user: AuthUser,
    @Query() query: BikeQueryDto
  ): Promise<BikeResponseDto[]> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bikes = await this.fleetService.getBikesByCompany(company.id, query);
    return bikes.map((b) => this.fleetService.mapToResponse(b));
  }

  /**
   * Get available bikes for the company
   */
  @Get('available')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAvailableBikes(@CurrentUser() user: AuthUser): Promise<BikeResponseDto[]> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bikes = await this.fleetService.getAvailableBikes(company.id);
    return bikes.map((b) => this.fleetService.mapToResponse(b));
  }

  /**
   * Get fleet summary/stats
   */
  @Get('summary')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getFleetSummary(@CurrentUser() user: AuthUser) {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    return this.fleetService.getFleetSummary(company.id);
  }

  /**
   * Get a specific bike by ID
   */
  @Get(':id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getBikeById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    return this.fleetService.mapToResponse(bike);
  }

  /**
   * Create a new bike
   */
  @Post()
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createBike(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBikeDto
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    this.logger.log(`Creating bike for company: ${company.id}`);
    const bike = await this.fleetService.createBike(company.id, dto);
    return this.fleetService.mapToResponse(bike);
  }

  /**
   * Update a bike
   */
  @Patch(':id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateBike(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBikeDto
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.updateBike(id, dto);
    return this.fleetService.mapToResponse(updated);
  }

  /**
   * Delete a bike
   */
  @Delete(':id')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBike(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    await this.fleetService.deleteBike(id);
  }

  // ==================== STATUS & MILEAGE ====================

  /**
   * Update bike status
   */
  @Patch(':id/status')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateBikeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: string
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.updateBikeStatus(id, status);
    return this.fleetService.mapToResponse(updated);
  }

  /**
   * Update bike mileage
   */
  @Put(':id/mileage')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateMileage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('mileage') mileage: number
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.updateMileage(id, mileage);
    return this.fleetService.mapToResponse(updated);
  }

  // ==================== MAINTENANCE ====================

  /**
   * Add maintenance record
   */
  @Post(':id/maintenance')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async addMaintenanceRecord(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceRecordDto
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.addMaintenanceRecord(id, dto);
    return this.fleetService.mapToResponse(updated);
  }

  /**
   * Get maintenance history
   */
  @Get(':id/maintenance')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getMaintenanceHistory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ) {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    return bike.maintenanceHistory || [];
  }

  // ==================== INSURANCE ====================

  /**
   * Update insurance details
   */
  @Put(':id/insurance')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateInsurance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VehicleInsuranceDto
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.updateInsurance(id, dto);
    return this.fleetService.mapToResponse(updated);
  }

  // ==================== RIDER ASSIGNMENT ====================

  /**
   * Assign bike to a rider
   */
  @Post(':id/assign')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async assignToRider(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('riderId') riderId: string
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.assignToRider(id, riderId, user.uid);
    return this.fleetService.mapToResponse(updated);
  }

  /**
   * Unassign bike from rider
   */
  @Post(':id/unassign')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async unassignBike(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ): Promise<BikeResponseDto> {
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const bike = await this.fleetService.getBikeById(id);

    if (bike.companyId !== company.id) {
      throw new BadRequestException('Bike does not belong to this company');
    }

    const updated = await this.fleetService.unassignBike(id, user.uid);
    return this.fleetService.mapToResponse(updated);
  }
}
