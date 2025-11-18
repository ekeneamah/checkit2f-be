import { Injectable, Logger } from '@nestjs/common';
import {
  IPricingCalculator,
  IPriceCalculationResult,
  IRequestTypeConfig,
} from '../../domain/interfaces';
import { PricingType } from '../../domain/enums';
import {
  FixedPriceCalculator,
  RadiusBasedCalculator,
  PerLocationCalculator,
  TieredCalculator,
  PremiumMultiplierCalculator,
  RecurringDiscountCalculator,
} from './pricing-calculators';

/**
 * Request Type Pricing Service (SOLID: Single Responsibility Principle)
 * Orchestrates pricing calculators based on request type configuration
 */
@Injectable()
export class RequestTypePricingService {
  private readonly logger = new Logger(RequestTypePricingService.name);
  private readonly calculators: Map<PricingType, IPricingCalculator>;

  constructor(
    private readonly fixedPriceCalculator: FixedPriceCalculator,
    private readonly radiusBasedCalculator: RadiusBasedCalculator,
    private readonly perLocationCalculator: PerLocationCalculator,
    private readonly tieredCalculator: TieredCalculator,
    private readonly premiumMultiplierCalculator: PremiumMultiplierCalculator,
    private readonly recurringDiscountCalculator: RecurringDiscountCalculator,
  ) {
    // Strategy Pattern: Map pricing types to calculators
    this.calculators = new Map<PricingType, IPricingCalculator>([
      [PricingType.FIXED, this.fixedPriceCalculator],
      [PricingType.RADIUS_BASED, this.radiusBasedCalculator],
      [PricingType.PER_LOCATION, this.perLocationCalculator],
      [PricingType.TIERED, this.tieredCalculator],
      [PricingType.PREMIUM_MULTIPLIER, this.premiumMultiplierCalculator],
      [PricingType.RECURRING_DISCOUNT, this.recurringDiscountCalculator],
    ]);
  }

  /**
   * Calculate price for a request type with given parameters
   * @param requestTypeConfig - Request type configuration
   * @param params - Parameters specific to the pricing type
   * @returns Price calculation result
   */
  calculatePrice(
    requestTypeConfig: IRequestTypeConfig,
    params: Record<string, any>,
  ): IPriceCalculationResult {
    this.logger.debug(
      `Calculating price for request type: ${requestTypeConfig.name}`,
    );

    const calculator = this.getCalculator(requestTypeConfig.pricingType);
    
    // Build calculation parameters based on pricing type
    const calculationParams = this.buildCalculationParams(
      requestTypeConfig,
      params,
    );

    // Calculate price using appropriate calculator
    const totalPrice = calculator.calculatePrice(calculationParams);
    const breakdown = calculator.getPriceBreakdown(calculationParams);

    // Build result
    const result: IPriceCalculationResult = {
      requestTypeId: requestTypeConfig.id,
      requestTypeName: requestTypeConfig.name,
      pricingType: requestTypeConfig.pricingType,
      totalPrice,
      currency: requestTypeConfig.currency,
      breakdown,
      subtotal: totalPrice,
      discount: 0,
    };

    // Add type-specific fields
    this.addTypeSpecificFields(result, requestTypeConfig, params);

    this.logger.debug(
      `Price calculated: ${result.totalPrice / 100} ${result.currency}`,
    );

    return result;
  }

  /**
   * Calculate price for recurring request with discount
   */
  calculateRecurringPrice(
    baseRequestTypeConfig: IRequestTypeConfig,
    occurrenceCount: number,
    discountPercentage: number,
    params: Record<string, any>,
  ): IPriceCalculationResult {
    this.logger.debug(
      `Calculating recurring price for ${occurrenceCount} occurrences`,
    );

    // First calculate base price
    const baseResult = this.calculatePrice(baseRequestTypeConfig, params);

    // Then apply recurring discount
    const recurringParams = {
      requestTypeId: baseRequestTypeConfig.id,
      basePrice: baseResult.totalPrice,
      occurrenceCount,
      discountPercentage,
    };

    const totalPrice = this.recurringDiscountCalculator.calculatePrice(
      recurringParams,
    );
    const discount =
      this.recurringDiscountCalculator.calculateDiscountAmount(recurringParams);
    const breakdown =
      this.recurringDiscountCalculator.getPriceBreakdown(recurringParams);

    return {
      requestTypeId: baseRequestTypeConfig.id,
      requestTypeName: baseRequestTypeConfig.name,
      pricingType: PricingType.RECURRING_DISCOUNT,
      basePrice: baseResult.totalPrice,
      totalPrice,
      currency: baseRequestTypeConfig.currency,
      breakdown,
      subtotal: baseResult.totalPrice * occurrenceCount,
      discount,
    };
  }

  /**
   * Calculate urgent/priority price (premium multiplier)
   */
  calculateUrgentPrice(
    baseRequestTypeConfig: IRequestTypeConfig,
    params: Record<string, any>,
    multiplier: number = 1.5,
  ): IPriceCalculationResult {
    this.logger.debug(`Calculating urgent price with ${multiplier}x multiplier`);

    // First calculate base price
    const baseResult = this.calculatePrice(baseRequestTypeConfig, params);

    // Then apply premium multiplier
    const urgentParams = {
      requestTypeId: baseRequestTypeConfig.id,
      basePrice: baseResult.totalPrice,
      multiplier,
    };

    const totalPrice =
      this.premiumMultiplierCalculator.calculatePrice(urgentParams);
    const breakdown =
      this.premiumMultiplierCalculator.getPriceBreakdown(urgentParams);

    return {
      requestTypeId: baseRequestTypeConfig.id,
      requestTypeName: baseRequestTypeConfig.name,
      pricingType: PricingType.PREMIUM_MULTIPLIER,
      basePrice: baseResult.totalPrice,
      premiumMultiplier: multiplier,
      totalPrice,
      currency: baseRequestTypeConfig.currency,
      breakdown,
      subtotal: baseResult.totalPrice,
      discount: 0,
    };
  }

  /**
   * Validate that request type configuration is complete
   */
  validateRequestTypeConfig(config: IRequestTypeConfig): void {
    if (!config.pricingType) {
      throw new Error('Request type must have a pricing type');
    }

    const calculator = this.getCalculator(config.pricingType);
    if (!calculator) {
      throw new Error(`No calculator found for pricing type: ${config.pricingType}`);
    }

    // Validate type-specific configuration
    switch (config.pricingType) {
      case PricingType.FIXED:
        if (!config.basePrice || config.basePrice <= 0) {
          throw new Error('FIXED pricing requires basePrice > 0');
        }
        break;

      case PricingType.RADIUS_BASED:
        if (!config.radiusPricing || config.radiusPricing.length === 0) {
          throw new Error('RADIUS_BASED pricing requires radiusPricing array');
        }
        break;

      case PricingType.PER_LOCATION:
        if (!config.pricePerLocation || config.pricePerLocation <= 0) {
          throw new Error('PER_LOCATION pricing requires pricePerLocation > 0');
        }
        if (!config.minLocations || config.minLocations < 1) {
          throw new Error('PER_LOCATION pricing requires minLocations >= 1');
        }
        break;

      case PricingType.TIERED:
        if (!config.tieredPricing || config.tieredPricing.length === 0) {
          throw new Error('TIERED pricing requires tieredPricing array');
        }
        break;

      case PricingType.PREMIUM_MULTIPLIER:
        if (!config.premiumMultiplier || config.premiumMultiplier < 1) {
          throw new Error('PREMIUM_MULTIPLIER requires multiplier >= 1');
        }
        break;
    }
  }

  /**
   * Get calculator for pricing type (Strategy Pattern)
   */
  private getCalculator(pricingType: PricingType): IPricingCalculator {
    const calculator = this.calculators.get(pricingType);
    if (!calculator) {
      throw new Error(`No calculator registered for pricing type: ${pricingType}`);
    }
    return calculator;
  }

  /**
   * Build calculation parameters from request type config and input params
   */
  private buildCalculationParams(
    config: IRequestTypeConfig,
    params: Record<string, any>,
  ): any {
    const baseParams = {
      requestTypeId: config.id,
    };

    switch (config.pricingType) {
      case PricingType.FIXED:
        return {
          ...baseParams,
          basePrice: config.basePrice,
        };

      case PricingType.RADIUS_BASED:
        if (!params.radiusKm) {
          throw new Error('radiusKm is required for RADIUS_BASED pricing');
        }
        return {
          ...baseParams,
          radiusKm: params.radiusKm,
          radiusPricingTable: config.radiusPricing,
        };

      case PricingType.PER_LOCATION:
        if (!params.locationCount) {
          throw new Error('locationCount is required for PER_LOCATION pricing');
        }
        return {
          ...baseParams,
          locationCount: params.locationCount,
          pricePerLocation: config.pricePerLocation,
          minLocations: config.minLocations,
          maxLocations: config.maxLocations,
        };

      case PricingType.TIERED:
        if (!params.selectedTier) {
          throw new Error('selectedTier is required for TIERED pricing');
        }
        return {
          ...baseParams,
          selectedTier: params.selectedTier,
          tieredPricingTable: config.tieredPricing,
        };

      case PricingType.PREMIUM_MULTIPLIER:
        if (!params.basePrice) {
          throw new Error('basePrice is required for PREMIUM_MULTIPLIER');
        }
        return {
          ...baseParams,
          basePrice: params.basePrice,
          multiplier: config.premiumMultiplier,
        };

      case PricingType.RECURRING_DISCOUNT:
        if (!params.basePrice || !params.occurrenceCount) {
          throw new Error(
            'basePrice and occurrenceCount are required for RECURRING_DISCOUNT',
          );
        }
        return {
          ...baseParams,
          basePrice: params.basePrice,
          occurrenceCount: params.occurrenceCount,
          discountPercentage: config.recurringOptions?.discountPercentage || 0,
        };

      default:
        throw new Error(`Unsupported pricing type: ${config.pricingType}`);
    }
  }

  /**
   * Add type-specific fields to result
   */
  private addTypeSpecificFields(
    result: IPriceCalculationResult,
    config: IRequestTypeConfig,
    params: Record<string, any>,
  ): void {
    switch (config.pricingType) {
      case PricingType.FIXED:
        result.basePrice = config.basePrice;
        break;

      case PricingType.RADIUS_BASED:
        result.radiusMultiplier = params.radiusKm;
        break;

      case PricingType.PER_LOCATION:
        result.locationCount = params.locationCount;
        break;

      case PricingType.TIERED:
        result.tier = params.selectedTier;
        break;

      case PricingType.PREMIUM_MULTIPLIER:
        result.basePrice = params.basePrice;
        result.premiumMultiplier = config.premiumMultiplier;
        break;
    }
  }
}
