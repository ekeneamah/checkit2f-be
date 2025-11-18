/**
 * Pricing Domain Interfaces
 * 
 * Core interfaces for the pricing domain following Interface Segregation Principle.
 * Each interface has a single, well-defined responsibility.
 * 
 * @module PricingInterfaces
 */

import { VerificationTypeEnum, VerificationUrgency } from '../value-objects/verification-type.value-object';
import { TimeSlot, DifficultyLevel, VerificationMode, DiscountType } from '../enums/pricing.enum';

/**
 * Coordinates interface
 */
export interface ICoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Pricing request interface
 */
export interface IPricingRequest {
  readonly verificationType: VerificationTypeEnum;
  readonly urgency: VerificationUrgency;
  readonly mode: VerificationMode;
  readonly origin: ICoordinates;
  readonly destination: ICoordinates;
  readonly scheduledDate?: Date;
  readonly discountCode?: string;
}

/**
 * Pricing factors value object interface
 */
export interface IPricingFactors {
  readonly basePrice: number;
  readonly distance: number;
  readonly timeSlot: TimeSlot;
  readonly difficulty: DifficultyLevel;
  readonly verificationType: VerificationTypeEnum;
  readonly urgency: VerificationUrgency;
  readonly mode: VerificationMode;
  readonly surgeMultiplier: number;
}

/**
 * Price breakdown interface
 */
export interface IPriceBreakdown {
  readonly subtotal: number;
  readonly baseAmount: number;
  readonly distanceAmount: number;
  readonly timeAdjustment: number;
  readonly typeAdjustment: number;
  readonly difficultyAdjustment: number;
  readonly modeAdjustment: number;
  readonly urgencyAdjustment: number;
  readonly surgeAmount: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly currency: string;
  readonly factors: IPricingFactors;
  readonly appliedDiscounts?: IDiscount[];
}

/**
 * Discount interface
 */
export interface IDiscount {
  readonly code: string;
  readonly type: DiscountType;
  readonly value: number;
  readonly description: string;
  readonly validFrom?: Date;
  readonly validUntil?: Date;
  readonly usageLimit?: number;
  readonly perUserLimit?: number;
  readonly minAmount?: number;
  readonly isActive?: boolean;
  readonly usageCount?: number;
}

/**
 * Pricing configuration interface
 */
export interface IPricingConfig {
  readonly baseFee: number;
  readonly currency: string;
  readonly distanceRatePerKm: number;
  readonly timeMultipliers: Record<TimeSlot, number>;
  readonly difficultyMultipliers: Record<DifficultyLevel, number>;
  readonly typeMultipliers: Record<string, number>;
  readonly modeMultipliers: Record<VerificationMode, number>;
  readonly surgePricingEnabled: boolean;
  readonly maxSurgeMultiplier: number;
}

/**
 * Pricing suggestion interface
 */
export interface IPricingSuggestion {
  readonly timeSlot: TimeSlot;
  readonly suggestedTime: Date;
  readonly estimatedPrice: number;
  readonly savings: number;
  readonly savingsPercentage: number;
}

/**
 * Distance calculator interface (ISP - Interface Segregation)
 */
export interface IDistanceCalculator {
  calculateDistance(origin: ICoordinates, destination: ICoordinates): Promise<number>;
  calculateTravelTime(origin: ICoordinates, destination: ICoordinates): Promise<number>;
}

/**
 * Surge pricing calculator interface (ISP)
 */
export interface ISurgePricingCalculator {
  calculateSurgeMultiplier(location: ICoordinates, scheduledDate: Date): Promise<number>;
  isSurgeActive(location: ICoordinates, date: Date): Promise<boolean>;
}

/**
 * Pricing configuration repository interface (ISP)
 */
export interface IPricingConfigRepository {
  getConfig(): Promise<IPricingConfig>;
  updateConfig(config: Partial<IPricingConfig>): Promise<IPricingConfig>;
  getConfigByCurrency(currency: string): Promise<IPricingConfig>;
}

/**
 * Pricing calculator interface (main service contract)
 */
export interface IPricingCalculator {
  calculate(request: IPricingRequest): Promise<IPriceBreakdown>;
  getSuggestions(request: IPricingRequest): Promise<IPricingSuggestion[]>;
  validateDiscount(code: string, amount: number): Promise<IDiscount | null>;
  calculateTravelTime(request: IPricingRequest): Promise<number>;
  isSurgeActive(request: IPricingRequest): Promise<boolean>;
}
