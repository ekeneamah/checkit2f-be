/**
 * Firestore Feedback Repository
 * Implements IFeedbackRepository for Firebase Firestore
 */
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';
import {
  FeedbackEntity,
  IFeedbackRepository,
  FeedbackQueryOptions,
  PaginatedFeedback,
  FeedbackStats,
} from '../../domain';
import { FeedbackStatus, FeedbackType, FeedbackCategory, FeedbackPriority } from '../../domain/enums';

const COLLECTION_NAME = 'feedback';

@Injectable()
export class FirestoreFeedbackRepository implements IFeedbackRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  private get collection() {
    return this.firebaseService.db.collection(COLLECTION_NAME);
  }

  /**
   * Create new feedback
   */
  async create(feedback: FeedbackEntity): Promise<FeedbackEntity> {
    const data = this.toFirestore(feedback);
    await this.collection.doc(feedback.id).set(data);
    return feedback;
  }

  /**
   * Update feedback
   */
  async update(feedback: FeedbackEntity): Promise<FeedbackEntity> {
    const data = this.toFirestore(feedback);
    await this.collection.doc(feedback.id).update(data);
    return feedback;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<FeedbackEntity | null> {
    const doc = await this.collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    return this.fromFirestore(doc);
  }

  /**
   * Find by ticket number
   */
  async findByTicketNumber(ticketNumber: string): Promise<FeedbackEntity | null> {
    const snapshot = await this.collection
      .where('ticketNumber', '==', ticketNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Find all with options
   */
  async findAll(options: FeedbackQueryOptions): Promise<PaginatedFeedback> {
    let query: FirebaseFirestore.Query = this.collection;

    // Apply filters
    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.where('status', 'in', options.status);
      } else {
        query = query.where('status', '==', options.status);
      }
    }

    if (options.type) {
      query = query.where('type', '==', options.type);
    }

    if (options.category) {
      query = query.where('category', '==', options.category);
    }

    if (options.priority) {
      query = query.where('priority', '==', options.priority);
    }

    if (options.submittedBy) {
      query = query.where('submittedBy', '==', options.submittedBy);
    }

    if (options.submittedByRole) {
      query = query.where('submittedByRole', '==', options.submittedByRole);
    }

    if (options.assignedTo) {
      query = query.where('assignedTo', '==', options.assignedTo);
    }

    // Get total count
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    query = query.orderBy(sortBy, sortOrder);

    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    if (offset > 0) {
      query = query.offset(offset);
    }
    query = query.limit(limit);

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => this.fromFirestore(doc));

    // Apply search filter in memory if provided
    let filteredItems = items;
    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filteredItems = items.filter(
        (item) =>
          item.subject.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.ticketNumber.toLowerCase().includes(searchLower) ||
          item.submittedByName.toLowerCase().includes(searchLower) ||
          item.submittedByEmail.toLowerCase().includes(searchLower)
      );
    }

    return {
      items: filteredItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find by user
   */
  async findByUser(userId: string, options?: FeedbackQueryOptions): Promise<PaginatedFeedback> {
    return this.findAll({ ...options, submittedBy: userId });
  }

  /**
   * Find by related entity
   */
  async findByRelatedEntity(entityType: string, entityId: string): Promise<FeedbackEntity[]> {
    // Firestore doesn't support array-contains with object properties directly
    // We need to fetch all and filter in memory
    const snapshot = await this.collection.get();
    
    const results: FeedbackEntity[] = [];
    for (const doc of snapshot.docs) {
      const feedback = this.fromFirestore(doc);
      const hasRelatedEntity = feedback.relatedEntities?.some(
        (e) => e.entityType === entityType && e.entityId === entityId
      );
      if (hasRelatedEntity) {
        results.push(feedback);
      }
    }

    return results;
  }

  /**
   * Get statistics
   */
  async getStats(options?: { startDate?: Date; endDate?: Date; submittedByRole?: string }): Promise<FeedbackStats> {
    let query: FirebaseFirestore.Query = this.collection;

    if (options?.submittedByRole) {
      query = query.where('submittedByRole', '==', options.submittedByRole);
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => this.fromFirestore(doc));

    // Filter by date range if provided
    let filteredItems = items;
    if (options?.startDate || options?.endDate) {
      filteredItems = items.filter((item) => {
        if (options.startDate && item.createdAt < options.startDate) return false;
        if (options.endDate && item.createdAt > options.endDate) return false;
        return true;
      });
    }

    // Calculate stats
    const byStatus: Record<FeedbackStatus, number> = {} as Record<FeedbackStatus, number>;
    const byType: Record<FeedbackType, number> = {} as Record<FeedbackType, number>;
    const byCategory: Record<FeedbackCategory, number> = {} as Record<FeedbackCategory, number>;
    const byPriority: Record<FeedbackPriority, number> = {} as Record<FeedbackPriority, number>;

    // Initialize counts
    Object.values(FeedbackStatus).forEach((s) => (byStatus[s] = 0));
    Object.values(FeedbackType).forEach((t) => (byType[t] = 0));
    Object.values(FeedbackCategory).forEach((c) => (byCategory[c] = 0));
    Object.values(FeedbackPriority).forEach((p) => (byPriority[p] = 0));

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let totalSatisfaction = 0;
    let satisfactionCount = 0;
    let openCount = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let resolvedThisWeek = 0;
    let submittedThisWeek = 0;

    for (const item of filteredItems) {
      byStatus[item.status]++;
      byType[item.type]++;
      byCategory[item.category]++;
      byPriority[item.priority]++;

      if (item.isOpen()) {
        openCount++;
      }

      if (item.resolvedAt && item.createdAt) {
        const resolutionTime = (item.resolvedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60);
        totalResolutionTime += resolutionTime;
        resolvedCount++;

        if (item.resolvedAt >= oneWeekAgo) {
          resolvedThisWeek++;
        }
      }

      if (item.satisfactionRating) {
        totalSatisfaction += item.satisfactionRating;
        satisfactionCount++;
      }

      if (item.createdAt >= oneWeekAgo) {
        submittedThisWeek++;
      }
    }

    return {
      total: filteredItems.length,
      byStatus,
      byType,
      byCategory,
      byPriority,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      satisfactionAverage: satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0,
      openCount,
      resolvedThisWeek,
      submittedThisWeek,
    };
  }

  /**
   * Delete feedback
   */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  /**
   * Convert to Firestore document
   */
  private toFirestore(entity: FeedbackEntity): Record<string, unknown> {
    const data = entity.toObject();
    return {
      ...data,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      assignedAt: data.assignedAt || null,
      resolvedAt: data.resolvedAt || null,
      statusHistory: data.statusHistory?.map((h) => ({
        ...h,
        changedAt: h.changedAt,
      })) || [],
      responses: data.responses?.map((r) => ({
        ...r,
        createdAt: r.createdAt,
      })) || [],
      attachments: data.attachments?.map((a) => ({
        ...a,
        uploadedAt: a.uploadedAt,
      })) || [],
    };
  }

  /**
   * Convert from Firestore document
   */
  private fromFirestore(doc: FirebaseFirestore.DocumentSnapshot): FeedbackEntity {
    const data = doc.data();
    if (!data) {
      throw new Error(`Document ${doc.id} has no data`);
    }

    return FeedbackEntity.fromPersistence({
      id: doc.id,
      ticketNumber: data.ticketNumber,
      type: data.type,
      category: data.category,
      priority: data.priority,
      status: data.status,
      source: data.source,
      submittedBy: data.submittedBy,
      submittedByEmail: data.submittedByEmail,
      submittedByName: data.submittedByName,
      submittedByRole: data.submittedByRole,
      submittedByPhone: data.submittedByPhone,
      subject: data.subject,
      description: data.description,
      attachments: data.attachments?.map((a: Record<string, unknown>) => ({
        ...a,
        uploadedAt: this.toDate(a.uploadedAt),
      })) || [],
      relatedEntities: data.relatedEntities || [],
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      assignedAt: this.toDate(data.assignedAt),
      resolution: data.resolution,
      resolvedBy: data.resolvedBy,
      resolvedAt: this.toDate(data.resolvedAt),
      responses: data.responses?.map((r: Record<string, unknown>) => ({
        ...r,
        createdAt: this.toDate(r.createdAt),
      })) || [],
      statusHistory: data.statusHistory?.map((h: Record<string, unknown>) => ({
        ...h,
        changedAt: this.toDate(h.changedAt),
      })) || [],
      satisfactionRating: data.satisfactionRating,
      satisfactionComment: data.satisfactionComment,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    });
  }

  /**
   * Convert Firestore timestamp to Date
   */
  private toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return undefined;
  }
}
