import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsBoolean, 
  IsObject, 
  IsDate, 
  IsNumber, 
  ValidateNested, 
  IsPhoneNumber,
  IsUrl,
  IsUUID,
  Length,
  ArrayMinSize,
  ArrayMaxSize,
  IsISO8601,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationPriority,
  TemplateCategory,
  PreferenceType,
  NotificationType,
  NotificationProvider,
  DeliveryStatus,
} from '../interfaces/notification.interface';

/**
 * Notification Service DTOs
 * 
 * Data Transfer Objects for notification service API endpoints
 * with comprehensive validation and Swagger documentation.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

// ============================================================================
// Email DTOs
// ============================================================================

export class EmailAddressDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Display name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}

export class EmailAttachmentDto {
  @ApiProperty({ example: 'document.pdf', description: 'Filename' })
  @IsString()
  @Length(1, 255)
  filename: string;

  @ApiProperty({ description: 'File content (base64 encoded string or Buffer)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'application/pdf', description: 'MIME type' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ 
    example: 'attachment', 
    description: 'Content disposition',
    enum: ['attachment', 'inline'],
  })
  @IsOptional()
  @IsEnum(['attachment', 'inline'])
  disposition?: 'attachment' | 'inline';

  @ApiPropertyOptional({ example: 'logo', description: 'Content ID for inline attachments' })
  @IsOptional()
  @IsString()
  contentId?: string;
}

export class SendEmailDto {
  @ApiProperty({ 
    description: 'Recipient email address(es)',
    oneOf: [
      { $ref: '#/components/schemas/EmailAddressDto' },
      { type: 'array', items: { $ref: '#/components/schemas/EmailAddressDto' } }
    ]
  })
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  to: EmailAddressDto | EmailAddressDto[];

  @ApiPropertyOptional({ description: 'Sender email address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailAddressDto)
  from?: EmailAddressDto;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailAddressDto)
  replyTo?: EmailAddressDto;

  @ApiPropertyOptional({ description: 'CC recipients' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  cc?: EmailAddressDto[];

  @ApiPropertyOptional({ description: 'BCC recipients' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAddressDto)
  bcc?: EmailAddressDto[];

  @ApiProperty({ example: 'Welcome to CheckIT24!', description: 'Email subject' })
  @IsString()
  @Length(1, 255)
  subject: string;

  @ApiPropertyOptional({ description: 'HTML email content' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Plain text email content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ 
    description: 'Template variables',
    example: { name: 'John', company: 'CheckIT24' }
  })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Email attachments' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @ApiPropertyOptional({ 
    description: 'Email priority',
    enum: NotificationPriority,
    example: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Track email clicks' })
  @IsOptional()
  @IsBoolean()
  trackClicks?: boolean;

  @ApiPropertyOptional({ description: 'Track email opens' })
  @IsOptional()
  @IsBoolean()
  trackOpens?: boolean;

  @ApiPropertyOptional({ description: 'Email tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Schedule email for later delivery' })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => new Date(value))
  scheduledAt?: Date;
}

export class BulkEmailDto {
  @ApiProperty({ description: 'Array of email requests' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SendEmailDto)
  emails: SendEmailDto[];

  @ApiPropertyOptional({ 
    description: 'Batch size for sending emails',
    example: 100,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @ApiPropertyOptional({ 
    description: 'Delay between batches in milliseconds',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  delayBetweenBatches?: number;
}

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'Welcome Email', description: 'Template name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'Welcome to {{company}}!', description: 'Email subject' })
  @IsString()
  @Length(1, 255)
  subject: string;

  @ApiProperty({ description: 'HTML email template content' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text template content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiProperty({ 
    description: 'Template category',
    enum: TemplateCategory,
    example: TemplateCategory.WELCOME,
  })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ 
    description: 'Available template variables',
    example: ['name', 'company', 'activationUrl'],
  })
  @IsArray()
  @IsString({ each: true })
  variables: string[];

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  subject?: string;

  @ApiPropertyOptional({ description: 'HTML email template content' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Plain text template content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Available template variables' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// SMS DTOs
// ============================================================================

export class SendSMSDto {
  @ApiProperty({ 
    description: 'Recipient phone number(s)',
    oneOf: [
      { type: 'string', example: '+1234567890' },
      { type: 'array', items: { type: 'string' }, example: ['+1234567890', '+0987654321'] }
    ]
  })
  @IsString()
  to: string | string[];

  @ApiPropertyOptional({ 
    example: '+1234567890', 
    description: 'Sender phone number (optional, uses default if not provided)' 
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ 
    example: 'Your verification code is: 123456',
    description: 'SMS message content',
  })
  @IsString()
  @Length(1, 1600) // SMS character limit
  message: string;

  @ApiPropertyOptional({ description: 'SMS template ID to use' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ 
    description: 'Template variables',
    example: { code: '123456', name: 'John' }
  })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'SMS priority',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Media URLs for MMS messages' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Track SMS delivery status' })
  @IsOptional()
  @IsBoolean()
  trackDelivery?: boolean;

  @ApiPropertyOptional({ description: 'SMS tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Schedule SMS for later delivery' })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => new Date(value))
  scheduledAt?: Date;
}

export class BulkSMSDto {
  @ApiProperty({ description: 'Array of SMS requests' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SendSMSDto)
  messages: SendSMSDto[];

  @ApiPropertyOptional({ 
    description: 'Batch size for sending SMS',
    example: 100,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @ApiPropertyOptional({ 
    description: 'Delay between batches in milliseconds',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  delayBetweenBatches?: number;
}

export class CreateSMSTemplateDto {
  @ApiProperty({ example: 'Verification Code', description: 'Template name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ 
    example: 'Your {{company}} verification code is: {{code}}',
    description: 'SMS template content',
  })
  @IsString()
  @Length(1, 1600)
  content: string;

  @ApiProperty({ 
    description: 'Template category',
    enum: TemplateCategory,
    example: TemplateCategory.AUTHENTICATION,
  })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ 
    description: 'Available template variables',
    example: ['code', 'company', 'name'],
  })
  @IsArray()
  @IsString({ each: true })
  variables: string[];

  @ApiPropertyOptional({ 
    description: 'Maximum character length for the template',
    example: 160,
  })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSMSTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'SMS template content' })
  @IsOptional()
  @IsString()
  @Length(1, 1600)
  content?: string;

  @ApiPropertyOptional({ description: 'Available template variables' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Maximum character length' })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Template metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// Preference Management DTOs
// ============================================================================

export class NotificationPreferenceDto {
  @ApiProperty({ 
    description: 'Notification type',
    enum: PreferenceType,
    example: PreferenceType.EMAIL,
  })
  @IsEnum(PreferenceType)
  type: PreferenceType;

  @ApiProperty({ 
    description: 'Notification category',
    enum: TemplateCategory,
    example: TemplateCategory.TRANSACTIONAL,
  })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ description: 'Whether notifications are enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ 
    description: 'Notification frequency',
    enum: ['immediate', 'daily', 'weekly', 'monthly'],
    example: 'immediate',
  })
  @IsOptional()
  @IsEnum(['immediate', 'daily', 'weekly', 'monthly'])
  frequency?: 'immediate' | 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Quiet hours configuration' })
  @IsOptional()
  @IsObject()
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
}

export class UpdatePreferencesDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Notification preferences to update' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];
}

// ============================================================================
// Analytics DTOs
// ============================================================================

export class AnalyticsFilterDto {
  @ApiPropertyOptional({ description: 'Start date for analytics period' })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for analytics period' })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

  @ApiPropertyOptional({ 
    description: 'Notification type filter',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ 
    description: 'Template category filter',
    enum: TemplateCategory,
  })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ 
    description: 'Provider filter',
    enum: NotificationProvider,
  })
  @IsOptional()
  @IsEnum(NotificationProvider)
  provider?: NotificationProvider;

  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;
}

// ============================================================================
// Delivery Tracking DTOs
// ============================================================================

export class DeliveryEventDto {
  @ApiProperty({ description: 'Message ID' })
  @IsString()
  messageId: string;

  @ApiProperty({ 
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ 
    description: 'Delivery event type',
    enum: DeliveryStatus,
  })
  @IsEnum(DeliveryStatus)
  event: DeliveryStatus;

  @ApiProperty({ description: 'Event timestamp' })
  @IsISO8601()
  @Transform(({ value }) => new Date(value))
  timestamp: Date;

  @ApiProperty({ description: 'Recipient (email or phone number)' })
  @IsString()
  recipient: string;

  @ApiPropertyOptional({ description: 'Event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class NotificationResultDto {
  @ApiProperty({ description: 'Message ID' })
  messageId: string;

  @ApiProperty({ 
    description: 'Delivery status',
    enum: DeliveryStatus,
  })
  status: DeliveryStatus;

  @ApiProperty({ 
    description: 'Provider used',
    enum: NotificationProvider,
  })
  provider: NotificationProvider;

  @ApiProperty({ description: 'Recipients' })
  recipients: string[];

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time' })
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Actual sent time' })
  sentAt?: Date;
}