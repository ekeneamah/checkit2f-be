import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AssignmentStatus,
  AssignmentPriority,
  AssignmentMethod,
} from '../../domain/entities/company-assignment.entity';

// ============ ASSIGN TO RIDER ============

export class AssignToRiderDto {
  @ApiProperty({ description: 'Rider ID to assign' })
  @IsString()
  riderId: string;

  @ApiPropertyOptional({ description: 'Bike ID to use' })
  @IsOptional()
  @IsString()
  bikeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: AssignmentPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

// ============ SELF ASSIGN ============

export class SelfAssignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bikeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============ REASSIGN ============

export class ReassignDto {
  @ApiProperty({ description: 'New rider ID' })
  @IsString()
  newRiderId: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bikeId?: string;
}

// ============ CANCEL ASSIGNMENT ============

export class CancelAssignmentDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

// ============ DECLINE ASSIGNMENT (Rider) ============

export class DeclineAssignmentDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

// ============ SMART ASSIGNMENT ============

export class SmartAssignRequestDto {
  @ApiPropertyOptional({ enum: ['auto', 'proximity', 'round_robin', 'least_busy', 'manual'] })
  @IsOptional()
  @IsEnum(['auto', 'proximity', 'round_robin', 'least_busy', 'manual'])
  method?: AssignmentMethod;

  @ApiPropertyOptional({ description: 'Max distance in km' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Number of candidates to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class RiderCandidateDto {
  @ApiProperty()
  riderId: string;

  @ApiProperty()
  riderName: string;

  @ApiProperty()
  distanceKm: number;

  @ApiProperty()
  estimatedTravelTime: number;

  @ApiProperty()
  activeAssignments: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  matchScore: number;

  @ApiPropertyOptional()
  reason?: string;
}

export class SmartAssignResponseDto {
  @ApiProperty({ type: [RiderCandidateDto] })
  candidates: RiderCandidateDto[];

  @ApiPropertyOptional()
  recommendedRiderId?: string;

  @ApiPropertyOptional()
  recommendedReason?: string;
}

// ============ ASSIGNMENT RESPONSE ============

export class AssignmentLocationDto {
  @ApiProperty()
  lat: number;

  @ApiProperty()
  lng: number;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;
}

export class AssignmentTimelineDto {
  @ApiProperty()
  assignedAt: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  arrivedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiPropertyOptional()
  declinedAt?: Date;
}

export class AssignmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  verificationRequestId: string;

  @ApiProperty()
  riderId: string;

  @ApiProperty()
  riderName: string;

  @ApiProperty()
  riderPhone: string;

  @ApiPropertyOptional()
  bikeId?: string;

  @ApiPropertyOptional()
  bikePlate?: string;

  @ApiProperty()
  requestTitle: string;

  @ApiProperty()
  verificationType: string;

  @ApiPropertyOptional()
  businessName?: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiProperty()
  location: AssignmentLocationDto;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  assignmentMethod: string;

  @ApiProperty()
  timeline: AssignmentTimelineDto;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional()
  distanceKm?: number;

  @ApiPropertyOptional()
  estimatedTravelTime?: number;

  @ApiProperty()
  payout: number;

  @ApiPropertyOptional()
  riderShare?: number;

  @ApiPropertyOptional()
  companyShare?: number;

  @ApiProperty()
  assignedBy: string;

  @ApiPropertyOptional()
  assignmentNote?: string;

  @ApiPropertyOptional()
  declineReason?: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============ ASSIGNMENT QUERY ============

export class AssignmentQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined', 'expired'] })
  @IsOptional()
  @IsEnum(['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'declined', 'expired'])
  status?: AssignmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  riderId?: string;

  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: AssignmentPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

// ============ INCOMING REQUEST ============

export class IncomingRequestDto {
  @ApiProperty()
  requestId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  verificationType: string;

  @ApiPropertyOptional()
  businessName?: string;

  @ApiPropertyOptional()
  fullName?: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  location?: { lat: number; lng: number };

  @ApiProperty()
  payout: number;

  @ApiProperty()
  priority: string;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  distanceKm?: number;
}
