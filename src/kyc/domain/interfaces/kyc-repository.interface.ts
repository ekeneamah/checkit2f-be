/**
 * KYC Repository Interface
 * Defines the contract for KYC data persistence
 */
import { KycRequest } from '../entities';
import { KycStatus, KycVerificationType } from '../enums';

export interface IKycRequestRepository {
  /**
   * Create a new KYC request
   */
  create(request: KycRequest): Promise<KycRequest>;

  /**
   * Find by ID
   */
  findById(id: string): Promise<KycRequest | null>;

  /**
   * Find by verification token
   */
  findByToken(token: string): Promise<KycRequest | null>;

  /**
   * Find by bank reference
   */
  findByBankReference(bankId: string, reference: string): Promise<KycRequest | null>;

  /**
   * Update a KYC request
   */
  update(request: KycRequest): Promise<KycRequest>;

  /**
   * Find by status
   */
  findByStatus(status: KycStatus | KycStatus[]): Promise<KycRequest[]>;

  /**
   * Query with filters
   */
  query(filters: KycQueryFilters): Promise<KycQueryResult>;

  /**
   * Find by bank ID
   */
  findByBankId(bankId: string, options?: KycQueryOptions): Promise<KycRequest[]>;

  /**
   * Find by company ID
   */
  findByCompanyId(companyId: string, options?: KycQueryOptions): Promise<KycRequest[]>;

  /**
   * Find by rider ID
   */
  findByRiderId(riderId: string, options?: KycQueryOptions): Promise<KycRequest[]>;

  /**
   * Find pending assignments
   */
  findPendingAssignments(): Promise<KycRequest[]>;

  /**
   * Find scheduled for today
   */
  findScheduledForToday(): Promise<KycRequest[]>;

  /**
   * Find expired (past scheduled date without completion)
   */
  findExpired(): Promise<KycRequest[]>;

  /**
   * Count by status
   */
  countByStatus(status: KycStatus): Promise<number>;

  /**
   * Get statistics
   */
  getStatistics(filters?: KycStatsFilters): Promise<KycStatistics>;
}

/**
 * Query filters
 */
export interface KycQueryFilters {
  bankId?: string;
  companyId?: string;
  riderId?: string;
  status?: KycStatus | KycStatus[];
  verificationType?: KycVerificationType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Query options
 */
export interface KycQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query result
 */
export interface KycQueryResult {
  items: KycRequest[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Statistics filters
 */
export interface KycStatsFilters {
  bankId?: string;
  companyId?: string;
  riderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Statistics result
 */
export interface KycStatistics {
  total: number;
  byStatus: Record<KycStatus, number>;
  byType: Record<KycVerificationType, number>;
  avgCompletionTime: number; // in hours
  completionRate: number; // percentage
  averageRating: number;
}

export const KYC_REPOSITORY_TOKEN = Symbol('IKycRequestRepository');
