import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationTypeEnum, VerificationUrgency } from '../../domain';

/**
 * Location DTO for verification requests
 */
export class LocationDto {
  @ApiProperty({
    description: 'Full address of the location',
    example: '123 Main Street, Downtown, Lagos, Nigeria',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 6.5244,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 3.3792,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Google Places ID',
    example: 'ChIJiQHsW0K5OBAR7ZztSHo9fHs',
  })
  @IsString()
  @IsOptional()
  placeId?: string;

  @ApiPropertyOptional({
    description: 'Nearby landmark for easier identification',
    example: 'Opposite Shoprite Mall',
  })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiPropertyOptional({
    description: 'Special access instructions',
    example: 'Use the side entrance, ask for Mr. John at the gate',
  })
  @IsString()
  @IsOptional()
  accessInstructions?: string;
}

/**
 * Verification type DTO
 */
export class VerificationTypeDto {
  @ApiProperty({
    description: 'Type of verification required',
    enum: VerificationTypeEnum,
    example: VerificationTypeEnum.PROPERTY_INSPECTION,
  })
  @IsEnum(VerificationTypeEnum)
  type: VerificationTypeEnum;

  @ApiProperty({
    description: 'Urgency level for the verification',
    enum: VerificationUrgency,
    example: VerificationUrgency.STANDARD,
  })
  @IsEnum(VerificationUrgency)
  urgency: VerificationUrgency;

  @ApiPropertyOptional({
    description: 'Whether physical presence is required',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  requiresPhysicalPresence?: boolean;

  @ApiPropertyOptional({
    description: 'Estimated duration in minutes',
    example: 60,
    minimum: 1,
    maximum: 480,
    default: 60,
  })
  @IsNumber()
  @Min(1)
  @Max(480)
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Special instructions for the verification',
    example: 'Please verify all documents are original and take detailed photos',
  })
  @IsString()
  @IsOptional()
  specialInstructions?: string;
}

/**
 * Create verification request DTO
 */
export class CreateVerificationRequestDto {
  @ApiProperty({
    description: 'Title of the verification request',
    example: 'Property Inspection for Apartment Purchase',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of what needs to be verified',
    example: 'I need a thorough inspection of a 3-bedroom apartment in Lekki Phase 1. Please verify the condition of all rooms, plumbing, electrical systems, and any structural issues.',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Verification type details',
    type: VerificationTypeDto,
  })
  verificationType: VerificationTypeDto;

  @ApiProperty({
    description: 'Location details for the verification',
    type: LocationDto,
  })
  location: LocationDto;

  @ApiPropertyOptional({
    description: 'Preferred scheduled date for verification (ISO string)',
    example: '2024-01-20T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or requirements',
    example: 'Please contact me 30 minutes before arrival',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Array of attachment URLs',
    example: ['https://example.com/document1.pdf', 'https://example.com/image1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Payment reference from payment gateway (e.g., Paystack)',
    example: 'REQ-1234567890-abc123',
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;
}

/**
 * Update verification request DTO
 */
export class UpdateVerificationRequestDto {
  @ApiPropertyOptional({
    description: 'Updated title of the verification request',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of what needs to be verified',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated verification type details',
    type: VerificationTypeDto,
  })
  @IsOptional()
  verificationType?: VerificationTypeDto;

  @ApiPropertyOptional({
    description: 'Updated location details',
    type: LocationDto,
  })
  @IsOptional()
  location?: LocationDto;

  @ApiPropertyOptional({
    description: 'Updated scheduled date (ISO string)',
  })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Updated notes or requirements',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * Verification request response DTO
 */
export class VerificationRequestResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the verification request',
    example: 'req_1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Client ID who created the request',
    example: 'user_1234567890abcdef',
  })
  clientId: string;

  @ApiProperty({
    description: 'Title of the verification request',
    example: 'Property Inspection for Apartment Purchase',
  })
  title: string;

  @ApiProperty({
    description: 'Description of the verification request',
    example: 'Thorough inspection of 3-bedroom apartment...',
  })
  description: string;

  @ApiProperty({
    description: 'Verification type details',
    type: VerificationTypeDto,
  })
  verificationType: VerificationTypeDto;

  @ApiProperty({
    description: 'Location details',
    type: LocationDto,
  })
  location: LocationDto;

  @ApiProperty({
    description: 'Current status of the request',
    example: 'SUBMITTED',
  })
  status: string;

  @ApiProperty({
    description: 'Price details',
    example: { amount: 50.00, currency: 'USD' },
  })
  price: {
    amount: number;
    currency: string;
  };

  @ApiPropertyOptional({
    description: 'ID of assigned agent',
    example: 'agent_1234567890abcdef',
  })
  assignedAgentId?: string;

  @ApiPropertyOptional({
    description: 'Scheduled date for verification',
    example: '2024-01-20T10:00:00Z',
  })
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Estimated completion date',
    example: '2024-01-22T10:00:00Z',
  })
  estimatedCompletionDate?: string;

  @ApiPropertyOptional({
    description: 'Actual completion date',
    example: '2024-01-21T15:30:00Z',
  })
  actualCompletionDate?: string;

  @ApiProperty({
    description: 'Array of attachment URLs',
    example: ['https://example.com/document1.pdf'],
  })
  attachments: string[];

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Please contact me 30 minutes before arrival',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Payment ID',
    example: 'pay_1234567890abcdef',
  })
  paymentId?: string;

  @ApiProperty({
    description: 'Payment status',
    example: 'pending',
  })
  paymentStatus: string;

  @ApiProperty({
    description: 'Request creation date',
    example: '2024-01-15T10:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last modification date',
    example: '2024-01-15T10:30:00Z',
  })
  modifiedAt: string;
}

/**
 * Assign agent DTO
 */
export class AssignAgentDto {
  @ApiProperty({
    description: 'ID of the agent to assign',
    example: 'agent_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

/**
 * Status change DTO
 */
export class ChangeStatusDto {
  @ApiProperty({
    description: 'New status for the verification request',
    example: 'IN_PROGRESS',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({
    description: 'Reason for status change (required for certain statuses)',
    example: 'Client requested cancellation due to budget constraints',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Query parameters for listing verification requests
 */
export class VerificationRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'SUBMITTED',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification type',
    enum: VerificationTypeEnum,
  })
  @IsEnum(VerificationTypeEnum)
  @IsOptional()
  type?: VerificationTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by assigned agent',
    example: 'agent_1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'modifiedAt', 'scheduledDate', 'price'],
  })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}