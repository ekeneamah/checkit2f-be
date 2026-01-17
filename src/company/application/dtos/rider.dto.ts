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
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RiderStatus,
  DocumentType,
  DocumentStatus,
} from '../../domain/entities/rider.entity';

// ============ RIDER DOCUMENT ============

export class RiderDocumentDto {
  @ApiProperty({ enum: ['profile_photo', 'national_id', 'drivers_license', 'passport', 'address_proof', 'guarantor_id', 'guarantor_letter', 'police_clearance', 'medical_certificate', 'other'] })
  @IsEnum(['profile_photo', 'national_id', 'drivers_license', 'passport', 'address_proof', 'guarantor_id', 'guarantor_letter', 'police_clearance', 'medical_certificate', 'other'])
  type: DocumentType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: ['pending', 'verified', 'rejected', 'expired'] })
  @IsEnum(['pending', 'verified', 'rejected', 'expired'])
  status: DocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ============ GUARANTOR ============

export class GuarantorDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  relationship: string;

  @ApiProperty()
  @IsString()
  occupation: string;

  @ApiProperty()
  @IsString()
  idType: string;

  @ApiProperty()
  @IsString()
  idNumber: string;
}

// ============ EMERGENCY CONTACT ============

export class EmergencyContactDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  relationship: string;
}

// ============ SCHEDULE ============

export class WorkShiftDto {
  @ApiProperty({ description: 'Start time in HH:mm format' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm format' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes' })
  @IsOptional()
  @IsNumber()
  breakDuration?: number;
}

export class DayScheduleDto {
  @ApiProperty({ enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] })
  @IsEnum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

  @ApiProperty()
  @IsBoolean()
  isAvailable: boolean;

  @ApiProperty({ type: [WorkShiftDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkShiftDto)
  shifts: WorkShiftDto[];
}

export class RiderScheduleDto {
  @ApiProperty({ type: [DayScheduleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[];

  @ApiProperty()
  @IsString()
  timezone: string;

  @ApiProperty()
  @IsBoolean()
  isFlexible: boolean;
}

// ============ TIME OFF ============

export class CreateTimeOffRequestDto {
  @ApiProperty({ enum: ['vacation', 'sick', 'personal', 'other'] })
  @IsEnum(['vacation', 'sick', 'personal', 'other'])
  type: 'vacation' | 'sick' | 'personal' | 'other';

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateTimeOffRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';
}

// ============ LOCATION ============

export class RiderLocationDto {
  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

// ============ CREATE RIDER ============

export class CreateRiderDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiProperty({ enum: ['nin', 'bvn', 'drivers_license', 'passport', 'voters_card'] })
  @IsEnum(['nin', 'bvn', 'drivers_license', 'passport', 'voters_card'])
  idType: 'nin' | 'bvn' | 'drivers_license' | 'passport' | 'voters_card';

  @ApiProperty()
  @IsString()
  idNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

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

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GuarantorDto)
  guarantor?: GuarantorDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}

// ============ UPDATE RIDER ============

export class UpdateRiderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

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
  profilePhotoUrl?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GuarantorDto)
  guarantor?: GuarantorDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;
}

// ============ UPDATE RIDER STATUS ============

export class UpdateRiderStatusDto {
  @ApiProperty({ enum: ['pending', 'active', 'suspended', 'inactive'] })
  @IsEnum(['pending', 'active', 'suspended', 'inactive'])
  status: RiderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// ============ ASSIGN BIKE TO RIDER ============

export class AssignBikeDto {
  @ApiProperty()
  @IsString()
  bikeId: string;
}

// ============ RIDER RESPONSE ============

export class RiderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  alternatePhone?: string;

  @ApiProperty()
  idType: string;

  @ApiProperty()
  idNumber: string;

  @ApiPropertyOptional()
  profilePhotoUrl?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  isAvailable: boolean;

  @ApiPropertyOptional()
  lastActiveAt?: Date;

  @ApiPropertyOptional()
  currentLocation?: RiderLocationDto;

  @ApiPropertyOptional()
  assignedBikeId?: string;

  @ApiPropertyOptional()
  assignedBikePlate?: string;

  @ApiProperty()
  activeAssignments: number;

  @ApiProperty()
  onboardingComplete: boolean;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  totalCompletedTasks: number;

  @ApiPropertyOptional()
  stats?: {
    totalAssignments: number;
    completedAssignments: number;
    averageRating: number;
    totalEarnings: number;
    thisMonthEarnings: number;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============ RIDER QUERY ============

export class RiderQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'active', 'suspended', 'inactive'] })
  @IsOptional()
  @IsEnum(['pending', 'active', 'suspended', 'inactive'])
  status?: RiderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOnline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onboardingComplete?: boolean;
}
