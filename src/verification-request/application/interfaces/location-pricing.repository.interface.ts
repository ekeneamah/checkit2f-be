import { LocationPricing, LocationPricingCreateDto, LocationPricingUpdateDto, PriceCalculationResult } from '../../domain/entities/location-pricing.entity';

/**
 * Location Pricing Repository Interface
 * Handles CRUD operations for location-based pricing
 */
export interface ILocationPricingRepository {
  /**
   * Create new location pricing
   */
  create(data: LocationPricingCreateDto): Promise<LocationPricing>;

  /**
   * Find pricing by exact city and area match
   */
  findByLocationExact(city: string, area?: string | null): Promise<LocationPricing | null>;

  /**
   * Find pricing by city (fallback when specific area not found)
   */
  findByCityOnly(city: string): Promise<LocationPricing | null>;

  /**
   * Get all pricing configurations with pagination
   */
  findAll(page?: number, limit?: number): Promise<{
    items: LocationPricing[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * Find pricing by ID
   */
  findById(id: string): Promise<LocationPricing | null>;

  /**
   * Update existing pricing
   */
  update(id: string, data: LocationPricingUpdateDto): Promise<LocationPricing>;

  /**
   * Delete pricing configuration
   */
  delete(id: string): Promise<void>;

  /**
   * Find all active pricing for a city
   */
  findActiveByCityWithAreas(city: string): Promise<LocationPricing[]>;

  /**
   * Search pricing configurations
   */
  search(query: string, status?: string): Promise<LocationPricing[]>;
}