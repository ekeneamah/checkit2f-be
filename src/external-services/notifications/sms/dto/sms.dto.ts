/**
 * SMS DTOs
 * 
 * Data Transfer Objects for SMS notification endpoints.
 * Includes validation decorators for request validation.
 * 
 * @module SMSDTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsPhoneNumber,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SMSPriority, SMSDeliveryStatus } from '../interfaces/sms.interface';

/**
 * Send SMS Request DTO
 */
export class SendSMSRequestDto {
  @ApiProperty({
    description: 'Recipient phone number in E.164 format',
    example: '+2348012345678',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'SMS message content',
    example: 'Your verification code is 123456',
    maxLength: 160,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  message: string;

  @ApiPropertyOptional({
    description: 'Sender ID or phone number',
    example: 'CheckIT24',
  })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description: 'Message priority',
    enum: SMSPriority,
    example: SMSPriority.NORMAL,
  })
  @IsEnum(SMSPriority)
  @IsOptional()
  priority?: SMSPriority;

  @ApiPropertyOptional({
    description: 'Schedule send time (ISO 8601 format)',
    example: '2025-01-20T14:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  scheduleAt?: string;
}

/**
 * Send Bulk SMS Request DTO
 */
export class SendBulkSMSRequestDto {
  @ApiProperty({
    description: 'Array of SMS messages to send',
    type: [SendSMSRequestDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendSMSRequestDto)
  messages: SendSMSRequestDto[];

  @ApiPropertyOptional({
    description: 'Batch size for processing',
    example: 100,
    default: 100,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  batchSize?: number;

  @ApiPropertyOptional({
    description: 'Delay between batches in milliseconds',
    example: 1000,
    default: 1000,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  delayBetweenBatches?: number;
}

/**
 * SMS Send Result DTO
 */
export class SMSSendResultDto {
  @ApiProperty({ description: 'Whether SMS was sent successfully', example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Message ID from provider', example: 'SM1234567890' })
  messageId?: string;

  @ApiProperty({ description: 'SMS provider used', example: 'twilio' })
  provider: string;

  @ApiProperty({ description: 'Recipient phone number', example: '+2348012345678' })
  to: string;

  @ApiProperty({ description: 'Delivery status', enum: SMSDeliveryStatus, example: 'sent' })
  status: SMSDeliveryStatus;

  @ApiProperty({ description: 'Timestamp when SMS was sent', example: '2025-01-20T14:00:00Z' })
  sentAt: Date;

  @ApiPropertyOptional({ description: 'Cost of SMS', example: 0.05 })
  cost?: number;

  @ApiPropertyOptional({
    description: 'Error details if send failed',
    type: Object,
  })
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Bulk SMS Result DTO
 */
export class BulkSMSResultDto {
  @ApiProperty({ description: 'Total number of messages', example: 100 })
  totalMessages: number;

  @ApiProperty({ description: 'Number of successful messages', example: 95 })
  successfulMessages: number;

  @ApiProperty({ description: 'Number of failed messages', example: 5 })
  failedMessages: number;

  @ApiProperty({ description: 'Individual message results', type: [SMSSendResultDto] })
  results: SMSSendResultDto[];

  @ApiProperty({
    description: 'Errors encountered',
    type: Array,
    example: [{ index: 0, error: 'Invalid phone number' }],
  })
  errors: Array<{ index: number; error: string }>;
}

/**
 * SMS Delivery Report DTO
 */
export class SMSDeliveryReportDto {
  @ApiProperty({ description: 'Message ID', example: 'SM1234567890' })
  messageId: string;

  @ApiProperty({ description: 'Recipient phone number', example: '+2348012345678' })
  to: string;

  @ApiProperty({ description: 'Delivery status', enum: SMSDeliveryStatus, example: 'delivered' })
  status: SMSDeliveryStatus;

  @ApiProperty({ description: 'Sent timestamp', example: '2025-01-20T14:00:00Z' })
  sentAt: Date;

  @ApiPropertyOptional({ description: 'Delivered timestamp', example: '2025-01-20T14:00:05Z' })
  deliveredAt?: Date;

  @ApiProperty({ description: 'SMS provider', example: 'twilio' })
  provider: string;

  @ApiPropertyOptional({ description: 'Cost of SMS', example: 0.05 })
  cost?: number;

  @ApiPropertyOptional({ description: 'Error code if delivery failed', example: '30007' })
  errorCode?: string;

  @ApiPropertyOptional({
    description: 'Error message if delivery failed',
    example: 'Message filtered',
  })
  errorMessage?: string;
}

/**
 * Send Verification Code DTO
 */
export class SendVerificationCodeDto {
  @ApiProperty({
    description: 'Recipient phone number',
    example: '+2348012345678',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Verification code template name',
    example: 'verification_code',
  })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({
    description: 'Code expiry in minutes',
    example: 5,
    default: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  expiryMinutes?: number;
}
