import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, Min, IsIn } from 'class-validator';

export class CalculatePriceV2Dto {
  @IsString()
  @IsNotEmpty()
  requestTypeId: string;

  @IsNumber()
  @Min(1)
  locationCount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaKm2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsString()
  @IsIn(['standard', 'urgent', 'express', 'immediate'])
  urgency: string;

  @IsOptional()
  @IsString()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: string;

  @IsOptional()
  @IsString()
  @IsIn(['in_person', 'remote'])
  mode?: string;

  @IsOptional()
  @IsString()
  scheduledDate?: string; // ISO string

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  recurringCount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['bronze', 'silver', 'gold', 'platinum'])
  customerTier?: string;

  @IsOptional()
  @IsString()
  promotionalCode?: string;
}
