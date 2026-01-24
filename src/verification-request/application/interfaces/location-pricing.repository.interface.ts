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
   * Find pricing by exact state, LGA, and locality match
   */
  findByLocationExact(state: string, lga: string, locality?: string | null): Promise<LocationPricing | null>;

  /**
   * Find pricing by LGA only (fallback when specific locality not found)
   */
  findByLGAOnly(state: string, lga: string): Promise<LocationPricing | null>;

  /**
   * Find pricing by state only (fallback when LGA not found)
   */
  findByStateOnly(state: string): Promise<LocationPricing | null>;

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
   * Find all active pricing for an LGA with localities
   */
  findActiveByLGAWithLocalities(state: string, lga: string): Promise<LocationPricing[]>;

  /**
   * Search pricing by query string
   */
  search(query: string, isActive?: boolean): Promise<LocationPricing[]>;

  /**
   * Get all distinct states
   */
  findDistinctStates(): Promise<string[]>;

  /**
   * Get all distinct LGAs for a state
   */
  findDistinctLGAsForState(state: string): Promise<string[]>;
}