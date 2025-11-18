import { Injectable, Logger } from '@nestjs/common';
import { FirebaseConfigService } from '../../shared/config/firebase-config.service';
import * as admin from 'firebase-admin';

/**
 * Firebase Service
 * Provides high-level Firestore operations with error handling and logging
 */
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly firestore: admin.firestore.Firestore;

  constructor(private readonly firebaseConfig: FirebaseConfigService) {
    this.firestore = this.firebaseConfig.firestore;
    console.log('🔥 Firebase Service initialized');
  }

  /**
   * Create a new document with auto-generated ID
   */
  async create(collection: string, data: any): Promise<admin.firestore.DocumentReference> {
    try {
      this.logger.log(`Creating document in collection: ${collection}`);
      
      const docRef = await this.firestore.collection(collection).add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      this.logger.log(`Document created with ID: ${docRef.id}`);
      return docRef;

    } catch (error) {
      this.logger.error(`Failed to create document in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create or set a document with a specific ID (e.g., matching Firebase Auth UID)
   * Best practice: Use this for user documents to match Firestore doc ID with Auth UID
   */
  async set(collection: string, id: string, data: any, merge: boolean = false): Promise<void> {
    try {
      this.logger.log(`Setting document with ID: ${id} in collection: ${collection}`);
      
      await this.firestore.collection(collection).doc(id).set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge });

      this.logger.log(`Document set with ID: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to set document ${id} in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find document by ID
   */
  async findById(collection: string, id: string): Promise<any | null> {
    try {
      this.logger.log(`Finding document by ID: ${id} in collection: ${collection}`);
      
      const doc = await this.firestore.collection(collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };

    } catch (error) {
      this.logger.error(`Failed to find document ${id} in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find documents by field value
   */
  async findByField(collection: string, field: string, value: any, limit?: number): Promise<any[]> {
    try {
      this.logger.log(`Finding documents by ${field} = ${value} in collection: ${collection}`);
      
      let query = this.firestore.collection(collection).where(field, '==', value);
      
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      this.logger.log(`Found ${documents.length} documents in ${collection}`);
      return documents;

    } catch (error) {
      this.logger.error(`Failed to find documents by ${field} in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all documents with pagination
   */
  async findAll(collection: string, limit: number = 50, offset: number = 0): Promise<{ data: any[]; total: number }> {
    try {
      this.logger.log(`Finding all documents in collection: ${collection} (limit: ${limit}, offset: ${offset})`);
      
      // Get total count (this is expensive in Firestore, consider caching)
      const totalSnapshot = await this.firestore.collection(collection).get();
      const total = totalSnapshot.size;

      // Get paginated data
      let query = this.firestore.collection(collection).orderBy('createdAt', 'desc');
      
      if (offset > 0) {
        const offsetSnapshot = await this.firestore
          .collection(collection)
          .orderBy('createdAt', 'desc')
          .limit(offset)
          .get();
        
        if (!offsetSnapshot.empty) {
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      query = query.limit(limit);
      const snapshot = await query.get();
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      this.logger.log(`Found ${documents.length}/${total} documents in ${collection}`);
      return { data: documents, total };

    } catch (error) {
      this.logger.error(`Failed to find all documents in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update document by ID
   */
  async update(collection: string, id: string, data: any): Promise<void> {
    try {
      this.logger.log(`Updating document: ${id} in collection: ${collection}`);
      
      await this.firestore.collection(collection).doc(id).update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      this.logger.log(`Document updated: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to update document ${id} in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete document by ID
   */
  async delete(collection: string, id: string): Promise<void> {
    try {
      this.logger.log(`Deleting document: ${id} in collection: ${collection}`);
      
      await this.firestore.collection(collection).doc(id).delete();

      this.logger.log(`Document deleted: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to delete document ${id} in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  async exists(collection: string, id: string): Promise<boolean> {
    try {
      const doc = await this.firestore.collection(collection).doc(id).get();
      return doc.exists;
    } catch (error) {
      this.logger.error(`Failed to check if document exists ${id} in ${collection}: ${error.message}`);
      return false;
    }
  }

  /**
   * Batch operations
   */
  createBatch(): admin.firestore.WriteBatch {
    return this.firestore.batch();
  }

  /**
   * Execute batch operations
   */
  async executeBatch(batch: admin.firestore.WriteBatch): Promise<void> {
    try {
      this.logger.log('Executing batch operations');
      await batch.commit();
      this.logger.log('Batch operations completed successfully');
    } catch (error) {
      this.logger.error(`Failed to execute batch operations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transaction operations
   */
  async runTransaction<T>(updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>): Promise<T> {
    try {
      this.logger.log('Running transaction');
      const result = await this.firestore.runTransaction(updateFunction);
      this.logger.log('Transaction completed successfully');
      return result;
    } catch (error) {
      this.logger.error(`Transaction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Advanced query with multiple conditions
   */
  async findWithConditions(
    collection: string,
    conditions: { field: string; operator: admin.firestore.WhereFilterOp; value: any }[],
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limit?: number
  ): Promise<any[]> {
    try {
      this.logger.log(`Finding documents with conditions in collection: ${collection}`);
      
      let query: admin.firestore.Query = this.firestore.collection(collection);

      // Apply conditions
      conditions.forEach(condition => {
        query = query.where(condition.field, condition.operator, condition.value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      this.logger.log(`Found ${documents.length} documents with conditions in ${collection}`);
      return documents;

    } catch (error) {
      this.logger.error(`Failed to find documents with conditions in ${collection}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Firestore field value helpers
   */
  get fieldValue() {
    return admin.firestore.FieldValue;
  }

  /**
   * Increment field value
   */
  increment(value: number) {
    return admin.firestore.FieldValue.increment(value);
  }

  /**
   * Array union
   */
  arrayUnion(...elements: any[]) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  /**
   * Array remove
   */
  arrayRemove(...elements: any[]) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }

  /**
   * Server timestamp
   */
  serverTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Get raw Firestore instance
   */
  get db(): admin.firestore.Firestore {
    return this.firestore;
  }
}