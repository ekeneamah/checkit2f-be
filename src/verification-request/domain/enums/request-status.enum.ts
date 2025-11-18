/**
 * Request Status Enumeration
 * Defines all possible states in the verification request lifecycle
 */
export enum RequestStatus {
  CREATED = 'CREATED',                       // Request created, payment pending
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT', // Payment received, finding agent
  SCHEDULED = 'SCHEDULED',                   // Scheduled for future (Virtual Tour, Event)
  ASSIGNED = 'ASSIGNED',                     // Agent accepted, not started
  IN_PROGRESS = 'IN_PROGRESS',               // Agent working on it
  COMPLETED = 'COMPLETED',                   // Successfully completed
  REASSIGNMENT_NEEDED = 'REASSIGNMENT_NEEDED', // Agent failed, finding new agent
  REFUNDED = 'REFUNDED',                     // No agent found, refunded
  CANCELLED = 'CANCELLED',                   // Customer cancelled
  EXPIRED = 'EXPIRED',                       // SLA expired without completion
  EXTENDED = 'EXTENDED',                     // Customer extended SLA
  RECURRING_ACTIVE = 'RECURRING_ACTIVE',     // Recurring request active
  RECURRING_PAUSED = 'RECURRING_PAUSED',     // Recurring request paused
  RECURRING_COMPLETED = 'RECURRING_COMPLETED', // All recurring occurrences done
}
