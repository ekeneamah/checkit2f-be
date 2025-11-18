import { IRadiusPricingTier } from '../interfaces';

/**
 * Radius Pricing Value Object (Immutable)
 * Domain-Driven Design: Value Object pattern
 */
export class RadiusPricingVO {
  private readonly _tiers: ReadonlyArray<IRadiusPricingTier>;

  constructor(tiers: IRadiusPricingTier[]) {
    this.validate(tiers);
    // Sort by radius ascending and freeze
    this._tiers = Object.freeze([...tiers].sort((a, b) => a.radiusKm - b.radiusKm));
  }

  get tiers(): ReadonlyArray<IRadiusPricingTier> {
    return this._tiers;
  }

  /**
   * Find price for a given radius
   * Uses exact match or next higher tier
   */
  getPriceForRadius(radiusKm: number): number {
    if (radiusKm <= 0) {
      throw new Error('Radius must be greater than 0');
    }

    // Find exact match first
    const exactMatch = this._tiers.find((tier) => tier.radiusKm === radiusKm);
    if (exactMatch) {
      return exactMatch.price;
    }

    // Find next higher tier
    const nextTier = this._tiers.find((tier) => tier.radiusKm >= radiusKm);
    if (nextTier) {
      return nextTier.price;
    }

    // If radius exceeds all tiers, return highest tier price
    return this._tiers[this._tiers.length - 1].price;
  }

  /**
   * Get minimum supported radius
   */
  getMinRadius(): number {
    return this._tiers[0].radiusKm;
  }

  /**
   * Get maximum supported radius
   */
  getMaxRadius(): number {
    return this._tiers[this._tiers.length - 1].radiusKm;
  }

  /**
   * Check if radius is within supported range
   */
  isRadiusSupported(radiusKm: number): boolean {
    return radiusKm >= this.getMinRadius() && radiusKm <= this.getMaxRadius();
  }

  /**
   * Get human-readable breakdown
   */
  getBreakdown(radiusKm: number): string {
    const price = this.getPriceForRadius(radiusKm);
    const priceInNaira = (price / 100).toFixed(2);
    return `${radiusKm}km radius: ₦${priceInNaira}`;
  }

  /**
   * Validate tiers structure
   */
  private validate(tiers: IRadiusPricingTier[]): void {
    if (!tiers || tiers.length === 0) {
      throw new Error('Radius pricing tiers cannot be empty');
    }

    tiers.forEach((tier, index) => {
      if (tier.radiusKm <= 0) {
        throw new Error(`Invalid radius at index ${index}: must be > 0`);
      }
      if (tier.price < 0) {
        throw new Error(`Invalid price at index ${index}: cannot be negative`);
      }
    });

    // Check for duplicate radii
    const radii = tiers.map((t) => t.radiusKm);
    const uniqueRadii = new Set(radii);
    if (radii.length !== uniqueRadii.size) {
      throw new Error('Duplicate radius values found in pricing tiers');
    }
  }

  /**
   * Create from plain object (for Firestore deserialization)
   */
  static fromPlainObject(tiers: IRadiusPricingTier[]): RadiusPricingVO {
    return new RadiusPricingVO(tiers);
  }

  /**
   * Convert to plain object (for Firestore serialization)
   */
  toPlainObject(): IRadiusPricingTier[] {
    return Array.from(this._tiers);
  }
}
