import { Injectable } from '@nestjs/common';
import {
  IPricingCalculator,
  IFixedPricingParams,
} from '../../../domain/interfaces';
import { PricingType } from '../../../domain/enums';

/**
 * Fixed Price Calculator (Strategy Pattern)
 * SOLID: Single Responsibility - Only calculates fixed prices
 */
@Injectable()
export class FixedPriceCalculator implements IPricingCalculator {
  readonly pricingType = PricingType.FIXED;

  /**
   * Calculate fixed price
   * @param params - Must contain basePrice
   * @returns Price in kobo
   */
  calculatePrice(params: IFixedPricingParams): number {
    this.validateParams(params);
    return params.basePrice;
  }

  /**
   * Validate required parameters
   */
  validateParams(params: IFixedPricingParams): void {
    if (params.basePrice === undefined || params.basePrice === null) {
      throw new Error('basePrice is required for FIXED pricing');
    }
    
    if (typeof params.basePrice !== 'number' || params.basePrice < 0) {
      throw new Error('basePrice must be a positive number');
    }
    
    if (params.basePrice === 0) {
      throw new Error('basePrice must be greater than 0');
    }
  }

  /**
   * Get price breakdown explanation
   */
  getPriceBreakdown(params: IFixedPricingParams): string {
    const priceInNaira = (params.basePrice / 100).toFixed(2);
    return `Fixed Price: ₦${priceInNaira}`;
  }
}
