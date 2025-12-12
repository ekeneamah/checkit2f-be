import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SearchResultDto } from '../../presentation/dto/map-router.dto';
import { GeminiAIService } from '../../../external-services/gemini-ai/gemini-ai.service';
import { LocationPricingService } from './location-pricing.service';
import { PriceCalculationResult } from '../../domain/entities/location-pricing.entity';

interface PlacesSearchParams {
  query?: string;
  location?: string;
  radius?: number;
  type?: string;
}

interface GeocodingParams {
  address?: string;
  latlng?: string;
}

/**
 * Google Maps API Service
 * Handles integration with Google Places, Geocoding, and other Maps APIs
 */
@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly axios: AxiosInstance;

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiService: GeminiAIService,
    private readonly locationPricingService: LocationPricingService,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not configured. Maps services will fail.');
    }

    this.axios = axios.create({
      baseURL: 'https://maps.googleapis.com/maps/api',
      timeout: 10000,
    });
  }

  /**
   * Pre-search extraction - Use Gemini AI to extract city and area from search query
   * This runs before the actual search to provide immediate feedback
   */
  async preSearchExtraction(query: string): Promise<{
    action: string;
    allow_manual_pin: boolean;
    city: string | null;
    area: string | null;
    pricing?: PriceCalculationResult;
  }> {
    this.logger.log(`Pre-search extraction for: "${query}"`);
    
    try {
      const geminiResult = await this.extractAreaWithGemini(query);
      
      this.logger.log(`Pre-search result: area="${geminiResult.area}", city="${geminiResult.city}"`);
      
      // Calculate pricing if city is extracted
      let pricing: PriceCalculationResult | undefined;
      if (geminiResult.city) {
        try {
          pricing = await this.locationPricingService.calculateLocationPrice(
            geminiResult.city,
            geminiResult.area
          );
          this.logger.log(`Pricing calculated: ₦${pricing.totalCost} (${pricing.pricingSource})`);
        } catch (error) {
          this.logger.warn(`Pricing calculation failed: ${error.message}`);
        }
      }
      
      return {
        action: "PLACES_TEXT_SEARCH",
        allow_manual_pin: false,
        city: geminiResult.city,
        area: geminiResult.area,
        pricing
      };
    } catch (error) {
      this.logger.error(`Pre-search extraction failed: ${error.message}`);
      return {
        action: "PLACES_TEXT_SEARCH",
        allow_manual_pin: false,
        city: null,
        area: null
      };
    }
  }

  /**
   * Places Text Search - Search for places by name or description
   * Optionally biased by user location for proximity ordering
   */
  /**
   * Use Gemini AI to extract area and city from formatted address when Google components fail
   */
  private async extractAreaWithGemini(formattedAddress: string): Promise<{ area: string | null; city: string | null }> {
    const prompt = `Extract the area/neighborhood and city from this Nigerian address:
"${formattedAddress}"

Return only a JSON response in this exact format:
{"area": "area_name_or_null", "city": "city_name"}

Examples:
- "18 Idris Akere St, Egan igando, Lagos 102213, Lagos" → {"area": "Igando", "city": "Lagos"}
- "Victoria Island, Lagos" → {"area": "Victoria Island", "city": "Lagos"}
- "Plot 123, Garki, Abuja" → {"area": "Garki", "city": "Abuja"}
- "Lekki Phase 1, Lagos" → {"area": "Lekki Phase 1", "city": "Lagos"}

Rules:
- If no clear area/neighborhood exists, set area to null
- Always extract the main city (Lagos, Abuja, etc.)
- Prefer the most specific area name when multiple exist`;

    try {
      const response = await this.geminiService.simpleChat(
        prompt,
        undefined, // no system context needed
        0.1, // Low temperature for consistent extraction
        100, // Max tokens
      );
      
      const cleanResponse = response.trim().replace(/```json\n?|```\n?/g, '');
      const parsed = JSON.parse(cleanResponse);
      
      return { 
        area: parsed.area === "null" || parsed.area === null ? null : parsed.area, 
        city: parsed.city 
      };
    } catch (error) {
      this.logger.warn(`Gemini area extraction failed for "${formattedAddress}": ${error.message}`);
      return { area: null, city: null };
    }
  }

  /**
   * Extract area and city from Google Geocoding address components with Gemini AI fallback
   */
  private async extractAreaAndCityFromComponents(
    addressComponents: any[], 
    formattedAddress?: string
  ): Promise<{ area: string | null; city: string | null }> {
    let area: string | null = null;
    let city: string | null = null;

    for (const component of addressComponents) {
      const types: string[] = component.types || [];

      // AREA: Use Google's proper component hierarchy for areas/neighborhoods
      if (
        types.includes('sublocality_level_1') ||
        types.includes('sublocality_level_2') ||
        types.includes('sublocality') ||
        types.includes('neighborhood') ||
        types.includes('administrative_area_level_3') ||
        types.includes('administrative_area_level_4')
      ) {
        // Priority order: most specific area types first
        if (!area || 
            types.includes('sublocality_level_1') || 
            types.includes('sublocality') || 
            types.includes('neighborhood')) {
          area = component.long_name;
        }
      }

      // CITY: locality (Lagos, Abuja, Port Harcourt, etc.)
      if (types.includes('locality')) {
        city = component.long_name;
      }
    }

    // Gemini AI fallback when Google components don't provide clear area/city
    if ((!area || !city) && formattedAddress) {
      try {
        const geminiResult = await this.extractAreaWithGemini(formattedAddress);
        area = area || geminiResult.area;
        city = city || geminiResult.city;
        
        if (geminiResult.area || geminiResult.city) {
          this.logger.log(`Gemini enhanced extraction: area="${geminiResult.area}", city="${geminiResult.city}"`);
        }
      } catch (error) {
        this.logger.warn(`Gemini fallback failed: ${error.message}`);
      }
    }

    return { area, city };
  }

  /**
   * Fallback city extraction from formatted address for older API responses
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

  async placesTextSearch(query: string, lat?: number, lng?: number): Promise<{
    action: string;
    allow_manual_pin: boolean;
    city: string | null;
    area: string | null;
    pricing?: PriceCalculationResult;
    results: SearchResultDto[];
  }> {
    try {
      this.logger.log(`Places Text Search: "${query}"${lat && lng ? ` (near ${lat},${lng})` : ''}`);

      // First extract city and area using Gemini
      const preSearchResult = await this.preSearchExtraction(query);

      const params: any = {
        query,
        key: this.apiKey,
        region: 'ng', // Prioritize Nigeria
      };

      // Add location bias for proximity ordering
      if (lat && lng) {
        params.location = `${lat},${lng}`;
        params.radius = 50000; // 50km bias radius
      }

      const response = await this.axios.get('/place/textsearch/json', {
        params,
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const searchResults = await this.normalizeResults(response.data.results, 'google_places');

      return {
        action: preSearchResult.action,
        allow_manual_pin: preSearchResult.allow_manual_pin,
        city: preSearchResult.city,
        area: preSearchResult.area,
        pricing: preSearchResult.pricing,
        results: searchResults
      };
    } catch (error) {
      this.logger.error(`Places Text Search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Places Nearby Search - Search for places near a location
   */
  async placesNearbySearch(
    lat: number,
    lng: number,
    query?: string,
    radius: number = 5000,
  ): Promise<SearchResultDto[]> {
    try {
      this.logger.log(`Places Nearby Search: lat=${lat}, lng=${lng}, query="${query}"`);

      const params: any = {
        location: `${lat},${lng}`,
        key: this.apiKey,
      };

      // Use rankby=distance for proximity ordering
      // Note: Cannot use radius with rankby=distance - they are mutually exclusive
      if (query) {
        params.keyword = query;
        params.rankby = 'distance'; // Order by closest first
      } else {
        // Without query, use radius-based search
        params.radius = radius;
        params.rankby = 'prominence'; // Order by popularity within radius
      }

      const response = await this.axios.get('/place/nearbysearch/json', {
        params,
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return await this.normalizeResults(response.data.results, 'google_places');
    } catch (error) {
      this.logger.error(`Places Nearby Search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Geocoding - Convert address to coordinates
   */
  async geocode(address: string): Promise<SearchResultDto[]> {
    try {
      this.logger.log(`Geocoding: "${address}"`);

      const response = await this.axios.get('/geocode/json', {
        params: {
          address,
          key: this.apiKey,
          region: 'ng',
        },
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Geocoding API error: ${response.data.status}`);
      }

      return await this.normalizeGeocodingResults(response.data.results);
    } catch (error) {
      this.logger.error(`Geocoding failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reverse Geocoding - Convert coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<SearchResultDto[]> {
    try {
      this.logger.log(`Reverse Geocoding: lat=${lat}, lng=${lng}`);

      const response = await this.axios.get('/geocode/json', {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Geocoding API error: ${response.data.status}`);
      }

      return await this.normalizeGeocodingResults(response.data.results);
    } catch (error) {
      this.logger.error(`Reverse Geocoding failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normalize Google Places API results to unified format
   */
  private async normalizeResults(results: any[], source: string): Promise<SearchResultDto[]> {
    return Promise.all(results.map(async (place, index) => {
      const popularity = this.calculatePopularity(
        place.rating,
        place.user_ratings_total,
      );

      // Extract area and city from address components if available
      let area: string | null = null;
      let city: string | null = null;
      
      if (place.address_components) {
        const extracted = await this.extractAreaAndCityFromComponents(
          place.address_components,
          place.formatted_address || place.vicinity
        );
        area = extracted.area;
        city = extracted.city;
      }
      
      // Fallback to formatted address parsing if components not available
      if (!city) {
        city = this.extractCityFromAddress(place.formatted_address || place.vicinity || '');
      }

      return {
        id: place.place_id || `${source}-${index}`,
        name: place.name || 'Unnamed Location',
        formatted_address: place.formatted_address || place.vicinity || 'No address',
        city,
        area,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        source,
        popularity_score: popularity,
      };
    }));
  }

  /**
   * Normalize Geocoding API results to unified format
   */
  private async normalizeGeocodingResults(results: any[]): Promise<SearchResultDto[]> {
    return Promise.all(results.map(async (result, index) => {
      // Extract area and city from address components
      let area: string | null = null;
      let city: string | null = null;
      
      if (result.address_components) {
        const extracted = await this.extractAreaAndCityFromComponents(
          result.address_components,
          result.formatted_address
        );
        area = extracted.area;
        city = extracted.city;
      }
      
      // Fallback to formatted address parsing if components not available
      if (!city) {
        city = this.extractCityFromAddress(result.formatted_address || '');
      }

      return {
        id: result.place_id || `geocoding-${index}`,
        name: this.extractLocationName(result),
        formatted_address: result.formatted_address,
        city,
        area,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        source: 'geocoding',
        popularity_score: 0.5, // Default for geocoding results
      };
    }));
  }

  /**
   * Extract a meaningful location name from geocoding result
   */
  private extractLocationName(result: any): string {
    // Try to get locality, neighborhood, or administrative area
    const components = result.address_components || [];
    
    for (const component of components) {
      if (
        component.types.includes('locality') ||
        component.types.includes('neighborhood') ||
        component.types.includes('sublocality')
      ) {
        return component.long_name;
      }
    }

    // Fallback to first address component
    return components[0]?.long_name || 'Location';
  }

  /**
   * Extract city name from address components
   */
  private extractCityName(result: any): string | undefined {
    const components = result.address_components || [];
    
    // Look for locality (city) first
    for (const component of components) {
      if (component.types.includes('locality')) {
        return component.long_name;
      }
    }

    // Fallback to administrative_area_level_2 (county/district)
    for (const component of components) {
      if (component.types.includes('administrative_area_level_2')) {
        return component.long_name;
      }
    }

    // Last resort - sublocality
    for (const component of components) {
      if (component.types.includes('sublocality_level_1') || component.types.includes('sublocality')) {
        return component.long_name;
      }
    }

    return undefined;
  }

  /**
   * Calculate popularity score based on rating and review count
   */
  private calculatePopularity(rating?: number, reviewCount?: number): number {
    if (!rating || !reviewCount) return 0.3;

    // Normalize rating (0-5 scale)
    const ratingScore = rating / 5;

    // Normalize review count (logarithmic scale, max at 1000+)
    const reviewScore = Math.min(Math.log10(reviewCount + 1) / 3, 1);

    // Weighted average (rating 70%, reviews 30%)
    return ratingScore * 0.7 + reviewScore * 0.3;
  }
}
