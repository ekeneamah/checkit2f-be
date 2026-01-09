/**
 * Notification Events Enum
 * 
 * Centralized definition of all notification event types.
 * Follows Single Responsibility Principle - only defines event names.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

export enum NotificationEvent {
  // Verification Request Lifecycle Events
  REQUEST_CREATED = 'verification.request.created',
  REQUEST_SUBMITTED = 'verification.request.submitted',
  REQUEST_ASSIGNED = 'verification.request.assigned',
  REQUEST_IN_PROGRESS = 'verification.request.in_progress',
  REQUEST_COMPLETED = 'verification.request.completed',
  REQUEST_CANCELLED = 'verification.request.cancelled',
  REQUEST_REJECTED = 'verification.request.rejected',

  // Customer Response Events
  CUSTOMER_ACCEPTED = 'verification.customer.accepted',
  CUSTOMER_REJECTED = 'verification.customer.rejected',

  // Payment Events
  PAYMENT_RECEIVED = 'verification.payment.received',
  PAYMENT_FAILED = 'verification.payment.failed',
  PAYMENT_REFUNDED = 'verification.payment.refunded',

  // Agent Events
  AGENT_ASSIGNED = 'verification.agent.assigned',
  AGENT_STARTED_VERIFICATION = 'verification.agent.started',
  AGENT_SUBMITTED_REPORT = 'verification.agent.submitted',

  // Reminder Events
  VERIFICATION_REMINDER = 'verification.reminder',
  PENDING_REVIEW_REMINDER = 'verification.pending_review_reminder',

  // Admin Alerts
  NEW_REQUEST_ALERT = 'admin.new_request',
  ESCALATION_ALERT = 'admin.escalation',
  HIGH_PRIORITY_ALERT = 'admin.high_priority',
}
