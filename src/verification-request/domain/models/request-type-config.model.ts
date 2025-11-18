import {
  RequestTypeCategory,
  PricingType,
  AgentLevel,
  AgentSpecialization,
} from '../enums';

/**
 * Request Type Config Firestore Model (FLAT SCHEMA)
 * Collection: request_type_configs
 * No nested collections - all fields at root level
 */
export interface RequestTypeConfigModel {
  // Document ID (Firestore auto-generated)
  id: string;

  // Identity
  name: string; // 'standard_verification'
  displayName: string; // 'Standard Verification'
  description: string;
  icon: string | null;
  category: RequestTypeCategory;

  // Pricing - Flattened (store as serialized JSON strings or arrays)
  pricingType: PricingType;
  basePrice: number | null; // kobo
  radiusPricing: string | null; // JSON string of IRadiusPricingTier[]
  pricePerLocation: number | null; // kobo
  minLocations: number | null;
  maxLocations: number | null;
  tieredPricing: string | null; // JSON string of ITieredPricingOption[]
  premiumMultiplier: number | null;
  appliesToTypes: string | null; // JSON string of string[]
  currency: string; // 'NGN'

  // Location & Search
  requiresExactLocation: boolean;
  allowsRadiusSearch: boolean;
  defaultSearchRadius: number | null; // km
  minSearchRadius: number | null;
  maxSearchRadius: number | null;
  requiresMultipleLocations: boolean;

  // Time
  estimatedDurationMinutes: number;
  slaHours: number;
  completionSlaHours: number;
  allowExtension: boolean;
  extensionHours: number | null;

  // Deliverables - Flattened
  deliverablesMinPhotos: number;
  deliverablesMaxPhotos: number | null;
  deliverablesRequiresVideo: boolean;
  deliverablesMinVideoDuration: number | null; // seconds
  deliverablesRequiresGPS: boolean;
  deliverablesRequiresMeasurements: boolean;
  deliverablesRequiresComparison: boolean;
  deliverablesRequiresWrittenReport: boolean;
  deliverablesReportTemplate: string | null;
  deliverablesCustomFields: string | null; // JSON string

  // Customer Inputs - Flattened
  customerInputsRequiresExactAddress: boolean;
  customerInputsRequiresSearchArea: boolean;
  customerInputsRequiresSearchRadius: boolean;
  customerInputsRequiresSearchCriteria: boolean;
  customerInputsRequiresLocationList: boolean;
  customerInputsMaxDescriptionLength: number;
  customerInputsAdditionalFields: string | null; // JSON string

  // Agent Requirements
  requiredAgentLevel: AgentLevel | null;
  requiredMinRating: number | null; // 1-5
  requiresSpecialization: string | null; // JSON string of AgentSpecialization[]
  requiresCertification: boolean;

  // Broadcast
  broadcastRadiusKm: number;
  priorityLevel: number; // 1-10
  canBroadcastToSocialMedia: boolean;
  socialMediaTemplate: string | null;

  // Scheduling
  requiresScheduling: boolean;
  minAdvanceNoticeHours: number | null;
  allowsRecurring: boolean;
  recurringOptions: string | null; // JSON string of IRecurringOptions

  // Display
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  badge: string | null;
  color: string | null;
  phase: 1 | 2;

  // Help
  shortDescription: string;
  longDescription: string;
  exampleRequests: string; // JSON string of string[]
  helpText: string;
  faqs: string | null; // JSON string of IFaqItem[]

  // Business Rules
  allowScheduling: boolean;
  maxScheduleDays: number | null;
  requiresAdvancePayment: boolean;
  allowsPartialRefund: boolean;
  refundPercentage: number | null;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

/**
 * Helper to serialize/deserialize JSON fields
 */
export class RequestTypeConfigModelHelper {
  static toFirestore(config: any): RequestTypeConfigModel {
    return {
      ...config,
      radiusPricing: config.radiusPricing ? JSON.stringify(config.radiusPricing) : null,
      tieredPricing: config.tieredPricing ? JSON.stringify(config.tieredPricing) : null,
      appliesToTypes: config.appliesToTypes ? JSON.stringify(config.appliesToTypes) : null,
      deliverablesCustomFields: config.deliverables?.customFields 
        ? JSON.stringify(config.deliverables.customFields) 
        : null,
      customerInputsAdditionalFields: config.customerInputs?.additionalFields 
        ? JSON.stringify(config.customerInputs.additionalFields) 
        : null,
      requiresSpecialization: config.requiresSpecialization 
        ? JSON.stringify(config.requiresSpecialization) 
        : null,
      recurringOptions: config.recurringOptions ? JSON.stringify(config.recurringOptions) : null,
      exampleRequests: JSON.stringify(config.exampleRequests || []),
      faqs: config.faqs ? JSON.stringify(config.faqs) : null,
      // Flatten deliverables
      deliverablesMinPhotos: config.deliverables?.minPhotos || 0,
      deliverablesMaxPhotos: config.deliverables?.maxPhotos || null,
      deliverablesRequiresVideo: config.deliverables?.requiresVideo || false,
      deliverablesMinVideoDuration: config.deliverables?.minVideoDuration || null,
      deliverablesRequiresGPS: config.deliverables?.requiresGPS || false,
      deliverablesRequiresMeasurements: config.deliverables?.requiresMeasurements || false,
      deliverablesRequiresComparison: config.deliverables?.requiresComparison || false,
      deliverablesRequiresWrittenReport: config.deliverables?.requiresWrittenReport || false,
      deliverablesReportTemplate: config.deliverables?.reportTemplate || null,
      // Flatten customer inputs
      customerInputsRequiresExactAddress: config.customerInputs?.requiresExactAddress || false,
      customerInputsRequiresSearchArea: config.customerInputs?.requiresSearchArea || false,
      customerInputsRequiresSearchRadius: config.customerInputs?.requiresSearchRadius || false,
      customerInputsRequiresSearchCriteria: config.customerInputs?.requiresSearchCriteria || false,
      customerInputsRequiresLocationList: config.customerInputs?.requiresLocationList || false,
      customerInputsMaxDescriptionLength: config.customerInputs?.maxDescriptionLength || 1000,
    };
  }

  static fromFirestore(doc: RequestTypeConfigModel): any {
    return {
      ...doc,
      radiusPricing: doc.radiusPricing ? JSON.parse(doc.radiusPricing) : null,
      tieredPricing: doc.tieredPricing ? JSON.parse(doc.tieredPricing) : null,
      appliesToTypes: doc.appliesToTypes ? JSON.parse(doc.appliesToTypes) : null,
      exampleRequests: JSON.parse(doc.exampleRequests),
      faqs: doc.faqs ? JSON.parse(doc.faqs) : null,
      requiresSpecialization: doc.requiresSpecialization 
        ? JSON.parse(doc.requiresSpecialization) 
        : null,
      recurringOptions: doc.recurringOptions ? JSON.parse(doc.recurringOptions) : null,
      // Reconstruct deliverables object
      deliverables: {
        minPhotos: doc.deliverablesMinPhotos,
        maxPhotos: doc.deliverablesMaxPhotos,
        requiresVideo: doc.deliverablesRequiresVideo,
        minVideoDuration: doc.deliverablesMinVideoDuration,
        requiresGPS: doc.deliverablesRequiresGPS,
        requiresMeasurements: doc.deliverablesRequiresMeasurements,
        requiresComparison: doc.deliverablesRequiresComparison,
        requiresWrittenReport: doc.deliverablesRequiresWrittenReport,
        reportTemplate: doc.deliverablesReportTemplate,
        customFields: doc.deliverablesCustomFields 
          ? JSON.parse(doc.deliverablesCustomFields) 
          : null,
      },
      // Reconstruct customer inputs object
      customerInputs: {
        requiresExactAddress: doc.customerInputsRequiresExactAddress,
        requiresSearchArea: doc.customerInputsRequiresSearchArea,
        requiresSearchRadius: doc.customerInputsRequiresSearchRadius,
        requiresSearchCriteria: doc.customerInputsRequiresSearchCriteria,
        requiresLocationList: doc.customerInputsRequiresLocationList,
        maxDescriptionLength: doc.customerInputsMaxDescriptionLength,
        additionalFields: doc.customerInputsAdditionalFields 
          ? JSON.parse(doc.customerInputsAdditionalFields) 
          : null,
      },
    };
  }
}
