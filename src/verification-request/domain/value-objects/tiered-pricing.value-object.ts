import { ITieredPricingOption } from '../interfaces';

/**
 * Tiered Pricing Value Object (Immutable)
 * Domain-Driven Design: Value Object pattern
 */
export class TieredPricingVO {
  private readonly _options: ReadonlyArray<ITieredPricingOption>;

  constructor(options: ITieredPricingOption[]) {
    this.validate(options);
    // Sort by price ascending and freeze
    this._options = Object.freeze([...options].sort((a, b) => a.price - b.price));
  }

  get options(): ReadonlyArray<ITieredPricingOption> {
    return this._options;
  }

  /**
   * Get price for a specific tier
   */
  getPriceForTier(tier: string): number {
    const option = this._options.find((opt) => opt.tier.toUpperCase() === tier.toUpperCase());
    if (!option) {
      throw new Error(`Invalid tier: ${tier}. Available tiers: ${this.getAvailableTiers().join(', ')}`);
    }
    return option.price;
  }

  /**
   * Get all available tier names
   */
  getAvailableTiers(): string[] {
    return this._options.map((opt) => opt.tier);
  }

  /**
   * Check if a tier exists
   */
  hasTier(tier: string): boolean {
    return this._options.some((opt) => opt.tier.toUpperCase() === tier.toUpperCase());
  }

  /**
   * Get description for a tier
   */
  getTierDescription(tier: string): string {
    const option = this._options.find((opt) => opt.tier.toUpperCase() === tier.toUpperCase());
    return option?.description || '';
  }

  /**
   * Get cheapest tier
   */
  getCheapestTier(): ITieredPricingOption {
    return this._options[0]; // Already sorted by price ascending
  }

  /**
   * Get most expensive tier
   */
  getMostExpensiveTier(): ITieredPricingOption {
    return this._options[this._options.length - 1];
  }

  /**
   * Get human-readable breakdown
   */
  getBreakdown(tier: string): string {
    const option = this._options.find((opt) => opt.tier.toUpperCase() === tier.toUpperCase());
    if (!option) {
      return '';
    }
    const priceInNaira = (option.price / 100).toFixed(2);
    return `${option.tier} (${option.description}): ₦${priceInNaira}`;
  }

  /**
   * Validate options structure
   */
  private validate(options: ITieredPricingOption[]): void {
    if (!options || options.length === 0) {
      throw new Error('Tiered pricing options cannot be empty');
    }

    options.forEach((option, index) => {
      if (!option.tier || option.tier.trim().length === 0) {
        throw new Error(`Invalid tier name at index ${index}`);
      }
      if (option.price < 0) {
        throw new Error(`Invalid price at index ${index}: cannot be negative`);
      }
      if (!option.description || option.description.trim().length === 0) {
        throw new Error(`Missing description at index ${index}`);
      }
    });

    // Check for duplicate tiers
    const tierNames = options.map((o) => o.tier.toUpperCase());
    const uniqueTiers = new Set(tierNames);
    if (tierNames.length !== uniqueTiers.size) {
      throw new Error('Duplicate tier names found in pricing options');
    }
  }

  /**
   * Create from plain object (for Firestore deserialization)
   */
  static fromPlainObject(options: ITieredPricingOption[]): TieredPricingVO {
    return new TieredPricingVO(options);
  }

  /**
   * Convert to plain object (for Firestore serialization)
   */
  toPlainObject(): ITieredPricingOption[] {
    return Array.from(this._options);
  }
}
