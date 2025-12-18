/**
 * Pricing Configuration Service
 * 
 * High-level service for managing pricing configurations.
 * Handles CRUD operations, caching, and configuration validation.
 * 
 * Follows SOLID:
 * - Single Responsibility: Only manages pricing config lifecycle
 * - Open/Closed: Extensible through repository pattern
 * - Liskov Substitution: Works with IPricingConfigRepository interface
 */

import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import {
  PricingConfigEntity,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
} from '../../domain/entities/pricing-config.entity';
import { IPricingConfigRepository } from '../../application/interfaces/pricing-config.repository.interface';

@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name);
  private cachedDefaultConfig: PricingConfigEntity | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject('IPricingConfigRepository')
    private readonly pricingConfigRepository: IPricingConfigRepository,
  ) {}

  /**
   * Get default pricing configuration (with caching)
   * Cache refreshes every 5 minutes or when explicitly invalidated
   */
  async getDefaultConfig(): Promise<PricingConfigEntity> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cachedDefaultConfig && now < this.cacheExpiresAt) {
      return this.cachedDefaultConfig;
    }

    // Fetch from repository
    const config = await this.pricingConfigRepository.findDefault();
    if (!config) {
      throw new NotFoundException('No default pricing configuration found. Please initialize pricing config.');
    }

    // Cache and return
    this.cachedDefaultConfig = config;
    this.cacheExpiresAt = now + this.CACHE_DURATION_MS;

    return config;
  }

  /**
   * Get pricing configuration by ID
   */
  async getConfigById(id: string): Promise<PricingConfigEntity> {
    const config = await this.pricingConfigRepository.findById(id);
    if (!config) {
      throw new NotFoundException(`Pricing configuration ${id} not found`);
    }
    return config;
  }

  /**
   * Get all pricing configurations (paginated)
   */
  async getAllConfigs(page = 1, limit = 50) {
    if (page < 1) {
      throw new BadRequestException('Page must be >= 1');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.pricingConfigRepository.findAll(page, limit);
  }

  /**
   * Create new pricing configuration
   */
  async createConfig(data: CreatePricingConfigDto): Promise<PricingConfigEntity> {
    // Validate input
    this.validatePricingConfigData(data);

    const config = await this.pricingConfigRepository.create(data);
    this.logger.log(`Created pricing configuration: ${config.id}`);
    return config;
  }

  /**
   * Update pricing configuration
   */
  async updateConfig(id: string, data: UpdatePricingConfigDto): Promise<PricingConfigEntity> {
    // Verify exists
    const existing = await this.getConfigById(id);

    // Validate update data
    if (data.baseFee !== undefined) {
      if (data.baseFee < 0) {
        throw new BadRequestException('Base fee cannot be negative');
      }
    }

    const updated = await this.pricingConfigRepository.update(id, data);

    // Invalidate cache if this was the default
    if (existing.isDefault) {
      this.invalidateCache();
    }

    this.logger.log(`Updated pricing configuration: ${id}`);
    return updated;
  }

  /**
   * Set pricing configuration as default
   */
  async setAsDefault(id: string): Promise<void> {
    // Verify exists
    await this.getConfigById(id);

    await this.pricingConfigRepository.setAsDefault(id);
    this.invalidateCache();

    this.logger.log(`Set pricing configuration as default: ${id}`);
  }

  /**
   * Delete pricing configuration (soft delete)
   */
  async deleteConfig(id: string): Promise<void> {
    // Verify exists
    const config = await this.getConfigById(id);

    // Cannot delete default
    if (config.isDefault) {
      throw new BadRequestException('Cannot delete the default pricing configuration');
    }

    await this.pricingConfigRepository.delete(id);
    this.logger.log(`Deleted pricing configuration: ${id}`);
  }

  /**
   * Refresh cache every 5 minutes automatically
   * Used by NestJS @Scheduler integration
   */
  async refreshConfigCache() {
    this.invalidateCache();
    await this.getDefaultConfig();
    this.logger.debug('Pricing configuration cache refreshed');
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.cachedDefaultConfig = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Validate pricing configuration data
   */
  private validatePricingConfigData(data: CreatePricingConfigDto): void {
    if (!data.configName || data.configName.trim().length === 0) {
      throw new BadRequestException('Configuration name is required');
    }

    if (data.baseFee < 0) {
      throw new BadRequestException('Base fee cannot be negative');
    }

    if (!data.timeSlotConfigs || data.timeSlotConfigs.length === 0) {
      throw new BadRequestException('At least one time slot configuration is required');
    }

    if (!data.urgencyConfigs || data.urgencyConfigs.length === 0) {
      throw new BadRequestException('At least one urgency configuration is required');
    }

    // Validate time slots don't overlap
    const hours = new Set();
    for (const slot of data.timeSlotConfigs) {
      if (slot.startHour >= slot.endHour) {
        throw new BadRequestException(`Invalid time slot: start must be before end`);
      }
      for (let h = slot.startHour; h < slot.endHour; h++) {
        if (hours.has(h)) {
          throw new BadRequestException(`Time slot overlap detected at hour ${h}`);
        }
        hours.add(h);
      }
    }

    // Validate multipliers are positive
    for (const config of data.timeSlotConfigs) {
      if (config.multiplier <= 0) {
        throw new BadRequestException(`Multiplier must be positive (time slot: ${config.slot})`);
      }
    }

    for (const config of data.difficultyConfigs) {
      if (config.multiplier <= 0) {
        throw new BadRequestException(`Multiplier must be positive (difficulty: ${config.difficulty})`);
      }
    }

    for (const config of data.modeConfigs) {
      if (config.multiplier <= 0) {
        throw new BadRequestException(`Multiplier must be positive (mode: ${config.mode})`);
      }
    }

    for (const config of data.urgencyConfigs) {
      if (config.multiplier <= 0) {
        throw new BadRequestException(`Multiplier must be positive (urgency: ${config.urgency})`);
      }
    }

    // Validate discounts are between 0-100%
    for (const config of data.recurringDiscountConfigs) {
      if (config.discountPercentage < 0 || config.discountPercentage > 100) {
        throw new BadRequestException(`Discount percentage must be 0-100 (recurring: ${config.occurrenceCount})`);
      }
    }

    for (const config of data.volumeDiscountConfigs) {
      if (config.discountPercentage < 0 || config.discountPercentage > 100) {
        throw new BadRequestException(`Discount percentage must be 0-100 (volume: ${config.locationCount})`);
      }
    }
  }
}
