import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, IsNotEmpty, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SurchargeDto {
  @ApiProperty({
    description: 'Surcharge type',
    enum: ['weekend', 'holiday', 'night', 'rush_hour', 'custom'],
    example: 'weekend',
  })
  @IsEnum(['weekend', 'holiday', 'night', 'rush_hour', 'custom'])
  type: 'weekend' | 'holiday' | 'night' | 'rush_hour' | 'custom';

  @ApiProperty({
    description: 'Surcharge value (percentage or fixed amount)',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({
    description: 'Whether the surcharge is a percentage or fixed amount',
    example: true,
  })
  @IsBoolean()
  isPercentage: boolean;

  @ApiPropertyOptional({
    description: 'Description of the surcharge',
    example: 'Weekend premium',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateLocationPricingDto {
  @ApiProperty({
    description: 'State name',
    example: 'Rivers',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'LGA (Local Government Area) name',
    example: 'Port Harcourt',
  })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiPropertyOptional({
    description: 'Locality/neighborhood name (optional for LGA-wide pricing)',
    example: 'Old GRA',
  })
  @IsOptional()
  @IsString()
  locality?: string;

  @ApiProperty({
    description: 'Base price in Naira',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    description: 'Price per kilometer in Naira',
    example: 200,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  pricePerKm: number;

  @ApiPropertyOptional({
    description: 'Minimum charge in Naira',
    example: 3000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumCharge?: number;

  @ApiPropertyOptional({
    description: 'Maximum charge in Naira',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumCharge?: number;

  @ApiPropertyOptional({
    description: 'Array of surcharges applicable to this pricing',
    type: [SurchargeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurchargeDto)
  surcharges?: SurchargeDto[];

  @ApiPropertyOptional({
    description: 'Whether this pricing is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Description of the pricing configuration',
    example: 'Premium pricing for high-demand area',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Date when pricing becomes effective (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Date when pricing expires (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateLocationPricingDto {
  @ApiPropertyOptional({
    description: 'Base price in Naira',
    example: 5500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Price per kilometer in Naira',
    example: 250,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKm?: number;

  @ApiPropertyOptional({
    description: 'Minimum charge in Naira',
    example: 3500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumCharge?: number;

  @ApiPropertyOptional({
    description: 'Maximum charge in Naira',
    example: 60000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumCharge?: number;

  @ApiPropertyOptional({
    description: 'Array of surcharges applicable to this pricing',
    type: [SurchargeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurchargeDto)
  surcharges?: SurchargeDto[];

  @ApiPropertyOptional({
    description: 'Whether this pricing is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Description of the pricing configuration',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Date when pricing becomes effective (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({
    description: 'Date when pricing expires (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class LocationPricingResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

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

  @ApiPropertyOptional({ description: 'Minimum charge in Naira', example: 3000 })
  minimumCharge?: number;

  @ApiPropertyOptional({ description: 'Maximum charge in Naira', example: 50000 })
  maximumCharge?: number;

  @ApiPropertyOptional({ description: 'Surcharges', type: [SurchargeDto] })
  surcharges?: SurchargeDto[];

  @ApiProperty({ description: 'Whether this pricing is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Effective from date' })
  effectiveFrom?: Date;

  @ApiPropertyOptional({ description: 'Effective to date' })
  effectiveTo?: Date;
}

export class PaginatedLocationPricingResponseDto {
  @ApiProperty({ 
    description: 'Array of location pricing configurations',
    type: [LocationPricingResponseDto] 
  })
  items: LocationPricingResponseDto[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}