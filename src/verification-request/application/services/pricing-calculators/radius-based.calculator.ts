import { Injectable } from '@nestjs/common';
import {
  IPricingCalculator,
  IRadiusPricingParams,
} from '../../../domain/interfaces';
import { PricingType } from '../../../domain/enums';
import { RadiusPricingVO } from '../../../domain/value-objects';

/**
 * Radius-Based Price Calculator (Strategy Pattern)
 * SOLID: Single Responsibility - Only calculates radius-based prices
 */
@Injectable()
export class RadiusBasedCalculator implements IPricingCalculator {
  readonly pricingType = PricingType.RADIUS_BASED;

  /**
   * Calculate price based on search radius
   * @param params - Must contain radiusKm and radiusPricingTable
   * @returns Price in kobo
   */
  calculatePrice(params: IRadiusPricingParams): number {
    this.validateParams(params);

    const radiusPricing = new RadiusPricingVO(params.radiusPricingTable);
    return radiusPricing.getPriceForRadius(params.radiusKm);
  }

  /**
   * Validate required parameters
   */
  validateParams(params: IRadiusPricingParams): void {
    if (!params.radiusKm || params.radiusKm <= 0) {
      throw new Error('Invalid radiusKm: must be greater than 0');
    }

    if (!params.radiusPricingTable || params.radiusPricingTable.length === 0) {
      throw new Error('radiusPricingTable is required and cannot be empty');
    }

    // Validate radius is within supported range
    const radiusPricing = new RadiusPricingVO(params.radiusPricingTable);
    if (!radiusPricing.isRadiusSupported(params.radiusKm)) {
      throw new Error(
        `Radius ${params.radiusKm}km is not supported. ` +
        `Min: ${radiusPricing.getMinRadius()}km, Max: ${radiusPricing.getMaxRadius()}km`,
      );
    }
  }

  /**
   * Get price breakdown explanation
   */
  getPriceBreakdown(params: IRadiusPricingParams): string {
    const radiusPricing = new RadiusPricingVO(params.radiusPricingTable);
    return radiusPricing.getBreakdown(params.radiusKm);
  }
}
