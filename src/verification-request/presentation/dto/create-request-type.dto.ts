import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
  Max,
  IsObject,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestTypeCategory } from '../../domain/enums/request-type-category.enum';
import { PricingType } from '../../domain/enums/pricing-type.enum';
import { AgentLevel } from '../../domain/enums/agent-level.enum';
import { AgentSpecialization } from '../../domain/enums/agent-specialization.enum';
import { RecurringFrequency } from '../../domain/enums/recurring-frequency.enum';

/**
 * DTO for creating a new request type
 * Follows validation best practices with class-validator
 */

class RadiusTierDto {
  @IsNumber()
  @Min(0)
  minRadius: number;

  @IsNumber()
  @Min(0)
  maxRadius: number;

  @IsNumber()
  @Min(0)
  price: number;
}

class RadiusPricingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RadiusTierDto)
  tiers: RadiusTierDto[];

  @IsString()
  @IsNotEmpty()
  unit: string; // 'km' or 'miles'
}

class PriceTierDto {
  @IsNumber()
  @Min(1)
  minLocations: number;

  @IsNumber()
  @Min(1)
  maxLocations: number;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Min(0)
  pricePerLocation: number;
}

class TieredPricingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  tiers: PriceTierDto[];

  @IsBoolean()
  allowCustomTiers: boolean;
}

class PremiumMultiplierDto {
  @IsNumber()
  @Min(1)
  multiplier: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}

class RecurringDiscountDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsNumber()
  @Min(1)
  minimumOccurrences: number;

  @IsArray()
  @IsEnum(RecurringFrequency, { each: true })
  allowedFrequencies: RecurringFrequency[];
}

class CustomerInputFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'text', 'number', 'date', 'select', 'multiselect', 'file'

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  validation?: any;
}

class DeliverableDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsBoolean()
  isRequired: boolean;

  @IsOptional()
  @IsString()
  format?: string;
}

class AgentRequirementDto {
  @IsEnum(AgentLevel)
  minimumLevel: AgentLevel;

  @IsArray()
  @IsEnum(AgentSpecialization, { each: true })
  requiredSpecializations: AgentSpecialization[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minimumRating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCertifications?: string[];

  @IsOptional()
  @IsBoolean()
  requiresInternetAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresMeasuringTools?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresCamera?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresVehicle?: boolean;
}

class FAQDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;
}

class ExampleDto {
  @IsString()
  @IsNotEmpty()
  scenario: string;

  @IsString()
  @IsNotEmpty()
  expectedOutcome: string;
}

export class CreateRequestTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(RequestTypeCategory)
  category: RequestTypeCategory;

  @IsEnum(PricingType)
  pricingType: PricingType;

  @IsNumber()
  @Min(1)
  @Max(2)
  phase: number;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isDefault: boolean;

  // Pricing configurations based on pricingType
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RadiusPricingDto)
  radiusPricing?: RadiusPricingDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerLocation?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TieredPricingDto)
  tieredPricing?: TieredPricingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PremiumMultiplierDto)
  premiumMultiplier?: PremiumMultiplierDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringDiscountDto)
  recurringDiscount?: RecurringDiscountDto;

  // Requirements and configurations
  @IsNumber()
  @Min(1)
  minLocations: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxLocations?: number;

  @IsBoolean()
  allowMultipleLocations: boolean;

  @IsBoolean()
  supportsRecurring: boolean;

  @IsBoolean()
  supportsUrgent: boolean;

  @IsBoolean()
  requiresScheduling: boolean;

  @IsNumber()
  @Min(1)
  estimatedDurationHours: number;

  @IsNumber()
  @Min(1)
  slaHours: number;

  @IsNumber()
  @Min(0)
  maxExtensionHours: number;

  @IsNumber()
  @Min(0)
  sortOrder: number;

  // Nested objects
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomerInputFieldDto)
  customerInputFields: CustomerInputFieldDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliverableDto)
  deliverables: DeliverableDto[];

  @ValidateNested()
  @Type(() => AgentRequirementDto)
  agentRequirements: AgentRequirementDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FAQDto)
  faqs?: FAQDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExampleDto)
  examples?: ExampleDto[];

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
