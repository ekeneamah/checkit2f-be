import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { 
  VerificationRequest, 
  Location, 
  Price, 
  VerificationType, 
  VerificationStatus 
} from '../../domain';
import { IVerificationRequestRepository } from '../../application/interfaces/verification-request.repository.interface';
import { FirebaseConfigService } from '../../../shared/config/firebase-config.service';

/**
 * Firestore implementation of VerificationRequest repository
 * Handles all data persistence operations for verification requests
 */
@Injectable()
export class FirestoreVerificationRequestRepository implements IVerificationRequestRepository {
  private readonly logger = new Logger(FirestoreVerificationRequestRepository.name);
  private readonly collectionName = 'verification-requests';
  private readonly collection: admin.firestore.CollectionReference;

  constructor(private firebaseConfig: FirebaseConfigService) {
    this.collection = this.firebaseConfig.getCollection(this.collectionName);
    console.log(`FirestoreVerificationRequestRepository initialized for collection: ${this.collectionName}`);
  }

  /**
   * Save a verification request (create or update)
   */
  async save(verificationRequest: VerificationRequest): Promise<VerificationRequest> {
    try {
      const docRef = this.collection.doc(verificationRequest.id);
      const data = this.entityToFirestore(verificationRequest);
      
      await docRef.set(data, { merge: true });
      
      console.log(`Verification request saved: ${verificationRequest.id}`);
      return verificationRequest;
    } catch (error) {
      this.logger.error(`Failed to save verification request ${verificationRequest.id}:`, error);
      throw new Error(`Failed to save verification request: ${error.message}`);
    }
  }

  /**
   * Find verification request by ID
   */
  async findById(id: string): Promise<VerificationRequest | null> {
    try {
      const docSnap = await this.collection.doc(id).get();
      
      if (!docSnap.exists) {
        console.log(`Verification request not found: ${id}`);
        return null;
      }

      const data = docSnap.data();
      const verificationRequest = this.firestoreToEntity(data, id);
      
      console.log(`Verification request found: ${id}`);
      return verificationRequest;
    } catch (error) {
      this.logger.error(`Failed to find verification request ${id}:`, error);
      throw new Error(`Failed to find verification request: ${error.message}`);
    }
  }

  /**
   * Find all verification requests for a client
   */
  async findByClientId(
    clientId: string, 
    options: { limit?: number; offset?: number; status?: string; orderBy?: boolean } = {}
  ): Promise<VerificationRequest[]> {
    try {
      let query: admin.firestore.Query = this.collection.where('clientId', '==', clientId);

      if (options.status) {
        query = query.where('status.status', '==', options.status);
      }

      // Only order if explicitly requested (requires composite index)
      if (options.orderBy !== false) {
        query = query.orderBy('createdAt', 'desc');
      }

      if (options.offset) {
        query = query.offset(options.offset);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const querySnapshot = await query.get();
      const verificationRequests = querySnapshot.docs.map(doc => 
        this.firestoreToEntity(doc.data(), doc.id)
      );

      console.log(`Found ${verificationRequests.length} verification requests for client: ${clientId}`);
      return verificationRequests;
    } catch (error) {
      this.logger.error(`Failed to find verification requests for client ${clientId}:`, error);
      throw new Error(`Failed to find verification requests: ${error.message}`);
    }
  }

  /**
   * Find verification requests by status
   */
  async findByStatus(
    status: string, 
    options: { limit?: number; offset?: number } = {}
  ): Promise<VerificationRequest[]> {
    try {
      let query: admin.firestore.Query = this.collection.where('status.status', '==', status);
      query = query.orderBy('createdAt', 'desc');

      if (options.offset) {
        query = query.offset(options.offset);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const querySnapshot = await query.get();
      const verificationRequests = querySnapshot.docs.map(doc => 
        this.firestoreToEntity(doc.data(), doc.id)
      );

      console.log(`Found ${verificationRequests.length} verification requests with status: ${status}`);
      return verificationRequests;
    } catch (error) {
      this.logger.error(`Failed to find verification requests by status ${status}:`, error);
      throw new Error(`Failed to find verification requests: ${error.message}`);
    }
  }

  /**
   * Find verification requests assigned to an agent
   */
  async findByAgentId(
    agentId: string, 
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<VerificationRequest[]> {
    try {
      let query: admin.firestore.Query = this.collection.where('assignedAgentId', '==', agentId);

      if (options.status) {
        query = query.where('status.status', '==', options.status);
      }

      query = query.orderBy('createdAt', 'desc');

      if (options.offset) {
        query = query.offset(options.offset);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const querySnapshot = await query.get();
      const verificationRequests = querySnapshot.docs.map(doc => 
        this.firestoreToEntity(doc.data(), doc.id)
      );

      console.log(`Found ${verificationRequests.length} verification requests for agent: ${agentId}`);
      return verificationRequests;
    } catch (error) {
      this.logger.error(`Failed to find verification requests for agent ${agentId}:`, error);
      throw new Error(`Failed to find verification requests: ${error.message}`);
    }
  }

  /**
   * Find verification requests with advanced filtering
   */
  async findWithFilters(
    filters: {
      clientId?: string;
      agentId?: string;
      status?: string;
      verificationType?: string;
      urgency?: string;
      dateFrom?: Date;
      dateTo?: Date;
      location?: { latitude: number; longitude: number; radiusKm: number };
    },
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    items: VerificationRequest[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      let query: admin.firestore.Query = this.collection;

      // Apply filters
      if (filters.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }

      if (filters.agentId) {
        query = query.where('assignedAgentId', '==', filters.agentId);
      }

      if (filters.status) {
        query = query.where('status.status', '==', filters.status);
      }

      if (filters.verificationType) {
        query = query.where('verificationType.type', '==', filters.verificationType);
      }

      if (filters.urgency) {
        query = query.where('verificationType.urgency', '==', filters.urgency);
      }

      if (filters.dateFrom) {
        query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(filters.dateFrom));
      }

      if (filters.dateTo) {
        query = query.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(filters.dateTo));
      }

      // Apply sorting
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      query = query.orderBy(sortBy, sortOrder);

      // Get total count (for pagination)
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Apply pagination
      if (options.offset) {
        query = query.offset(options.offset);
      }

      const limit = options.limit || 10;
      query = query.limit(limit);

      const querySnapshot = await query.get();
      let verificationRequests = querySnapshot.docs.map(doc => 
        this.firestoreToEntity(doc.data(), doc.id)
      );

      // Apply location filter if specified (post-query filtering)
      if (filters.location) {
        verificationRequests = verificationRequests.filter(request => {
          const distance = request.location.distanceTo(
            new Location(
              '',
              filters.location!.latitude,
              filters.location!.longitude
            )
          );
          return distance <= filters.location!.radiusKm;
        });
      }

      const page = Math.floor((options.offset || 0) / limit) + 1;
      const totalPages = Math.ceil(total / limit);

      console.log(`Found ${verificationRequests.length} verification requests with filters`);

      return {
        items: verificationRequests,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to find verification requests with filters:', error);
      throw new Error(`Failed to find verification requests: ${error.message}`);
    }
  }

  /**
   * Update verification request status
   */
  async updateStatus(id: string, status: string, reason?: string): Promise<VerificationRequest | null> {
    try {
      const docRef = this.collection.doc(id);
      const newStatus = new VerificationStatus(status as any, reason);
      
      await docRef.update({
        'status': this.statusToFirestore(newStatus),
        'modifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Status updated for verification request ${id}: ${status}`);
      return await this.findById(id);
    } catch (error) {
      this.logger.error(`Failed to update status for verification request ${id}:`, error);
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Assign agent to verification request
   */
  async assignAgent(id: string, agentId: string): Promise<VerificationRequest | null> {
    try {
      const docRef = this.collection.doc(id);
      
      await docRef.update({
        assignedAgentId: agentId,
        'status': this.statusToFirestore(new VerificationStatus('ASSIGNED' as any)),
        'modifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Agent ${agentId} assigned to verification request: ${id}`);
      return await this.findById(id);
    } catch (error) {
      this.logger.error(`Failed to assign agent to verification request ${id}:`, error);
      throw new Error(`Failed to assign agent: ${error.message}`);
    }
  }

  /**
   * Update payment information
   */
  async updatePayment(id: string, paymentId: string, paymentStatus: string): Promise<VerificationRequest | null> {
    try {
      const docRef = this.collection.doc(id);
      
      await docRef.update({
        paymentId,
        paymentStatus,
        'modifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Payment updated for verification request ${id}: ${paymentStatus}`);
      return await this.findById(id);
    } catch (error) {
      this.logger.error(`Failed to update payment for verification request ${id}:`, error);
      throw new Error(`Failed to update payment: ${error.message}`);
    }
  }

  /**
   * Find verification request by payment reference
   */
  async findByPaymentReference(paymentReference: string): Promise<VerificationRequest | null> {
    try {
      const snapshot = await this.collection
        .where('paymentReference', '==', paymentReference)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`No verification request found with payment reference: ${paymentReference}`);
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      const request = this.firestoreToEntity(data, doc.id);
      
      console.log(`Found verification request ${request.id} with payment reference: ${paymentReference}`);
      return request;
    } catch (error) {
      this.logger.error(`Failed to find verification request by payment reference ${paymentReference}:`, error);
      throw new Error(`Failed to find by payment reference: ${error.message}`);
    }
  }

  /**
   * Delete verification request
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.collection.doc(id).delete();
      
      console.log(`Verification request deleted: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete verification request ${id}:`, error);
      return false;
    }
  }

  /**
   * Count verification requests
   */
  async count(filters: {
    clientId?: string;
    agentId?: string;
    status?: string;
    verificationType?: string;
  } = {}): Promise<number> {
    try {
      let query: admin.firestore.Query = this.collection;

      if (filters.clientId) {
        query = query.where('clientId', '==', filters.clientId);
      }

      if (filters.agentId) {
        query = query.where('assignedAgentId', '==', filters.agentId);
      }

      if (filters.status) {
        query = query.where('status.status', '==', filters.status);
      }

      if (filters.verificationType) {
        query = query.where('verificationType.type', '==', filters.verificationType);
      }

      const snapshot = await query.get();
      const count = snapshot.size;

      console.log(`Count result: ${count} verification requests`);
      return count;
    } catch (error) {
      this.logger.error('Failed to count verification requests:', error);
      throw new Error(`Failed to count verification requests: ${error.message}`);
    }
  }

  /**
   * Check if verification request exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const docSnap = await this.collection.doc(id).get();
      return docSnap.exists;
    } catch (error) {
      this.logger.error(`Failed to check existence of verification request ${id}:`, error);
      return false;
    }
  }

  /**
   * Get verification requests due for completion
   */
  async findOverdueRequests(): Promise<VerificationRequest[]> {
    try {
      const now = admin.firestore.Timestamp.now();
      
      const query = this.collection
        .where('estimatedCompletionDate', '<=', now)
        .where('status.status', 'in', ['ASSIGNED', 'IN_PROGRESS']);

      const querySnapshot = await query.get();
      const verificationRequests = querySnapshot.docs.map(doc => 
        this.firestoreToEntity(doc.data(), doc.id)
      );

      console.log(`Found ${verificationRequests.length} overdue verification requests`);
      return verificationRequests;
    } catch (error) {
      this.logger.error('Failed to find overdue verification requests:', error);
      throw new Error(`Failed to find overdue requests: ${error.message}`);
    }
  }

  /**
   * Get verification requests by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<VerificationRequest[]> {
    try {
      const query = this.collection
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
        .orderBy('createdAt', 'desc');

      const querySnapshot = await query.get();
      const verificationRequests = querySnapshot.docs.map(doc => 
        this.firestoreToEntity(doc.data(), doc.id)
      );

      console.log(`Found ${verificationRequests.length} verification requests in date range`);
      return verificationRequests;
    } catch (error) {
      this.logger.error('Failed to find verification requests by date range:', error);
      throw new Error(`Failed to find verification requests: ${error.message}`);
    }
  }

  /**
   * Archive old verification requests
   */
  async archiveOldRequests(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const query = this.collection
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(cutoffDate))
        .where('status.status', 'in', ['COMPLETED', 'CANCELLED', 'REJECTED']);

      const querySnapshot = await query.get();
      const batch = this.firebaseConfig.createBatch();

      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { archived: true });
      });

      await batch.commit();
      
      console.log(`Archived ${querySnapshot.size} old verification requests`);
      return querySnapshot.size;
    } catch (error) {
      this.logger.error('Failed to archive old verification requests:', error);
      throw new Error(`Failed to archive requests: ${error.message}`);
    }
  }

  /**
   * Convert entity to Firestore document
   */
  private entityToFirestore(entity: VerificationRequest): any {
    const data = entity.toJSON();
    
    return {
      ...data,
      createdAt: admin.firestore.Timestamp.fromDate(entity.createdAt),
      modifiedAt: admin.firestore.Timestamp.fromDate(entity.modifiedAt),
      scheduledDate: data.scheduledDate ? admin.firestore.Timestamp.fromDate(new Date(data.scheduledDate)) : null,
      estimatedCompletionDate: data.estimatedCompletionDate ? admin.firestore.Timestamp.fromDate(new Date(data.estimatedCompletionDate)) : null,
      actualCompletionDate: data.actualCompletionDate ? admin.firestore.Timestamp.fromDate(new Date(data.actualCompletionDate)) : null,
    };
  }

  /**
   * Convert Firestore document to entity
   */
  private firestoreToEntity(data: any, id: string): VerificationRequest {
    // Convert Firestore timestamps back to dates
    const entityData = {
      ...data,
      id,
      createdAt: data.createdAt?.toDate()?.toISOString(),
      modifiedAt: data.modifiedAt?.toDate()?.toISOString(),
      scheduledDate: data.scheduledDate?.toDate()?.toISOString(),
      estimatedCompletionDate: data.estimatedCompletionDate?.toDate()?.toISOString(),
      actualCompletionDate: data.actualCompletionDate?.toDate()?.toISOString(),
    };

    return VerificationRequest.fromJSON(entityData);
  }

  /**
   * Convert status to Firestore format
   */
  private statusToFirestore(status: VerificationStatus): any {
    return status.toJSON();
  }
}