import { PricingType } from '../enums';

/**
 * Base Pricing Calculator Interface (ISP - Interface Segregation Principle)
 * All pricing calculators must implement this interface
 */
export interface IPricingCalculator {
  /**
   * Get the pricing type this calculator handles
   */
  readonly pricingType: PricingType;

  /**
   * Calculate price based on input parameters
   * @param params - Calculation parameters specific to pricing type
   * @returns Calculated price in kobo (₦1 = 100 kobo)
   */
  calculatePrice(params: IPricingCalculationParams): number;

  /**
   * Validate that all required parameters are present
   * @param params - Parameters to validate
   * @throws Error if validation fails
   */
  validateParams(params: IPricingCalculationParams): void;

  /**
   * Get human-readable breakdown of price calculation
   * @param params - Calculation parameters
   * @returns String explaining how price was calculated
   */
  getPriceBreakdown(params: IPricingCalculationParams): string;
}

/**
 * Base parameters for all pricing calculations
 */
export interface IPricingCalculationParams {
  requestTypeId: string;
  [key: string]: any; // Allow additional params per pricing type
}

/**
 * Radius-based pricing parameters
 */
export interface IRadiusPricingParams extends IPricingCalculationParams {
  radiusKm: number;
  radiusPricingTable: IRadiusPricingTier[];
}

/**
 * Per-location pricing parameters
 */
export interface IPerLocationPricingParams extends IPricingCalculationParams {
  locationCount: number;
  pricePerLocation: number;
  minLocations: number;
  maxLocations: number;
}

/**
 * Tiered pricing parameters
 */
export interface ITieredPricingParams extends IPricingCalculationParams {
  selectedTier: string; // 'SIMPLE', 'COMPLEX'
  tieredPricingTable: ITieredPricingOption[];
}

/**
 * Premium multiplier parameters
 */
export interface IPremiumMultiplierParams extends IPricingCalculationParams {
  basePrice: number;
  multiplier: number; // e.g., 1.5 for 50% premium
}

/**
 * Recurring discount parameters
 */
export interface IRecurringDiscountParams extends IPricingCalculationParams {
  basePrice: number;
  occurrenceCount: number;
  discountPercentage: number; // e.g., 20 for 20% off
}

/**
 * Fixed price parameters
 */
export interface IFixedPricingParams extends IPricingCalculationParams {
  basePrice: number;
}

/**
 * Radius pricing tier structure
 */
export interface IRadiusPricingTier {
  radiusKm: number;
  price: number; // In kobo
}

/**
 * Tiered pricing option structure
 */
export interface ITieredPricingOption {
  tier: string; // 'SIMPLE', 'COMPLEX'
  description: string;
  price: number; // In kobo
}
