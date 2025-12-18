/**
 * Price Breakdown Item
 * Represents a single line item in the price breakdown
 */
export interface IPriceBreakdownItem {
  label: string;
  amount: number;
  percentage?: number;
  type: 'base' | 'addition' | 'multiplier' | 'discount' | 'surge';
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Complete Price Breakdown
 * Shows all factors that contributed to the final price
 */
export interface IPriceBreakdownDetail {
  items: IPriceBreakdownItem[];
  subtotal: number;
  totalAdditions: number;
  totalDiscounts: number;
  totalSurge: number;
  finalPrice: number;
  currency: string;
  calculatedAt: Date;
}

/**
 * Savings Suggestion
 * Recommendations to help customer save money
 */
export interface ISavingsSuggestion {
  type: 'timing' | 'location_count' | 'urgency' | 'recurring' | 'volume' | 'tier';
  title: string;
  description: string;
  estimatedSavings: number;
  condition: string; // e.g., "Schedule for off-peak hours"
  actionable: boolean;
  applyCode?: string;
}

/**
 * Complete Price Calculation Response
 * Everything the frontend and backend need for pricing
 */
export interface IPriceCalculationResponse {
  // Identifiers
  requestTypeId: string;
  requestTypeName: string;
  locationId?: string;
  calculationId: string;

  // Prices
  basePrice: number;
  finalPrice: number;
  currency: string;

  // Breakdown
  breakdown: IPriceBreakdownDetail;

  // Savings
  savingsSuggestions: ISavingsSuggestion[];
  totalPotentialSavings: number;

  // Metadata
  calculatedAt: Date;
  validUntilSeconds: number; // How long this quote is valid (300 = 5 minutes)
  factors: {
    timeSlot?: string;
    difficulty?: string;
    mode?: string;
    urgency?: string;
    surgeActive?: boolean;
    discountsApplied?: string[];
  };
}

/**
 * Price Calculation Request
 * What the frontend sends to calculate a price
 */
export interface IPriceCalculationRequest {
  requestTypeId: string;
  locationCount: number;
  radiusKm?: number;
  areaKm2?: number;
  distanceKm?: number;
  city?: string;
  area?: string;
  urgency: string; // 'standard' | 'urgent' | 'express' | 'immediate'
  difficulty?: string; // 'easy' | 'medium' | 'hard'
  mode?: string; // 'in_person' | 'remote'
  scheduledDate?: Date;
  isRecurring?: boolean;
  recurringCount?: number;
  customerTier?: string; // 'bronze' | 'silver' | 'gold' | 'platinum'
  promotionalCode?: string;
}
