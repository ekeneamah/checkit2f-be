import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ILocationPricingRepository } from '../interfaces/location-pricing.repository.interface';
import { LocationPricing, LocationPricingCreateDto, LocationPricingUpdateDto, PriceCalculationResult } from '../../domain/entities/location-pricing.entity';

/**
 * Location Pricing Service
 * Handles business logic for location-based pricing calculations
 * Follows DRY principles with centralized pricing logic
 */
@Injectable()
export class LocationPricingService {
  private readonly logger = new Logger(LocationPricingService.name);

  // Default pricing configuration
  private readonly defaultPricing = {
    cityCost: 5000, // Default city cost in Naira
    areaCost: 0,    // Default area cost
  };

  constructor(
    @Inject('ILocationPricingRepository')
    private readonly pricingRepository: ILocationPricingRepository,
  ) {}

  /**
   * Calculate price for a specific location
   * Implements tiered fallback strategy:
   * 1. Exact match (city + area)
   * 2. City-only match
   * 3. Default pricing
   */
  async calculateLocationPrice(city: string, area?: string | null): Promise<PriceCalculationResult> {
    try {
      this.logger.log(`Calculating price for: ${city}${area ? ` - ${area}` : ''}`);

      // Strategy 1: Try exact match (city + area)
      if (area) {
        const exactMatch = await this.pricingRepository.findByLocationExact(city, area);
        if (exactMatch && this.isPricingActive(exactMatch)) {
          return this.buildPriceResult(exactMatch, 'exact_match');
        }
      }

      // Strategy 2: Try city-only match
      const cityMatch = await this.pricingRepository.findByCityOnly(city);
      if (cityMatch && this.isPricingActive(cityMatch)) {
        return this.buildPriceResult(cityMatch, 'city_fallback', area);
      }

      // Strategy 3: Default pricing
      return this.buildDefaultPriceResult(city, area);

    } catch (error) {
      this.logger.error(`Price calculation failed for ${city}${area ? ` - ${area}` : ''}: ${error.message}`);
      return this.buildDefaultPriceResult(city, area);
    }
  }

  /**
   * Create new location pricing
   */
  async createLocationPricing(data: LocationPricingCreateDto): Promise<LocationPricing> {
    try {
      // Validate no duplicate active pricing exists
      const existing = await this.pricingRepository.findByLocationExact(data.city, data.area);
      if (existing && existing.status === 'active') {
        throw new Error(`Active pricing already exists for ${data.city}${data.area ? ` - ${data.area}` : ''}`);
      }

      return await this.pricingRepository.create(data);
    } catch (error) {
      this.logger.error(`Failed to create location pricing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing location pricing
   */
  async updateLocationPricing(id: string, data: LocationPricingUpdateDto): Promise<LocationPricing> {
    const existing = await this.pricingRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Location pricing with ID ${id} not found`);
    }

    return await this.pricingRepository.update(id, data);
  }

  /**
   * Get all pricing configurations
   */
  async getAllLocationPricing(page = 1, limit = 50) {
    return await this.pricingRepository.findAll(page, limit);
  }

  /**
   * Get pricing by ID
   */
  async getLocationPricingById(id: string): Promise<LocationPricing> {
    const pricing = await this.pricingRepository.findById(id);
    if (!pricing) {
      throw new NotFoundException(`Location pricing with ID ${id} not found`);
    }
    return pricing;
  }

  /**
   * Delete location pricing
   */
  async deleteLocationPricing(id: string): Promise<void> {
    const existing = await this.pricingRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Location pricing with ID ${id} not found`);
    }

    await this.pricingRepository.delete(id);
  }

  /**
   * Get all areas with pricing for a specific city
   */
  async getCityAreasWithPricing(city: string): Promise<LocationPricing[]> {
    return await this.pricingRepository.findActiveByCityWithAreas(city);
  }

  /**
   * Search pricing configurations
   */
  async searchLocationPricing(query: string, status?: string): Promise<LocationPricing[]> {
    return await this.pricingRepository.search(query, status);
  }

  /**
   * Check if pricing configuration is currently active
   */
  private isPricingActive(pricing: LocationPricing): boolean {
    if (pricing.status !== 'active') {
      return false;
    }

    const now = new Date();
    
    if (pricing.effectiveFrom && pricing.effectiveFrom > now) {
      return false;
    }

    if (pricing.effectiveTo && pricing.effectiveTo < now) {
      return false;
    }

    return true;
  }

  /**
   * Build price calculation result from pricing entity
   */
  private buildPriceResult(
    pricing: LocationPricing, 
    source: 'exact_match' | 'city_fallback',
    area?: string | null
  ): PriceCalculationResult {
    // For exact matches, show the area cost as the primary cost
    // For city fallbacks, show the city cost as the primary cost
    const primaryCost = source === 'exact_match' && pricing.areaCost > 0 
      ? pricing.areaCost 
      : pricing.cityCost;

    return {
      city: pricing.city,
      area: area || pricing.area,
      cityCost: pricing.cityCost,
      areaCost: pricing.areaCost,
      totalCost: primaryCost, // Show single relevant price, not sum
      pricingSource: source,
      appliedPricingId: pricing.id,
    };
  }

  /**
   * Build default price result when no pricing configuration found
   */
  private buildDefaultPriceResult(city: string, area?: string | null): PriceCalculationResult {
    this.logger.warn(`No pricing configuration found for ${city}${area ? ` - ${area}` : ''}, using default pricing`);
    
    return {
      city,
      area,
      cityCost: this.defaultPricing.cityCost,
      areaCost: this.defaultPricing.areaCost,
      totalCost: this.defaultPricing.cityCost, // Show default city cost only
      pricingSource: 'default',
    };
  }

  /**
   * Bulk create pricing configurations for seeding
   */
  async bulkCreatePricing(pricingConfigs: LocationPricingCreateDto[]): Promise<LocationPricing[]> {
    const results: LocationPricing[] = [];
    
    for (const config of pricingConfigs) {
      try {
        const pricing = await this.createLocationPricing(config);
        results.push(pricing);
      } catch (error) {
        this.logger.warn(`Failed to create pricing for ${config.city}${config.area ? ` - ${config.area}` : ''}: ${error.message}`);
      }
    }

    return results;
  }
}