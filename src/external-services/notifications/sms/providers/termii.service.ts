/**
 * Termii SMS Service
 * 
 * Implementation of SMS service using Termii API.
 * Optimized for African markets with better delivery rates.
 * 
 * @module TermiiService
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ISMSService,
  ISMSMessage,
  ISMSSendResult,
  IBulkSMSRequest,
  IBulkSMSResult,
  ISMSDeliveryReport,
  SMSProvider,
  SMSDeliveryStatus,
} from '../interfaces/sms.interface';

/**
 * Termii SMS Service
 * 
 * Implements ISMSService using Termii's SMS API.
 * Specialized for African market with better coverage.
 * 
 * @class TermiiService
 * @implements {ISMSService}
 */
@Injectable()
export class TermiiService implements ISMSService {
  private readonly logger = new Logger(TermiiService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl = 'https://api.ng.termii.com/api';
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY', '');
    this.senderId = this.configService.get<string>('TERMII_SENDER_ID', 'CheckIT24');
    this.isEnabled = this.configService.get<boolean>('TERMII_ENABLED', false);

    if (this.isEnabled && this.apiKey) {
      this.logger.log('Termii SMS service initialized');
    } else {
      this.logger.warn('Termii SMS service is disabled or not configured');
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
      if (!this.isEnabled || !this.apiKey) {
        throw new Error('Termii service is not enabled or configured');
      }

      this.logger.log(`Sending SMS to ${message.to} via Termii`);

      // Validate phone number
      const normalizedPhone = this.normalizePhoneNumber(message.to);

      // Prepare request payload
      const payload = {
        to: normalizedPhone,
        from: message.from || this.senderId,
        sms: message.message,
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey,
      };

      // Send SMS via Termii API
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/sms/send`, payload),
      );

      const data = response.data;

      if (data.message === 'Successfully Sent' || data.code === 'ok') {
        this.logger.log(`SMS sent successfully via Termii. ID: ${data.message_id}`);

        return {
          success: true,
          messageId: data.message_id,
          provider: SMSProvider.TERMII,
          to: message.to,
          status: SMSDeliveryStatus.SENT,
          sentAt: new Date(),
          cost: data.balance ? parseFloat(data.balance) : undefined,
        };
      } else {
        throw new Error(data.message || 'Unknown error from Termii');
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS via Termii: ${error.message}`);

      return {
        success: false,
        provider: SMSProvider.TERMII,
        to: message.to,
        status: SMSDeliveryStatus.FAILED,
        sentAt: new Date(),
        error: {
          code: error.response?.data?.code || 'TERMII_ERROR',
          message: error.response?.data?.message || error.message,
          details: error.response?.data,
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
      this.logger.log(`Sending ${request.messages.length} SMS messages via Termii`);

      const batchSize = request.batchSize || 100;
      const delay = request.delayBetweenBatches || 1000;

      const results: ISMSSendResult[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      // Process in batches
      for (let i = 0; i < request.messages.length; i += batchSize) {
        const batch = request.messages.slice(i, i + batchSize);

        // Use Termii's bulk SMS endpoint if available
        if (batch.length > 1) {
          const bulkResult = await this.sendBulkBatch(batch);
          results.push(...bulkResult.results);
          errors.push(...bulkResult.errors.map((e) => ({ ...e, index: e.index + i })));
        } else {
          // Single message
          const result = await this.sendSMS(batch[0]);
          results.push(result);

          if (!result.success) {
            errors.push({
              index: i,
              error: result.error?.message || 'Unknown error',
            });
          }
        }

        // Delay between batches
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
   * @param {string} messageId - Termii message ID
   * @returns {Promise<ISMSDeliveryReport>} Delivery report
   */
  async getDeliveryStatus(messageId: string): Promise<ISMSDeliveryReport> {
    try {
      if (!this.isEnabled || !this.apiKey) {
        throw new Error('Termii service is not enabled or configured');
      }

      this.logger.log(`Fetching delivery status for message: ${messageId}`);

      // Termii delivery report endpoint
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/sms/inbox`, {
          params: {
            api_key: this.apiKey,
            message_id: messageId,
          },
        }),
      );

      const data = response.data;

      return {
        messageId: data.message_id || messageId,
        to: data.receiver || '',
        status: this.mapTermiiStatus(data.status),
        sentAt: new Date(data.date_sent),
        deliveredAt: data.date_delivered ? new Date(data.date_delivered) : undefined,
        provider: SMSProvider.TERMII,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch delivery status: ${error.message}`);

      // Return default report on error
      return {
        messageId,
        to: '',
        status: SMSDeliveryStatus.PENDING,
        sentAt: new Date(),
        provider: SMSProvider.TERMII,
        errorMessage: error.message,
      };
    }
  }

  /**
   * Health check for Termii service
   * 
   * @returns {Promise<object>} Health status
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; provider: SMSProvider }> {
    try {
      if (!this.isEnabled || !this.apiKey) {
        return { status: 'unhealthy', provider: SMSProvider.TERMII };
      }

      // Check balance to verify API key is valid
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/get-balance`, {
          params: { api_key: this.apiKey },
        }),
      );

      if (response.data && typeof response.data.balance !== 'undefined') {
        this.logger.log(`Termii balance: ${response.data.balance} ${response.data.currency}`);
        return { status: 'healthy', provider: SMSProvider.TERMII };
      }

      return { status: 'unhealthy', provider: SMSProvider.TERMII };
    } catch (error) {
      this.logger.error(`Termii health check failed: ${error.message}`);
      return { status: 'unhealthy', provider: SMSProvider.TERMII };
    }
  }

  /**
   * Send bulk batch using Termii bulk endpoint
   * 
   * @private
   * @param {ISMSMessage[]} messages - Messages to send
   * @returns {Promise<object>} Batch results
   */
  private async sendBulkBatch(
    messages: ISMSMessage[],
  ): Promise<{ results: ISMSSendResult[]; errors: Array<{ index: number; error: string }> }> {
    try {
      const payload = {
        to: messages.map((m) => this.normalizePhoneNumber(m.to)),
        from: this.senderId,
        sms: messages[0].message, // Assuming same message for all in batch
        type: 'plain',
        channel: 'generic',
        api_key: this.apiKey,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/sms/send/bulk`, payload),
      );

      const data = response.data;
      const results: ISMSSendResult[] = [];
      const errors: Array<{ index: number; error: string }> = [];

      messages.forEach((message, index) => {
        if (data.message === 'Successfully Sent' || data.code === 'ok') {
          results.push({
            success: true,
            messageId: `${data.message_id}_${index}`,
            provider: SMSProvider.TERMII,
            to: message.to,
            status: SMSDeliveryStatus.SENT,
            sentAt: new Date(),
          });
        } else {
          errors.push({
            index,
            error: data.message || 'Unknown error',
          });

          results.push({
            success: false,
            provider: SMSProvider.TERMII,
            to: message.to,
            status: SMSDeliveryStatus.FAILED,
            sentAt: new Date(),
            error: {
              code: 'BULK_SEND_ERROR',
              message: data.message || 'Unknown error',
            },
          });
        }
      });

      return { results, errors };
    } catch (error) {
      this.logger.error(`Bulk batch send failed: ${error.message}`);

      const results: ISMSSendResult[] = messages.map((message) => ({
        success: false,
        provider: SMSProvider.TERMII,
        to: message.to,
        status: SMSDeliveryStatus.FAILED,
        sentAt: new Date(),
        error: {
          code: 'BATCH_ERROR',
          message: error.message,
        },
      }));

      const errors = messages.map((_, index) => ({
        index,
        error: error.message,
      }));

      return { results, errors };
    }
  }

  /**
   * Normalize phone number to international format
   * 
   * @private
   * @param {string} phoneNumber - Phone number to normalize
   * @returns {string} Normalized phone number
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let normalized = phoneNumber.replace(/\D/g, '');

    // If it starts with 0, replace with country code (234 for Nigeria)
    if (normalized.startsWith('0')) {
      normalized = '234' + normalized.substring(1);
    }

    // Ensure it doesn't have + prefix for Termii
    return normalized;
  }

  /**
   * Map Termii status to our SMS delivery status
   * 
   * @private
   * @param {string} termiiStatus - Termii message status
   * @returns {SMSDeliveryStatus} Mapped status
   */
  private mapTermiiStatus(termiiStatus: string): SMSDeliveryStatus {
    const statusMap: Record<string, SMSDeliveryStatus> = {
      sent: SMSDeliveryStatus.SENT,
      delivered: SMSDeliveryStatus.DELIVERED,
      failed: SMSDeliveryStatus.FAILED,
      pending: SMSDeliveryStatus.PENDING,
    };

    return statusMap[termiiStatus?.toLowerCase()] || SMSDeliveryStatus.PENDING;
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
