/**
 * Feedback DTOs
 * Data Transfer Objects for feedback API
 */
import { IsEnum, IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, Max, IsUUID, IsEmail, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackType, FeedbackCategory, FeedbackPriority, FeedbackStatus, FeedbackSource } from '../../domain/enums';

/**
 * Related entity DTO
 */
export class RelatedEntityDto {
  @ApiProperty({ description: 'Entity type', enum: ['KYC_REQUEST', 'VERIFICATION_REQUEST', 'PAYMENT', 'AGENT', 'OTHER'] })
  @IsString()
  entityType: 'KYC_REQUEST' | 'VERIFICATION_REQUEST' | 'PAYMENT' | 'AGENT' | 'OTHER';

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Create feedback DTO
 */
export class CreateFeedbackDto {
  @ApiProperty({ description: 'Feedback type', enum: FeedbackType })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({ description: 'Category', enum: FeedbackCategory })
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @ApiPropertyOptional({ description: 'Priority', enum: FeedbackPriority })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiPropertyOptional({ description: 'Source', enum: FeedbackSource })
  @IsOptional()
  @IsEnum(FeedbackSource)
  source?: FeedbackSource;

  @ApiProperty({ description: 'Subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Related entities', type: [RelatedEntityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedEntityDto)
  relatedEntities?: RelatedEntityDto[];
}

/**
 * Update feedback DTO
 */
export class UpdateFeedbackDto {
  @ApiPropertyOptional({ description: 'Category', enum: FeedbackCategory })
  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory;

  @ApiPropertyOptional({ description: 'Priority', enum: FeedbackPriority })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional related entities', type: [RelatedEntityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedEntityDto)
  relatedEntities?: RelatedEntityDto[];
}

/**
 * Update status DTO
 */
export class UpdateFeedbackStatusDto {
  @ApiProperty({ description: 'New status', enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Assign feedback DTO
 */
export class AssignFeedbackDto {
  @ApiProperty({ description: 'Admin user ID to assign' })
  @IsString()
  assignedTo: string;

  @ApiProperty({ description: 'Admin name' })
  @IsString()
  assignedToName: string;
}

/**
 * Add response DTO
 */
export class AddResponseDto {
  @ApiProperty({ description: 'Response message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Is internal note (not visible to user)' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

/**
 * Resolve feedback DTO
 */
export class ResolveFeedbackDto {
  @ApiProperty({ description: 'Resolution description' })
  @IsString()
  resolution: string;
}

/**
 * Escalate feedback DTO
 */
export class EscalateFeedbackDto {
  @ApiProperty({ description: 'Reason for escalation' })
  @IsString()
  reason: string;
}

/**
 * Add satisfaction rating DTO
 */
export class AddSatisfactionRatingDto {
  @ApiProperty({ description: 'Rating 1-5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * Query feedback DTO
 */
export class QueryFeedbackDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: FeedbackStatus })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional({ description: 'Filter by type', enum: FeedbackType })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;

  @ApiPropertyOptional({ description: 'Filter by category', enum: FeedbackCategory })
  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory;

  @ApiPropertyOptional({ description: 'Filter by priority', enum: FeedbackPriority })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiPropertyOptional({ description: 'Filter by assigned admin' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

/**
 * Feedback response DTO (output)
 */
export class FeedbackResponseDto {
  id: string;
  ticketNumber: string;
  type: FeedbackType;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  source: FeedbackSource;
  subject: string;
  description: string;
  submittedBy: string;
  submittedByEmail: string;
  submittedByName: string;
  submittedByRole: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  responses?: Array<{
    id: string;
    message: string;
    respondedBy: string;
    respondedByName: string;
    respondedByRole: string;
    isInternal: boolean;
    createdAt: Date;
  }>;
  satisfactionRating?: number;
  satisfactionComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Feedback list response DTO
 */
export class FeedbackListResponseDto {
  items: FeedbackResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Feedback stats response DTO
 */
export class FeedbackStatsResponseDto {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionTime: number;
  satisfactionAverage: number;
  openCount: number;
  resolvedThisWeek: number;
  submittedThisWeek: number;
}
