/**
 * Service Area Pricing Entity
 * Defines pricing for specific LGAs and localities
 * Supports hierarchical pricing: Locality > LGA > State > Company Default
 */

export interface ServiceAreaPricing {
  id: string;
  
  // Location identifiers
  state: string;
  lga: string;
  locality?: string; // If null = pricing applies to entire LGA
  
  // Pricing structure
  basePrice: number; // Base fee for verification
  pricePerKm: number; // Additional charge per kilometer
  minimumCharge: number; // Minimum total charge
  maximumCharge?: number; // Optional maximum charge cap
  
  // Additional charges
  surcharges?: {
    type: 'weekend' | 'holiday' | 'night' | 'rush_hour' | 'custom';
    label?: string; // For custom types
    amount: number; // Fixed amount
    percentage?: number; // Or percentage of base
  }[];
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // Admin user ID
  notes?: string; // Internal notes about this pricing
}

export type ServiceAreaPricingEntity = ServiceAreaPricing;
