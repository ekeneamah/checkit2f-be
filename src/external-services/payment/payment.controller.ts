import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  BadRequestException,
  UnauthorizedException,
  Patch,
} from '@nestjs/common';
import { Request } from 'express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentGatewayService } from './payment-gateway.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreatePaymentDto,
  ConfirmPaymentDto,
  CreateRefundDto,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateInvoiceDto,
  AnalyticsFilterDto,
} from './dto/payment.dto';
import {
  ICustomer,
  IPaymentIntent,
  IPaymentResult,
  IRefund,
  IRefundResult,
  ISubscriptionPlan,
  ISubscription,
  ISubscriptionResult,
  IInvoice,
  IWebhookValidation,
  IPaymentAnalytics,
  IServiceHealth,
  PaymentProvider,
} from './interfaces/payment.interface';

/**
 * Payment Gateway Controller
 * 
 * Provides comprehensive payment processing APIs supporting multiple payment providers:
 * - Stripe (International payments, full feature set)
 * - Paystack (African markets, local payment methods)
 * 
 * Features:
 * - Customer management across providers
 * - Unified payment processing with provider selection
 * - Subscription billing and recurring payments
 * - Refund processing and management
 * - Invoice generation and management
 * - Webhook handling with signature validation
 * - Payment analytics and reporting
 * - Service health monitoring
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@ApiTags('Payment Gateway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentGatewayService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================================
  // Customer Management
  // ============================================================================

  @Post('customers')
  @ApiOperation({ 
    summary: 'Create a new customer',
    description: 'Creates a customer record across all enabled payment providers',
  })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid customer data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto): Promise<ICustomer> {
    this.logger.log(`Creating customer: ${createCustomerDto.email}`);
    return this.paymentService.createCustomer(createCustomerDto);
  }

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomer(@Param('customerId') customerId: string): Promise<ICustomer> {
    return this.paymentService.getCustomer(customerId);
  }

  @Put('customers/:customerId')
  @ApiOperation({ summary: 'Update customer information' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async updateCustomer(
    @Param('customerId') customerId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<ICustomer> {
    this.logger.log(`Updating customer: ${customerId}`);
    return this.paymentService.updateCustomer(customerId, updateCustomerDto);
  }

  @Delete('customers/:customerId')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 204, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomer(@Param('customerId') customerId: string): Promise<void> {
    this.logger.log(`Deleting customer: ${customerId}`);
    return this.paymentService.deleteCustomer(customerId);
  }

  @Get('customers')
  @ApiOperation({ summary: 'List customers with pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of customers to return', example: 20 })
  @ApiQuery({ name: 'startingAfter', required: false, description: 'Pagination cursor' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async listCustomers(
    @Query('limit') limit?: number,
    @Query('startingAfter') startingAfter?: string,
  ): Promise<ICustomer[]> {
    return this.paymentService.listCustomers(limit, startingAfter);
  }

  // ============================================================================
  // Payment Processing
  // ============================================================================

  @Post('payment-intents')
  @ApiOperation({ 
    summary: 'Create payment intent',
    description: 'Creates a payment intent with automatic provider selection based on currency and region',
  })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  async createPaymentIntent(@Body() createPaymentDto: CreatePaymentDto): Promise<IPaymentResult> {
    this.logger.log(`Creating payment intent: ${createPaymentDto.amount} ${createPaymentDto.currency}`);
    return this.paymentService.createPaymentIntent(createPaymentDto);
  }

  @Post('payment-intents/:paymentIntentId/confirm')
  @ApiOperation({ summary: 'Confirm payment intent' })
  @ApiParam({ name: 'paymentIntentId', description: 'Payment Intent ID' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Payment confirmation failed' })
  async confirmPayment(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<IPaymentResult> {
    this.logger.log(`Confirming payment: ${paymentIntentId}`);
    return this.paymentService.confirmPayment({
      paymentIntentId,
      paymentMethod: confirmPaymentDto.paymentMethod,
      returnUrl: confirmPaymentDto.returnUrl,
    });
  }

  @Get('payment-intents/:paymentIntentId')
  @ApiOperation({ summary: 'Get payment intent by ID' })
  @ApiParam({ name: 'paymentIntentId', description: 'Payment Intent ID' })
  @ApiResponse({ status: 200, description: 'Payment intent retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  async getPaymentIntent(@Param('paymentIntentId') paymentIntentId: string): Promise<IPaymentIntent> {
    return this.paymentService.getPaymentIntent(paymentIntentId);
  }

  @Post('payment-intents/:paymentIntentId/cancel')
  @ApiOperation({ summary: 'Cancel payment intent' })
  @ApiParam({ name: 'paymentIntentId', description: 'Payment Intent ID' })
  @ApiResponse({ status: 200, description: 'Payment canceled successfully' })
  @ApiResponse({ status: 400, description: 'Payment cancellation failed' })
  async cancelPayment(@Param('paymentIntentId') paymentIntentId: string): Promise<IPaymentResult> {
    this.logger.log(`Canceling payment: ${paymentIntentId}`);
    return this.paymentService.cancelPayment(paymentIntentId);
  }

  @Get('payment-intents')
  @ApiOperation({ summary: 'List payment intents' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of payment intents to return', example: 20 })
  @ApiResponse({ status: 200, description: 'Payment intents retrieved successfully' })
  async listPayments(
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ): Promise<IPaymentIntent[]> {
    return this.paymentService.listPayments(customerId, limit);
  }

  // ============================================================================
  // Refund Management
  // ============================================================================

  @Post('refunds')
  @ApiOperation({ 
    summary: 'Create refund',
    description: 'Process a refund for a successful payment',
  })
  @ApiResponse({ status: 201, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Refund processing failed' })
  async createRefund(@Body() createRefundDto: CreateRefundDto): Promise<IRefundResult> {
    this.logger.log(`Creating refund for payment: ${createRefundDto.paymentIntentId}`);
    return this.paymentService.createRefund(createRefundDto);
  }

  @Get('refunds/:refundId')
  @ApiOperation({ summary: 'Get refund by ID' })
  @ApiParam({ name: 'refundId', description: 'Refund ID' })
  @ApiResponse({ status: 200, description: 'Refund retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  async getRefund(@Param('refundId') refundId: string): Promise<IRefund> {
    return this.paymentService.getRefund(refundId);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List refunds' })
  @ApiQuery({ name: 'paymentIntentId', required: false, description: 'Filter by payment intent ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of refunds to return', example: 20 })
  @ApiResponse({ status: 200, description: 'Refunds retrieved successfully' })
  async listRefunds(
    @Query('paymentIntentId') paymentIntentId?: string,
    @Query('limit') limit?: number,
  ): Promise<IRefund[]> {
    return this.paymentService.listRefunds(paymentIntentId, limit);
  }

  // ============================================================================
  // Subscription Plans
  // ============================================================================

  @Post('subscription-plans')
  @ApiOperation({ 
    summary: 'Create subscription plan',
    description: 'Creates a recurring payment plan across all enabled providers',
  })
  @ApiResponse({ status: 201, description: 'Subscription plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid plan data' })
  async createSubscriptionPlan(@Body() createPlanDto: CreateSubscriptionPlanDto): Promise<ISubscriptionPlan> {
    this.logger.log(`Creating subscription plan: ${createPlanDto.name}`);
    return this.paymentService.createSubscriptionPlan(createPlanDto);
  }

  @Get('subscription-plans/:planId')
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getSubscriptionPlan(@Param('planId') planId: string): Promise<ISubscriptionPlan> {
    return this.paymentService.getSubscriptionPlan(planId);
  }

  @Put('subscription-plans/:planId')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updateSubscriptionPlan(
    @Param('planId') planId: string,
    @Body() updatePlanDto: UpdateSubscriptionPlanDto,
  ): Promise<ISubscriptionPlan> {
    this.logger.log(`Updating subscription plan: ${planId}`);
    return this.paymentService.updateSubscriptionPlan(planId, updatePlanDto);
  }

  @Delete('subscription-plans/:planId')
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @ApiResponse({ status: 204, description: 'Subscription plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscriptionPlan(@Param('planId') planId: string): Promise<void> {
    this.logger.log(`Deleting subscription plan: ${planId}`);
    return this.paymentService.deleteSubscriptionPlan(planId);
  }

  @Get('subscription-plans')
  @ApiOperation({ summary: 'List subscription plans' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of plans to return', example: 20 })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  async listSubscriptionPlans(@Query('limit') limit?: number): Promise<ISubscriptionPlan[]> {
    return this.paymentService.listSubscriptionPlans(limit);
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  @Post('subscriptions')
  @ApiOperation({ 
    summary: 'Create subscription',
    description: 'Subscribe a customer to a recurring payment plan',
  })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Subscription creation failed' })
  async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<ISubscriptionResult> {
    this.logger.log(`Creating subscription for customer: ${createSubscriptionDto.customerId}`);
    return this.paymentService.createSubscription(createSubscriptionDto);
  }

  @Get('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscription(@Param('subscriptionId') subscriptionId: string): Promise<ISubscription> {
    return this.paymentService.getSubscription(subscriptionId);
  }

  @Patch('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<ISubscriptionResult> {
    this.logger.log(`Updating subscription: ${subscriptionId}`);
    return this.paymentService.updateSubscription(subscriptionId, updateSubscriptionDto);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiQuery({ 
    name: 'cancelAtPeriodEnd', 
    required: false, 
    description: 'Cancel at the end of current billing period',
    example: true,
  })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Query('cancelAtPeriodEnd') cancelAtPeriodEnd?: boolean,
  ): Promise<ISubscriptionResult> {
    this.logger.log(`Canceling subscription: ${subscriptionId}`);
    return this.paymentService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of subscriptions to return', example: 20 })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async listSubscriptions(
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ): Promise<ISubscription[]> {
    return this.paymentService.listSubscriptions(customerId, limit);
  }

  // ============================================================================
  // Invoice Management
  // ============================================================================

  @Post('invoices')
  @ApiOperation({ 
    summary: 'Create invoice',
    description: 'Generate an invoice for one-time or subscription billing',
  })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invoice creation failed' })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto): Promise<IInvoice> {
    this.logger.log(`Creating invoice for customer: ${createInvoiceDto.customerId}`);
    return this.paymentService.createInvoice(createInvoiceDto);
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoice(@Param('invoiceId') invoiceId: string): Promise<IInvoice> {
    return this.paymentService.getInvoice(invoiceId);
  }

  @Post('invoices/:invoiceId/finalize')
  @ApiOperation({ 
    summary: 'Finalize invoice',
    description: 'Finalize a draft invoice to make it payable',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice finalized successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async finalizeInvoice(@Param('invoiceId') invoiceId: string): Promise<IInvoice> {
    this.logger.log(`Finalizing invoice: ${invoiceId}`);
    return this.paymentService.finalizeInvoice(invoiceId);
  }

  @Post('invoices/:invoiceId/pay')
  @ApiOperation({ 
    summary: 'Pay invoice',
    description: 'Process payment for a finalized invoice',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice paid successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async payInvoice(@Param('invoiceId') invoiceId: string): Promise<IInvoice> {
    this.logger.log(`Processing payment for invoice: ${invoiceId}`);
    return this.paymentService.payInvoice(invoiceId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of invoices to return', example: 20 })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async listInvoices(
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ): Promise<IInvoice[]> {
    return this.paymentService.listInvoices(customerId, limit);
  }

  // ============================================================================
  // Webhook Endpoints
  // ============================================================================

  @Post('webhooks/stripe')
  @ApiOperation({ 
    summary: 'Handle Stripe webhook',
    description: 'Receive and process Stripe webhook events',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(@Req() req: Request): Promise<{ received: boolean }> {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      const validation = await this.paymentService.validateWebhook(
        PaymentProvider.STRIPE,
        signature,
        JSON.stringify(payload),
      );

      if (!validation.isValid) {
        throw new UnauthorizedException(validation.error || 'Invalid webhook signature');
      }

      if (validation.event) {
        await this.paymentService.handleWebhookEvent(validation.event);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Failed to process Stripe webhook: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  @Post('webhooks/paystack')
  @ApiOperation({ 
    summary: 'Handle Paystack webhook',
    description: 'Receive and process Paystack webhook events',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  @HttpCode(HttpStatus.OK)
  async handlePaystackWebhook(@Req() req: Request): Promise<{ received: boolean }> {
    const signature = req.headers['x-paystack-signature'] as string;
    const payload = req.body;

    if (!signature) {
      throw new BadRequestException('Missing x-paystack-signature header');
    }

    try {
      const validation = await this.paymentService.validateWebhook(
        PaymentProvider.PAYSTACK,
        signature,
        JSON.stringify(payload),
      );

      if (!validation.isValid) {
        throw new UnauthorizedException(validation.error || 'Invalid webhook signature');
      }

      if (validation.event) {
        await this.paymentService.handleWebhookEvent(validation.event);
      }

      return { received: true };
    } catch (error) {
      this.logger.error(`Failed to process Paystack webhook: ${error.message}`);
      throw new BadRequestException('Webhook processing failed');
    }
  }

  // ============================================================================
  // Analytics & Reporting
  // ============================================================================

  @Post('analytics')
  @ApiOperation({ 
    summary: 'Get payment analytics',
    description: 'Generate comprehensive payment statistics and metrics',
  })
  @ApiBody({ type: AnalyticsFilterDto, required: false })
  @ApiResponse({ status: 200, description: 'Analytics generated successfully' })
  async getAnalytics(@Body() filter?: AnalyticsFilterDto): Promise<IPaymentAnalytics> {
    this.logger.log('Generating payment analytics');
    return this.paymentService.getAnalytics(filter);
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  @Get('health')
  @ApiOperation({ 
    summary: 'Payment service health check',
    description: 'Check the health and connectivity of all payment providers',
  })
  @ApiResponse({ status: 200, description: 'Health check completed successfully' })
  async healthCheck(): Promise<IServiceHealth[]> {
    this.logger.log('Running payment service health check');
    return this.paymentService.healthCheck();
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  @Get('providers')
  @ApiOperation({ 
    summary: 'List available payment providers',
    description: 'Get list of configured payment providers and their capabilities',
  })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProviders(): Promise<{
    providers: {
      name: PaymentProvider;
      enabled: boolean;
      supportedCurrencies: string[];
      supportedMethods: string[];
      features: string[];
    }[];
  }> {
    return {
      providers: [
        {
          name: PaymentProvider.STRIPE,
          enabled: !!this.configService.get('STRIPE_SECRET_KEY'),
          supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
          supportedMethods: ['card', 'bank_transfer', 'digital_wallets'],
          features: ['payments', 'subscriptions', 'invoices', 'refunds', 'analytics'],
        },
        {
          name: PaymentProvider.PAYSTACK,
          enabled: !!this.configService.get('PAYSTACK_SECRET_KEY'),
          supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'KES'],
          supportedMethods: ['card', 'bank', 'ussd', 'mobile_money', 'bank_transfer'],
          features: ['payments', 'subscriptions', 'refunds', 'analytics'],
        },
      ],
    };
  }
}