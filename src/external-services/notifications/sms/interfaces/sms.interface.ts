/**
 * SMS Service Interfaces
 * 
 * Defines contracts for SMS notification services.
 * Supports multiple SMS providers with fallback capabilities.
 * 
 * @module SMSInterfaces
 */

/**
 * SMS provider types
 */
export enum SMSProvider {
  TWILIO = 'twilio',
  TERMII = 'termii',
  CUSTOM = 'custom',
}

/**
 * SMS message priority
 */
export enum SMSPriority {
  HIGH = 'high',       // Immediate delivery
  NORMAL = 'normal',   // Standard delivery
  LOW = 'low',         // Can be delayed
}

/**
 * SMS delivery status
 */
export enum SMSDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  UNDELIVERED = 'undelivered',
}

/**
 * SMS message interface
 */
export interface ISMSMessage {
  readonly to: string;                  // Phone number (E.164 format)
  readonly message: string;             // Message content
  readonly from?: string;               // Sender ID or phone number
  readonly priority?: SMSPriority;      // Message priority
  readonly scheduleAt?: Date;           // Scheduled send time
  readonly metadata?: Record<string, any>; // Additional metadata
}

/**
 * SMS send result interface
 */
export interface ISMSSendResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly provider: SMSProvider;
  readonly to: string;
  readonly status: SMSDeliveryStatus;
  readonly sentAt: Date;
  readonly cost?: number;
  readonly error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Bulk SMS request interface
 */
export interface IBulkSMSRequest {
  readonly messages: ISMSMessage[];
  readonly batchSize?: number;
  readonly delayBetweenBatches?: number; // Milliseconds
}

/**
 * Bulk SMS result interface
 */
export interface IBulkSMSResult {
  readonly totalMessages: number;
  readonly successfulMessages: number;
  readonly failedMessages: number;
  readonly results: ISMSSendResult[];
  readonly errors: Array<{ index: number; error: string }>;
}

/**
 * SMS delivery report interface
 */
export interface ISMSDeliveryReport {
  readonly messageId: string;
  readonly to: string;
  readonly status: SMSDeliveryStatus;
  readonly sentAt: Date;
  readonly deliveredAt?: Date;
  readonly provider: SMSProvider;
  readonly cost?: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

/**
 * SMS provider configuration
 */
export interface ISMSProviderConfig {
  readonly provider: SMSProvider;
  readonly apiKey: string;
  readonly apiSecret?: string;
  readonly senderId?: string;
  readonly webhookUrl?: string;
  readonly isActive: boolean;
}

/**
 * SMS service interface
 */
export interface ISMSService {
  /**
   * Send a single SMS
   */
  sendSMS(message: ISMSMessage): Promise<ISMSSendResult>;

  /**
   * Send bulk SMS messages
   */
  sendBulkSMS(request: IBulkSMSRequest): Promise<IBulkSMSResult>;

  /**
   * Get delivery status
   */
  getDeliveryStatus(messageId: string): Promise<ISMSDeliveryReport>;

  /**
   * Service health check
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; provider: SMSProvider }>;
}

/**
 * SMS template interface
 */
export interface ISMSTemplate {
  readonly id: string;
  readonly name: string;
  readonly content: string;             // Template with placeholders
  readonly variables: string[];         // Required variables
  readonly category: string;
  readonly isActive: boolean;
}
