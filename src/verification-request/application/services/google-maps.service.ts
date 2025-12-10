import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SearchResultDto } from '../../presentation/dto/map-router.dto';

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

  constructor(private readonly configService: ConfigService) {
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
   * Places Text Search - Search for places by name or description
   * Optionally biased by user location for proximity ordering
   */
  async placesTextSearch(query: string, lat?: number, lng?: number): Promise<SearchResultDto[]> {
    try {
      this.logger.log(`Places Text Search: "${query}"${lat && lng ? ` (near ${lat},${lng})` : ''}`);

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

      return this.normalizeResults(response.data.results, 'google_places');
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

      return this.normalizeResults(response.data.results, 'google_places');
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

      return this.normalizeGeocodingResults(response.data.results);
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

      return this.normalizeGeocodingResults(response.data.results);
    } catch (error) {
      this.logger.error(`Reverse Geocoding failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normalize Google Places API results to unified format
   */
  private normalizeResults(results: any[], source: string): SearchResultDto[] {
    return results.map((place, index) => {
      const popularity = this.calculatePopularity(
        place.rating,
        place.user_ratings_total,
      );

      return {
        id: place.place_id || `${source}-${index}`,
        name: place.name || 'Unnamed Location',
        formatted_address: place.formatted_address || place.vicinity || 'No address',
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        source,
        popularity_score: popularity,
      };
    });
  }

  /**
   * Normalize Geocoding API results to unified format
   */
  private normalizeGeocodingResults(results: any[]): SearchResultDto[] {
    return results.map((result, index) => ({
      id: result.place_id || `geocoding-${index}`,
      name: this.extractLocationName(result),
      formatted_address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      source: 'geocoding',
      popularity_score: 0.5, // Default for geocoding results
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
