/**
 * Firestore KYC Request Repository
 * Implements IKycRequestRepository for Firestore persistence
 */
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  KycRequest,
  KycStatus,
  KycVerificationType,
  IKycRequestRepository,
  KycQueryFilters,
  KycQueryResult,
  KycQueryOptions,
  KycStatsFilters,
  KycStatistics,
} from '../../domain';
import { FirebaseConfigService } from '@/shared/config/firebase-config.service';

@Injectable()
export class FirestoreKycRequestRepository implements IKycRequestRepository {
  private readonly logger = new Logger(FirestoreKycRequestRepository.name);
  private readonly collectionName = 'kyc-requests';
  private readonly collection: admin.firestore.CollectionReference;

  constructor(private firebaseConfig: FirebaseConfigService) {
    this.collection = this.firebaseConfig.getCollection(this.collectionName);
    this.logger.log(`FirestoreKycRequestRepository initialized for collection: ${this.collectionName}`);
  }

  /**
   * Create a new KYC request
   */
  async create(request: KycRequest): Promise<KycRequest> {
    try {
      const docRef = this.collection.doc(request.id);
      const data = this.entityToFirestore(request);
      
      await docRef.set(data);
      
      this.logger.log(`KYC request created: ${request.id}`);
      return request;
    } catch (error) {
      this.logger.error(`Failed to create KYC request ${request.id}:`, error);
      throw new Error(`Failed to create KYC request: ${error.message}`);
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<KycRequest | null> {
    try {
      const docSnap = await this.collection.doc(id).get();
      
      if (!docSnap.exists) {
        this.logger.log(`KYC request not found: ${id}`);
        return null;
      }

      return this.firestoreToEntity(docSnap.data(), id);
    } catch (error) {
      this.logger.error(`Failed to find KYC request ${id}:`, error);
      throw new Error(`Failed to find KYC request: ${error.message}`);
    }
  }

  /**
   * Find by verification token
   */
  async findByToken(token: string): Promise<KycRequest | null> {
    try {
      const querySnapshot = await this.collection
        .where('verificationToken.token', '==', token)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return this.firestoreToEntity(doc.data(), doc.id);
    } catch (error) {
      this.logger.error(`Failed to find KYC request by token:`, error);
      throw new Error(`Failed to find KYC request by token: ${error.message}`);
    }
  }

  /**
   * Find by bank reference
   */
  async findByBankReference(bankId: string, reference: string): Promise<KycRequest | null> {
    try {
      const querySnapshot = await this.collection
        .where('bankId', '==', bankId)
        .where('bankReference', '==', reference)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return this.firestoreToEntity(doc.data(), doc.id);
    } catch (error) {
      this.logger.error(`Failed to find KYC request by reference:`, error);
      throw new Error(`Failed to find KYC request by reference: ${error.message}`);
    }
  }

  /**
   * Update a KYC request
   */
  async update(request: KycRequest): Promise<KycRequest> {
    try {
      const docRef = this.collection.doc(request.id);
      const data = this.entityToFirestore(request);
      
      await docRef.set(data, { merge: true });
      
      this.logger.log(`KYC request updated: ${request.id}`);
      return request;
    } catch (error) {
      this.logger.error(`Failed to update KYC request ${request.id}:`, error);
      throw new Error(`Failed to update KYC request: ${error.message}`);
    }
  }

  /**
   * Find by status
   */
  async findByStatus(status: KycStatus | KycStatus[]): Promise<KycRequest[]> {
    try {
      const statuses = Array.isArray(status) ? status : [status];
      const querySnapshot = await this.collection
        .where('status', 'in', statuses)
        .orderBy('createdAt', 'desc')
        .get();

      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find KYC requests by status:`, error);
      throw new Error(`Failed to find KYC requests by status: ${error.message}`);
    }
  }

  /**
   * Query with filters
   */
  async query(filters: KycQueryFilters): Promise<KycQueryResult> {
    try {
      let query: admin.firestore.Query = this.collection;

      if (filters.bankId) {
        query = query.where('bankId', '==', filters.bankId);
      }

      if (filters.companyId) {
        query = query.where('companyId', '==', filters.companyId);
      }

      if (filters.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }

      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        if (statuses.length === 1) {
          query = query.where('status', '==', statuses[0]);
        } else {
          query = query.where('status', 'in', statuses);
        }
      }

      if (filters.verificationType) {
        query = query.where('verificationType', '==', filters.verificationType);
      }

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(filters.dateFrom));
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(filters.dateTo));
      }

      query = query.orderBy('createdAt', 'desc');

      // Get total count
      const countSnapshot = await query.get();
      const total = countSnapshot.size;

      // Apply pagination
      const page = 1;
      const limit = 20;
      const pages = Math.ceil(total / limit);

      query = query.limit(limit);

      const querySnapshot = await query.get();
      let items = querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));

      // Apply search filter (post-query)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        items = items.filter(item =>
          item.customer.fullName.toLowerCase().includes(searchLower) ||
          item.bankReference.toLowerCase().includes(searchLower) ||
          item.location.address.toLowerCase().includes(searchLower)
        );
      }

      return {
        items,
        total,
        page,
        limit,
        pages,
      };
    } catch (error) {
      this.logger.error(`Failed to query KYC requests:`, error);
      throw new Error(`Failed to query KYC requests: ${error.message}`);
    }
  }

  /**
   * Find by bank ID
   */
  async findByBankId(bankId: string, options?: KycQueryOptions): Promise<KycRequest[]> {
    try {
      let query: admin.firestore.Query = this.collection
        .where('bankId', '==', bankId)
        .orderBy('createdAt', 'desc');

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const querySnapshot = await query.get();
      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find KYC requests by bank:`, error);
      throw new Error(`Failed to find KYC requests by bank: ${error.message}`);
    }
  }

  /**
   * Find by company ID
   */
  async findByCompanyId(companyId: string, options?: KycQueryOptions): Promise<KycRequest[]> {
    try {
      let query: admin.firestore.Query = this.collection
        .where('companyId', '==', companyId)
        .orderBy('createdAt', 'desc');

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const querySnapshot = await query.get();
      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find KYC requests by company:`, error);
      throw new Error(`Failed to find KYC requests by company: ${error.message}`);
    }
  }

  /**
   * Find by rider ID
   */
  async findByRiderId(riderId: string, options?: KycQueryOptions): Promise<KycRequest[]> {
    try {
      let query: admin.firestore.Query = this.collection
        .where('riderId', '==', riderId)
        .orderBy('createdAt', 'desc');

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const querySnapshot = await query.get();
      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find KYC requests by rider:`, error);
      throw new Error(`Failed to find KYC requests by rider: ${error.message}`);
    }
  }

  /**
   * Find pending assignments
   */
  async findPendingAssignments(): Promise<KycRequest[]> {
    try {
      const querySnapshot = await this.collection
        .where('status', '==', KycStatus.PENDING_ASSIGNMENT)
        .orderBy('urgency', 'desc')
        .orderBy('createdAt', 'asc')
        .get();

      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find pending assignments:`, error);
      throw new Error(`Failed to find pending assignments: ${error.message}`);
    }
  }

  /**
   * Find scheduled for today
   */
  async findScheduledForToday(): Promise<KycRequest[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const querySnapshot = await this.collection
        .where('schedule.scheduledDate', '>=', admin.firestore.Timestamp.fromDate(today))
        .where('schedule.scheduledDate', '<', admin.firestore.Timestamp.fromDate(tomorrow))
        .where('status', '==', KycStatus.SCHEDULED)
        .get();

      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find scheduled for today:`, error);
      throw new Error(`Failed to find scheduled for today: ${error.message}`);
    }
  }

  /**
   * Find expired requests
   */
  async findExpired(): Promise<KycRequest[]> {
    try {
      const now = new Date();

      const querySnapshot = await this.collection
        .where('schedule.scheduledDate', '<', admin.firestore.Timestamp.fromDate(now))
        .where('status', 'in', [
          KycStatus.SCHEDULED,
          KycStatus.RIDER_EN_ROUTE,
        ])
        .get();

      return querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Failed to find expired requests:`, error);
      throw new Error(`Failed to find expired requests: ${error.message}`);
    }
  }

  /**
   * Count by status
   */
  async countByStatus(status: KycStatus): Promise<number> {
    try {
      const querySnapshot = await this.collection
        .where('status', '==', status)
        .count()
        .get();

      return querySnapshot.data().count;
    } catch (error) {
      this.logger.error(`Failed to count by status:`, error);
      throw new Error(`Failed to count by status: ${error.message}`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(filters?: KycStatsFilters): Promise<KycStatistics> {
    try {
      let query: admin.firestore.Query = this.collection;

      if (filters?.bankId) {
        query = query.where('bankId', '==', filters.bankId);
      }

      if (filters?.companyId) {
        query = query.where('companyId', '==', filters.companyId);
      }

      if (filters?.riderId) {
        query = query.where('riderId', '==', filters.riderId);
      }

      if (filters?.dateFrom) {
        query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(filters.dateFrom));
      }

      if (filters?.dateTo) {
        query = query.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(filters.dateTo));
      }

      const querySnapshot = await query.get();
      const requests = querySnapshot.docs.map(doc => this.firestoreToEntity(doc.data(), doc.id));

      // Calculate statistics
      const byStatus: Record<KycStatus, number> = {} as Record<KycStatus, number>;
      const byType: Record<KycVerificationType, number> = {} as Record<KycVerificationType, number>;
      let totalRating = 0;
      let ratingCount = 0;
      let totalCompletionTime = 0;
      let completedCount = 0;

      for (const request of requests) {
        // Count by status
        byStatus[request.status] = (byStatus[request.status] || 0) + 1;

        // Count by type
        byType[request.verificationType] = (byType[request.verificationType] || 0) + 1;

        // Calculate average rating
        if (request.customerRating) {
          totalRating += request.customerRating.overallRating;
          ratingCount++;
        }

        // Calculate completion time
        if (request.status === KycStatus.COMPLETED && request.completedAt) {
          const completionTime = request.completedAt.getTime() - request.createdAt.getTime();
          totalCompletionTime += completionTime / (1000 * 60 * 60); // Convert to hours
          completedCount++;
        }
      }

      return {
        total: requests.length,
        byStatus,
        byType,
        avgCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
        completionRate: requests.length > 0 ? (completedCount / requests.length) * 100 : 0,
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics:`, error);
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  // =========================================================================
  // SERIALIZATION HELPERS
  // =========================================================================

  /**
   * Convert entity to Firestore document
   * Uses entity's toJSON and converts dates to Firestore timestamps
   */
  private entityToFirestore(request: KycRequest): Record<string, any> {
    const json = request.toJSON() as Record<string, any>;
    
    // Convert ISO date strings to Firestore timestamps
    return this.convertDatesToTimestamps(json);
  }

  /**
   * Convert Firestore document to entity
   * Converts Firestore timestamps to ISO strings for entity's fromJSON
   */
  private firestoreToEntity(data: admin.firestore.DocumentData, id: string): KycRequest {
    // Convert Firestore timestamps to ISO strings
    const json = this.convertTimestampsToStrings(data);
    json.id = id;
    
    return KycRequest.fromJSON(json);
  }

  /**
   * Recursively convert Date strings/objects to Firestore Timestamps
   */
  private convertDatesToTimestamps(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Check if it's an ISO date string
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
        return admin.firestore.Timestamp.fromDate(new Date(obj));
      }
      return obj;
    }

    if (obj instanceof Date) {
      return admin.firestore.Timestamp.fromDate(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDatesToTimestamps(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.convertDatesToTimestamps(obj[key]);
      }
      return result;
    }

    return obj;
  }

  /**
   * Recursively convert Firestore Timestamps to ISO date strings
   */
  private convertTimestampsToStrings(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Check if it's a Firestore Timestamp
    if (obj instanceof admin.firestore.Timestamp) {
      return obj.toDate().toISOString();
    }

    // Check for Timestamp-like object (has toDate method)
    if (typeof obj === 'object' && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertTimestampsToStrings(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.convertTimestampsToStrings(obj[key]);
      }
      return result;
    }

    return obj;
  }
}
