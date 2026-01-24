import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Surcharge DTO
 */
export class SurchargeDto {
  @ApiProperty({ 
    description: 'Type of surcharge',
    enum: ['weekend', 'holiday', 'night', 'rush_hour', 'custom']
  })
  @IsString()
  @IsNotEmpty()
  type: 'weekend' | 'holiday' | 'night' | 'rush_hour' | 'custom';

  @ApiProperty({ 
    description: 'Label for custom surcharge types', 
    example: 'Bad road access',
    required: false
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ description: 'Fixed surcharge amount', example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ 
    description: 'Percentage of base price (alternative to fixed amount)', 
    example: 15,
    required: false
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  percentage?: number;
}

/**
 * Create Service Area Pricing DTO
 */
export class CreatePricingDto {
  @ApiProperty({ description: 'State name', example: 'Rivers' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Local Government Area', example: 'Port Harcourt' })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiProperty({ 
    description: 'Specific locality within LGA (optional). If not provided, pricing applies to entire LGA', 
    example: 'Old GRA',
    required: false
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({ description: 'Base price for verification', example: 5000, minimum: 0 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Price per kilometer', example: 200, minimum: 0 })
  @IsNumber()
  @Min(0)
  pricePerKm: number;

  @ApiProperty({ description: 'Minimum charge', example: 3000, minimum: 0 })
  @IsNumber()
  @Min(0)
  minimumCharge: number;

  @ApiProperty({ 
    description: 'Maximum charge cap (optional)', 
    example: 15000,
    required: false
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maximumCharge?: number;

  @ApiProperty({ 
    description: 'Additional surcharges', 
    type: [SurchargeDto],
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurchargeDto)
  @IsOptional()
  surcharges?: SurchargeDto[];

  @ApiProperty({ description: 'Whether this pricing is active', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Internal notes about this pricing', 
    example: 'Premium pricing for affluent area',
    required: false
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Update Service Area Pricing DTO
 */
export class UpdatePricingDto {
  @ApiProperty({ description: 'Base price for verification', example: 5000, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiProperty({ description: 'Price per kilometer', example: 200, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerKm?: number;

  @ApiProperty({ description: 'Minimum charge', example: 3000, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minimumCharge?: number;

  @ApiProperty({ 
    description: 'Maximum charge cap (optional)', 
    example: 15000,
    required: false
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maximumCharge?: number;

  @ApiProperty({ 
    description: 'Additional surcharges', 
    type: [SurchargeDto],
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurchargeDto)
  @IsOptional()
  surcharges?: SurchargeDto[];

  @ApiProperty({ description: 'Whether this pricing is active', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Internal notes about this pricing', 
    example: 'Updated pricing for Q2 2026',
    required: false
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Pricing Response DTO
 */
export class PricingResponseDto {
  @ApiProperty({ description: 'Pricing ID' })
  id: string;

  @ApiProperty({ description: 'State name' })
  state: string;

  @ApiProperty({ description: 'Local Government Area' })
  lga: string;

  @ApiProperty({ description: 'Specific locality (optional)', required: false })
  locality?: string;

  @ApiProperty({ description: 'Base price for verification' })
  basePrice: number;

  @ApiProperty({ description: 'Price per kilometer' })
  pricePerKm: number;

  @ApiProperty({ description: 'Minimum charge' })
  minimumCharge: number;

  @ApiProperty({ description: 'Maximum charge cap', required: false })
  maximumCharge?: number;

  @ApiProperty({ description: 'Additional surcharges', type: [SurchargeDto], required: false })
  surcharges?: SurchargeDto[];

  @ApiProperty({ description: 'Whether this pricing is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Admin user who created this', required: false })
  createdBy?: string;

  @ApiProperty({ description: 'Internal notes', required: false })
  notes?: string;
}

/**
 * Calculate Price Request DTO
 */
export class CalculatePriceDto {
  @ApiProperty({ description: 'State name', example: 'Rivers' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Local Government Area', example: 'Port Harcourt' })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiProperty({ 
    description: 'Specific locality (optional)', 
    example: 'Old GRA',
    required: false
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({ description: 'Distance in kilometers', example: 12.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ 
    description: 'Apply surcharges (weekend, holiday, etc.)', 
    type: [String],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applySurcharges?: string[];
}

/**
 * Price Calculation Response DTO
 */
export class PriceCalculationResponseDto {
  @ApiProperty({ description: 'Base price used' })
  basePrice: number;

  @ApiProperty({ description: 'Distance-based charge' })
  distanceCharge: number;

  @ApiProperty({ description: 'Total surcharges applied' })
  surchargeTotal: number;

  @ApiProperty({ description: 'Subtotal before caps' })
  subtotal: number;

  @ApiProperty({ description: 'Final price (after min/max caps)' })
  finalPrice: number;

  @ApiProperty({ description: 'Pricing rule used (locality/LGA/state/default)' })
  pricingLevel: 'locality' | 'lga' | 'state' | 'default';

  @ApiProperty({ description: 'Breakdown of charges' })
  breakdown: {
    basePrice: number;
    distanceCharge: number;
    surcharges: { type: string; amount: number }[];
    minimumCap?: number;
    maximumCap?: number;
  };
}
