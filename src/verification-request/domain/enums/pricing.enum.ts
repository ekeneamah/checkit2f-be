/**
 * Pricing Domain Enums
 * 
 * Enumerations used throughout the pricing domain.
 * 
 * @module PricingEnums
 */

/**
 * Time slot categories for pricing
 */
export enum TimeSlot {
  RUSH_HOUR = 'rush_hour',    // Peak hours (8-10am, 5-7pm)
  STANDARD = 'standard',        // Regular business hours
  ECONOMY = 'economy',          // Off-peak hours
}

/**
 * Difficulty level of verification
 */
export enum DifficultyLevel {
  EASY = 'easy',                // Simple verification
  MEDIUM = 'medium',            // Standard verification
  HARD = 'hard',                // Complex verification
}

/**
 * Verification mode
 */
export enum VerificationMode {
  RECORDED = 'recorded',        // Pre-recorded verification
  LIVE = 'live',                // Live video verification
}

/**
 * Discount type
 */
export enum DiscountType {
  PERCENTAGE = 'percentage',    // Percentage off
  FIXED = 'fixed',              // Fixed amount off
}
