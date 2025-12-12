import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { LocationPricingService } from '../../application/services/location-pricing.service';
import {
  CreateLocationPricingDto,
  UpdateLocationPricingDto,
  LocationPricingResponseDto,
  PaginatedLocationPricingResponseDto,
} from '../dto/location-pricing.dto';

/**
 * Location Pricing Controller
 * Handles CRUD operations for location-based pricing configurations
 */
@ApiTags('Location Pricing')
@Controller('location-pricing')
export class LocationPricingController {
  private readonly logger = new Logger(LocationPricingController.name);

  constructor(private readonly locationPricingService: LocationPricingService) {}

  /**
   * Create new location pricing configuration
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create location pricing',
    description: 'Create a new pricing configuration for a specific city and area combination',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pricing configuration created successfully',
    type: LocationPricingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid pricing data or duplicate configuration' })
  async createPricing(@Body() createDto: CreateLocationPricingDto): Promise<LocationPricingResponseDto> {
    this.logger.log(`Creating pricing for ${createDto.city}${createDto.area ? ` - ${createDto.area}` : ''}`);
    
    const pricing = await this.locationPricingService.createLocationPricing({
      ...createDto,
      effectiveFrom: createDto.effectiveFrom ? new Date(createDto.effectiveFrom) : undefined,
      effectiveTo: createDto.effectiveTo ? new Date(createDto.effectiveTo) : undefined,
    });

    return pricing as LocationPricingResponseDto;
  }

  /**
   * Get all location pricing configurations
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all location pricing',
    description: 'Retrieve all pricing configurations with pagination',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pricing configurations retrieved successfully',
    type: PaginatedLocationPricingResponseDto,
  })
  async getAllPricing(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ): Promise<PaginatedLocationPricingResponseDto> {
    const result = await this.locationPricingService.getAllLocationPricing(page, limit);
    return result as PaginatedLocationPricingResponseDto;
  }

  /**
   * Get location pricing by ID
   */
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get location pricing by ID',
    description: 'Retrieve a specific pricing configuration by its ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pricing configuration found',
    type: LocationPricingResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Pricing configuration not found' })
  async getPricingById(@Param('id') id: string): Promise<LocationPricingResponseDto> {
    const pricing = await this.locationPricingService.getLocationPricingById(id);
    return pricing as LocationPricingResponseDto;
  }

  /**
   * Update location pricing configuration
   */
  @Public()
  @Put(':id')
  @ApiOperation({
    summary: 'Update location pricing',
    description: 'Update an existing pricing configuration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pricing configuration updated successfully',
    type: LocationPricingResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Pricing configuration not found' })
  @ApiBadRequestResponse({ description: 'Invalid pricing data' })
  async updatePricing(
    @Param('id') id: string,
    @Body() updateDto: UpdateLocationPricingDto,
  ): Promise<LocationPricingResponseDto> {
    this.logger.log(`Updating pricing configuration ${id}`);
    
    const pricing = await this.locationPricingService.updateLocationPricing(id, {
      ...updateDto,
      effectiveFrom: updateDto.effectiveFrom ? new Date(updateDto.effectiveFrom) : undefined,
      effectiveTo: updateDto.effectiveTo ? new Date(updateDto.effectiveTo) : undefined,
    });

    return pricing as LocationPricingResponseDto;
  }

  /**
   * Delete location pricing configuration
   */
  @Public()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete location pricing',
    description: 'Delete a pricing configuration',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Pricing configuration deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Pricing configuration not found' })
  async deletePricing(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting pricing configuration ${id}`);
    await this.locationPricingService.deleteLocationPricing(id);
  }

  /**
   * Get all areas with pricing for a specific city
   */
  @Public()
  @Get('city/:city/areas')
  @ApiOperation({
    summary: 'Get city areas with pricing',
    description: 'Get all areas with pricing configurations for a specific city',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Areas with pricing retrieved successfully',
    type: [LocationPricingResponseDto],
  })
  async getCityAreas(@Param('city') city: string): Promise<LocationPricingResponseDto[]> {
    const areas = await this.locationPricingService.getCityAreasWithPricing(city);
    return areas as LocationPricingResponseDto[];
  }

  /**
   * Search location pricing configurations
   */
  @Public()
  @Get('search/:query')
  @ApiOperation({
    summary: 'Search location pricing',
    description: 'Search pricing configurations by city or area name',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [LocationPricingResponseDto],
  })
  async searchPricing(
    @Param('query') query: string,
    @Query('status') status?: string,
  ): Promise<LocationPricingResponseDto[]> {
    const results = await this.locationPricingService.searchLocationPricing(query, status);
    return results as LocationPricingResponseDto[];
  }

  /**
   * Calculate price for a location
   */
  @Public()
  @Get('calculate/:city')
  @ApiOperation({
    summary: 'Calculate location price',
    description: 'Calculate the price for a specific city and optional area',
  })
  @ApiQuery({ name: 'area', required: false, description: 'Area/neighborhood name' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price calculated successfully',
  })
  async calculatePrice(
    @Param('city') city: string,
    @Query('area') area?: string,
  ) {
    return await this.locationPricingService.calculateLocationPrice(city, area);
  }
}