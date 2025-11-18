/**
 * Twilio SMS Service
 * 
 * Implementation of SMS service using Twilio API.
 * Provides reliable SMS delivery with delivery tracking.
 * 
 * @module TwilioService
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import {
  ISMSService,
  ISMSMessage,
  ISMSSendResult,
  IBulkSMSRequest,
  IBulkSMSResult,
  ISMSDeliveryReport,
  SMSProvider,
  SMSDeliveryStatus,
  SMSPriority,
} from '../interfaces/sms.interface';

/**
 * Twilio SMS Service
 * 
 * Implements ISMSService using Twilio's Programmable SMS API.
 * 
 * @class TwilioService
 * @implements {ISMSService}
 */
@Injectable()
export class TwilioService implements ISMSService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');
    this.isEnabled = this.configService.get<boolean>('TWILIO_ENABLED', false);

    if (this.isEnabled && accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service initialized');
    } else {
      this.logger.warn('Twilio SMS service is disabled or not configured');
    }
  }

  /**
   * Send a single SMS message
   * 
   * @param {ISMSMessage} message - SMS message details
   * @returns {Promise<ISMSSendResult>} Send result with message ID
   */
  async sendSMS(message: ISMSMessage): Promise<ISMSSendResult> {
    try {
      if (!this.isEnabled || !this.client) {
        throw new Error('Twilio service is not enabled or configured');
      }

      this.logger.log(`Sending SMS to ${message.to} via Twilio`);

      // Validate phone number format
      this.validatePhoneNumber(message.to);

      // Send SMS via Twilio
      const twilioMessage = await this.client.messages.create({
        body: message.message,
        to: message.to,
        from: message.from || this.fromNumber,
        ...(message.scheduleAt && {
          sendAt: message.scheduleAt,
          scheduleType: 'fixed',
        }),
      });

      this.logger.log(`SMS sent successfully via Twilio. SID: ${twilioMessage.sid}`);

      return {
        success: true,
        messageId: twilioMessage.sid,
        provider: SMSProvider.TWILIO,
        to: message.to,
        status: this.mapTwilioStatus(twilioMessage.status),
        sentAt: new Date(),
        cost: twilioMessage.price ? parseFloat(twilioMessage.price) : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS via Twilio: ${error.message}`);

      return {
        success: false,
        provider: SMSProvider.TWILIO,
        to: message.to,
        status: SMSDeliveryStatus.FAILED,
        sentAt: new Date(),
        error: {
          code: error.code || 'TWILIO_ERROR',
          message: error.message,
          details: error,
        },
      };
    }
  }

  /**
   * Send bulk SMS messages
   * 
   * @param {IBulkSMSRequest} request - Bulk SMS request
   * @returns {Promise<IBulkSMSResult>} Bulk send results
   */
  async sendBulkSMS(request: IBulkSMSRequest): Promise<IBulkSMSResult> {
    try {
      this.logger.log(`Sending ${request.messages.length} SMS messages via Twilio`);

      const batchSize = request.batchSize || 100;
      const delay = request.delayBetweenBatches || 1000;

      const results: ISMSSendResult[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      // Process in batches to avoid rate limits
      for (let i = 0; i < request.messages.length; i += batchSize) {
        const batch = request.messages.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (message, index) => {
            try {
              const result = await this.sendSMS(message);
              return { result, index: i + index };
            } catch (error) {
              errors.push({
                index: i + index,
                error: error.message,
              });
              return {
                result: {
                  success: false,
                  provider: SMSProvider.TWILIO,
                  to: message.to,
                  status: SMSDeliveryStatus.FAILED,
                  sentAt: new Date(),
                  error: {
                    code: 'SEND_ERROR',
                    message: error.message,
                  },
                } as ISMSSendResult,
                index: i + index,
              };
            }
          }),
        );

        results.push(...batchResults.map((r) => r.result));

        // Delay between batches to respect rate limits
        if (i + batchSize < request.messages.length) {
          await this.sleep(delay);
        }
      }

      const successfulMessages = results.filter((r) => r.success).length;
      const failedMessages = results.filter((r) => !r.success).length;

      this.logger.log(
        `Bulk SMS completed. Success: ${successfulMessages}, Failed: ${failedMessages}`,
      );

      return {
        totalMessages: request.messages.length,
        successfulMessages,
        failedMessages,
        results,
        errors,
      };
    } catch (error) {
      this.logger.error(`Bulk SMS send failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get delivery status for a message
   * 
   * @param {string} messageId - Twilio message SID
   * @returns {Promise<ISMSDeliveryReport>} Delivery report
   */
  async getDeliveryStatus(messageId: string): Promise<ISMSDeliveryReport> {
    try {
      if (!this.isEnabled || !this.client) {
        throw new Error('Twilio service is not enabled or configured');
      }

      this.logger.log(`Fetching delivery status for message: ${messageId}`);

      const message = await this.client.messages(messageId).fetch();

      return {
        messageId: message.sid,
        to: message.to,
        status: this.mapTwilioStatus(message.status),
        sentAt: new Date(message.dateCreated),
        deliveredAt: message.dateSent ? new Date(message.dateSent) : undefined,
        provider: SMSProvider.TWILIO,
        cost: message.price ? parseFloat(message.price) : undefined,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch delivery status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Health check for Twilio service
   * 
   * @returns {Promise<object>} Health status
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; provider: SMSProvider }> {
    try {
      if (!this.isEnabled || !this.client) {
        return { status: 'unhealthy', provider: SMSProvider.TWILIO };
      }

      // Verify account is accessible
      await this.client.api.accounts(this.client.accountSid).fetch();

      return { status: 'healthy', provider: SMSProvider.TWILIO };
    } catch (error) {
      this.logger.error(`Twilio health check failed: ${error.message}`);
      return { status: 'unhealthy', provider: SMSProvider.TWILIO };
    }
  }

  /**
   * Validate phone number format (E.164)
   * 
   * @private
   * @param {string} phoneNumber - Phone number to validate
   * @throws {Error} If phone number is invalid
   */
  private validatePhoneNumber(phoneNumber: string): void {
    // E.164 format: +[country code][number] (e.g., +2348012345678)
    const e164Regex = /^\+[1-9]\d{1,14}$/;

    if (!e164Regex.test(phoneNumber)) {
      throw new Error(
        `Invalid phone number format. Must be in E.164 format (e.g., +2348012345678)`,
      );
    }
  }

  /**
   * Map Twilio status to our SMS delivery status
   * 
   * @private
   * @param {string} twilioStatus - Twilio message status
   * @returns {SMSDeliveryStatus} Mapped status
   */
  private mapTwilioStatus(twilioStatus: string): SMSDeliveryStatus {
    const statusMap: Record<string, SMSDeliveryStatus> = {
      queued: SMSDeliveryStatus.PENDING,
      sending: SMSDeliveryStatus.PENDING,
      sent: SMSDeliveryStatus.SENT,
      delivered: SMSDeliveryStatus.DELIVERED,
      undelivered: SMSDeliveryStatus.UNDELIVERED,
      failed: SMSDeliveryStatus.FAILED,
    };

    return statusMap[twilioStatus] || SMSDeliveryStatus.PENDING;
  }

  /**
   * Sleep utility for batch processing
   * 
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
