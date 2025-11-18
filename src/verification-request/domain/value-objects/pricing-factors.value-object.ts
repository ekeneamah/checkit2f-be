/**
 * Pricing Factors Value Object
 * 
 * Immutable value object representing all factors that influence pricing.
 * Follows Value Object pattern from Domain-Driven Design.
 * 
 * @module PricingFactors
 */

import { VerificationTypeEnum, VerificationUrgency } from './verification-type.value-object';
import { TimeSlot, DifficultyLevel, VerificationMode } from '../enums/pricing.enum';
import { IPricingFactors } from '../interfaces/pricing.interface';

/**
 * Pricing Factors Value Object
 * 
 * Encapsulates all variables that affect price calculation.
 * Immutable - once created, values cannot be changed.
 * 
 * @class PricingFactors
 * @implements {IPricingFactors}
 */
export class PricingFactors implements IPricingFactors {
  readonly basePrice: number;
  readonly distance: number;
  readonly timeSlot: TimeSlot;
  readonly difficulty: DifficultyLevel;
  readonly verificationType: VerificationTypeEnum;
  readonly urgency: VerificationUrgency;
  readonly mode: VerificationMode;
  readonly surgeMultiplier: number;

  /**
   * Create pricing factors
   * 
   * @param {Partial<IPricingFactors>} factors - Factor values
   * @throws {Error} If validation fails
   */
  constructor(factors: Partial<IPricingFactors>) {
    // Validate required fields
    if (factors.basePrice === undefined || factors.basePrice < 0) {
      throw new Error('Base price must be a non-negative number');
    }

    if (factors.distance === undefined || factors.distance < 0) {
      throw new Error('Distance must be a non-negative number');
    }

    if (!factors.timeSlot) {
      throw new Error('Time slot is required');
    }

    if (!factors.difficulty) {
      throw new Error('Difficulty level is required');
    }

    if (!factors.verificationType) {
      throw new Error('Verification type is required');
    }

    if (!factors.urgency) {
      throw new Error('Urgency is required');
    }

    if (!factors.mode) {
      throw new Error('Verification mode is required');
    }

    if (factors.surgeMultiplier === undefined || factors.surgeMultiplier < 1.0) {
      throw new Error('Surge multiplier must be at least 1.0');
    }

    // Assign values (making them immutable through readonly)
    this.basePrice = factors.basePrice;
    this.distance = factors.distance;
    this.timeSlot = factors.timeSlot;
    this.difficulty = factors.difficulty;
    this.verificationType = factors.verificationType;
    this.urgency = factors.urgency;
    this.mode = factors.mode;
    this.surgeMultiplier = factors.surgeMultiplier;

    // Freeze object to ensure immutability
    Object.freeze(this);
  }

  /**
   * Create a copy with updated values
   * 
   * @param {Partial<IPricingFactors>} updates - Values to update
   * @returns {PricingFactors} New instance with updated values
   */
  public with(updates: Partial<IPricingFactors>): PricingFactors {
    return new PricingFactors({
      ...this,
      ...updates,
    });
  }

  /**
   * Check equality with another PricingFactors instance
   * 
   * @param {PricingFactors} other - Other instance to compare
   * @returns {boolean} True if equal
   */
  public equals(other: PricingFactors): boolean {
    return (
      this.basePrice === other.basePrice &&
      this.distance === other.distance &&
      this.timeSlot === other.timeSlot &&
      this.difficulty === other.difficulty &&
      this.verificationType === other.verificationType &&
      this.urgency === other.urgency &&
      this.mode === other.mode &&
      this.surgeMultiplier === other.surgeMultiplier
    );
  }

  /**
   * Get string representation
   * 
   * @returns {string} String representation
   */
  public toString(): string {
    return `PricingFactors(base=${this.basePrice}, distance=${this.distance}km, timeSlot=${this.timeSlot}, difficulty=${this.difficulty}, type=${this.verificationType}, urgency=${this.urgency}, mode=${this.mode}, surge=${this.surgeMultiplier}x)`;
  }
}
