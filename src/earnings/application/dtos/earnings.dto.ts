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
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Earnings & Analytics DTOs
 * 
 * @author CheckIT24 Development Team
 */

// ============================================================================
// BANK DETAILS DTOs
// ============================================================================

export class BankDetailsDto {
  @ApiProperty({ description: 'Bank name' })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ description: 'Account number' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ description: 'Account holder name' })
  @IsNotEmpty()
  @IsString()
  accountName: string;
}

// ============================================================================
// PAYOUT REQUEST DTOs
// ============================================================================

export class RequestPayoutDto {
  @ApiProperty({ description: 'Amount to withdraw in NGN', minimum: 1000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1000) // Minimum payout amount
  amount: number;

  @ApiProperty({ type: BankDetailsDto, description: 'Bank details for payout' })
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails: BankDetailsDto;
}

export class ProcessPayoutDto {
  @ApiProperty({ description: 'Payout request ID' })
  @IsNotEmpty()
  @IsString()
  payoutId: string;

  @ApiProperty({
    enum: ['approved', 'rejected', 'processing', 'completed'],
    description: 'New status for the payout',
  })
  @IsNotEmpty()
  @IsEnum(['approved', 'rejected', 'processing', 'completed'])
  status: 'approved' | 'rejected' | 'processing' | 'completed';

  @ApiPropertyOptional({ description: 'Bank transaction reference' })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection (if rejected)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ============================================================================
// EARNINGS QUERY DTOs
// ============================================================================

export class GetEarningsSummaryDto {
  @ApiPropertyOptional({
    enum: ['today', 'week', 'month', 'all'],
    description: 'Period for summary',
    default: 'month',
  })
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'all'])
  period?: 'today' | 'week' | 'month' | 'all';
}

export class GetPerformanceMetricsDto {
  @ApiProperty({
    enum: ['week', 'month', 'year'],
    description: 'Period for metrics',
  })
  @IsNotEmpty()
  @IsEnum(['week', 'month', 'year'])
  period: 'week' | 'month' | 'year';
}

export class GetLeaderboardDto {
  @ApiProperty({
    enum: ['earnings', 'completions', 'quality'],
    description: 'Leaderboard type',
  })
  @IsNotEmpty()
  @IsEnum(['earnings', 'completions', 'quality'])
  type: 'earnings' | 'completions' | 'quality';

  @ApiProperty({
    enum: ['week', 'month', 'all'],
    description: 'Time period',
  })
  @IsNotEmpty()
  @IsEnum(['week', 'month', 'all'])
  period: 'week' | 'month' | 'all';

  @ApiPropertyOptional({ description: 'Limit results', default: 10, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by company (for company leaderboards)' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

// ============================================================================
// GOALS DTOs
// ============================================================================

export class CreateEarningsGoalDto {
  @ApiProperty({ description: 'Target amount in NGN' })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  targetAmount: number;

  @ApiProperty({ description: 'Goal deadline (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  deadline: string;

  @ApiProperty({
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    description: 'Goal type',
  })
  @IsNotEmpty()
  @IsEnum(['daily', 'weekly', 'monthly', 'custom'])
  type: 'daily' | 'weekly' | 'monthly' | 'custom';

  @ApiPropertyOptional({ description: 'Custom goal name' })
  @IsOptional()
  @IsString()
  name?: string;
}

// ============================================================================
// RECORD EARNING DTOs (Internal/Admin)
// ============================================================================

export class BonusDto {
  @ApiProperty({ description: 'Bonus type' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: 'Bonus amount' })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Reason for bonus' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class RecordEarningDto {
  @ApiProperty({ description: 'Verification request ID' })
  @IsNotEmpty()
  @IsString()
  verificationRequestId: string;

  @ApiProperty({ description: 'User ID who completed the verification' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['COMPANY', 'RIDER'], description: 'User role' })
  @IsNotEmpty()
  @IsEnum(['COMPANY', 'RIDER'])
  userRole: 'COMPANY' | 'RIDER';

  @ApiProperty({ description: 'Base amount in NGN' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @ApiProperty({ description: 'Verification type' })
  @IsNotEmpty()
  @IsString()
  verificationType: string;

  @ApiProperty({ description: 'When verification was completed (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  completedAt: string;

  @ApiPropertyOptional({ description: 'Quality score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({ type: [BonusDto], description: 'Additional bonuses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BonusDto)
  bonuses?: BonusDto[];

  @ApiPropertyOptional({ description: 'Company ID (required for riders)' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Rider ID' })
  @IsOptional()
  @IsString()
  riderId?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class EarningsBreakdownResponseDto {
  @ApiProperty({ description: 'Number of verifications' })
  count: number;

  @ApiProperty({ description: 'Gross amount' })
  grossAmount: number;

  @ApiProperty({ description: 'Net amount' })
  netAmount: number;

  @ApiProperty({ description: 'Percentage of total' })
  percentage: number;
}

export class EarningsSummaryResponseDto {
  @ApiProperty({ description: 'Total gross earnings' })
  totalGross: number;

  @ApiProperty({ description: 'Total deductions' })
  totalDeductions: number;

  @ApiProperty({ description: 'Total net earnings' })
  totalNet: number;

  @ApiProperty({ description: 'Total bonuses' })
  totalBonuses: number;

  @ApiProperty({ description: 'Verifications completed' })
  verificationsCompleted: number;

  @ApiProperty({ description: 'Average earning per verification' })
  averagePerVerification: number;

  @ApiProperty({ description: 'Pending payout amount' })
  pendingPayout: number;

  @ApiProperty({ description: 'Already paid out amount' })
  paidOut: number;

  @ApiProperty({ description: 'Period start date' })
  periodStart: Date;

  @ApiProperty({ description: 'Period end date' })
  periodEnd: Date;
}

export class PayoutRequestResponseDto {
  @ApiProperty({ description: 'Payout ID' })
  id: string;

  @ApiProperty({ description: 'Amount' })
  amount: number;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiProperty({ description: 'Requested at' })
  requestedAt: Date;

  @ApiPropertyOptional({ description: 'Processed at' })
  processedAt?: Date;

  @ApiPropertyOptional({ description: 'Transaction reference' })
  transactionReference?: string;
}

export class LeaderboardEntryResponseDto {
  @ApiProperty({ description: 'Rank position' })
  rank: number;

  @ApiProperty({ description: 'User name' })
  userName: string;

  @ApiProperty({ description: 'Score (earnings, completions, or quality)' })
  score: number;

  @ApiProperty({ description: 'Verifications completed' })
  verificationsCompleted: number;

  @ApiProperty({ description: 'Total earnings' })
  totalEarnings: number;

  @ApiPropertyOptional({ description: 'Quality score' })
  qualityScore?: number;
}

export class PerformanceMetricsResponseDto {
  @ApiProperty({ description: 'Verifications completed' })
  verificationsCompleted: number;

  @ApiProperty({ description: 'Average quality score' })
  averageQualityScore: number;

  @ApiProperty({ description: 'Total earnings' })
  totalEarnings: number;

  @ApiProperty({ description: 'Bonuses earned' })
  bonusesEarned: number;

  @ApiProperty({ description: 'On-time completion rate (percentage)' })
  onTimeCompletionRate: number;

  @ApiProperty({ description: 'Rejection rate (percentage)' })
  rejectionRate: number;

  @ApiProperty({ description: 'Current rank' })
  rank: number;

  @ApiProperty({ description: 'Percentile' })
  percentile: number;

  @ApiProperty({ description: 'Trend direction' })
  trendDirection: 'up' | 'down' | 'stable';

  @ApiProperty({ description: 'Trend percentage' })
  trendPercentage: number;
}

export class EarningsGoalResponseDto {
  @ApiProperty({ description: 'Goal ID' })
  id: string;

  @ApiProperty({ description: 'Goal name' })
  name: string;

  @ApiProperty({ description: 'Target amount' })
  targetAmount: number;

  @ApiProperty({ description: 'Current amount' })
  currentAmount: number;

  @ApiProperty({ description: 'Progress percentage' })
  progressPercentage: number;

  @ApiProperty({ description: 'Deadline' })
  deadline: Date;

  @ApiProperty({ description: 'Is completed' })
  isCompleted: boolean;
}

export class CompanyEarningsOverviewResponseDto {
  @ApiProperty({ description: 'Direct earnings (company\'s own verifications)' })
  directEarnings: {
    totalGross: number;
    totalNet: number;
    verificationsCompleted: number;
  };

  @ApiProperty({ description: 'Earnings from riders' })
  riderEarnings: {
    totalGross: number;
    totalNet: number;
    verificationsCompleted: number;
    commissionEarned: number;
  };

  @ApiProperty({ description: 'Total company earnings (direct + commissions)' })
  totalCompanyEarnings: number;

  @ApiProperty({ description: 'Active riders count' })
  activeRiders: number;

  @ApiProperty({ description: 'Rider breakdown', type: 'array' })
  riderBreakdown: Array<{
    riderId: string;
    riderName: string;
    totalEarned: number;
    verificationsCompleted: number;
    commissionEarned: number;
  }>;
}

export class RecentEarningResponseDto {
  @ApiProperty({ description: 'Earning ID' })
  id: string;

  @ApiProperty({ description: 'Verification request ID' })
  verificationRequestId: string;

  @ApiProperty({ description: 'Verification type' })
  verificationType: string;

  @ApiProperty({ description: 'Net amount' })
  netAmount: number;

  @ApiProperty({ description: 'Bonus amount' })
  bonusAmount: number;

  @ApiProperty({ description: 'Quality score' })
  qualityScore?: number;

  @ApiProperty({ description: 'Recorded at' })
  recordedAt: Date;
}
