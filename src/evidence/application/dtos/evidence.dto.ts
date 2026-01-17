import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Evidence Collection DTOs
 * 
 * DTOs for capturing geo-tagged photos, videos, documents, signatures, and voice memos.
 */

export class GeoTagDto {
  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty()
  @IsDateString()
  capturedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class DeviceInfoDto {
  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsString()
  os: string;

  @ApiProperty()
  @IsString()
  osVersion: string;
}

export class UploadPhotoEvidenceDto {
  @ApiProperty({ description: 'Verification request ID' })
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ 
    description: 'Photo category',
    enum: ['location', 'subject', 'document', 'id_card', 'proof', 'panorama', 'other']
  })
  @IsEnum(['location', 'subject', 'document', 'id_card', 'proof', 'panorama', 'other'])
  category: string;

  @ApiProperty({ type: GeoTagDto })
  @ValidateNested()
  @Type(() => GeoTagDto)
  geoTag: GeoTagDto;

  @ApiPropertyOptional({ type: DeviceInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;

  @ApiPropertyOptional({ description: 'Notes about the photo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UploadVideoEvidenceDto {
  @ApiProperty()
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ type: GeoTagDto })
  @ValidateNested()
  @Type(() => GeoTagDto)
  geoTag: GeoTagDto;

  @ApiProperty({ description: 'Maximum allowed duration in seconds' })
  @IsNumber()
  @Min(5)
  @Max(300)
  maxDurationSeconds: number;

  @ApiProperty({ description: 'Actual video duration' })
  @IsNumber()
  @Min(1)
  actualDurationSeconds: number;

  @ApiPropertyOptional({ description: 'Whether video has audio' })
  @IsOptional()
  @IsBoolean()
  hasAudio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UploadDocumentEvidenceDto {
  @ApiProperty()
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ 
    description: 'Document type',
    enum: ['id_card', 'passport', 'utility_bill', 'bank_statement', 'certificate', 'contract', 'other']
  })
  @IsEnum(['id_card', 'passport', 'utility_bill', 'bank_statement', 'certificate', 'contract', 'other'])
  documentType: string;

  @ApiProperty({ type: GeoTagDto })
  @ValidateNested()
  @Type(() => GeoTagDto)
  geoTag: GeoTagDto;

  @ApiPropertyOptional({ description: 'Number of pages' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageCount?: number;

  @ApiPropertyOptional({ description: 'Request OCR processing' })
  @IsOptional()
  @IsBoolean()
  requestOcr?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CaptureSignatureDto {
  @ApiProperty()
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ description: 'Base64 encoded signature data' })
  @IsString()
  signatureData: string;

  @ApiProperty({ description: 'Name of the person signing' })
  @IsString()
  @MaxLength(100)
  signedByName: string;

  @ApiProperty({ description: 'Role of the person signing' })
  @IsString()
  @MaxLength(50)
  signedByRole: string;

  @ApiPropertyOptional({ description: 'Whether ID was verified' })
  @IsOptional()
  @IsBoolean()
  idVerified?: boolean;

  @ApiProperty({ type: GeoTagDto })
  @ValidateNested()
  @Type(() => GeoTagDto)
  geoTag: GeoTagDto;

  @ApiProperty({ description: 'Legal disclaimer text shown before signing' })
  @IsString()
  legalDisclaimer: string;
}

export class UploadVoiceMemoDto {
  @ApiProperty()
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ description: 'Duration in seconds' })
  @IsNumber()
  @Min(1)
  @Max(600)
  durationSeconds: number;

  @ApiProperty({ type: GeoTagDto })
  @ValidateNested()
  @Type(() => GeoTagDto)
  geoTag: GeoTagDto;

  @ApiPropertyOptional({ description: 'Request transcription' })
  @IsOptional()
  @IsBoolean()
  requestTranscription?: boolean;

  @ApiPropertyOptional({ description: 'Language of the recording' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}

export class QualityValidationResponseDto {
  @ApiProperty()
  isValid: boolean;

  @ApiProperty()
  overallScore: number;

  @ApiPropertyOptional()
  blurScore?: number;

  @ApiPropertyOptional()
  brightnessScore?: number;

  @ApiPropertyOptional()
  gpsAccuracyMeters?: number;

  @ApiProperty()
  isAcceptable: boolean;

  @ApiPropertyOptional({ type: [String] })
  rejectionReasons?: string[];

  @ApiPropertyOptional({ type: [String] })
  warnings?: string[];

  @ApiPropertyOptional({ type: [String] })
  suggestions?: string[];
}

export class EvidenceCollectionStatusDto {
  @ApiProperty()
  verificationRequestId: string;

  @ApiProperty()
  completionPercentage: number;

  @ApiProperty({ enum: ['incomplete', 'complete', 'exceeded'] })
  status: string;

  @ApiProperty({ type: 'array' })
  requiredEvidence: Array<{
    type: string;
    category?: string;
    minCount: number;
    maxCount: number;
    currentCount: number;
    isComplete: boolean;
  }>;

  @ApiProperty({ type: 'array' })
  collectedEvidence: Array<{
    id: string;
    type: string;
    category?: string;
    status: string;
    thumbnailUrl?: string;
    capturedAt: string;
  }>;
}
