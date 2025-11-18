import { Injectable } from '@nestjs/common';
import {
  IPricingCalculator,
  IPremiumMultiplierParams,
} from '../../../domain/interfaces';
import { PricingType } from '../../../domain/enums';

/**
 * Premium Multiplier Calculator (Strategy Pattern)
 * SOLID: Single Responsibility - Only calculates premium multiplied prices
 * Used for Urgent/Priority requests
 */
@Injectable()
export class PremiumMultiplierCalculator implements IPricingCalculator {
  readonly pricingType = PricingType.PREMIUM_MULTIPLIER;

  /**
   * Calculate price with premium multiplier
   * @param params - Must contain basePrice and multiplier
   * @returns Price in kobo
   */
  calculatePrice(params: IPremiumMultiplierParams): number {
    this.validateParams(params);
    return Math.round(params.basePrice * params.multiplier);
  }

  /**
   * Validate required parameters
   */
  validateParams(params: IPremiumMultiplierParams): void {
    if (!params.basePrice || params.basePrice < 0) {
      throw new Error('Invalid basePrice: must be a positive number');
    }

    if (!params.multiplier || params.multiplier <= 0) {
      throw new Error('Invalid multiplier: must be greater than 0');
    }

    if (params.multiplier < 1) {
      throw new Error('multiplier must be at least 1.0 (100%)');
    }
  }

  /**
   * Get price breakdown explanation
   */
  getPriceBreakdown(params: IPremiumMultiplierParams): string {
    const basePriceInNaira = (params.basePrice / 100).toFixed(2);
    const totalInNaira = ((params.basePrice * params.multiplier) / 100).toFixed(2);
    const premiumPercentage = ((params.multiplier - 1) * 100).toFixed(0);
    
    return `Base: ₦${basePriceInNaira} × ${params.multiplier} (${premiumPercentage}% premium) = ₦${totalInNaira}`;
  }
}
