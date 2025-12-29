import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { VerificationSpecialization, AgentStatus, AvailabilityStatus } from '../../domain/enums/agent.enum';

/**
 * Register Agent DTO
 */
export class RegisterAgentDto {
  @ApiProperty({ description: 'Firebase authentication UID', example: 'firebase_uid_123' })
  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

  @ApiProperty({ description: 'Agent first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ description: 'Agent last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ description: 'Agent email address', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Agent phone number', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Emergency contact number', example: '+1234567899' })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ description: 'Service city', example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Service areas within city', example: ['Lekki', 'Victoria Island'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  areas: string[];

  @ApiProperty({ description: 'Service radius in kilometers', example: 15, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  radius: number;

  @ApiProperty({
    description: 'Verification specializations',
    enum: VerificationSpecialization,
    isArray: true,
    example: [VerificationSpecialization.PROPERTY_INSPECTION],
  })
  @IsArray()
  @IsEnum(VerificationSpecialization, { each: true })
  @ArrayMinSize(1)
  specializations: VerificationSpecialization[];
}

/**
 * Update Agent Profile DTO
 */
export class UpdateAgentProfileDto {
  @ApiPropertyOptional({ description: 'Agent first name', example: 'John' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Agent last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Profile photo URL', example: 'https://example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ description: 'Agent phone number', example: '+1234567890' })
  @IsString()
  @IsOptional()
  @MinLength(10)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Emergency contact number', example: '+1234567899' })
  @IsString()
  @IsOptional()
  emergencyContact?: string;
}

/**
 * Update Service Area DTO
 * Supports both single city (legacy) and multi-city format
 */
export class UpdateServiceAreaDto {
  @ApiProperty({ description: 'Service city (legacy single city)', example: 'Lagos', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'Service areas within city (legacy single city)', example: ['Lekki', 'Victoria Island'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  areas?: string[];

  @ApiProperty({ description: 'Multi-city coverage areas', type: 'array', required: false })
  @IsArray()
  @IsOptional()
  cityAreas?: Array<{ city: string; areas: string[] }>;

  @ApiProperty({ description: 'Service radius in kilometers', example: 15, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  radius: number;
}

/**
 * Update Specializations DTO
 */
export class UpdateSpecializationsDto {
  @ApiProperty({
    description: 'Verification specializations',
    enum: VerificationSpecialization,
    isArray: true,
    example: [VerificationSpecialization.PROPERTY_INSPECTION],
  })
  @IsArray()
  @IsEnum(VerificationSpecialization, { each: true })
  @ArrayMinSize(1)
  specializations: VerificationSpecialization[];
}

/**
 * Update Availability DTO
 */
export class UpdateAvailabilityDto {
  @ApiProperty({
    description: 'Availability status',
    enum: AvailabilityStatus,
    example: AvailabilityStatus.AVAILABLE,
  })
  @IsEnum(AvailabilityStatus)
  availabilityStatus: AvailabilityStatus;
}

/**
 * Agent Response DTO
 */
export class AgentResponseDto {
  @ApiProperty({ description: 'Agent ID', example: 'agent_123' })
  id: string;

  @ApiProperty({ description: 'Firebase UID', example: 'firebase_uid_123' })
  firebaseUid: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  fullName: string;

  @ApiProperty({ description: 'Contact information' })
  contactInfo: {
    email: string;
    phoneNumber: string;
    emergencyContact?: string;
  };

  @ApiProperty({ description: 'Service area' })
  serviceArea: {
    city: string;
    areas: string[];
    radius: number;
  };

  @ApiProperty({
    description: 'Specializations',
    enum: VerificationSpecialization,
    isArray: true,
  })
  specializations: VerificationSpecialization[];

  @ApiProperty({ description: 'Agent status', enum: AgentStatus })
  status: AgentStatus;

  @ApiProperty({ description: 'Availability status', enum: AvailabilityStatus })
  availabilityStatus: AvailabilityStatus;

  @ApiProperty({ description: 'Agent rating information' })
  rating: {
    averageRating: number;
    totalRatings: number;
    completedVerifications: number;
    successRate: number;
  };

  @ApiPropertyOptional({ description: 'Profile photo URL' })
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ description: 'ID card URL' })
  idCardUrl?: string;

  @ApiPropertyOptional({ description: 'Certification URLs', isArray: true })
  certifications?: string[];

  @ApiProperty({ description: 'Creation date', example: '2024-01-15T10:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last modification date', example: '2024-01-15T10:30:00Z' })
  modifiedAt: string;

  @ApiPropertyOptional({ description: 'Last active date', example: '2024-01-15T10:30:00Z' })
  lastActiveAt?: string;
}

/**
 * Agent Query DTO
 */
export class AgentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by city', example: 'Lagos' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: AgentStatus })
  @IsEnum(AgentStatus)
  @IsOptional()
  status?: AgentStatus;

  @ApiPropertyOptional({ description: 'Filter by availability', enum: AvailabilityStatus })
  @IsEnum(AvailabilityStatus)
  @IsOptional()
  availabilityStatus?: AvailabilityStatus;

  @ApiPropertyOptional({ description: 'Filter by specialization', enum: VerificationSpecialization })
  @IsEnum(VerificationSpecialization)
  @IsOptional()
  specialization?: VerificationSpecialization;

  @ApiPropertyOptional({ description: 'Limit results', example: 20, minimum: 1, maximum: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', example: 0, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}

/**
 * Admin Update Agent Status DTO
 */
export class AdminUpdateAgentStatusDto {
  @ApiProperty({ description: 'New agent status', enum: AgentStatus })
  @IsEnum(AgentStatus)
  status: AgentStatus;
}
