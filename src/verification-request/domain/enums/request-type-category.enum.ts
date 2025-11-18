/**
 * Request Type Categories
 * Defines the high-level categories for different verification request types
 */
export enum RequestTypeCategory {
  VERIFICATION = 'VERIFICATION',     // Standard location verification
  DISCOVERY = 'DISCOVERY',           // Find and discover options
  RESEARCH = 'RESEARCH',             // Research businesses by service/product
  COMPARISON = 'COMPARISON',         // Compare multiple locations
  SURVEY = 'SURVEY',                 // Detailed site surveys
  URGENT = 'URGENT',                 // Priority/fast-track requests
  MYSTERY_SHOPPER = 'MYSTERY_SHOPPER', // Undercover evaluation
  RECURRING = 'RECURRING',           // Subscription-based recurring checks
  VIRTUAL_TOUR = 'VIRTUAL_TOUR',     // Live video walkthrough
  NEIGHBORHOOD = 'NEIGHBORHOOD',     // Area assessment
  COMPLIANCE = 'COMPLIANCE',         // Regulatory verification
  EVENT = 'EVENT',                   // Event attendance proof
}
