import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Status } from '@googlemaps/google-maps-services-js';
import {
  ICoordinates,
  IGeocodingResult,
  IDistanceResult,
  IPlaceSearchResult,
  IPlaceDetails,
  IServiceResponse,
  IGoogleMapsConfig,
  TravelMode,
  UnitSystem,
  IDistanceMatrixOptions,
  IPlaceSearchOptions,
  IReverseGeocodingOptions,
  IValidationResult,
} from './interfaces/google-maps.interface';
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

/**
 * Google Maps Service
 * 
 * Provides comprehensive Google Maps API integration including:
 * - Geocoding and reverse geocoding
 * - Distance calculations and route planning
 * - Places search and details
 * - Address validation
 * - Batch operations
 * 
 * Implements SOLID principles with proper error handling,
 * retry logic, and comprehensive logging.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly client: Client;
  private readonly config: IGoogleMapsConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfiguration();
    this.client = new Client({});
    
    this.logger.log('🗺️ Google Maps Service initialized');
    this.validateConfiguration();
  }

  /**
   * Load configuration from environment variables
   * @private
   */
  private loadConfiguration(): IGoogleMapsConfig {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is required but not configured');
    }

    return {
      apiKey,
      defaultLanguage: this.configService.get<string>('GOOGLE_MAPS_DEFAULT_LANGUAGE', 'en'),
      defaultRegion: this.configService.get<string>('GOOGLE_MAPS_DEFAULT_REGION', 'US'),
      timeout: this.configService.get<number>('GOOGLE_MAPS_TIMEOUT', 5000),
      retryConfig: {
        retries: this.configService.get<number>('GOOGLE_MAPS_RETRY_COUNT', 3),
        backoffDelay: this.configService.get<number>('GOOGLE_MAPS_RETRY_DELAY', 1000),
      },
    };
  }

  /**
   * Validate service configuration
   * @private
   */
  private validateConfiguration(): void {
    try {
      if (!this.config.apiKey || this.config.apiKey.length < 10) {
        throw new Error('Invalid Google Maps API key');
      }
      
      this.logger.log('✅ Google Maps configuration validated');
    } catch (error) {
      this.logger.error(`❌ Configuration validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Geocode an address to coordinates
   * 
   * @param request - Geocoding request parameters
   * @returns Promise<IServiceResponse<GeocodingResponseDto>>
   */
  async geocodeAddress(request: GeocodingRequestDto): Promise<IServiceResponse<GeocodingResponseDto>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`🔍 Geocoding address: ${request.address} [${requestId}]`);

      const response = await this.executeWithRetry(async () => {
        return await this.client.geocode({
          params: {
            address: request.address,
            key: this.config.apiKey,
            language: request.language || this.config.defaultLanguage,
            region: request.region || this.config.defaultRegion,
          },
        });
      });

      if (response.data.status !== Status.OK) {
        throw new BadRequestException(`Geocoding failed: ${response.data.status}`);
      }

      if (response.data.results.length === 0) {
        throw new BadRequestException('No results found for the provided address');
      }

      const result = response.data.results[0];
      const geocodingResult: GeocodingResponseDto = this.mapGeocodingResult(result);

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Geocoding successful for: ${request.address} [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: geocodingResult,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Geocoding failed for: ${request.address} [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'GEOCODING_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Reverse geocode coordinates to address
   * 
   * @param request - Reverse geocoding request parameters
   * @returns Promise<IServiceResponse<GeocodingResponseDto>>
   */
  async reverseGeocode(request: ReverseGeocodingRequestDto): Promise<IServiceResponse<GeocodingResponseDto>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`🔄 Reverse geocoding: ${request.coordinates.latitude}, ${request.coordinates.longitude} [${requestId}]`);

      const response = await this.executeWithRetry(async () => {
        return await this.client.reverseGeocode({
          params: {
            latlng: `${request.coordinates.latitude},${request.coordinates.longitude}`,
            key: this.config.apiKey,
            result_type: request.result_type as any,
            location_type: request.location_type as any,
          },
        });
      });

      if (response.data.status !== Status.OK) {
        throw new BadRequestException(`Reverse geocoding failed: ${response.data.status}`);
      }

      if (response.data.results.length === 0) {
        throw new BadRequestException('No results found for the provided coordinates');
      }

      const result = response.data.results[0];
      const geocodingResult: GeocodingResponseDto = this.mapGeocodingResult(result);

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Reverse geocoding successful [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: geocodingResult,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Reverse geocoding failed [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'REVERSE_GEOCODING_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Calculate distance between two points
   * 
   * @param request - Distance calculation request parameters
   * @returns Promise<IServiceResponse<DistanceResponseDto>>
   */
  async calculateDistance(request: DistanceCalculationRequestDto): Promise<IServiceResponse<DistanceResponseDto>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`📏 Calculating distance from ${request.origin.latitude},${request.origin.longitude} to ${request.destination.latitude},${request.destination.longitude} [${requestId}]`);

      const response = await this.executeWithRetry(async () => {
        return await this.client.distancematrix({
          params: {
            origins: [`${request.origin.latitude},${request.origin.longitude}`],
            destinations: [`${request.destination.latitude},${request.destination.longitude}`],
            key: this.config.apiKey,
            mode: (request.mode || TravelMode.DRIVING) as any,
            units: (request.units || UnitSystem.METRIC) as any,
            avoid: request.avoid as any,
          },
        });
      });

      if (response.data.status !== Status.OK) {
        throw new BadRequestException(`Distance calculation failed: ${response.data.status}`);
      }

      const element = response.data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        throw new BadRequestException('No route found between the specified points');
      }

      const distanceResult: DistanceResponseDto = {
        distance: element.distance,
        duration: element.duration,
        status: element.status,
      };

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Distance calculation successful [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: distanceResult,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Distance calculation failed [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'DISTANCE_CALCULATION_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Search for places near a location
   * 
   * @param request - Place search request parameters
   * @returns Promise<IServiceResponse<PlaceSearchResponseDto[]>>
   */
  async searchPlaces(request: PlaceSearchRequestDto): Promise<IServiceResponse<PlaceSearchResponseDto[]>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`🔍 Searching places near ${request.location.latitude},${request.location.longitude} [${requestId}]`);

      const response = await this.executeWithRetry(async () => {
        return await this.client.placesNearby({
          params: {
            location: `${request.location.latitude},${request.location.longitude}`,
            radius: request.radius || 5000,
            key: this.config.apiKey,
            type: request.type,
            keyword: request.keyword,
            minprice: request.min_price,
            maxprice: request.max_price,
            opennow: request.open_now,
          },
        });
      });

      if (response.data.status !== Status.OK) {
        throw new BadRequestException(`Places search failed: ${response.data.status}`);
      }

      const places: PlaceSearchResponseDto[] = response.data.results.map(place => ({
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        rating: place.rating,
        price_level: place.price_level,
        types: place.types,
        business_status: place.business_status,
        open_now: place.opening_hours?.open_now,
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Places search successful, found ${places.length} places [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: places,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Places search failed [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'PLACES_SEARCH_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Get detailed information about a place
   * 
   * @param request - Place details request parameters
   * @returns Promise<IServiceResponse<IPlaceDetails>>
   */
  async getPlaceDetails(request: PlaceDetailsRequestDto): Promise<IServiceResponse<IPlaceDetails>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`📍 Getting place details for: ${request.place_id} [${requestId}]`);

      const response = await this.executeWithRetry(async () => {
        return await this.client.placeDetails({
          params: {
            place_id: request.place_id,
            key: this.config.apiKey,
            language: (request.language || this.config.defaultLanguage) as any,
            fields: request.fields,
          },
        });
      });

      if (response.data.status !== Status.OK) {
        throw new BadRequestException(`Place details failed: ${response.data.status}`);
      }

      const place = response.data.result;
      const placeDetails: IPlaceDetails = {
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        international_phone_number: place.international_phone_number,
        website: place.website,
        rating: place.rating,
        reviews: place.reviews as any,
        opening_hours: place.opening_hours as any,
        geometry: {
          location: {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          },
        },
        types: place.types,
      };

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Place details retrieved successfully [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: placeDetails,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Place details failed [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'PLACE_DETAILS_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Validate an address
   * 
   * @param request - Address validation request
   * @returns Promise<IServiceResponse<IValidationResult>>
   */
  async validateAddress(request: AddressValidationRequestDto): Promise<IServiceResponse<IValidationResult>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`✅ Validating address: ${request.address} [${requestId}]`);

      // Use geocoding to validate the address
      const geocodingResult = await this.geocodeAddress({
        address: request.address,
        region: request.country,
      });

      const validationResult: IValidationResult = {
        isValid: geocodingResult.success,
        errors: geocodingResult.success ? [] : ['Address could not be geocoded'],
        warnings: [],
      };

      // Additional validation logic can be added here
      if (geocodingResult.success && geocodingResult.data) {
        // Check if the result is precise enough
        if (geocodingResult.data.accuracy === 'APPROXIMATE') {
          validationResult.warnings.push('Address location is approximate');
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Address validation completed [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: validationResult,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Address validation failed [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'ADDRESS_VALIDATION_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Batch geocode multiple addresses
   * 
   * @param request - Batch geocoding request
   * @returns Promise<IServiceResponse<GeocodingResponseDto[]>>
   */
  async batchGeocode(request: BatchGeocodingRequestDto): Promise<IServiceResponse<GeocodingResponseDto[]>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`📦 Batch geocoding ${request.addresses.length} addresses [${requestId}]`);

      const results: GeocodingResponseDto[] = [];
      const maxConcurrent = 5; // Limit concurrent requests to avoid rate limiting

      for (let i = 0; i < request.addresses.length; i += maxConcurrent) {
        const batch = request.addresses.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(address =>
          this.geocodeAddress({
            address,
            language: request.language,
            region: request.region,
          })
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            results.push(result.value.data);
          } else {
            this.logger.warn(`Batch geocoding failed for address: ${batch[index]}`);
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + maxConcurrent < request.addresses.length) {
          await this.delay(100);
        }
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Batch geocoding completed, ${results.length}/${request.addresses.length} successful [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: results,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Batch geocoding failed [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'BATCH_GEOCODING_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
        },
      };
    }
  }

  /**
   * Execute a function with retry logic
   * @private
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.retryConfig?.retries || 3;
    const baseDelay = this.config.retryConfig?.backoffDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
        await this.delay(delay);
      }
    }

    throw new ServiceUnavailableException('Maximum retry attempts exceeded');
  }

  /**
   * Map Google Maps geocoding result to our format
   * @private
   */
  private mapGeocodingResult(result: any): GeocodingResponseDto {
    const addressComponents = result.address_components || [];
    
    const getComponent = (type: string): string | undefined => {
      const component = addressComponents.find(comp => comp.types.includes(type));
      return component?.long_name;
    };

    return {
      coordinates: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      address: {
        street_number: getComponent('street_number'),
        route: getComponent('route'),
        locality: getComponent('locality'),
        administrative_area_level_1: getComponent('administrative_area_level_1'),
        administrative_area_level_2: getComponent('administrative_area_level_2'),
        country: getComponent('country'),
        postal_code: getComponent('postal_code'),
        formatted_address: result.formatted_address,
        place_id: result.place_id,
      },
      place_id: result.place_id,
      accuracy: result.geometry.location_type,
      types: result.types,
    };
  }

  /**
   * Generate a unique request ID for tracking
   * @private
   */
  private generateRequestId(): string {
    return `gmaps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility function
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for the Google Maps service
   */
  async healthCheck(): Promise<IServiceResponse<{ status: string; apiKey: string }>> {
    try {
      // Simple geocoding test to verify API key works
      const response = await this.client.geocode({
        params: {
          address: 'Google Headquarters',
          key: this.config.apiKey,
        },
      });

      const isHealthy = response.data.status === Status.OK;
      
      return {
        success: isHealthy,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          apiKey: `${this.config.apiKey.substring(0, 8)}...`,
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          executionTime: 0,
        },
      };

    } catch (error) {
      this.logger.error(`Google Maps health check failed: ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error.message,
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          executionTime: 0,
        },
      };
    }
  }
}