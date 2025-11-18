import { VerificationRequest } from '../../domain';

/**
 * Repository interface for VerificationRequest entity
 * Defines the contract for data persistence operations
 */
export interface IVerificationRequestRepository {
  /**
   * Save a verification request (create or update)
   */
  save(verificationRequest: VerificationRequest): Promise<VerificationRequest>;

  /**
   * Find verification request by ID
   */
  findById(id: string): Promise<VerificationRequest | null>;

  /**
   * Find all verification requests for a client
   */
  findByClientId(clientId: string, options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<VerificationRequest[]>;

  /**
   * Find verification requests by status
   */
  findByStatus(status: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<VerificationRequest[]>;

  /**
   * Find verification requests assigned to an agent
   */
  findByAgentId(agentId: string, options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<VerificationRequest[]>;

  /**
   * Find verification requests with advanced filtering
   */
  findWithFilters(filters: {
    clientId?: string;
    agentId?: string;
    status?: string;
    verificationType?: string;
    urgency?: string;
    dateFrom?: Date;
    dateTo?: Date;
    location?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    };
  }, options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    items: VerificationRequest[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  /**
   * Update verification request status
   */
  updateStatus(id: string, status: string, reason?: string): Promise<VerificationRequest | null>;

  /**
   * Assign agent to verification request
   */
  assignAgent(id: string, agentId: string): Promise<VerificationRequest | null>;

  /**
   * Update payment information
   */
  updatePayment(id: string, paymentId: string, paymentStatus: string): Promise<VerificationRequest | null>;

  /**
   * Find verification request by payment reference
   */
  findByPaymentReference(paymentReference: string): Promise<VerificationRequest | null>;

  /**
   * Delete verification request
   */
  delete(id: string): Promise<boolean>;

  /**
   * Count verification requests
   */
  count(filters?: {
    clientId?: string;
    agentId?: string;
    status?: string;
    verificationType?: string;
  }): Promise<number>;

  /**
   * Check if verification request exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get verification requests due for completion
   */
  findOverdueRequests(): Promise<VerificationRequest[]>;

  /**
   * Get verification requests by date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<VerificationRequest[]>;

  /**
   * Archive old verification requests
   */
  archiveOldRequests(olderThanDays: number): Promise<number>;
}