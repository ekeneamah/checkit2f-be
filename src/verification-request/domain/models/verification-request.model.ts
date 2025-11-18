import { RequestStatus } from '../enums';

/**
 * Verification Request Firestore Model (FLAT SCHEMA)
 * Collection: verification_requests
 * No nested collections - all data at root level
 */
export interface VerificationRequestModel {
  // Document ID
  id: string;
  requestNumber: string; // REQ-2024-001234

  // Request Type (snapshot at creation)
  requestTypeId: string;
  requestTypeName: string;
  requestTypeDisplayName: string;
  requestTypePricingType: string;
  requestTypeCalculatedPrice: number; // kobo

  // Customer
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  // Location Type
  locationType: 'EXACT' | 'SEARCH_AREA' | 'LOCATION_LIST';

  // Exact Location (for Standard Verification)
  exactLocationAddress: string | null;
  exactLocationLatitude: number | null;
  exactLocationLongitude: number | null;
  exactLocationPlaceName: string | null;
  exactLocationPlaceType: string | null;
  exactLocationGooglePlaceId: string | null;

  // Search Area (for Discovery/Research)
  searchAreaCenterLatitude: number | null;
  searchAreaCenterLongitude: number | null;
  searchAreaRadiusKm: number | null;
  searchAreaName: string | null;
  searchAreaDescription: string | null;

  // Location List (for Comparison) - JSON string
  locationList: string | null; // JSON array

  // Search Criteria (for Discovery/Research) - Flattened
  searchCriteriaBusinessType: string | null;
  searchCriteriaServiceOrProduct: string | null;
  searchCriteriaPriceRange: string | null;
  searchCriteriaSpecificRequirements: string | null; // JSON array
  searchCriteriaTier: string | null;

  // Pricing Calculation
  pricingBasePrice: number; // kobo
  pricingRadiusMultiplier: number | null;
  pricingLocationCount: number | null;
  pricingTier: string | null;
  pricingPremiumMultiplier: number | null;
  pricingTotalPrice: number; // kobo
  pricingCurrency: string;
  pricingCalculationBreakdown: string;

  // Request Description
  description: string;
  specialInstructions: string | null;
  attachments: string | null; // JSON array of URLs

  // Scheduling (for Virtual Tour, Event Attendance)
  isScheduled: boolean;
  scheduledFor: Date | null;
  eventStartTime: Date | null;
  eventEndTime: Date | null;

  // Recurring (for Recurring Verification)
  isRecurring: boolean;
  recurringSchedule: string | null; // JSON object

  // Virtual Tour
  virtualTourSettings: string | null; // JSON object

  // Mystery Shopper
  mysteryShopperSettings: string | null; // JSON object

  // Custom Fields
  customFields: string | null; // JSON object

  // Status & Workflow
  status: RequestStatus;

  // Assignment
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  assignedAt: Date | null;
  acceptedAt: Date | null;

  // Timers
  createdAt: Date;
  findAgentSlaDeadline: Date;
  completionDeadline: Date | null;
  completedAt: Date | null;

  // Extension
  wasExtended: boolean;
  extendedUntil: Date | null;
  extensionCount: number;

  // Reassignment
  acceptingAssignments: boolean;
  reassignmentCount: number;
  previousAgents: string | null; // JSON array

  // Blacklisting
  blacklistedAgents: string | null; // JSON array of agent IDs

  // Deliverables (from agent)
  deliverables: string | null; // JSON object with all deliverable data

  // Customer Selection (for Discovery/Comparison)
  selectedOption: string | null; // JSON object

  // Payment
  paymentId: string;
  paymentStatus: 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED';
  paidAt: Date;
  releasedToAgentAt: Date | null;
  refundedAt: Date | null;
  refundReason: string | null;

  // Rating & Feedback
  customerRating: number | null;
  customerFeedback: string | null;
  agentRating: number | null;
  agentFeedback: string | null;

  // Metadata
  updatedAt: Date;
  version: number;
}

/**
 * Helper for serialization/deserialization
 */
export class VerificationRequestModelHelper {
  static toFirestore(request: any): VerificationRequestModel {
    return {
      ...request,
      locationList: request.locationList ? JSON.stringify(request.locationList) : null,
      searchCriteriaSpecificRequirements: request.searchCriteria?.specificRequirements 
        ? JSON.stringify(request.searchCriteria.specificRequirements) 
        : null,
      attachments: request.attachments ? JSON.stringify(request.attachments) : null,
      recurringSchedule: request.recurringSchedule ? JSON.stringify(request.recurringSchedule) : null,
      virtualTourSettings: request.virtualTourSettings ? JSON.stringify(request.virtualTourSettings) : null,
      mysteryShopperSettings: request.mysteryShopperSettings 
        ? JSON.stringify(request.mysteryShopperSettings) 
        : null,
      customFields: request.customFields ? JSON.stringify(request.customFields) : null,
      previousAgents: request.previousAgents ? JSON.stringify(request.previousAgents) : null,
      blacklistedAgents: request.blacklistedAgents ? JSON.stringify(request.blacklistedAgents) : null,
      deliverables: request.deliverables ? JSON.stringify(request.deliverables) : null,
      selectedOption: request.selectedOption ? JSON.stringify(request.selectedOption) : null,
      // Flatten search criteria
      searchCriteriaBusinessType: request.searchCriteria?.businessType || null,
      searchCriteriaServiceOrProduct: request.searchCriteria?.serviceOrProduct || null,
      searchCriteriaPriceRange: request.searchCriteria?.priceRange || null,
      searchCriteriaTier: request.searchCriteria?.tier || null,
    };
  }

  static fromFirestore(doc: VerificationRequestModel): any {
    return {
      ...doc,
      locationList: doc.locationList ? JSON.parse(doc.locationList) : null,
      attachments: doc.attachments ? JSON.parse(doc.attachments) : null,
      recurringSchedule: doc.recurringSchedule ? JSON.parse(doc.recurringSchedule) : null,
      virtualTourSettings: doc.virtualTourSettings ? JSON.parse(doc.virtualTourSettings) : null,
      mysteryShopperSettings: doc.mysteryShopperSettings 
        ? JSON.parse(doc.mysteryShopperSettings) 
        : null,
      customFields: doc.customFields ? JSON.parse(doc.customFields) : null,
      previousAgents: doc.previousAgents ? JSON.parse(doc.previousAgents) : null,
      blacklistedAgents: doc.blacklistedAgents ? JSON.parse(doc.blacklistedAgents) : null,
      deliverables: doc.deliverables ? JSON.parse(doc.deliverables) : null,
      selectedOption: doc.selectedOption ? JSON.parse(doc.selectedOption) : null,
      // Reconstruct search criteria
      searchCriteria: doc.searchCriteriaBusinessType || doc.searchCriteriaServiceOrProduct
        ? {
            businessType: doc.searchCriteriaBusinessType,
            serviceOrProduct: doc.searchCriteriaServiceOrProduct,
            priceRange: doc.searchCriteriaPriceRange,
            specificRequirements: doc.searchCriteriaSpecificRequirements 
              ? JSON.parse(doc.searchCriteriaSpecificRequirements) 
              : [],
            tier: doc.searchCriteriaTier,
          }
        : null,
    };
  }
}
