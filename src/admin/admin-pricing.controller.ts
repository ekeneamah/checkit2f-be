import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/auth.interface';
import { FirebaseService } from '../infrastructure/firebase/firebase.service';

/**
 * DTO for creating/updating pricing configuration
 */
class CreatePricingConfigDto {
  name: string;
  description?: string;
  currency?: string;
  baseFee: number;
  timeSlotConfigs?: TimeSlotConfigDto[];
  difficultyConfigs?: DifficultyConfigDto[];
  modeConfigs?: ModeConfigDto[];
  urgencyConfigs?: UrgencyConfigDto[];
  surgeConfigs?: SurgeConfigDto[];
  surgeEnabled?: boolean;
  defaultSurgeMultiplier?: number;
  recurringDiscounts?: RecurringDiscountDto[];
  volumeDiscounts?: VolumeDiscountDto[];
  customerTierDiscounts?: CustomerTierDiscountDto[];
  isDefault?: boolean;
}

class UpdatePricingConfigDto extends CreatePricingConfigDto {
  isActive?: boolean;
}

class TimeSlotConfigDto {
  slot: string;
  multiplier: number;
  startHour: number;
  endHour: number;
  label: string;
  description?: string;
}

class DifficultyConfigDto {
  level: string;
  multiplier: number;
  label: string;
  description?: string;
  useCases?: string[];
}

class ModeConfigDto {
  mode: string;
  multiplier: number;
  label: string;
  description?: string;
}

class UrgencyConfigDto {
  level: string;
  multiplier: number;
  slaHours: number;
  label: string;
  description?: string;
}

class SurgeConfigDto {
  condition: string;
  multiplier: number;
  minThreshold?: number;
  startHour?: number;
  endHour?: number;
  description?: string;
  isActive: boolean;
}

class RecurringDiscountDto {
  minOccurrences: number;
  discountPercentage: number;
  description?: string;
}

class VolumeDiscountDto {
  minLocations: number;
  maxLocations?: number;
  discountPercentage: number;
  description?: string;
}

class CustomerTierDiscountDto {
  tier: string;
  minCompletedRequests: number;
  discountPercentage: number;
  description?: string;
}

class CreatePromoCodeDto {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses?: number;
  validFrom: string;
  validTo: string;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  description?: string;
}

class UpdatePromoCodeDto extends CreatePromoCodeDto {
  isActive?: boolean;
}

/**
 * Admin Pricing Controller
 * Provides endpoints for managing pricing configurations, promo codes, and statistics
 */
@ApiTags('Admin - Pricing')
@ApiBearerAuth()
@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPricingController {
  private readonly logger = new Logger(AdminPricingController.name);
  private readonly PRICING_CONFIGS_COLLECTION = 'pricing_configs';
  private readonly PROMO_CODES_COLLECTION = 'promo_codes';

  constructor(private readonly firebaseService: FirebaseService) {}

  // =====================================================
  // PRICING CONFIGURATIONS
  // =====================================================

  /**
   * Get all pricing configurations
   * GET /api/admin/pricing/configs
   */
  @Get('configs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all pricing configurations',
    description: 'Retrieve all pricing configurations with optional filters',
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isDefault', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Pricing configurations retrieved successfully',
  })
  async getAllConfigs(
    @Query('isActive') isActive?: string,
    @Query('isDefault') isDefault?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    this.logger.log('Getting all pricing configurations');

    const db = this.firebaseService.db;
    let query = db.collection(this.PRICING_CONFIGS_COLLECTION);

    // Apply filters
    if (isActive !== undefined) {
      query = query.where('isActive', '==', isActive === 'true') as any;
    }
    if (isDefault !== undefined) {
      query = query.where('isDefault', '==', isDefault === 'true') as any;
    }

    const snapshot = await query.get();
    let configs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      configs = configs.filter(
        (config: any) =>
          config.name?.toLowerCase().includes(searchLower) ||
          config.description?.toLowerCase().includes(searchLower),
      );
    }

    // Pagination
    const pageNum = parseInt(page || '1');
    const pageSizeNum = parseInt(pageSize || '20');
    const startIndex = (pageNum - 1) * pageSizeNum;
    const paginatedConfigs = configs.slice(startIndex, startIndex + pageSizeNum);

    return {
      items: paginatedConfigs,
      total: configs.length,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(configs.length / pageSizeNum),
    };
  }

  /**
   * Get pricing configuration by ID
   * GET /api/admin/pricing/configs/:id
   */
  @Get('configs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pricing configuration by ID',
  })
  @ApiParam({ name: 'id', description: 'Pricing configuration ID' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getConfigById(@Param('id') id: string) {
    this.logger.log(`Getting pricing configuration: ${id}`);

    const db = this.firebaseService.db;
    const doc = await db.collection(this.PRICING_CONFIGS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Pricing configuration ${id} not found`);
    }

    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get default pricing configuration
   * GET /api/admin/pricing/configs/default
   */
  @Get('configs/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get default pricing configuration',
  })
  @ApiResponse({ status: 200, description: 'Default configuration retrieved' })
  @ApiResponse({ status: 404, description: 'No default configuration found' })
  async getDefaultConfig() {
    this.logger.log('Getting default pricing configuration');

    const db = this.firebaseService.db;
    const snapshot = await db
      .collection(this.PRICING_CONFIGS_COLLECTION)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException('No default pricing configuration found');
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Create pricing configuration
   * POST /api/admin/pricing/configs
   */
  @Post('configs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new pricing configuration',
  })
  @ApiBody({ type: CreatePricingConfigDto })
  @ApiResponse({ status: 201, description: 'Configuration created' })
  async createConfig(@Body() dto: CreatePricingConfigDto) {
    this.logger.log(`Creating pricing configuration: ${dto.name}`);

    const db = this.firebaseService.db;

    // If this is marked as default, unset other defaults
    if (dto.isDefault) {
      const existingDefaults = await db
        .collection(this.PRICING_CONFIGS_COLLECTION)
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      existingDefaults.docs.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    const now = new Date().toISOString();
    const configData = {
      ...dto,
      currency: dto.currency || 'NGN',
      isActive: true,
      isDefault: dto.isDefault || false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(this.PRICING_CONFIGS_COLLECTION).add(configData);
    return { id: docRef.id, ...configData };
  }

  /**
   * Update pricing configuration
   * PATCH /api/admin/pricing/configs/:id
   */
  @Patch('configs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update pricing configuration',
  })
  @ApiParam({ name: 'id', description: 'Pricing configuration ID' })
  @ApiBody({ type: UpdatePricingConfigDto })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async updateConfig(@Param('id') id: string, @Body() dto: UpdatePricingConfigDto) {
    this.logger.log(`Updating pricing configuration: ${id}`);

    const db = this.firebaseService.db;
    const docRef = db.collection(this.PRICING_CONFIGS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Pricing configuration ${id} not found`);
    }

    const currentData = doc.data();

    // If this is marked as default, unset other defaults
    if (dto.isDefault && !currentData?.isDefault) {
      const existingDefaults = await db
        .collection(this.PRICING_CONFIGS_COLLECTION)
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      existingDefaults.docs.forEach((d) => {
        if (d.id !== id) {
          batch.update(d.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    const updateData = {
      ...dto,
      version: (currentData?.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updateData);
    return { id, ...currentData, ...updateData };
  }

  /**
   * Delete pricing configuration
   * DELETE /api/admin/pricing/configs/:id
   */
  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete pricing configuration',
  })
  @ApiParam({ name: 'id', description: 'Pricing configuration ID' })
  @ApiResponse({ status: 204, description: 'Configuration deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete default configuration' })
  async deleteConfig(@Param('id') id: string) {
    this.logger.log(`Deleting pricing configuration: ${id}`);

    const db = this.firebaseService.db;
    const docRef = db.collection(this.PRICING_CONFIGS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Pricing configuration ${id} not found`);
    }

    if (doc.data()?.isDefault) {
      throw new BadRequestException('Cannot delete the default pricing configuration');
    }

    await docRef.delete();
  }

  /**
   * Set configuration as default
   * POST /api/admin/pricing/configs/:id/set-default
   */
  @Post('configs/:id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set pricing configuration as default',
  })
  @ApiParam({ name: 'id', description: 'Pricing configuration ID' })
  @ApiResponse({ status: 200, description: 'Configuration set as default' })
  async setAsDefault(@Param('id') id: string) {
    this.logger.log(`Setting pricing configuration ${id} as default`);

    const db = this.firebaseService.db;

    // Unset all other defaults
    const existingDefaults = await db
      .collection(this.PRICING_CONFIGS_COLLECTION)
      .where('isDefault', '==', true)
      .get();

    const batch = db.batch();
    existingDefaults.docs.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false });
    });

    // Set this one as default
    const docRef = db.collection(this.PRICING_CONFIGS_COLLECTION).doc(id);
    batch.update(docRef, { isDefault: true, updatedAt: new Date().toISOString() });

    await batch.commit();

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Duplicate pricing configuration
   * POST /api/admin/pricing/configs/:id/duplicate
   */
  @Post('configs/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Duplicate pricing configuration',
  })
  @ApiParam({ name: 'id', description: 'Pricing configuration ID' })
  @ApiBody({ schema: { properties: { name: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Configuration duplicated' })
  async duplicateConfig(@Param('id') id: string, @Body() body: { name: string }) {
    this.logger.log(`Duplicating pricing configuration ${id}`);

    const db = this.firebaseService.db;
    const doc = await db.collection(this.PRICING_CONFIGS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Pricing configuration ${id} not found`);
    }

    const originalData = doc.data();
    const now = new Date().toISOString();

    const newConfig = {
      ...originalData,
      name: body.name || `${originalData?.name} (Copy)`,
      isDefault: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const newDocRef = await db.collection(this.PRICING_CONFIGS_COLLECTION).add(newConfig);
    return { id: newDocRef.id, ...newConfig };
  }

  // =====================================================
  // PROMO CODES
  // =====================================================

  /**
   * Get all promo codes
   * GET /api/admin/pricing/promo-codes
   */
  @Get('promo-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all promo codes',
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Promo codes retrieved' })
  async getAllPromoCodes(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    this.logger.log('Getting all promo codes');

    const db = this.firebaseService.db;
    let query = db.collection(this.PROMO_CODES_COLLECTION);

    if (isActive !== undefined) {
      query = query.where('isActive', '==', isActive === 'true') as any;
    }

    const snapshot = await query.get();
    let promoCodes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      promoCodes = promoCodes.filter(
        (promo: any) =>
          promo.code?.toLowerCase().includes(searchLower) ||
          promo.description?.toLowerCase().includes(searchLower),
      );
    }

    // Pagination
    const pageNum = parseInt(page || '1');
    const pageSizeNum = parseInt(pageSize || '20');
    const startIndex = (pageNum - 1) * pageSizeNum;
    const paginatedPromoCodes = promoCodes.slice(startIndex, startIndex + pageSizeNum);

    return {
      items: paginatedPromoCodes,
      total: promoCodes.length,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(promoCodes.length / pageSizeNum),
    };
  }

  /**
   * Get promo code by ID
   * GET /api/admin/pricing/promo-codes/:id
   */
  @Get('promo-codes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get promo code by ID',
  })
  @ApiParam({ name: 'id', description: 'Promo code ID' })
  @ApiResponse({ status: 200, description: 'Promo code retrieved' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async getPromoCodeById(@Param('id') id: string) {
    this.logger.log(`Getting promo code: ${id}`);

    const db = this.firebaseService.db;
    const doc = await db.collection(this.PROMO_CODES_COLLECTION).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Promo code ${id} not found`);
    }

    return { id: doc.id, ...doc.data() };
  }

  /**
   * Validate promo code
   * POST /api/admin/pricing/promo-codes/validate
   */
  @Post('promo-codes/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a promo code',
  })
  @ApiBody({
    schema: {
      properties: {
        code: { type: 'string' },
        orderValue: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validatePromoCode(@Body() body: { code: string; orderValue?: number }) {
    this.logger.log(`Validating promo code: ${body.code}`);

    const db = this.firebaseService.db;
    const snapshot = await db
      .collection(this.PROMO_CODES_COLLECTION)
      .where('code', '==', body.code.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { valid: false, message: 'Promo code not found' };
    }

    const promo = snapshot.docs[0].data();
    const now = new Date();

    // Check if active
    if (!promo.isActive) {
      return { valid: false, message: 'Promo code is inactive' };
    }

    // Check validity period
    if (new Date(promo.validFrom) > now || new Date(promo.validTo) < now) {
      return { valid: false, message: 'Promo code has expired or is not yet valid' };
    }

    // Check usage limit
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return { valid: false, message: 'Promo code has reached its usage limit' };
    }

    // Check minimum order value
    if (promo.minOrderValue && body.orderValue && body.orderValue < promo.minOrderValue) {
      return {
        valid: false,
        message: `Minimum order value is ₦${(promo.minOrderValue / 100).toLocaleString()}`,
      };
    }

    // Calculate discount
    let discount = promo.discountValue;
    if (promo.discountType === 'PERCENTAGE' && body.orderValue) {
      discount = Math.round(body.orderValue * (promo.discountValue / 100));
      if (promo.maxDiscountAmount) {
        discount = Math.min(discount, promo.maxDiscountAmount);
      }
    }

    return {
      valid: true,
      discount,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      message: 'Promo code is valid',
    };
  }

  /**
   * Create promo code
   * POST /api/admin/pricing/promo-codes
   */
  @Post('promo-codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new promo code',
  })
  @ApiBody({ type: CreatePromoCodeDto })
  @ApiResponse({ status: 201, description: 'Promo code created' })
  async createPromoCode(@Body() dto: CreatePromoCodeDto) {
    this.logger.log(`Creating promo code: ${dto.code}`);

    const db = this.firebaseService.db;

    // Check if code already exists
    const existing = await db
      .collection(this.PROMO_CODES_COLLECTION)
      .where('code', '==', dto.code.toUpperCase())
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new BadRequestException(`Promo code ${dto.code} already exists`);
    }

    const now = new Date().toISOString();
    const promoData = {
      ...dto,
      code: dto.code.toUpperCase(),
      currentUses: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(this.PROMO_CODES_COLLECTION).add(promoData);
    return { id: docRef.id, ...promoData };
  }

  /**
   * Update promo code
   * PATCH /api/admin/pricing/promo-codes/:id
   */
  @Patch('promo-codes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update promo code',
  })
  @ApiParam({ name: 'id', description: 'Promo code ID' })
  @ApiBody({ type: UpdatePromoCodeDto })
  @ApiResponse({ status: 200, description: 'Promo code updated' })
  async updatePromoCode(@Param('id') id: string, @Body() dto: UpdatePromoCodeDto) {
    this.logger.log(`Updating promo code: ${id}`);

    const db = this.firebaseService.db;
    const docRef = db.collection(this.PROMO_CODES_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Promo code ${id} not found`);
    }

    const updateData = {
      ...dto,
      code: dto.code?.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.update(updateData);
    return { id, ...doc.data(), ...updateData };
  }

  /**
   * Delete promo code
   * DELETE /api/admin/pricing/promo-codes/:id
   */
  @Delete('promo-codes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete promo code',
  })
  @ApiParam({ name: 'id', description: 'Promo code ID' })
  @ApiResponse({ status: 204, description: 'Promo code deleted' })
  async deletePromoCode(@Param('id') id: string) {
    this.logger.log(`Deleting promo code: ${id}`);

    const db = this.firebaseService.db;
    await db.collection(this.PROMO_CODES_COLLECTION).doc(id).delete();
  }

  /**
   * Toggle promo code status
   * POST /api/admin/pricing/promo-codes/:id/toggle
   */
  @Post('promo-codes/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle promo code active status',
  })
  @ApiParam({ name: 'id', description: 'Promo code ID' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  async togglePromoCodeStatus(@Param('id') id: string) {
    this.logger.log(`Toggling promo code status: ${id}`);

    const db = this.firebaseService.db;
    const docRef = db.collection(this.PROMO_CODES_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Promo code ${id} not found`);
    }

    const currentStatus = doc.data()?.isActive;
    await docRef.update({
      isActive: !currentStatus,
      updatedAt: new Date().toISOString(),
    });

    return { id, ...doc.data(), isActive: !currentStatus };
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  /**
   * Get pricing statistics
   * GET /api/admin/pricing/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pricing statistics',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats() {
    this.logger.log('Getting pricing statistics');

    const db = this.firebaseService.db;

    // Get pricing configs stats
    const configsSnapshot = await db.collection(this.PRICING_CONFIGS_COLLECTION).get();
    const configs = configsSnapshot.docs.map((doc) => doc.data());
    const activeConfigs = configs.filter((c) => c.isActive).length;
    const averageBaseFee =
      configs.length > 0
        ? configs.reduce((sum, c) => sum + (c.baseFee || 0), 0) / configs.length
        : 0;

    // Get promo codes stats
    const promoSnapshot = await db.collection(this.PROMO_CODES_COLLECTION).get();
    const promoCodes = promoSnapshot.docs.map((doc) => doc.data());
    const activePromoCodes = promoCodes.filter((p) => p.isActive).length;

    // Get location pricing stats
    const locationSnapshot = await db.collection('location_pricing').get();
    const locations = locationSnapshot.docs.map((doc) => doc.data());
    const activeLocations = locations.filter((l) => l.status === 'active').length;

    // Calculate revenue (from verification requests)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const requestsSnapshot = await db
      .collection('verification_requests')
      .where('status.status', '==', 'COMPLETED')
      .get();

    const completedRequests = requestsSnapshot.docs.map((doc) => doc.data());
    const revenueThisMonth = completedRequests
      .filter((r) => new Date(r.createdAt) >= startOfMonth)
      .reduce((sum, r) => sum + (r.price?.amount || 0), 0);

    // Count discounts applied (approximate)
    const discountsApplied = completedRequests.filter(
      (r) => r.appliedDiscount || r.promoCode,
    ).length;

    return {
      totalConfigs: configs.length,
      activeConfigs,
      totalLocationPricing: locations.length,
      activeLocationPricing: activeLocations,
      totalPromoCodes: promoCodes.length,
      activePromoCodes,
      averageBaseFee: Math.round(averageBaseFee),
      revenueThisMonth,
      discountsApplied,
      surgeActivations: 0, // Would need separate tracking
    };
  }

  // =====================================================
  // PRICE SIMULATION
  // =====================================================

  /**
   * Simulate price calculation
   * POST /api/admin/pricing/simulate
   */
  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate price calculation',
    description: 'Calculate price with given parameters for testing',
  })
  @ApiResponse({ status: 200, description: 'Price calculated' })
  async simulatePrice(
    @Body()
    body: {
      city?: string;
      area?: string;
      timeSlot?: string;
      difficulty?: string;
      mode?: string;
      urgency?: string;
      locationCount?: number;
      promoCode?: string;
      customerTier?: string;
    },
  ) {
    this.logger.log('Simulating price calculation');

    // This would typically use the PricingCalculationService
    // For now, return a mock calculation
    const baseFee = 500000; // ₦5,000

    const timeMultipliers: Record<string, number> = {
      EARLY_MORNING: 0.85,
      DAY: 1.0,
      EVENING: 1.3,
    };

    const difficultyMultipliers: Record<string, number> = {
      STANDARD: 1.0,
      MODERATE: 1.2,
      COMPLEX: 1.5,
    };

    const modeMultipliers: Record<string, number> = {
      IN_PERSON: 1.0,
      REMOTE: 0.7,
    };

    const urgencyMultipliers: Record<string, number> = {
      STANDARD: 1.0,
      EXPRESS: 1.25,
      PRIORITY: 1.5,
      IMMEDIATE: 2.0,
    };

    const timeMultiplier = timeMultipliers[body.timeSlot || 'DAY'] || 1.0;
    const diffMultiplier = difficultyMultipliers[body.difficulty || 'STANDARD'] || 1.0;
    const modeMultiplier = modeMultipliers[body.mode || 'IN_PERSON'] || 1.0;
    const urgencyMultiplier = urgencyMultipliers[body.urgency || 'STANDARD'] || 1.0;

    let finalPrice = baseFee * timeMultiplier * diffMultiplier * modeMultiplier * urgencyMultiplier;

    // Apply location count
    if (body.locationCount && body.locationCount > 1) {
      const volumeDiscount = body.locationCount >= 6 ? 0.15 : body.locationCount >= 3 ? 0.1 : 0.05;
      finalPrice = finalPrice * (1 - volumeDiscount) * body.locationCount;
    }

    return {
      breakdown: {
        items: [
          { label: 'Base Fee', type: 'base', amount: baseFee },
          {
            label: `Time (${body.timeSlot || 'DAY'})`,
            type: 'multiplier',
            amount: Math.round(baseFee * (timeMultiplier - 1)),
            percentage: (timeMultiplier - 1) * 100,
          },
        ],
        subtotal: baseFee,
        totalAdditions: 0,
        totalMultipliers: Math.round(baseFee * (timeMultiplier * diffMultiplier - 1)),
        totalDiscounts: 0,
        totalSurge: Math.round(baseFee * (urgencyMultiplier - 1)),
        finalPrice: Math.round(finalPrice),
        currency: 'NGN',
        calculatedAt: new Date().toISOString(),
      },
      appliedRules: [
        `Time slot: ${body.timeSlot || 'DAY'} (${timeMultiplier}x)`,
        `Difficulty: ${body.difficulty || 'STANDARD'} (${diffMultiplier}x)`,
        `Mode: ${body.mode || 'IN_PERSON'} (${modeMultiplier}x)`,
        `Urgency: ${body.urgency || 'STANDARD'} (${urgencyMultiplier}x)`,
      ],
      suggestions: [],
    };
  }
}
