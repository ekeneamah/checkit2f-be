import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Coordinates DTO
 */
export class CoordinatesDto {
  @ApiProperty({ description: 'Latitude', example: 4.8156 })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 7.0498 })
  @IsNumber()
  lng: number;
}

/**
 * Service Area DTO - LGA-based structure
 */
export class ServiceAreaDto {
  @ApiProperty({ 
    description: 'Local Government Area (LGA)', 
    example: 'Port Harcourt'
  })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiProperty({ 
    description: 'Specific localities/areas within the LGA. Empty/null = serve entire LGA', 
    example: ['Old GRA', 'New GRA', 'D-Line', 'Trans-Amadi'],
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  localities?: string[];

  @ApiProperty({ description: 'State name', example: 'Rivers' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Country name', example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ 
    description: 'Coordinates for the LGA center', 
    required: false,
    type: CoordinatesDto
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsOptional()
  coordinates?: CoordinatesDto;

  @ApiProperty({ 
    description: 'Service radius in kilometers', 
    example: 20,
    required: false 
  })
  @IsNumber()
  @IsOptional()
  radiusKm?: number;
}

/**
 * Add Service Area DTO
 */
export class AddServiceAreaDto {
  @ApiProperty({ 
    description: 'Service area to add',
    type: ServiceAreaDto
  })
  @ValidateNested()
  @Type(() => ServiceAreaDto)
  serviceArea: ServiceAreaDto;
}

/**
 * Update Service Area DTO - Just use the ServiceAreaDto directly
 * The state field identifies which service area to update
 */
export class UpdateServiceAreaDto extends ServiceAreaDto {}

/**
 * Remove Service Area DTO
 */
export class RemoveServiceAreaDto {
  @ApiProperty({ description: 'State of service area to remove', example: 'Rivers' })
  @IsString()
  @IsNotEmpty()
  state: string;
}

/**
 * Batch Update Service Areas DTO
 */
export class BatchUpdateServiceAreasDto {
  @ApiProperty({ 
    description: 'Complete list of service areas to replace existing ones',
    type: [ServiceAreaDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  serviceAreas: ServiceAreaDto[];
}

/**
 * Add Multiple Service Areas DTO
 */
export class AddMultipleServiceAreasDto {
  @ApiProperty({ 
    description: 'List of service areas to add',
    type: [ServiceAreaDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  serviceAreas: ServiceAreaDto[];
}
