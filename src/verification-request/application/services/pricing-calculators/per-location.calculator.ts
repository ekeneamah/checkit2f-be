import { Injectable } from '@nestjs/common';
import {
  IPricingCalculator,
  IPerLocationPricingParams,
} from '../../../domain/interfaces';
import { PricingType } from '../../../domain/enums';

/**
 * Per-Location Price Calculator (Strategy Pattern)
 * SOLID: Single Responsibility - Only calculates per-location prices
 */
@Injectable()
export class PerLocationCalculator implements IPricingCalculator {
  readonly pricingType = PricingType.PER_LOCATION;

  /**
   * Calculate price based on number of locations
   * @param params - Must contain locationCount, pricePerLocation, minLocations, maxLocations
   * @returns Price in kobo
   */
  calculatePrice(params: IPerLocationPricingParams): number {
    this.validateParams(params);
    return params.locationCount * params.pricePerLocation;
  }

  /**
   * Validate required parameters
   */
  validateParams(params: IPerLocationPricingParams): void {
    if (!params.pricePerLocation || params.pricePerLocation < 0) {
      throw new Error('Invalid pricePerLocation: must be a positive number');
    }

    if (!params.locationCount || params.locationCount < 1) {
      throw new Error('Invalid locationCount: must be at least 1');
    }

    if (params.minLocations && params.locationCount < params.minLocations) {
      throw new Error(
        `locationCount (${params.locationCount}) is below minimum (${params.minLocations})`,
      );
    }

    if (params.maxLocations && params.locationCount > params.maxLocations) {
      throw new Error(
        `locationCount (${params.locationCount}) exceeds maximum (${params.maxLocations})`,
      );
    }
  }

  /**
   * Get price breakdown explanation
   */
  getPriceBreakdown(params: IPerLocationPricingParams): string {
    const pricePerLocationInNaira = (params.pricePerLocation / 100).toFixed(2);
    const totalInNaira = ((params.locationCount * params.pricePerLocation) / 100).toFixed(2);
    
    return `${params.locationCount} location(s) × ₦${pricePerLocationInNaira} = ₦${totalInNaira}`;
  }
}
