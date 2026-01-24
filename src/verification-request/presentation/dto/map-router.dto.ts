import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query string (address, place name, or description)',
    example: 'Victoria Island Lagos',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'User GPS latitude for nearby searches',
    example: 6.4281,
  })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({
    description: 'User GPS longitude for nearby searches',
    example: 3.4219,
  })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Verification type selected by user (pill)',
    example: 'BUSINESS_VERIFICATION',
    enum: ['BUSINESS_VERIFICATION', 'PROPERTY_INSPECTION', 'KYC_VERIFICATION', 'SITE_SURVEY', 'CUSTOM'],
  })
  @IsOptional()
  @IsString()
  verificationType?: string;
}

export class ManualPinDto {
  @ApiProperty({
    description: 'Original search query that led to manual pin',
    example: 'Non-existent street',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Latitude of manually dropped pin',
    example: 6.4281,
  })
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @ApiProperty({
    description: 'Longitude of manually dropped pin',
    example: 3.4219,
  })
  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @ApiProperty({
    description: 'User-provided label for the location',
    example: 'My Office Building',
  })
  @IsString()
  @IsNotEmpty()
  user_label: string;
}

export enum RouterAction {
  PLACES_TEXT_SEARCH = 'PLACES_TEXT_SEARCH',
  PLACES_NEARBY_SEARCH = 'PLACES_NEARBY_SEARCH',
  GEOCODE = 'GEOCODE',
  ASK_FOR_LOCATION = 'ASK_FOR_LOCATION',
  NO_ACTION = 'NO_ACTION',
}

export class SearchResultDto {
  @ApiProperty({ description: 'Unique result ID' })
  id: string;

  @ApiProperty({ description: 'Place name' })
  name: string;

  @ApiProperty({ description: 'Formatted address' })
  formatted_address: string;

  @ApiPropertyOptional({ description: 'City name extracted from address' })
  city?: string;

  @ApiPropertyOptional({ description: 'Area/neighborhood extracted from address' })
  area?: string;

  @ApiPropertyOptional({ description: 'State extracted from address', example: 'Rivers' })
  state?: string;

  @ApiPropertyOptional({ description: 'LGA extracted from address', example: 'Port Harcourt City' })
  lga?: string;

  @ApiPropertyOptional({ description: 'Locality extracted from address', example: 'Abuloma' })
  locality?: string;

  @ApiProperty({ description: 'Latitude' })
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  lng: number;

  @ApiPropertyOptional({ description: 'Rating (0-5)' })
  rating?: number;

  @ApiPropertyOptional({ description: 'Number of user ratings' })
  user_ratings_total?: number;

  @ApiProperty({
    description: 'Source of result',
    enum: ['google_places', 'geocoding', 'manual_pin'],
  })
  source: string;

  @ApiPropertyOptional({ description: 'Popularity score (0-1)' })
  popularity_score?: number;
}

export class PriceCalculationDto {
  @ApiProperty({ description: 'State name', example: 'Rivers' })
  state: string;

  @ApiProperty({ description: 'LGA name', example: 'Port Harcourt' })
  lga: string;

  @ApiPropertyOptional({ description: 'Locality name', example: 'Old GRA' })
  locality?: string | null;

  @ApiProperty({ description: 'Base price in Naira', example: 5000 })
  basePrice: number;

  @ApiProperty({ description: 'Price per kilometer in Naira', example: 200 })
  pricePerKm: number;

  @ApiProperty({ description: 'Distance in kilometers', example: 10 })
  distance: number;

  @ApiProperty({ description: 'Calculated price before surcharges in Naira', example: 7000 })
  calculatedPrice: number;

  @ApiPropertyOptional({ 
    description: 'Applied surcharges',
    type: 'array',
    example: [{ type: 'weekend', value: 20, amount: 1400 }]
  })
  appliedSurcharges?: Array<{ type: string; value: number; amount: number }>;

  @ApiProperty({ description: 'Final price including surcharges in Naira', example: 8400 })
  finalPrice: number;

  @ApiProperty({ 
    description: 'Source of pricing calculation',
    enum: ['locality_match', 'lga_match', 'state_match', 'default'],
    example: 'locality_match'
  })
  pricingSource: string;

  @ApiPropertyOptional({ description: 'ID of applied pricing configuration' })
  appliedPricingId?: string;
}

export class RouterResponseDto {
  @ApiProperty({
    description: 'Action determined by GPT-4.1 router',
    enum: RouterAction,
  })
  action: RouterAction;

  @ApiPropertyOptional({ description: 'Optional message to user' })
  message?: string;

  @ApiPropertyOptional({ description: 'Whether to allow manual pin option' })
  allow_manual_pin?: boolean;

  @ApiPropertyOptional({ 
    description: 'Extracted city from search query',
    example: 'Lagos'
  })
  city?: string | null;

  @ApiPropertyOptional({ 
    description: 'Extracted area/neighborhood from search query',
    example: 'Victoria Island'
  })
  area?: string | null;

  @ApiPropertyOptional({ 
    description: 'Pricing calculation for the extracted location',
    type: PriceCalculationDto
  })
  pricing?: PriceCalculationDto;

  @ApiProperty({
    description: 'Search results from Google APIs',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];
}
