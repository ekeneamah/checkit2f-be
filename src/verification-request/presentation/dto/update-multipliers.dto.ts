import { IsOptional, IsObject } from 'class-validator';

export class UpdateMultipliersDto {
  @IsOptional()
  @IsObject()
  timeSlot?: Record<string, number>;

  @IsOptional()
  @IsObject()
  difficulty?: Record<string, number>;

  @IsOptional()
  @IsObject()
  mode?: Record<string, number>;

  @IsOptional()
  @IsObject()
  urgency?: Record<string, number>;
}
