import { Injectable } from '@nestjs/common';
import {
  IPricingCalculator,
  ITieredPricingParams,
} from '../../../domain/interfaces';
import { PricingType } from '../../../domain/enums';
import { TieredPricingVO } from '../../../domain/value-objects';

/**
 * Tiered Price Calculator (Strategy Pattern)
 * SOLID: Single Responsibility - Only calculates tiered prices
 */
@Injectable()
export class TieredCalculator implements IPricingCalculator {
  readonly pricingType = PricingType.TIERED;

  /**
   * Calculate price based on selected tier
   * @param params - Must contain selectedTier and tieredPricingTable
   * @returns Price in kobo
   */
  calculatePrice(params: ITieredPricingParams): number {
    this.validateParams(params);

    const tieredPricing = new TieredPricingVO(params.tieredPricingTable);
    return tieredPricing.getPriceForTier(params.selectedTier);
  }

  /**
   * Validate required parameters
   */
  validateParams(params: ITieredPricingParams): void {
    if (!params.selectedTier || params.selectedTier.trim().length === 0) {
      throw new Error('selectedTier is required');
    }

    if (!params.tieredPricingTable || params.tieredPricingTable.length === 0) {
      throw new Error('tieredPricingTable is required and cannot be empty');
    }

    // Validate tier exists
    const tieredPricing = new TieredPricingVO(params.tieredPricingTable);
    if (!tieredPricing.hasTier(params.selectedTier)) {
      throw new Error(
        `Invalid tier: ${params.selectedTier}. ` +
        `Available tiers: ${tieredPricing.getAvailableTiers().join(', ')}`,
      );
    }
  }

  /**
   * Get price breakdown explanation
   */
  getPriceBreakdown(params: ITieredPricingParams): string {
    const tieredPricing = new TieredPricingVO(params.tieredPricingTable);
    return tieredPricing.getBreakdown(params.selectedTier);
  }
}
