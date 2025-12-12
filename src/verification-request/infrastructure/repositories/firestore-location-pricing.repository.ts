import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../infrastructure/firebase/firebase.service';
import { ILocationPricingRepository } from '../../application/interfaces/location-pricing.repository.interface';
import { LocationPricing, LocationPricingCreateDto, LocationPricingUpdateDto } from '../../domain/entities/location-pricing.entity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Firestore Location Pricing Repository
 * Implements location pricing persistence using Firestore
 */
@Injectable()
export class FirestoreLocationPricingRepository implements ILocationPricingRepository {
  private readonly logger = new Logger(FirestoreLocationPricingRepository.name);
  private readonly collectionName = 'location-pricing';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(data: LocationPricingCreateDto): Promise<LocationPricing> {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const pricing: LocationPricing = {
        id,
        city: data.city.trim(),
        area: data.area?.trim() || null,
        cityCost: data.cityCost,
        areaCost: data.areaCost,
        status: data.status || 'active',
        createdAt: now,
        updatedAt: now,
        description: data.description,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
      };

      await this.firebaseService.set(this.collectionName, id, pricing);
      
      this.logger.log(`Created location pricing for ${pricing.city}${pricing.area ? ` - ${pricing.area}` : ''}`);
      return pricing;
    } catch (error) {
      this.logger.error(`Failed to create location pricing: ${error.message}`);
      throw error;
    }
  }

  async findByLocationExact(city: string, area?: string | null): Promise<LocationPricing | null> {
    try {
      const db = this.firebaseService.db;
      let query = db.collection(this.collectionName)
        .where('city', '==', city.trim())
        .where('status', '==', 'active');

      if (area) {
        query = query.where('area', '==', area.trim());
      } else {
        query = query.where('area', '==', null);
      }

      const snapshot = await query.limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as LocationPricing;
    } catch (error) {
      this.logger.error(`Failed to find pricing by exact location: ${error.message}`);
      throw error;
    }
  }

  async findByCityOnly(city: string): Promise<LocationPricing | null> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('city', '==', city.trim())
        .where('area', '==', null) // City-wide pricing
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as LocationPricing;
    } catch (error) {
      this.logger.error(`Failed to find pricing by city: ${error.message}`);
      throw error;
    }
  }

  async findAll(page = 1, limit = 50): Promise<{
    items: LocationPricing[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const db = this.firebaseService.db;
      const offset = (page - 1) * limit;

      // Get total count
      const totalSnapshot = await db.collection(this.collectionName).get();
      const total = totalSnapshot.size;

      // Get paginated results
      const snapshot = await db.collection(this.collectionName)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get();

      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LocationPricing));

      return { items, total, page, limit };
    } catch (error) {
      this.logger.error(`Failed to find all pricing: ${error.message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<LocationPricing | null> {
    try {
      const doc = await this.firebaseService.findById(this.collectionName, id);
      return doc ? { id, ...doc } as LocationPricing : null;
    } catch (error) {
      this.logger.error(`Failed to find pricing by ID: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, data: LocationPricingUpdateDto): Promise<LocationPricing> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await this.firebaseService.update(this.collectionName, id, updateData);
      
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error('Failed to retrieve updated pricing');
      }

      this.logger.log(`Updated location pricing ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update pricing: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.firebaseService.delete(this.collectionName, id);
      this.logger.log(`Deleted location pricing ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete pricing: ${error.message}`);
      throw error;
    }
  }

  async findActiveByCityWithAreas(city: string): Promise<LocationPricing[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('city', '==', city.trim())
        .where('status', '==', 'active')
        .orderBy('area')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LocationPricing));
    } catch (error) {
      this.logger.error(`Failed to find active pricing by city: ${error.message}`);
      throw error;
    }
  }

  async search(query: string, status?: string): Promise<LocationPricing[]> {
    try {
      const db = this.firebaseService.db;
      let firestoreQuery: any = db.collection(this.collectionName);

      if (status) {
        firestoreQuery = firestoreQuery.where('status', '==', status);
      }

      const snapshot = await firestoreQuery
        .orderBy('createdAt', 'desc')
        .get();

      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as LocationPricing))
        .filter(pricing => 
          pricing.city.toLowerCase().includes(query.toLowerCase()) ||
          (pricing.area && pricing.area.toLowerCase().includes(query.toLowerCase()))
        );

      return results;
    } catch (error) {
      this.logger.error(`Failed to search pricing: ${error.message}`);
      throw error;
    }
  }
}