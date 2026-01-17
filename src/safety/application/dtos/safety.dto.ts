import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsPhoneNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmergencyType, IncidentSeverity } from '../../domain/entities/safety.entity';
import { CoordinatesDto } from '../../../tracking/application/dtos/tracking.dto';

/**
 * Safety & Emergency DTOs
 * 
 * @author CheckIT24 Development Team
 */

// ============================================================================
// LOCATION DTOs
// ============================================================================

export class LocationPointDto {
  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Altitude in meters' })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({ description: 'Speed in m/s' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: 'Heading in degrees' })
  @IsOptional()
  @IsNumber()
  heading?: number;
}

// ============================================================================
// SOS ALERT DTOs
// ============================================================================

export class TriggerSOSDto {
  @ApiProperty({ type: LocationPointDto, description: 'Current location' })
  @ValidateNested()
  @Type(() => LocationPointDto)
  location: LocationPointDto;

  @ApiPropertyOptional({
    enum: ['sos', 'medical', 'security', 'accident', 'harassment', 'other'],
    description: 'Type of emergency',
    default: 'sos',
  })
  @IsOptional()
  @IsEnum(['sos', 'medical', 'security', 'accident', 'harassment', 'other'])
  emergencyType?: EmergencyType;

  @ApiPropertyOptional({ description: 'Optional emergency message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Current verification request ID' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;
}

export class UpdateSOSLocationDto {
  @ApiProperty({ description: 'SOS alert ID' })
  @IsNotEmpty()
  @IsString()
  alertId: string;

  @ApiProperty({ type: LocationPointDto })
  @ValidateNested()
  @Type(() => LocationPointDto)
  location: LocationPointDto;
}

export class AcknowledgeSOSDto {
  @ApiProperty({ description: 'SOS alert ID to acknowledge' })
  @IsNotEmpty()
  @IsString()
  alertId: string;
}

export class ResolveSOSDto {
  @ApiProperty({ description: 'SOS alert ID to resolve' })
  @IsNotEmpty()
  @IsString()
  alertId: string;

  @ApiProperty({ description: 'Resolution notes' })
  @IsNotEmpty()
  @IsString()
  resolutionNotes: string;

  @ApiPropertyOptional({ description: 'Was this a false alarm?', default: false })
  @IsOptional()
  @IsBoolean()
  isFalseAlarm?: boolean;
}

// ============================================================================
// INCIDENT REPORT DTOs
// ============================================================================

export class AttachmentDto {
  @ApiProperty({ description: 'Attachment type (photo, video, document)' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: 'URL to the attachment' })
  @IsNotEmpty()
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Attachment description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class WitnessDto {
  @ApiProperty({ description: 'Witness name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Witness contact' })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiPropertyOptional({ description: 'Witness statement' })
  @IsOptional()
  @IsString()
  statement?: string;
}

export class SubmitIncidentReportDto {
  @ApiProperty({
    enum: ['accident', 'harassment', 'theft', 'assault', 'medical_emergency', 'property_damage', 'traffic_violation', 'other'],
    description: 'Type of incident',
  })
  @IsNotEmpty()
  @IsEnum(['accident', 'harassment', 'theft', 'assault', 'medical_emergency', 'property_damage', 'traffic_violation', 'other'])
  type: string;

  @ApiProperty({
    enum: ['low', 'medium', 'high', 'critical'],
    description: 'Incident severity',
  })
  @IsNotEmpty()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: IncidentSeverity;

  @ApiProperty({ description: 'Incident title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description of the incident' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ type: LocationPointDto, description: 'Location where incident occurred' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationPointDto)
  location?: LocationPointDto;

  @ApiPropertyOptional({ description: 'Associated verification request ID' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;

  @ApiProperty({ description: 'When the incident occurred (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional({ type: [AttachmentDto], description: 'Attachments (photos, videos, documents)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ type: [WitnessDto], description: 'Witness information' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WitnessDto)
  witnesses?: WitnessDto[];
}

// ============================================================================
// SAFETY CHECK-IN DTOs
// ============================================================================

export class RecordCheckInDto {
  @ApiProperty({ type: LocationPointDto, description: 'Check-in location' })
  @ValidateNested()
  @Type(() => LocationPointDto)
  location: LocationPointDto;

  @ApiPropertyOptional({ description: 'Associated verification request ID' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;

  @ApiPropertyOptional({ description: 'Check-in notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Check-in photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

// ============================================================================
// SAFETY SETTINGS DTOs
// ============================================================================

export class EmergencyContactDto {
  @ApiProperty({ description: 'Contact name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Relationship to user' })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Notify on SOS', default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnSOS?: boolean;

  @ApiPropertyOptional({ description: 'Priority order', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class AddEmergencyContactDto {
  @ApiProperty({ type: EmergencyContactDto })
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  contact: EmergencyContactDto;
}

export class UpdateSafetySettingsDto {
  @ApiPropertyOptional({ description: 'Enable SOS feature' })
  @IsOptional()
  @IsBoolean()
  sosEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Automatically start recording on SOS' })
  @IsOptional()
  @IsBoolean()
  autoRecordOnSOS?: boolean;

  @ApiPropertyOptional({ description: 'Share location when SOS triggered' })
  @IsOptional()
  @IsBoolean()
  shareLocationOnSOS?: boolean;

  @ApiPropertyOptional({ description: 'Trigger SOS on inactivity timeout' })
  @IsOptional()
  @IsBoolean()
  autoSOSOnInactivity?: boolean;

  @ApiPropertyOptional({ description: 'Inactivity timeout in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  inactivityTimeoutMinutes?: number;

  @ApiPropertyOptional({ description: 'Enable panic button' })
  @IsOptional()
  @IsBoolean()
  panicButtonEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Notify company on SOS (for riders)' })
  @IsOptional()
  @IsBoolean()
  notifyCompanyOnSOS?: boolean;
}

// ============================================================================
// LIVE LOCATION SHARING DTOs
// ============================================================================

export class StartLiveLocationShareDto {
  @ApiProperty({ description: 'Duration in minutes', minimum: 15, maximum: 480 })
  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Associated verification request ID' })
  @IsOptional()
  @IsString()
  verificationRequestId?: string;

  @ApiPropertyOptional({
    type: 'array',
    description: 'Recipients to share with',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['company', 'contact', 'public'] },
        recipientId: { type: 'string' },
        recipientName: { type: 'string' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  sharedWith?: Array<{
    type: 'company' | 'contact' | 'public';
    recipientId?: string;
    recipientName?: string;
  }>;
}

export class StopLiveLocationShareDto {
  @ApiProperty({ description: 'Live location session ID' })
  @IsNotEmpty()
  @IsString()
  sessionId: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class SOSAlertResponseDto {
  @ApiProperty({ description: 'SOS alert ID' })
  id: string;

  @ApiProperty({ description: 'Alert status' })
  status: string;

  @ApiProperty({ description: 'Emergency type' })
  emergencyType: string;

  @ApiProperty({ description: 'When the alert was triggered' })
  triggeredAt: Date;

  @ApiPropertyOptional({ description: 'Number of contacts notified' })
  notifiedContactsCount?: number;
}

export class LiveLocationShareResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Share token for accessing location' })
  shareToken: string;

  @ApiProperty({ description: 'Shareable URL' })
  shareUrl: string;

  @ApiProperty({ description: 'Session expiry time' })
  expiresAt: Date;
}

export class SafetySettingsResponseDto {
  @ApiProperty({ description: 'SOS enabled' })
  sosEnabled: boolean;

  @ApiProperty({ description: 'Auto-record on SOS' })
  autoRecordOnSOS: boolean;

  @ApiProperty({ description: 'Share location on SOS' })
  shareLocationOnSOS: boolean;

  @ApiProperty({ description: 'Number of emergency contacts' })
  emergencyContactsCount: number;

  @ApiProperty({ description: 'Panic button enabled' })
  panicButtonEnabled: boolean;
}
