import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseConfigService } from '../../../shared/config/firebase-config.service';
import { IRequestTypeConfig } from '../../domain/interfaces';
import {
  RequestTypeConfigModel,
  RequestTypeConfigModelHelper,
} from '../../domain/models';
import { RequestTypeCategory, PricingType } from '../../domain/enums';

/**
 * Request Type Config Repository (Repository Pattern)
 * SOLID: Single Responsibility - Only handles Firestore CRUD operations
 */
@Injectable()
export class RequestTypeConfigRepository {
  private readonly logger = new Logger(RequestTypeConfigRepository.name);
  private readonly collectionName = 'request_type_configs';
  private readonly collection: FirebaseFirestore.CollectionReference;

  constructor(private readonly firebaseConfig: FirebaseConfigService) {
    this.collection = this.firebaseConfig.firestore.collection(this.collectionName);
  }

  /**
   * Create a new request type
   */
  async create(config: Partial<IRequestTypeConfig>): Promise<IRequestTypeConfig> {
    this.logger.log(`Creating request type: ${config.name}`);

    const now = new Date();
    const docData: Partial<IRequestTypeConfig> = {
      ...config,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Convert to flat Firestore model
    const firestoreModel = RequestTypeConfigModelHelper.toFirestore(docData);

    // Create document
    const docRef = await this.collection.add(firestoreModel);
    const created = await docRef.get();

    this.logger.log(`Request type created with ID: ${docRef.id}`);

    return this.mapToConfig(created);
  }

  /**
   * Find request type by ID
   */
  async findById(id: string): Promise<IRequestTypeConfig | null> {
    this.logger.debug(`Finding request type by ID: ${id}`);

    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      this.logger.debug(`Request type not found: ${id}`);
      return null;
    }

    return this.mapToConfig(doc);
  }

  /**
   * Find request type by ID or throw exception
   */
  async findByIdOrFail(id: string): Promise<IRequestTypeConfig> {
    const config = await this.findById(id);
    
    if (!config) {
      throw new NotFoundException(`Request type not found: ${id}`);
    }

    return config;
  }

  /**
   * Find request type by name
   */
  async findByName(name: string): Promise<IRequestTypeConfig | null> {
    this.logger.debug(`Finding request type by name: ${name}`);

    const snapshot = await this.collection.where('name', '==', name).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return this.mapToConfig(snapshot.docs[0]);
  }

  /**
   * Find all active request types
   */
  async findAllActive(): Promise<IRequestTypeConfig[]> {
    this.logger.debug('Finding all active request types');

    const snapshot = await this.collection
      .where('isActive', '==', true)
      .orderBy('sortOrder', 'asc')
      .get();

    return snapshot.docs.map((doc) => this.mapToConfig(doc));
  }

  /**
   * Find active request types by phase
   */
  async findActiveByPhase(phase: 1 | 2): Promise<IRequestTypeConfig[]> {
    this.logger.debug(`Finding active request types for phase ${phase}`);

    const snapshot = await this.collection
      .where('isActive', '==', true)
      .where('phase', '==', phase)
      .orderBy('sortOrder', 'asc')
      .get();

    return snapshot.docs.map((doc) => this.mapToConfig(doc));
  }

  /**
   * Find all request types (including inactive)
   */
  async findAll(): Promise<IRequestTypeConfig[]> {
    this.logger.debug('Finding all request types');

    const snapshot = await this.collection.orderBy('sortOrder', 'asc').get();

    return snapshot.docs.map((doc) => this.mapToConfig(doc));
  }

  /**
   * Find request types by category
   */
  async findByCategory(
    category: RequestTypeCategory,
  ): Promise<IRequestTypeConfig[]> {
    this.logger.debug(`Finding request types by category: ${category}`);

    const snapshot = await this.collection
      .where('category', '==', category)
      .where('isActive', '==', true)
      .orderBy('sortOrder', 'asc')
      .get();

    return snapshot.docs.map((doc) => this.mapToConfig(doc));
  }

  /**
   * Find request types by pricing type
   */
  async findByPricingType(
    pricingType: PricingType,
  ): Promise<IRequestTypeConfig[]> {
    this.logger.debug(`Finding request types by pricing type: ${pricingType}`);

    const snapshot = await this.collection
      .where('pricingType', '==', pricingType)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map((doc) => this.mapToConfig(doc));
  }

  /**
   * Get default request type
   */
  async findDefault(): Promise<IRequestTypeConfig | null> {
    this.logger.debug('Finding default request type');

    const snapshot = await this.collection
      .where('isDefault', '==', true)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return this.mapToConfig(snapshot.docs[0]);
  }

  /**
   * Update request type
   */
  async update(
    id: string,
    updates: Partial<IRequestTypeConfig>,
  ): Promise<IRequestTypeConfig> {
    this.logger.log(`Updating request type: ${id}`);

    const docRef = this.collection.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Request type not found: ${id}`);
    }

    const existingData = RequestTypeConfigModelHelper.fromFirestore(
      doc.data() as RequestTypeConfigModel,
    );

    const updatedData: Partial<IRequestTypeConfig> = {
      ...updates,
      updatedAt: new Date(),
      version: (existingData.version || 0) + 1,
    };

    // Convert to flat Firestore model
    const firestoreModel = RequestTypeConfigModelHelper.toFirestore({
      ...existingData,
      ...updatedData,
    });

    await docRef.update(firestoreModel as any);

    this.logger.log(`Request type updated: ${id}`);

    const updated = await docRef.get();
    return this.mapToConfig(updated);
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string): Promise<IRequestTypeConfig> {
    this.logger.log(`Toggling active status for request type: ${id}`);

    const config = await this.findByIdOrFail(id);
    
    return this.update(id, {
      isActive: !config.isActive,
    });
  }

  /**
   * Set as default (and unset others)
   */
  async setAsDefault(id: string): Promise<IRequestTypeConfig> {
    this.logger.log(`Setting request type as default: ${id}`);

    // First, unset any existing default
    const currentDefault = await this.findDefault();
    if (currentDefault && currentDefault.id !== id) {
      await this.update(currentDefault.id, { isDefault: false });
    }

    // Then set this one as default
    return this.update(id, { isDefault: true });
  }

  /**
   * Change phase
   */
  async changePhase(id: string, phase: 1 | 2): Promise<IRequestTypeConfig> {
    this.logger.log(`Changing phase to ${phase} for request type: ${id}`);

    return this.update(id, { phase });
  }

  /**
   * Soft delete (mark as inactive)
   */
  async softDelete(id: string): Promise<void> {
    this.logger.log(`Soft deleting request type: ${id}`);

    await this.update(id, { isActive: false });
  }

  /**
   * Hard delete (remove from Firestore)
   */
  async hardDelete(id: string): Promise<void> {
    this.logger.warn(`Hard deleting request type: ${id}`);

    await this.collection.doc(id).delete();

    this.logger.warn(`Request type permanently deleted: ${id}`);
  }

  /**
   * Check if request type name exists
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByName(name);
    
    if (!existing) {
      return false;
    }

    // If excludeId provided, check if it's a different document
    if (excludeId && existing.id === excludeId) {
      return false;
    }

    return true;
  }

  /**
   * Count active request types
   */
  async countActive(): Promise<number> {
    const snapshot = await this.collection
      .where('isActive', '==', true)
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Count request types by phase
   */
  async countByPhase(phase: 1 | 2): Promise<number> {
    const snapshot = await this.collection
      .where('phase', '==', phase)
      .where('isActive', '==', true)
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Bulk create (for seeding)
   */
  async bulkCreate(
    configs: Partial<IRequestTypeConfig>[],
  ): Promise<IRequestTypeConfig[]> {
    this.logger.log(`Bulk creating ${configs.length} request types`);

    const batch = this.firebaseConfig.firestore.batch();
    const docRefs: FirebaseFirestore.DocumentReference[] = [];

    configs.forEach((config) => {
      const docRef = this.collection.doc();
      const now = new Date();
      
      const docData: Partial<IRequestTypeConfig> = {
        ...config,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const firestoreModel = RequestTypeConfigModelHelper.toFirestore(docData);
      batch.set(docRef, firestoreModel);
      docRefs.push(docRef);
    });

    await batch.commit();

    this.logger.log(`Bulk created ${configs.length} request types`);

    // Fetch created documents
    const created: IRequestTypeConfig[] = [];
    for (const docRef of docRefs) {
      const doc = await docRef.get();
      created.push(this.mapToConfig(doc));
    }

    return created;
  }

  /**
   * Map Firestore document to IRequestTypeConfig
   */
  private mapToConfig(
    doc: FirebaseFirestore.DocumentSnapshot,
  ): IRequestTypeConfig {
    if (!doc.exists) {
      throw new Error('Document does not exist');
    }

    const data = RequestTypeConfigModelHelper.fromFirestore(
      doc.data() as RequestTypeConfigModel,
    );

    return {
      ...data,
      id: doc.id,
    };
  }
}
