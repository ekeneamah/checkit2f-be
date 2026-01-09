/**
 * Verification Notification Service
 * 
 * Centralized service for handling all verification-related email notifications.
 * Implements Single Responsibility Principle - handles only notification logic.
 * Uses Dependency Injection for EmailService (following Dependency Inversion Principle).
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
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
  AgentAssignedPayload,
  AgentSubmittedPayload,
  HighPriorityAlertPayload,
  NotificationRecipient,
} from '../events/notification-payloads';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class VerificationNotificationService {
  private readonly logger = new Logger(VerificationNotificationService.name);
  private readonly adminEmails: string[];
  private readonly appUrl: string;
  private readonly supportEmail: string;

  constructor(
    private readonly emailService: EmailService,
    private readonly templateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {
    this.adminEmails = this.getAdminEmails();
    this.appUrl = this.configService.get<string>('APP_URL', 'https://checkit24.com');
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL', 'support@checkit24.com');
    this.logger.log('📧 Verification Notification Service initialized');
  }

  /**
   * Get admin email addresses from configuration
   */
  private getAdminEmails(): string[] {
    const adminEmailsConfig = this.configService.get<string>('ADMIN_NOTIFICATION_EMAILS', '');
    return adminEmailsConfig
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }

  // ============================================================================
  // Request Lifecycle Event Handlers
  // ============================================================================

  /**
   * Handle new request created - Notify admin
   */
  @OnEvent(NotificationEvent.REQUEST_CREATED)
  async handleRequestCreated(payload: RequestCreatedPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_CREATED event for request: ${payload.requestId}`);

    try {
      // Notify admin about new request
      await this.notifyAdmins({
        subject: `🆕 New Verification Request: ${payload.title}`,
        html: this.templateService.renderAdminNewRequest(payload),
        templateData: payload,
      });

      // Send confirmation to client
      await this.sendToRecipient(payload.client, {
        subject: `✅ Request Received: ${payload.title}`,
        html: this.templateService.renderClientRequestConfirmation(payload),
      });

      this.logger.log(`✅ REQUEST_CREATED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_CREATED notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle request submitted (after payment) - Notify admin
   */
  @OnEvent(NotificationEvent.REQUEST_SUBMITTED)
  async handleRequestSubmitted(payload: RequestSubmittedPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_SUBMITTED event for request: ${payload.requestId}`);

    try {
      // Notify admin that request is ready for assignment
      await this.notifyAdmins({
        subject: `💰 Paid & Ready: ${payload.title}`,
        html: this.templateService.renderAdminRequestSubmitted(payload),
        templateData: payload,
      });

      // Confirm submission to client
      await this.sendToRecipient(payload.client, {
        subject: `✅ Payment Confirmed - Request Submitted: ${payload.title}`,
        html: this.templateService.renderClientSubmissionConfirmation(payload),
      });

      this.logger.log(`✅ REQUEST_SUBMITTED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_SUBMITTED notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle request assigned to agent - Notify agent and client
   */
  @OnEvent(NotificationEvent.REQUEST_ASSIGNED)
  async handleRequestAssigned(payload: RequestAssignedPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_ASSIGNED event for request: ${payload.requestId}`);

    try {
      // Notify agent about new assignment
      await this.sendToRecipient(payload.agent, {
        subject: `🎯 New Assignment: ${payload.title}`,
        html: this.templateService.renderAgentAssignment(payload),
      });

      // Notify client that agent has been assigned
      await this.sendToRecipient(payload.client, {
        subject: `👤 Agent Assigned: ${payload.title}`,
        html: this.templateService.renderClientAgentAssigned(payload),
      });

      this.logger.log(`✅ REQUEST_ASSIGNED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_ASSIGNED notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle verification in progress - Notify client
   */
  @OnEvent(NotificationEvent.REQUEST_IN_PROGRESS)
  async handleRequestInProgress(payload: RequestInProgressPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_IN_PROGRESS event for request: ${payload.requestId}`);

    try {
      await this.sendToRecipient(payload.client, {
        subject: `🔄 Verification Started: ${payload.title}`,
        html: this.templateService.renderClientVerificationStarted(payload),
      });

      this.logger.log(`✅ REQUEST_IN_PROGRESS notification sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_IN_PROGRESS notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle verification completed - Notify admin and client
   */
  @OnEvent(NotificationEvent.REQUEST_COMPLETED)
  async handleRequestCompleted(payload: RequestCompletedPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_COMPLETED event for request: ${payload.requestId}`);

    try {
      // Notify admin about completion
      await this.notifyAdmins({
        subject: `✅ Verification Complete: ${payload.title}`,
        html: this.templateService.renderAdminVerificationComplete(payload),
        templateData: payload,
      });

      // Notify client about completion
      await this.sendToRecipient(payload.client, {
        subject: `✅ Verification Complete: ${payload.title}`,
        html: this.templateService.renderClientVerificationComplete(payload),
      });

      this.logger.log(`✅ REQUEST_COMPLETED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_COMPLETED notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle request cancelled
   */
  @OnEvent(NotificationEvent.REQUEST_CANCELLED)
  async handleRequestCancelled(payload: RequestCancelledPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_CANCELLED event for request: ${payload.requestId}`);

    try {
      // Notify client about cancellation
      await this.sendToRecipient(payload.client, {
        subject: `❌ Request Cancelled: ${payload.title}`,
        html: this.templateService.renderClientRequestCancelled(payload),
      });

      // Notify agent if assigned
      if (payload.agent) {
        await this.sendToRecipient(payload.agent, {
          subject: `❌ Assignment Cancelled: ${payload.title}`,
          html: this.templateService.renderAgentAssignmentCancelled(payload),
        });
      }

      // Notify admin
      await this.notifyAdmins({
        subject: `❌ Request Cancelled: ${payload.title}`,
        html: this.templateService.renderAdminRequestCancelled(payload),
        templateData: payload,
      });

      this.logger.log(`✅ REQUEST_CANCELLED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_CANCELLED notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle request rejected
   */
  @OnEvent(NotificationEvent.REQUEST_REJECTED)
  async handleRequestRejected(payload: RequestRejectedPayload): Promise<void> {
    this.logger.log(`📧 Handling REQUEST_REJECTED event for request: ${payload.requestId}`);

    try {
      // Notify client about rejection
      await this.sendToRecipient(payload.client, {
        subject: `⚠️ Request Rejected: ${payload.title}`,
        html: this.templateService.renderClientRequestRejected(payload),
      });

      this.logger.log(`✅ REQUEST_REJECTED notification sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send REQUEST_REJECTED notification: ${error.message}`, error.stack);
    }
  }

  // ============================================================================
  // Customer Response Event Handlers
  // ============================================================================

  /**
   * Handle customer accepted verification
   */
  @OnEvent(NotificationEvent.CUSTOMER_ACCEPTED)
  async handleCustomerAccepted(payload: CustomerAcceptedPayload): Promise<void> {
    this.logger.log(`📧 Handling CUSTOMER_ACCEPTED event for request: ${payload.requestId}`);

    try {
      // Notify admin that customer accepted
      await this.notifyAdmins({
        subject: `👍 Customer Accepted: ${payload.title}`,
        html: this.templateService.renderAdminCustomerAccepted(payload),
        templateData: payload,
      });

      // Notify agent that customer accepted
      await this.sendToRecipient(payload.agent, {
        subject: `👍 Customer Accepted Your Verification: ${payload.title}`,
        html: this.templateService.renderAgentCustomerAccepted(payload),
      });

      this.logger.log(`✅ CUSTOMER_ACCEPTED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send CUSTOMER_ACCEPTED notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle customer rejected verification
   */
  @OnEvent(NotificationEvent.CUSTOMER_REJECTED)
  async handleCustomerRejected(payload: CustomerRejectedPayload): Promise<void> {
    this.logger.log(`📧 Handling CUSTOMER_REJECTED event for request: ${payload.requestId}`);

    try {
      // Notify admin about rejection - needs attention
      await this.notifyAdmins({
        subject: `⚠️ Customer Rejected: ${payload.title}`,
        html: this.templateService.renderAdminCustomerRejected(payload),
        templateData: payload,
      });

      // Notify agent about customer rejection
      await this.sendToRecipient(payload.agent, {
        subject: `⚠️ Customer Rejected Verification: ${payload.title}`,
        html: this.templateService.renderAgentCustomerRejected(payload),
      });

      this.logger.log(`✅ CUSTOMER_REJECTED notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send CUSTOMER_REJECTED notifications: ${error.message}`, error.stack);
    }
  }

  // ============================================================================
  // Payment Event Handlers
  // ============================================================================

  /**
   * Handle payment received
   */
  @OnEvent(NotificationEvent.PAYMENT_RECEIVED)
  async handlePaymentReceived(payload: PaymentReceivedPayload): Promise<void> {
    this.logger.log(`📧 Handling PAYMENT_RECEIVED event for request: ${payload.requestId}`);

    try {
      // Send receipt to client
      await this.sendToRecipient(payload.client, {
        subject: `💳 Payment Receipt: ${payload.title}`,
        html: this.templateService.renderPaymentReceipt(payload),
      });

      // Notify admin about the payment
      await this.notifyAdmins({
        subject: `💰 Payment Received: ${payload.title} - ₦${payload.amount.toLocaleString()}`,
        html: this.templateService.renderAdminPaymentNotification(payload),
      });

      this.logger.log(`✅ PAYMENT_RECEIVED notification sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send PAYMENT_RECEIVED notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle payment failed
   */
  @OnEvent(NotificationEvent.PAYMENT_FAILED)
  async handlePaymentFailed(payload: PaymentFailedPayload): Promise<void> {
    this.logger.log(`📧 Handling PAYMENT_FAILED event for request: ${payload.requestId}`);

    try {
      // Notify client about payment failure
      await this.sendToRecipient(payload.client, {
        subject: `❌ Payment Failed: ${payload.title}`,
        html: this.templateService.renderPaymentFailed(payload),
      });

      this.logger.log(`✅ PAYMENT_FAILED notification sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send PAYMENT_FAILED notification: ${error.message}`, error.stack);
    }
  }

  // ============================================================================
  // Agent Event Handlers
  // ============================================================================

  /**
   * Handle agent submitted report - Notify admin and client
   */
  @OnEvent(NotificationEvent.AGENT_SUBMITTED_REPORT)
  async handleAgentSubmitted(payload: AgentSubmittedPayload): Promise<void> {
    this.logger.log(`📧 Handling AGENT_SUBMITTED_REPORT event for request: ${payload.requestId}`);

    try {
      // Notify admin about new report
      await this.notifyAdmins({
        subject: `📋 Report Submitted: ${payload.title}`,
        html: this.templateService.renderAdminReportSubmitted(payload),
        templateData: payload,
      });

      // Notify client that report is ready for review
      await this.sendToRecipient(payload.client, {
        subject: `📋 Verification Report Ready: ${payload.title}`,
        html: this.templateService.renderClientReportReady(payload),
      });

      this.logger.log(`✅ AGENT_SUBMITTED_REPORT notifications sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send AGENT_SUBMITTED_REPORT notifications: ${error.message}`, error.stack);
    }
  }

  // ============================================================================
  // Admin Alert Handlers
  // ============================================================================

  /**
   * Handle high priority request alert
   */
  @OnEvent(NotificationEvent.HIGH_PRIORITY_ALERT)
  async handleHighPriorityAlert(payload: HighPriorityAlertPayload): Promise<void> {
    this.logger.log(`📧 Handling HIGH_PRIORITY_ALERT event for request: ${payload.requestId}`);

    try {
      await this.notifyAdmins({
        subject: `🚨 HIGH PRIORITY: ${payload.title} - ${payload.urgency}`,
        html: this.templateService.renderHighPriorityAlert(payload),
        templateData: payload,
      });

      this.logger.log(`✅ HIGH_PRIORITY_ALERT notification sent for: ${payload.requestId}`);
    } catch (error) {
      this.logger.error(`Failed to send HIGH_PRIORITY_ALERT notification: ${error.message}`, error.stack);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Send email to a specific recipient
   */
  private async sendToRecipient(
    recipient: NotificationRecipient,
    options: { subject: string; html: string },
  ): Promise<void> {
    if (!recipient.email) {
      this.logger.warn(`No email address for recipient: ${recipient.name}`);
      return;
    }

    await this.emailService.sendEmail({
      to: { email: recipient.email, name: recipient.name },
      subject: options.subject,
      htmlContent: options.html,
    });
  }

  /**
   * Send notification to all admin emails
   */
  private async notifyAdmins(options: {
    subject: string;
    html: string;
    templateData?: any;
  }): Promise<void> {
    if (this.adminEmails.length === 0) {
      this.logger.warn('No admin emails configured for notifications');
      return;
    }

    const recipients = this.adminEmails.map(email => ({
      email,
      name: 'Admin',
    }));

    await this.emailService.sendEmail({
      to: recipients,
      subject: options.subject,
      htmlContent: options.html,
    });
  }
}
