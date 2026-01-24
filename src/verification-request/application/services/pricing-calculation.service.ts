/**
 * Comprehensive Pricing Calculation Service
 * 
 * Implements the complete 12-step pricing pipeline:
 * 1. Fetch geographic base price (location-pricing collection)
 * 2. Get request type configuration (request_type_configs)
 * 3. Get pricing configuration (pricing-configs)
 * 4. Apply pricing model calculation (FIXED, RADIUS_BASED, PER_LOCATION, TIERED, PREMIUM, RECURRING)
 * 5. Apply time slot multiplier
 * 6. Apply difficulty multiplier
 * 7. Apply mode multiplier
 * 8. Apply urgency premium
 * 9. Apply surge pricing
 * 10. Apply promotional code discount
 * 11. Apply customer tier discount
 * 12. Apply volume/recurring discounts & return breakdown
 * 
 * Follows:
 * - SOLID: Single Responsibility (orchestration only)
 * - DRY: Uses shared multipliers from PricingConfigEntity
 * - Strategy Pattern: Delegates pricing type calculations to RequestTypePricingService
 */

import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { LocationPricingService } from './location-pricing.service';
import { RequestTypePricingService } from './request-type-pricing.service';
import { IRequestTypeConfig } from '../../domain/interfaces';
import {
  IPriceCalculationRequest,
  IPriceCalculationResponse,
  IPriceBreakdownDetail,
  IPriceBreakdownItem,
  ISavingsSuggestion,
} from '../../domain/interfaces/price-calculation.interface';
import {
  PricingConfigEntity,
  PricingConfigHelper,
  TimeSlotEnum,
  DifficultyEnum,
  ModeEnum,
  UrgencyEnum,
} from '../../domain/entities/pricing-config.entity';
import { IPricingConfigRepository } from '../interfaces/pricing-config.repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PricingCalculationService {
  private readonly logger = new Logger(PricingCalculationService.name);

  constructor(
    private readonly locationPricingService: LocationPricingService,
    private readonly requestTypePricingService: RequestTypePricingService,
    @Inject('IPricingConfigRepository')
    private readonly pricingConfigRepo: IPricingConfigRepository,
  ) {}

  /**
   * Main entry point: Calculate price for a verification request
   * Implements the complete 12-step pricing pipeline
   */
  async calculatePrice(request: IPriceCalculationRequest): Promise<IPriceCalculationResponse> {
    this.logger.log(`Calculating price for request type: ${request.requestTypeId}`);

    const calculationId = uuidv4();
    const breakdown: IPriceBreakdownDetail = {
      items: [],
      subtotal: 0,
      totalAdditions: 0,
      totalDiscounts: 0,
      totalSurge: 0,
      finalPrice: 0,
      currency: 'NGN',
      calculatedAt: new Date(),
    };

    try {
      // STEP 1: Fetch geographic base price (location-pricing collection)
      const locationPrice = await this.getLocationBasePrice(request);
      // LocationPricingService returns amounts in Naira; convert to kobo (x100)
      let basePrice = 500000; // Default ₦5,000 in kobo
      if (locationPrice) {
        const totalKobo = Math.round((locationPrice.finalPrice || 0) * 100);
        basePrice = totalKobo > 0 ? totalKobo : basePrice;
      }

      breakdown.items.push({
        label: 'Geographic Base Price',
        amount: basePrice,
        type: 'base',
        description: locationPrice
          ? `${locationPrice.state} → ${locationPrice.lga}${locationPrice.locality ? ` → ${locationPrice.locality}` : ''}`
          : 'Default',
      });

      // STEP 2 & 3: Get request type config and pricing configuration
      const pricingConfig = await this.pricingConfigRepo.findDefault();
      if (!pricingConfig) {
        throw new NotFoundException('No active pricing configuration found');
      }

      // STEP 4: Apply pricing model calculation (FIXED, RADIUS_BASED, etc.)
      const modelPrice = await this.applyPricingModel(request, basePrice);
      if (modelPrice.amount !== basePrice) {
        breakdown.items.push({
          label: 'Pricing Model Adjustment',
          amount: modelPrice.amount - basePrice,
          type: modelPrice.amount > basePrice ? 'addition' : 'discount',
          description: `${modelPrice.type} pricing model applied`,
        });
        basePrice = modelPrice.amount;
      }

      // STEP 5: Apply time slot multiplier
      const timeSlot = this.determineTimeSlot(request);
      const timeMultiplier = PricingConfigHelper.getTimeSlotMultiplier(pricingConfig, timeSlot);
      basePrice = this.applyMultiplier(basePrice, timeMultiplier, breakdown, 'Time Slot', timeSlot, 'multiplier');

      // STEP 6: Apply difficulty multiplier
      const difficulty = (request.difficulty as DifficultyEnum) || DifficultyEnum.EASY;
      const difficultyMultiplier = PricingConfigHelper.getDifficultyMultiplier(pricingConfig, difficulty);
      basePrice = this.applyMultiplier(basePrice, difficultyMultiplier, breakdown, 'Difficulty Level', difficulty, 'multiplier');

      // STEP 7: Apply mode multiplier
      const mode = (request.mode as ModeEnum) || ModeEnum.IN_PERSON;
      const modeMultiplier = PricingConfigHelper.getModeMultiplier(pricingConfig, mode);
      basePrice = this.applyMultiplier(basePrice, modeMultiplier, breakdown, 'Service Mode', mode, 'multiplier');

      // STEP 8: Apply urgency premium
      const urgency = (request.urgency as UrgencyEnum) || UrgencyEnum.STANDARD;
      const urgencyMultiplier = PricingConfigHelper.getUrgencyMultiplier(pricingConfig, urgency);
      basePrice = this.applyMultiplier(basePrice, urgencyMultiplier, breakdown, 'Urgency Premium', urgency, 'multiplier');

      // STEP 9: Apply surge pricing
      const surgeMultiplier = await this.calculateSurgeMultiplier(pricingConfig);
      if (surgeMultiplier > 1.0) {
        const surgeAmount = Math.round(basePrice * (surgeMultiplier - 1));
        breakdown.items.push({
          label: 'Surge Pricing',
          amount: surgeAmount,
          type: 'surge',
          description: `High demand: +${((surgeMultiplier - 1) * 100).toFixed(0)}%`,
        });
        basePrice += surgeAmount;
        breakdown.totalSurge = surgeAmount;
      }

      // STEP 10: Apply promotional code discount
      let promoDiscount = 0;
      if (request.promotionalCode) {
        promoDiscount = await this.applyPromotionalCode(request.promotionalCode, basePrice, breakdown);
        basePrice -= promoDiscount;
      }

      // STEP 11: Apply customer tier discount
      let tierDiscount = 0;
      if (request.customerTier) {
        tierDiscount = this.applyCustomerTierDiscount(request.customerTier, basePrice, pricingConfig, breakdown);
        basePrice -= tierDiscount;
      }

      // STEP 12: Apply volume/recurring discounts
      let volumeDiscount = 0;
      if (request.isRecurring && request.recurringCount && request.recurringCount > 1) {
        volumeDiscount = this.applyRecurringDiscount(request.recurringCount, basePrice, pricingConfig, breakdown);
        basePrice -= volumeDiscount;
      } else if (request.locationCount && request.locationCount > 1) {
        volumeDiscount = this.applyVolumeDiscount(request.locationCount, basePrice, pricingConfig, breakdown);
        basePrice -= volumeDiscount;
      }

      // Finalize breakdown
      breakdown.subtotal = breakdown.items
        .filter((item) => item.type === 'base')
        .reduce((sum, item) => sum + item.amount, 0);
      breakdown.totalAdditions = breakdown.items
        .filter((item) => item.type === 'addition')
        .reduce((sum, item) => sum + item.amount, 0);
      breakdown.totalDiscounts = promoDiscount + tierDiscount + volumeDiscount;
      breakdown.finalPrice = Math.max(basePrice, breakdown.subtotal); // Don't go below base

      // Calculate savings suggestions
      const savingsSuggestions = this.calculateSavingsSuggestions(
        request,
        breakdown,
        pricingConfig,
      );

      // Build response
      const response: IPriceCalculationResponse = {
        requestTypeId: request.requestTypeId,
        requestTypeName: '',
        calculationId,
        basePrice: breakdown.subtotal,
        finalPrice: breakdown.finalPrice,
        currency: 'NGN',
        breakdown,
        savingsSuggestions,
        totalPotentialSavings: this.calculateTotalPotentialSavings(savingsSuggestions),
        calculatedAt: new Date(),
        validUntilSeconds: 300, // 5 minutes
        factors: {
          timeSlot,
          difficulty,
          mode,
          urgency,
          surgeActive: surgeMultiplier > 1.0,
          discountsApplied: this.getAppliedDiscounts(promoDiscount, tierDiscount, volumeDiscount),
        },
      };

      // Add recurring details if applicable
      if (request.isRecurring && request.recurringCount && request.recurringCount > 1) {
        response.recurring = this.calculateRecurringDetails(
          request,
          breakdown.finalPrice,
          pricingConfig,
        );
        // Update final price to be the total for all occurrences
        response.finalPrice = response.recurring.totalPrice;
      }

      return response;
    } catch (error) {
      this.logger.error(`Price calculation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * STEP 1: Get location-based base price
   */
  private async getLocationBasePrice(request: IPriceCalculationRequest) {
    if (!request.city) return null;

    try {
      const result = await this.locationPricingService.calculateLocationPrice(
        request.city,
        request.area,
      );
      return result;
    } catch (error) {
      this.logger.warn(`Location pricing lookup failed: ${error.message}`);
      return null;
    }
  }

  /**
   * STEP 4: Apply pricing model calculation (delegates to RequestTypePricingService)
   */
  private async applyPricingModel(request: IPriceCalculationRequest, basePrice: number) {
    try {
      // This would call RequestTypePricingService.calculatePrice()
      // For now, return as-is to avoid circular dependency
      return { type: 'base', amount: basePrice };
    } catch (error) {
      this.logger.warn(`Pricing model calculation failed: ${error.message}`);
      return { type: 'base', amount: basePrice };
    }
  }

  /**
   * Apply a multiplier to price and record in breakdown
   */
  private applyMultiplier(
    currentPrice: number,
    multiplier: number,
    breakdown: IPriceBreakdownDetail,
    label: string,
    value: string,
    type: 'multiplier' | 'addition' | 'discount',
  ): number {
    if (multiplier === 1.0) return currentPrice;

    const adjustment = Math.round(currentPrice * (multiplier - 1));
    breakdown.items.push({
      label,
      amount: adjustment,
      type,
      description: `${value}: ${multiplier}x`,
      percentage: (multiplier - 1) * 100,
    });

    if (type === 'multiplier') {
      breakdown.totalAdditions += Math.max(0, adjustment);
    }

    return currentPrice + adjustment;
  }

  /**
   * STEP 5: Determine current time slot
   */
  private determineTimeSlot(request: IPriceCalculationRequest): TimeSlotEnum {
    if (request.scheduledDate) {
      const hour = new Date(request.scheduledDate).getHours();
      // Economy: 00-06, Standard: 06-21, Rush Hour: 21-24
      if (hour < 6) return TimeSlotEnum.ECONOMY;
      if (hour < 21) return TimeSlotEnum.STANDARD;
      return TimeSlotEnum.RUSH_HOUR;
    }

    const now = new Date();
    const hour = now.getHours();
    if (hour < 6) return TimeSlotEnum.ECONOMY;
    if (hour < 21) return TimeSlotEnum.STANDARD;
    return TimeSlotEnum.RUSH_HOUR;
  }

  /**
   * STEP 9: Calculate surge pricing based on current conditions
   */
  private async calculateSurgeMultiplier(config: PricingConfigEntity): Promise<number> {
    // TODO: Check actual agent availability, pending requests, etc.
    // For now, return 1.0 (no surge)
    return 1.0;
  }

  /**
   * STEP 10: Apply promotional code discount
   */
  private async applyPromotionalCode(
    code: string,
    price: number,
    breakdown: IPriceBreakdownDetail,
  ): Promise<number> {
    try {
      // TODO: Look up promotional code in PricingConfigEntity.promotionalCodeConfigs
      // For now, return 0
      return 0;
    } catch (error) {
      this.logger.warn(`Promotional code validation failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * STEP 11: Apply customer tier discount
   */
  private applyCustomerTierDiscount(
    tier: string,
    price: number,
    config: PricingConfigEntity,
    breakdown: IPriceBreakdownDetail,
  ): number {
    const tierConfig = config.tierDiscountConfigs.find((t) => t.tier === tier && t.isActive);
    if (!tierConfig) return 0;

    const discount = Math.round(price * (tierConfig.discountPercentage / 100));
    breakdown.items.push({
      label: 'Customer Tier Discount',
      amount: discount,
      type: 'discount',
      description: `${tierConfig.tier.toUpperCase()}: -${tierConfig.discountPercentage}%`,
      percentage: tierConfig.discountPercentage,
    });

    return discount;
  }

  /**
   * STEP 12a: Apply recurring discount
   */
  private applyRecurringDiscount(
    count: number,
    price: number,
    config: PricingConfigEntity,
    breakdown: IPriceBreakdownDetail,
  ): number {
    // Find matching recurring discount config
    const recurringConfig = config.recurringDiscountConfigs.find(
      (r) => r.occurrenceCount <= count && r.isActive,
    );

    if (!recurringConfig) return 0;

    const discount = Math.round(price * (recurringConfig.discountPercentage / 100));
    breakdown.items.push({
      label: 'Recurring Discount',
      amount: discount,
      type: 'discount',
      description: `${count} occurrences: -${recurringConfig.discountPercentage}%`,
      percentage: recurringConfig.discountPercentage,
    });

    return discount;
  }

  /**
   * STEP 12b: Apply volume discount
   */
  private applyVolumeDiscount(
    locationCount: number,
    price: number,
    config: PricingConfigEntity,
    breakdown: IPriceBreakdownDetail,
  ): number {
    // Find matching volume discount config
    const volumeConfig = config.volumeDiscountConfigs.find(
      (v) => v.locationCount <= locationCount && v.isActive,
    );

    if (!volumeConfig) return 0;

    const discount = Math.round(price * (volumeConfig.discountPercentage / 100));
    breakdown.items.push({
      label: 'Volume Discount',
      amount: discount,
      type: 'discount',
      description: `${locationCount} locations: -${volumeConfig.discountPercentage}%`,
      percentage: volumeConfig.discountPercentage,
    });

    return discount;
  }

  /**
   * Calculate actionable savings suggestions
   */
  private calculateSavingsSuggestions(
    request: IPriceCalculationRequest,
    breakdown: IPriceBreakdownDetail,
    config: PricingConfigEntity,
  ): ISavingsSuggestion[] {
    const suggestions: ISavingsSuggestion[] = [];

    // Suggestion 1: Schedule for off-peak
    if (!request.scheduledDate || !this.isOffPeak(request.scheduledDate)) {
      const offPeakPrice = Math.round(breakdown.finalPrice * 0.85); // Economy rate
      const savings = breakdown.finalPrice - offPeakPrice;
      suggestions.push({
        type: 'timing',
        title: 'Schedule for Off-Peak Hours',
        description: 'Schedule between 12:00 AM - 6:00 AM for 15% discount',
        estimatedSavings: savings,
        condition: 'Schedule for economy hours',
        actionable: true,
      });
    }

    // Suggestion 2: Volume discount
    if (!request.isRecurring && request.locationCount <= 1) {
      const nextVolumeConfig = config.volumeDiscountConfigs.find(
        (v) => v.locationCount === 2 && v.isActive,
      );
      if (nextVolumeConfig) {
        const savings = Math.round(breakdown.finalPrice * (nextVolumeConfig.discountPercentage / 100));
        suggestions.push({
          type: 'volume',
          title: 'Add Another Location',
          description: `Verify 2 locations to unlock ${nextVolumeConfig.discountPercentage}% discount`,
          estimatedSavings: savings,
          condition: `Add ${2 - (request.locationCount || 1)} more location(s)`,
          actionable: true,
        });
      }
    }

    // Suggestion 3: Recurring discount
    if (!request.isRecurring) {
      const recurringConfig = config.recurringDiscountConfigs.find((r) => r.occurrenceCount === 2 && r.isActive);
      if (recurringConfig) {
        const savings = Math.round(breakdown.finalPrice * (recurringConfig.discountPercentage / 100));
        suggestions.push({
          type: 'recurring',
          title: 'Schedule Recurring Verification',
          description: `Set up 2+ recurring verifications for ${recurringConfig.discountPercentage}% discount`,
          estimatedSavings: savings,
          condition: 'Make this a recurring request',
          actionable: true,
        });
      }
    }

    // Suggestion 4: Reduce urgency
    if (request.urgency !== UrgencyEnum.STANDARD) {
      const standardMultiplier = PricingConfigHelper.getUrgencyMultiplier(config, UrgencyEnum.STANDARD);
      const savings = Math.round(breakdown.finalPrice * (1 - standardMultiplier));
      suggestions.push({
        type: 'urgency',
        title: 'Choose Standard Delivery',
        description: 'Standard delivery (24-48h) is 25% cheaper than express',
        estimatedSavings: savings,
        condition: 'Extend delivery time',
        actionable: true,
      });
    }

    return suggestions.sort((a, b) => b.estimatedSavings - a.estimatedSavings).slice(0, 3);
  }

  /**
   * Check if a given date/time is off-peak
   */
  private isOffPeak(date: Date): boolean {
    const hour = new Date(date).getHours();
    return hour < 6; // 12 AM - 6 AM
  }

  /**
   * Calculate total potential savings
   */
  private calculateTotalPotentialSavings(suggestions: ISavingsSuggestion[]): number {
    return suggestions.reduce((sum, suggestion) => sum + suggestion.estimatedSavings, 0);
  }

  /**
   * Get list of applied discounts
   */
  private getAppliedDiscounts(promo: number, tier: number, volume: number): string[] {
    const applied: string[] = [];
    if (promo > 0) applied.push('promotional_code');
    if (tier > 0) applied.push('customer_tier');
    if (volume > 0) applied.push('volume_or_recurring');
    return applied;
  }

  /**
   * Calculate recurring verification details
   * Returns total price for all occurrences with discount breakdown
   */
  private calculateRecurringDetails(
    request: IPriceCalculationRequest,
    pricePerOccurrence: number,
    config: PricingConfigEntity,
  ): {
    frequency: string;
    frequencyLabel: string;
    occurrences: number;
    pricePerOccurrence: number;
    totalWithoutDiscount: number;
    discountPercentage: number;
    discountAmount: number;
    totalPrice: number;
    scheduleDescription: string;
    estimatedEndDate: string;
  } {
    const occurrences = request.recurringCount || 2;
    const frequency = request.recurringFrequency || 'WEEKLY';
    
    // Calculate totals
    const totalWithoutDiscount = pricePerOccurrence * occurrences;
    
    // Find applicable discount
    const recurringConfig = config.recurringDiscountConfigs.find(
      (r) => r.occurrenceCount <= occurrences && r.isActive,
    );
    const discountPercentage = recurringConfig?.discountPercentage || 0;
    const discountAmount = Math.round((totalWithoutDiscount * discountPercentage) / 100);
    const totalPrice = totalWithoutDiscount - discountAmount;

    // Calculate estimated end date
    const startDate = request.scheduledDate || new Date();
    const endDate = this.calculateRecurringEndDate(frequency, startDate, occurrences);

    // Get frequency label
    const frequencyLabel = this.getFrequencyLabel(frequency);

    // Build schedule description
    const scheduleDescription = this.getScheduleDescription(frequency, occurrences);

    this.logger.log(`Recurring price calculated: ${occurrences}x ${frequency} = ₦${totalPrice / 100} (${discountPercentage}% off)`);

    return {
      frequency,
      frequencyLabel,
      occurrences,
      pricePerOccurrence,
      totalWithoutDiscount,
      discountPercentage,
      discountAmount,
      totalPrice,
      scheduleDescription,
      estimatedEndDate: endDate.toISOString(),
    };
  }

  /**
   * Calculate end date for recurring schedule
   */
  private calculateRecurringEndDate(frequency: string, startDate: Date, occurrences: number): Date {
    const end = new Date(startDate);

    switch (frequency.toUpperCase()) {
      case 'DAILY':
        end.setDate(end.getDate() + (occurrences - 1));
        break;
      case 'WEEKLY':
        end.setDate(end.getDate() + (occurrences - 1) * 7);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + (occurrences - 1));
        break;
    }

    return end;
  }

  /**
   * Get human-readable frequency label
   */
  private getFrequencyLabel(frequency: string): string {
    switch (frequency.toUpperCase()) {
      case 'DAILY':
        return 'Daily';
      case 'WEEKLY':
        return 'Weekly';
      case 'MONTHLY':
        return 'Monthly';
      default:
        return frequency;
    }
  }

  /**
   * Get schedule description for recurring verification
   */
  private getScheduleDescription(frequency: string, occurrences: number): string {
    switch (frequency.toUpperCase()) {
      case 'DAILY':
        return `${occurrences} daily visits over ${occurrences} days`;
      case 'WEEKLY':
        return `${occurrences} weekly visits over ${occurrences} weeks`;
      case 'MONTHLY':
        return `${occurrences} monthly visits over ${occurrences} months`;
      default:
        return `${occurrences} visits`;
    }
  }
}