/**
 * Pricing Configuration Repository Interface
 * 
 * Defines contract for persisting and retrieving pricing configurations.
 * Follows Repository Pattern from DDD.
 */

import {
  PricingConfigEntity,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
} from '../../domain/entities/pricing-config.entity';

export interface IPricingConfigRepository {
  /**
   * Create new pricing configuration
   */
  create(data: CreatePricingConfigDto): Promise<PricingConfigEntity>;

  /**
   * Find pricing configuration by ID
   */
  findById(id: string): Promise<PricingConfigEntity | null>;

  /**
   * Find default active pricing configuration
   */
  findDefault(): Promise<PricingConfigEntity | null>;

  /**
   * Find all active pricing configurations (paginated)
   */
  findAll(page?: number, limit?: number): Promise<{
    items: PricingConfigEntity[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * Update pricing configuration
   */
  update(id: string, data: UpdatePricingConfigDto): Promise<PricingConfigEntity>;

  /**
   * Delete pricing configuration (soft delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Set as default configuration
   */
  setAsDefault(id: string): Promise<void>;

  /**
   * Check if configuration exists
   */
  exists(id: string): Promise<boolean>;
}
