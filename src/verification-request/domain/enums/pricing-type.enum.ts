/**
 * Pricing Type Enumeration
 * Defines different pricing models for request types
 */
export enum PricingType {
  FIXED = 'FIXED',                       // Fixed price (e.g., Standard Verification: ₦5,000)
  RADIUS_BASED = 'RADIUS_BASED',         // Variable by search radius (e.g., Discovery: 5km=₦8k, 10km=₦12k)
  PER_LOCATION = 'PER_LOCATION',         // Price per location (e.g., Comparison: ₦5k per location)
  TIERED = 'TIERED',                     // Tiered complexity (e.g., Research: Simple=₦10k, Complex=₦15k)
  PREMIUM_MULTIPLIER = 'PREMIUM_MULTIPLIER', // Multiplier on base price (e.g., Urgent: 1.5x)
  RECURRING_DISCOUNT = 'RECURRING_DISCOUNT', // Bulk discount for recurring (e.g., 20% off)
}
