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

  @ApiProperty({
    description: 'Search results from Google APIs',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];
}
