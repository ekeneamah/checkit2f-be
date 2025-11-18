/**
 * Payment Service Interfaces
 * 
 * Comprehensive interfaces for payment processing integration
 * supporting multiple payment gateways (Stripe, Paystack) with
 * unified API design.
 * 
 * Features:
 * - Payment processing and refunds
 * - Customer and subscription management  
 * - Webhook handling and security
 * - Transaction monitoring and analytics
 * - Multi-currency and localization support
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

// ============================================================================
// Core Enumerations
// ============================================================================

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYSTACK = 'paystack',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  USSD = 'ussd',
  QR_CODE = 'qr_code',
  MOBILE_MONEY = 'mobile_money',
}

export enum Currency {
  USD = 'USD',
  NGN = 'NGN',
  GHS = 'GHS',
  KES = 'KES',
  ZAR = 'ZAR',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  INCOMPLETE = 'incomplete',
}

export enum WebhookEvent {
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_CANCELED = 'payment.canceled',
  REFUND_CREATED = 'refund.created',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_FAILED = 'invoice.failed',
}

export enum RefundReason {
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  PRODUCT_UNSATISFACTORY = 'product_unsatisfactory',
  OTHER = 'other',
}

// ============================================================================
// Core Data Structures
// ============================================================================

export interface IAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ICard {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  country?: string;
  funding?: string;
}

export interface IBillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: IAddress;
}

export interface IPaymentMethodDetails {
  type: PaymentMethod;
  card?: ICard;
  bankTransfer?: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  };
  wallet?: {
    provider: string;
    accountId: string;
  };
}

// ============================================================================
// Customer Management
// ============================================================================

export interface ICustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: IAddress;
  defaultPaymentMethod?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateCustomerRequest {
  email: string;
  name?: string;
  phone?: string;
  address?: IAddress;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export interface IUpdateCustomerRequest {
  email?: string;
  name?: string;
  phone?: string;
  address?: IAddress;
  defaultPaymentMethod?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Payment Processing
// ============================================================================

export interface IPaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  customerId?: string;
  paymentMethod?: IPaymentMethodDetails;
  description?: string;
  metadata?: Record<string, any>;
  clientSecret?: string;
  receiptEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreatePaymentRequest {
  amount: number;
  currency: Currency;
  customerId?: string;
  paymentMethod?: string;
  description?: string;
  metadata?: Record<string, any>;
  receiptEmail?: string;
  returnUrl?: string;
  automaticPaymentMethods?: boolean;
}

export interface IConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethod?: string;
  returnUrl?: string;
}

export interface IPaymentResult {
  success: boolean;
  paymentIntent: IPaymentIntent;
  error?: {
    code: string;
    message: string;
    type: string;
  };
  requiresAction?: boolean;
  nextAction?: {
    type: string;
    redirectUrl?: string;
  };
}

// ============================================================================
// Refund Management
// ============================================================================

export interface IRefund {
  id: string;
  paymentIntentId: string;
  amount: number;
  currency: Currency;
  reason?: RefundReason;
  status: PaymentStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ICreateRefundRequest {
  paymentIntentId: string;
  amount?: number; // Full refund if not specified
  reason?: RefundReason;
  metadata?: Record<string, any>;
}

export interface IRefundResult {
  success: boolean;
  refund: IRefund;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Subscription Management
// ============================================================================

export interface ISubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: Currency;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  defaultPaymentMethod?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateSubscriptionRequest {
  customerId: string;
  planId: string;
  paymentMethod?: string;
  trialPeriodDays?: number;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
}

export interface IUpdateSubscriptionRequest {
  planId?: string;
  paymentMethod?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
}

export interface ISubscriptionResult {
  success: boolean;
  subscription: ISubscription;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Invoice Management
// ============================================================================

export interface IInvoiceLineItem {
  description: string;
  amount: number;
  currency: Currency;
  quantity: number;
  metadata?: Record<string, any>;
}

export interface IInvoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: Currency;
  lineItems: IInvoiceLineItem[];
  dueDate?: Date;
  paidAt?: Date;
  paymentMethod?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateInvoiceRequest {
  customerId: string;
  lineItems: IInvoiceLineItem[];
  dueDate?: Date;
  description?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Webhook Management
// ============================================================================

export interface IWebhookEvent {
  id: string;
  type: WebhookEvent;
  data: any;
  provider: PaymentProvider;
  signature: string;
  createdAt: Date;
}

export interface IWebhookConfig {
  endpoint: string;
  secret: string;
  events: WebhookEvent[];
  provider: PaymentProvider;
}

export interface IWebhookValidation {
  isValid: boolean;
  event?: IWebhookEvent;
  error?: string;
}

// ============================================================================
// Analytics and Reporting
// ============================================================================

export interface IPaymentAnalytics {
  totalTransactions: number;
  totalAmount: number;
  successRate: number;
  averageAmount: number;
  topCurrencies: Array<{
    currency: Currency;
    count: number;
    amount: number;
  }>;
  paymentMethods: Array<{
    method: PaymentMethod;
    count: number;
    percentage: number;
  }>;
  dailyStats: Array<{
    date: string;
    transactions: number;
    amount: number;
    successRate: number;
  }>;
}

export interface IAnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  currency?: Currency;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  customerId?: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface IPaymentConfig {
  stripe?: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    apiVersion?: string;
  };
  paystack?: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
  };
  defaultProvider: PaymentProvider;
  defaultCurrency: Currency;
  webhookEndpoint: string;
  retryConfig: {
    maxRetries: number;
    backoffDelay: number;
  };
}

export interface IServiceHealth {
  provider: PaymentProvider;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  apiKeyValid: boolean;
}

// ============================================================================
// Payment Service Interface
// ============================================================================

export interface IPaymentService {
  // Customer Management
  createCustomer(request: ICreateCustomerRequest): Promise<ICustomer>;
  getCustomer(customerId: string): Promise<ICustomer>;
  updateCustomer(customerId: string, request: IUpdateCustomerRequest): Promise<ICustomer>;
  deleteCustomer(customerId: string): Promise<void>;
  listCustomers(limit?: number, startingAfter?: string): Promise<ICustomer[]>;

  // Payment Processing
  createPaymentIntent(request: ICreatePaymentRequest): Promise<IPaymentResult>;
  confirmPayment(request: IConfirmPaymentRequest): Promise<IPaymentResult>;
  getPaymentIntent(paymentIntentId: string): Promise<IPaymentIntent>;
  cancelPayment(paymentIntentId: string): Promise<IPaymentResult>;
  listPayments(customerId?: string, limit?: number): Promise<IPaymentIntent[]>;

  // Refund Management
  createRefund(request: ICreateRefundRequest): Promise<IRefundResult>;
  getRefund(refundId: string): Promise<IRefund>;
  listRefunds(paymentIntentId?: string, limit?: number): Promise<IRefund[]>;

  // Subscription Management
  createSubscriptionPlan(plan: Omit<ISubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISubscriptionPlan>;
  getSubscriptionPlan(planId: string): Promise<ISubscriptionPlan>;
  updateSubscriptionPlan(planId: string, plan: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan>;
  deleteSubscriptionPlan(planId: string): Promise<void>;
  listSubscriptionPlans(limit?: number): Promise<ISubscriptionPlan[]>;

  createSubscription(request: ICreateSubscriptionRequest): Promise<ISubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<ISubscription>;
  updateSubscription(subscriptionId: string, request: IUpdateSubscriptionRequest): Promise<ISubscriptionResult>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<ISubscriptionResult>;
  listSubscriptions(customerId?: string, limit?: number): Promise<ISubscription[]>;

  // Invoice Management
  createInvoice(request: ICreateInvoiceRequest): Promise<IInvoice>;
  getInvoice(invoiceId: string): Promise<IInvoice>;
  finalizeInvoice(invoiceId: string): Promise<IInvoice>;
  payInvoice(invoiceId: string): Promise<IInvoice>;
  listInvoices(customerId?: string, limit?: number): Promise<IInvoice[]>;

  // Webhook Management
  validateWebhook(signature: string, payload: string, secret?: string): Promise<IWebhookValidation>;
  handleWebhookEvent(event: IWebhookEvent): Promise<void>;

  // Analytics and Reporting
  getAnalytics(filter?: IAnalyticsFilter): Promise<IPaymentAnalytics>;

  // Service Health
  healthCheck(): Promise<IServiceHealth>;
}

// ============================================================================
// Response Wrapper
// ============================================================================

export interface IPaymentServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    provider: PaymentProvider;
    executionTime: number;
  };
}