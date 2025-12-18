/**
 * Pricing Configuration Entity
 * 
 * Firestore Collection: pricing-configs
 * 
 * This entity defines the complete pricing configuration system including:
 * - Time slot multipliers (economy, standard, rush hour)
 * - Difficulty multipliers (easy, medium, hard)
 * - Mode multipliers (in-person, remote)
 * - Urgency premiums (standard, urgent, express, immediate)
 * - Surge pricing rules
 * - Discount configurations (recurring, volume, customer tier, promotional)
 * 
 * Design: Centralized configuration that applies to ALL pricing types.
 * This follows DRY principle - all multipliers defined once, reusable everywhere.
 */

export enum TimeSlotEnum {
  ECONOMY = 'economy',      // Off-peak: 0.85x
  STANDARD = 'standard',    // Peak hours: 1.0x
  RUSH_HOUR = 'rush_hour',  // High demand: 1.3x
}

export enum DifficultyEnum {
  EASY = 'easy',      // 1.0x
  MEDIUM = 'medium',  // 1.2x
  HARD = 'hard',      // 1.5x
}

export enum ModeEnum {
  IN_PERSON = 'in_person',  // 1.0x
  REMOTE = 'remote',        // 0.7x
}

export enum UrgencyEnum {
  STANDARD = 'standard',      // 1.0x, 24-48 hours
  URGENT = 'urgent',          // 1.25x, 12-24 hours
  EXPRESS = 'express',        // 1.5x, 3-6 hours
  IMMEDIATE = 'immediate',    // 2.0x, < 3 hours
}

export enum SurgeConditionEnum {
  LOW_AGENT_AVAILABILITY = 'low_agent_availability',
  HIGH_DEMAND_PERIOD = 'high_demand_period',
  EXTREME_WEATHER = 'extreme_weather',
  WEEKEND_PREMIUM = 'weekend_premium',
}

/**
 * Time Slot Configuration with multiplier and operational hours
 */
export interface ITimeSlotConfig {
  slot: TimeSlotEnum;
  multiplier: number;       // 0.85, 1.0, 1.3
  startHour: number;        // 0-23
  endHour: number;          // 0-23
  description: string;
  isActive: boolean;
}

/**
 * Difficulty Level Configuration
 */
export interface IDifficultyConfig {
  difficulty: DifficultyEnum;
  multiplier: number;        // 1.0, 1.2, 1.5
  description: string;
  applicableVerificationTypes: string[]; // e.g., ['standard_verification', 'background_check']
  isActive: boolean;
}

/**
 * Mode Configuration (In-Person vs Remote)
 */
export interface IModeConfig {
  mode: ModeEnum;
  multiplier: number;         // 1.0 for in-person, 0.7 for remote
  description: string;
  isActive: boolean;
}

/**
 * Urgency Premium Configuration
 */
export interface IUrgencyConfig {
  urgency: UrgencyEnum;
  multiplier: number;         // 1.0, 1.25, 1.5, 2.0
  completionTimeHours: number; // 48, 24, 6, 3
  description: string;
  isActive: boolean;
}

/**
 * Surge Pricing Configuration
 */
export interface ISurgeConfig {
  condition: SurgeConditionEnum;
  multiplier: number;         // 1.2, 1.5, etc.
  minThreshold?: number;      // e.g., min pending requests
  maxThreshold?: number;      // e.g., max agents available
  validHours?: { start: number; end: number }; // 24-hour format
  description: string;
  isActive: boolean;
}

/**
 * Recurring Discount Configuration
 */
export interface IRecurringDiscountConfig {
  occurrenceCount: number;    // 2, 3, 4, 5+
  discountPercentage: number; // 5, 10, 15, 20
  description: string;
  isActive: boolean;
}

/**
 * Volume Discount Configuration
 */
export interface IVolumeDiscountConfig {
  locationCount: number;      // 2, 3, 5, 10+
  discountPercentage: number; // 5, 10, 15, 25
  description: string;
  isActive: boolean;
}

/**
 * Customer Tier Discount Configuration
 */
export interface ICustomerTierDiscountConfig {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  discountPercentage: number;
  minRequestsRequired: number;
  description: string;
  isActive: boolean;
}

/**
 * Promotional Code Configuration
 */
export interface IPromotionalCodeConfig {
  code: string;
  discountPercentage: number;
  maxUsageCount?: number;
  currentUsageCount: number;
  validFrom: Date;
  validUntil: Date;
  applicableRequestTypes?: string[]; // null = all types
  description: string;
  isActive: boolean;
}

/**
 * Main Pricing Configuration Entity
 */
export class PricingConfigEntity {
  id: string;

  // Organization & General
  organizationId: string;
  configName: string;           // e.g., "Default Pricing Config v2"
  description: string;
  currency: string;             // 'NGN'
  baseFee: number;              // Base fee in kobo (₦5,000 = 500000)

  // Time Slot Multipliers
  timeSlotMultipliers: Map<TimeSlotEnum, number>;
  timeSlotConfigs: ITimeSlotConfig[];

  // Difficulty Multipliers
  difficultyMultipliers: Map<DifficultyEnum, number>;
  difficultyConfigs: IDifficultyConfig[];

  // Mode Multipliers
  modeMultipliers: Map<ModeEnum, number>;
  modeConfigs: IModeConfig[];

  // Urgency Premiums
  urgencyMultipliers: Map<UrgencyEnum, number>;
  urgencyConfigs: IUrgencyConfig[];

  // Surge Pricing
  surgeConfigs: ISurgeConfig[];
  surgeEnabled: boolean;
  defaultSurgeMultiplier: number;

  // Discounts
  recurringDiscountConfigs: IRecurringDiscountConfig[];
  volumeDiscountConfigs: IVolumeDiscountConfig[];
  tierDiscountConfigs: ICustomerTierDiscountConfig[];
  promotionalCodeConfigs: IPromotionalCodeConfig[];

  // Control Flags
  isActive: boolean;
  isDefault: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

/**
 * DTO for creating pricing configuration
 */
export class CreatePricingConfigDto {
  configName: string;
  description: string;
  baseFee: number;
  timeSlotConfigs: ITimeSlotConfig[];
  difficultyConfigs: IDifficultyConfig[];
  modeConfigs: IModeConfig[];
  urgencyConfigs: IUrgencyConfig[];
  surgeConfigs: ISurgeConfig[];
  recurringDiscountConfigs: IRecurringDiscountConfig[];
  volumeDiscountConfigs: IVolumeDiscountConfig[];
  tierDiscountConfigs: ICustomerTierDiscountConfig[];
}

/**
 * DTO for updating pricing configuration
 */
export class UpdatePricingConfigDto {
  configName?: string;
  description?: string;
  baseFee?: number;
  timeSlotConfigs?: ITimeSlotConfig[];
  difficultyConfigs?: IDifficultyConfig[];
  modeConfigs?: IModeConfig[];
  urgencyConfigs?: IUrgencyConfig[];
  surgeConfigs?: ISurgeConfig[];
  recurringDiscountConfigs?: IRecurringDiscountConfig[];
  volumeDiscountConfigs?: IVolumeDiscountConfig[];
  tierDiscountConfigs?: ICustomerTierDiscountConfig[];
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Helper class to manage pricing configuration
 */
export class PricingConfigHelper {
  /**
   * Convert Firestore document to PricingConfigEntity
   * Deserialize plain objects back to Maps with proper enum types
   */
  static fromFirestore(doc: any): PricingConfigEntity {
    const entity = new PricingConfigEntity();
    Object.assign(entity, doc);

    // Convert objects to maps with proper enum keys
    entity.timeSlotMultipliers = new Map(
      Object.entries(doc.timeSlotMultipliers || {}) as [TimeSlotEnum, number][]
    );
    entity.difficultyMultipliers = new Map(
      Object.entries(doc.difficultyMultipliers || {}) as [DifficultyEnum, number][]
    );
    entity.modeMultipliers = new Map(
      Object.entries(doc.modeMultipliers || {}) as [ModeEnum, number][]
    );
    entity.urgencyMultipliers = new Map(
      Object.entries(doc.urgencyMultipliers || {}) as [UrgencyEnum, number][]
    );

    return entity;
  }

  /**
   * Convert PricingConfigEntity to Firestore document
   * Serialize Maps to plain objects (not arrays) to avoid nested arrays
   */
  static toFirestore(entity: PricingConfigEntity): any {
    // Helper: Convert Map to plain object
    const mapToObject = (map: Map<string, number> | undefined): Record<string, number> => {
      if (!map) return {};
      const obj: Record<string, number> = {};
      map.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    };

    return {
      ...entity,
      timeSlotMultipliers: mapToObject(entity.timeSlotMultipliers),
      difficultyMultipliers: mapToObject(entity.difficultyMultipliers),
      modeMultipliers: mapToObject(entity.modeMultipliers),
      urgencyMultipliers: mapToObject(entity.urgencyMultipliers),
    } as any;
  }

  /**
   * Get time slot multiplier
   */
  static getTimeSlotMultiplier(config: PricingConfigEntity, slot: TimeSlotEnum): number {
    return config.timeSlotMultipliers.get(slot) || 1.0;
  }

  /**
   * Get difficulty multiplier
   */
  static getDifficultyMultiplier(config: PricingConfigEntity, difficulty: DifficultyEnum): number {
    return config.difficultyMultipliers.get(difficulty) || 1.0;
  }

  /**
   * Get mode multiplier
   */
  static getModeMultiplier(config: PricingConfigEntity, mode: ModeEnum): number {
    return config.modeMultipliers.get(mode) || 1.0;
  }

  /**
   * Get urgency multiplier
   */
  static getUrgencyMultiplier(config: PricingConfigEntity, urgency: UrgencyEnum): number {
    return config.urgencyMultipliers.get(urgency) || 1.0;
  }

  /**
   * Determine time slot based on current hour
   */
  static determineTimeSlot(hour: number, config: PricingConfigEntity): TimeSlotEnum {
    for (const timeSlotConfig of config.timeSlotConfigs) {
      if (!timeSlotConfig.isActive) continue;

      if (timeSlotConfig.startHour <= hour && hour < timeSlotConfig.endHour) {
        return timeSlotConfig.slot;
      }
    }
    return TimeSlotEnum.STANDARD;
  }

  /**
   * Check if surge pricing applies
   */
  static checkSurgePricing(
    condition: SurgeConditionEnum,
    config: PricingConfigEntity,
  ): { applies: boolean; multiplier: number } {
    if (!config.surgeEnabled) {
      return { applies: false, multiplier: 1.0 };
    }

    const surgeRule = config.surgeConfigs.find(
      (s) => s.condition === condition && s.isActive,
    );

    if (surgeRule) {
      return { applies: true, multiplier: surgeRule.multiplier };
    }

    return { applies: false, multiplier: 1.0 };
  }
}
