import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
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

/**
 * Stripe Payment Service
 * 
 * Comprehensive Stripe integration for payment processing, customer management,
 * subscription billing, and webhook handling.
 * 
 * Features:
 * - Payment processing with 3D Secure support
 * - Customer and subscription management
 * - Refund processing with reason tracking
 * - Webhook validation and event handling
 * - Analytics and reporting
 * - PCI compliance and security
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Injectable()
export class StripeService implements IPaymentService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const apiVersion = this.configService.get<string>('STRIPE_API_VERSION', '2023-10-16');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required but not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
      timeout: 30000,
      maxNetworkRetries: 3,
    });

    this.logger.log('💳 Stripe Payment Service initialized');
  }

  // ============================================================================
  // Customer Management
  // ============================================================================

  /**
   * Create a new customer in Stripe
   */
  async createCustomer(request: ICreateCustomerRequest): Promise<ICustomer> {
    try {
      this.logger.log(`Creating Stripe customer: ${request.email}`);

      const customerData: Stripe.CustomerCreateParams = {
        email: request.email,
        name: request.name,
        phone: request.phone,
        metadata: request.metadata || {},
      };

      if (request.address) {
        customerData.address = {
          line1: request.address.line1,
          line2: request.address.line2,
          city: request.address.city,
          state: request.address.state,
          postal_code: request.address.postalCode,
          country: request.address.country,
        };
      }

      if (request.paymentMethod) {
        customerData.payment_method = request.paymentMethod;
      }

      const customer = await this.stripe.customers.create(customerData);

      this.logger.log(`✅ Stripe customer created: ${customer.id}`);
      return this.mapStripeCustomer(customer);
    } catch (error) {
      this.logger.error(`❌ Failed to create Stripe customer: ${error.message}`);
      throw new BadRequestException(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<ICustomer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      
      if (customer.deleted) {
        throw new BadRequestException('Customer has been deleted');
      }

      return this.mapStripeCustomer(customer as Stripe.Customer);
    } catch (error) {
      this.logger.error(`❌ Failed to get Stripe customer ${customerId}: ${error.message}`);
      throw new BadRequestException(`Failed to get customer: ${error.message}`);
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(customerId: string, request: IUpdateCustomerRequest): Promise<ICustomer> {
    try {
      this.logger.log(`Updating Stripe customer: ${customerId}`);

      const updateData: Stripe.CustomerUpdateParams = {};

      if (request.email) updateData.email = request.email;
      if (request.name) updateData.name = request.name;
      if (request.phone) updateData.phone = request.phone;
      if (request.metadata) updateData.metadata = request.metadata;
      if (request.defaultPaymentMethod) updateData.invoice_settings = {
        default_payment_method: request.defaultPaymentMethod,
      };

      if (request.address) {
        updateData.address = {
          line1: request.address.line1,
          line2: request.address.line2,
          city: request.address.city,
          state: request.address.state,
          postal_code: request.address.postalCode,
          country: request.address.country,
        };
      }

      const customer = await this.stripe.customers.update(customerId, updateData);

      this.logger.log(`✅ Stripe customer updated: ${customerId}`);
      return this.mapStripeCustomer(customer);
    } catch (error) {
      this.logger.error(`❌ Failed to update Stripe customer ${customerId}: ${error.message}`);
      throw new BadRequestException(`Failed to update customer: ${error.message}`);
    }
  }

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string): Promise<void> {
    try {
      this.logger.log(`Deleting Stripe customer: ${customerId}`);
      await this.stripe.customers.del(customerId);
      this.logger.log(`✅ Stripe customer deleted: ${customerId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete Stripe customer ${customerId}: ${error.message}`);
      throw new BadRequestException(`Failed to delete customer: ${error.message}`);
    }
  }

  /**
   * List customers with pagination
   */
  async listCustomers(limit: number = 20, startingAfter?: string): Promise<ICustomer[]> {
    try {
      const params: Stripe.CustomerListParams = { limit };
      if (startingAfter) params.starting_after = startingAfter;

      const customers = await this.stripe.customers.list(params);
      return customers.data.map(customer => this.mapStripeCustomer(customer));
    } catch (error) {
      this.logger.error(`❌ Failed to list Stripe customers: ${error.message}`);
      throw new BadRequestException(`Failed to list customers: ${error.message}`);
    }
  }

  // ============================================================================
  // Payment Processing
  // ============================================================================

  /**
   * Create payment intent
   */
  async createPaymentIntent(request: ICreatePaymentRequest): Promise<IPaymentResult> {
    try {
      this.logger.log(`Creating Stripe payment intent: ${request.amount} ${request.currency}`);

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: request.amount,
        currency: request.currency.toLowerCase(),
        description: request.description,
        metadata: request.metadata || {},
        receipt_email: request.receiptEmail,
        automatic_payment_methods: request.automaticPaymentMethods ? { enabled: true } : undefined,
      };

      if (request.customerId) {
        paymentIntentData.customer = request.customerId;
      }

      if (request.paymentMethod) {
        paymentIntentData.payment_method = request.paymentMethod;
        paymentIntentData.confirm = true;
        if (request.returnUrl) {
          paymentIntentData.return_url = request.returnUrl;
        }
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      this.logger.log(`✅ Stripe payment intent created: ${paymentIntent.id}`);

      return {
        success: true,
        paymentIntent: this.mapStripePaymentIntent(paymentIntent),
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action ? {
          type: paymentIntent.next_action.type,
          redirectUrl: paymentIntent.next_action.redirect_to_url?.url,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Stripe payment intent: ${error.message}`);
      
      return {
        success: false,
        paymentIntent: null as any,
        error: {
          code: error.code || 'PAYMENT_INTENT_FAILED',
          message: error.message,
          type: error.type || 'api_error',
        },
      };
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPayment(request: IConfirmPaymentRequest): Promise<IPaymentResult> {
    try {
      this.logger.log(`Confirming Stripe payment intent: ${request.paymentIntentId}`);

      const confirmData: Stripe.PaymentIntentConfirmParams = {};
      
      if (request.paymentMethod) {
        confirmData.payment_method = request.paymentMethod;
      }
      
      if (request.returnUrl) {
        confirmData.return_url = request.returnUrl;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        request.paymentIntentId,
        confirmData
      );

      this.logger.log(`✅ Stripe payment intent confirmed: ${paymentIntent.id}`);

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntent: this.mapStripePaymentIntent(paymentIntent),
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action ? {
          type: paymentIntent.next_action.type,
          redirectUrl: paymentIntent.next_action.redirect_to_url?.url,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to confirm Stripe payment intent: ${error.message}`);
      
      return {
        success: false,
        paymentIntent: null as any,
        error: {
          code: error.code || 'PAYMENT_CONFIRMATION_FAILED',
          message: error.message,
          type: error.type || 'api_error',
        },
      };
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<IPaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      this.logger.error(`❌ Failed to get Stripe payment intent ${paymentIntentId}: ${error.message}`);
      throw new BadRequestException(`Failed to get payment intent: ${error.message}`);
    }
  }

  /**
   * Cancel payment intent
   */
  async cancelPayment(paymentIntentId: string): Promise<IPaymentResult> {
    try {
      this.logger.log(`Canceling Stripe payment intent: ${paymentIntentId}`);
      
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      
      this.logger.log(`✅ Stripe payment intent canceled: ${paymentIntentId}`);
      
      return {
        success: true,
        paymentIntent: this.mapStripePaymentIntent(paymentIntent),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to cancel Stripe payment intent: ${error.message}`);
      
      return {
        success: false,
        paymentIntent: null as any,
        error: {
          code: error.code || 'PAYMENT_CANCELLATION_FAILED',
          message: error.message,
          type: error.type || 'api_error',
        },
      };
    }
  }

  /**
   * List payment intents
   */
  async listPayments(customerId?: string, limit: number = 20): Promise<IPaymentIntent[]> {
    try {
      const params: Stripe.PaymentIntentListParams = { limit };
      if (customerId) params.customer = customerId;

      const paymentIntents = await this.stripe.paymentIntents.list(params);
      return paymentIntents.data.map(pi => this.mapStripePaymentIntent(pi));
    } catch (error) {
      this.logger.error(`❌ Failed to list Stripe payment intents: ${error.message}`);
      throw new BadRequestException(`Failed to list payments: ${error.message}`);
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
      this.logger.log(`Creating Stripe refund for payment: ${request.paymentIntentId}`);

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: request.paymentIntentId,
        metadata: request.metadata || {},
      };

      if (request.amount) {
        refundData.amount = request.amount;
      }

      if (request.reason) {
        refundData.reason = this.mapRefundReason(request.reason);
      }

      const refund = await this.stripe.refunds.create(refundData);

      this.logger.log(`✅ Stripe refund created: ${refund.id}`);

      return {
        success: true,
        refund: this.mapStripeRefund(refund),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Stripe refund: ${error.message}`);
      
      return {
        success: false,
        refund: null as any,
        error: {
          code: error.code || 'REFUND_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Get refund by ID
   */
  async getRefund(refundId: string): Promise<IRefund> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return this.mapStripeRefund(refund);
    } catch (error) {
      this.logger.error(`❌ Failed to get Stripe refund ${refundId}: ${error.message}`);
      throw new BadRequestException(`Failed to get refund: ${error.message}`);
    }
  }

  /**
   * List refunds
   */
  async listRefunds(paymentIntentId?: string, limit: number = 20): Promise<IRefund[]> {
    try {
      const params: Stripe.RefundListParams = { limit };
      if (paymentIntentId) params.payment_intent = paymentIntentId;

      const refunds = await this.stripe.refunds.list(params);
      return refunds.data.map(refund => this.mapStripeRefund(refund));
    } catch (error) {
      this.logger.error(`❌ Failed to list Stripe refunds: ${error.message}`);
      throw new BadRequestException(`Failed to list refunds: ${error.message}`);
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
      this.logger.log(`Creating Stripe subscription plan: ${plan.name}`);

      // Create product first
      const product = await this.stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata || {},
      });

      // Create price for the product
      const price = await this.stripe.prices.create({
        unit_amount: plan.amount,
        currency: plan.currency.toLowerCase(),
        recurring: {
          interval: plan.interval,
          interval_count: plan.intervalCount,
        },
        product: product.id,
        metadata: plan.metadata || {},
      });

      this.logger.log(`✅ Stripe subscription plan created: ${price.id}`);

      return {
        id: price.id,
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        trialPeriodDays: plan.trialPeriodDays,
        metadata: plan.metadata,
        createdAt: new Date(price.created * 1000),
        updatedAt: new Date(price.created * 1000),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Stripe subscription plan: ${error.message}`);
      throw new BadRequestException(`Failed to create subscription plan: ${error.message}`);
    }
  }

  /**
   * Get subscription plan by ID
   */
  async getSubscriptionPlan(planId: string): Promise<ISubscriptionPlan> {
    try {
      const price = await this.stripe.prices.retrieve(planId, { expand: ['product'] });
      return this.mapStripePrice(price);
    } catch (error) {
      this.logger.error(`❌ Failed to get Stripe subscription plan ${planId}: ${error.message}`);
      throw new BadRequestException(`Failed to get subscription plan: ${error.message}`);
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan(planId: string, plan: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan> {
    try {
      this.logger.log(`Updating Stripe subscription plan: ${planId}`);

      const updateData: Stripe.PriceUpdateParams = {};
      if (plan.metadata) updateData.metadata = plan.metadata;

      const price = await this.stripe.prices.update(planId, updateData);
      
      // Update product if name or description changed
      if (plan.name || plan.description) {
        const productUpdateData: Stripe.ProductUpdateParams = {};
        if (plan.name) productUpdateData.name = plan.name;
        if (plan.description) productUpdateData.description = plan.description;
        
        await this.stripe.products.update(price.product as string, productUpdateData);
      }

      this.logger.log(`✅ Stripe subscription plan updated: ${planId}`);
      return this.getSubscriptionPlan(planId);
    } catch (error) {
      this.logger.error(`❌ Failed to update Stripe subscription plan ${planId}: ${error.message}`);
      throw new BadRequestException(`Failed to update subscription plan: ${error.message}`);
    }
  }

  /**
   * Delete subscription plan
   */
  async deleteSubscriptionPlan(planId: string): Promise<void> {
    try {
      this.logger.log(`Archiving Stripe subscription plan: ${planId}`);
      
      // Stripe doesn't allow deleting prices, only archiving them
      await this.stripe.prices.update(planId, { active: false });
      
      this.logger.log(`✅ Stripe subscription plan archived: ${planId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to archive Stripe subscription plan ${planId}: ${error.message}`);
      throw new BadRequestException(`Failed to delete subscription plan: ${error.message}`);
    }
  }

  /**
   * List subscription plans
   */
  async listSubscriptionPlans(limit: number = 20): Promise<ISubscriptionPlan[]> {
    try {
      const prices = await this.stripe.prices.list({
        limit,
        active: true,
        type: 'recurring',
        expand: ['data.product'],
      });
      
      return prices.data.map(price => this.mapStripePrice(price));
    } catch (error) {
      this.logger.error(`❌ Failed to list Stripe subscription plans: ${error.message}`);
      throw new BadRequestException(`Failed to list subscription plans: ${error.message}`);
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(request: ICreateSubscriptionRequest): Promise<ISubscriptionResult> {
    try {
      this.logger.log(`Creating Stripe subscription for customer: ${request.customerId}`);

      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: request.customerId,
        items: [{ price: request.planId }],
        metadata: request.metadata || {},
        cancel_at_period_end: request.cancelAtPeriodEnd || false,
      };

      if (request.paymentMethod) {
        subscriptionData.default_payment_method = request.paymentMethod;
      }

      if (request.trialPeriodDays) {
        subscriptionData.trial_period_days = request.trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      this.logger.log(`✅ Stripe subscription created: ${subscription.id}`);

      return {
        success: true,
        subscription: this.mapStripeSubscription(subscription),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to create Stripe subscription: ${error.message}`);
      
      return {
        success: false,
        subscription: null as any,
        error: {
          code: error.code || 'SUBSCRIPTION_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<ISubscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return this.mapStripeSubscription(subscription);
    } catch (error) {
      this.logger.error(`❌ Failed to get Stripe subscription ${subscriptionId}: ${error.message}`);
      throw new BadRequestException(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, request: IUpdateSubscriptionRequest): Promise<ISubscriptionResult> {
    try {
      this.logger.log(`Updating Stripe subscription: ${subscriptionId}`);

      const updateData: Stripe.SubscriptionUpdateParams = {};

      if (request.planId) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateData.items = [{
          id: subscription.items.data[0].id,
          price: request.planId,
        }];
      }

      if (request.paymentMethod) {
        updateData.default_payment_method = request.paymentMethod;
      }

      if (request.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = request.cancelAtPeriodEnd;
      }

      if (request.metadata) {
        updateData.metadata = request.metadata;
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, updateData);

      this.logger.log(`✅ Stripe subscription updated: ${subscriptionId}`);

      return {
        success: true,
        subscription: this.mapStripeSubscription(subscription),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to update Stripe subscription ${subscriptionId}: ${error.message}`);
      
      return {
        success: false,
        subscription: null as any,
        error: {
          code: error.code || 'SUBSCRIPTION_UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<ISubscriptionResult> {
    try {
      this.logger.log(`Canceling Stripe subscription: ${subscriptionId}`);

      let subscription: Stripe.Subscription;

      if (cancelAtPeriodEnd) {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      }

      this.logger.log(`✅ Stripe subscription canceled: ${subscriptionId}`);

      return {
        success: true,
        subscription: this.mapStripeSubscription(subscription),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to cancel Stripe subscription ${subscriptionId}: ${error.message}`);
      
      return {
        success: false,
        subscription: null as any,
        error: {
          code: error.code || 'SUBSCRIPTION_CANCELLATION_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(customerId?: string, limit: number = 20): Promise<ISubscription[]> {
    try {
      const params: Stripe.SubscriptionListParams = { limit };
      if (customerId) params.customer = customerId;

      const subscriptions = await this.stripe.subscriptions.list(params);
      return subscriptions.data.map(sub => this.mapStripeSubscription(sub));
    } catch (error) {
      this.logger.error(`❌ Failed to list Stripe subscriptions: ${error.message}`);
      throw new BadRequestException(`Failed to list subscriptions: ${error.message}`);
    }
  }

  // ============================================================================
  // Invoice Management  
  // ============================================================================

  /**
   * Create invoice
   */
  async createInvoice(request: ICreateInvoiceRequest): Promise<IInvoice> {
    try {
      this.logger.log(`Creating Stripe invoice for customer: ${request.customerId}`);

      // Create invoice items first
      for (const item of request.lineItems) {
        await this.stripe.invoiceItems.create({
          customer: request.customerId,
          amount: item.amount,
          currency: item.currency.toLowerCase(),
          description: item.description,
          quantity: item.quantity,
          metadata: item.metadata || {},
        });
      }

      // Create the invoice
      const invoiceData: Stripe.InvoiceCreateParams = {
        customer: request.customerId,
        description: request.description,
        metadata: request.metadata || {},
      };

      if (request.dueDate) {
        invoiceData.due_date = Math.floor(request.dueDate.getTime() / 1000);
      }

      const invoice = await this.stripe.invoices.create(invoiceData);

      this.logger.log(`✅ Stripe invoice created: ${invoice.id}`);
      return this.mapStripeInvoice(invoice);
    } catch (error) {
      this.logger.error(`❌ Failed to create Stripe invoice: ${error.message}`);
      throw new BadRequestException(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<IInvoice> {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return this.mapStripeInvoice(invoice);
    } catch (error) {
      this.logger.error(`❌ Failed to get Stripe invoice ${invoiceId}: ${error.message}`);
      throw new BadRequestException(`Failed to get invoice: ${error.message}`);
    }
  }

  /**
   * Finalize invoice
   */
  async finalizeInvoice(invoiceId: string): Promise<IInvoice> {
    try {
      this.logger.log(`Finalizing Stripe invoice: ${invoiceId}`);
      const invoice = await this.stripe.invoices.finalizeInvoice(invoiceId);
      this.logger.log(`✅ Stripe invoice finalized: ${invoiceId}`);
      return this.mapStripeInvoice(invoice);
    } catch (error) {
      this.logger.error(`❌ Failed to finalize Stripe invoice ${invoiceId}: ${error.message}`);
      throw new BadRequestException(`Failed to finalize invoice: ${error.message}`);
    }
  }

  /**
   * Pay invoice
   */
  async payInvoice(invoiceId: string): Promise<IInvoice> {
    try {
      this.logger.log(`Paying Stripe invoice: ${invoiceId}`);
      const invoice = await this.stripe.invoices.pay(invoiceId);
      this.logger.log(`✅ Stripe invoice paid: ${invoiceId}`);
      return this.mapStripeInvoice(invoice);
    } catch (error) {
      this.logger.error(`❌ Failed to pay Stripe invoice ${invoiceId}: ${error.message}`);
      throw new BadRequestException(`Failed to pay invoice: ${error.message}`);
    }
  }

  /**
   * List invoices
   */
  async listInvoices(customerId?: string, limit: number = 20): Promise<IInvoice[]> {
    try {
      const params: Stripe.InvoiceListParams = { limit };
      if (customerId) params.customer = customerId;

      const invoices = await this.stripe.invoices.list(params);
      return invoices.data.map(invoice => this.mapStripeInvoice(invoice));
    } catch (error) {
      this.logger.error(`❌ Failed to list Stripe invoices: ${error.message}`);
      throw new BadRequestException(`Failed to list invoices: ${error.message}`);
    }
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

      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      return {
        isValid: true,
        event: {
          id: event.id,
          type: this.mapStripeEventType(event.type) as WebhookEvent,
          data: event.data,
          provider: PaymentProvider.STRIPE,
          signature,
          createdAt: new Date(event.created * 1000),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Stripe webhook validation failed: ${error.message}`);
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
      this.logger.log(`Processing Stripe webhook event: ${event.type}`);
      
      switch (event.type) {
        case WebhookEvent.PAYMENT_SUCCEEDED:
          await this.handlePaymentSucceeded(event.data);
          break;
        case WebhookEvent.PAYMENT_FAILED:
          await this.handlePaymentFailed(event.data);
          break;
        case WebhookEvent.SUBSCRIPTION_CREATED:
          await this.handleSubscriptionCreated(event.data);
          break;
        case WebhookEvent.SUBSCRIPTION_UPDATED:
          await this.handleSubscriptionUpdated(event.data);
          break;
        case WebhookEvent.SUBSCRIPTION_CANCELED:
          await this.handleSubscriptionDeleted(event.data);
          break;
        case WebhookEvent.INVOICE_PAID:
          await this.handleInvoicePaymentSucceeded(event.data);
          break;
        case WebhookEvent.INVOICE_FAILED:
          await this.handleInvoicePaymentFailed(event.data);
          break;
        default:
          this.logger.log(`Unhandled Stripe webhook event: ${event.type}`);
      }
      
      this.logger.log(`✅ Stripe webhook event processed: ${event.type}`);
    } catch (error) {
      this.logger.error(`❌ Failed to process Stripe webhook event: ${error.message}`);
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
      this.logger.log('Generating Stripe payment analytics');

      // This is a simplified implementation
      // In production, you'd want to aggregate data from your database
      // rather than making multiple API calls

      const params: any = { limit: 100 };
      
      if (filter?.startDate) {
        params.created = { gte: Math.floor(new Date(filter.startDate).getTime() / 1000) };
      }
      
      if (filter?.endDate) {
        params.created = { 
          ...params.created,
          lte: Math.floor(new Date(filter.endDate).getTime() / 1000) 
        };
      }

      const paymentIntents = await this.stripe.paymentIntents.list(params);
      
      // Calculate analytics
      const totalTransactions = paymentIntents.data.length;
      const successfulTransactions = paymentIntents.data.filter(pi => pi.status === 'succeeded');
      const totalAmount = successfulTransactions.reduce((sum, pi) => sum + pi.amount, 0);
      const successRate = totalTransactions > 0 ? (successfulTransactions.length / totalTransactions) * 100 : 0;
      const averageAmount = successfulTransactions.length > 0 ? totalAmount / successfulTransactions.length : 0;

      this.logger.log('✅ Stripe payment analytics generated');

      return {
        totalTransactions,
        totalAmount,
        successRate,
        averageAmount,
        topCurrencies: [
          { currency: Currency.USD, count: totalTransactions, amount: totalAmount },
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
      this.logger.error(`❌ Failed to generate Stripe analytics: ${error.message}`);
      throw new BadRequestException(`Failed to generate analytics: ${error.message}`);
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
      await this.stripe.balance.retrieve();
      
      const responseTime = Date.now() - startTime;

      return {
        provider: PaymentProvider.STRIPE,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0,
        apiKeyValid: true,
      };
    } catch (error) {
      this.logger.error(`Stripe health check failed: ${error.message}`);
      
      return {
        provider: PaymentProvider.STRIPE,
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

  private mapStripeCustomer(customer: Stripe.Customer): ICustomer {
    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      address: customer.address ? {
        line1: customer.address.line1 || '',
        line2: customer.address.line2 || undefined,
        city: customer.address.city || '',
        state: customer.address.state || '',
        postalCode: customer.address.postal_code || '',
        country: customer.address.country || '',
      } : undefined,
      defaultPaymentMethod: customer.invoice_settings?.default_payment_method as string || undefined,
      metadata: customer.metadata,
      createdAt: new Date(customer.created * 1000),
      updatedAt: new Date(), // Stripe doesn't provide updated timestamp
    };
  }

  private mapStripePaymentIntent(paymentIntent: Stripe.PaymentIntent): IPaymentIntent {
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase() as Currency,
      status: this.mapStripePaymentStatus(paymentIntent.status),
      customerId: paymentIntent.customer as string || undefined,
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata,
      clientSecret: paymentIntent.client_secret || undefined,
      receiptEmail: paymentIntent.receipt_email || undefined,
      createdAt: new Date(paymentIntent.created * 1000),
      updatedAt: new Date(), // Stripe doesn't provide updated timestamp
    };
  }

  private mapStripeRefund(refund: Stripe.Refund): IRefund {
    return {
      id: refund.id,
      paymentIntentId: refund.payment_intent as string,
      amount: refund.amount,
      currency: refund.currency.toUpperCase() as Currency,
      reason: this.mapStripeRefundReason(refund.reason),
      status: this.mapStripeRefundStatus(refund.status),
      metadata: refund.metadata,
      createdAt: new Date(refund.created * 1000),
    };
  }

  private mapStripePrice(price: Stripe.Price): ISubscriptionPlan {
    const product = price.product as Stripe.Product;
    
    return {
      id: price.id,
      name: product.name,
      description: product.description || undefined,
      amount: price.unit_amount || 0,
      currency: price.currency.toUpperCase() as Currency,
      interval: price.recurring?.interval as any || 'month',
      intervalCount: price.recurring?.interval_count || 1,
      trialPeriodDays: undefined, // Not available in price object
      metadata: price.metadata,
      createdAt: new Date(price.created * 1000),
      updatedAt: new Date(), // Stripe doesn't provide updated timestamp
    };
  }

  private mapStripeSubscription(subscription: Stripe.Subscription): ISubscription {
    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      planId: subscription.items.data[0]?.price.id || '',
      status: this.mapStripeSubscriptionStatus(subscription.status),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      defaultPaymentMethod: subscription.default_payment_method as string || undefined,
      metadata: subscription.metadata,
      createdAt: new Date(subscription.created * 1000),
      updatedAt: new Date(), // Stripe doesn't provide updated timestamp
    };
  }

  private mapStripeInvoice(invoice: Stripe.Invoice): IInvoice {
    return {
      id: invoice.id,
      customerId: invoice.customer as string,
      subscriptionId: invoice.subscription as string || undefined,
      status: invoice.status as any,
      amount: invoice.amount_due,
      currency: invoice.currency.toUpperCase() as Currency,
      lineItems: [], // Would need to fetch line items separately
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : undefined,
      paymentMethod: invoice.default_payment_method as string || undefined,
      metadata: invoice.metadata,
      createdAt: new Date(invoice.created * 1000),
      updatedAt: new Date(), // Stripe doesn't provide updated timestamp
    };
  }

  private mapStripeEventType(eventType: string): WebhookEvent | string {
    // Map Stripe event types to our standard webhook events
    switch (eventType) {
      case 'payment_intent.succeeded': return WebhookEvent.PAYMENT_SUCCEEDED;
      case 'payment_intent.payment_failed': return WebhookEvent.PAYMENT_FAILED;
      case 'payment_intent.canceled': return WebhookEvent.PAYMENT_CANCELED;
      case 'customer.created': return WebhookEvent.CUSTOMER_CREATED;
      case 'customer.updated': return WebhookEvent.CUSTOMER_UPDATED;
      case 'customer.subscription.created': return WebhookEvent.SUBSCRIPTION_CREATED;
      case 'customer.subscription.updated': return WebhookEvent.SUBSCRIPTION_UPDATED;
      case 'customer.subscription.deleted': return WebhookEvent.SUBSCRIPTION_CANCELED;
      case 'invoice.created': return WebhookEvent.INVOICE_CREATED;
      case 'invoice.payment_succeeded': return WebhookEvent.INVOICE_PAID;
      case 'invoice.payment_failed': return WebhookEvent.INVOICE_FAILED;
      case 'charge.refunded': return WebhookEvent.REFUND_CREATED;
      default: return eventType;
    }
  }

  private mapStripePaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    switch (status) {
      case 'succeeded': return PaymentStatus.SUCCEEDED;
      case 'processing': return PaymentStatus.PROCESSING;
      case 'canceled': return PaymentStatus.CANCELED;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return PaymentStatus.PENDING;
      default: return PaymentStatus.FAILED;
    }
  }

  private mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active': return SubscriptionStatus.ACTIVE;
      case 'canceled': return SubscriptionStatus.CANCELED;
      case 'past_due': return SubscriptionStatus.PAST_DUE;
      case 'trialing': return SubscriptionStatus.TRIALING;
      case 'incomplete': return SubscriptionStatus.INCOMPLETE;
      default: return SubscriptionStatus.INACTIVE;
    }
  }

  private mapStripeRefundStatus(status: string): PaymentStatus {
    switch (status) {
      case 'succeeded': return PaymentStatus.REFUNDED;
      case 'pending': return PaymentStatus.PROCESSING;
      case 'failed': return PaymentStatus.FAILED;
      default: return PaymentStatus.FAILED;
    }
  }

  private mapRefundReason(reason: RefundReason): Stripe.RefundCreateParams.Reason {
    switch (reason) {
      case RefundReason.DUPLICATE: return 'duplicate';
      case RefundReason.FRAUDULENT: return 'fraudulent';
      case RefundReason.REQUESTED_BY_CUSTOMER: return 'requested_by_customer';
      default: return 'requested_by_customer';
    }
  }

  private mapStripeRefundReason(reason: Stripe.Refund.Reason | null): RefundReason | undefined {
    if (!reason) return undefined;
    
    switch (reason) {
      case 'duplicate': return RefundReason.DUPLICATE;
      case 'fraudulent': return RefundReason.FRAUDULENT;
      case 'requested_by_customer': return RefundReason.REQUESTED_BY_CUSTOMER;
      default: return RefundReason.OTHER;
    }
  }

  // Webhook event handlers
  private async handlePaymentSucceeded(data: any): Promise<void> {
    this.logger.log(`Payment succeeded: ${data.object.id}`);
    // Implement business logic for successful payment
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    this.logger.log(`Payment failed: ${data.object.id}`);
    // Implement business logic for failed payment
  }

  private async handleSubscriptionCreated(data: any): Promise<void> {
    this.logger.log(`Subscription created: ${data.object.id}`);
    // Implement business logic for new subscription
  }

  private async handleSubscriptionUpdated(data: any): Promise<void> {
    this.logger.log(`Subscription updated: ${data.object.id}`);
    // Implement business logic for subscription update
  }

  private async handleSubscriptionDeleted(data: any): Promise<void> {
    this.logger.log(`Subscription deleted: ${data.object.id}`);
    // Implement business logic for subscription cancellation
  }

  private async handleInvoicePaymentSucceeded(data: any): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${data.object.id}`);
    // Implement business logic for successful invoice payment
  }

  private async handleInvoicePaymentFailed(data: any): Promise<void> {
    this.logger.log(`Invoice payment failed: ${data.object.id}`);
    // Implement business logic for failed invoice payment
  }
}