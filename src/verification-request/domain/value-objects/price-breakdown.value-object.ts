/**
 * Price Breakdown Value Object
 * 
 * Immutable value object representing complete price calculation breakdown.
 * Provides transparency into how the final price was calculated.
 * 
 * @module PriceBreakdown
 */

import { IPriceBreakdown, IPricingFactors, IDiscount } from '../interfaces/pricing.interface';

/**
 * Price Breakdown Value Object
 * 
 * Encapsulates all pricing components and provides helper methods.
 * Immutable - once created, values cannot be changed.
 * 
 * @class PriceBreakdown
 * @implements {IPriceBreakdown}
 */
export class PriceBreakdown implements IPriceBreakdown {
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

  /**
   * Create price breakdown
   * 
   * @param {Partial<IPriceBreakdown>} breakdown - Breakdown values
   * @throws {Error} If validation fails
   */
  constructor(breakdown: Partial<IPriceBreakdown>) {
    // Validate required fields
    if (!breakdown.factors) {
      throw new Error('Pricing factors are required');
    }

    if (breakdown.subtotal === undefined || breakdown.subtotal < 0) {
      throw new Error('Subtotal must be a non-negative number');
    }

    if (breakdown.total === undefined || breakdown.total < 0) {
      throw new Error('Total must be a non-negative number');
    }

    if (!breakdown.currency) {
      throw new Error('Currency is required');
    }

    // Assign values
    this.subtotal = breakdown.subtotal;
    this.baseAmount = breakdown.baseAmount || 0;
    this.distanceAmount = breakdown.distanceAmount || 0;
    this.timeAdjustment = breakdown.timeAdjustment || 0;
    this.typeAdjustment = breakdown.typeAdjustment || 0;
    this.difficultyAdjustment = breakdown.difficultyAdjustment || 0;
    this.modeAdjustment = breakdown.modeAdjustment || 0;
    this.urgencyAdjustment = breakdown.urgencyAdjustment || 0;
    this.surgeAmount = breakdown.surgeAmount || 0;
    this.discountAmount = breakdown.discountAmount || 0;
    this.total = breakdown.total;
    this.currency = breakdown.currency;
    this.factors = breakdown.factors;
    this.appliedDiscounts = breakdown.appliedDiscounts;

    // Freeze object to ensure immutability
    Object.freeze(this);
  }

  /**
   * Get formatted total price
   * 
   * @returns {string} Formatted price string
   */
  public getFormattedTotal(): string {
    return `${this.currency} ${this.total.toFixed(2)}`;
  }

  /**
   * Get formatted subtotal
   * 
   * @returns {string} Formatted subtotal string
   */
  public getFormattedSubtotal(): string {
    return `${this.currency} ${this.subtotal.toFixed(2)}`;
  }

  /**
   * Get total savings from discounts
   * 
   * @returns {number} Total discount amount
   */
  public getTotalSavings(): number {
    return this.discountAmount;
  }

  /**
   * Get savings percentage
   * 
   * @returns {number} Savings percentage (0-100)
   */
  public getSavingsPercentage(): number {
    if (this.subtotal === 0) {
      return 0;
    }

    return (this.discountAmount / this.subtotal) * 100;
  }

  /**
   * Check if surge pricing was applied
   * 
   * @returns {boolean} True if surge pricing is active
   */
  public hasSurgePricing(): boolean {
    return this.factors.surgeMultiplier > 1.0;
  }

  /**
   * Check if discounts were applied
   * 
   * @returns {boolean} True if discounts were applied
   */
  public hasDiscounts(): boolean {
    return this.discountAmount > 0;
  }

  /**
   * Get breakdown summary for display
   * 
   * @returns {object} Summary object
   */
  public getSummary(): {
    basePrice: string;
    distance: string;
    adjustments: string;
    surge: string;
    discount: string;
    total: string;
  } {
    return {
      basePrice: `${this.currency} ${this.baseAmount.toFixed(2)}`,
      distance: `${this.currency} ${this.distanceAmount.toFixed(2)}`,
      adjustments: `${this.currency} ${(
        this.timeAdjustment +
        this.typeAdjustment +
        this.difficultyAdjustment +
        this.modeAdjustment +
        this.urgencyAdjustment
      ).toFixed(2)}`,
      surge: `${this.currency} ${this.surgeAmount.toFixed(2)}`,
      discount: this.hasDiscounts()
        ? `-${this.currency} ${this.discountAmount.toFixed(2)}`
        : `${this.currency} 0.00`,
      total: this.getFormattedTotal(),
    };
  }

  /**
   * Check equality with another PriceBreakdown instance
   * 
   * @param {PriceBreakdown} other - Other instance to compare
   * @returns {boolean} True if equal
   */
  public equals(other: PriceBreakdown): boolean {
    return (
      this.subtotal === other.subtotal &&
      this.total === other.total &&
      this.currency === other.currency &&
      this.discountAmount === other.discountAmount
    );
  }

  /**
   * Get string representation
   * 
   * @returns {string} String representation
   */
  public toString(): string {
    return `PriceBreakdown(subtotal=${this.getFormattedSubtotal()}, discount=-${this.currency} ${this.discountAmount.toFixed(2)}, total=${this.getFormattedTotal()})`;
  }
}
