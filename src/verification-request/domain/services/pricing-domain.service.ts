/**
 * Pricing Domain Service
 * 
 * Core pricing business logic (Domain Layer).
 * Pure domain service with no infrastructure dependencies.
 * Stateless service that performs pricing calculations based on domain rules.
 * 
 * Follows Single Responsibility Principle - only handles pricing calculation logic.
 * 
 * @module PricingDomainService
 */

import { Injectable, Logger } from '@nestjs/common';
import { VerificationTypeEnum, VerificationUrgency } from '../value-objects/verification-type.value-object';
import { TimeSlot, DifficultyLevel, VerificationMode } from '../enums/pricing.enum';
import {
  IPricingConfig,
  IPricingRequest,
  IDiscount,
  IPriceBreakdown,
  IPricingFactors,
  IPricingSuggestion,
} from '../interfaces/pricing.interface';
import { PricingFactors } from '../value-objects/pricing-factors.value-object';
import { PriceBreakdown } from '../value-objects/price-breakdown.value-object';

/**
 * Pricing Domain Service
 * 
 * Contains pure business logic for pricing calculations.
 * No side effects, no external dependencies - only domain logic.
 * 
 * @class PricingDomainService
 */
@Injectable()
export class PricingDomainService {
  private readonly logger = new Logger(PricingDomainService.name);

  /**
   * Calculate price based on all factors
   * 
   * Main pricing calculation method that applies all multipliers and discounts.
   * 
   * @param {IPricingRequest} request - Pricing request
   * @param {IPricingConfig} config - Pricing configuration
   * @param {number} distance - Distance in kilometers
   * @param {number} surgeMultiplier - Current surge multiplier
   * @param {IDiscount[]} discounts - Applied discounts
   * @returns {IPriceBreakdown} Complete price breakdown
   */
  public calculatePrice(
    request: IPricingRequest,
    config: IPricingConfig,
    distance: number,
    surgeMultiplier: number,
    discounts: IDiscount[],
  ): IPriceBreakdown {
    this.logger.log('Calculating price with domain service');

    // Create pricing factors
    const factors = this.createPricingFactors(request, config, distance, surgeMultiplier);

    // Calculate base amount
    const baseAmount = factors.basePrice;

    // Calculate distance charge
    const distanceAmount = this.calculateDistanceCharge(distance, config);

    // Calculate time-based adjustment
    const timeMultiplier = config.timeMultipliers[factors.timeSlot];
    const timeAdjustment = this.calculateAdjustment(baseAmount, timeMultiplier);

    // Calculate type-based adjustment
    const typeMultiplier = this.getTypeMultiplier(request.verificationType, config);
    const typeAdjustment = this.calculateAdjustment(baseAmount, typeMultiplier);

    // Calculate difficulty adjustment
    const difficultyMultiplier = config.difficultyMultipliers[factors.difficulty];
    const difficultyAdjustment = this.calculateAdjustment(baseAmount, difficultyMultiplier);

    // Calculate mode adjustment
    const modeMultiplier = config.modeMultipliers[factors.mode];
    const modeAdjustment = this.calculateAdjustment(baseAmount, modeMultiplier);

    // Calculate urgency adjustment
    const urgencyMultiplier = this.getUrgencyMultiplier(request.urgency);
    const urgencyAdjustment = this.calculateAdjustment(baseAmount, urgencyMultiplier);

    // Calculate subtotal before surge and discounts
    const subtotalBeforeSurge =
      baseAmount +
      distanceAmount +
      timeAdjustment +
      typeAdjustment +
      difficultyAdjustment +
      modeAdjustment +
      urgencyAdjustment;

    // Calculate surge amount
    const surgeAmount =
      config.surgePricingEnabled && surgeMultiplier > 1.0
        ? this.calculateAdjustment(subtotalBeforeSurge, surgeMultiplier)
        : 0;

    // Calculate subtotal after surge
    const subtotal = subtotalBeforeSurge + surgeAmount;

    // Calculate discount amount
    const discountAmount = this.calculateDiscountAmount(subtotal, discounts);

    // Calculate final total
    const total = Math.max(0, subtotal - discountAmount);

    // Create and return price breakdown
    return new PriceBreakdown({
      subtotal,
      baseAmount,
      distanceAmount,
      timeAdjustment,
      typeAdjustment,
      difficultyAdjustment,
      modeAdjustment,
      urgencyAdjustment,
      surgeAmount,
      discountAmount,
      total,
      currency: config.currency,
      factors,
      appliedDiscounts: discounts.length > 0 ? discounts : undefined,
    });
  }

  /**
   * Generate pricing suggestions for cost optimization
   * 
   * Analyzes different time slots to find potential savings.
   * 
   * @param {IPricingRequest} request - Pricing request
   * @param {IPricingConfig} config - Pricing configuration
   * @param {number} distance - Distance in kilometers
   * @returns {IPricingSuggestion[]} Array of pricing suggestions
   */
  public generatePricingSuggestions(
    request: IPricingRequest,
    config: IPricingConfig,
    distance: number,
  ): IPricingSuggestion[] {
    const suggestions: IPricingSuggestion[] = [];
    const baseDate = request.scheduledDate || new Date();

    // Calculate current price (no surge for comparison)
    const currentPrice = this.calculatePrice(request, config, distance, 1.0, []);

    // Try different time slots
    const timeSlots: TimeSlot[] = [TimeSlot.ECONOMY, TimeSlot.STANDARD, TimeSlot.RUSH_HOUR];

    for (const timeSlot of timeSlots) {
      // Create alternate request with different time slot
      const suggestedTime = this.getSuggestedTimeForSlot(baseDate, timeSlot);

      // Create factors with this time slot
      const factors = new PricingFactors({
        basePrice: config.baseFee,
        distance,
        timeSlot,
        difficulty: this.determineDifficulty(request.verificationType),
        verificationType: request.verificationType,
        urgency: request.urgency,
        mode: request.mode,
        surgeMultiplier: 1.0,
      });

      // Calculate price for this time slot
      const alternatePrice = this.calculatePriceWithFactors(factors, config, distance);

      const savings = currentPrice.total - alternatePrice;

      if (savings > 0) {
        suggestions.push({
          timeSlot,
          suggestedTime,
          estimatedPrice: alternatePrice,
          savings,
          savingsPercentage: (savings / currentPrice.total) * 100,
        });
      }
    }

    return suggestions.sort((a, b) => b.savings - a.savings);
  }

  /**
   * Create pricing factors from request and configuration
   * 
   * @private
   * @param {IPricingRequest} request - Pricing request
   * @param {IPricingConfig} config - Pricing configuration
   * @param {number} distance - Distance in kilometers
   * @param {number} surgeMultiplier - Surge multiplier
   * @returns {PricingFactors} Pricing factors
   */
  private createPricingFactors(
    request: IPricingRequest,
    config: IPricingConfig,
    distance: number,
    surgeMultiplier: number,
  ): PricingFactors {
    const scheduledDate = request.scheduledDate || new Date();

    return new PricingFactors({
      basePrice: config.baseFee,
      distance,
      timeSlot: this.determineTimeSlot(scheduledDate),
      difficulty: this.determineDifficulty(request.verificationType),
      verificationType: request.verificationType,
      urgency: request.urgency,
      mode: request.mode,
      surgeMultiplier,
    });
  }

  /**
   * Calculate distance-based charge
   * 
   * @private
   * @param {number} distance - Distance in kilometers
   * @param {IPricingConfig} config - Pricing configuration
   * @returns {number} Distance charge amount
   */
  private calculateDistanceCharge(distance: number, config: IPricingConfig): number {
    return Math.round(distance * config.distanceRatePerKm * 100) / 100;
  }

  /**
   * Calculate adjustment amount from multiplier
   * 
   * @private
   * @param {number} baseAmount - Base amount to adjust
   * @param {number} multiplier - Multiplier to apply
   * @returns {number} Adjustment amount
   */
  private calculateAdjustment(baseAmount: number, multiplier: number): number {
    return Math.round(baseAmount * (multiplier - 1.0) * 100) / 100;
  }

  /**
   * Calculate total discount amount
   * 
   * @private
   * @param {number} subtotal - Subtotal amount
   * @param {IDiscount[]} discounts - Discounts to apply
   * @returns {number} Total discount amount
   */
  private calculateDiscountAmount(subtotal: number, discounts: IDiscount[]): number {
    if (!discounts || discounts.length === 0) {
      return 0;
    }

    let totalDiscount = 0;

    for (const discount of discounts) {
      if (discount.type === 'percentage') {
        totalDiscount += (subtotal * discount.value) / 100;
      } else {
        totalDiscount += discount.value;
      }
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(totalDiscount, subtotal);
  }

  /**
   * Determine time slot based on scheduled date
   * 
   * @private
   * @param {Date} scheduledDate - Scheduled date/time
   * @returns {TimeSlot} Time slot category
   */
  private determineTimeSlot(scheduledDate: Date): TimeSlot {
    const hour = scheduledDate.getHours();

    // Rush hour: 8-10am, 5-7pm
    if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 19)) {
      return TimeSlot.RUSH_HOUR;
    }

    // Standard: business hours
    if (hour >= 10 && hour < 17) {
      return TimeSlot.STANDARD;
    }

    // Economy: off-peak hours
    return TimeSlot.ECONOMY;
  }

  /**
   * Determine difficulty level based on verification type
   * 
   * @private
   * @param {VerificationTypeEnum} type - Verification type
   * @returns {DifficultyLevel} Difficulty level
   */
  private determineDifficulty(type: VerificationTypeEnum): DifficultyLevel {
    switch (type) {
      case VerificationTypeEnum.DOCUMENT_VERIFICATION:
      case VerificationTypeEnum.IDENTITY_VERIFICATION:
      case VerificationTypeEnum.LOCATION_VERIFICATION:
        return DifficultyLevel.EASY;

      case VerificationTypeEnum.BUSINESS_VERIFICATION:
      case VerificationTypeEnum.ASSET_VERIFICATION:
        return DifficultyLevel.MEDIUM;

      case VerificationTypeEnum.PROPERTY_INSPECTION:
      case VerificationTypeEnum.CUSTOM_VERIFICATION:
        return DifficultyLevel.HARD;

      default:
        return DifficultyLevel.MEDIUM;
    }
  }

  /**
   * Get type multiplier from configuration
   * 
   * @private
   * @param {VerificationTypeEnum} type - Verification type
   * @param {IPricingConfig} config - Pricing configuration
   * @returns {number} Type multiplier
   */
  private getTypeMultiplier(type: VerificationTypeEnum, config: IPricingConfig): number {
    const typeKey = type.toLowerCase();
    return config.typeMultipliers[typeKey] || 1.0;
  }

  /**
   * Get urgency multiplier
   * 
   * @private
   * @param {VerificationUrgency} urgency - Urgency level
   * @returns {number} Urgency multiplier
   */
  private getUrgencyMultiplier(urgency: VerificationUrgency): number {
    switch (urgency) {
      case VerificationUrgency.IMMEDIATE:
        return 2.0; // 100% increase
      case VerificationUrgency.EXPRESS:
        return 1.5; // 50% increase
      case VerificationUrgency.URGENT:
        return 1.25; // 25% increase
      case VerificationUrgency.STANDARD:
        return 1.0; // No change
      default:
        return 1.0;
    }
  }

  /**
   * Get suggested time for a time slot
   * 
   * @private
   * @param {Date} baseDate - Base date
   * @param {TimeSlot} timeSlot - Target time slot
   * @returns {Date} Suggested date/time
   */
  private getSuggestedTimeForSlot(baseDate: Date, timeSlot: TimeSlot): Date {
    const suggestedDate = new Date(baseDate);

    switch (timeSlot) {
      case TimeSlot.RUSH_HOUR:
        suggestedDate.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      case TimeSlot.STANDARD:
        suggestedDate.setHours(14, 0, 0, 0); // 2:00 PM
        break;
      case TimeSlot.ECONOMY:
        suggestedDate.setHours(20, 0, 0, 0); // 8:00 PM
        break;
    }

    return suggestedDate;
  }

  /**
   * Calculate price with given factors
   * 
   * @private
   * @param {IPricingFactors} factors - Pricing factors
   * @param {IPricingConfig} config - Pricing configuration
   * @param {number} distance - Distance in kilometers
   * @returns {number} Calculated price
   */
  private calculatePriceWithFactors(
    factors: IPricingFactors,
    config: IPricingConfig,
    distance: number,
  ): number {
    const baseAmount = factors.basePrice;
    const distanceAmount = this.calculateDistanceCharge(distance, config);

    const timeMultiplier = config.timeMultipliers[factors.timeSlot];
    const difficultyMultiplier = config.difficultyMultipliers[factors.difficulty];
    const modeMultiplier = config.modeMultipliers[factors.mode];
    const urgencyMultiplier = this.getUrgencyMultiplier(factors.urgency);
    const typeMultiplier = this.getTypeMultiplier(factors.verificationType, config);

    const timeAdjustment = this.calculateAdjustment(baseAmount, timeMultiplier);
    const difficultyAdjustment = this.calculateAdjustment(baseAmount, difficultyMultiplier);
    const modeAdjustment = this.calculateAdjustment(baseAmount, modeMultiplier);
    const urgencyAdjustment = this.calculateAdjustment(baseAmount, urgencyMultiplier);
    const typeAdjustment = this.calculateAdjustment(baseAmount, typeMultiplier);

    return (
      baseAmount +
      distanceAmount +
      timeAdjustment +
      difficultyAdjustment +
      modeAdjustment +
      urgencyAdjustment +
      typeAdjustment
    );
  }
}
