import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import * as handlebars from 'handlebars';
import {
  ISMSService,
  ISMSTemplate,
  ISendSMSRequest,
  ISMSResult,
  IBulkSMSRequest,
  IBulkSMSResult,
  IDeliveryTracking,
  IDeliveryReport,
  INotificationServiceHealth,
  NotificationProvider,
  DeliveryStatus,
  TemplateCategory,
  NotificationType,
} from '../interfaces/notification.interface';

/**
 * SMS Service
 * 
 * Comprehensive SMS service using Twilio for reliable message delivery
 * across global mobile networks with advanced features.
 * 
 * Features:
 * - Global SMS delivery via Twilio
 * - Template management with variable substitution
 * - Bulk SMS processing with rate limiting
 * - MMS support with media attachments
 * - Delivery tracking and status updates
 * - Phone number validation and formatting
 * - Cost tracking and analytics
 * - International number support
 * - Message segmentation for long messages
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Injectable()
export class SMSService implements ISMSService {
  private readonly logger = new Logger(SMSService.name);
  private readonly templates = new Map<string, ISMSTemplate>();
  private twilioClient: Twilio | null = null;
  private defaultFromNumber: string;
  private accountSid: string;
  private authToken: string;

  constructor(private readonly configService: ConfigService) {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  private initializeTwilio(): void {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.defaultFromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER', '');

    if (this.accountSid && this.authToken) {
      this.twilioClient = new Twilio(this.accountSid, this.authToken);
      this.logger.log('📱 Twilio SMS provider initialized');
    } else {
      this.logger.warn('⚠️ Twilio not configured - missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
    }

    if (!this.defaultFromNumber) {
      this.logger.warn('⚠️ Default SMS number not configured - TWILIO_FROM_NUMBER missing');
    }

    this.logger.log('📱 SMS Service initialized');
  }

  /**
   * Send a single SMS
   */
  async sendSMS(request: ISendSMSRequest): Promise<ISMSResult> {
    try {
      if (!this.twilioClient) {
        throw new ServiceUnavailableException('Twilio SMS service not configured');
      }

      this.logger.log(`Sending SMS to: ${request.to}`);

      // Validate request
      this.validateSMSRequest(request);

      // Process template if provided
      let { message } = request;
      if (request.templateId) {
        const processedTemplate = await this.processTemplate(request.templateId, request.templateData || {});
        message = processedTemplate.content;
      }

      // Handle multiple recipients
      const recipients = Array.isArray(request.to) ? request.to : [request.to];
      
      // For multiple recipients, send individual messages
      if (recipients.length > 1) {
        const bulkRequest: IBulkSMSRequest = {
          messages: recipients.map(to => ({
            ...request,
            to,
            message,
          })),
        };
        const bulkResult = await this.sendBulkSMS(bulkRequest);
        
        // Return the first successful result or the first result if all failed
        const successfulResult = bulkResult.results.find(r => r.status === DeliveryStatus.SENT);
        return successfulResult || bulkResult.results[0];
      }

      // Send single SMS
      const recipient = recipients[0];
      const fromNumber = request.from || this.defaultFromNumber;

      const messageData: any = {
        body: message,
        from: fromNumber,
        to: recipient,
      };

      // Add media URLs for MMS
      if (request.mediaUrls && request.mediaUrls.length > 0) {
        messageData.mediaUrl = request.mediaUrls;
      }

      // Add delivery tracking webhook
      if (request.trackDelivery) {
        const webhookUrl = this.configService.get<string>('SMS_WEBHOOK_URL');
        if (webhookUrl) {
          messageData.statusCallback = webhookUrl;
        }
      }

      const twilioMessage = await this.twilioClient.messages.create(messageData);

      this.logger.log(`✅ SMS sent via Twilio: ${twilioMessage.sid}`);

      return {
        messageId: twilioMessage.sid,
        status: this.mapTwilioStatus(twilioMessage.status),
        provider: NotificationProvider.TWILIO,
        to: recipient,
        from: fromNumber,
        segments: this.calculateSegments(message),
        cost: parseFloat(twilioMessage.price || '0'),
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      
      return {
        messageId: `failed_${Date.now()}`,
        status: DeliveryStatus.FAILED,
        provider: NotificationProvider.TWILIO,
        to: Array.isArray(request.to) ? request.to[0] : request.to,
        from: request.from || this.defaultFromNumber,
        segments: 0,
        error: error.message,
        sentAt: new Date(),
      };
    }
  }

  /**
   * Send bulk SMS messages with batch processing
   */
  async sendBulkSMS(request: IBulkSMSRequest): Promise<IBulkSMSResult> {
    try {
      this.logger.log(`Sending bulk SMS: ${request.messages.length} messages`);

      const batchSize = request.batchSize || 100;
      const delayBetweenBatches = request.delayBetweenBatches || 1000;
      const results: ISMSResult[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < request.messages.length; i += batchSize) {
        const batch = request.messages.slice(i, i + batchSize);
        this.logger.log(`Processing SMS batch ${Math.floor(i / batchSize) + 1}, messages ${i + 1}-${Math.min(i + batchSize, request.messages.length)}`);

        // Process batch in parallel
        const batchPromises = batch.map(async (smsRequest, batchIndex) => {
          try {
            const result = await this.sendSMS(smsRequest);
            results.push(result);
          } catch (error) {
            errors.push({
              index: i + batchIndex,
              error: error.message,
            });
          }
        });

        await Promise.all(batchPromises);

        // Delay between batches to avoid rate limiting
        if (i + batchSize < request.messages.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      this.logger.log(`✅ Bulk SMS completed: ${results.length} successful, ${errors.length} failed`);

      return {
        totalMessages: request.messages.length,
        successfulMessages: results.length,
        failedMessages: errors.length,
        results,
        errors,
      };
    } catch (error) {
      this.logger.error(`Failed to send bulk SMS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create SMS template
   */
  async createTemplate(template: Omit<ISMSTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISMSTemplate> {
    try {
      const templateId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newTemplate: ISMSTemplate = {
        ...template,
        id: templateId,
        maxLength: template.maxLength || 160,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate template by compiling it
      await this.validateTemplate(newTemplate);

      this.templates.set(templateId, newTemplate);
      this.logger.log(`✅ SMS template created: ${templateId}`);

      return newTemplate;
    } catch (error) {
      this.logger.error(`Failed to create SMS template: ${error.message}`);
      throw new BadRequestException(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Get SMS template by ID
   */
  async getTemplate(templateId: string): Promise<ISMSTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new BadRequestException(`Template not found: ${templateId}`);
    }
    return template;
  }

  /**
   * Update SMS template
   */
  async updateTemplate(templateId: string, updates: Partial<ISMSTemplate>): Promise<ISMSTemplate> {
    try {
      const existingTemplate = await this.getTemplate(templateId);
      
      const updatedTemplate: ISMSTemplate = {
        ...existingTemplate,
        ...updates,
        id: templateId, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      // Validate updated template
      await this.validateTemplate(updatedTemplate);

      this.templates.set(templateId, updatedTemplate);
      this.logger.log(`✅ SMS template updated: ${templateId}`);

      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update SMS template: ${error.message}`);
      throw new BadRequestException(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete SMS template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new BadRequestException(`Template not found: ${templateId}`);
    }

    this.templates.delete(templateId);
    this.logger.log(`✅ SMS template deleted: ${templateId}`);
  }

  /**
   * List SMS templates
   */
  async listTemplates(category?: TemplateCategory): Promise<ISMSTemplate[]> {
    const allTemplates = Array.from(this.templates.values());
    
    if (category) {
      return allTemplates.filter(template => template.category === category);
    }

    return allTemplates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get delivery status from Twilio
   */
  async getDeliveryStatus(messageId: string): Promise<IDeliveryTracking> {
    try {
      if (!this.twilioClient) {
        throw new ServiceUnavailableException('Twilio SMS service not configured');
      }

      const message = await this.twilioClient.messages(messageId).fetch();

      return {
        messageId: message.sid,
        type: NotificationType.SMS,
        status: this.mapTwilioStatus(message.status),
        recipient: message.to,
        provider: NotificationProvider.TWILIO,
        sentAt: message.dateCreated,
        events: [],
        metadata: {
          price: message.price,
          priceUnit: message.priceUnit,
          direction: message.direction,
          numSegments: message.numSegments,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get SMS delivery status: ${error.message}`);
      throw new BadRequestException(`Failed to get delivery status: ${error.message}`);
    }
  }

  /**
   * Get delivery report
   */
  async getDeliveryReport(messageId: string): Promise<IDeliveryReport> {
    try {
      const deliveryStatus = await this.getDeliveryStatus(messageId);

      return {
        messageId: deliveryStatus.messageId,
        type: NotificationType.SMS,
        status: deliveryStatus.status,
        recipient: deliveryStatus.recipient,
        sentAt: deliveryStatus.sentAt!,
        deliveredAt: deliveryStatus.status === DeliveryStatus.DELIVERED ? new Date() : undefined,
        cost: deliveryStatus.metadata?.price ? parseFloat(deliveryStatus.metadata.price) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get SMS delivery report: ${error.message}`);
      throw new BadRequestException(`Failed to get delivery report: ${error.message}`);
    }
  }

  /**
   * Service health check
   */
  async healthCheck(): Promise<INotificationServiceHealth> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let apiKeyValid = false;

    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured');
      }

      // Test Twilio API connectivity by fetching account info
      await this.twilioClient.api.accounts(this.accountSid).fetch();
      apiKeyValid = true;

    } catch (error) {
      this.logger.warn(`SMS service health check failed: ${error.message}`);
      status = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;

    return {
      provider: NotificationProvider.TWILIO,
      type: NotificationType.SMS,
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate: 0,
      apiKeyValid,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Process SMS template with variables
   */
  private async processTemplate(templateId: string, templateData: Record<string, any>): Promise<{
    content: string;
  }> {
    const template = await this.getTemplate(templateId);

    // Compile template with Handlebars
    const contentTemplate = handlebars.compile(template.content);

    return {
      content: contentTemplate(templateData),
    };
  }

  /**
   * Validate SMS template
   */
  private async validateTemplate(template: ISMSTemplate): Promise<void> {
    try {
      // Test Handlebars compilation
      handlebars.compile(template.content);

      // Check template length
      if (template.content.length > template.maxLength) {
        throw new Error(`Template content exceeds maximum length of ${template.maxLength} characters`);
      }

    } catch (error) {
      throw new Error(`Template validation failed: ${error.message}`);
    }
  }

  /**
   * Validate SMS request
   */
  private validateSMSRequest(request: ISendSMSRequest): void {
    // Check if either message or template is provided
    if (!request.message && !request.templateId) {
      throw new BadRequestException('SMS must have either message content or template ID');
    }

    // Validate recipients
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    if (recipients.length === 0) {
      throw new BadRequestException('SMS must have at least one recipient');
    }

    // Validate phone numbers (basic validation)
    for (const recipient of recipients) {
      if (!this.isValidPhoneNumber(recipient)) {
        throw new BadRequestException(`Invalid phone number: ${recipient}`);
      }
    }

    // Validate from number if provided
    if (request.from && !this.isValidPhoneNumber(request.from)) {
      throw new BadRequestException(`Invalid from phone number: ${request.from}`);
    }

    // Check message length
    if (request.message && request.message.length > 1600) {
      throw new BadRequestException('SMS message is too long (maximum 1600 characters)');
    }
  }

  /**
   * Basic phone number validation
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation for international format (+1234567890)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Calculate SMS segments for pricing
   */
  private calculateSegments(message: string): number {
    // Basic segment calculation
    // GSM 7-bit: 160 characters per segment
    // UCS-2 (Unicode): 70 characters per segment
    
    const isUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = isUnicode ? 70 : 160;
    
    return Math.ceil(message.length / maxLength);
  }

  /**
   * Map Twilio status to our DeliveryStatus enum
   */
  private mapTwilioStatus(twilioStatus: string): DeliveryStatus {
    switch (twilioStatus.toLowerCase()) {
      case 'queued':
      case 'accepted':
        return DeliveryStatus.PENDING;
      case 'sending':
        return DeliveryStatus.SENT;
      case 'sent':
      case 'received':
        return DeliveryStatus.DELIVERED;
      case 'delivered':
        return DeliveryStatus.DELIVERED;
      case 'undelivered':
        return DeliveryStatus.FAILED;
      case 'failed':
        return DeliveryStatus.FAILED;
      case 'canceled':
        return DeliveryStatus.FAILED;
      default:
        return DeliveryStatus.PENDING;
    }
  }
}