/**
 * KYC Request Status Enumeration
 * Defines all possible states in the KYC verification lifecycle
 * Follows the 5-phase KYC flow
 */
export enum KycStatus {
  // Phase 1: Request (Bank → Zigo)
  CREATED = 'CREATED',                           // Bank submitted request
  PENDING_CUSTOMER_CONFIRMATION = 'PENDING_CUSTOMER_CONFIRMATION', // Awaiting customer confirmation
  CUSTOMER_CONFIRMED = 'CUSTOMER_CONFIRMED',     // Customer confirmed details + consent
  PENDING_ADMIN_REVIEW = 'PENDING_ADMIN_REVIEW', // Admin reviewing request
  
  // Phase 2: Assignment (Company → Rider)
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',     // Admin approved, finding company
  ASSIGNED_TO_COMPANY = 'ASSIGNED_TO_COMPANY',   // Assigned to company
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',             // Company assigned rider
  PENDING_LETTER = 'PENDING_LETTER',             // Awaiting bank introductory letter
  LETTER_UPLOADED = 'LETTER_UPLOADED',           // Bank uploaded letter
  
  // Phase 3: Pre-Visit (Day of visit)
  SCHEDULED = 'SCHEDULED',                       // Visit scheduled
  RIDER_EN_ROUTE = 'RIDER_EN_ROUTE',             // Rider on the way
  ARRIVED = 'ARRIVED',                           // Rider at location
  
  // Phase 4: Verification (On-site)
  PENDING_OTP = 'PENDING_OTP',                   // Awaiting customer OTP entry
  OTP_VERIFIED = 'OTP_VERIFIED',                 // Customer entered correct OTP
  IN_PROGRESS = 'IN_PROGRESS',                   // Verification in progress
  EVIDENCE_COLLECTED = 'EVIDENCE_COLLECTED',     // All evidence collected
  SUBMITTED = 'SUBMITTED',                       // Rider submitted verification
  
  // Phase 5: Post-Verification
  PENDING_RATING = 'PENDING_RATING',             // Awaiting customer rating
  PENDING_QA = 'PENDING_QA',                     // Flagged for QA review
  QA_APPROVED = 'QA_APPROVED',                   // QA approved
  QA_REJECTED = 'QA_REJECTED',                   // QA rejected, needs resubmission
  COMPLETED = 'COMPLETED',                       // Successfully completed
  REPORT_SENT = 'REPORT_SENT',                   // Report sent to bank
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',       // Payment processed
  
  // Error/Exception states
  CUSTOMER_REJECTED = 'CUSTOMER_REJECTED',       // Customer rejected/declined
  RESCHEDULED = 'RESCHEDULED',                   // Customer rescheduled
  FAILED = 'FAILED',                             // Verification failed
  CANCELLED = 'CANCELLED',                       // Request cancelled
  EXPIRED = 'EXPIRED',                           // Request expired
}

/**
 * KYC Phase groupings for status
 */
export const KycStatusPhase = {
  REQUEST: [
    KycStatus.CREATED,
    KycStatus.PENDING_CUSTOMER_CONFIRMATION,
    KycStatus.CUSTOMER_CONFIRMED,
    KycStatus.PENDING_ADMIN_REVIEW,
  ],
  ASSIGNMENT: [
    KycStatus.PENDING_ASSIGNMENT,
    KycStatus.ASSIGNED_TO_COMPANY,
    KycStatus.RIDER_ASSIGNED,
    KycStatus.PENDING_LETTER,
    KycStatus.LETTER_UPLOADED,
  ],
  PRE_VISIT: [
    KycStatus.SCHEDULED,
    KycStatus.RIDER_EN_ROUTE,
    KycStatus.ARRIVED,
  ],
  VERIFICATION: [
    KycStatus.PENDING_OTP,
    KycStatus.OTP_VERIFIED,
    KycStatus.IN_PROGRESS,
    KycStatus.EVIDENCE_COLLECTED,
    KycStatus.SUBMITTED,
  ],
  POST_VERIFICATION: [
    KycStatus.PENDING_RATING,
    KycStatus.PENDING_QA,
    KycStatus.QA_APPROVED,
    KycStatus.QA_REJECTED,
    KycStatus.COMPLETED,
    KycStatus.REPORT_SENT,
    KycStatus.PAYMENT_PROCESSED,
  ],
  ERROR: [
    KycStatus.CUSTOMER_REJECTED,
    KycStatus.RESCHEDULED,
    KycStatus.FAILED,
    KycStatus.CANCELLED,
    KycStatus.EXPIRED,
  ],
} as const;

/**
 * Get the phase for a given status
 */
export function getPhaseForStatus(status: KycStatus): string {
  for (const [phase, statuses] of Object.entries(KycStatusPhase)) {
    if ((statuses as readonly KycStatus[]).includes(status)) {
      return phase;
    }
  }
  return 'UNKNOWN';
}

/**
 * Valid status transitions
 */
export const KycStatusTransitions: Record<KycStatus, KycStatus[]> = {
  [KycStatus.CREATED]: [KycStatus.PENDING_CUSTOMER_CONFIRMATION, KycStatus.CANCELLED],
  [KycStatus.PENDING_CUSTOMER_CONFIRMATION]: [KycStatus.CUSTOMER_CONFIRMED, KycStatus.CUSTOMER_REJECTED, KycStatus.EXPIRED],
  [KycStatus.CUSTOMER_CONFIRMED]: [KycStatus.PENDING_ADMIN_REVIEW],
  [KycStatus.PENDING_ADMIN_REVIEW]: [KycStatus.PENDING_ASSIGNMENT, KycStatus.CANCELLED],
  [KycStatus.PENDING_ASSIGNMENT]: [KycStatus.ASSIGNED_TO_COMPANY],
  [KycStatus.ASSIGNED_TO_COMPANY]: [KycStatus.RIDER_ASSIGNED, KycStatus.PENDING_ASSIGNMENT],
  [KycStatus.RIDER_ASSIGNED]: [KycStatus.PENDING_LETTER, KycStatus.SCHEDULED],
  [KycStatus.PENDING_LETTER]: [KycStatus.LETTER_UPLOADED, KycStatus.SCHEDULED],
  [KycStatus.LETTER_UPLOADED]: [KycStatus.SCHEDULED],
  [KycStatus.SCHEDULED]: [KycStatus.RIDER_EN_ROUTE, KycStatus.RESCHEDULED, KycStatus.CANCELLED],
  [KycStatus.RIDER_EN_ROUTE]: [KycStatus.ARRIVED, KycStatus.FAILED],
  [KycStatus.ARRIVED]: [KycStatus.PENDING_OTP],
  [KycStatus.PENDING_OTP]: [KycStatus.OTP_VERIFIED, KycStatus.FAILED],
  [KycStatus.OTP_VERIFIED]: [KycStatus.IN_PROGRESS],
  [KycStatus.IN_PROGRESS]: [KycStatus.EVIDENCE_COLLECTED, KycStatus.FAILED],
  [KycStatus.EVIDENCE_COLLECTED]: [KycStatus.SUBMITTED],
  [KycStatus.SUBMITTED]: [KycStatus.PENDING_RATING, KycStatus.PENDING_QA],
  [KycStatus.PENDING_RATING]: [KycStatus.PENDING_QA, KycStatus.COMPLETED],
  [KycStatus.PENDING_QA]: [KycStatus.QA_APPROVED, KycStatus.QA_REJECTED],
  [KycStatus.QA_APPROVED]: [KycStatus.COMPLETED],
  [KycStatus.QA_REJECTED]: [KycStatus.IN_PROGRESS],
  [KycStatus.COMPLETED]: [KycStatus.REPORT_SENT],
  [KycStatus.REPORT_SENT]: [KycStatus.PAYMENT_PROCESSED],
  [KycStatus.PAYMENT_PROCESSED]: [],
  [KycStatus.CUSTOMER_REJECTED]: [],
  [KycStatus.RESCHEDULED]: [KycStatus.SCHEDULED, KycStatus.CANCELLED],
  [KycStatus.FAILED]: [KycStatus.PENDING_ASSIGNMENT],
  [KycStatus.CANCELLED]: [],
  [KycStatus.EXPIRED]: [],
};

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: KycStatus, to: KycStatus): boolean {
  return KycStatusTransitions[from]?.includes(to) ?? false;
}
