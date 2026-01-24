/**
 * Location Pricing Entity
 * Represents pricing configuration for specific State → LGA → Locality combinations
 */

export interface Surcharge {
  type: 'weekend' | 'holiday' | 'night' | 'rush_hour' | 'custom';
  value: number;
  isPercentage: boolean;
  description?: string;
}

export interface LocationPricing {
  id: string;
  state: string;
  lga: string;
  locality?: string | null; // Optional locality - if null, applies to entire LGA
  basePrice: number;
  pricePerKm: number;
  minimumCharge?: number;
  maximumCharge?: number;
  surcharges?: Surcharge[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional metadata
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface LocationPricingCreateDto {
  state: string;
  lga: string;
  locality?: string | null;
  basePrice: number;
  pricePerKm: number;
  minimumCharge?: number;
  maximumCharge?: number;
  surcharges?: Surcharge[];
  isActive?: boolean;
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface LocationPricingUpdateDto {
  basePrice?: number;
  pricePerKm?: number;
  minimumCharge?: number;
  maximumCharge?: number;
  surcharges?: Surcharge[];
  isActive?: boolean;
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface PriceCalculationResult {
  state: string;
  lga: string;
  locality?: string | null;
  basePrice: number;
  pricePerKm: number;
  distance: number;
  calculatedPrice: number;
  appliedSurcharges?: Array<{ type: string; value: number; amount: number }>;
  finalPrice: number;
  pricingSource: 'locality_match' | 'lga_match' | 'state_match' | 'default';
  appliedPricingId?: string;
}