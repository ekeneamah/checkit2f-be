import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TravelMode, UnitSystem } from '../interfaces/google-maps.interface';

/**
 * Coordinates DTO for location data
 */
export class CoordinatesDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 6.5244,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 3.3792,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

/**
 * Geocoding request DTO
 */
export class GeocodingRequestDto {
  @ApiProperty({
    description: 'Address to geocode',
    example: '1600 Amphitheatre Parkway, Mountain View, CA',
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'Language for the response',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Region for biasing results',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  region?: string;
}

/**
 * Reverse geocoding request DTO
 */
export class ReverseGeocodingRequestDto {
  @ApiProperty({
    description: 'Coordinates to reverse geocode',
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  @ApiPropertyOptional({
    description: 'Result types to filter',
    example: ['street_address', 'route'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  result_type?: string[];

  @ApiPropertyOptional({
    description: 'Location types to filter',
    example: ['ROOFTOP'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  location_type?: string[];
}

/**
 * Distance calculation request DTO
 */
export class DistanceCalculationRequestDto {
  @ApiProperty({
    description: 'Origin coordinates',
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  origin: CoordinatesDto;

  @ApiProperty({
    description: 'Destination coordinates',
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination: CoordinatesDto;

  @ApiPropertyOptional({
    description: 'Travel mode',
    enum: TravelMode,
    example: TravelMode.DRIVING,
  })
  @IsOptional()
  @IsEnum(TravelMode)
  mode?: TravelMode;

  @ApiPropertyOptional({
    description: 'Unit system for results',
    enum: UnitSystem,
    example: UnitSystem.METRIC,
  })
  @IsOptional()
  @IsEnum(UnitSystem)
  units?: UnitSystem;

  @ApiPropertyOptional({
    description: 'Routes to avoid',
    example: ['tolls', 'highways'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoid?: string[];
}

/**
 * Place search request DTO
 */
export class PlaceSearchRequestDto {
  @ApiProperty({
    description: 'Center coordinates for search',
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  location: CoordinatesDto;

  @ApiPropertyOptional({
    description: 'Search radius in meters',
    example: 5000,
    minimum: 1,
    maximum: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50000)
  radius?: number;

  @ApiPropertyOptional({
    description: 'Place type to search for',
    example: 'restaurant',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Keyword to search for',
    example: 'pizza',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Minimum price level (0-4)',
    example: 1,
    minimum: 0,
    maximum: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  min_price?: number;

  @ApiPropertyOptional({
    description: 'Maximum price level (0-4)',
    example: 3,
    minimum: 0,
    maximum: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  max_price?: number;

  @ApiPropertyOptional({
    description: 'Only return currently open places',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  open_now?: boolean;
}

/**
 * Place details request DTO
 */
export class PlaceDetailsRequestDto {
  @ApiProperty({
    description: 'Google Places place ID',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  })
  @IsString()
  place_id: string;

  @ApiPropertyOptional({
    description: 'Language for the response',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Specific fields to return',
    example: ['name', 'rating', 'formatted_phone_number'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

/**
 * Batch geocoding request DTO
 */
export class BatchGeocodingRequestDto {
  @ApiProperty({
    description: 'Array of addresses to geocode',
    example: [
      '1600 Amphitheatre Parkway, Mountain View, CA',
      'Times Square, New York, NY'
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  addresses: string[];

  @ApiPropertyOptional({
    description: 'Maximum results per address',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxResults?: number;

  @ApiPropertyOptional({
    description: 'Language for responses',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Region for biasing results',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  region?: string;
}

/**
 * Address validation request DTO
 */
export class AddressValidationRequestDto {
  @ApiProperty({
    description: 'Address to validate',
    example: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'Country code for validation context',
    example: 'US',
  })
  @IsOptional()
  @IsString()
  country?: string;
}

/**
 * Response DTOs
 */

/**
 * Address response DTO
 */
export class AddressResponseDto {
  @ApiProperty({ description: 'Street number' })
  street_number?: string;

  @ApiProperty({ description: 'Route/street name' })
  route?: string;

  @ApiProperty({ description: 'City/locality' })
  locality?: string;

  @ApiProperty({ description: 'State/administrative area level 1' })
  administrative_area_level_1?: string;

  @ApiProperty({ description: 'County/administrative area level 2' })
  administrative_area_level_2?: string;

  @ApiProperty({ description: 'Country' })
  country?: string;

  @ApiProperty({ description: 'Postal code' })
  postal_code?: string;

  @ApiProperty({ description: 'Full formatted address' })
  formatted_address: string;

  @ApiProperty({ description: 'Google Places place ID' })
  place_id?: string;
}

/**
 * Geocoding response DTO
 */
export class GeocodingResponseDto {
  @ApiProperty({ description: 'Geographic coordinates', type: CoordinatesDto })
  coordinates: CoordinatesDto;

  @ApiProperty({ description: 'Structured address', type: AddressResponseDto })
  address: AddressResponseDto;

  @ApiProperty({ description: 'Google Places place ID' })
  place_id: string;

  @ApiProperty({ description: 'Accuracy level of the geocoding result' })
  accuracy: string;

  @ApiProperty({ description: 'Types of the result', type: [String] })
  types: string[];
}

/**
 * Distance response DTO
 */
export class DistanceResponseDto {
  @ApiProperty({
    description: 'Distance information',
    example: { text: '10.5 km', value: 10500 },
  })
  distance: {
    text: string;
    value: number;
  };

  @ApiProperty({
    description: 'Duration information',
    example: { text: '15 mins', value: 900 },
  })
  duration: {
    text: string;
    value: number;
  };

  @ApiProperty({ description: 'Status of the distance calculation' })
  status: string;
}

/**
 * Place search response DTO
 */
export class PlaceSearchResponseDto {
  @ApiProperty({ description: 'Google Places place ID' })
  place_id: string;

  @ApiProperty({ description: 'Place name' })
  name: string;

  @ApiProperty({ description: 'Place vicinity/address' })
  vicinity: string;

  @ApiProperty({ description: 'Place location', type: CoordinatesDto })
  location: CoordinatesDto;

  @ApiPropertyOptional({ description: 'Place rating (1-5)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Price level (0-4)' })
  price_level?: number;

  @ApiProperty({ description: 'Place types', type: [String] })
  types: string[];

  @ApiPropertyOptional({ description: 'Business status' })
  business_status?: string;

  @ApiPropertyOptional({ description: 'Currently open status' })
  open_now?: boolean;
}