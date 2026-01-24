/**
 * Email Template Service
 * 
 * Centralized email template rendering service.
 * Follows Single Responsibility Principle - only handles template rendering.
 * Uses Handlebars for templating with reusable base layouts.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
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
  AgentSubmittedPayload,
  HighPriorityAlertPayload,
} from '../events/notification-payloads';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly appUrl: string;
  private readonly supportEmail: string;
  private readonly companyName: string;

  constructor(private readonly configService: ConfigService) {
    this.appUrl = this.configService.get<string>('APP_URL', 'https://checkit24.com');
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL', 'support@checkit24.com');
    this.companyName = this.configService.get<string>('COMPANY_NAME', 'CheckIT24');

    // Register Handlebars helpers
    this.registerHelpers();
    this.logger.log('📧 Email Template Service initialized');
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-NG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'NGN') => {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    });

    Handlebars.registerHelper('urgencyBadge', (urgency: string) => {
      const colors: Record<string, string> = {
        'same-day': '#dc2626',
        'express': '#ea580c',
        'standard': '#16a34a',
        'flexible': '#2563eb',
      };
      const color = colors[urgency] || '#6b7280';
      return `<span style="background-color: ${color}; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${urgency}</span>`;
    });
  }

  /**
   * Base email layout wrapper
   */
  private wrapInLayout(content: string, title: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; }
    .header img { max-width: 150px; height: auto; }
    .header h1 { color: #ffffff; margin: 15px 0 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; }
    .info-box { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 14px; }
    .info-value { color: #1e293b; font-weight: 600; font-size: 14px; }
    .button { display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .footer { background-color: #1e293b; color: #94a3b8; padding: 25px; text-align: center; font-size: 12px; }
    .footer a { color: #60a5fa; text-decoration: none; }
    .alert-box { padding: 15px; border-radius: 8px; margin: 20px 0; }
    .alert-success { background-color: #dcfce7; border: 1px solid #16a34a; color: #166534; }
    .alert-warning { background-color: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }
    .alert-error { background-color: #fee2e2; border: 1px solid #dc2626; color: #991b1b; }
    .alert-info { background-color: #dbeafe; border: 1px solid #3b82f6; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 ${this.companyName}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.</p>
      <p>
        <a href="${this.appUrl}">Visit Website</a> | 
        <a href="mailto:${this.supportEmail}">Contact Support</a>
      </p>
      <p style="margin-top: 15px; font-size: 11px;">
        This email was sent by ${this.companyName}. 
        If you didn't expect this email, please contact our support team.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  // ============================================================================
  // Admin Email Templates
  // ============================================================================

  renderAdminNewRequest(payload: RequestCreatedPayload): string {
    const content = `
      <h2>🆕 New Verification Request</h2>
      <p>A new verification request has been submitted and is awaiting processing.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name} (${payload.client.email})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Urgency</span>
          <span class="info-value">${payload.urgency}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}, ${payload.location.city}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Price</span>
          <span class="info-value">₦${payload.price.amount.toLocaleString()}</span>
        </div>
      </div>
      
      <p><strong>Description:</strong></p>
      <p style="background-color: #f1f5f9; padding: 15px; border-radius: 8px;">${payload.description}</p>
      
      <center>
        <a href="${this.appUrl}/admin/requests/${payload.requestId}" class="button">View Request</a>
      </center>
    `;
    return this.wrapInLayout(content, 'New Verification Request');
  }

  renderAdminRequestSubmitted(payload: RequestSubmittedPayload): string {
    const content = `
      <h2>💰 Payment Received - Request Ready for Assignment</h2>
      <div class="alert-box alert-success">
        <strong>✅ Payment Confirmed!</strong> This request is ready to be assigned to an agent.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Urgency</span>
          <span class="info-value">${payload.urgency}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount Paid</span>
          <span class="info-value">₦${payload.price.amount.toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Ref</span>
          <span class="info-value">${payload.paymentReference || 'N/A'}</span>
        </div>
      </div>
      
      <center>
        <a href="${this.appUrl}/admin/requests/${payload.requestId}/assign" class="button">Assign Agent</a>
      </center>
    `;
    return this.wrapInLayout(content, 'Request Ready for Assignment');
  }

  renderAdminVerificationComplete(payload: RequestCompletedPayload): string {
    const content = `
      <h2>✅ Verification Completed</h2>
      <div class="alert-box alert-success">
        <strong>Verification completed successfully!</strong>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Agent</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed At</span>
          <span class="info-value">${new Date(payload.completedAt).toLocaleString()}</span>
        </div>
      </div>
      
      ${payload.notes ? `<p><strong>Agent Notes:</strong></p><p style="background-color: #f1f5f9; padding: 15px; border-radius: 8px;">${payload.notes}</p>` : ''}
      
      <center>
        <a href="${this.appUrl}/admin/requests/${payload.requestId}" class="button">View Report</a>
      </center>
    `;
    return this.wrapInLayout(content, 'Verification Complete');
  }

  renderAdminRequestCancelled(payload: RequestCancelledPayload): string {
    const content = `
      <h2>❌ Request Cancelled</h2>
      <div class="alert-box alert-warning">
        <strong>Request cancelled by ${payload.cancelledBy}.</strong>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cancelled By</span>
          <span class="info-value">${payload.cancelledBy}</span>
        </div>
      </div>
      
      <p><strong>Reason:</strong></p>
      <p style="background-color: #fef3c7; padding: 15px; border-radius: 8px;">${payload.reason}</p>
    `;
    return this.wrapInLayout(content, 'Request Cancelled');
  }

  renderAdminCustomerAccepted(payload: CustomerAcceptedPayload): string {
    const content = `
      <h2>👍 Customer Accepted Verification</h2>
      <div class="alert-box alert-success">
        <strong>Great news!</strong> The customer has accepted the verification result.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Agent</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Accepted At</span>
          <span class="info-value">${new Date(payload.acceptedAt).toLocaleString()}</span>
        </div>
      </div>
    `;
    return this.wrapInLayout(content, 'Customer Accepted Verification');
  }

  renderAdminCustomerRejected(payload: CustomerRejectedPayload): string {
    const content = `
      <h2>⚠️ Customer Rejected Verification</h2>
      <div class="alert-box alert-error">
        <strong>Attention Required!</strong> The customer has rejected the verification result.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Agent</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
      </div>
      
      <p><strong>Rejection Reason:</strong></p>
      <p style="background-color: #fee2e2; padding: 15px; border-radius: 8px;">${payload.reason}</p>
      
      ${payload.notes ? `<p><strong>Additional Notes:</strong></p><p style="background-color: #f1f5f9; padding: 15px; border-radius: 8px;">${payload.notes}</p>` : ''}
      
      <center>
        <a href="${this.appUrl}/admin/requests/${payload.requestId}" class="button">Review Case</a>
      </center>
    `;
    return this.wrapInLayout(content, 'Customer Rejected Verification');
  }

  renderAdminReportSubmitted(payload: AgentSubmittedPayload): string {
    const content = `
      <h2>📋 Verification Report Submitted</h2>
      <div class="alert-box alert-info">
        <strong>New Report!</strong> Agent has submitted a verification report.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Agent</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed At</span>
          <span class="info-value">${new Date(payload.completedAt).toLocaleString()}</span>
        </div>
      </div>
      
      <center>
        <a href="${this.appUrl}/admin/requests/${payload.requestId}/report" class="button">Review Report</a>
      </center>
    `;
    return this.wrapInLayout(content, 'Verification Report Submitted');
  }

  renderHighPriorityAlert(payload: HighPriorityAlertPayload): string {
    const content = `
      <h2>🚨 HIGH PRIORITY REQUEST</h2>
      <div class="alert-box alert-error">
        <strong>Urgent Attention Required!</strong> A ${payload.urgency} verification request needs immediate assignment.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Urgency</span>
          <span class="info-value" style="color: #dc2626; font-weight: bold;">${payload.urgency.toUpperCase()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}, ${payload.location.city}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
      </div>
      
      <center>
        <a href="${this.appUrl}/admin/requests/${payload.requestId}/assign" class="button" style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">Assign Now</a>
      </center>
    `;
    return this.wrapInLayout(content, 'HIGH PRIORITY REQUEST');
  }

  // ============================================================================
  // Client Email Templates
  // ============================================================================

  renderClientRequestConfirmation(payload: RequestCreatedPayload): string {
    const content = `
      <h2>✅ Request Received</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Thank you for submitting your verification request. We have received your request and it's being processed.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}, ${payload.location.city}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Estimated Price</span>
          <span class="info-value">₦${payload.price.amount.toLocaleString()}</span>
        </div>
      </div>
      
      <div class="alert-box alert-info">
        <strong>Next Steps:</strong> Complete payment to proceed with your verification request.
      </div>
      
      <center>
        <a href="${this.appUrl}/dashboard/requests/${payload.requestId}" class="button">View Request</a>
      </center>
      
      <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Request Received');
  }

  renderClientSubmissionConfirmation(payload: RequestSubmittedPayload): string {
    const content = `
      <h2>✅ Payment Confirmed - Request Submitted</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Great news! Your payment has been confirmed and your verification request is now being processed.</p>
      
      <div class="alert-box alert-success">
        <strong>Payment Successful!</strong> We're now assigning a verified agent to your request.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount Paid</span>
          <span class="info-value">₦${payload.price.amount.toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Reference</span>
          <span class="info-value">${payload.paymentReference || 'N/A'}</span>
        </div>
      </div>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>We'll assign a qualified agent to your request</li>
        <li>You'll receive an email when an agent is assigned</li>
        <li>The agent will conduct the verification</li>
        <li>You'll receive the verification report</li>
      </ul>
      
      <center>
        <a href="${this.appUrl}/dashboard/requests/${payload.requestId}" class="button">Track Request</a>
      </center>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Payment Confirmed');
  }

  renderClientAgentAssigned(payload: RequestAssignedPayload): string {
    const content = `
      <h2>👤 Agent Assigned</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Great news! An agent has been assigned to your verification request and will begin shortly.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Agent Name</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}</span>
        </div>
        ${payload.scheduledDate ? `
        <div class="info-row">
          <span class="info-label">Scheduled For</span>
          <span class="info-value">${new Date(payload.scheduledDate).toLocaleString()}</span>
        </div>
        ` : ''}
      </div>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-weight: 500;">
          ⏱️ You can expect updates within the next 24 hours as per our service agreement.
        </p>
      </div>
      
      <p>You'll receive notifications as the verification progresses.</p>
      
      <center>
        <a href="${this.appUrl}/dashboard/requests/${payload.requestId}" class="button">View Request Details</a>
      </center>
      
      <p>If you have any questions or concerns, please contact us immediately.</p>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Agent Assigned');
  }

  renderClientVerificationStarted(payload: RequestInProgressPayload): string {
    const content = `
      <h2>🔄 Verification In Progress</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Your verification is now in progress. ${payload.agent.name} has started the verification process.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Started At</span>
          <span class="info-value">${new Date(payload.startedAt).toLocaleString()}</span>
        </div>
      </div>
      
      <p>You'll be notified once the verification is complete.</p>
      
      <center>
        <a href="${this.appUrl}/dashboard/requests/${payload.requestId}" class="button">View Status</a>
      </center>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Verification In Progress');
  }

  renderClientVerificationComplete(payload: RequestCompletedPayload): string {
    const content = `
      <h2>✅ Verification Complete!</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Great news! Your verification has been completed successfully. The report is now available for your review.</p>
      
      <div class="alert-box alert-success">
        <strong>Verification Complete!</strong> Please review the report and let us know if you have any questions.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed By</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed At</span>
          <span class="info-value">${new Date(payload.completedAt).toLocaleString()}</span>
        </div>
      </div>
      
      <center>
        <a href="${this.appUrl}/dashboard/requests/${payload.requestId}/report" class="button">View Report</a>
      </center>
      
      <p style="margin-top: 20px;">Please review the report and confirm if everything is satisfactory.</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Verification Complete');
  }

  renderClientRequestCancelled(payload: RequestCancelledPayload): string {
    const content = `
      <h2>❌ Request Cancelled</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Your verification request has been cancelled.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reason</span>
          <span class="info-value">${payload.reason}</span>
        </div>
      </div>
      
      <p>If you have any questions about this cancellation or would like to submit a new request, please contact us.</p>
      
      <center>
        <a href="${this.appUrl}/dashboard" class="button">Go to Dashboard</a>
      </center>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Request Cancelled');
  }

  renderClientRequestRejected(payload: RequestRejectedPayload): string {
    const content = `
      <h2>⚠️ Request Rejected</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Unfortunately, your verification request could not be processed.</p>
      
      <div class="alert-box alert-warning">
        <strong>Request Rejected</strong>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reason</span>
          <span class="info-value">${payload.reason}</span>
        </div>
      </div>
      
      <p>If you believe this was an error or have questions, please contact our support team.</p>
      
      <center>
        <a href="mailto:${this.supportEmail}" class="button">Contact Support</a>
      </center>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Request Rejected');
  }

  renderClientReportReady(payload: AgentSubmittedPayload): string {
    const content = `
      <h2>📋 Verification Report Ready</h2>
      <p>Dear ${payload.client.name},</p>
      <p>The verification report for your request is now ready for your review.</p>
      
      <div class="alert-box alert-info">
        <strong>Report Available!</strong> Please review and accept or provide feedback.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Verified By</span>
          <span class="info-value">${payload.agent.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Completed At</span>
          <span class="info-value">${new Date(payload.completedAt).toLocaleString()}</span>
        </div>
      </div>
      
      <center>
        <a href="${this.appUrl}/dashboard/requests/${payload.requestId}/report" class="button">Review Report</a>
      </center>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Report Ready');
  }

  // ============================================================================
  // Agent Email Templates
  // ============================================================================

  renderAgentAssignment(payload: RequestAssignedPayload): string {
    const content = `
      <h2>🎯 New Assignment</h2>
      <p>Dear ${payload.agent.name},</p>
      <p>You have been assigned a new verification request. Please review the details below.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Location</span>
          <span class="info-value">${payload.location.address}, ${payload.location.city}</span>
        </div>
        ${payload.location.area ? `
        <div class="info-row">
          <span class="info-label">Area</span>
          <span class="info-value">${payload.location.area}</span>
        </div>
        ` : ''}
        ${payload.scheduledDate ? `
        <div class="info-row">
          <span class="info-label">Scheduled For</span>
          <span class="info-value">${new Date(payload.scheduledDate).toLocaleString()}</span>
        </div>
        ` : ''}
        ${payload.estimatedDuration ? `
        <div class="info-row">
          <span class="info-label">Estimated Duration</span>
          <span class="info-value">${payload.estimatedDuration}</span>
        </div>
        ` : ''}
      </div>
      
      <center>
        <a href="${this.appUrl}/agent/assignments/${payload.requestId}" class="button">View Assignment</a>
      </center>
      
      <p style="margin-top: 20px;">Please acknowledge and start this verification as soon as possible.</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'New Assignment');
  }

  renderAgentAssignmentCancelled(payload: RequestCancelledPayload): string {
    const content = `
      <h2>❌ Assignment Cancelled</h2>
      <p>Dear ${payload.agent?.name || 'Agent'},</p>
      <p>The following assignment has been cancelled.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reason</span>
          <span class="info-value">${payload.reason}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cancelled By</span>
          <span class="info-value">${payload.cancelledBy}</span>
        </div>
      </div>
      
      <p>No further action is required from your side.</p>
      
      <center>
        <a href="${this.appUrl}/agent/dashboard" class="button">Go to Dashboard</a>
      </center>
      
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Assignment Cancelled');
  }

  renderAgentCustomerAccepted(payload: CustomerAcceptedPayload): string {
    const content = `
      <h2>👍 Customer Accepted Your Verification</h2>
      <p>Dear ${payload.agent.name},</p>
      <p>Great job! The customer has accepted your verification report.</p>
      
      <div class="alert-box alert-success">
        <strong>Well done!</strong> Your verification work has been approved.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Type</span>
          <span class="info-value">${payload.verificationType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
      </div>
      
      <p>Thank you for your excellent work!</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Verification Accepted');
  }

  renderAgentCustomerRejected(payload: CustomerRejectedPayload): string {
    const content = `
      <h2>⚠️ Customer Rejected Verification</h2>
      <p>Dear ${payload.agent.name},</p>
      <p>The customer has rejected the verification report. Please review their feedback.</p>
      
      <div class="alert-box alert-warning">
        <strong>Action Required</strong> - Please review the rejection reason.
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Client</span>
          <span class="info-value">${payload.client.name}</span>
        </div>
      </div>
      
      <p><strong>Rejection Reason:</strong></p>
      <p style="background-color: #fee2e2; padding: 15px; border-radius: 8px;">${payload.reason}</p>
      
      ${payload.notes ? `<p><strong>Additional Notes:</strong></p><p style="background-color: #f1f5f9; padding: 15px; border-radius: 8px;">${payload.notes}</p>` : ''}
      
      <p>An admin will review this case and may contact you for follow-up.</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Verification Rejected');
  }

  // ============================================================================
  // Payment Templates
  // ============================================================================

  renderPaymentReceipt(payload: PaymentReceivedPayload): string {
    const content = `
      <h2>💳 Payment Receipt</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Thank you for your payment. Here is your receipt.</p>
      
      <div class="alert-box alert-success">
        <strong>Payment Successful!</strong>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount</span>
          <span class="info-value">₦${payload.amount.toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Reference</span>
          <span class="info-value">${payload.paymentReference}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Method</span>
          <span class="info-value">${payload.paymentMethod}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${new Date(payload.timestamp).toLocaleString()}</span>
        </div>
      </div>
      
      <p>Your request is now being processed.</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Payment Receipt');
  }

  renderAdminPaymentNotification(payload: PaymentReceivedPayload): string {
    const content = `
      <h2>💰 New Payment Received</h2>
      <p>A payment has been received for a verification request.</p>
      
      <div class="alert-box alert-success">
        <strong>Payment Confirmed!</strong>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request Title</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Request ID</span>
          <span class="info-value">${payload.requestId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Customer</span>
          <span class="info-value">${payload.client.name} (${payload.client.email})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount</span>
          <span class="info-value"><strong>₦${payload.amount.toLocaleString()}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Reference</span>
          <span class="info-value">${payload.paymentReference}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Method</span>
          <span class="info-value">${payload.paymentMethod}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date & Time</span>
          <span class="info-value">${new Date(payload.timestamp).toLocaleString()}</span>
        </div>
      </div>
      
      <p>The request status has been updated to <strong>SUBMITTED</strong> and is now ready for agent assignment.</p>
    `;
    return this.wrapInLayout(content, 'Payment Received');
  }

  renderPaymentFailed(payload: PaymentFailedPayload): string {
    const content = `
      <h2>❌ Payment Failed</h2>
      <p>Dear ${payload.client.name},</p>
      <p>Unfortunately, your payment could not be processed.</p>
      
      <div class="alert-box alert-error">
        <strong>Payment Failed</strong> - ${payload.reason}
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Request</span>
          <span class="info-value">${payload.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount</span>
          <span class="info-value">₦${payload.amount.toLocaleString()}</span>
        </div>
      </div>
      
      <p>Please try again or use a different payment method.</p>
      
      ${payload.retryUrl ? `
      <center>
        <a href="${payload.retryUrl}" class="button">Retry Payment</a>
      </center>
      ` : ''}
      
      <p>If you continue to experience issues, please contact our support team.</p>
      <p>Best regards,<br>The ${this.companyName} Team</p>
    `;
    return this.wrapInLayout(content, 'Payment Failed');
  }
}
