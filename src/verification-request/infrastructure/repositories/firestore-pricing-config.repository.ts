/**
 * Firestore Pricing Configuration Repository
 * 
 * Implements IPricingConfigRepository using Firestore.
 * Handles persistence and retrieval of pricing configurations.
 */

import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../infrastructure/firebase/firebase.service';
import { IPricingConfigRepository } from '../../application/interfaces/pricing-config.repository.interface';
import {
  PricingConfigEntity,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  PricingConfigHelper,
  TimeSlotEnum,
  DifficultyEnum,
  ModeEnum,
  UrgencyEnum,
} from '../../domain/entities/pricing-config.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FirestorePricingConfigRepository implements IPricingConfigRepository {
  private readonly logger = new Logger(FirestorePricingConfigRepository.name);
  private readonly collectionName = 'pricing-configs';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(data: CreatePricingConfigDto): Promise<PricingConfigEntity> {
    try {
      const id = uuidv4();
      const now = new Date();

      // Build multiplier maps
      const timeSlotMultipliers = new Map<TimeSlotEnum, number>();
      const difficultyMultipliers = new Map<DifficultyEnum, number>();
      const modeMultipliers = new Map<ModeEnum, number>();
      const urgencyMultipliers = new Map<UrgencyEnum, number>();

      // Populate multiplier maps from configs
      data.timeSlotConfigs?.forEach((config) => {
        timeSlotMultipliers.set(config.slot, config.multiplier);
      });

      data.difficultyConfigs?.forEach((config) => {
        difficultyMultipliers.set(config.difficulty, config.multiplier);
      });

      data.modeConfigs?.forEach((config) => {
        modeMultipliers.set(config.mode, config.multiplier);
      });

      data.urgencyConfigs?.forEach((config) => {
        urgencyMultipliers.set(config.urgency, config.multiplier);
      });

      const entity: PricingConfigEntity = {
        id,
        organizationId: 'default', // TODO: Get from auth context
        configName: data.configName,
        description: data.description,
        currency: 'NGN',
        baseFee: data.baseFee,
        timeSlotMultipliers,
        timeSlotConfigs: data.timeSlotConfigs || [],
        difficultyMultipliers,
        difficultyConfigs: data.difficultyConfigs || [],
        modeMultipliers,
        modeConfigs: data.modeConfigs || [],
        urgencyMultipliers,
        urgencyConfigs: data.urgencyConfigs || [],
        surgeConfigs: data.surgeConfigs || [],
        surgeEnabled: (data.surgeConfigs?.length || 0) > 0,
        defaultSurgeMultiplier: 1.2,
        recurringDiscountConfigs: data.recurringDiscountConfigs || [],
        volumeDiscountConfigs: data.volumeDiscountConfigs || [],
        tierDiscountConfigs: data.tierDiscountConfigs || [],
        promotionalCodeConfigs: [],
        isActive: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system', // TODO: Get from auth context
        version: 1,
      };

      const docData = PricingConfigHelper.toFirestore(entity);
      await this.firebaseService.set(this.collectionName, id, docData);

      this.logger.log(`Created pricing configuration: ${data.configName}`);
      return entity;
    } catch (error) {
      this.logger.error(`Failed to create pricing configuration: ${error.message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<PricingConfigEntity | null> {
    try {
      const doc = await this.firebaseService.findById(this.collectionName, id);
      if (!doc) return null;

      return PricingConfigHelper.fromFirestore(doc);
    } catch (error) {
      this.logger.error(`Failed to find pricing configuration by ID: ${error.message}`);
      return null;
    }
  }

  async findDefault(): Promise<PricingConfigEntity | null> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        this.logger.warn('No default pricing configuration found');
        return null;
      }

      const doc = snapshot.docs[0].data();
      return PricingConfigHelper.fromFirestore({ id: snapshot.docs[0].id, ...doc });
    } catch (error) {
      this.logger.error(`Failed to find default pricing configuration: ${error.message}`);
      return null;
    }
  }

  async findAll(page = 1, limit = 50) {
    try {
      const db = this.firebaseService.db;
      const countSnapshot = await db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .count()
        .get();

      const total = countSnapshot.data().count;

      const snapshot = await db
        .collection(this.collectionName)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .offset((page - 1) * limit)
        .limit(limit)
        .get();

      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return PricingConfigHelper.fromFirestore({ id: doc.id, ...data });
      });

      return { items, total, page, limit };
    } catch (error) {
      this.logger.error(`Failed to find pricing configurations: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, data: UpdatePricingConfigDto): Promise<PricingConfigEntity> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Pricing configuration with ID ${id} not found`);
      }

      const updated = { ...existing, ...data, updatedAt: new Date(), version: existing.version + 1 };

      // Rebuild multiplier maps if configs were updated
      if (data.timeSlotConfigs) {
        updated.timeSlotMultipliers = new Map();
        data.timeSlotConfigs.forEach((config) => {
          updated.timeSlotMultipliers.set(config.slot, config.multiplier);
        });
      }

      if (data.difficultyConfigs) {
        updated.difficultyMultipliers = new Map();
        data.difficultyConfigs.forEach((config) => {
          updated.difficultyMultipliers.set(config.difficulty, config.multiplier);
        });
      }

      if (data.modeConfigs) {
        updated.modeMultipliers = new Map();
        data.modeConfigs.forEach((config) => {
          updated.modeMultipliers.set(config.mode, config.multiplier);
        });
      }

      if (data.urgencyConfigs) {
        updated.urgencyMultipliers = new Map();
        data.urgencyConfigs.forEach((config) => {
          updated.urgencyMultipliers.set(config.urgency, config.multiplier);
        });
      }

      const docData = PricingConfigHelper.toFirestore(updated);
      await this.firebaseService.update(this.collectionName, id, docData);

      this.logger.log(`Updated pricing configuration: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update pricing configuration: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.firebaseService.update(this.collectionName, id, { isActive: false });
      this.logger.log(`Deleted pricing configuration: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete pricing configuration: ${error.message}`);
      throw error;
    }
  }

  async setAsDefault(id: string): Promise<void> {
    try {
      const db = this.firebaseService.db;

      // Remove default from all other configs
      const oldDefaults = await db
        .collection(this.collectionName)
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      oldDefaults.docs.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });

      // Set new default
      const docRef = db.collection(this.collectionName).doc(id);
      batch.update(docRef, { isDefault: true });

      await batch.commit();
      this.logger.log(`Set pricing configuration as default: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to set default pricing configuration: ${error.message}`);
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      return await this.firebaseService.exists(this.collectionName, id);
    } catch (error) {
      this.logger.error(`Failed to check pricing configuration existence: ${error.message}`);
      return false;
    }
  }
}
