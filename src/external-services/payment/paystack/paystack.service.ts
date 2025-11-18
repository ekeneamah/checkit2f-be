import { Injectable, Logger, BadRequestException, ServiceUnavailableException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import {
  IPaymentService,
  ICustomer,
  ICreateCustomerRequest,
  IUpdateCustomerRequest,
  IPaymentIntent,
  ICreatePaymentRequest,
  IConfirmPaymentRequest,
  IPaymentResult,
  IRefund,
  ICreateRefundRequest,
  IRefundResult,
  ISubscriptionPlan,
  ISubscription,
  ICreateSubscriptionRequest,
  IUpdateSubscriptionRequest,
  ISubscriptionResult,
  IInvoice,
  ICreateInvoiceRequest,
  IWebhookEvent,
  IWebhookValidation,
  IPaymentAnalytics,
  IAnalyticsFilter,
  IServiceHealth,
  PaymentProvider,
  PaymentStatus,
  SubscriptionStatus,
  Currency,
  PaymentMethod,
  RefundReason,
  WebhookEvent,
} from '../interfaces/payment.interface';
import { IVerificationRequestRepository } from '../../../verification-request/application/interfaces/verification-request.repository.interface';

/**
 * Paystack Payment Service
 * 
 * Comprehensive Paystack integration for payment processing, customer management,
 * subscription billing, and webhook handling with focus on African markets.
 * 
 * Features:
 * - Payment processing with multiple African payment methods
 * - Customer and subscription management
 * - Multi-currency support (NGN, GHS, ZAR, KES)
 * - Webhook validation and event handling
 * - Analytics and reporting
 * - Bank transfer and USSD support
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Injectable()
export class PaystackService implements IPaymentService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly client: AxiosInstance;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private readonly configService: ConfigService,
    @Inject('IVerificationRequestRepository')
    private readonly verificationRequestRepository: IVerificationRequestRepository,
  ) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('PAYSTACK_WEBHOOK_SECRET', '');

    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is required but not configured');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request/Response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`🔄 Paystack API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error(`❌ Paystack API Request Error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`✅ Paystack API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(`❌ Paystack API Error: ${error.response?.status} ${error.response?.data?.message || error.message}`);
        return Promise.reject(error);
      }
    );

    this.logger.log('💳 Paystack Payment Service initialized');
  }

  // ============================================================================
  // Customer Management
  // ============================================================================

  /**
   * Create a new customer in Paystack
   */
  async createCustomer(request: ICreateCustomerRequest): Promise<ICustomer> {
    try {
      this.logger.log(`Creating Paystack customer: ${request.email}`);

      const customerData = {
        email: request.email,
        first_name: request.name?.split(' ')[0] || '',
        last_name: request.name?.split(' ').slice(1).join(' ') || '',
        phone: request.phone,
        metadata: request.metadata || {},
      };

      const response: AxiosResponse = await this.client.post('/customer', customerData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create customer');
      }

      const customer = response.data.data;
      this.logger.log(`✅ Paystack customer created: ${customer.customer_code}`);

      return this.mapPaystackCustomer(customer);
    } catch (error) {
      this.logger.error(`❌ Failed to create Paystack customer: ${error.message}`);
      throw new BadRequestException(`Failed to create customer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<ICustomer> {
    try {
      const response: AxiosResponse = await this.client.get(`/customer/${customerId}`);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Customer not found');
      }

      return this.mapPaystackCustomer(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to get Paystack customer ${customerId}: ${error.message}`);
      throw new BadRequestException(`Failed to get customer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(customerId: string, request: IUpdateCustomerRequest): Promise<ICustomer> {
    try {
      this.logger.log(`Updating Paystack customer: ${customerId}`);

      const updateData: any = {};

      if (request.email) updateData.email = request.email;
      if (request.name) {
        const nameParts = request.name.split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
      }
      if (request.phone) updateData.phone = request.phone;
      if (request.metadata) updateData.metadata = request.metadata;

      const response: AxiosResponse = await this.client.put(`/customer/${customerId}`, updateData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to update customer');
      }

      this.logger.log(`✅ Paystack customer updated: ${customerId}`);
      return this.mapPaystackCustomer(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to update Paystack customer ${customerId}: ${error.message}`);
      throw new BadRequestException(`Failed to update customer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete customer (Paystack doesn't support customer deletion, so we deactivate)
   */
  async deleteCustomer(customerId: string): Promise<void> {
    try {
      this.logger.log(`Deactivating Paystack customer: ${customerId}`);
      
      // Paystack doesn't have a delete endpoint, so we update metadata to mark as deleted
      await this.client.put(`/customer/${customerId}`, {
        metadata: { deleted: true, deleted_at: new Date().toISOString() }
      });
      
      this.logger.log(`✅ Paystack customer deactivated: ${customerId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to deactivate Paystack customer ${customerId}: ${error.message}`);
      throw new BadRequestException(`Failed to delete customer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List customers with pagination
   */
  async listCustomers(limit: number = 20, startingAfter?: string): Promise<ICustomer[]> {
    try {
      const params: any = { perPage: limit };
      if (startingAfter) params.page = startingAfter;

      const response: AxiosResponse = await this.client.get('/customer', { params });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to list customers');
      }

      return response.data.data.map((customer: any) => this.mapPaystackCustomer(customer));
    } catch (error) {
      this.logger.error(`❌ Failed to list Paystack customers: ${error.message}`);
      throw new BadRequestException(`Failed to list customers: ${error.response?.data?.message || error.message}`);
    }
  }

  // ============================================================================
  // Payment Processing
  // ============================================================================

  /**
   * Create payment intent (Initialize transaction in Paystack)
   */
  async createPaymentIntent(request: ICreatePaymentRequest): Promise<IPaymentResult> {
    try {
      this.logger.log(`Creating Paystack transaction: ${request.amount} ${request.currency}`);

      const transactionData = {
        amount: request.amount,
        currency: request.currency,
        email: '', // Will be filled from customer or receipt email
        customer: request.customerId,
        reference: this.generateReference(),
        callback_url: request.returnUrl,
        metadata: {
          ...request.metadata,
          description: request.description,
        },
        channels: this.getChannelsForCurrency(request.currency),
      };

      // Get customer email if customerId provided
      if (request.customerId) {
        try {
          const customer = await this.getCustomer(request.customerId);
          transactionData.email = customer.email;
        } catch (error) {
          this.logger.warn(`Could not fetch customer ${request.customerId}, using receipt email`);
        }
      }

      // Use receipt email if no customer email found
      if (!transactionData.email && request.receiptEmail) {
        transactionData.email = request.receiptEmail;
      }

      if (!transactionData.email) {
        throw new Error('Email is required for Paystack transactions');
      }

      const response: AxiosResponse = await this.client.post('/transaction/initialize', transactionData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to initialize transaction');
      }

      const transaction = response.data.data;
      this.logger.log(`✅ Paystack transaction initialized: ${transaction.reference}`);

      const paymentIntent: IPaymentIntent = {
        id: transaction.reference,
        amount: request.amount,
        currency: request.currency,
        status: PaymentStatus.PENDING,
        customerId: request.customerId,
        description: request.description,
        metadata: request.metadata,
        clientSecret: transaction.access_code,
        receiptEmail: transactionData.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        paymentIntent,
        requiresAction: true,
        nextAction: {
          type: 'redirect_to_url',
          redirectUrl: transaction.authorization_url,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Paystack transaction: ${error.message}`);
      
      return {
        success: false,
        paymentIntent: null as any,
        error: {
          code: 'TRANSACTION_FAILED',
          message: error.response?.data?.message || error.message,
          type: 'api_error',
        },
      };
    }
  }

  /**
   * Confirm payment (Verify transaction in Paystack)
   */
  async confirmPayment(request: IConfirmPaymentRequest): Promise<IPaymentResult> {
    try {
      this.logger.log(`Verifying Paystack transaction: ${request.paymentIntentId}`);

      const response: AxiosResponse = await this.client.get(`/transaction/verify/${request.paymentIntentId}`);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Transaction verification failed');
      }

      const transaction = response.data.data;
      const paymentIntent = this.mapPaystackTransaction(transaction);

      this.logger.log(`✅ Paystack transaction verified: ${request.paymentIntentId}`);

      return {
        success: transaction.status === 'success',
        paymentIntent,
        requiresAction: false,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to verify Paystack transaction: ${error.message}`);
      
      return {
        success: false,
        paymentIntent: null as any,
        error: {
          code: 'TRANSACTION_VERIFICATION_FAILED',
          message: error.response?.data?.message || error.message,
          type: 'api_error',
        },
      };
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<IPaymentIntent> {
    try {
      const response: AxiosResponse = await this.client.get(`/transaction/verify/${paymentIntentId}`);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Transaction not found');
      }

      return this.mapPaystackTransaction(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to get Paystack transaction ${paymentIntentId}: ${error.message}`);
      throw new BadRequestException(`Failed to get payment intent: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel payment (Paystack doesn't support cancellation, return error)
   */
  async cancelPayment(paymentIntentId: string): Promise<IPaymentResult> {
    this.logger.warn(`Paystack doesn't support payment cancellation for: ${paymentIntentId}`);
    
    return {
      success: false,
      paymentIntent: null as any,
      error: {
        code: 'CANCELLATION_NOT_SUPPORTED',
        message: 'Paystack does not support payment cancellation',
        type: 'api_error',
      },
    };
  }

  /**
   * List payment intents
   */
  async listPayments(customerId?: string, limit: number = 20): Promise<IPaymentIntent[]> {
    try {
      const params: any = { perPage: limit };
      if (customerId) params.customer = customerId;

      const response: AxiosResponse = await this.client.get('/transaction', { params });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to list transactions');
      }

      return response.data.data.map((transaction: any) => this.mapPaystackTransaction(transaction));
    } catch (error) {
      this.logger.error(`❌ Failed to list Paystack transactions: ${error.message}`);
      throw new BadRequestException(`Failed to list payments: ${error.response?.data?.message || error.message}`);
    }
  }

  // ============================================================================
  // Refund Management
  // ============================================================================

  /**
   * Create refund
   */
  async createRefund(request: ICreateRefundRequest): Promise<IRefundResult> {
    try {
      this.logger.log(`Creating Paystack refund for transaction: ${request.paymentIntentId}`);

      const refundData = {
        transaction: request.paymentIntentId,
        amount: request.amount, // Paystack requires amount for partial refunds
        currency: 'NGN', // Default to NGN for refunds
        customer_note: `Refund reason: ${request.reason || 'Customer request'}`,
        merchant_note: `Refund processed via API`,
      };

      const response: AxiosResponse = await this.client.post('/refund', refundData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create refund');
      }

      const refund = response.data.data;
      this.logger.log(`✅ Paystack refund created: ${refund.id}`);

      return {
        success: true,
        refund: this.mapPaystackRefund(refund),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Paystack refund: ${error.message}`);
      
      return {
        success: false,
        refund: null as any,
        error: {
          code: 'REFUND_FAILED',
          message: error.response?.data?.message || error.message,
        },
      };
    }
  }

  /**
   * Get refund by ID
   */
  async getRefund(refundId: string): Promise<IRefund> {
    try {
      const response: AxiosResponse = await this.client.get(`/refund/${refundId}`);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Refund not found');
      }

      return this.mapPaystackRefund(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to get Paystack refund ${refundId}: ${error.message}`);
      throw new BadRequestException(`Failed to get refund: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List refunds
   */
  async listRefunds(paymentIntentId?: string, limit: number = 20): Promise<IRefund[]> {
    try {
      const params: any = { perPage: limit };
      if (paymentIntentId) params.transaction = paymentIntentId;

      const response: AxiosResponse = await this.client.get('/refund', { params });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to list refunds');
      }

      return response.data.data.map((refund: any) => this.mapPaystackRefund(refund));
    } catch (error) {
      this.logger.error(`❌ Failed to list Paystack refunds: ${error.message}`);
      throw new BadRequestException(`Failed to list refunds: ${error.response?.data?.message || error.message}`);
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Create subscription plan
   */
  async createSubscriptionPlan(plan: Omit<ISubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISubscriptionPlan> {
    try {
      this.logger.log(`Creating Paystack subscription plan: ${plan.name}`);

      const planData = {
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        interval: plan.interval,
        currency: plan.currency,
      };

      const response: AxiosResponse = await this.client.post('/plan', planData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create plan');
      }

      const paystackPlan = response.data.data;
      this.logger.log(`✅ Paystack subscription plan created: ${paystackPlan.plan_code}`);

      return this.mapPaystackPlan(paystackPlan);
    } catch (error) {
      this.logger.error(`❌ Failed to create Paystack subscription plan: ${error.message}`);
      throw new BadRequestException(`Failed to create subscription plan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get subscription plan by ID
   */
  async getSubscriptionPlan(planId: string): Promise<ISubscriptionPlan> {
    try {
      const response: AxiosResponse = await this.client.get(`/plan/${planId}`);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Plan not found');
      }

      return this.mapPaystackPlan(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to get Paystack subscription plan ${planId}: ${error.message}`);
      throw new BadRequestException(`Failed to get subscription plan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan(planId: string, plan: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan> {
    try {
      this.logger.log(`Updating Paystack subscription plan: ${planId}`);

      const updateData: any = {};
      if (plan.name) updateData.name = plan.name;
      if (plan.description) updateData.description = plan.description;

      const response: AxiosResponse = await this.client.put(`/plan/${planId}`, updateData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to update plan');
      }

      this.logger.log(`✅ Paystack subscription plan updated: ${planId}`);
      return this.mapPaystackPlan(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to update Paystack subscription plan ${planId}: ${error.message}`);
      throw new BadRequestException(`Failed to update subscription plan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete subscription plan
   */
  async deleteSubscriptionPlan(planId: string): Promise<void> {
    try {
      this.logger.log(`Archiving Paystack subscription plan: ${planId}`);
      
      // Paystack doesn't have a delete endpoint, archive the plan by updating it
      await this.client.put(`/plan/${planId}`, { description: 'ARCHIVED - ' + new Date().toISOString() });
      
      this.logger.log(`✅ Paystack subscription plan archived: ${planId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to archive Paystack subscription plan ${planId}: ${error.message}`);
      throw new BadRequestException(`Failed to delete subscription plan: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List subscription plans
   */
  async listSubscriptionPlans(limit: number = 20): Promise<ISubscriptionPlan[]> {
    try {
      const response: AxiosResponse = await this.client.get('/plan', {
        params: { perPage: limit }
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to list plans');
      }

      return response.data.data.map((plan: any) => this.mapPaystackPlan(plan));
    } catch (error) {
      this.logger.error(`❌ Failed to list Paystack subscription plans: ${error.message}`);
      throw new BadRequestException(`Failed to list subscription plans: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(request: ICreateSubscriptionRequest): Promise<ISubscriptionResult> {
    try {
      this.logger.log(`Creating Paystack subscription for customer: ${request.customerId}`);

      const subscriptionData = {
        customer: request.customerId,
        plan: request.planId,
        authorization: request.paymentMethod, // Authorization code from previous transaction
      };

      const response: AxiosResponse = await this.client.post('/subscription', subscriptionData);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create subscription');
      }

      const subscription = response.data.data;
      this.logger.log(`✅ Paystack subscription created: ${subscription.subscription_code}`);

      return {
        success: true,
        subscription: this.mapPaystackSubscription(subscription),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Paystack subscription: ${error.message}`);
      
      return {
        success: false,
        subscription: null as any,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: error.response?.data?.message || error.message,
        },
      };
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<ISubscription> {
    try {
      const response: AxiosResponse = await this.client.get(`/subscription/${subscriptionId}`);

      if (!response.data.status) {
        throw new Error(response.data.message || 'Subscription not found');
      }

      return this.mapPaystackSubscription(response.data.data);
    } catch (error) {
      this.logger.error(`❌ Failed to get Paystack subscription ${subscriptionId}: ${error.message}`);
      throw new BadRequestException(`Failed to get subscription: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, request: IUpdateSubscriptionRequest): Promise<ISubscriptionResult> {
    this.logger.warn(`Paystack subscription updates are limited. Subscription: ${subscriptionId}`);
    
    // Paystack has limited subscription update capabilities
    // Most updates require canceling and creating a new subscription
    
    return {
      success: false,
      subscription: null as any,
      error: {
        code: 'UPDATE_NOT_SUPPORTED',
        message: 'Paystack has limited subscription update capabilities. Consider canceling and creating a new subscription.',
      },
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<ISubscriptionResult> {
    try {
      this.logger.log(`Canceling Paystack subscription: ${subscriptionId}`);

      const response: AxiosResponse = await this.client.post(`/subscription/disable`, {
        code: subscriptionId,
        token: 'your_email_token' // Email token would be required in real implementation
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to cancel subscription');
      }

      this.logger.log(`✅ Paystack subscription canceled: ${subscriptionId}`);

      // Get updated subscription data
      const subscription = await this.getSubscription(subscriptionId);

      return {
        success: true,
        subscription,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to cancel Paystack subscription ${subscriptionId}: ${error.message}`);
      
      return {
        success: false,
        subscription: null as any,
        error: {
          code: 'SUBSCRIPTION_CANCELLATION_FAILED',
          message: error.response?.data?.message || error.message,
        },
      };
    }
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(customerId?: string, limit: number = 20): Promise<ISubscription[]> {
    try {
      const params: any = { perPage: limit };
      if (customerId) params.customer = customerId;

      const response: AxiosResponse = await this.client.get('/subscription', { params });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to list subscriptions');
      }

      return response.data.data.map((subscription: any) => this.mapPaystackSubscription(subscription));
    } catch (error) {
      this.logger.error(`❌ Failed to list Paystack subscriptions: ${error.message}`);
      throw new BadRequestException(`Failed to list subscriptions: ${error.response?.data?.message || error.message}`);
    }
  }

  // ============================================================================
  // Invoice Management (Limited support in Paystack)
  // ============================================================================

  /**
   * Create invoice (Limited support - using payment pages)
   */
  async createInvoice(request: ICreateInvoiceRequest): Promise<IInvoice> {
    this.logger.warn('Paystack has limited invoice support. Consider using payment pages instead.');
    
    throw new BadRequestException('Invoice creation not supported in Paystack. Use payment pages or direct transactions instead.');
  }

  async getInvoice(invoiceId: string): Promise<IInvoice> {
    throw new BadRequestException('Invoice management not supported in Paystack.');
  }

  async finalizeInvoice(invoiceId: string): Promise<IInvoice> {
    throw new BadRequestException('Invoice management not supported in Paystack.');
  }

  async payInvoice(invoiceId: string): Promise<IInvoice> {
    throw new BadRequestException('Invoice management not supported in Paystack.');
  }

  async listInvoices(customerId?: string, limit: number = 20): Promise<IInvoice[]> {
    return [];
  }

  // ============================================================================
  // Webhook Management
  // ============================================================================

  /**
   * Validate webhook signature
   */
  async validateWebhook(signature: string, payload: string, secret?: string): Promise<IWebhookValidation> {
    try {
      const webhookSecret = secret || this.webhookSecret;
      
      if (!webhookSecret) {
        return {
          isValid: false,
          error: 'Webhook secret not configured',
        };
      }

      const hash = crypto.createHmac('sha512', webhookSecret)
        .update(payload)
        .digest('hex');

      if (hash !== signature) {
        return {
          isValid: false,
          error: 'Invalid webhook signature',
        };
      }

      const event = JSON.parse(payload);
      
      return {
        isValid: true,
        event: {
          id: event.id || `paystack_${Date.now()}`,
          type: this.mapPaystackEventType(event.event) as WebhookEvent,
          data: event.data,
          provider: PaymentProvider.PAYSTACK,
          signature,
          createdAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Paystack webhook validation failed: ${error.message}`);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event: IWebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing Paystack webhook event: ${event.type}`);
      
      switch (event.type) {
        case WebhookEvent.PAYMENT_SUCCEEDED:
          await this.handleChargeSuccess(event.data);
          break;
        case WebhookEvent.PAYMENT_FAILED:
          await this.handleChargeFailed(event.data);
          break;
        case WebhookEvent.SUBSCRIPTION_CREATED:
          await this.handleSubscriptionCreate(event.data);
          break;
        case WebhookEvent.SUBSCRIPTION_CANCELED:
          await this.handleSubscriptionDisable(event.data);
          break;
        case WebhookEvent.INVOICE_CREATED:
          await this.handleInvoiceCreate(event.data);
          break;
        case WebhookEvent.INVOICE_PAID:
        case WebhookEvent.INVOICE_FAILED:
          await this.handleInvoiceUpdate(event.data);
          break;
        default:
          this.logger.log(`Unhandled Paystack webhook event: ${event.type}`);
      }
      
      this.logger.log(`✅ Paystack webhook event processed: ${event.type}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process Paystack webhook event: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get payment analytics
   */
  async getAnalytics(filter?: IAnalyticsFilter): Promise<IPaymentAnalytics> {
    try {
      this.logger.log('Generating Paystack payment analytics');

      const params: any = { perPage: 100 };
      
      if (filter?.startDate) {
        params.from = filter.startDate;
      }
      
      if (filter?.endDate) {
        params.to = filter.endDate;
      }

      const response: AxiosResponse = await this.client.get('/transaction', { params });

      if (!response.data.status) {
        throw new Error('Failed to fetch transactions for analytics');
      }

      const transactions = response.data.data;
      
      // Calculate analytics
      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter((tx: any) => tx.status === 'success');
      const totalAmount = successfulTransactions.reduce((sum: number, tx: any) => sum + tx.amount, 0);
      const successRate = totalTransactions > 0 ? (successfulTransactions.length / totalTransactions) * 100 : 0;
      const averageAmount = successfulTransactions.length > 0 ? totalAmount / successfulTransactions.length : 0;

      this.logger.log('✅ Paystack payment analytics generated');

      return {
        totalTransactions,
        totalAmount,
        successRate,
        averageAmount,
        topCurrencies: [
          { currency: Currency.NGN, count: totalTransactions, amount: totalAmount },
        ],
        paymentMethods: [
          { method: PaymentMethod.CARD, count: totalTransactions, percentage: 100 },
        ],
        dailyStats: [
          {
            date: new Date().toISOString().split('T')[0],
            transactions: totalTransactions,
            amount: totalAmount,
            successRate,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`❌ Failed to generate Paystack analytics: ${error.message}`);
      throw new BadRequestException(`Failed to generate analytics: ${error.response?.data?.message || error.message}`);
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Service health check
   */
  async healthCheck(): Promise<IServiceHealth> {
    try {
      const startTime = Date.now();
      
      // Simple API call to verify connectivity
      await this.client.get('/transaction?perPage=1');
      
      const responseTime = Date.now() - startTime;

      return {
        provider: PaymentProvider.PAYSTACK,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0,
        apiKeyValid: true,
      };
    } catch (error) {
      this.logger.error(`Paystack health check failed: ${error.message}`);
      
      return {
        provider: PaymentProvider.PAYSTACK,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: -1,
        errorRate: 100,
        apiKeyValid: false,
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private mapPaystackCustomer(customer: any): ICustomer {
    return {
      id: customer.customer_code || customer.id,
      email: customer.email,
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || undefined,
      phone: customer.phone || undefined,
      address: undefined, // Paystack doesn't store detailed address info
      defaultPaymentMethod: undefined,
      metadata: customer.metadata || {},
      createdAt: new Date(customer.createdAt || customer.created_at),
      updatedAt: new Date(customer.updatedAt || customer.updated_at || customer.createdAt || customer.created_at),
    };
  }

  private mapPaystackTransaction(transaction: any): IPaymentIntent {
    return {
      id: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency as Currency,
      status: this.mapPaystackTransactionStatus(transaction.status),
      customerId: transaction.customer?.customer_code || undefined,
      description: transaction.metadata?.description || undefined,
      metadata: transaction.metadata || {},
      clientSecret: transaction.access_code || undefined,
      receiptEmail: transaction.customer?.email || undefined,
      createdAt: new Date(transaction.createdAt || transaction.created_at),
      updatedAt: new Date(transaction.paidAt || transaction.paid_at || transaction.createdAt || transaction.created_at),
    };
  }

  private mapPaystackRefund(refund: any): IRefund {
    return {
      id: refund.id.toString(),
      paymentIntentId: refund.transaction.reference,
      amount: refund.amount,
      currency: refund.currency as Currency,
      reason: RefundReason.REQUESTED_BY_CUSTOMER,
      status: this.mapPaystackRefundStatus(refund.status),
      metadata: refund.merchant_note ? { merchant_note: refund.merchant_note } : {},
      createdAt: new Date(refund.createdAt || refund.created_at),
    };
  }

  private mapPaystackPlan(plan: any): ISubscriptionPlan {
    return {
      id: plan.plan_code || plan.id,
      name: plan.name,
      description: plan.description || undefined,
      amount: plan.amount,
      currency: plan.currency as Currency,
      interval: plan.interval as any,
      intervalCount: plan.interval_count || 1,
      trialPeriodDays: undefined, // Paystack doesn't have trial periods in plan
      metadata: {},
      createdAt: new Date(plan.createdAt || plan.created_at),
      updatedAt: new Date(plan.updatedAt || plan.updated_at || plan.createdAt || plan.created_at),
    };
  }

  private mapPaystackSubscription(subscription: any): ISubscription {
    return {
      id: subscription.subscription_code || subscription.id,
      customerId: subscription.customer.customer_code,
      planId: subscription.plan.plan_code,
      status: this.mapPaystackSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.createdAt || subscription.created_at),
      currentPeriodEnd: new Date(subscription.next_payment_date || Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialStart: undefined,
      trialEnd: undefined,
      canceledAt: subscription.status === 'cancelled' ? new Date() : undefined,
      cancelAtPeriodEnd: false,
      defaultPaymentMethod: subscription.authorization?.authorization_code || undefined,
      metadata: {},
      createdAt: new Date(subscription.createdAt || subscription.created_at),
      updatedAt: new Date(subscription.updatedAt || subscription.updated_at || subscription.createdAt || subscription.created_at),
    };
  }

  private mapPaystackTransactionStatus(status: string): PaymentStatus {
    switch (status?.toLowerCase()) {
      case 'success': return PaymentStatus.SUCCEEDED;
      case 'pending': return PaymentStatus.PENDING;
      case 'processing': return PaymentStatus.PROCESSING;
      case 'failed': return PaymentStatus.FAILED;
      case 'abandoned': return PaymentStatus.CANCELED;
      default: return PaymentStatus.PENDING;
    }
  }

  private mapPaystackRefundStatus(status: string): PaymentStatus {
    switch (status?.toLowerCase()) {
      case 'processed': return PaymentStatus.REFUNDED;
      case 'pending': return PaymentStatus.PROCESSING;
      case 'failed': return PaymentStatus.FAILED;
      default: return PaymentStatus.PROCESSING;
    }
  }

  private mapPaystackSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status?.toLowerCase()) {
      case 'active': return SubscriptionStatus.ACTIVE;
      case 'cancelled': return SubscriptionStatus.CANCELED;
      case 'completed': return SubscriptionStatus.INACTIVE;
      default: return SubscriptionStatus.ACTIVE;
    }
  }

  private mapPaystackEventType(eventType: string): WebhookEvent | string {
    // Map Paystack event types to our standard webhook events
    switch (eventType) {
      case 'charge.success': return WebhookEvent.PAYMENT_SUCCEEDED;
      case 'charge.failed': return WebhookEvent.PAYMENT_FAILED;
      case 'subscription.create': return WebhookEvent.SUBSCRIPTION_CREATED;
      case 'subscription.disable': return WebhookEvent.SUBSCRIPTION_CANCELED;
      case 'invoice.create': return WebhookEvent.INVOICE_CREATED;
      case 'invoice.update': return WebhookEvent.INVOICE_PAID; // or INVOICE_FAILED depending on status
      default: return eventType;
    }
  }

  private generateReference(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getChannelsForCurrency(currency: Currency): string[] {
    switch (currency) {
      case Currency.NGN:
        return ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];
      case Currency.GHS:
        return ['card', 'bank', 'mobile_money'];
      case Currency.ZAR:
        return ['card', 'bank'];
      case Currency.KES:
        return ['card', 'bank', 'mobile_money'];
      default:
        return ['card'];
    }
  }

  // Webhook event handlers
  private async handleChargeSuccess(data: any): Promise<void> {
    try {
      this.logger.log(`💳 Payment succeeded: ${data.reference}`);
      
      // Find pending verification request by payment reference
      const request = await this.verificationRequestRepository.findByPaymentReference(data.reference);
      
      if (!request) {
        this.logger.warn(`⚠️ No verification request found for payment reference: ${data.reference}`);
        return;
      }

      this.logger.log(`✅ Found verification request ${request.id} for payment ${data.reference}`);
      
      // Confirm payment and transition status to SUBMITTED
      request.confirmPayment(data.id.toString());
      
      // Save updated request
      await this.verificationRequestRepository.save(request);
      
      this.logger.log(`✅ Payment confirmed for verification request ${request.id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to handle charge success: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleChargeFailed(data: any): Promise<void> {
    this.logger.log(`Charge failed: ${data.reference}`);
    // Implement business logic for failed payment
  }

  private async handleSubscriptionCreate(data: any): Promise<void> {
    this.logger.log(`Subscription created: ${data.subscription_code}`);
    // Implement business logic for new subscription
  }

  private async handleSubscriptionDisable(data: any): Promise<void> {
    this.logger.log(`Subscription disabled: ${data.subscription_code}`);
    // Implement business logic for subscription cancellation
  }

  private async handleInvoiceCreate(data: any): Promise<void> {
    this.logger.log(`Invoice created: ${data.id}`);
    // Implement business logic for invoice creation
  }

  private async handleInvoiceUpdate(data: any): Promise<void> {
    this.logger.log(`Invoice updated: ${data.id}`);
    // Implement business logic for invoice update
  }
}