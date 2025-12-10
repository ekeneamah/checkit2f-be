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
   * Search for locations using intelligent routing
   */
  async search(searchQuery: SearchQueryDto): Promise<RouterResponseDto> {
    try {
      // Step 1: Use GPT-4.1 to determine the best API to call
      const routingDecision = await this.gptRouter.routeQuery({
        query: searchQuery.query,
        hasGPS: !!(searchQuery.lat && searchQuery.lng),
      });

      this.logger.log(
        `Query "${searchQuery.query}" routed to: ${routingDecision.action}`,
      );

      // Step 2: Execute the appropriate Google Maps API call
      let results: SearchResultDto[] = [];

      switch (routingDecision.action) {
        case RouterAction.PLACES_TEXT_SEARCH:
          // Only use GPS bias if GPT router says to (not for country-specific queries)
          const shouldBias = routingDecision.use_gps_bias !== false;
          results = await this.googleMaps.placesTextSearch(
            searchQuery.query,
            shouldBias ? searchQuery.lat : undefined,
            shouldBias ? searchQuery.lng : undefined,
          );
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
            results: [],
          };

        case RouterAction.NO_ACTION:
          return {
            action: RouterAction.NO_ACTION,
            message:
              routingDecision.message ||
              'Could not understand your search. Please try a specific location or address.',
            allow_manual_pin: false,
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
        results: results.slice(0, 10), // Limit to top 10 results
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      
      // Return error response with manual pin option
      return {
        action: RouterAction.NO_ACTION,
        message: 'Search failed. Please try again or drop a pin manually.',
        allow_manual_pin: true,
        results: [],
      };
    }
  }

  /**
   * Create a manual pin location
   */
  async createManualPin(pinData: ManualPinDto): Promise<SearchResultDto> {
    try {
      this.logger.log(
        `Creating manual pin at: ${pinData.lat}, ${pinData.lng} (Label: "${pinData.user_label}")`,
      );

      // Get address from reverse geocoding
      let address = pinData.user_label;
      try {
        const geocodeResults = await this.googleMaps.reverseGeocode(
          pinData.lat,
          pinData.lng,
        );
        if (geocodeResults.length > 0) {
          address = geocodeResults[0].formatted_address;
        }
      } catch (error) {
        this.logger.warn(`Reverse geocoding failed for manual pin: ${error.message}`);
      }

      // Create manual pin result
      const result: SearchResultDto = {
        id: `manual-pin-${Date.now()}`,
        name: pinData.user_label,
        formatted_address: address,
        lat: pinData.lat,
        lng: pinData.lng,
        source: 'manual_pin',
        popularity_score: 0.5,
      };

      return result;
    } catch (error) {
      this.logger.error(`Manual pin creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
