import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestTypeCategory } from '../../domain/enums/request-type-category.enum';
import { PricingType } from '../../domain/enums/pricing-type.enum';

/**
 * DTO for querying request types with filters and pagination
 */
export class QueryRequestTypesDto {
  @IsOptional()
  @IsEnum(RequestTypeCategory)
  category?: RequestTypeCategory;

  @IsOptional()
  @IsEnum(PricingType)
  pricingType?: PricingType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(2)
  phase?: number;
  

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  supportsRecurring?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  supportsUrgent?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}
