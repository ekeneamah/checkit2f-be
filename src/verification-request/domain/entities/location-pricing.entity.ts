/**
 * Location Pricing Entity
 * Represents pricing configuration for specific city and area combinations
 */
export interface LocationPricing {
  id: string;
  city: string;
  area?: string | null; // Optional area - if null, applies to entire city
  cityCost: number; // Base cost for the city
  areaCost: number; // Additional cost for the specific area (0 if area is null)
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  
  // Optional metadata
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface LocationPricingCreateDto {
  city: string;
  area?: string | null;
  cityCost: number;
  areaCost: number;
  status?: 'active' | 'inactive' | 'suspended';
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface LocationPricingUpdateDto {
  cityCost?: number;
  areaCost?: number;
  status?: 'active' | 'inactive' | 'suspended';
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface PriceCalculationResult {
  city: string;
  area?: string | null;
  cityCost: number;
  areaCost: number;
  totalCost: number;
  pricingSource: 'exact_match' | 'city_fallback' | 'default';
  appliedPricingId?: string;
}