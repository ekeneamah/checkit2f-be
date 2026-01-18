/**
 * KYC Notification Service
 * Handles all SMS and Email notification operations for KYC workflow
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMSService } from '@/external-services/notifications/sms/sms.service';
import { EmailService } from '@/external-services/notifications/email/email.service';
import { KycRequest } from '../../domain';

/**
 * SMS Template Keys for KYC workflow
 */
export enum KycSmsTemplate {
  // Phase 1: Request Initiation
  CONFIRMATION_REQUEST = 'kyc_confirmation_request',
  CONFIRMATION_REMINDER = 'kyc_confirmation_reminder',
  
  // Phase 2: Assignment
  LETTER_READY = 'kyc_letter_ready',
  VISIT_SCHEDULED = 'kyc_visit_scheduled',
  
  // Phase 3: Pre-Visit
  VISIT_REMINDER = 'kyc_visit_reminder',
  RIDER_EN_ROUTE = 'kyc_rider_en_route',
  RIDER_ARRIVING = 'kyc_rider_arriving',
  
  // Phase 4: Verification
  OTP_CODE = 'kyc_otp_code',
  
  // Phase 5: Post-Verification
  RATING_REQUEST = 'kyc_rating_request',
  VERIFICATION_COMPLETE = 'kyc_verification_complete',
  
  // Rider notifications
  RIDER_ASSIGNMENT = 'kyc_rider_assignment',
  RIDER_VISIT_REMINDER = 'kyc_rider_visit_reminder',
  
  // Rescheduling
  RESCHEDULE_NOTIFICATION = 'kyc_reschedule_notification',
}

/**
 * SMS Template content definitions
 */
const SMS_TEMPLATES: Record<KycSmsTemplate, string> = {
  // Phase 1
  [KycSmsTemplate.CONFIRMATION_REQUEST]: 
    'Dear {{customerName}}, {{bankName}} has initiated a KYC verification for your account. Please confirm at: {{confirmationUrl}} This link expires in 24 hours.',
  
  [KycSmsTemplate.CONFIRMATION_REMINDER]: 
    'Reminder: Please confirm your KYC verification request from {{bankName}}. Confirm at: {{confirmationUrl}} Expires soon.',
  
  // Phase 2
  [KycSmsTemplate.LETTER_READY]: 
    'Good news! Your KYC verification documents are ready. Our agent will visit you soon. Reference: {{reference}}',
  
  [KycSmsTemplate.VISIT_SCHEDULED]: 
    'Your KYC verification is scheduled for {{visitDate}} between {{startTime}} - {{endTime}}. Our agent {{riderName}} will visit you. Ref: {{reference}}',
  
  // Phase 3
  [KycSmsTemplate.VISIT_REMINDER]: 
    'Reminder: Your KYC verification is today between {{startTime}} - {{endTime}}. Please be available. Agent: {{riderName}}, Phone: {{riderPhone}}',
  
  [KycSmsTemplate.RIDER_EN_ROUTE]: 
    'Our verification agent {{riderName}} is on the way to your location. Estimated arrival: 15-30 minutes.',
  
  [KycSmsTemplate.RIDER_ARRIVING]: 
    'Our verification agent will arrive at your location in approximately 5 minutes. Please be ready.',
  
  // Phase 4
  [KycSmsTemplate.OTP_CODE]: 
    'Your KYC verification code is: {{otp}}. Please share this code with our agent to confirm your identity. Valid for 30 minutes.',
  
  // Phase 5
  [KycSmsTemplate.RATING_REQUEST]: 
    'Your KYC verification is complete! Please rate your experience: {{ratingUrl}}',
  
  [KycSmsTemplate.VERIFICATION_COMPLETE]: 
    'Your KYC verification for {{bankName}} has been completed successfully. Thank you for your cooperation.',
  
  // Rider
  [KycSmsTemplate.RIDER_ASSIGNMENT]: 
    'New KYC assignment: {{customerName}} at {{address}}. Scheduled: {{visitDate}} {{startTime}}-{{endTime}}. Check app for details.',
  
  [KycSmsTemplate.RIDER_VISIT_REMINDER]: 
    'Reminder: KYC visit today for {{customerName}} at {{address}} between {{startTime}}-{{endTime}}.',
  
  // Reschedule
  [KycSmsTemplate.RESCHEDULE_NOTIFICATION]: 
    'Your KYC verification has been rescheduled to {{newDate}} between {{newStartTime}} - {{newEndTime}}. Reason: {{reason}}',
};

@Injectable()
export class KycNotificationService {
  private readonly logger = new Logger(KycNotificationService.name);
  private readonly baseUrl: string;
  private readonly customerPortalUrl: string;

  constructor(
    private readonly smsService: SMSService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://checkit24.com');
    this.customerPortalUrl = this.configService.get<string>('CUSTOMER_PORTAL_URL', `${this.baseUrl}/kyc`);
  }

  /**
   * Send SMS using template
   */
  private async sendSms(
    phone: string,
    template: KycSmsTemplate,
    variables: Record<string, string>,
  ): Promise<void> {
    try {
      const templateContent = SMS_TEMPLATES[template];
      const message = this.interpolate(templateContent, variables);

      await this.smsService.sendSMS({
        to: phone,
        message,
      });

      this.logger.log(`SMS sent to ${this.maskPhone(phone)} using template: ${template}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${this.maskPhone(phone)}`, error);
      // Don't throw - SMS failures shouldn't block the workflow
    }
  }

  /**
   * Interpolate template variables
   */
  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    if (phone.length < 6) return '***';
    return phone.substring(0, 4) + '***' + phone.substring(phone.length - 3);
  }

  /**
   * Generate customer confirmation URL
   */
  private getConfirmationUrl(request: KycRequest): string {
    return `${this.customerPortalUrl}/confirm/${request.verificationToken?.token}`;
  }

  /**
   * Generate customer rating URL
   */
  private getRatingUrl(request: KycRequest): string {
    return `${this.customerPortalUrl}/rate/${request.verificationToken?.token}`;
  }

  // =========================================================================
  // PHASE 1: Request Initiation
  // =========================================================================

  /**
   * Send confirmation request to customer via SMS and Email
   */
  async sendConfirmationRequest(request: KycRequest): Promise<void> {
    const confirmationUrl = this.getConfirmationUrl(request);
    const bankName = request.bankId; // TODO: Fetch bank name from bank service

    // Send SMS
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.CONFIRMATION_REQUEST,
      {
        customerName: request.customer.fullName,
        bankName,
        confirmationUrl,
      },
    );

    // Send Email if customer has email
    if (request.customer.email) {
      await this.sendConfirmationEmail(request, confirmationUrl, bankName);
    }
  }

  /**
   * Send confirmation email to customer
   */
  private async sendConfirmationEmail(
    request: KycRequest, 
    confirmationUrl: string,
    bankName: string,
  ): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: { email: request.customer.email!, name: request.customer.fullName },
        subject: `KYC Verification Request from ${bankName}`,
        htmlContent: this.getConfirmationEmailTemplate(request.customer.fullName, bankName, confirmationUrl),
        textContent: `Dear ${request.customer.fullName},\n\n${bankName} has initiated a KYC verification for your account.\n\nPlease confirm your verification request by clicking the link below:\n${confirmationUrl}\n\nThis link expires in 24 hours.\n\nIf you did not request this verification, please ignore this email.\n\nBest regards,\nCheckIT24 Team`,
      });
      this.logger.log(`Confirmation email sent to ${this.maskEmail(request.customer.email!)}`);
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${this.maskEmail(request.customer.email!)}`, error);
      // Don't throw - email failures shouldn't block the workflow
    }
  }

  /**
   * Get HTML email template for confirmation
   */
  private getConfirmationEmailTemplate(customerName: string, bankName: string, confirmationUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KYC Verification Request</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background-color: #1a1a2e; padding: 30px; text-align: center;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 28px;">CheckIT24</h1>
            <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">KYC Verification Service</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px;">
            <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px;">Hello ${customerName},</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${bankName}</strong> has initiated a KYC (Know Your Customer) verification for your account.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
              To proceed with the verification, please click the button below to confirm your details and schedule a convenient time for our verification agent to visit.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align: center;">
                  <a href="${confirmationUrl}" style="display: inline-block; background-color: #f59e0b; color: #1a1a2e; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Confirm Verification</a>
                </td>
              </tr>
            </table>
            <p style="color: #9ca3af; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
              This link expires in <strong>24 hours</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
              If you did not request this verification, please ignore this email. If you have any questions, contact our support team.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #1a1a2e; padding: 20px 30px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              © 2026 CheckIT24. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  /**
   * Mask email for logging
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Send confirmation reminder SMS
   */
  async sendConfirmationReminder(request: KycRequest): Promise<void> {
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.CONFIRMATION_REMINDER,
      {
        bankName: request.bankId,
        confirmationUrl: this.getConfirmationUrl(request),
      },
    );
  }

  /**
   * Resend confirmation email to customer
   */
  async resendConfirmationEmail(request: KycRequest): Promise<void> {
    if (!request.customer.email) {
      this.logger.warn(`Cannot resend email: Customer ${request.customer.fullName} has no email address`);
      return;
    }

    const confirmationUrl = this.getConfirmationUrl(request);
    const bankName = request.bankId; // TODO: Fetch bank name from bank service

    try {
      await this.emailService.sendEmail({
        to: { email: request.customer.email, name: request.customer.fullName },
        subject: `Reminder: Confirm Your KYC Verification - Ref: ${request.bankReference}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">KYC Verification Reminder</h2>
            <p>Dear ${request.customer.fullName},</p>
            <p>This is a reminder that <strong>${bankName}</strong> has requested a KYC verification for your account.</p>
            <p>Please confirm your verification request by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" style="display: inline-block; padding: 14px 32px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Confirm Verification
              </a>
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>Reference:</strong> ${request.bankReference}</p>
              <p style="margin: 10px 0 0; font-size: 14px;"><strong>Location:</strong> ${request.location.address}</p>
            </div>
            <p style="color: #666; font-size: 12px;">
              If you did not request this verification, please contact your bank immediately.
            </p>
            <p>Best regards,<br>ZigoCheck Team</p>
          </div>
        `,
      });
      this.logger.log(`Confirmation email resent to ${request.customer.email} for request ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to resend confirmation email to ${request.customer.email}`, error);
      throw error;
    }
  }

  /**
   * Notify bank of customer confirmation
   */
  async notifyBankOfConfirmation(request: KycRequest): Promise<void> {
    // TODO: Implement bank notification (email/webhook)
    this.logger.log(`Bank ${request.bankId} notified of confirmation for request ${request.id}`);
  }

  /**
   * Notify bank of customer rejection
   */
  async notifyBankOfRejection(request: KycRequest): Promise<void> {
    // TODO: Implement bank notification (email/webhook)
    this.logger.log(`Bank ${request.bankId} notified of rejection for request ${request.id}`);
  }

  /**
   * Notify admin of new request pending review
   */
  async notifyAdminNewRequest(request: KycRequest): Promise<void> {
    // TODO: Implement admin notification (push/email)
    this.logger.log(`Admin notified of new KYC request ${request.id} pending review`);
  }

  // =========================================================================
  // PHASE 2: Assignment
  // =========================================================================

  /**
   * Notify companies of new assignment opportunity
   */
  async notifyCompaniesNewAssignment(request: KycRequest): Promise<void> {
    // TODO: Implement company notification
    this.logger.log(`Companies notified of new assignment opportunity for request ${request.id}`);
  }

  /**
   * Notify company of assignment
   */
  async notifyCompanyOfAssignment(request: KycRequest): Promise<void> {
    // TODO: Implement company notification
    this.logger.log(`Company ${request.companyId} notified of assignment for request ${request.id}`);
  }

  /**
   * Notify rider of assignment
   */
  async notifyRiderOfAssignment(request: KycRequest): Promise<void> {
    if (!request.riderPhone || !request.schedule) return;

    await this.sendSms(
      request.riderPhone,
      KycSmsTemplate.RIDER_ASSIGNMENT,
      {
        customerName: request.customer.fullName,
        address: request.location.address,
        visitDate: request.schedule.scheduledDate.toLocaleDateString(),
        startTime: request.schedule.startTime,
        endTime: request.schedule.endTime,
      },
    );
  }

  /**
   * Notify customer that introductory letter is ready
   */
  async notifyCustomerLetterReady(request: KycRequest): Promise<void> {
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.LETTER_READY,
      {
        reference: request.bankReference,
      },
    );
  }

  /**
   * Notify customer of scheduled visit
   */
  async notifyCustomerVisitScheduled(request: KycRequest): Promise<void> {
    if (!request.schedule) return;

    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.VISIT_SCHEDULED,
      {
        visitDate: request.schedule.scheduledDate.toLocaleDateString(),
        startTime: request.schedule.startTime,
        endTime: request.schedule.endTime,
        riderName: request.riderName || 'Our agent',
        reference: request.bankReference,
      },
    );
  }

  // =========================================================================
  // PHASE 3: Pre-Visit
  // =========================================================================

  /**
   * Send morning reminder to customer
   */
  async sendVisitReminder(request: KycRequest): Promise<void> {
    if (!request.schedule) return;

    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.VISIT_REMINDER,
      {
        startTime: request.schedule.startTime,
        endTime: request.schedule.endTime,
        riderName: request.riderName || 'Our agent',
        riderPhone: request.riderPhone || '',
      },
    );
  }

  /**
   * Send morning reminder to rider
   */
  async sendRiderVisitReminder(request: KycRequest): Promise<void> {
    if (!request.riderPhone || !request.schedule) return;

    await this.sendSms(
      request.riderPhone,
      KycSmsTemplate.RIDER_VISIT_REMINDER,
      {
        customerName: request.customer.fullName,
        address: request.location.address,
        startTime: request.schedule.startTime,
        endTime: request.schedule.endTime,
      },
    );
  }

  /**
   * Notify customer that rider is en route
   */
  async notifyCustomerRiderEnRoute(request: KycRequest): Promise<void> {
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.RIDER_EN_ROUTE,
      {
        riderName: request.riderName || 'Our agent',
      },
    );
  }

  /**
   * Notify of reschedule
   */
  async notifyReschedule(request: KycRequest, reason: string): Promise<void> {
    if (!request.schedule) return;

    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.RESCHEDULE_NOTIFICATION,
      {
        newDate: request.schedule.scheduledDate.toLocaleDateString(),
        newStartTime: request.schedule.startTime,
        newEndTime: request.schedule.endTime,
        reason,
      },
    );
  }

  // =========================================================================
  // PHASE 4: Verification
  // =========================================================================

  /**
   * Send OTP to customer
   */
  async sendOtpToCustomer(request: KycRequest): Promise<void> {
    if (!request.verificationToken) return;

    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.OTP_CODE,
      {
        otp: request.verificationToken.otp,
      },
    );
  }

  // =========================================================================
  // PHASE 5: Post-Verification
  // =========================================================================

  /**
   * Request customer rating
   */
  async requestCustomerRating(request: KycRequest): Promise<void> {
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.RATING_REQUEST,
      {
        ratingUrl: this.getRatingUrl(request),
      },
    );
  }

  /**
   * Notify QA team of request needing review
   */
  async notifyQaTeam(request: KycRequest): Promise<void> {
    // TODO: Implement QA team notification (push/email)
    this.logger.log(`QA team notified of request ${request.id} needing review`);
  }

  /**
   * Notify bank that report is ready
   */
  async notifyBankReportReady(request: KycRequest): Promise<void> {
    // TODO: Implement bank notification with report download link
    this.logger.log(`Bank ${request.bankId} notified that report is ready for request ${request.id}`);
  }

  /**
   * Notify company of payment processed
   */
  async notifyCompanyPayment(request: KycRequest): Promise<void> {
    // TODO: Implement company payment notification
    this.logger.log(`Company ${request.companyId} notified of payment for request ${request.id}`);
  }

  /**
   * Send verification complete notification to customer
   */
  async sendVerificationComplete(request: KycRequest): Promise<void> {
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.VERIFICATION_COMPLETE,
      {
        bankName: request.bankId,
      },
    );
  }

  // =========================================================================
  // UPDATE & CANCELLATION NOTIFICATIONS
  // =========================================================================

  /**
   * Notify all parties when a KYC request is updated
   */
  async notifyRequestUpdated(
    request: KycRequest, 
    updatedFields: string[],
    bankName?: string,
  ): Promise<void> {
    const bank = bankName || request.bankId;
    const fieldsSummary = updatedFields.join(', ');

    // Notify customer via SMS
    try {
      await this.smsService.sendSMS({
        to: request.customer.phoneNumber,
        message: `Dear ${request.customer.fullName}, your KYC verification request (Ref: ${request.bankReference}) has been updated by ${bank}. Updated details: ${fieldsSummary}. If you have questions, please contact the bank.`,
      });
      this.logger.log(`SMS sent to customer for request update: ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to send update SMS to customer`, error);
    }

    // Notify customer via Email if available
    if (request.customer.email) {
      try {
        await this.emailService.sendEmail({
          to: { email: request.customer.email, name: request.customer.fullName },
          subject: `KYC Verification Request Updated - Ref: ${request.bankReference}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">KYC Request Updated</h2>
              <p>Dear ${request.customer.fullName},</p>
              <p>Your KYC verification request has been updated by <strong>${bank}</strong>.</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Reference:</strong> ${request.bankReference}</p>
                <p style="margin: 10px 0 0;"><strong>Updated Details:</strong> ${fieldsSummary}</p>
              </div>
              <p>If you have any questions about these changes, please contact your bank.</p>
              <p>Best regards,<br>ZigoCheck Team</p>
            </div>
          `,
        });
        this.logger.log(`Email sent to customer for request update: ${request.id}`);
      } catch (error) {
        this.logger.error(`Failed to send update email to customer`, error);
      }
    }

    // Notify assigned rider if one exists
    if (request.riderId) {
      // TODO: Fetch rider details and send notification
      this.logger.log(`Rider ${request.riderId} should be notified of update to request ${request.id}`);
    }

    // Notify assigned company if one exists
    if (request.companyId) {
      // TODO: Fetch company details and send notification
      this.logger.log(`Company ${request.companyId} should be notified of update to request ${request.id}`);
    }
  }

  /**
   * Notify all parties when a KYC request is cancelled
   */
  async notifyRequestCancelled(
    request: KycRequest,
    reason: string,
    bankName?: string,
  ): Promise<void> {
    const bank = bankName || request.bankId;

    // Notify customer via SMS
    try {
      await this.smsService.sendSMS({
        to: request.customer.phoneNumber,
        message: `Dear ${request.customer.fullName}, your KYC verification request (Ref: ${request.bankReference}) has been cancelled by ${bank}. Reason: ${reason || 'Not specified'}. Please contact the bank for more information.`,
      });
      this.logger.log(`SMS sent to customer for request cancellation: ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation SMS to customer`, error);
    }

    // Notify customer via Email if available
    if (request.customer.email) {
      try {
        await this.emailService.sendEmail({
          to: { email: request.customer.email, name: request.customer.fullName },
          subject: `KYC Verification Request Cancelled - Ref: ${request.bankReference}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">KYC Request Cancelled</h2>
              <p>Dear ${request.customer.fullName},</p>
              <p>Your KYC verification request has been cancelled by <strong>${bank}</strong>.</p>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p style="margin: 0;"><strong>Reference:</strong> ${request.bankReference}</p>
                <p style="margin: 10px 0 0;"><strong>Reason:</strong> ${reason || 'Not specified'}</p>
              </div>
              <p>If you have any questions or believe this was a mistake, please contact your bank.</p>
              <p>Best regards,<br>ZigoCheck Team</p>
            </div>
          `,
        });
        this.logger.log(`Email sent to customer for request cancellation: ${request.id}`);
      } catch (error) {
        this.logger.error(`Failed to send cancellation email to customer`, error);
      }
    }

    // Notify assigned rider if one exists
    if (request.riderId) {
      // TODO: Fetch rider phone and send SMS
      this.logger.log(`Rider ${request.riderId} should be notified of cancellation for request ${request.id}`);
      // Example: sendRiderCancellationNotification()
    }

    // Notify assigned company if one exists
    if (request.companyId) {
      // TODO: Fetch company admin email and send notification
      this.logger.log(`Company ${request.companyId} should be notified of cancellation for request ${request.id}`);
    }
  }
}
