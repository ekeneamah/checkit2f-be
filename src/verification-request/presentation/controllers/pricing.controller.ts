import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { RequestTypeConfigRepository } from '../../infrastructure/repositories/request-type-config.repository';
import { RequestTypePricingService } from '../../application/services/request-type-pricing.service';
import { LocationPricingService } from '../../application/services/location-pricing.service';
import { RequestTypeSeederService } from '../../application/services/seeders/request-type.seeder';
import { LocationPricingSeederService } from '../../application/services/seeders/location-pricing.seeder';
import { CalculatePriceDto, PriceCalculationResponseDto } from '../dto/calculate-price.dto';
import { QueryRequestTypesDto } from '../dto/query-request-types.dto';
import { IRequestTypeConfig } from '../../domain/interfaces/request-type-config.interface';
import { RecurringScheduleVO } from '../../domain/value-objects/recurring-schedule.value-object';

/**
 * Public Pricing Controller
 * Handles public-facing endpoints for request type retrieval and price calculation
 * All endpoints are public (no authentication required)
 */
@ApiTags('Pricing')
@Controller('pricing')
@Public()
export class PricingController {
  constructor(
    private readonly repository: RequestTypeConfigRepository,
    private readonly pricingService: RequestTypePricingService,
    private readonly locationPricingService: LocationPricingService,
    private readonly requestTypeSeeder: RequestTypeSeederService,
    private readonly locationPricingSeeder: LocationPricingSeederService,
  ) {}

  /**
   * Get all active request types
   * GET /api/pricing/request-types
   */
  @Get('request-types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get all active request types',
    description: 'Retrieve all active verification request types with optional filtering' 
  })
  @ApiResponse({ status: 200, description: 'Request types retrieved successfully' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'pricingType', required: false, description: 'Filter by pricing type' })
  @ApiQuery({ name: 'phase', required: false, description: 'Filter by phase (1 or 2)' })
  @ApiQuery({ name: 'supportsRecurring', required: false, type: Boolean, description: 'Filter by recurring support' })
  @ApiQuery({ name: 'supportsUrgent', required: false, type: Boolean, description: 'Filter by urgent support' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  async getAllActiveRequestTypes(
    @Query() query: QueryRequestTypesDto,
  ): Promise<{
    data: IRequestTypeConfig[];
    total: number;
    limit?: number;
    offset?: number;
  }> {
    let requestTypes: IRequestTypeConfig[];

    // Apply filters
    if (query.category) {
      requestTypes = await this.repository.findByCategory(query.category);
    } else if (query.pricingType) {
      requestTypes = await this.repository.findByPricingType(query.pricingType);
    } else if (query.phase) {
      requestTypes = await this.repository.findActiveByPhase(query.phase as 1 | 2);
    } else {
      requestTypes = await this.repository.findAllActive();
    }

    // Filter by optional flags
    if (query.supportsRecurring !== undefined) {
      requestTypes = requestTypes.filter(
        (rt) => rt.allowsRecurring === query.supportsRecurring,
      );
    }

    if (query.supportsUrgent !== undefined) {
      requestTypes = requestTypes.filter(
        (rt) => rt.allowScheduling === query.supportsUrgent,
      );
    }

    const total = requestTypes.length;

    // Apply pagination
    if (query.limit !== undefined || query.offset !== undefined) {
      const offset = query.offset || 0;
      const limit = query.limit || 10;
      requestTypes = requestTypes.slice(offset, offset + limit);

      return {
        data: requestTypes,
        total,
        limit,
        offset,
      };
    }

    return {
      data: requestTypes,
      total,
    };
  }

  /**
   * Get a single request type by ID
   * GET /api/pricing/request-types/:id
   */
  @Get('request-types/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get request type by ID',
    description: 'Retrieve a specific active request type configuration' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Request type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Request type not found or inactive' })
  async getRequestTypeById(
    @Param('id') id: string,
  ): Promise<IRequestTypeConfig> {
    const requestType = await this.repository.findById(id);

    if (!requestType) {
      throw new NotFoundException(`Request type with ID "${id}" not found`);
    }

    if (!requestType.isActive) {
      throw new NotFoundException(
        `Request type with ID "${id}" is not currently available`,
      );
    }

    return requestType;
  }

  /**
   * Get the default request type
   * GET /api/pricing/request-types/default
   */
  @Get('request-types/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get default request type',
    description: 'Retrieve the default verification request type configuration' 
  })
  @ApiResponse({ status: 200, description: 'Default request type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No default request type configured' })
  async getDefaultRequestType(): Promise<IRequestTypeConfig> {
    const defaultType = await this.repository.findDefault();

    if (!defaultType) {
      throw new NotFoundException('No default request type configured');
    }

    return defaultType;
  }

  /**
   * Get request types by phase
   * GET /api/pricing/request-types/phase/:phase
   */
  @Get('request-types/phase/:phase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get request types by phase',
    description: 'Retrieve all active request types for a specific phase (1 or 2)' 
  })
  @ApiParam({ name: 'phase', description: 'Phase number (1 or 2)', example: 1 })
  @ApiResponse({ status: 200, description: 'Request types retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invalid phase number' })
  async getRequestTypesByPhase(
    @Param('phase') phase: number,
  ): Promise<IRequestTypeConfig[]> {
    if (phase !== 1 && phase !== 2) {
      throw new NotFoundException('Phase must be 1 or 2');
    }

    return this.repository.findActiveByPhase(phase);
  }

  /**
   * Calculate price for a request type with given parameters
   * POST /api/pricing/calculate
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Calculate verification request price',
    description: 'Calculate the price for a verification request based on request type and parameters' 
  })
  @ApiResponse({ status: 200, description: 'Price calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 404, description: 'Request type not found or inactive' })
  async calculatePrice(
    @Body() dto: CalculatePriceDto,
  ): Promise<PriceCalculationResponseDto> {
    // Get request type by name (not ID)
    const requestType = await this.repository.findByName(
      dto.requestTypeId,
    );

    if (!requestType) {
      throw new NotFoundException(`Request type not found: ${dto.requestTypeId}`);
    }

    if (!requestType.isActive) {
      throw new NotFoundException(
        `Request type "${requestType.displayName}" is not currently available`,
      );
    }

    // For standard_verification, use location-based pricing if city/area provided
    let locationBasedPrice = null;
    let pricingSource = 'request_type';
    
    if (requestType.name === 'standard_verification' && dto.city) {
      try {
        const locationPricing = await this.locationPricingService.calculateLocationPrice(dto.city, dto.area);
        
        // Use area price if available, otherwise city price (location service returns prices in Naira)
        if (locationPricing.pricingSource === 'exact_match' && locationPricing.areaCost > 0) {
          locationBasedPrice = locationPricing.areaCost; // Already in Naira
          pricingSource = `location_area_${locationPricing.pricingSource}`;
        } else {
          locationBasedPrice = locationPricing.cityCost; // Already in Naira  
          pricingSource = `location_city_${locationPricing.pricingSource}`;
        }
      } catch (error) {
        // Fallback to request type base price if location pricing fails
        console.warn(`Location pricing failed, using base price: ${error.message}`);
      }
    }

    // Build calculation parameters based on pricing type
    const params: any = {
      locationCount: dto.locationCount,
      radiusKm: dto.radiusKm,
      selectedTier: dto.tier ? `TIER_${dto.tier}` : undefined,
    };

    // Calculate base price using request type pricing
    let baseResult = this.pricingService.calculatePrice(requestType, params);
    let finalResult = baseResult;
    
    // Override with location-based pricing if available
    if (locationBasedPrice !== null && pricingSource.startsWith('location_')) {
      finalResult = {
        ...baseResult,
        totalPrice: locationBasedPrice * 100, // Convert location price to kobo for internal consistency
      };
    }

    // Apply urgent pricing if requested
    if (dto.isUrgent && requestType.allowScheduling) {
      const multiplier = requestType.premiumMultiplier || 1.5;
      finalResult = this.pricingService.calculateUrgentPrice(
        requestType,
        params,
        multiplier,
      );
    }

    // Apply recurring pricing if requested
    if (dto.recurringSchedule && requestType.allowsRecurring) {
      const discountPercentage =
        requestType.recurringOptions?.discountPercentage || 20;

      finalResult = this.pricingService.calculateRecurringPrice(
        requestType,
        dto.recurringSchedule.numberOfOccurrences,
        discountPercentage,
        params,
      );
    }

    // Build response breakdown
    const breakdown: { description: string; amount: number }[] = [];
    
    if (locationBasedPrice !== null && pricingSource.startsWith('location_')) {
      // Use location-based pricing description
      const locationDescription = pricingSource.includes('area') 
        ? `Area-specific pricing (${dto.area}, ${dto.city})`
        : `City pricing (${dto.city})`;
      breakdown.push({
        description: locationDescription,
        amount: finalResult.totalPrice, // Already in kobo
      });
    } else {
      // Use standard request type pricing
      breakdown.push({
        description: `Base price (${requestType.displayName})`,
        amount: baseResult.totalPrice, // Already in kobo
      });
    }

    if (finalResult.premiumMultiplier) {
      const urgentFee = finalResult.totalPrice - baseResult.totalPrice;
      breakdown.push({
        description: `Urgent/Priority Fee (${finalResult.premiumMultiplier}x)`,
        amount: urgentFee / 100,
      });
    }

    if (finalResult.discount && finalResult.discount > 0) {
      breakdown.push({
        description: `Recurring discount (${dto.recurringSchedule?.numberOfOccurrences || 0} occurrences)`,
        amount: -(finalResult.discount / 100),
      });
    }

    return {
      requestTypeId: requestType.id,
      requestTypeName: requestType.displayName,
      basePrice: finalResult.totalPrice / 100, // Convert to naira for display
      urgentFee: finalResult.premiumMultiplier
        ? (finalResult.totalPrice - baseResult.totalPrice) / 100
        : undefined,
      recurringDiscount: finalResult.discount
        ? finalResult.discount / 100
        : undefined,
      totalPrice: finalResult.totalPrice / 100, // Convert to naira for display
      currency: requestType.currency,
      breakdown: breakdown.map(item => ({
        ...item,
        amount: item.amount / 100, // Convert breakdown amounts to naira
      })),
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Seed default data (request types and location pricing)
   * POST /api/v1/pricing/seed-defaults
   */
  @Public()
  @Post('seed-defaults')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Seed default data (Development only)',
    description: 'Initialize the database with default request types and location pricing. Public endpoint for development setup.' 
  })
  @ApiResponse({ status: 201, description: 'Default data seeded successfully' })
  async seedDefaults(): Promise<{ message: string; requestTypes: number; locationPricing: number }> {
    let requestTypesSeeded = 0;
    let locationPricingSeeded = 0;
    
    // Seed request types
    try {
      await this.requestTypeSeeder.seedPhase1();
      requestTypesSeeded = 6;
    } catch (error) {
      if (!error.message?.includes('already exist')) {
        throw error;
      }
    }
    
    // Seed location pricing
    try {
      await this.locationPricingSeeder.seedInitialPricing();
      locationPricingSeeded = 25; // Updated count with Akure and Enugu
    } catch (error) {
      if (!error.message?.includes('already exist')) {
        throw error;
      }
    }
    
    return {
      message: 'Successfully seeded default request types and location pricing',
      requestTypes: requestTypesSeeded,
      locationPricing: locationPricingSeeded,
    };
  }
}
