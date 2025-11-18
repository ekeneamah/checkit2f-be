import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeService } from './stripe/stripe.service';
import { PaystackService } from './paystack/paystack.service';
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
  Currency,
} from './interfaces/payment.interface';

/**
 * Payment Gateway Service
 * 
 * Unified payment processing service that manages multiple payment providers
 * with intelligent routing, fallback mechanisms, and comprehensive error handling.
 * 
 * Features:
 * - Automatic provider selection based on currency and region
 * - Unified API across multiple payment providers
 * - Intelligent fallback and retry mechanisms
 * - Provider-specific optimizations and error handling
 * - Comprehensive analytics and monitoring
 * - Webhook management with signature validation
 * 
 * Supported Providers:
 * - Stripe: International payments, full feature set
 * - Paystack: African markets with local payment methods
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly providers = new Map<PaymentProvider, IPaymentService>();
  private readonly providerConfigs = new Map<PaymentProvider, boolean>();

  constructor(
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
    private readonly paystackService: PaystackService,
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize payment providers based on configuration
   */
  private initializeProviders(): void {
    // Initialize Stripe if configured
    if (this.configService.get('STRIPE_SECRET_KEY')) {
      this.providers.set(PaymentProvider.STRIPE, this.stripeService);
      this.providerConfigs.set(PaymentProvider.STRIPE, true);
      this.logger.log('💳 Stripe provider initialized');
    } else {
      this.logger.warn('⚠️ Stripe not configured - missing STRIPE_SECRET_KEY');
      this.providerConfigs.set(PaymentProvider.STRIPE, false);
    }

    // Initialize Paystack if configured
    if (this.configService.get('PAYSTACK_SECRET_KEY')) {
      this.providers.set(PaymentProvider.PAYSTACK, this.paystackService);
      this.providerConfigs.set(PaymentProvider.PAYSTACK, true);
      this.logger.log('💳 Paystack provider initialized');
    } else {
      this.logger.warn('⚠️ Paystack not configured - missing PAYSTACK_SECRET_KEY');
      this.providerConfigs.set(PaymentProvider.PAYSTACK, false);
    }

    const enabledProviders = Array.from(this.providers.keys());
    this.logger.log(`🚀 Payment Gateway initialized with providers: ${enabledProviders.join(', ')}`);
  }

  /**
   * Select the best payment provider for a given currency and region
   */
  private selectProvider(currency: Currency, region?: string): IPaymentService {
    // African currencies - prefer Paystack
    const africanCurrencies = [Currency.NGN, Currency.GHS, Currency.ZAR, Currency.KES];
    
    if (africanCurrencies.includes(currency)) {
      const paystack = this.providers.get(PaymentProvider.PAYSTACK);
      if (paystack) {
        this.logger.log(`Selected Paystack for currency: ${currency}`);
        return paystack;
      }
    }

    // International currencies - prefer Stripe
    const stripe = this.providers.get(PaymentProvider.STRIPE);
    if (stripe) {
      this.logger.log(`Selected Stripe for currency: ${currency}`);
      return stripe;
    }

    // Fallback to any available provider
    const fallbackProvider = Array.from(this.providers.values())[0];
    if (fallbackProvider) {
      this.logger.warn(`Using fallback provider for currency: ${currency}`);
      return fallbackProvider;
    }

    throw new BadRequestException('No payment providers available');
  }

  /**
   * Get provider by name
   */
  private getProvider(provider: PaymentProvider): IPaymentService {
    const service = this.providers.get(provider);
    if (!service) {
      throw new BadRequestException(`Payment provider ${provider} not available`);
    }
    return service;
  }

  /**
   * Execute operation with retry logic and fallback
   */
  private async executeWithFallback<T>(
    operation: (provider: IPaymentService) => Promise<T>,
    currency: Currency,
    region?: string,
  ): Promise<T> {
    const primaryProvider = this.selectProvider(currency, region);
    
    try {
      return await operation(primaryProvider);
    } catch (error) {
      this.logger.warn(`Primary provider failed: ${error.message}`);
      
      // Try fallback providers
      for (const [providerType, provider] of this.providers) {
        if (provider !== primaryProvider) {
          try {
            this.logger.log(`Trying fallback provider: ${providerType}`);
            return await operation(provider);
          } catch (fallbackError) {
            this.logger.warn(`Fallback provider ${providerType} failed: ${fallbackError.message}`);
          }
        }
      }
      
      throw error; // Re-throw original error if all providers fail
    }
  }

  // ============================================================================
  // Customer Management
  // ============================================================================

  async createCustomer(request: ICreateCustomerRequest): Promise<ICustomer> {
    // Create customer in primary provider (Stripe for international, Paystack for African)
    const currency = Currency.USD; // Default currency for provider selection
    const provider = this.selectProvider(currency);
    
    return await provider.createCustomer(request);
  }

  async getCustomer(customerId: string): Promise<ICustomer> {
    // Try to find customer in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.getCustomer(customerId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new NotFoundException(`Customer not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async updateCustomer(customerId: string, request: IUpdateCustomerRequest): Promise<ICustomer> {
    // Try to update customer in all providers where they exist
    const errors: string[] = [];
    let lastSuccessfulUpdate: ICustomer | null = null;
    
    for (const [providerType, provider] of this.providers) {
      try {
        const customer = await provider.getCustomer(customerId);
        lastSuccessfulUpdate = await provider.updateCustomer(customerId, request);
        this.logger.log(`Customer updated in ${providerType}`);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    if (lastSuccessfulUpdate) {
      return lastSuccessfulUpdate;
    }
    
    throw new NotFoundException(`Customer not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    // Delete customer from all providers where they exist
    const errors: string[] = [];
    let deleted = false;
    
    for (const [providerType, provider] of this.providers) {
      try {
        await provider.deleteCustomer(customerId);
        deleted = true;
        this.logger.log(`Customer deleted from ${providerType}`);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    if (!deleted) {
      throw new NotFoundException(`Customer not found in any provider. Errors: ${errors.join(', ')}`);
    }
  }

  async listCustomers(limit: number = 20, startingAfter?: string): Promise<ICustomer[]> {
    // Aggregate customers from all providers
    const allCustomers: ICustomer[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const customers = await provider.listCustomers(limit, startingAfter);
        allCustomers.push(...customers);
      } catch (error) {
        this.logger.warn(`Failed to list customers from ${providerType}: ${error.message}`);
      }
    }
    
    // Remove duplicates and sort by creation date
    const uniqueCustomers = allCustomers.filter((customer, index, self) => 
      index === self.findIndex(c => c.email === customer.email)
    );
    
    return uniqueCustomers
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Payment Processing
  // ============================================================================

  async createPaymentIntent(request: ICreatePaymentRequest): Promise<IPaymentResult> {
    return await this.executeWithFallback(
      (provider) => provider.createPaymentIntent(request),
      request.currency,
    );
  }

  async confirmPayment(request: IConfirmPaymentRequest): Promise<IPaymentResult> {
    // Try to confirm payment in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.confirmPayment(request);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Payment confirmation failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async getPaymentIntent(paymentIntentId: string): Promise<IPaymentIntent> {
    // Try to find payment intent in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.getPaymentIntent(paymentIntentId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new NotFoundException(`Payment intent not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async cancelPayment(paymentIntentId: string): Promise<IPaymentResult> {
    // Try to cancel payment in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.cancelPayment(paymentIntentId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Payment cancellation failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async listPayments(customerId?: string, limit: number = 20): Promise<IPaymentIntent[]> {
    // Aggregate payments from all providers
    const allPayments: IPaymentIntent[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const payments = await provider.listPayments(customerId, limit);
        allPayments.push(...payments);
      } catch (error) {
        this.logger.warn(`Failed to list payments from ${providerType}: ${error.message}`);
      }
    }
    
    return allPayments
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Refund Management
  // ============================================================================

  async createRefund(request: ICreateRefundRequest): Promise<IRefundResult> {
    // Try to create refund in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.createRefund(request);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Refund creation failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async getRefund(refundId: string): Promise<IRefund> {
    // Try to find refund in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.getRefund(refundId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new NotFoundException(`Refund not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async listRefunds(paymentIntentId?: string, limit: number = 20): Promise<IRefund[]> {
    // Aggregate refunds from all providers
    const allRefunds: IRefund[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const refunds = await provider.listRefunds(paymentIntentId, limit);
        allRefunds.push(...refunds);
      } catch (error) {
        this.logger.warn(`Failed to list refunds from ${providerType}: ${error.message}`);
      }
    }
    
    return allRefunds
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  async createSubscriptionPlan(plan: Omit<ISubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ISubscriptionPlan> {
    return await this.executeWithFallback(
      (provider) => provider.createSubscriptionPlan(plan),
      plan.currency,
    );
  }

  async getSubscriptionPlan(planId: string): Promise<ISubscriptionPlan> {
    // Try to find subscription plan in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.getSubscriptionPlan(planId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new NotFoundException(`Subscription plan not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async updateSubscriptionPlan(planId: string, plan: Partial<ISubscriptionPlan>): Promise<ISubscriptionPlan> {
    // Try to update subscription plan in all providers
    const errors: string[] = [];
    let lastSuccessfulUpdate: ISubscriptionPlan | null = null;
    
    for (const [providerType, provider] of this.providers) {
      try {
        lastSuccessfulUpdate = await provider.updateSubscriptionPlan(planId, plan);
        this.logger.log(`Subscription plan updated in ${providerType}`);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    if (lastSuccessfulUpdate) {
      return lastSuccessfulUpdate;
    }
    
    throw new NotFoundException(`Subscription plan not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async deleteSubscriptionPlan(planId: string): Promise<void> {
    // Delete subscription plan from all providers where it exists
    const errors: string[] = [];
    let deleted = false;
    
    for (const [providerType, provider] of this.providers) {
      try {
        await provider.deleteSubscriptionPlan(planId);
        deleted = true;
        this.logger.log(`Subscription plan deleted from ${providerType}`);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    if (!deleted) {
      throw new NotFoundException(`Subscription plan not found in any provider. Errors: ${errors.join(', ')}`);
    }
  }

  async listSubscriptionPlans(limit: number = 20): Promise<ISubscriptionPlan[]> {
    // Aggregate subscription plans from all providers
    const allPlans: ISubscriptionPlan[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const plans = await provider.listSubscriptionPlans(limit);
        allPlans.push(...plans);
      } catch (error) {
        this.logger.warn(`Failed to list subscription plans from ${providerType}: ${error.message}`);
      }
    }
    
    return allPlans
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createSubscription(request: ICreateSubscriptionRequest): Promise<ISubscriptionResult> {
    // Try to create subscription in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.createSubscription(request);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Subscription creation failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async getSubscription(subscriptionId: string): Promise<ISubscription> {
    // Try to find subscription in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.getSubscription(subscriptionId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new NotFoundException(`Subscription not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async updateSubscription(subscriptionId: string, request: IUpdateSubscriptionRequest): Promise<ISubscriptionResult> {
    // Try to update subscription in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.updateSubscription(subscriptionId, request);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Subscription update failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<ISubscriptionResult> {
    // Try to cancel subscription in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Subscription cancellation failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async listSubscriptions(customerId?: string, limit: number = 20): Promise<ISubscription[]> {
    // Aggregate subscriptions from all providers
    const allSubscriptions: ISubscription[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const subscriptions = await provider.listSubscriptions(customerId, limit);
        allSubscriptions.push(...subscriptions);
      } catch (error) {
        this.logger.warn(`Failed to list subscriptions from ${providerType}: ${error.message}`);
      }
    }
    
    return allSubscriptions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Invoice Management
  // ============================================================================

  async createInvoice(request: ICreateInvoiceRequest): Promise<IInvoice> {
    // Create invoice using Stripe (primary provider for invoicing)
    const stripe = this.providers.get(PaymentProvider.STRIPE);
    if (!stripe) {
      throw new BadRequestException('Invoice creation requires Stripe provider');
    }
    
    return await stripe.createInvoice(request);
  }

  async getInvoice(invoiceId: string): Promise<IInvoice> {
    // Try to find invoice in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.getInvoice(invoiceId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new NotFoundException(`Invoice not found in any provider. Errors: ${errors.join(', ')}`);
  }

  async finalizeInvoice(invoiceId: string): Promise<IInvoice> {
    // Try to finalize invoice in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.finalizeInvoice(invoiceId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Invoice finalization failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async payInvoice(invoiceId: string): Promise<IInvoice> {
    // Try to pay invoice in all providers
    const errors: string[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        return await provider.payInvoice(invoiceId);
      } catch (error) {
        errors.push(`${providerType}: ${error.message}`);
      }
    }
    
    throw new BadRequestException(`Invoice payment failed in all providers. Errors: ${errors.join(', ')}`);
  }

  async listInvoices(customerId?: string, limit: number = 20): Promise<IInvoice[]> {
    // Aggregate invoices from all providers
    const allInvoices: IInvoice[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const invoices = await provider.listInvoices(customerId, limit);
        allInvoices.push(...invoices);
      } catch (error) {
        this.logger.warn(`Failed to list invoices from ${providerType}: ${error.message}`);
      }
    }
    
    return allInvoices
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // Webhook Management
  // ============================================================================

  async validateWebhook(provider: PaymentProvider, signature: string, payload: string, secret?: string): Promise<IWebhookValidation> {
    const service = this.getProvider(provider);
    return await service.validateWebhook(signature, payload, secret);
  }

  async handleWebhookEvent(event: IWebhookEvent): Promise<void> {
    const service = this.getProvider(event.provider);
    return await service.handleWebhookEvent(event);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getAnalytics(filter?: IAnalyticsFilter): Promise<IPaymentAnalytics> {
    // Aggregate analytics from all providers
    const allAnalytics: IPaymentAnalytics[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const analytics = await provider.getAnalytics(filter);
        allAnalytics.push(analytics);
      } catch (error) {
        this.logger.warn(`Failed to get analytics from ${providerType}: ${error.message}`);
      }
    }
    
    if (allAnalytics.length === 0) {
      // Return empty analytics if no providers available
      return {
        totalTransactions: 0,
        totalAmount: 0,
        successRate: 0,
        averageAmount: 0,
        topCurrencies: [],
        paymentMethods: [],
        dailyStats: [],
      };
    }
    
    // Merge analytics from all providers
    const merged: IPaymentAnalytics = {
      totalTransactions: allAnalytics.reduce((sum, a) => sum + a.totalTransactions, 0),
      totalAmount: allAnalytics.reduce((sum, a) => sum + a.totalAmount, 0),
      successRate: allAnalytics.reduce((sum, a) => sum + a.successRate, 0) / allAnalytics.length,
      averageAmount: 0,
      topCurrencies: [],
      paymentMethods: [],
      dailyStats: [],
    };
    
    merged.averageAmount = merged.totalTransactions > 0 ? merged.totalAmount / merged.totalTransactions : 0;
    
    // Merge currency data
    const currencyMap = new Map<string, { count: number; amount: number }>();
    allAnalytics.forEach(analytics => {
      analytics.topCurrencies.forEach(currency => {
        const existing = currencyMap.get(currency.currency) || { count: 0, amount: 0 };
        currencyMap.set(currency.currency, {
          count: existing.count + currency.count,
          amount: existing.amount + currency.amount,
        });
      });
    });
    
    merged.topCurrencies = Array.from(currencyMap.entries()).map(([currency, data]) => ({
      currency: currency as Currency,
      count: data.count,
      amount: data.amount,
    }));
    
    // Merge payment methods
    const methodMap = new Map<string, { count: number; percentage: number }>();
    allAnalytics.forEach(analytics => {
      analytics.paymentMethods.forEach(method => {
        const existing = methodMap.get(method.method) || { count: 0, percentage: 0 };
        methodMap.set(method.method, {
          count: existing.count + method.count,
          percentage: existing.percentage + method.percentage,
        });
      });
    });
    
    merged.paymentMethods = Array.from(methodMap.entries()).map(([method, data]) => ({
      method: method as any,
      count: data.count,
      percentage: data.percentage / allAnalytics.length,
    }));
    
    return merged;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<IServiceHealth[]> {
    const healthChecks: IServiceHealth[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const health = await provider.healthCheck();
        healthChecks.push(health);
      } catch (error) {
        this.logger.error(`Health check failed for ${providerType}: ${error.message}`);
        healthChecks.push({
          provider: providerType,
          status: 'unhealthy',
          lastCheck: new Date(),
          responseTime: -1,
          errorRate: 100,
          apiKeyValid: false,
        });
      }
    }
    
    return healthChecks;
  }
}