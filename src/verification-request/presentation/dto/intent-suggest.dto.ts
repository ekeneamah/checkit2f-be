import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocationContextDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 6.5244 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 3.3792 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ description: 'Search radius in kilometers', example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number;
}

export class IntentSuggestDto {
  @ApiProperty({ 
    description: 'Natural language query describing verification intent',
    example: 'verify where meat is sold in GRA phase II Port Harcourt'
  })
  @IsString()
  @IsNotEmpty()
  queryText!: string;

  @ApiPropertyOptional({ description: 'Optional location context for better suggestions' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationContextDto)
  location?: LocationContextDto;
}

export class IntentResponseDto {
  @ApiProperty({ description: 'Detected request type', example: 'location_verification' })
  requestType!: string;

  @ApiProperty({ description: 'Suggested pricing model', example: 'radius_based' })
  pricingModel!: string;

  @ApiProperty({ description: 'Human-readable explanation of the detection', example: 'Discovery pricing applies when searching for businesses in an area' })
  reason!: string;

  @ApiProperty({ description: 'Extracted or inferred parameters' })
  parameters!: {
    radiusKm?: number;
    locations?: number;
    areaKm2?: number;
  };
}

export class PriceEstimateDto {
  @ApiProperty({ description: 'Base price before adjustments', example: 5000 })
  basePrice!: number;

  @ApiProperty({ description: 'Total price including all fees and discounts', example: 5000 })
  totalPrice!: number;

  @ApiProperty({ description: 'Currency code', example: 'NGN' })
  currency!: string;

  @ApiProperty({ description: 'Detailed price breakdown', type: [Object] })
  breakdown!: Array<{
    description: string;
    amount: number;
  }>;
}

export class IntentSuggestResponseDto {
  @ApiProperty({ description: 'Detected intent details' })
  intent!: IntentResponseDto;

  @ApiProperty({ description: 'Price estimate based on detected intent' })
  priceEstimate!: PriceEstimateDto;
}
