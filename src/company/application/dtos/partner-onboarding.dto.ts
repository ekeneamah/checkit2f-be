import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUrl,
  ValidateNested,
  ArrayMinSize,
  MinLength,
  MaxLength,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceAreaRequestDto {
  @ApiProperty({ description: 'State name', example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ 
    description: 'Array of Local Government Areas', 
    example: ['Ikeja', 'Lekki', 'Victoria Island'],
    type: [String]
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  lga: string[];

  @ApiPropertyOptional({ 
    description: 'Specific areas/localities within LGAs', 
    example: ['Phase 1', 'Phase 2'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas?: string[];
}

export class CreatePartnerOnboardingDto {
  // Company Information
  @ApiProperty({ description: 'Company name', example: 'Swift Logistics Ltd' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  companyName: string;

  @ApiProperty({ description: 'Company email', example: 'info@swiftlogistics.com' })
  @IsEmail()
  @IsNotEmpty()
  companyEmail: string;

  @ApiProperty({ 
    description: 'Company phone number (Nigerian format)', 
    example: '+2348012345678' 
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?234[0-9]{10}$|^0[0-9]{10}$/, {
    message: 'Invalid Nigerian phone number format',
  })
  companyPhone: string;

  @ApiPropertyOptional({ 
    description: 'Alternate phone number', 
    example: '+2348087654321' 
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?234[0-9]{10}$|^0[0-9]{10}$/, {
    message: 'Invalid Nigerian phone number format',
  })
  alternatePhone?: string;

  // Business Registration
  @ApiPropertyOptional({ 
    description: 'Business registration number (CAC)', 
    example: 'RC123456' 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  registrationNumber?: string;

  @ApiPropertyOptional({ 
    description: 'Tax Identification Number', 
    example: '12345678-0001' 
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  taxId?: string;

  @ApiProperty({ 
    description: 'Type of business entity',
    enum: ['sole_proprietorship', 'partnership', 'limited_company'],
    example: 'limited_company'
  })
  @IsEnum(['sole_proprietorship', 'partnership', 'limited_company'])
  businessType: 'sole_proprietorship' | 'partnership' | 'limited_company';

  // Company Address
  @ApiProperty({ 
    description: 'Physical address', 
    example: '123 Admiralty Way, Lekki Phase 1' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  address: string;

  @ApiProperty({ description: 'City', example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State', example: 'Lagos' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: 'Country', example: 'Nigeria', default: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  // Service Areas
  @ApiProperty({ 
    description: 'Service coverage areas',
    type: [ServiceAreaRequestDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceAreaRequestDto)
  serviceAreas: ServiceAreaRequestDto[];

  // Owner/Contact Person
  @ApiProperty({ description: 'Owner/Manager full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  ownerName: string;

  @ApiProperty({ description: 'Owner email', example: 'john.doe@swiftlogistics.com' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty({ 
    description: 'Owner phone number', 
    example: '+2348012345678' 
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?234[0-9]{10}$|^0[0-9]{10}$/, {
    message: 'Invalid Nigerian phone number format',
  })
  ownerPhone: string;

  // Optional Business Details
  @ApiPropertyOptional({ description: 'Current number of riders', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  numberOfRiders?: number;

  @ApiPropertyOptional({ description: 'Current number of bikes', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  numberOfBikes?: number;

  @ApiPropertyOptional({ description: 'Years in business', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  yearsInBusiness?: number;

  @ApiPropertyOptional({ 
    description: 'Company description/bio', 
    example: 'Leading logistics company in Lagos with 10+ years experience' 
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Company website URL', 
    example: 'https://swiftlogistics.com' 
  })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;
}

export class UpdateOnboardingStatusDto {
  @ApiProperty({ 
    description: 'New status',
    enum: ['pending', 'under_review', 'approved', 'rejected', 'company_created'],
    example: 'under_review'
  })
  @IsEnum(['pending', 'under_review', 'approved', 'rejected', 'company_created'])
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'company_created';

  @ApiPropertyOptional({ 
    description: 'Admin notes/comments',
    example: 'All documents verified. Ready for approval.'
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  @ApiPropertyOptional({ 
    description: 'Rejection reason (required if status is rejected)',
    example: 'Invalid business registration documents'
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class PartnerOnboardingQueryDto {
  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: ['pending', 'under_review', 'approved', 'rejected', 'company_created']
  })
  @IsOptional()
  @IsEnum(['pending', 'under_review', 'approved', 'rejected', 'company_created'])
  status?: 'pending' | 'under_review' | 'approved' | 'rejected' | 'company_created';

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by company name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
