import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { IRequestTypeConfig, IPriceCalculationResult } from '../../domain/interfaces';
import { RequestTypeConfigRepository } from '../../infrastructure/repositories/request-type-config.repository';
import { RequestTypePricingService } from './request-type-pricing.service';
import { RequestTypeSeederService } from './seeders/request-type.seeder';

/**
 * Admin Request Type Management Service
 * SOLID: Single Responsibility - Manages request type CRUD and admin operations
 */
@Injectable()
export class AdminRequestTypeManagementService {
  private readonly logger = new Logger(AdminRequestTypeManagementService.name);

  constructor(
    private readonly repository: RequestTypeConfigRepository,
    private readonly pricingService: RequestTypePricingService,
    private readonly seederService: RequestTypeSeederService,
  ) {}

  /**
   * Create new request type
   */
  async createRequestType(
    data: Partial<IRequestTypeConfig>,
    createdBy: string,
  ): Promise<IRequestTypeConfig> {
    this.logger.log(`Creating new request type: ${data.name}`);

    // Validate uniqueness
    if (await this.repository.existsByName(data.name)) {
      throw new ConflictException(
        `Request type with name '${data.name}' already exists`,
      );
    }

    // Validate configuration
    this.pricingService.validateRequestTypeConfig(data as IRequestTypeConfig);

    // Set defaults
    const requestType: Partial<IRequestTypeConfig> = {
      ...data,
      createdBy,
      isActive: data.isActive ?? true,
      isDefault: false, // Never set as default on creation
      sortOrder: data.sortOrder ?? 999,
      phase: data.phase ?? 1,
    };

    const created = await this.repository.create(requestType);

    this.logger.log(`Request type created successfully: ${created.id}`);

    return created;
  }

  /**
   * Update existing request type
   */
  async updateRequestType(
    id: string,
    updates: Partial<IRequestTypeConfig>,
  ): Promise<IRequestTypeConfig> {
    this.logger.log(`Updating request type: ${id}`);

    // Check if exists
    await this.repository.findByIdOrFail(id);

    // Validate name uniqueness if changing name
    if (updates.name) {
      if (await this.repository.existsByName(updates.name, id)) {
        throw new ConflictException(
          `Request type with name '${updates.name}' already exists`,
        );
      }
    }

    // If updating pricing config, validate it
    if (this.isPricingConfigUpdate(updates)) {
      const existing = await this.repository.findByIdOrFail(id);
      const merged = { ...existing, ...updates };
      this.pricingService.validateRequestTypeConfig(merged);
    }

    const updated = await this.repository.update(id, updates);

    this.logger.log(`Request type updated successfully: ${id}`);

    return updated;
  }

  /**
   * Enable/disable request type
   */
  async toggleActive(id: string): Promise<IRequestTypeConfig> {
    this.logger.log(`Toggling active status for request type: ${id}`);

    const updated = await this.repository.toggleActive(id);

    this.logger.log(
      `Request type ${updated.isActive ? 'activated' : 'deactivated'}: ${id}`,
    );

    return updated;
  }

  /**
   * Set request type as default
   */
  async setAsDefault(id: string): Promise<IRequestTypeConfig> {
    this.logger.log(`Setting request type as default: ${id}`);

    // Ensure it's active
    const requestType = await this.repository.findByIdOrFail(id);
    if (!requestType.isActive) {
      throw new BadRequestException('Cannot set inactive request type as default');
    }

    const updated = await this.repository.setAsDefault(id);

    this.logger.log(`Request type set as default: ${id}`);

    return updated;
  }

  /**
   * Change request type phase
   */
  async changePhase(id: string, phase: 1 | 2): Promise<IRequestTypeConfig> {
    this.logger.log(`Changing phase to ${phase} for request type: ${id}`);

    const updated = await this.repository.changePhase(id, phase);

    this.logger.log(`Request type phase changed to ${phase}: ${id}`);

    return updated;
  }

  /**
   * Delete request type (soft delete)
   */
  async deleteRequestType(id: string): Promise<void> {
    this.logger.log(`Deleting request type: ${id}`);

    // Check if it's the default
    const requestType = await this.repository.findByIdOrFail(id);
    if (requestType.isDefault) {
      throw new BadRequestException('Cannot delete default request type');
    }

    await this.repository.softDelete(id);

    this.logger.log(`Request type deleted: ${id}`);
  }

  /**
   * Permanently delete request type (use with caution)
   */
  async permanentlyDeleteRequestType(id: string): Promise<void> {
    this.logger.warn(`Permanently deleting request type: ${id}`);

    // Check if it's the default
    const requestType = await this.repository.findByIdOrFail(id);
    if (requestType.isDefault) {
      throw new BadRequestException('Cannot delete default request type');
    }

    await this.repository.hardDelete(id);

    this.logger.warn(`Request type permanently deleted: ${id}`);
  }

  /**
   * Get all request types (including inactive)
   */
  async getAllRequestTypes(): Promise<IRequestTypeConfig[]> {
    this.logger.debug('Fetching all request types');

    return this.repository.findAll();
  }

  /**
   * Get request type by ID
   */
  async getRequestTypeById(id: string): Promise<IRequestTypeConfig> {
    this.logger.debug(`Fetching request type by ID: ${id}`);

    return this.repository.findByIdOrFail(id);
  }

  /**
   * Get active request types by phase
   */
  async getActiveRequestTypesByPhase(phase: 1 | 2): Promise<IRequestTypeConfig[]> {
    this.logger.debug(`Fetching active Phase ${phase} request types`);

    return this.repository.findActiveByPhase(phase);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    phase1: number;
    phase2: number;
  }> {
    this.logger.debug('Fetching request type statistics');

    const [total, active, phase1, phase2] = await Promise.all([
      this.repository.countActive(),
      this.repository.countActive(),
      this.repository.countByPhase(1),
      this.repository.countByPhase(2),
    ]);

    return {
      total: total + (await this.repository.findAll()).filter((rt) => !rt.isActive)
        .length,
      active,
      phase1,
      phase2,
    };
  }

  /**
   * Test price calculation for a request type
   */
  async testPriceCalculation(
    id: string,
    params: Record<string, any>,
  ): Promise<IPriceCalculationResult> {
    this.logger.debug(`Testing price calculation for request type: ${id}`);

    const requestType = await this.repository.findByIdOrFail(id);

    return this.pricingService.calculatePrice(requestType, params);
  }

  /**
   * Seed default request types
   */
  async seedDefaultTypes(phase?: 1 | 2): Promise<void> {
    this.logger.log(`Seeding default request types (phase: ${phase || 'all'})`);

    if (phase === 1) {
      await this.seederService.seedPhase1();
    } else if (phase === 2) {
      await this.seederService.seedPhase2();
    } else {
      await this.seederService.seedAll();
    }

    this.logger.log('Default request types seeded successfully');
  }

  /**
   * Duplicate request type (for creating variations)
   */
  async duplicateRequestType(
    id: string,
    newName: string,
    createdBy: string,
  ): Promise<IRequestTypeConfig> {
    this.logger.log(`Duplicating request type: ${id} as '${newName}'`);

    const original = await this.repository.findByIdOrFail(id);

    // Check name uniqueness
    if (await this.repository.existsByName(newName)) {
      throw new ConflictException(
        `Request type with name '${newName}' already exists`,
      );
    }

    // Create duplicate
    const duplicate: Partial<IRequestTypeConfig> = {
      ...original,
      id: undefined, // Let Firestore generate new ID
      name: newName,
      displayName: `${original.displayName} (Copy)`,
      isDefault: false,
      isActive: false, // Start inactive
      createdBy,
      createdAt: undefined,
      updatedAt: undefined,
      version: undefined,
    };

    const created = await this.repository.create(duplicate);

    this.logger.log(`Request type duplicated successfully: ${created.id}`);

    return created;
  }

  /**
   * Reorder request types (update sort order)
   */
  async reorderRequestTypes(
    orderedIds: string[],
  ): Promise<IRequestTypeConfig[]> {
    this.logger.log('Reordering request types');

    const updates: Promise<IRequestTypeConfig>[] = orderedIds.map((id, index) =>
      this.repository.update(id, { sortOrder: index + 1 }),
    );

    const updated = await Promise.all(updates);

    this.logger.log(`Reordered ${updated.length} request types`);

    return updated;
  }

  /**
   * Bulk update active status
   */
  async bulkToggleActive(
    ids: string[],
    isActive: boolean,
  ): Promise<IRequestTypeConfig[]> {
    this.logger.log(
      `Bulk ${isActive ? 'activating' : 'deactivating'} ${ids.length} request types`,
    );

    const updates: Promise<IRequestTypeConfig>[] = ids.map((id) =>
      this.repository.update(id, { isActive }),
    );

    const updated = await Promise.all(updates);

    this.logger.log(`Bulk update completed for ${updated.length} request types`);

    return updated;
  }

  /**
   * Helper: Check if update contains pricing config changes
   */
  private isPricingConfigUpdate(updates: Partial<IRequestTypeConfig>): boolean {
    return !!(
      updates.pricingType ||
      updates.basePrice ||
      updates.radiusPricing ||
      updates.tieredPricing ||
      updates.pricePerLocation ||
      updates.premiumMultiplier
    );
  }
}
