/**
 * KYC Request DTOs
 * Data Transfer Objects for KYC operations
 */
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEmail, 
  IsEnum, 
  IsNumber, 
  IsDateString, 
  ValidateNested,
  IsPhoneNumber,
  Min,
  Max,
  IsUrl,
  IsObject,
  IsArray,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  KycVerificationType, 
  KycUrgency, 
  KycEvidenceType,
  ContactMethod,
  ContactOutcome,
  RatingCategory,
  QaFlagReason,
} from '../../domain/enums';

/**
 * Customer Details DTO
 */
export class CustomerDetailsDto {
  @ApiProperty({ description: 'Customer full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Customer phone number (Nigerian format)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+234|234|0)?[789][01]\d{8}$/, { 
    message: 'Phone number must be a valid Nigerian number' 
  })
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Customer email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Bank Verification Number' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.bvn && o.bvn.length > 0)
  @Matches(/^\d{11}$/, { message: 'BVN must be 11 digits' })
  bvn?: string;

  @ApiPropertyOptional({ description: 'National Identification Number' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.nin && o.nin.length > 0)
  @Matches(/^\d{11}$/, { message: 'NIN must be 11 digits' })
  nin?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @ApiPropertyOptional({ description: 'Nationality', default: 'Nigerian' })
  @IsOptional()
  @IsString()
  nationality?: string;
}

/**
 * Location DTO
 */
export class KycLocationDto {
  @ApiProperty({ description: 'Full address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Country', default: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country: string = 'Nigeria';

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Nearby landmark' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ description: 'Access instructions' })
  @IsOptional()
  @IsString()
  accessInstructions?: string;
}

/**
 * Create KYC Request DTO (Bank API)
 */
export class CreateKycRequestDto {
  @ApiProperty({ description: 'Bank reference ID for tracking' })
  @IsString()
  @IsNotEmpty()
  bankReference: string;

  @ApiProperty({ description: 'Customer details', type: CustomerDetailsDto })
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer: CustomerDetailsDto;

  @ApiProperty({ description: 'Verification location', type: KycLocationDto })
  @ValidateNested()
  @Type(() => KycLocationDto)
  location: KycLocationDto;

  @ApiPropertyOptional({ 
    description: 'Type of verification', 
    enum: KycVerificationType,
    default: KycVerificationType.CUSTOMER_KYC 
  })
  @IsOptional()
  @IsEnum(KycVerificationType)
  verificationType?: KycVerificationType;

  @ApiPropertyOptional({ 
    description: 'Urgency level', 
    enum: KycUrgency,
    default: KycUrgency.STANDARD 
  })
  @IsOptional()
  @IsEnum(KycUrgency)
  urgency?: KycUrgency;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Update Customer Details DTO (all fields optional)
 */
export class UpdateCustomerDetailsDto {
  @ApiPropertyOptional({ description: 'Customer full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Customer phone number (Nigerian format)' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+234|234|0)?[789][01]\d{8}$/, { 
    message: 'Phone number must be a valid Nigerian number' 
  })
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Customer email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Bank Verification Number' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.bvn && o.bvn.length > 0)
  @Matches(/^\d{11}$/, { message: 'BVN must be 11 digits' })
  bvn?: string;

  @ApiPropertyOptional({ description: 'National Identification Number' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.nin && o.nin.length > 0)
  @Matches(/^\d{11}$/, { message: 'NIN must be 11 digits' })
  nin?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER';

  @ApiPropertyOptional({ description: 'Nationality' })
  @IsOptional()
  @IsString()
  nationality?: string;
}

/**
 * Update Location DTO (all fields optional)
 */
export class UpdateLocationDto {
  @ApiPropertyOptional({ description: 'Full address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Nearby landmark' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ description: 'Access instructions' })
  @IsOptional()
  @IsString()
  accessInstructions?: string;
}

/**
 * Update KYC Request DTO (Bank can update before verification starts)
 */
export class UpdateKycRequestDto {
  @ApiPropertyOptional({ description: 'Customer details updates', type: UpdateCustomerDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCustomerDetailsDto)
  customer?: UpdateCustomerDetailsDto;

  @ApiPropertyOptional({ description: 'Location updates', type: UpdateLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  location?: UpdateLocationDto;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ 
    description: 'Urgency level update', 
    enum: KycUrgency 
  })
  @IsOptional()
  @IsEnum(KycUrgency)
  urgency?: KycUrgency;
}

/**
 * Cancel KYC Request DTO
 */
export class CancelKycRequestDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Customer Confirmation DTO
 */
export class CustomerConfirmationDto {
  @ApiProperty({ description: 'Verification token from SMS link' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Customer consent given' })
  @IsNotEmpty()
  consent: boolean;

  @ApiPropertyOptional({ description: 'Confirmed/corrected customer name' })
  @IsOptional()
  @IsString()
  confirmedName?: string;

  @ApiPropertyOptional({ description: 'Confirmed/corrected customer phone' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+234|234|0)?[789][01]\d{8}$/, { 
    message: 'Phone number must be a valid Nigerian number' 
  })
  confirmedPhone?: string;

  @ApiPropertyOptional({ description: 'Client IP address for consent logging' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Preferred date for visit' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ description: 'Preferred time start (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  preferredTimeStart?: string;

  @ApiPropertyOptional({ description: 'Preferred time end (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  preferredTimeEnd?: string;

  @ApiPropertyOptional({ description: 'Updated location details', type: KycLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KycLocationDto)
  updatedLocation?: KycLocationDto;
}

/**
 * Assign Company DTO
 */
export class AssignCompanyDto {
  @ApiProperty({ description: 'Company ID to assign' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiPropertyOptional({ description: 'Notes for the company' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Assign Rider DTO
 */
export class AssignRiderDto {
  @ApiProperty({ description: 'Rider ID to assign' })
  @IsString()
  @IsNotEmpty()
  riderId: string;

  @ApiProperty({ description: 'Rider name' })
  @IsString()
  @IsNotEmpty()
  riderName: string;

  @ApiPropertyOptional({ description: 'Rider phone number' })
  @IsOptional()
  @IsString()
  riderPhone?: string;

  @ApiPropertyOptional({ description: 'Rider photo URL' })
  @IsOptional()
  @IsUrl()
  riderPhoto?: string;

  @ApiPropertyOptional({ description: 'Scheduled date for visit' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Time slot start (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  timeStart?: string;

  @ApiPropertyOptional({ description: 'Time slot end (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  timeEnd?: string;
}

/**
 * Admin Assign Rider DTO (Admin can assign directly to rider with company)
 */
export class AdminAssignRiderDto extends AssignRiderDto {
  @ApiProperty({ description: 'Company ID the rider belongs to' })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}

/**
 * Upload Introductory Letter DTO
 */
export class UploadLetterDto {
  @ApiProperty({ description: 'URL of uploaded letter' })
  @IsUrl()
  @IsNotEmpty()
  letterUrl: string;

  @ApiPropertyOptional({ description: 'Letter reference number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

/**
 * Schedule Visit DTO
 */
export class ScheduleVisitDto {
  @ApiProperty({ description: 'Scheduled date for visit' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({ description: 'Time slot start (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  scheduledTimeStart: string;

  @ApiProperty({ description: 'Time slot end (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  scheduledTimeEnd: string;
}

/**
 * Reschedule DTO
 */
export class RescheduleDto {
  @ApiProperty({ description: 'New date for visit' })
  @IsDateString()
  @IsNotEmpty()
  newDate: string;

  @ApiProperty({ description: 'New time slot start (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  newTimeStart: string;

  @ApiProperty({ description: 'New time slot end (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in HH:mm format' })
  newTimeEnd: string;

  @ApiProperty({ description: 'Reason for rescheduling' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

/**
 * Check-in DTO
 */
export class CheckInDto {
  @ApiProperty({ description: 'Current latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Current longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

/**
 * Verify OTP DTO
 */
export class VerifyOtpDto {
  @ApiProperty({ description: 'OTP entered by customer' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;
}

/**
 * Add Evidence DTO
 */
export class AddEvidenceDto {
  @ApiProperty({ description: 'Evidence type', enum: KycEvidenceType })
  @IsEnum(KycEvidenceType)
  type: KycEvidenceType;

  @ApiProperty({ description: 'Evidence URL (uploaded file)' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Description of evidence' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Latitude where evidence was captured' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude where evidence was captured' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

/**
 * Add Contact Attempt DTO
 */
export class AddContactAttemptDto {
  @ApiProperty({ description: 'Contact method used', enum: ContactMethod })
  @IsEnum(ContactMethod)
  method: ContactMethod;

  @ApiProperty({ description: 'Outcome of contact attempt', enum: ContactOutcome })
  @IsEnum(ContactOutcome)
  outcome: ContactOutcome;

  @ApiPropertyOptional({ description: 'Phone number contacted' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Notes about the attempt' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Submit Questionnaire DTO
 */
export class SubmitQuestionnaireDto {
  @ApiProperty({ description: 'Questionnaire responses' })
  @IsObject()
  @IsNotEmpty()
  responses: Record<string, unknown>;
}

/**
 * Submit Rating DTO
 */
export class SubmitRatingDto {
  @ApiProperty({ description: 'Overall rating (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({ description: 'Category-specific ratings' })
  @IsOptional()
  @IsObject()
  categoryRatings?: Record<RatingCategory, number>;

  @ApiPropertyOptional({ description: 'Comment about the experience' })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * Submit QA Review DTO
 */
export class SubmitQaReviewDto {
  @ApiProperty({ description: 'Approval status' })
  @IsNotEmpty()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Flag reasons if rejecting', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEnum(QaFlagReason, { each: true })
  flagReasons?: QaFlagReason[];

  @ApiPropertyOptional({ description: 'Review comments' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ description: 'Whether resubmission is required' })
  @IsNotEmpty()
  requiresResubmission: boolean;
}

/**
 * Query KYC Requests DTO
 */
export class QueryKycRequestsDto {
  @ApiPropertyOptional({ description: 'Search by customer name, bank reference, or address' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by bank ID' })
  @IsOptional()
  @IsString()
  bankId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (comma-separated)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by verification type' })
  @IsOptional()
  @IsEnum(KycVerificationType)
  verificationType?: KycVerificationType;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by rider ID' })
  @IsOptional()
  @IsString()
  riderId?: string;

  @ApiPropertyOptional({ description: 'Filter by date from' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date to' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
