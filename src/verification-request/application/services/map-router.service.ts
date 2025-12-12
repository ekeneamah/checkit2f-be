import { Injectable, Logger } from '@nestjs/common';
import { GptRouterService } from './gpt-router.service';
import { GoogleMapsService } from './google-maps.service';
import {
  SearchQueryDto,
  ManualPinDto,
  RouterResponseDto,
  SearchResultDto,
  RouterAction,
} from '../../presentation/dto/map-router.dto';

/**
 * Map Router Service
 * Orchestrates the intelligent routing of search queries through GPT-4.1 and Google Maps APIs
 */
@Injectable()
export class MapRouterService {
  private readonly logger = new Logger(MapRouterService.name);

  constructor(
    private readonly gptRouter: GptRouterService,
    private readonly googleMaps: GoogleMapsService,
  ) {}

  /**
   * Extract city and area from search query using Gemini AI
   */
  async extractCityArea(query: string): Promise<{
    action: string;
    allow_manual_pin: boolean;
    city: string | null;
    area: string | null;
    pricing?: any;
  }> {
    return await this.googleMaps.preSearchExtraction(query);
  }

  /**
   * Search for locations using intelligent routing
   */
  async search(searchQuery: SearchQueryDto): Promise<RouterResponseDto> {
    try {
      let routingDecision;
      
      // If verification type is provided, use simple rule-based routing
      if (searchQuery.verificationType) {
        routingDecision = this.determineActionByType(
          searchQuery.verificationType,
          searchQuery.query,
          !!(searchQuery.lat && searchQuery.lng)
        );
      } else {
        // Fallback to GPT-4.1 routing
        routingDecision = await this.gptRouter.routeQuery({
          query: searchQuery.query,
          hasGPS: !!(searchQuery.lat && searchQuery.lng),
        });
      }

      this.logger.log(
        `Query "${searchQuery.query}" routed to: ${routingDecision.action}`,
      );

      // Step 2: Execute the appropriate Google Maps API call
      let results: SearchResultDto[] = [];

      switch (routingDecision.action) {
        case RouterAction.PLACES_TEXT_SEARCH:
          // Only use GPS bias if GPT router says to (not for country-specific queries)
          const shouldBias = routingDecision.use_gps_bias !== false;
          const searchResponse = await this.googleMaps.placesTextSearch(
            searchQuery.query,
            shouldBias ? searchQuery.lat : undefined,
            shouldBias ? searchQuery.lng : undefined,
          );
          
          // Return the enhanced response with city/area info and pricing
          return {
            action: searchResponse.action as RouterAction,
            allow_manual_pin: searchResponse.allow_manual_pin,
            city: searchResponse.city,
            area: searchResponse.area,
            pricing: searchResponse.pricing,
            results: searchResponse.results,
          };
          break;

        case RouterAction.PLACES_NEARBY_SEARCH:
          if (searchQuery.lat && searchQuery.lng) {
            results = await this.googleMaps.placesNearbySearch(
              searchQuery.lat,
              searchQuery.lng,
              searchQuery.query,
            );
          } else {
            // GPS required but not provided - ask for location
            return {
              action: RouterAction.ASK_FOR_LOCATION,
              message: 'Please enable location services for nearby searches',
              allow_manual_pin: false,
              city: null,
              area: null,
              pricing: undefined,
              results: [],
            };
          }
          break;

        case RouterAction.GEOCODE:
          results = await this.googleMaps.geocode(searchQuery.query);
          break;

        case RouterAction.ASK_FOR_LOCATION:
          return {
            action: RouterAction.ASK_FOR_LOCATION,
            message:
              routingDecision.message ||
              'Please enable location services to search nearby',
            allow_manual_pin: false,
            city: null,
            area: null,
            pricing: undefined,
            results: [],
          };

        case RouterAction.NO_ACTION:
          return {
            action: RouterAction.NO_ACTION,
            message:
              routingDecision.message ||
              'Could not understand your search. Please try a specific location or address.',
            allow_manual_pin: false,
            city: null,
            area: null,
            pricing: undefined,
            results: [],
          };
      }

      // Step 3: Sort results by popularity score
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

      // Step 4: Return results with option to manually pin if no results found
      const allow_manual_pin = results.length === 0;

      return {
        action: routingDecision.action,
        message: results.length === 0 ? 'No results found. You can drop a pin manually.' : undefined,
        allow_manual_pin,
        city: null, // For non-PLACES_TEXT_SEARCH cases, no pre-extraction
        area: null,
        pricing: undefined,
        results: results.slice(0, 10), // Limit to top 10 results
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      
      // Return error response with manual pin option
      return {
        action: RouterAction.NO_ACTION,
        message: 'Search failed. Please try again or drop a pin manually.',
        allow_manual_pin: true,
        city: null,
        area: null,
        pricing: undefined,
        results: [],
      };
    }
  }

  /**
   * Create a manual pin location
   */
  private extractCityFromAddress(formattedAddress: string): string {
    // Handle special case for simple Nigerian city format
    if (formattedAddress.includes('Lekki') && formattedAddress.includes('Lagos')) {
      return 'Lagos';
    }
    if (formattedAddress.includes('Abuja')) {
      return 'Abuja';
    }
    
    const parts = formattedAddress.split(',').map(part => part.trim());
    
    // Nigerian major cities for validation
    const nigerianCities = [
      'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Kaduna', 'Port Harcourt', 
      'Benin City', 'Maiduguri', 'Zaria', 'Jos', 'Ilorin', 'Oyo',
      'Enugu', 'Aba', 'Abeokuta', 'Akure', 'Sokoto', 'Onitsha',
      'Warri', 'Okene', 'Calabar', 'Uyo', 'Katsina', 'Ado Ekiti'
    ];
    
    if (parts.length >= 2) {
      // Check each part for known Nigerian cities (from last to first)
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        // Remove postal codes and numbers
        const cleanPart = part.replace(/\d+/g, '').trim();
        
        // Check if this part matches a known Nigerian city
        const matchedCity = nigerianCities.find(city => 
          cleanPart.toLowerCase().includes(city.toLowerCase()) ||
          city.toLowerCase().includes(cleanPart.toLowerCase())
        );
        
        if (matchedCity) {
          return matchedCity;
        }
      }
      
      // Fallback: get the last part and clean it
      const lastPart = parts[parts.length - 1];
      const cityMatch = lastPart.match(/^([a-zA-Z\s]+)/);
      if (cityMatch) {
        return cityMatch[1].trim();
      }
      
      return lastPart;
    }
    
    // Single part address - check for known cities
    const cleanAddress = formattedAddress.replace(/\d+/g, '').trim();
    const matchedCity = nigerianCities.find(city => 
      cleanAddress.toLowerCase().includes(city.toLowerCase())
    );
    
    if (matchedCity) {
      return matchedCity;
    }
    
    return 'Unknown City';
  }

  async createManualPin(pinData: ManualPinDto): Promise<SearchResultDto> {
    try {
      this.logger.log(
        `Creating manual pin at: ${pinData.lat}, ${pinData.lng} (Label: "${pinData.user_label}")`,
      );

      // Get address from reverse geocoding
      let address = pinData.user_label;
      let popularityScore = 0.3; // Default for manual pins
      
      try {
        const geocodeResults = await this.googleMaps.reverseGeocode(
          pinData.lat,
          pinData.lng,
        );
        if (geocodeResults.length > 0) {
          address = geocodeResults[0].formatted_address;
          // Higher score if reverse geocoding succeeds (indicates valid location)
          popularityScore = 0.6;
          
          // Even higher score if user label matches address (indicates known location)
          const labelLower = pinData.user_label.toLowerCase();
          const addressLower = address.toLowerCase();
          if (addressLower.includes(labelLower) || labelLower.includes(addressLower)) {
            popularityScore = 0.8;
          }
        }
      } catch (error) {
        this.logger.warn(`Reverse geocoding failed for manual pin: ${error.message}`);
      }

      // Extract city and area from reverse geocoding result
      let city: string | undefined;
      let area: string | undefined;
      try {
        const reverseGeocode = await this.googleMaps.reverseGeocode(pinData.lat, pinData.lng);
        if (reverseGeocode && reverseGeocode.length > 0) {
          city = reverseGeocode[0].city || undefined;
          area = reverseGeocode[0].area || undefined;
        }
      } catch (error) {
        this.logger.warn(`Failed to get city from reverse geocoding: ${error.message}`);
      }
      
      // Fallback to extracting from address if reverse geocoding failed
      if (!city && address) {
        city = this.extractCityFromAddress(address);
      }

      // Create manual pin result
      const result: SearchResultDto = {
        id: `manual-pin-${Date.now()}`,
        name: pinData.user_label,
        formatted_address: address,
        city,
        area,
        lat: pinData.lat,
        lng: pinData.lng,
        source: 'manual_pin',
        popularity_score: popularityScore,
      };

      return result;
    } catch (error) {
      this.logger.error(`Manual pin creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Determine routing action based on verification type
   */
  private determineActionByType(
    verificationType: string,
    query: string,
    hasGPS: boolean
  ): { action: RouterAction; use_gps_bias: boolean; message?: string } {
    const queryLower = query.toLowerCase();
    const isNearbyQuery = queryLower.includes('near me') || 
                          queryLower.includes('nearby') || 
                          queryLower.includes('closest');

    // For nearby queries
    if (isNearbyQuery) {
      if (!hasGPS) {
        return {
          action: RouterAction.ASK_FOR_LOCATION,
          use_gps_bias: false,
          message: 'Please enable location services for nearby searches'
        };
      }
      return {
        action: RouterAction.PLACES_NEARBY_SEARCH,
        use_gps_bias: true
      };
    }

    // Route based on verification type
    switch (verificationType) {
      case 'BUSINESS_VERIFICATION':
      case 'PROPERTY_INSPECTION':
      case 'SITE_SURVEY':
        // Use Places API for business/property/site searches
        return {
          action: RouterAction.PLACES_TEXT_SEARCH,
          use_gps_bias: hasGPS
        };

      case 'KYC_VERIFICATION':
        // Use Geocoding for precise address verification
        return {
          action: RouterAction.GEOCODE,
          use_gps_bias: false
        };

      case 'CUSTOM':
      default:
        // Default to Places Text Search
        return {
          action: RouterAction.PLACES_TEXT_SEARCH,
          use_gps_bias: hasGPS
        };
    }
  }
}
