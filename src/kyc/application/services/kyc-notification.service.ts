/**
 * KYC Notification Service
 * Handles all SMS and notification operations for KYC workflow
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMSService } from '@/external-services/notifications/sms/sms.service';
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
   * Send confirmation request SMS to customer
   */
  async sendConfirmationRequest(request: KycRequest): Promise<void> {
    await this.sendSms(
      request.customer.phoneNumber,
      KycSmsTemplate.CONFIRMATION_REQUEST,
      {
        customerName: request.customer.fullName,
        bankName: request.bankId, // TODO: Fetch bank name from bank service
        confirmationUrl: this.getConfirmationUrl(request),
      },
    );
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
}
