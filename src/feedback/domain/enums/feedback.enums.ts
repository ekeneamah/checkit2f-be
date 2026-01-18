/**
 * Feedback & Complaint Enumerations
 */

/**
 * Type of feedback
 */
export enum FeedbackType {
  FEEDBACK = 'FEEDBACK',           // General feedback
  COMPLAINT = 'COMPLAINT',         // Complaint requiring resolution
  SUGGESTION = 'SUGGESTION',       // Improvement suggestion
  COMPLIMENT = 'COMPLIMENT',       // Positive feedback
  BUG_REPORT = 'BUG_REPORT',       // Technical issue report
}

/**
 * Category of feedback
 */
export enum FeedbackCategory {
  SERVICE_QUALITY = 'SERVICE_QUALITY',       // Quality of verification service
  AGENT_BEHAVIOR = 'AGENT_BEHAVIOR',         // Agent conduct/professionalism
  APP_EXPERIENCE = 'APP_EXPERIENCE',         // App/website usability
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',           // Payment related issues
  TIMING_DELAY = 'TIMING_DELAY',             // Delays in service
  COMMUNICATION = 'COMMUNICATION',           // Communication issues
  DOCUMENTATION = 'DOCUMENTATION',           // Document handling issues
  PRIVACY_CONCERN = 'PRIVACY_CONCERN',       // Privacy/data concerns
  BILLING = 'BILLING',                       // Billing/invoice issues
  OTHER = 'OTHER',                           // Other issues
}

/**
 * Priority level for complaints
 */
export enum FeedbackPriority {
  LOW = 'LOW',           // Minor issue, can wait
  MEDIUM = 'MEDIUM',     // Standard priority
  HIGH = 'HIGH',         // Needs prompt attention
  URGENT = 'URGENT',     // Critical, immediate action required
}

/**
 * Status of feedback/complaint
 */
export enum FeedbackStatus {
  SUBMITTED = 'SUBMITTED',           // Initial submission
  UNDER_REVIEW = 'UNDER_REVIEW',     // Being reviewed by support
  IN_PROGRESS = 'IN_PROGRESS',       // Actively being worked on
  AWAITING_RESPONSE = 'AWAITING_RESPONSE', // Waiting for user input
  ESCALATED = 'ESCALATED',           // Escalated to management
  RESOLVED = 'RESOLVED',             // Issue resolved
  CLOSED = 'CLOSED',                 // Closed (resolved or no action needed)
  REJECTED = 'REJECTED',             // Invalid/duplicate complaint
}

/**
 * Valid status transitions
 */
export const FEEDBACK_STATUS_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  [FeedbackStatus.SUBMITTED]: [FeedbackStatus.UNDER_REVIEW, FeedbackStatus.REJECTED],
  [FeedbackStatus.UNDER_REVIEW]: [FeedbackStatus.IN_PROGRESS, FeedbackStatus.ESCALATED, FeedbackStatus.RESOLVED, FeedbackStatus.REJECTED],
  [FeedbackStatus.IN_PROGRESS]: [FeedbackStatus.AWAITING_RESPONSE, FeedbackStatus.ESCALATED, FeedbackStatus.RESOLVED],
  [FeedbackStatus.AWAITING_RESPONSE]: [FeedbackStatus.IN_PROGRESS, FeedbackStatus.RESOLVED, FeedbackStatus.CLOSED],
  [FeedbackStatus.ESCALATED]: [FeedbackStatus.IN_PROGRESS, FeedbackStatus.RESOLVED],
  [FeedbackStatus.RESOLVED]: [FeedbackStatus.CLOSED],
  [FeedbackStatus.CLOSED]: [],
  [FeedbackStatus.REJECTED]: [],
};

/**
 * Check if transition is valid
 */
export function isValidFeedbackTransition(from: FeedbackStatus, to: FeedbackStatus): boolean {
  return FEEDBACK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Source of the feedback
 */
export enum FeedbackSource {
  WEB_APP = 'WEB_APP',           // Customer/bank web app
  MOBILE_APP = 'MOBILE_APP',     // Agent mobile app
  ADMIN_PORTAL = 'ADMIN_PORTAL', // Admin portal
  EMAIL = 'EMAIL',               // Email support
  PHONE = 'PHONE',               // Phone support
}
