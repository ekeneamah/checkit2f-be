import { Injectable, Logger } from '@nestjs/common';
import { LocationPricingService } from '../location-pricing.service';
import { LocationPricingCreateDto } from '../../../domain/entities/location-pricing.entity';

/**
 * Location Pricing Seeder
 * Seeds initial pricing configurations for major Nigerian cities and areas
 */
@Injectable()
export class LocationPricingSeederService {
  private readonly logger = new Logger(LocationPricingSeederService.name);

  constructor(private readonly locationPricingService: LocationPricingService) {}

  /**
   * Seed initial pricing configurations
   */
  async seedInitialPricing(): Promise<void> {
    this.logger.log('Seeding initial location pricing configurations...');

    const initialPricingConfigs: LocationPricingCreateDto[] = [
      // Lagos - City-wide and premium areas
      {
        city: 'Lagos',
        area: null, // City-wide default
        cityCost: 8000,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Lagos city',
      },
      {
        city: 'Lagos',
        area: 'Victoria Island',
        cityCost: 8000,
        areaCost: 5000,
        status: 'active',
        description: 'Premium pricing for Victoria Island',
      },
      {
        city: 'Lagos',
        area: 'Ikoyi',
        cityCost: 8000,
        areaCost: 4500,
        status: 'active',
        description: 'Premium pricing for Ikoyi',
      },
      {
        city: 'Lagos',
        area: 'Lekki Phase 1',
        cityCost: 8000,
        areaCost: 3500,
        status: 'active',
        description: 'Premium pricing for Lekki Phase 1',
      },
      {
        city: 'Lagos',
        area: 'Ikeja GRA',
        cityCost: 8000,
        areaCost: 2500,
        status: 'active',
        description: 'Premium pricing for Ikeja GRA',
      },
      {
        city: 'Lagos',
        area: 'Surulere',
        cityCost: 8000,
        areaCost: 1500,
        status: 'active',
        description: 'Standard pricing for Surulere',
      },
      {
        city: 'Lagos',
        area: 'Yaba',
        cityCost: 8000,
        areaCost: 1000,
        status: 'active',
        description: 'Standard pricing for Yaba',
      },
      {
        city: 'Lagos',
        area: 'Igando',
        cityCost: 8000,
        areaCost: 500,
        status: 'active',
        description: 'Standard pricing for Igando',
      },

      // Abuja - City-wide and premium areas
      {
        city: 'Abuja',
        area: null, // City-wide default
        cityCost: 7000,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Abuja city',
      },
      {
        city: 'Abuja',
        area: 'Maitama',
        cityCost: 7000,
        areaCost: 4000,
        status: 'active',
        description: 'Premium pricing for Maitama',
      },
      {
        city: 'Abuja',
        area: 'Asokoro',
        cityCost: 7000,
        areaCost: 3500,
        status: 'active',
        description: 'Premium pricing for Asokoro',
      },
      {
        city: 'Abuja',
        area: 'Wuse 2',
        cityCost: 7000,
        areaCost: 2500,
        status: 'active',
        description: 'Premium pricing for Wuse 2',
      },
      {
        city: 'Abuja',
        area: 'Garki',
        cityCost: 7000,
        areaCost: 1500,
        status: 'active',
        description: 'Standard pricing for Garki',
      },
      {
        city: 'Abuja',
        area: 'Kubwa',
        cityCost: 7000,
        areaCost: 1000,
        status: 'active',
        description: 'Standard pricing for Kubwa',
      },

      // Port Harcourt
      {
        city: 'Port Harcourt',
        area: null,
        cityCost: 6000,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Port Harcourt',
      },
      {
        city: 'Port Harcourt',
        area: 'GRA Phase 1',
        cityCost: 6000,
        areaCost: 2500,
        status: 'active',
        description: 'Premium pricing for GRA Phase 1',
      },

      // Kano
      {
        city: 'Kano',
        area: null,
        cityCost: 5000,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Kano',
      },

      // Ibadan
      {
        city: 'Ibadan',
        area: null,
        cityCost: 5500,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Ibadan',
      },

      // Kaduna
      {
        city: 'Kaduna',
        area: null,
        cityCost: 5000,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Kaduna',
      },

      // Enugu - City-wide and premium areas
      {
        city: 'Enugu',
        area: null,
        cityCost: 5500,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Enugu',
      },
      {
        city: 'Enugu',
        area: 'GRA',
        cityCost: 5500,
        areaCost: 2000,
        status: 'active',
        description: 'Premium pricing for Enugu GRA',
      },
      {
        city: 'Enugu',
        area: 'Independence Layout',
        cityCost: 5500,
        areaCost: 1500,
        status: 'active',
        description: 'Premium pricing for Independence Layout',
      },
      {
        city: 'Enugu',
        area: 'New Haven',
        cityCost: 5500,
        areaCost: 1000,
        status: 'active',
        description: 'Standard pricing for New Haven',
      },

      // Akure - City-wide and areas
      {
        city: 'Akure',
        area: null,
        cityCost: 5000,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Akure',
      },
      {
        city: 'Akure',
        area: 'Alagbaka',
        cityCost: 5000,
        areaCost: 1000,
        status: 'active',
        description: 'Standard pricing for Alagbaka',
      },
      {
        city: 'Akure',
        area: 'Alagbaka North West',
        cityCost: 5000,
        areaCost: 800,
        status: 'active',
        description: 'Standard pricing for Alagbaka North West',
      },
      {
        city: 'Akure',
        area: 'Oba Ile',
        cityCost: 5000,
        areaCost: 500,
        status: 'active',
        description: 'Standard pricing for Oba Ile',
      },
      {
        city: 'Akure',
        area: 'Ijapo',
        cityCost: 5000,
        areaCost: 600,
        status: 'active',
        description: 'Standard pricing for Ijapo',
      },

      // Benin City
      {
        city: 'Benin City',
        area: null,
        cityCost: 5200,
        areaCost: 0,
        status: 'active',
        description: 'Default pricing for Benin City',
      },
    ];

    try {
      const createdPricing = await this.locationPricingService.bulkCreatePricing(initialPricingConfigs);
      this.logger.log(`Successfully seeded ${createdPricing.length} location pricing configurations`);
    } catch (error) {
      this.logger.error(`Failed to seed location pricing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if seeding is needed
   */
  async shouldSeed(): Promise<boolean> {
    try {
      const existing = await this.locationPricingService.getAllLocationPricing(1, 1);
      return existing.total === 0;
    } catch (error) {
      this.logger.warn(`Could not check existing pricing: ${error.message}`);
      return true; // Seed anyway if we can't check
    }
  }

  /**
   * Seed if needed
   */
  async seedIfNeeded(): Promise<void> {
    if (await this.shouldSeed()) {
      await this.seedInitialPricing();
    } else {
      this.logger.log('Location pricing already exists, skipping seeding');
    }
  }
}