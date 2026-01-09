/**
 * Notification Event Payloads
 * 
 * Type-safe event payload definitions for all notification events.
 * Follows Interface Segregation Principle - specific interfaces for each event type.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

// Base payload interface
export interface BaseNotificationPayload {
  requestId: string;
  timestamp: Date;
}

// User information for notifications
export interface NotificationRecipient {
  email: string;
  name: string;
  phone?: string;
}

// Location information
export interface LocationInfo {
  address: string;
  city: string;
  area?: string;
}

// Price information
export interface PriceInfo {
  amount: number;
  currency: string;
}

// ============================================================================
// Request Lifecycle Payloads
// ============================================================================

export interface RequestCreatedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  description: string;
  verificationType: string;
  urgency: string;
  location: LocationInfo;
  price: PriceInfo;
  scheduledDate?: Date;
}

export interface RequestSubmittedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  verificationType: string;
  urgency: string;
  location: LocationInfo;
  price: PriceInfo;
  paymentReference?: string;
}

export interface RequestAssignedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  verificationType: string;
  location: LocationInfo;
  scheduledDate?: Date;
  estimatedDuration?: string;
}

export interface RequestInProgressPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  location: LocationInfo;
  startedAt: Date;
}

export interface RequestCompletedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  verificationType: string;
  location: LocationInfo;
  completedAt: Date;
  notes?: string;
}

export interface RequestCancelledPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId?: string;
  agent?: NotificationRecipient;
  title: string;
  reason: string;
  cancelledBy: 'client' | 'admin' | 'system';
}

export interface RequestRejectedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId?: string;
  agent?: NotificationRecipient;
  title: string;
  reason: string;
  rejectedBy: 'admin' | 'agent';
}

// ============================================================================
// Customer Response Payloads
// ============================================================================

export interface CustomerAcceptedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  verificationType: string;
  acceptedAt: Date;
}

export interface CustomerRejectedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  verificationType: string;
  reason: string;
  notes?: string;
  rejectedAt: Date;
}

// ============================================================================
// Payment Payloads
// ============================================================================

export interface PaymentReceivedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  amount: number;
  currency: string;
  paymentReference: string;
  paymentMethod: string;
}

export interface PaymentFailedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  amount: number;
  currency: string;
  reason: string;
  retryUrl?: string;
}

export interface PaymentRefundedPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  amount: number;
  currency: string;
  reason: string;
  refundReference: string;
}

// ============================================================================
// Agent Payloads
// ============================================================================

export interface AgentAssignedPayload extends BaseNotificationPayload {
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  verificationType: string;
  location: LocationInfo;
  scheduledDate?: Date;
  estimatedDuration?: string;
  price: PriceInfo;
  specialInstructions?: string;
}

export interface AgentStartedPayload extends BaseNotificationPayload {
  agentId: string;
  agent: NotificationRecipient;
  clientId: string;
  client: NotificationRecipient;
  title: string;
  location: LocationInfo;
  startedAt: Date;
}

export interface AgentSubmittedPayload extends BaseNotificationPayload {
  agentId: string;
  agent: NotificationRecipient;
  clientId: string;
  client: NotificationRecipient;
  title: string;
  verificationType: string;
  completedAt: Date;
  notes?: string;
}

// ============================================================================
// Reminder Payloads
// ============================================================================

export interface VerificationReminderPayload extends BaseNotificationPayload {
  agentId: string;
  agent: NotificationRecipient;
  title: string;
  location: LocationInfo;
  scheduledDate: Date;
  hoursUntilDeadline: number;
}

export interface PendingReviewReminderPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  completedAt: Date;
  daysSinceCompletion: number;
}

// ============================================================================
// Admin Alert Payloads
// ============================================================================

export interface NewRequestAlertPayload extends BaseNotificationPayload {
  clientId: string;
  client: NotificationRecipient;
  title: string;
  verificationType: string;
  urgency: string;
  location: LocationInfo;
  price: PriceInfo;
}

export interface EscalationAlertPayload extends BaseNotificationPayload {
  title: string;
  reason: string;
  urgencyLevel: 'normal' | 'high' | 'critical';
  clientId: string;
  client: NotificationRecipient;
  agentId?: string;
  agent?: NotificationRecipient;
}

export interface HighPriorityAlertPayload extends BaseNotificationPayload {
  title: string;
  verificationType: string;
  location: LocationInfo;
  urgency: 'same-day' | 'express';
  clientId: string;
  client: NotificationRecipient;
}

// ============================================================================
// Union type for all payloads
// ============================================================================

export type NotificationPayload =
  | RequestCreatedPayload
  | RequestSubmittedPayload
  | RequestAssignedPayload
  | RequestInProgressPayload
  | RequestCompletedPayload
  | RequestCancelledPayload
  | RequestRejectedPayload
  | CustomerAcceptedPayload
  | CustomerRejectedPayload
  | PaymentReceivedPayload
  | PaymentFailedPayload
  | PaymentRefundedPayload
  | AgentAssignedPayload
  | AgentStartedPayload
  | AgentSubmittedPayload
  | VerificationReminderPayload
  | PendingReviewReminderPayload
  | NewRequestAlertPayload
  | EscalationAlertPayload
  | HighPriorityAlertPayload;
