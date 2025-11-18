/**
 * Notification Service Interfaces
 * 
 * Comprehensive interfaces for email and SMS notification services
 * supporting multiple providers, template management, and delivery tracking.
 * 
 * Features:
 * - Multi-provider email service (SendGrid, Nodemailer)
 * - SMS service with Twilio integration
 * - Template management and personalization
 * - Delivery tracking and analytics
 * - Notification preferences and opt-out management
 * - Bulk messaging capabilities
 * - Attachment and media support
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

// ============================================================================
// Base Notification Types
// ============================================================================

export enum NotificationProvider {
  SENDGRID = 'sendgrid',
  NODEMAILER = 'nodemailer',
  TWILIO = 'twilio',
}

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  REJECTED = 'rejected',
  OPENED = 'opened',
  CLICKED = 'clicked',
  UNSUBSCRIBED = 'unsubscribed',
}

export enum TemplateCategory {
  AUTHENTICATION = 'authentication',
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
  NOTIFICATION = 'notification',
  ALERT = 'alert',
  WELCOME = 'welcome',
  REMINDER = 'reminder',
  RECEIPT = 'receipt',
}

// ============================================================================
// Email Interfaces
// ============================================================================

export interface IEmailAddress {
  email: string;
  name?: string;
}

export interface IEmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface IEmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category: TemplateCategory;
  variables: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISendEmailRequest {
  to: IEmailAddress | IEmailAddress[];
  from?: IEmailAddress;
  replyTo?: IEmailAddress;
  cc?: IEmailAddress[];
  bcc?: IEmailAddress[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: IEmailAttachment[];
  priority?: NotificationPriority;
  trackClicks?: boolean;
  trackOpens?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  scheduledAt?: Date;
}

export interface IEmailResult {
  messageId: string;
  status: DeliveryStatus;
  provider: NotificationProvider;
  recipients: string[];
  error?: string;
  scheduledAt?: Date;
  sentAt?: Date;
}

export interface IBulkEmailRequest {
  emails: ISendEmailRequest[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface IBulkEmailResult {
  totalEmails: number;
  successfulEmails: number;
  failedEmails: number;
  results: IEmailResult[];
  errors: Array<{ index: number; error: string }>;
}

// ============================================================================
// SMS Interfaces
// ============================================================================

export interface ISMSTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  variables: string[];
  maxLength: number;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISendSMSRequest {
  to: string | string[];
  from?: string;
  message: string;
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: NotificationPriority;
  mediaUrls?: string[];
  trackDelivery?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  scheduledAt?: Date;
}

export interface ISMSResult {
  messageId: string;
  status: DeliveryStatus;
  provider: NotificationProvider;
  to: string;
  from: string;
  segments: number;
  cost?: number;
  error?: string;
  scheduledAt?: Date;
  sentAt?: Date;
}

export interface IBulkSMSRequest {
  messages: ISendSMSRequest[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface IBulkSMSResult {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  results: ISMSResult[];
  errors: Array<{ index: number; error: string }>;
}

// ============================================================================
// Notification Preferences
// ============================================================================

export enum PreferenceType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export interface INotificationPreference {
  userId: string;
  type: PreferenceType;
  category: TemplateCategory;
  enabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly' | 'monthly';
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUpdatePreferencesRequest {
  userId: string;
  preferences: Array<{
    type: PreferenceType;
    category: TemplateCategory;
    enabled: boolean;
    frequency?: string;
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  }>;
}

// ============================================================================
// Delivery Tracking
// ============================================================================

export interface IDeliveryEvent {
  id: string;
  messageId: string;
  type: NotificationType;
  event: DeliveryStatus;
  timestamp: Date;
  recipient: string;
  metadata?: Record<string, any>;
}

export interface IDeliveryTracking {
  messageId: string;
  type: NotificationType;
  status: DeliveryStatus;
  recipient: string;
  provider: NotificationProvider;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  failedAt?: Date;
  error?: string;
  events: IDeliveryEvent[];
  metadata?: Record<string, any>;
}

export interface IDeliveryReport {
  messageId: string;
  type: NotificationType;
  status: DeliveryStatus;
  recipient: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bounceReason?: string;
  cost?: number;
}

// ============================================================================
// Analytics
// ============================================================================

export interface INotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  avgDeliveryTime: number;
  topCategories: Array<{
    category: TemplateCategory;
    count: number;
    percentage: number;
  }>;
  providerStats: Array<{
    provider: NotificationProvider;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  dailyStats: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

export interface IAnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  type?: NotificationType;
  category?: TemplateCategory;
  provider?: NotificationProvider;
  userId?: string;
}

// ============================================================================
// Service Health
// ============================================================================

export interface INotificationServiceHealth {
  provider: NotificationProvider;
  type: NotificationType;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  apiKeyValid: boolean;
  quotaUsed?: number;
  quotaLimit?: number;
  lastError?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface IEmailService {
  // Basic email operations
  sendEmail(request: ISendEmailRequest): Promise<IEmailResult>;
  sendBulkEmails(request: IBulkEmailRequest): Promise<IBulkEmailResult>;
  
  // Template management
  createTemplate(template: Omit<IEmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<IEmailTemplate>;
  getTemplate(templateId: string): Promise<IEmailTemplate>;
  updateTemplate(templateId: string, updates: Partial<IEmailTemplate>): Promise<IEmailTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  listTemplates(category?: TemplateCategory): Promise<IEmailTemplate[]>;
  
  // Delivery tracking
  getDeliveryStatus(messageId: string): Promise<IDeliveryTracking>;
  getDeliveryReport(messageId: string): Promise<IDeliveryReport>;
  
  // Health check
  healthCheck(): Promise<INotificationServiceHealth>;
}

export interface ISMSService {
  // Basic SMS operations
  sendSMS(request: ISendSMSRequest): Promise<ISMSResult>;
  sendBulkSMS(request: IBulkSMSRequest): Promise<IBulkSMSResult>;
  
  // Template management
  createTemplate(template: Omit<ISMSTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISMSTemplate>;
  getTemplate(templateId: string): Promise<ISMSTemplate>;
  updateTemplate(templateId: string, updates: Partial<ISMSTemplate>): Promise<ISMSTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  listTemplates(category?: TemplateCategory): Promise<ISMSTemplate[]>;
  
  // Delivery tracking
  getDeliveryStatus(messageId: string): Promise<IDeliveryTracking>;
  getDeliveryReport(messageId: string): Promise<IDeliveryReport>;
  
  // Health check
  healthCheck(): Promise<INotificationServiceHealth>;
}

export interface INotificationService {
  // Email operations
  sendEmail(request: ISendEmailRequest): Promise<IEmailResult>;
  sendBulkEmails(request: IBulkEmailRequest): Promise<IBulkEmailResult>;
  
  // SMS operations
  sendSMS(request: ISendSMSRequest): Promise<ISMSResult>;
  sendBulkSMS(request: IBulkSMSRequest): Promise<IBulkSMSResult>;
  
  // Template management
  createEmailTemplate(template: Omit<IEmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<IEmailTemplate>;
  createSMSTemplate(template: Omit<ISMSTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISMSTemplate>;
  getEmailTemplate(templateId: string): Promise<IEmailTemplate>;
  getSMSTemplate(templateId: string): Promise<ISMSTemplate>;
  
  // Preference management
  getPreferences(userId: string): Promise<INotificationPreference[]>;
  updatePreferences(request: IUpdatePreferencesRequest): Promise<INotificationPreference[]>;
  
  // Delivery tracking
  getDeliveryStatus(messageId: string): Promise<IDeliveryTracking>;
  trackDeliveryEvent(event: Omit<IDeliveryEvent, 'id'>): Promise<void>;
  
  // Analytics
  getAnalytics(filter?: IAnalyticsFilter): Promise<INotificationAnalytics>;
  
  // Health check
  healthCheck(): Promise<INotificationServiceHealth[]>;
}