import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============ SERVICE AREA ============

export class ServiceAreaDto {
  @ApiProperty({
    description: 'Local Government Area (LGA)',
    example: 'Port Harcourt'
  })
  @IsString()
  lga: string;

  @ApiPropertyOptional({
    description: 'Specific localities/areas within the LGA. Empty/null = serve entire LGA',
    example: ['Old GRA', 'New GRA', 'D-Line'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  localities?: string[];

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  coordinates?: { lat: number; lng: number };

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  radiusKm?: number;
}

// ============ COMPANY SETTINGS ============

export class CompanySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoAssignEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['proximity', 'round_robin', 'least_busy', 'manual'] })
  @IsOptional()
  @IsEnum(['proximity', 'round_robin', 'least_busy', 'manual'])
  assignmentMethod?: 'proximity' | 'round_robin' | 'least_busy' | 'manual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxDistanceKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxActiveAssignments?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireBikeAssignment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowSelfAssign?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOnNewRequest?: boolean;
}

// ============ CREATE COMPANY ============

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Company email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Company phone' })
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiProperty({ description: 'Owner Firebase UID' })
  @IsString()
  ownerId: string;

  @ApiProperty({ description: 'Owner name' })
  @IsString()
  ownerName: string;

  @ApiProperty({ description: 'Owner email' })
  @IsEmail()
  ownerEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ enum: ['sole_proprietorship', 'partnership', 'limited_company'] })
  @IsEnum(['sole_proprietorship', 'partnership', 'limited_company'])
  businessType: 'sole_proprietorship' | 'partnership' | 'limited_company';

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional({ type: [ServiceAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  serviceAreas?: ServiceAreaDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];
}

// ============ UPDATE COMPANY ============

export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ type: [ServiceAreaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaDto)
  serviceAreas?: ServiceAreaDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanySettingsDto)
  settings?: CompanySettingsDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];
}

// ============ COMPANY RESPONSE ============

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  alternatePhone?: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  ownerName: string;

  @ApiProperty()
  businessType: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  country: string;

  @ApiProperty({ type: [ServiceAreaDto] })
  serviceAreas: ServiceAreaDto[];

  @ApiProperty()
  settings: CompanySettingsDto;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiPropertyOptional()
  stats?: {
    totalRiders: number;
    activeRiders: number;
    totalBikes: number;
    activeBikes: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    averageRating: number;
    totalEarnings: number;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============ COMPANY STATS ============

export class CompanyStatsResponseDto {
  @ApiProperty()
  totalRequests: number;

  @ApiProperty()
  completedToday: number;

  @ApiProperty()
  pendingAssignments: number;

  @ApiProperty()
  activeRiders: number;

  @ApiProperty()
  totalRiders: number;

  @ApiProperty()
  activeBikes: number;

  @ApiProperty()
  totalBikes: number;

  @ApiProperty()
  earnings: {
    today: number;
    week: number;
    month: number;
  };

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  completionRate: number;
}
