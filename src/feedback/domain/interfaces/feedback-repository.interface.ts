/**
 * Feedback Repository Interface
 */
import { FeedbackEntity } from '../entities';
import { FeedbackStatus, FeedbackType, FeedbackCategory, FeedbackPriority } from '../enums';

/**
 * Query options for listing feedback
 */
export interface FeedbackQueryOptions {
  status?: FeedbackStatus | FeedbackStatus[];
  type?: FeedbackType;
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  submittedBy?: string;
  submittedByRole?: string;
  assignedTo?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  searchTerm?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedFeedback {
  items: FeedbackEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Feedback statistics
 */
export interface FeedbackStats {
  total: number;
  byStatus: Record<FeedbackStatus, number>;
  byType: Record<FeedbackType, number>;
  byCategory: Record<FeedbackCategory, number>;
  byPriority: Record<FeedbackPriority, number>;
  averageResolutionTime: number; // in hours
  satisfactionAverage: number;
  openCount: number;
  resolvedThisWeek: number;
  submittedThisWeek: number;
}

/**
 * Repository injection token
 */
export const FEEDBACK_REPOSITORY_TOKEN = 'FEEDBACK_REPOSITORY';

/**
 * Feedback Repository Interface
 */
export interface IFeedbackRepository {
  /**
   * Create new feedback
   */
  create(feedback: FeedbackEntity): Promise<FeedbackEntity>;

  /**
   * Update feedback
   */
  update(feedback: FeedbackEntity): Promise<FeedbackEntity>;

  /**
   * Find by ID
   */
  findById(id: string): Promise<FeedbackEntity | null>;

  /**
   * Find by ticket number
   */
  findByTicketNumber(ticketNumber: string): Promise<FeedbackEntity | null>;

  /**
   * Find all with options
   */
  findAll(options: FeedbackQueryOptions): Promise<PaginatedFeedback>;

  /**
   * Find by user
   */
  findByUser(userId: string, options?: FeedbackQueryOptions): Promise<PaginatedFeedback>;

  /**
   * Find by related entity
   */
  findByRelatedEntity(entityType: string, entityId: string): Promise<FeedbackEntity[]>;

  /**
   * Get statistics
   */
  getStats(options?: { startDate?: Date; endDate?: Date; submittedByRole?: string }): Promise<FeedbackStats>;

  /**
   * Delete feedback
   */
  delete(id: string): Promise<void>;
}
