/**
 * Earnings & Analytics Domain Entities
 * 
 * Entities for tracking earnings, payouts, and performance metrics
 * for both Company users and their Riders.
 */

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PayoutMethod = 'bank_transfer' | 'mobile_money' | 'wallet' | 'cash';
export type EarningStatus = 'pending' | 'approved' | 'disputed' | 'paid';

export interface EarningsBreakdown {
  count: number;
  grossAmount: number;
  netAmount: number;
  percentage: number;
}

export interface EarningDeduction {
  type: string;
  amount: number;
  description: string;
}

export interface EarningBonus {
  type: string;
  amount: number;
  reason: string;
}

export interface VerificationEarning {
  id: string;
  verificationRequestId: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  companyId?: string;
  riderId?: string;
  verificationType: string;
  baseAmount: number;
  bonuses: EarningBonus[];
  bonusAmount: number;
  grossAmount: number;
  deductions: EarningDeduction[];
  netAmount: number;
  platformFee: number;
  companyCommission?: number;
  qualityScore?: number;
  completedAt: Date;
  recordedAt: Date;
  status: EarningStatus;
  paidAt?: Date;
  payoutId?: string;
  clientName?: string;
  location?: {
    city: string;
    area: string;
  };
}

export interface EarningsSummary {
  userId: string;
  period: {
    start: Date;
    end: Date;
    type: 'today' | 'day' | 'week' | 'month' | 'year' | 'all';
  };
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalBonuses: number;
  verificationsCompleted: number;
  averagePerVerification: number;
  breakdown: {
    byType: Record<string, EarningsBreakdown>;
    byDay: Array<{ date: string; amount: number; count: number }>;
    byWeek?: Array<{ week: string; amount: number; count: number }>;
  };
  pendingPayout: number;
  paidOut: number;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  companyId?: string;
  amount: number;
  currency: string;
  method?: PayoutMethod;
  status: PayoutStatus;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  earningIds?: string[];
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  completedAt?: Date;
  transactionReference?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface PerformanceMetrics {
  userId: string;
  period: {
    start: Date;
    end: Date;
    type: 'week' | 'month' | 'year';
  };
  verificationsCompleted: number;
  averageQualityScore: number;
  totalEarnings: number;
  bonusesEarned: number;
  averageResponseTime: number;
  customerRating: number;
  onTimeCompletionRate: number;
  rejectionRate: number;
  rank: number;
  percentile: number;
  trend: { direction: 'up' | 'down' | 'stable'; percentage: number };
}

export interface CompanyEarningsOverview {
  companyId: string;
  period: {
    start: Date;
    end: Date;
    type?: string;
  };
  directEarnings: {
    totalGross: number;
    totalNet: number;
    verificationsCompleted: number;
  };
  riderEarnings: {
    totalGross: number;
    totalNet: number;
    verificationsCompleted: number;
    commissionEarned: number;
  };
  totalCompanyEarnings: number;
  totalRiderPayouts: number;
  riderBreakdown: Array<{
    riderId: string;
    riderName: string;
    totalEarned: number;
    verificationsCompleted: number;
    commissionEarned: number;
  }>;
  activeRiders: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  score: number;
  verificationsCompleted: number;
  totalEarnings: number;
  qualityScore?: number;
}

export interface EarningsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  createdAt: Date;
  isCompleted: boolean;
  completedAt?: Date;
  progressPercentage: number;
}
