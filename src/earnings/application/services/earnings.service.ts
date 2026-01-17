import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  VerificationEarning,
  EarningsSummary,
  PayoutRequest,
  PerformanceMetrics,
  CompanyEarningsOverview,
  LeaderboardEntry,
  EarningsGoal,
  EarningsBreakdown,
  PayoutStatus,
} from '../../domain/entities/earnings.entity';

/**
 * Earnings & Analytics Service
 * 
 * Tracks earnings for Companies and Riders, calculates commissions,
 * processes payout requests, and provides performance analytics.
 * 
 * @author CheckIT24 Development Team
 */
@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);
  private readonly db: admin.firestore.Firestore;
  private readonly EARNINGS_COLLECTION = 'earnings';
  private readonly SUMMARIES_COLLECTION = 'earnings_summaries';
  private readonly PAYOUTS_COLLECTION = 'payout_requests';
  private readonly METRICS_COLLECTION = 'performance_metrics';
  private readonly LEADERBOARD_COLLECTION = 'leaderboards';
  private readonly GOALS_COLLECTION = 'earnings_goals';

  // Commission rates (could be moved to config)
  private readonly PLATFORM_COMMISSION = 0.15; // 15% platform fee
  private readonly COMPANY_COMMISSION = 0.10; // 10% company commission from rider earnings

  constructor(private readonly configService: ConfigService) {
    this.db = admin.firestore();
    this.logger.log('💰 Earnings Service initialized');
  }

  // ============================================================================
  // VERIFICATION EARNINGS
  // ============================================================================

  /**
   * Record earnings for a completed verification
   */
  async recordVerificationEarning(
    verificationRequestId: string,
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    baseAmount: number,
    verificationType: string,
    completedAt: Date,
    qualityScore?: number,
    bonuses?: Array<{ type: string; amount: number; reason: string }>,
    companyId?: string,
    riderId?: string,
  ): Promise<VerificationEarning> {
    this.logger.log(`💵 Recording earnings for verification ${verificationRequestId}`);

    const earningId = this.generateId();
    const now = new Date();

    // Calculate bonuses
    let bonusAmount = 0;
    const appliedBonuses = bonuses || [];

    // Quality bonus (if score > 90%)
    if (qualityScore && qualityScore >= 90) {
      const qualityBonus = baseAmount * 0.10;
      bonusAmount += qualityBonus;
      appliedBonuses.push({
        type: 'quality_bonus',
        amount: qualityBonus,
        reason: `Quality score ${qualityScore}%`,
      });
    }

    // Calculate gross and net amounts
    const grossAmount = baseAmount + bonusAmount;
    const platformFee = grossAmount * this.PLATFORM_COMMISSION;
    let companyCommission = 0;
    let netAmount = grossAmount - platformFee;

    // If rider, deduct company commission
    if (userRole === 'RIDER' && companyId) {
      companyCommission = grossAmount * this.COMPANY_COMMISSION;
      netAmount = grossAmount - platformFee - companyCommission;
    }

    const earning: VerificationEarning = {
      id: earningId,
      verificationRequestId,
      userId,
      userRole,
      companyId,
      riderId: userRole === 'RIDER' ? riderId : undefined,
      verificationType,
      baseAmount,
      bonuses: appliedBonuses,
      bonusAmount,
      grossAmount,
      deductions: [
        { type: 'platform_fee', amount: platformFee, description: `${this.PLATFORM_COMMISSION * 100}% platform fee` },
      ],
      netAmount,
      platformFee,
      companyCommission,
      qualityScore,
      completedAt,
      recordedAt: now,
      status: 'pending',
    };

    // Add company commission deduction if applicable
    if (companyCommission > 0) {
      earning.deductions.push({
        type: 'company_commission',
        amount: companyCommission,
        description: `${this.COMPANY_COMMISSION * 100}% company commission`,
      });
    }

    // Save earning record
    await this.db.collection(this.EARNINGS_COLLECTION).doc(earningId).set({
      ...earning,
      completedAt: admin.firestore.Timestamp.fromDate(completedAt),
      recordedAt: admin.firestore.Timestamp.fromDate(now),
    });

    // Update summaries
    await this.updateEarningsSummary(userId, earning);

    // If rider, also credit company
    if (userRole === 'RIDER' && companyId && companyCommission > 0) {
      await this.recordCompanyCommission(companyId, earningId, companyCommission, riderId);
    }

    this.logger.log(`✅ Earnings ${earningId} recorded: ₦${netAmount} net`);
    return earning;
  }

  /**
   * Record company commission from rider earnings
   */
  private async recordCompanyCommission(
    companyId: string,
    sourceEarningId: string,
    amount: number,
    riderId?: string,
  ): Promise<void> {
    const commissionId = this.generateId();
    const now = new Date();

    const commission = {
      id: commissionId,
      type: 'rider_commission',
      companyId,
      riderId,
      sourceEarningId,
      amount,
      recordedAt: admin.firestore.Timestamp.fromDate(now),
      status: 'pending',
    };

    await this.db.collection(`${this.EARNINGS_COLLECTION}_commissions`).doc(commissionId).set(commission);
    
    // Update company summary
    await this.db.collection(this.SUMMARIES_COLLECTION).doc(`company_${companyId}`).set({
      commissionEarnings: admin.firestore.FieldValue.increment(amount),
      lastUpdated: admin.firestore.Timestamp.now(),
    }, { merge: true });
  }

  // ============================================================================
  // EARNINGS SUMMARIES
  // ============================================================================

  /**
   * Get earnings summary for user
   */
  async getEarningsSummary(userId: string, period?: 'today' | 'week' | 'month' | 'all'): Promise<EarningsSummary> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    // Fetch earnings within period
    let query = this.db
      .collection(this.EARNINGS_COLLECTION)
      .where('userId', '==', userId);

    if (period && period !== 'all') {
      query = query.where('recordedAt', '>=', admin.firestore.Timestamp.fromDate(startDate));
    }

    const snapshot = await query.get();
    const earnings = snapshot.docs.map(doc => doc.data() as VerificationEarning);

    // Calculate summary
    const summary: EarningsSummary = {
      userId,
      period: {
        start: startDate,
        end: now,
        type: period || 'all',
      },
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      totalBonuses: 0,
      verificationsCompleted: earnings.length,
      averagePerVerification: 0,
      breakdown: {
        byType: {} as Record<string, EarningsBreakdown>,
        byDay: [],
        byWeek: [],
      },
      pendingPayout: 0,
      paidOut: 0,
    };

    // Aggregate
    const byType: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const e of earnings) {
      summary.totalGross += e.grossAmount;
      summary.totalNet += e.netAmount;
      summary.totalBonuses += e.bonusAmount;
      summary.totalDeductions += e.deductions.reduce((sum, d) => sum + d.amount, 0);

      // By type
      byType[e.verificationType] = (byType[e.verificationType] || 0) + e.netAmount;

      // By day
      const dayKey = new Date(e.recordedAt).toISOString().split('T')[0];
      byDay[dayKey] = (byDay[dayKey] || 0) + e.netAmount;

      // Pending vs paid
      if (e.status === 'pending') {
        summary.pendingPayout += e.netAmount;
      } else if (e.status === 'paid') {
        summary.paidOut += e.netAmount;
      }
    }

    summary.averagePerVerification = earnings.length > 0 ? summary.totalNet / earnings.length : 0;

    // Format breakdown by type
    for (const [type, amount] of Object.entries(byType)) {
      const typeEarnings = earnings.filter(e => e.verificationType === type);
      summary.breakdown.byType[type] = {
        count: typeEarnings.length,
        grossAmount: typeEarnings.reduce((s, e) => s + e.grossAmount, 0),
        netAmount: amount,
        percentage: summary.totalNet > 0 ? (amount / summary.totalNet) * 100 : 0,
      };
    }

    // Format breakdown by day
    summary.breakdown.byDay = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({
        date,
        amount,
        count: earnings.filter(e => new Date(e.recordedAt).toISOString().split('T')[0] === date).length,
      }));

    return summary;
  }

  /**
   * Update earnings summary after new earning
   */
  private async updateEarningsSummary(userId: string, earning: VerificationEarning): Promise<void> {
    const summaryRef = this.db.collection(this.SUMMARIES_COLLECTION).doc(`user_${userId}`);
    
    await summaryRef.set({
      userId,
      totalGross: admin.firestore.FieldValue.increment(earning.grossAmount),
      totalNet: admin.firestore.FieldValue.increment(earning.netAmount),
      totalBonuses: admin.firestore.FieldValue.increment(earning.bonusAmount),
      verificationsCompleted: admin.firestore.FieldValue.increment(1),
      pendingPayout: admin.firestore.FieldValue.increment(earning.netAmount),
      lastUpdated: admin.firestore.Timestamp.now(),
    }, { merge: true });
  }

  // ============================================================================
  // COMPANY EARNINGS OVERVIEW
  // ============================================================================

  /**
   * Get company earnings overview (includes rider earnings and commissions)
   */
  async getCompanyEarningsOverview(companyId: string): Promise<CompanyEarningsOverview> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get company's direct earnings
    const directEarningsSnap = await this.db
      .collection(this.EARNINGS_COLLECTION)
      .where('userId', '==', companyId)
      .get();

    // Get commissions from riders
    const commissionsSnap = await this.db
      .collection(`${this.EARNINGS_COLLECTION}_commissions`)
      .where('companyId', '==', companyId)
      .get();

    // Get all rider earnings under this company
    const riderEarningsSnap = await this.db
      .collection(this.EARNINGS_COLLECTION)
      .where('companyId', '==', companyId)
      .where('userRole', '==', 'RIDER')
      .get();

    const directEarnings = directEarningsSnap.docs.map(d => d.data() as VerificationEarning);
    const commissions = commissionsSnap.docs.map(d => d.data());
    const riderEarnings = riderEarningsSnap.docs.map(d => d.data() as VerificationEarning);

    // Aggregate by rider
    const riderBreakdown: Record<string, {
      riderId: string;
      riderName: string;
      totalEarned: number;
      verificationsCompleted: number;
      commissionEarned: number;
    }> = {};

    for (const re of riderEarnings) {
      const riderId = re.riderId || 'unknown';
      if (!riderBreakdown[riderId]) {
        riderBreakdown[riderId] = {
          riderId,
          riderName: `Rider ${riderId.slice(-4)}`, // Would fetch actual name
          totalEarned: 0,
          verificationsCompleted: 0,
          commissionEarned: 0,
        };
      }
      riderBreakdown[riderId].totalEarned += re.netAmount;
      riderBreakdown[riderId].verificationsCompleted += 1;
      riderBreakdown[riderId].commissionEarned += re.companyCommission || 0;
    }

    const overview: CompanyEarningsOverview = {
      companyId,
      period: {
        start: monthStart,
        end: now,
        type: 'month',
      },
      directEarnings: {
        totalGross: directEarnings.reduce((s, e) => s + e.grossAmount, 0),
        totalNet: directEarnings.reduce((s, e) => s + e.netAmount, 0),
        verificationsCompleted: directEarnings.length,
      },
      riderEarnings: {
        totalGross: riderEarnings.reduce((s, e) => s + e.grossAmount, 0),
        totalNet: riderEarnings.reduce((s, e) => s + e.netAmount, 0),
        verificationsCompleted: riderEarnings.length,
        commissionEarned: commissions.reduce((s, c) => s + (c.amount || 0), 0),
      },
      totalCompanyEarnings: 
        directEarnings.reduce((s, e) => s + e.netAmount, 0) + 
        commissions.reduce((s, c) => s + (c.amount || 0), 0),
      totalRiderPayouts: riderEarnings.reduce((s, e) => s + e.netAmount, 0),
      riderBreakdown: Object.values(riderBreakdown),
      activeRiders: Object.keys(riderBreakdown).length,
    };

    return overview;
  }

  // ============================================================================
  // PAYOUT REQUESTS
  // ============================================================================

  /**
   * Request payout
   */
  async requestPayout(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    amount: number,
    bankDetails: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    },
  ): Promise<PayoutRequest> {
    // Verify sufficient balance
    const summary = await this.getEarningsSummary(userId);
    if (summary.pendingPayout < amount) {
      throw new BadRequestException('Insufficient balance for payout');
    }

    const payoutId = this.generateId();
    const now = new Date();

    const payout: PayoutRequest = {
      id: payoutId,
      userId,
      userRole,
      amount,
      currency: 'NGN',
      status: 'pending',
      bankDetails,
      requestedAt: now,
    };

    await this.db.collection(this.PAYOUTS_COLLECTION).doc(payoutId).set({
      ...payout,
      requestedAt: admin.firestore.Timestamp.fromDate(now),
    });

    // Update pending payout balance
    await this.db.collection(this.SUMMARIES_COLLECTION).doc(`user_${userId}`).update({
      pendingPayout: admin.firestore.FieldValue.increment(-amount),
      requestedPayout: admin.firestore.FieldValue.increment(amount),
    });

    this.logger.log(`💳 Payout request ${payoutId} created: ₦${amount}`);
    return payout;
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(userId: string, limit: number = 20): Promise<PayoutRequest[]> {
    const snapshot = await this.db
      .collection(this.PAYOUTS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('requestedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate(),
      processedAt: doc.data().processedAt?.toDate(),
    })) as PayoutRequest[];
  }

  /**
   * Process payout (admin only)
   */
  async processPayout(
    payoutId: string,
    status: 'approved' | 'rejected' | 'processing' | 'completed',
    processedBy: string,
    transactionReference?: string,
    rejectionReason?: string,
  ): Promise<PayoutRequest> {
    const payoutRef = this.db.collection(this.PAYOUTS_COLLECTION).doc(payoutId);
    const payoutDoc = await payoutRef.get();

    if (!payoutDoc.exists) {
      throw new NotFoundException('Payout request not found');
    }

    const now = new Date();
    const updateData: any = {
      status,
      processedAt: admin.firestore.Timestamp.fromDate(now),
      processedBy,
    };

    if (transactionReference) {
      updateData.transactionReference = transactionReference;
    }

    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await payoutRef.update(updateData);

    // Update user's paid out amount if completed
    if (status === 'completed') {
      const payout = payoutDoc.data()!;
      await this.db.collection(this.SUMMARIES_COLLECTION).doc(`user_${payout.userId}`).update({
        requestedPayout: admin.firestore.FieldValue.increment(-payout.amount),
        paidOut: admin.firestore.FieldValue.increment(payout.amount),
      });

      // Mark earnings as paid
      await this.markEarningsAsPaid(payout.userId, payout.amount);
    }

    return { ...payoutDoc.data(), status, processedAt: now } as PayoutRequest;
  }

  /**
   * Mark earnings as paid (internal)
   */
  private async markEarningsAsPaid(userId: string, amount: number): Promise<void> {
    const earningsSnap = await this.db
      .collection(this.EARNINGS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('recordedAt', 'asc')
      .get();

    let remaining = amount;
    const batch = this.db.batch();

    for (const doc of earningsSnap.docs) {
      if (remaining <= 0) break;
      const earning = doc.data() as VerificationEarning;
      if (earning.netAmount <= remaining) {
        batch.update(doc.ref, { status: 'paid' });
        remaining -= earning.netAmount;
      }
    }

    await batch.commit();
  }

  // ============================================================================
  // PERFORMANCE METRICS
  // ============================================================================

  /**
   * Get performance metrics for user
   */
  async getPerformanceMetrics(userId: string, period: 'week' | 'month' | 'year'): Promise<PerformanceMetrics> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const earningsSnap = await this.db
      .collection(this.EARNINGS_COLLECTION)
      .where('userId', '==', userId)
      .where('recordedAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .get();

    const earnings = earningsSnap.docs.map(d => d.data() as VerificationEarning);

    const metrics: PerformanceMetrics = {
      userId,
      period: {
        start: startDate,
        end: now,
        type: period,
      },
      verificationsCompleted: earnings.length,
      averageQualityScore: 0,
      totalEarnings: earnings.reduce((s, e) => s + e.netAmount, 0),
      bonusesEarned: earnings.reduce((s, e) => s + e.bonusAmount, 0),
      averageResponseTime: 0, // Would be calculated from verification data
      customerRating: 0, // Would be fetched from reviews
      onTimeCompletionRate: 0, // Would be calculated
      rejectionRate: 0, // Would be calculated
      rank: 0, // Would be calculated from leaderboard
      percentile: 0, // Would be calculated
      trend: { direction: 'stable', percentage: 0 },
    };

    // Calculate average quality score
    const withScores = earnings.filter(e => e.qualityScore !== undefined);
    if (withScores.length > 0) {
      metrics.averageQualityScore = withScores.reduce((s, e) => s + (e.qualityScore || 0), 0) / withScores.length;
    }

    return metrics;
  }

  // ============================================================================
  // LEADERBOARD
  // ============================================================================

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    type: 'earnings' | 'completions' | 'quality',
    period: 'week' | 'month' | 'all',
    limit: number = 10,
    companyId?: string,
  ): Promise<LeaderboardEntry[]> {
    const now = new Date();
    let startDate = new Date(0);

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let query = this.db.collection(this.EARNINGS_COLLECTION) as any;

    if (period !== 'all') {
      query = query.where('recordedAt', '>=', admin.firestore.Timestamp.fromDate(startDate));
    }

    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.get();
    const earnings = snapshot.docs.map((d: any) => d.data() as VerificationEarning);

    // Aggregate by user
    const userStats: Record<string, {
      userId: string;
      earnings: number;
      completions: number;
      totalQuality: number;
      qualityCount: number;
    }> = {};

    for (const e of earnings) {
      if (!userStats[e.userId]) {
        userStats[e.userId] = {
          userId: e.userId,
          earnings: 0,
          completions: 0,
          totalQuality: 0,
          qualityCount: 0,
        };
      }
      userStats[e.userId].earnings += e.netAmount;
      userStats[e.userId].completions += 1;
      if (e.qualityScore !== undefined) {
        userStats[e.userId].totalQuality += e.qualityScore;
        userStats[e.userId].qualityCount += 1;
      }
    }

    // Sort by type
    const sorted = Object.values(userStats).sort((a, b) => {
      switch (type) {
        case 'earnings':
          return b.earnings - a.earnings;
        case 'completions':
          return b.completions - a.completions;
        case 'quality':
          const avgA = a.qualityCount > 0 ? a.totalQuality / a.qualityCount : 0;
          const avgB = b.qualityCount > 0 ? b.totalQuality / b.qualityCount : 0;
          return avgB - avgA;
        default:
          return 0;
      }
    });

    // Build leaderboard entries
    return sorted.slice(0, limit).map((u, index) => ({
      userId: u.userId,
      userName: `User ${u.userId.slice(-4)}`, // Would fetch actual names
      rank: index + 1,
      score: type === 'earnings' ? u.earnings : type === 'completions' ? u.completions : u.qualityCount > 0 ? u.totalQuality / u.qualityCount : 0,
      verificationsCompleted: u.completions,
      totalEarnings: u.earnings,
      qualityScore: u.qualityCount > 0 ? u.totalQuality / u.qualityCount : undefined,
    }));
  }

  // ============================================================================
  // EARNINGS GOALS
  // ============================================================================

  /**
   * Create earnings goal
   */
  async createEarningsGoal(
    userId: string,
    targetAmount: number,
    deadline: Date,
    type: 'daily' | 'weekly' | 'monthly' | 'custom',
    name?: string,
  ): Promise<EarningsGoal> {
    const goalId = this.generateId();
    const now = new Date();

    const goal: EarningsGoal = {
      id: goalId,
      userId,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Goal`,
      targetAmount,
      currentAmount: 0,
      deadline,
      type,
      createdAt: now,
      isCompleted: false,
      progressPercentage: 0,
    };

    await this.db.collection(this.GOALS_COLLECTION).doc(goalId).set({
      ...goal,
      deadline: admin.firestore.Timestamp.fromDate(deadline),
      createdAt: admin.firestore.Timestamp.fromDate(now),
    });

    return goal;
  }

  /**
   * Get active goals for user
   */
  async getActiveGoals(userId: string): Promise<EarningsGoal[]> {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await this.db
      .collection(this.GOALS_COLLECTION)
      .where('userId', '==', userId)
      .where('isCompleted', '==', false)
      .where('deadline', '>=', now)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        deadline: data.deadline?.toDate(),
        createdAt: data.createdAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as EarningsGoal;
    });
  }

  // ============================================================================
  // RECENT EARNINGS
  // ============================================================================

  /**
   * Get recent earnings
   */
  async getRecentEarnings(userId: string, limit: number = 20): Promise<VerificationEarning[]> {
    const snapshot = await this.db
      .collection(this.EARNINGS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('recordedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        completedAt: data.completedAt?.toDate(),
        recordedAt: data.recordedAt?.toDate(),
      } as VerificationEarning;
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateId(): string {
    return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}
