import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, IsNotEmpty } from 'class-validator';

export class CreateLocationPricingDto {
  @ApiProperty({
    description: 'City name',
    example: 'Lagos',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({
    description: 'Area/neighborhood name (optional for city-wide pricing)',
    example: 'Victoria Island',
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({
    description: 'Base cost for the city in Naira',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  cityCost: number;

  @ApiProperty({
    description: 'Additional cost for the specific area in Naira',
    example: 2000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  areaCost: number;

  @ApiPropertyOptional({
    description: 'Status of the pricing configuration',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

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
    description: 'Base cost for the city in Naira',
    example: 5500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cityCost?: number;

  @ApiPropertyOptional({
    description: 'Additional cost for the specific area in Naira',
    example: 2500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaCost?: number;

  @ApiPropertyOptional({
    description: 'Status of the pricing configuration',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

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

  @ApiProperty({ description: 'City name', example: 'Lagos' })
  city: string;

  @ApiPropertyOptional({ description: 'Area name', example: 'Victoria Island' })
  area?: string | null;

  @ApiProperty({ description: 'Base cost for the city in Naira', example: 5000 })
  cityCost: number;

  @ApiProperty({ description: 'Additional cost for the area in Naira', example: 2000 })
  areaCost: number;

  @ApiProperty({ description: 'Total cost in Naira', example: 7000 })
  get totalCost(): number {
    return this.cityCost + this.areaCost;
  }

  @ApiProperty({ 
    description: 'Status', 
    enum: ['active', 'inactive', 'suspended'] 
  })
  status: string;

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