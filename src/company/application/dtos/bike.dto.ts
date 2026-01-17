import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BikeStatus,
  FuelType,
  MaintenanceType,
  InsuranceType,
} from '../../domain/entities/bike.entity';

// ============ MAINTENANCE ============

export class CreateMaintenanceRecordDto {
  @ApiProperty({ enum: ['routine', 'repair', 'emergency', 'inspection'] })
  @IsEnum(['routine', 'repair', 'emergency', 'inspection'])
  type: MaintenanceType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty()
  @IsString()
  performedBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mileageAtService?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextServiceDue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nextServiceMileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  parts?: { name: string; quantity: number; cost: number }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

// ============ INSURANCE ============

export class VehicleInsuranceDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  policyNumber: string;

  @ApiProperty({ enum: ['comprehensive', 'third_party', 'basic'] })
  @IsEnum(['comprehensive', 'third_party', 'basic'])
  type: InsuranceType;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  expiryDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  premium: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverage?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}

// ============ VEHICLE DOCUMENT ============

export class VehicleDocumentDto {
  @ApiProperty({ enum: ['registration', 'insurance', 'roadworthiness', 'permit', 'other'] })
  @IsEnum(['registration', 'insurance', 'roadworthiness', 'permit', 'other'])
  type: 'registration' | 'insurance' | 'roadworthiness' | 'permit' | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

// ============ CREATE BIKE ============

export class CreateBikeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  registrationNumber: string;

  @ApiProperty()
  @IsString()
  plateNumber: string;

  @ApiProperty()
  @IsString()
  make: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsNumber()
  year: number;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  engineCapacity?: number;

  @ApiPropertyOptional({ enum: ['petrol', 'diesel', 'electric', 'hybrid'] })
  @IsOptional()
  @IsEnum(['petrol', 'diesel', 'electric', 'hybrid'])
  fuelType?: FuelType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chassisNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  engineNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialMileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleInsuranceDto)
  insurance?: VehicleInsuranceDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;
}

// ============ UPDATE BIKE ============

export class UpdateBikeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: ['active', 'maintenance', 'inactive', 'decommissioned'] })
  @IsOptional()
  @IsEnum(['active', 'maintenance', 'inactive', 'decommissioned'])
  status?: BikeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleInsuranceDto)
  insurance?: VehicleInsuranceDto;
}

// ============ UPDATE BIKE STATUS ============

export class UpdateBikeStatusDto {
  @ApiProperty({ enum: ['active', 'maintenance', 'inactive', 'decommissioned'] })
  @IsEnum(['active', 'maintenance', 'inactive', 'decommissioned'])
  status: BikeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// ============ UPDATE MILEAGE ============

export class UpdateMileageDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  mileage: number;
}

// ============ ASSIGN BIKE ============

export class AssignBikeToRiderDto {
  @ApiProperty()
  @IsString()
  riderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============ BIKE RESPONSE ============

export class BikeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  registrationNumber: string;

  @ApiProperty()
  plateNumber: string;

  @ApiProperty()
  make: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  color: string;

  @ApiPropertyOptional()
  engineCapacity?: number;

  @ApiProperty()
  fuelType: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  assignedRiderId?: string;

  @ApiPropertyOptional()
  assignedRiderName?: string;

  @ApiPropertyOptional()
  dateAssigned?: Date;

  @ApiPropertyOptional()
  currentMileage?: number;

  @ApiPropertyOptional()
  lastMileageUpdate?: Date;

  @ApiPropertyOptional()
  lastMaintenanceDate?: Date;

  @ApiPropertyOptional()
  nextMaintenanceDate?: Date;

  @ApiPropertyOptional()
  insurance?: VehicleInsuranceDto;

  @ApiPropertyOptional()
  totalCosts?: {
    maintenance: number;
    fuel: number;
    insurance: number;
    repairs: number;
    other: number;
    total: number;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============ BIKE QUERY ============

export class BikeQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'maintenance', 'inactive', 'decommissioned'] })
  @IsOptional()
  @IsEnum(['active', 'maintenance', 'inactive', 'decommissioned'])
  status?: BikeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedRiderId?: string;

  @ApiPropertyOptional({ description: 'Get only unassigned bikes' })
  @IsOptional()
  @Type(() => Boolean)
  unassigned?: boolean;
}
