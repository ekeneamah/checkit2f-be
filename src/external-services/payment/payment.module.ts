import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { StripeService } from './stripe/stripe.service';
import { PaystackService } from './paystack/paystack.service';
import { VerificationRequestModule } from '../../verification-request/verification-request.module';

/**
 * Payment Module
 * 
 * Comprehensive payment processing module supporting multiple payment providers
 * with intelligent routing, unified APIs, and production-ready error handling.
 * 
 * Features:
 * - Multi-provider payment processing (Stripe, Paystack)
 * - Automatic provider selection based on currency/region
 * - Unified customer and subscription management
 * - Webhook handling with signature validation
 * - Comprehensive analytics and reporting
 * - Health monitoring and service status
 * 
 * Configuration Required:
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook endpoint secret
 * - PAYSTACK_SECRET_KEY: Paystack API secret key
 * - PAYSTACK_WEBHOOK_SECRET: Paystack webhook secret
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Module({
  imports: [
    ConfigModule, // For accessing environment variables
    VerificationRequestModule, // For accessing verification request repository
  ],
  controllers: [
    PaymentController,
  ],
  providers: [
    PaymentGatewayService,
    StripeService,
    PaystackService,
  ],
  exports: [
    PaymentGatewayService, // Export for use in other modules
    StripeService,        // Export for direct access if needed
    PaystackService,      // Export for direct access if needed
  ],
})
export class PaymentModule {}