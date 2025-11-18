import { Injectable } from '@nestjs/common';
import {
  IPricingCalculator,
  IRecurringDiscountParams,
} from '../../../domain/interfaces';
import { PricingType } from '../../../domain/enums';

/**
 * Recurring Discount Calculator (Strategy Pattern)
 * SOLID: Single Responsibility - Only calculates recurring discounted prices
 */
@Injectable()
export class RecurringDiscountCalculator implements IPricingCalculator {
  readonly pricingType = PricingType.RECURRING_DISCOUNT;

  /**
   * Calculate total price with bulk discount for recurring requests
   * @param params - Must contain basePrice, occurrenceCount, discountPercentage
   * @returns Total price for all occurrences in kobo
   */
  calculatePrice(params: IRecurringDiscountParams): number {
    this.validateParams(params);

    const subtotal = params.basePrice * params.occurrenceCount;
    const discount = (subtotal * params.discountPercentage) / 100;
    const total = subtotal - discount;

    return Math.round(total);
  }

  /**
   * Calculate price per occurrence (after discount applied)
   */
  calculatePricePerOccurrence(params: IRecurringDiscountParams): number {
    const total = this.calculatePrice(params);
    return Math.round(total / params.occurrenceCount);
  }

  /**
   * Calculate total discount amount
   */
  calculateDiscountAmount(params: IRecurringDiscountParams): number {
    const subtotal = params.basePrice * params.occurrenceCount;
    return Math.round((subtotal * params.discountPercentage) / 100);
  }

  /**
   * Validate required parameters
   */
  validateParams(params: IRecurringDiscountParams): void {
    if (!params.basePrice || params.basePrice < 0) {
      throw new Error('Invalid basePrice: must be a positive number');
    }

    if (!params.occurrenceCount || params.occurrenceCount < 1) {
      throw new Error('Invalid occurrenceCount: must be at least 1');
    }

    if (params.discountPercentage < 0 || params.discountPercentage > 100) {
      throw new Error('Invalid discountPercentage: must be between 0 and 100');
    }

    // Minimum occurrences for discount (business rule)
    if (params.discountPercentage > 0 && params.occurrenceCount < 4) {
      throw new Error('Recurring discount requires at least 4 occurrences');
    }
  }

  /**
   * Get price breakdown explanation
   */
  getPriceBreakdown(params: IRecurringDiscountParams): string {
    const basePriceInNaira = (params.basePrice / 100).toFixed(2);
    const subtotal = params.basePrice * params.occurrenceCount;
    const subtotalInNaira = (subtotal / 100).toFixed(2);
    const discount = this.calculateDiscountAmount(params);
    const discountInNaira = (discount / 100).toFixed(2);
    const total = this.calculatePrice(params);
    const totalInNaira = (total / 100).toFixed(2);
    const pricePerOccurrence = this.calculatePricePerOccurrence(params);
    const pricePerOccurrenceInNaira = (pricePerOccurrence / 100).toFixed(2);

    return (
      `${params.occurrenceCount} occurrences × ₦${basePriceInNaira} = ₦${subtotalInNaira}\n` +
      `Discount (${params.discountPercentage}%): -₦${discountInNaira}\n` +
      `Total: ₦${totalInNaira} (₦${pricePerOccurrenceInNaira} per occurrence)`
    );
  }
}
