import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ILocationPricingRepository } from '../interfaces/location-pricing.repository.interface';
import { LocationPricing, LocationPricingCreateDto, LocationPricingUpdateDto, PriceCalculationResult } from '../../domain/entities/location-pricing.entity';

/**
 * Location Pricing Service
 * Handles business logic for location-based pricing calculations
 * Follows hierarchical pricing: Locality → LGA → State → Default
 */
@Injectable()
export class LocationPricingService {
  private readonly logger = new Logger(LocationPricingService.name);

  // Default pricing configuration
  private readonly defaultPricing = {
    basePrice: 5000,
    pricePerKm: 200,
    minimumCharge: 3000,
  };

  constructor(
    @Inject('ILocationPricingRepository')
    private readonly pricingRepository: ILocationPricingRepository,
  ) {}

  /**
   * Calculate price for a specific location and distance
   * Implements tiered fallback strategy:
   * 1. Locality-specific match (state + lga + locality)
   * 2. LGA-wide match (state + lga)
   * 3. State-wide match (state only)
   * 4. Default pricing
   */
  async calculateLocationPrice(
    state: string, 
    lga: string, 
    locality?: string | null,
    distanceKm?: number
  ): Promise<PriceCalculationResult> {
    const distance = distanceKm || 0;
    
    try {
      this.logger.log(`Calculating price for: ${state} → ${lga}${locality ? ` → ${locality}` : ''}, Distance: ${distance}km`);

      // Strategy 1: Try locality-specific match
      if (locality) {
        const localityMatch = await this.pricingRepository.findByLocationExact(state, lga, locality);
        if (localityMatch && this.isPricingActive(localityMatch)) {
          return this.buildPriceResult(localityMatch, 'locality_match', distance);
        }
      }

      // Strategy 2: Try LGA-wide match
      const lgaMatch = await this.pricingRepository.findByLGAOnly(state, lga);
      if (lgaMatch && this.isPricingActive(lgaMatch)) {
        return this.buildPriceResult(lgaMatch, 'lga_match', distance);
      }

      // Strategy 3: Try state-wide match
      const stateMatch = await this.pricingRepository.findByStateOnly(state);
      if (stateMatch && this.isPricingActive(stateMatch)) {
        return this.buildPriceResult(stateMatch, 'state_match', distance);
      }

      // Strategy 4: Default pricing
      return this.buildDefaultPriceResult(state, lga, locality, distance);

    } catch (error) {
      this.logger.error(`Price calculation failed for ${state} → ${lga}: ${error.message}`);
      return this.buildDefaultPriceResult(state, lga, locality, distance);
    }
  }

  /**
   * Create new location pricing
   */
  async createLocationPricing(data: LocationPricingCreateDto): Promise<LocationPricing> {
    try {
      // Validate no duplicate active pricing exists
      const existing = await this.pricingRepository.findByLocationExact(data.state, data.lga, data.locality);
      if (existing && existing.isActive) {
        throw new Error(`Active pricing already exists for ${data.state} → ${data.lga}${data.locality ? ` → ${data.locality}` : ''}`);
      }

      return await this.pricingRepository.create({
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
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
   * Get all areas with pricing for a specific LGA
   */
  async getLGALocalitiesWithPricing(state: string, lga: string): Promise<LocationPricing[]> {
    return await this.pricingRepository.findActiveByLGAWithLocalities(state, lga);
  }

  /**
   * Search pricing configurations
   */
  async searchLocationPricing(query: string, isActive?: boolean): Promise<LocationPricing[]> {
    return await this.pricingRepository.search(query, isActive);
  }

  /**
   * Get all distinct states with pricing
   */
  async getDistinctStates(): Promise<string[]> {
    return await this.pricingRepository.findDistinctStates();
  }

  /**
   * Get all distinct LGAs for a state
   */
  async getDistinctLGAsForState(state: string): Promise<string[]> {
    return await this.pricingRepository.findDistinctLGAsForState(state);
  }

  /**
   * Check if pricing configuration is currently active
   */
  private isPricingActive(pricing: LocationPricing): boolean {
    if (!pricing.isActive) {
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
    source: 'locality_match' | 'lga_match' | 'state_match',
    distance: number
  ): PriceCalculationResult {
    const calculatedPrice = pricing.basePrice + (pricing.pricePerKm * distance);
    
    // Apply minimum and maximum constraints
    let finalPrice = calculatedPrice;
    if (pricing.minimumCharge && finalPrice < pricing.minimumCharge) {
      finalPrice = pricing.minimumCharge;
    }
    if (pricing.maximumCharge && finalPrice > pricing.maximumCharge) {
      finalPrice = pricing.maximumCharge;
    }

    // Apply surcharges
    const appliedSurcharges: Array<{ type: string; value: number; amount: number }> = [];
    if (pricing.surcharges && pricing.surcharges.length > 0) {
      for (const surcharge of pricing.surcharges) {
        const amount = surcharge.isPercentage 
          ? (finalPrice * surcharge.value / 100)
          : surcharge.value;
        
        appliedSurcharges.push({
          type: surcharge.type,
          value: surcharge.value,
          amount,
        });
        
        finalPrice += amount;
      }
    }

    return {
      state: pricing.state,
      lga: pricing.lga,
      locality: pricing.locality,
      basePrice: pricing.basePrice,
      pricePerKm: pricing.pricePerKm,
      distance,
      calculatedPrice,
      appliedSurcharges: appliedSurcharges.length > 0 ? appliedSurcharges : undefined,
      finalPrice,
      pricingSource: source,
      appliedPricingId: pricing.id,
    };
  }

  /**
   * Build default price result when no pricing configuration found
   */
  private buildDefaultPriceResult(
    state: string, 
    lga: string, 
    locality?: string | null,
    distance: number = 0
  ): PriceCalculationResult {
    this.logger.warn(`No pricing configuration found for ${state} → ${lga}${locality ? ` → ${locality}` : ''}, using default pricing`);
    
    const calculatedPrice = this.defaultPricing.basePrice + (this.defaultPricing.pricePerKm * distance);
    const finalPrice = Math.max(calculatedPrice, this.defaultPricing.minimumCharge);
    
    return {
      state,
      lga,
      locality,
      basePrice: this.defaultPricing.basePrice,
      pricePerKm: this.defaultPricing.pricePerKm,
      distance,
      calculatedPrice,
      finalPrice,
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
        this.logger.warn(`Failed to create pricing for ${config.state} → ${config.lga}${config.locality ? ` → ${config.locality}` : ''}: ${error.message}`);
      }
    }

    return results;
  }
}