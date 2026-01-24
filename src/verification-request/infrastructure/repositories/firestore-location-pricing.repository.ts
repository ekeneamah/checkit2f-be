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
        state: data.state.trim(),
        lga: data.lga.trim(),
        locality: data.locality?.trim() || null,
        basePrice: data.basePrice,
        pricePerKm: data.pricePerKm,
        minimumCharge: data.minimumCharge,
        maximumCharge: data.maximumCharge,
        surcharges: data.surcharges || [],
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: now,
        updatedAt: now,
        description: data.description,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
      };

      await this.firebaseService.set(this.collectionName, id, pricing);
      
      this.logger.log(`Created location pricing for ${pricing.state} → ${pricing.lga}${pricing.locality ? ` → ${pricing.locality}` : ''}`);
      return pricing;
    } catch (error) {
      this.logger.error(`Failed to create location pricing: ${error.message}`);
      throw error;
    }
  }

  async findByLocationExact(state: string, lga: string, locality?: string | null): Promise<LocationPricing | null> {
    try {
      const db = this.firebaseService.db;
      let query = db.collection(this.collectionName)
        .where('state', '==', state.trim())
        .where('lga', '==', lga.trim())
        .where('isActive', '==', true);

      if (locality) {
        query = query.where('locality', '==', locality.trim());
      } else {
        query = query.where('locality', '==', null);
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

  async findByLGAOnly(state: string, lga: string): Promise<LocationPricing | null> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('state', '==', state.trim())
        .where('lga', '==', lga.trim())
        .where('locality', '==', null) // LGA-wide pricing
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as LocationPricing;
    } catch (error) {
      this.logger.error(`Failed to find pricing by LGA: ${error.message}`);
      throw error;
    }
  }

  async findByStateOnly(state: string): Promise<LocationPricing | null> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('state', '==', state.trim())
        .where('lga', '==', null) // State-wide pricing
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as LocationPricing;
    } catch (error) {
      this.logger.error(`Failed to find pricing by state: ${error.message}`);
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

  async findActiveByLGAWithLocalities(state: string, lga: string): Promise<LocationPricing[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('state', '==', state.trim())
        .where('lga', '==', lga.trim())
        .where('isActive', '==', true)
        .get();

      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LocationPricing));
      
      return results.sort((a, b) => {
        const localityA = a.locality || '';
        const localityB = b.locality || '';
        return localityA.localeCompare(localityB);
      });
    } catch (error) {
      this.logger.error(`Failed to find active pricing by LGA: ${error.message}`);
      throw error;
    }
  }

  async search(query: string, isActive?: boolean): Promise<LocationPricing[]> {
    try {
      const db = this.firebaseService.db;
      let firestoreQuery: any = db.collection(this.collectionName);

      if (isActive !== undefined) {
        firestoreQuery = firestoreQuery.where('isActive', '==', isActive);
      }

      const snapshot = await firestoreQuery
        .orderBy('createdAt', 'desc')
        .get();

      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as LocationPricing))
        .filter(pricing => 
          pricing.state.toLowerCase().includes(query.toLowerCase()) ||
          pricing.lga.toLowerCase().includes(query.toLowerCase()) ||
          (pricing.locality && pricing.locality.toLowerCase().includes(query.toLowerCase()))
        );

      return results;
    } catch (error) {
      this.logger.error(`Failed to search pricing: ${error.message}`);
      throw error;
    }
  }

  async findDistinctStates(): Promise<string[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('isActive', '==', true)
        .get();

      const states = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.state) {
          states.add(data.state);
        }
      });

      return Array.from(states).sort();
    } catch (error) {
      this.logger.error(`Failed to find distinct states: ${error.message}`);
      throw error;
    }
  }

  async findDistinctLGAsForState(state: string): Promise<string[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName)
        .where('state', '==', state.trim())
        .where('isActive', '==', true)
        .get();

      const lgas = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.lga) {
          lgas.add(data.lga);
        }
      });

      return Array.from(lgas).sort();
    } catch (error) {
      this.logger.error(`Failed to find distinct LGAs: ${error.message}`);
      throw error;
    }
  }
}