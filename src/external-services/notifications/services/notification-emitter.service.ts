/**
 * Notification Emitter Service
 * 
 * Provides a clean interface for emitting notification events.
 * Follows Open/Closed Principle - open for extension, closed for modification.
 * Uses NestJS EventEmitter2 for decoupled event handling.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvent } from '../events/notification-events.enum';
import {
  RequestCreatedPayload,
  RequestSubmittedPayload,
  RequestAssignedPayload,
  RequestInProgressPayload,
  RequestCompletedPayload,
  RequestCancelledPayload,
  RequestRejectedPayload,
  CustomerAcceptedPayload,
  CustomerRejectedPayload,
  PaymentReceivedPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
  AgentAssignedPayload,
  AgentSubmittedPayload,
  HighPriorityAlertPayload,
  NotificationPayload,
} from '../events/notification-payloads';

@Injectable()
export class NotificationEmitterService {
  private readonly logger = new Logger(NotificationEmitterService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.logger.log('📧 Notification Emitter Service initialized');
  }

  /**
   * Generic event emission with logging
   */
  private emit(event: NotificationEvent, payload: NotificationPayload): void {
    this.logger.log(`📤 Emitting event: ${event} for request: ${payload.requestId}`);
    this.eventEmitter.emit(event, payload);
  }

  // ============================================================================
  // Request Lifecycle Events
  // ============================================================================

  /**
   * Emit when a new verification request is created
   */
  emitRequestCreated(payload: RequestCreatedPayload): void {
    this.emit(NotificationEvent.REQUEST_CREATED, payload);
    
    // Also emit high priority alert for urgent requests
    if (payload.urgency === 'same-day' || payload.urgency === 'express') {
      this.emit(NotificationEvent.HIGH_PRIORITY_ALERT, {
        requestId: payload.requestId,
        timestamp: payload.timestamp,
        title: payload.title,
        verificationType: payload.verificationType,
        location: payload.location,
        urgency: payload.urgency as 'same-day' | 'express',
        clientId: payload.clientId,
        client: payload.client,
      } as HighPriorityAlertPayload);
    }
  }

  /**
   * Emit when a request is submitted (after payment)
   */
  emitRequestSubmitted(payload: RequestSubmittedPayload): void {
    this.emit(NotificationEvent.REQUEST_SUBMITTED, payload);
  }

  /**
   * Emit when an agent is assigned to a request
   */
  emitRequestAssigned(payload: RequestAssignedPayload): void {
    this.emit(NotificationEvent.REQUEST_ASSIGNED, payload);
    this.emit(NotificationEvent.AGENT_ASSIGNED, {
      requestId: payload.requestId,
      timestamp: payload.timestamp,
      agentId: payload.agentId,
      agent: payload.agent,
      title: payload.title,
      verificationType: payload.verificationType,
      location: payload.location,
      scheduledDate: payload.scheduledDate,
      estimatedDuration: payload.estimatedDuration,
      price: { amount: 0, currency: 'NGN' }, // Agent doesn't need to see price
    } as AgentAssignedPayload);
  }

  /**
   * Emit when verification is in progress
   */
  emitRequestInProgress(payload: RequestInProgressPayload): void {
    this.emit(NotificationEvent.REQUEST_IN_PROGRESS, payload);
  }

  /**
   * Emit when verification is completed
   */
  emitRequestCompleted(payload: RequestCompletedPayload): void {
    this.emit(NotificationEvent.REQUEST_COMPLETED, payload);
  }

  /**
   * Emit when a request is cancelled
   */
  emitRequestCancelled(payload: RequestCancelledPayload): void {
    this.emit(NotificationEvent.REQUEST_CANCELLED, payload);
  }

  /**
   * Emit when a request is rejected
   */
  emitRequestRejected(payload: RequestRejectedPayload): void {
    this.emit(NotificationEvent.REQUEST_REJECTED, payload);
  }

  // ============================================================================
  // Customer Response Events
  // ============================================================================

  /**
   * Emit when customer accepts verification
   */
  emitCustomerAccepted(payload: CustomerAcceptedPayload): void {
    this.emit(NotificationEvent.CUSTOMER_ACCEPTED, payload);
  }

  /**
   * Emit when customer rejects verification
   */
  emitCustomerRejected(payload: CustomerRejectedPayload): void {
    this.emit(NotificationEvent.CUSTOMER_REJECTED, payload);
  }

  // ============================================================================
  // Payment Events
  // ============================================================================

  /**
   * Emit when payment is received
   */
  emitPaymentReceived(payload: PaymentReceivedPayload): void {
    this.emit(NotificationEvent.PAYMENT_RECEIVED, payload);
  }

  /**
   * Emit when payment fails
   */
  emitPaymentFailed(payload: PaymentFailedPayload): void {
    this.emit(NotificationEvent.PAYMENT_FAILED, payload);
  }

  /**
   * Emit when payment is refunded
   */
  emitPaymentRefunded(payload: PaymentRefundedPayload): void {
    this.emit(NotificationEvent.PAYMENT_REFUNDED, payload);
  }

  // ============================================================================
  // Agent Events
  // ============================================================================

  /**
   * Emit when agent submits verification report
   */
  emitAgentSubmittedReport(payload: AgentSubmittedPayload): void {
    this.emit(NotificationEvent.AGENT_SUBMITTED_REPORT, payload);
  }
}
