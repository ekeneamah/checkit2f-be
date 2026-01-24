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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { CompanyService, LocationDataService } from '../../application/services';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CompanyStatsResponseDto,
  CompanySettingsDto,
  AddServiceAreaDto,
  UpdateServiceAreaDto,
  RemoveServiceAreaDto,
  BatchUpdateServiceAreasDto,
  AddMultipleServiceAreasDto,
} from '../../application/dtos';

interface AuthUser {
  uid: string;
  email: string;
  role: string;
}

@ApiTags('Company')
@ApiBearerAuth()
@Controller('company')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly locationDataService: LocationDataService,
  ) {}

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
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: CompanyStatsResponseDto })
  async getMyStats(@CurrentUser() user: AuthUser): Promise<CompanyStatsResponseDto> {
    this.logger.log(`Getting stats for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    return this.companyService.getStats(company.id);
  }

  // ==================== SERVICE AREA MANAGEMENT ====================

  /**
   * Get all service areas for current company
   */
  @Get('me/service-areas')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all service areas for the company' })
  @ApiResponse({ status: 200, description: 'Service areas retrieved successfully' })
  async getMyServiceAreas(@CurrentUser() user: AuthUser) {
    this.logger.log(`Getting service areas for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const serviceAreas = await this.companyService.getServiceAreas(company.id);
    return { serviceAreas };
  }

  /**
   * Add a new service area
   */
  @Post('me/service-areas')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a new service area' })
  @ApiResponse({ status: 201, description: 'Service area added successfully', type: CompanyResponseDto })
  @ApiResponse({ status: 409, description: 'Service area already exists' })
  async addServiceArea(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddServiceAreaDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Adding service area for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.addServiceArea(company.id, dto.serviceArea);
    return this.companyService.mapToResponse(updated);
  }

  /**
   * Add multiple service areas at once
   */
  @Post('me/service-areas/batch')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add multiple service areas at once' })
  @ApiResponse({ status: 201, description: 'Service areas added successfully', type: CompanyResponseDto })
  @ApiResponse({ status: 409, description: 'One or more service areas already exist' })
  @ApiResponse({ status: 400, description: 'Invalid input or duplicate cities' })
  async addMultipleServiceAreas(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddMultipleServiceAreasDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Adding ${dto.serviceAreas.length} service areas for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.addMultipleServiceAreas(company.id, dto.serviceAreas);
    return this.companyService.mapToResponse(updated);
  }

  /**
   * Update an existing service area
   */
  @Patch('me/service-areas')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an existing service area' })
  @ApiResponse({ status: 200, description: 'Service area updated successfully', type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Service area not found' })
  async updateServiceArea(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateServiceAreaDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Updating service area for state ${dto.state} for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.updateServiceArea(company.id, dto);
    return this.companyService.mapToResponse(updated);
  }

  /**
   * Remove a service area
   */
  @Delete('me/service-areas')
  @HttpCode(HttpStatus.OK)
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a service area' })
  @ApiResponse({ status: 200, description: 'Service area removed successfully', type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Service area not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove last service area' })
  async removeServiceArea(
    @CurrentUser() user: AuthUser,
    @Body() dto: RemoveServiceAreaDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Removing service area for state ${dto.state} for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.removeServiceArea(company.id, dto.state);
    return this.companyService.mapToResponse(updated);
  }

  /**
   * Batch update service areas (replace all)
   */
  @Put('me/service-areas')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Replace all service areas with new list' })
  @ApiResponse({ status: 200, description: 'Service areas updated successfully', type: CompanyResponseDto })
  @ApiResponse({ status: 400, description: 'Must have at least one service area' })
  async batchUpdateServiceAreas(
    @CurrentUser() user: AuthUser,
    @Body() dto: BatchUpdateServiceAreasDto
  ): Promise<CompanyResponseDto> {
    this.logger.log(`Batch updating service areas for user: ${user.uid}`);
    const company = await this.companyService.getCompanyByOwnerId(user.uid);
    const updated = await this.companyService.batchUpdateServiceAreas(company.id, dto.serviceAreas);
    return this.companyService.mapToResponse(updated);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all companies (admin only)
   */
  @Get()
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully', type: [CompanyResponseDto] })
  async getAllCompanies(): Promise<CompanyResponseDto[]> {
    this.logger.log('Getting all companies');
    const companies = await this.companyService.getAllCompanies({});
    return companies.map(company => this.companyService.mapToResponse(company));
  }

  /**
   * Search companies by service area
   */
  @Get('search')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Search companies by service area (state, city, or LGA)' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully', type: [CompanyResponseDto] })
  async searchCompaniesByLocation(
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('lga') lga?: string,
  ): Promise<CompanyResponseDto[]> {
    this.logger.log(`Searching companies - state: ${state}, city: ${city}, lga: ${lga}`);
    
    const allCompanies = await this.companyService.getAllCompanies({});
    
    const filtered = allCompanies.filter(company => {
      // Include active and pending companies (same as available-locations endpoint)
      if (company.status !== 'active' && company.status !== 'pending') {
        return false;
      }
      
      return company.serviceAreas.some(sa => {
        // Check state match
        const stateMatch = state 
          ? sa.state.toLowerCase() === state.toLowerCase()
          : true;
        
        // Check LGA match (now required field)
        const lgaMatch = lga
          ? sa.lga.toLowerCase() === lga.toLowerCase()
          : true;
        
        // Check city as locality match
        const localityMatch = city
          ? !sa.localities?.length || sa.localities.some(loc => loc.toLowerCase() === city.toLowerCase())
          : true;
        
        return stateMatch && lgaMatch && localityMatch;
      });
    });
    
    return filtered.map(company => this.companyService.mapToResponse(company));
  }

  /**
   * Get available LGAs and localities for a state from companies serving that area
   */
  @Get('available-locations/:state')
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get LGAs and localities with active companies in a state' })
  @ApiResponse({ status: 200, description: 'Available locations retrieved successfully' })
  async getAvailableLocationsForState(
    @Param('state') state: string,
  ): Promise<{ lgas: string[]; localitiesByLga: Record<string, string[]> }> {
    return this.companyService.getAvailableLocationsForState(state);
  }

  /**
   * Check if companies serve a specific location
   * Used during request creation to validate area availability
   */
  @Get('check-availability')
  @AuthWithRoles(UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check if agents are available in a specific location' })
  @ApiResponse({ 
    status: 200, 
    description: 'Availability check completed',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        companiesCount: { type: 'number' },
        message: { type: 'string' },
        companies: { 
          type: 'array',
          description: 'Only returned for admin users'
        }
      }
    }
  })
  async checkLocationAvailability(
    @Query('lga') lga?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('locality') locality?: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<{
    available: boolean;
    companiesCount: number;
    message: string;
    companies?: CompanyResponseDto[];
  }> {
    if (!state) {
      throw new BadRequestException('State is required');
    }
    
    if (!lga && !city) {
      throw new BadRequestException('Either LGA or city is required');
    }

    this.logger.log(`Checking availability for: ${lga || city}, ${state}${locality ? `, ${locality}` : ''}`);
    
    const companies = await this.companyService.findCompaniesByLocation({
      lga,
      city,
      state,
      locality,
    });
    
    const available = companies.length > 0;
    const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
    
    const locationParts = [];
    if (locality) locationParts.push(locality);
    if (lga) locationParts.push(lga);
    else if (city) locationParts.push(city);
    const location = locationParts.join(', ');
    
    if (!available) {
      return {
        available: false,
        companiesCount: 0,
        message: `We don't have agents available in ${location}, ${state} yet. We'll notify you when we expand to your area.`,
      };
    }
    
    const response: {
      available: boolean;
      companiesCount: number;
      message: string;
      companies?: CompanyResponseDto[];
    } = {
      available: true,
      companiesCount: companies.length,
      message: `${companies.length} agent${companies.length > 1 ? 's' : ''} available in ${location}, ${state}`,
    };
    
    // Only include company details for admin users
    if (isAdmin) {
      response.companies = companies.map(company => 
        this.companyService.mapToResponse(company)
      );
    }
    
    return response;
  }

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

  // ==================== LOCATION DATA ====================

  /**
   * Get cities and LGAs for a Nigerian state
   */
  @Get('location/state/:stateName/cities')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get cities and LGAs for a Nigerian state' })
  @ApiResponse({ status: 200, description: 'Cities and LGAs retrieved successfully' })
  async getCitiesAndLGAs(@Param('stateName') stateName: string) {
    return this.locationDataService.getCitiesAndLGAsForState(stateName);
  }

  /**
   * Get only cities for a state (faster)
   */
  @Get('location/state/:stateName/cities-only')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get cities for a Nigerian state' })
  @ApiResponse({ status: 200, description: 'Cities retrieved successfully' })
  async getCities(@Param('stateName') stateName: string) {
    const cities = await this.locationDataService.getCitiesForState(stateName);
    return { state: stateName, cities };
  }

  /**
   * Get all LGAs for a state
   */
  @Get('location/state/:stateName/lgas')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all LGAs for a Nigerian state' })
  @ApiResponse({ status: 200, description: 'LGAs retrieved successfully' })
  async getLGAs(@Param('stateName') stateName: string) {
    const lgas = await this.locationDataService.getLGAsForState(stateName);
    return { state: stateName, lgas };
  }

  /**
   * Get LGAs where companies actually exist (for filtering)
   */
  @Get('location/state/:stateName/lgas/with-companies')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get LGAs that have companies registered' })
  @ApiResponse({ status: 200, description: 'LGAs with companies retrieved successfully' })
  async getLGAsWithCompanies(@Param('stateName') stateName: string) {
    // Get all companies and filter by state in memory
    const allCompanies = await this.companyService.getAllCompanies({});
    
    // Extract unique LGAs from company service areas for this state
    const lgaSet = new Set<string>();
    allCompanies.forEach(company => {
      company.serviceAreas?.forEach(area => {
        if (area.state === stateName && area.lga) {
          lgaSet.add(area.lga);
        }
      });
    });
    
    const lgas = Array.from(lgaSet).sort();
    return { state: stateName, lgas };
  }

  /**
   * Get all localities/areas within a specific LGA
   */
  @Get('location/state/:stateName/lga/:lgaName/localities')
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all localities/areas within an LGA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Localities retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        lga: { type: 'string' },
        localities: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getLocalitiesForLGA(
    @Param('stateName') stateName: string,
    @Param('lgaName') lgaName: string,
  ) {
    const localities = await this.locationDataService.getLocalitiesForLGA(stateName, lgaName);
    return { state: stateName, lga: lgaName, localities };
  }
}
