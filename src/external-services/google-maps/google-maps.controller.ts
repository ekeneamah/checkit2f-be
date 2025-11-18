import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GoogleMapsService } from './google-maps.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Auth, AuthWithPermissions } from '../../auth/decorators/auth.decorator';
import { Permission } from '../../auth/interfaces/auth.interface';
import {
  GeocodingRequestDto,
  ReverseGeocodingRequestDto,
  DistanceCalculationRequestDto,
  PlaceSearchRequestDto,
  PlaceDetailsRequestDto,
  BatchGeocodingRequestDto,
  AddressValidationRequestDto,
  GeocodingResponseDto,
  DistanceResponseDto,
  PlaceSearchResponseDto,
} from './dto/google-maps.dto';
import { IServiceResponse, IPlaceDetails, IValidationResult } from './interfaces/google-maps.interface';

/**
 * Google Maps Controller
 * 
 * Provides RESTful endpoints for Google Maps API integration including:
 * - Address geocoding and reverse geocoding
 * - Distance calculations and route planning
 * - Places search and details
 * - Address validation
 * - Batch operations
 * 
 * All endpoints require authentication and appropriate permissions.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@ApiTags('Google Maps')
@Controller('google-maps')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GoogleMapsController {
  private readonly logger = new Logger(GoogleMapsController.name);

  constructor(private readonly googleMapsService: GoogleMapsService) {}

  /**
   * Geocode an address to coordinates
   */
  @Post('geocode')
  @Auth()
  @ApiOperation({
    summary: 'Geocode address to coordinates',
    description: 'Convert a human-readable address into geographic coordinates (latitude and longitude)',
  })
  @ApiBody({ type: GeocodingRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address successfully geocoded',
    type: GeocodingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid address or geocoding failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async geocodeAddress(
    @Body() geocodingRequest: GeocodingRequestDto,
  ): Promise<IServiceResponse<GeocodingResponseDto>> {
    this.logger.log(`Geocoding request for address: ${geocodingRequest.address}`);
    
    const result = await this.googleMapsService.geocodeAddress(geocodingRequest);
    
    if (result.success) {
      this.logger.log(`✅ Geocoding successful for: ${geocodingRequest.address}`);
    } else {
      this.logger.error(`❌ Geocoding failed for: ${geocodingRequest.address}`);
    }
    
    return result;
  }

  /**
   * Reverse geocode coordinates to address
   */
  @Post('reverse-geocode')
  @Auth()
  @ApiOperation({
    summary: 'Reverse geocode coordinates to address',
    description: 'Convert geographic coordinates (latitude and longitude) into a human-readable address',
  })
  @ApiBody({ type: ReverseGeocodingRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coordinates successfully reverse geocoded',
    type: GeocodingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid coordinates or reverse geocoding failed',
  })
  async reverseGeocode(
    @Body() reverseGeocodingRequest: ReverseGeocodingRequestDto,
  ): Promise<IServiceResponse<GeocodingResponseDto>> {
    this.logger.log(`Reverse geocoding request for coordinates: ${reverseGeocodingRequest.coordinates.latitude}, ${reverseGeocodingRequest.coordinates.longitude}`);
    
    const result = await this.googleMapsService.reverseGeocode(reverseGeocodingRequest);
    
    if (result.success) {
      this.logger.log(`✅ Reverse geocoding successful`);
    } else {
      this.logger.error(`❌ Reverse geocoding failed`);
    }
    
    return result;
  }

  /**
   * Calculate distance between two points
   */
  @Post('distance')
  @Auth()
  @ApiOperation({
    summary: 'Calculate distance between two points',
    description: 'Calculate the distance and travel time between two geographic coordinates',
  })
  @ApiBody({ type: DistanceCalculationRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Distance successfully calculated',
    type: DistanceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid coordinates or distance calculation failed',
  })
  async calculateDistance(
    @Body() distanceRequest: DistanceCalculationRequestDto,
  ): Promise<IServiceResponse<DistanceResponseDto>> {
    this.logger.log(`Distance calculation request from [${distanceRequest.origin.latitude}, ${distanceRequest.origin.longitude}] to [${distanceRequest.destination.latitude}, ${distanceRequest.destination.longitude}]`);
    
    const result = await this.googleMapsService.calculateDistance(distanceRequest);
    
    if (result.success) {
      this.logger.log(`✅ Distance calculation successful`);
    } else {
      this.logger.error(`❌ Distance calculation failed`);
    }
    
    return result;
  }

  /**
   * Search for places near a location
   */
  @Post('places/search')
  @Auth()
  @ApiOperation({
    summary: 'Search for places near a location',
    description: 'Find places of interest near specified coordinates based on type, keyword, or other criteria',
  })
  @ApiBody({ type: PlaceSearchRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Places search completed successfully',
    type: [PlaceSearchResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async searchPlaces(
    @Body() placeSearchRequest: PlaceSearchRequestDto,
  ): Promise<IServiceResponse<PlaceSearchResponseDto[]>> {
    this.logger.log(`Places search request near [${placeSearchRequest.location.latitude}, ${placeSearchRequest.location.longitude}]`);
    
    const result = await this.googleMapsService.searchPlaces(placeSearchRequest);
    
    if (result.success) {
      this.logger.log(`✅ Places search successful, found ${result.data?.length || 0} places`);
    } else {
      this.logger.error(`❌ Places search failed`);
    }
    
    return result;
  }

  /**
   * Get detailed information about a place
   */
  @Get('places/:placeId')
  @Auth()
  @ApiOperation({
    summary: 'Get detailed information about a place',
    description: 'Retrieve comprehensive details about a specific place using its Google Places ID',
  })
  @ApiParam({
    name: 'placeId',
    description: 'Google Places place ID',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  })
  @ApiQuery({
    name: 'language',
    description: 'Language for the response',
    required: false,
    example: 'en',
  })
  @ApiQuery({
    name: 'fields',
    description: 'Specific fields to return (comma-separated)',
    required: false,
    example: 'name,rating,formatted_phone_number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Place details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid place ID or place not found',
  })
  async getPlaceDetails(
    @Param('placeId') placeId: string,
    @Query('language') language?: string,
    @Query('fields') fields?: string,
  ): Promise<IServiceResponse<IPlaceDetails>> {
    this.logger.log(`Place details request for place ID: ${placeId}`);
    
    const placeDetailsRequest: PlaceDetailsRequestDto = {
      place_id: placeId,
      language,
      fields: fields ? fields.split(',') : undefined,
    };
    
    const result = await this.googleMapsService.getPlaceDetails(placeDetailsRequest);
    
    if (result.success) {
      this.logger.log(`✅ Place details retrieved successfully for: ${placeId}`);
    } else {
      this.logger.error(`❌ Place details failed for: ${placeId}`);
    }
    
    return result;
  }

  /**
   * Validate an address
   */
  @Post('validate-address')
  @Auth()
  @ApiOperation({
    summary: 'Validate an address',
    description: 'Validate the format and existence of an address using Google Maps geocoding',
  })
  @ApiBody({ type: AddressValidationRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address validation completed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid address format',
  })
  async validateAddress(
    @Body() validationRequest: AddressValidationRequestDto,
  ): Promise<IServiceResponse<IValidationResult>> {
    this.logger.log(`Address validation request for: ${validationRequest.address}`);
    
    const result = await this.googleMapsService.validateAddress(validationRequest);
    
    if (result.success) {
      this.logger.log(`✅ Address validation completed for: ${validationRequest.address}`);
    } else {
      this.logger.error(`❌ Address validation failed for: ${validationRequest.address}`);
    }
    
    return result;
  }

  /**
   * Batch geocode multiple addresses
   */
  @Post('batch-geocode')
  @AuthWithPermissions(Permission.MANAGE_SYSTEM_SETTINGS) // Restrict batch operations to admins
  @ApiOperation({
    summary: 'Batch geocode multiple addresses',
    description: 'Geocode multiple addresses in a single request. Requires admin permissions due to resource intensity.',
  })
  @ApiBody({ type: BatchGeocodingRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch geocoding completed',
    type: [GeocodingResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions for batch operations',
  })
  async batchGeocode(
    @Body() batchRequest: BatchGeocodingRequestDto,
  ): Promise<IServiceResponse<GeocodingResponseDto[]>> {
    this.logger.log(`Batch geocoding request for ${batchRequest.addresses.length} addresses`);
    
    const result = await this.googleMapsService.batchGeocode(batchRequest);
    
    if (result.success) {
      this.logger.log(`✅ Batch geocoding completed, ${result.data?.length || 0} successful`);
    } else {
      this.logger.error(`❌ Batch geocoding failed`);
    }
    
    return result;
  }

  /**
   * Health check for Google Maps service
   */
  @Get('health')
  @Auth()
  @ApiOperation({
    summary: 'Google Maps service health check',
    description: 'Check the health and connectivity of the Google Maps API service',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service is unhealthy',
  })
  async healthCheck(): Promise<IServiceResponse<{ status: string; apiKey: string }>> {
    this.logger.log('Google Maps health check requested');
    
    const result = await this.googleMapsService.healthCheck();
    
    if (result.success) {
      this.logger.log('✅ Google Maps service is healthy');
    } else {
      this.logger.error('❌ Google Maps service is unhealthy');
    }
    
    return result;
  }

  /**
   * Get service statistics (for monitoring)
   */
  @Get('stats')
  @AuthWithPermissions(Permission.VIEW_ANALYTICS)
  @ApiOperation({
    summary: 'Get Google Maps service statistics',
    description: 'Retrieve usage statistics and performance metrics for the Google Maps service',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions to view statistics',
  })
  async getServiceStats(): Promise<{
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    lastHealthCheck: Date;
  }> {
    this.logger.log('Service statistics requested');
    
    // In a real implementation, you would track these metrics
    // For now, return mock data
    return {
      totalRequests: 0,
      successRate: 100,
      averageResponseTime: 250,
      lastHealthCheck: new Date(),
    };
  }
}