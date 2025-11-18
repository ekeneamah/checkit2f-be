import {
  RequestTypeCategory,
  PricingType,
  AgentLevel,
  AgentSpecialization,
} from '../enums';
import { IRadiusPricingTier, ITieredPricingOption } from './pricing-calculator.interface';

/**
 * Request Type Configuration Interface (Admin-Configurable)
 * Represents a complete request type stored in Firestore
 */
export interface IRequestTypeConfig {
  // Identity
  id: string;
  name: string; // 'standard_verification', 'discovery_request'
  displayName: string; // 'Standard Verification'
  description: string;
  icon?: string;
  category: RequestTypeCategory;

  // Pricing Configuration
  pricingType: PricingType;
  basePrice?: number; // For FIXED pricing, in kobo
  radiusPricing?: IRadiusPricingTier[]; // For RADIUS_BASED
  pricePerLocation?: number; // For PER_LOCATION
  minLocations?: number;
  maxLocations?: number;
  tieredPricing?: ITieredPricingOption[]; // For TIERED
  premiumMultiplier?: number; // For PREMIUM_MULTIPLIER (e.g., 1.5)
  appliesToTypes?: string[]; // Which types can use this multiplier
  currency: string; // 'NGN'

  // Location & Search Settings
  requiresExactLocation: boolean;
  allowsRadiusSearch: boolean;
  defaultSearchRadius?: number; // km
  minSearchRadius?: number;
  maxSearchRadius?: number;
  requiresMultipleLocations: boolean;

  // Time Constraints
  estimatedDurationMinutes: number;
  slaHours: number; // Hours to find agent
  completionSlaHours: number; // Hours to complete after acceptance
  allowExtension: boolean;
  extensionHours?: number;

  // Deliverables
  deliverables: IRequestTypeDeliverables;

  // Customer Input Requirements
  customerInputs: ICustomerInputRequirements;

  // Agent Requirements
  requiredAgentLevel?: AgentLevel;
  requiredMinRating?: number; // 1-5
  requiresSpecialization?: AgentSpecialization[];
  requiresCertification?: boolean;

  // Broadcast Settings
  broadcastRadiusKm: number;
  priorityLevel: number; // 1-10
  canBroadcastToSocialMedia: boolean;
  socialMediaTemplate?: string;

  // Scheduling (for Virtual Tour, Event Attendance)
  requiresScheduling: boolean;
  minAdvanceNoticeHours?: number;
  allowsRecurring: boolean;
  recurringOptions?: IRecurringOptions;

  // Display & Availability
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  badge?: string; // 'POPULAR', 'NEW', 'PREMIUM'
  color?: string;
  phase: 1 | 2; // Launch phase

  // Help & Documentation
  shortDescription: string;
  longDescription: string;
  exampleRequests: string[];
  helpText: string;
  faqs?: IFaqItem[];

  // Business Rules
  allowScheduling: boolean;
  maxScheduleDays?: number;
  requiresAdvancePayment: boolean;
  allowsPartialRefund: boolean;
  refundPercentage?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

/**
 * Deliverables configuration
 */
export interface IRequestTypeDeliverables {
  minPhotos: number;
  maxPhotos?: number;
  requiresVideo: boolean;
  minVideoDuration?: number; // seconds
  requiresGPS: boolean;
  requiresMeasurements: boolean;
  requiresComparison: boolean;
  requiresWrittenReport: boolean;
  reportTemplate?: string;
  customFields?: ICustomField[];
}

/**
 * Customer input requirements
 */
export interface ICustomerInputRequirements {
  requiresExactAddress: boolean;
  requiresSearchArea: boolean;
  requiresSearchRadius: boolean;
  requiresSearchCriteria: boolean;
  requiresLocationList: boolean;
  maxDescriptionLength: number;
  additionalFields?: ICustomField[];
}

/**
 * Custom field definition
 */
export interface ICustomField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  validation?: string; // Regex pattern
}

/**
 * Recurring options configuration
 */
export interface IRecurringOptions {
  frequencies: string[]; // ['DAILY', 'WEEKLY', 'MONTHLY']
  minOccurrences: number;
  maxOccurrences: number;
  discountPercentage: number; // e.g., 20 for 20% off
}

/**
 * FAQ item
 */
export interface IFaqItem {
  question: string;
  answer: string;
}

/**
 * Price calculation result
 */
export interface IPriceCalculationResult {
  requestTypeId: string;
  requestTypeName: string;
  pricingType: PricingType;
  basePrice?: number;
  radiusMultiplier?: number;
  locationCount?: number;
  tier?: string;
  premiumMultiplier?: number;
  discountPercentage?: number;
  subtotal: number;
  discount: number;
  totalPrice: number;
  currency: string;
  breakdown: string;
}
