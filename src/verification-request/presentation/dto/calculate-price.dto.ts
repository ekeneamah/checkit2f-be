import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '../../domain/enums/recurring-frequency.enum';

/**
 * DTO for recurring schedule in price calculation
 */
class RecurringScheduleDto {
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @IsNumber()
  @Min(1)
  numberOfOccurrences: number;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO date string
}

/**
 * DTO for calculating price based on request type and parameters
 */
export class CalculatePriceDto {
  @IsString()
  @IsNotEmpty()
  requestTypeId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  locationCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringScheduleDto)
  recurringSchedule?: RecurringScheduleDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tier?: number; // For tiered pricing, tier index
}

/**
 * Response DTO for price calculation
 */
export class PriceCalculationResponseDto {
  requestTypeId: string;
  requestTypeName: string;
  basePrice: number;
  urgentFee?: number;
  recurringDiscount?: number;
  totalPrice: number;
  currency: string;
  breakdown: {
    description: string;
    amount: number;
  }[];
  calculatedAt: string;
}
