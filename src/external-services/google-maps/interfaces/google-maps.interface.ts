/**
 * Google Maps Service Interfaces
 * 
 * This file defines all interfaces and types used by the Google Maps service
 * for location services, geocoding, and distance calculations.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

/**
 * Geographic coordinates interface
 */
export interface ICoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Address component interface from Google Places API
 */
export interface IAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Structured address interface
 */
export interface IAddress {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country?: string;
  postal_code?: string;
  formatted_address: string;
  place_id?: string;
}

/**
 * Geocoding result interface
 */
export interface IGeocodingResult {
  coordinates: ICoordinates;
  address: IAddress;
  place_id: string;
  accuracy: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
  types: string[];
}

/**
 * Reverse geocoding options
 */
export interface IReverseGeocodingOptions {
  result_type?: string[];
  location_type?: string[];
}

/**
 * Distance calculation result
 */
export interface IDistanceResult {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_ROUTE_LENGTH_EXCEEDED';
}

/**
 * Travel mode enum for distance calculations
 */
export enum TravelMode {
  DRIVING = 'driving',
  WALKING = 'walking',
  BICYCLING = 'bicycling',
  TRANSIT = 'transit'
}

/**
 * Unit system enum for distance calculations
 */
export enum UnitSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial'
}

/**
 * Distance matrix options
 */
export interface IDistanceMatrixOptions {
  mode?: TravelMode;
  units?: UnitSystem;
  avoid?: string[];
  departure_time?: Date;
  arrival_time?: Date;
  traffic_model?: 'best_guess' | 'pessimistic' | 'optimistic';
}

/**
 * Place search result
 */
export interface IPlaceSearchResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: ICoordinates;
  };
  rating?: number;
  price_level?: number;
  types: string[];
  business_status?: string;
  opening_hours?: {
    open_now: boolean;
  };
}

/**
 * Place search options
 */
export interface IPlaceSearchOptions {
  radius?: number;
  type?: string;
  keyword?: string;
  min_price?: number;
  max_price?: number;
  open_now?: boolean;
}

/**
 * Place details result
 */
export interface IPlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text: string[];
  };
  geometry: {
    location: ICoordinates;
  };
  types: string[];
}

/**
 * Google Maps service configuration
 */
export interface IGoogleMapsConfig {
  apiKey: string;
  defaultLanguage?: string;
  defaultRegion?: string;
  timeout?: number;
  retryConfig?: {
    retries: number;
    backoffDelay: number;
  };
}

/**
 * Service response wrapper
 */
export interface IServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    executionTime: number;
  };
}

/**
 * Batch geocoding request
 */
export interface IBatchGeocodingRequest {
  addresses: string[];
  options?: {
    maxResults?: number;
    region?: string;
    language?: string;
  };
}

/**
 * Validation result interface
 */
export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}