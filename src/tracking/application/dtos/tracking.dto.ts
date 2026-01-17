import { 
  IsNumber, 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Location Tracking DTOs
 * 
 * Data Transfer Objects for tracking, geofencing, and navigation operations.
 */

export class CoordinatesDto {
  @ApiProperty({ description: 'Latitude', example: 6.5244 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 3.3792 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Accuracy in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Altitude in meters' })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({ description: 'Heading in degrees from north' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({ description: 'Speed in meters per second' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;
}

export class LocationPointDto extends CoordinatesDto {
  @ApiProperty({ description: 'Timestamp of the location capture' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Location source', enum: ['gps', 'network', 'fused'] })
  @IsOptional()
  @IsEnum(['gps', 'network', 'fused'])
  source?: string;

  @ApiPropertyOptional({ description: 'Device battery level (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;
}

export class UpdateLocationDto {
  @ApiProperty({ type: LocationPointDto })
  @ValidateNested()
  @Type(() => LocationPointDto)
  location: LocationPointDto;

  @ApiPropertyOptional({ description: 'Verification request ID if tracking for a specific task' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;

  @ApiPropertyOptional({ description: 'Tracking session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class BatchLocationUpdateDto {
  @ApiProperty({ type: [LocationPointDto], description: 'Array of location points' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  locations: LocationPointDto[];

  @ApiPropertyOptional({ description: 'Session ID for batch update' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class StartTrackingSessionDto {
  @ApiPropertyOptional({ description: 'Verification request to track' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;

  @ApiProperty({ type: LocationPointDto, description: 'Starting location' })
  @ValidateNested()
  @Type(() => LocationPointDto)
  startLocation: LocationPointDto;
}

export class CreateGeofenceDto {
  @ApiProperty({ description: 'Geofence name' })
  @IsString()
  name: string;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  center: CoordinatesDto;

  @ApiProperty({ description: 'Radius in meters', example: 100 })
  @IsNumber()
  @Min(10)
  @Max(10000)
  radiusMeters: number;

  @ApiPropertyOptional({ 
    description: 'Geofence type', 
    enum: ['verification_site', 'check_in', 'restricted', 'custom'] 
  })
  @IsOptional()
  @IsEnum(['verification_site', 'check_in', 'restricted', 'custom'])
  type?: string;

  @ApiPropertyOptional({ description: 'Associated verification request ID' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;
}

export class CheckGeofenceDto {
  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  location: CoordinatesDto;

  @ApiProperty({ description: 'Geofence IDs to check against', type: [String] })
  @IsArray()
  @IsString({ each: true })
  geofenceIds: string[];
}

export class RouteOptimizationRequestDto {
  @ApiProperty({ type: CoordinatesDto, description: 'Starting point' })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  origin: CoordinatesDto;

  @ApiProperty({ 
    type: 'array',
    description: 'Destinations to optimize route for'
  })
  @IsArray()
  @ValidateNested({ each: true })
  destinations: Array<{
    id: string;
    coordinates: CoordinatesDto;
    priority?: number;
    timeWindowStart?: string;
    timeWindowEnd?: string;
  }>;

  @ApiPropertyOptional({ 
    description: 'Optimization criteria', 
    enum: ['distance', 'time', 'balanced'],
    default: 'balanced'
  })
  @IsOptional()
  @IsEnum(['distance', 'time', 'balanced'])
  optimizeFor?: string;

  @ApiPropertyOptional({ description: 'Avoid toll roads' })
  @IsOptional()
  @IsBoolean()
  avoidTolls?: boolean;

  @ApiPropertyOptional({ description: 'Avoid highways' })
  @IsOptional()
  @IsBoolean()
  avoidHighways?: boolean;

  @ApiPropertyOptional({ 
    description: 'Vehicle type', 
    enum: ['car', 'motorcycle', 'bicycle', 'walking'] 
  })
  @IsOptional()
  @IsEnum(['car', 'motorcycle', 'bicycle', 'walking'])
  vehicleType?: string;
}

export class GetNavigationDto {
  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  origin: CoordinatesDto;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination: CoordinatesDto;

  @ApiPropertyOptional({ description: 'Include alternative routes' })
  @IsOptional()
  @IsBoolean()
  includeAlternatives?: boolean;

  @ApiPropertyOptional({ 
    description: 'Travel mode', 
    enum: ['driving', 'walking', 'bicycling', 'transit'] 
  })
  @IsOptional()
  @IsEnum(['driving', 'walking', 'bicycling', 'transit'])
  travelMode?: string;
}

export class CheckInOutDto {
  @ApiProperty({ description: 'Verification request ID' })
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ description: 'Check-in or check-out', enum: ['check_in', 'check_out'] })
  @IsEnum(['check_in', 'check_out'])
  type: string;

  @ApiProperty({ type: LocationPointDto })
  @ValidateNested()
  @Type(() => LocationPointDto)
  location: LocationPointDto;

  @ApiPropertyOptional({ description: 'Whether triggered by geofence' })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiPropertyOptional({ description: 'Photo URL for check-in' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartLiveShareDto {
  @ApiPropertyOptional({ description: 'Associated verification request' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;

  @ApiProperty({ description: 'Duration in minutes', example: 60 })
  @IsNumber()
  @Min(5)
  @Max(480)
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Update frequency in seconds', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(300)
  updateFrequencySeconds?: number;

  @ApiPropertyOptional({ 
    description: 'Who to share with', 
    type: 'array',
    example: ['company', 'customer'] 
  })
  @IsOptional()
  @IsArray()
  shareWith?: Array<'company' | 'customer' | 'emergency_contact'>;
}
