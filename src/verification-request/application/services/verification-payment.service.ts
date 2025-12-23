import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGatewayService } from '../../../external-services/payment/payment-gateway.service';
import { Currency, PaymentStatus } from '../../../external-services/payment/interfaces/payment.interface';
import { IPriceCalculationResponse } from '../../domain/interfaces/price-calculation.interface';
import { IPaymentRequest, IPaymentResponse, IPaymentVerification } from '../../domain/interfaces/payment.interface';
import { UpdateVerificationRequestUseCase } from '..';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';
import { VerificationRequestStatus } from '../../domain/value-objects/verification-status.value-object';

/**
 * Payment Integration Service
 * 
 * Coordinates payment processing for verification requests.
 * Handles:
 * - Payment initiation with Paystack/Stripe
 * - Payment verification and confirmation
 * - Verification request status updates after payment
 * - Error handling and recovery
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Payment coordination only
 * - Dependency Injection: Receives PaymentGatewayService and repositories
 * - Open/Closed: Extensible for new payment providers
 */
@Injectable()
export class VerificationPaymentService {
  private readonly logger = new Logger(VerificationPaymentService.name);

  constructor(
    private readonly paymentGatewayService: PaymentGatewayService,
    @Inject('IVerificationRequestRepository')
    private readonly verificationRepository: IVerificationRequestRepository,
    private readonly updateVerificationUseCase: UpdateVerificationRequestUseCase,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate payment for a verification request
   * 
   * Creates a pending verification request and initializes payment session
   * with Paystack/Stripe
   */
  async initiatePayment(
    requestId: string,
    amount: number,
    email: string,
    metadata: Record<string, any>,
  ): Promise<IPaymentResponse> {
    try {
      this.logger.log(`Initiating payment for request ${requestId}: ₦${amount} from ${email}`);

      // Validate request exists and is in correct state
      const verificationRequest = await this.verificationRepository.findById(requestId);
      if (!verificationRequest) {
        throw new NotFoundException(`Verification request ${requestId} not found`);
      }

      if (verificationRequest.status.status !== VerificationRequestStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Cannot initiate payment for request in ${verificationRequest.status.status} state`
        );
      }

      // Determine payment provider based on currency
      const currency: Currency = Currency.NGN; // Nigeria Naira
      const provider = currency === 'NGN' ? 'PAYSTACK' : 'STRIPE';

      // Create payment intent with gateway service
      const paymentResult = await this.paymentGatewayService.createPaymentIntent({
        currency,
        amount: Math.round(amount * 100), // Convert to kobo
        receiptEmail: email,
        metadata: {
          requestId,
          type: 'verification_request',
          ...metadata,
        },
        description: `Verification Request ${requestId}`,
      });

      const paymentIntent = paymentResult.paymentIntent;
      this.logger.log(`Payment intent created: ${paymentIntent.id}`);

      return {
        success: true,
        paymentReference: paymentIntent.id,
        authorizationUrl: (paymentResult as any).authorizationUrl || paymentIntent.clientSecret || '',
        amount,
        currency,
        requestId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      };
    } catch (error) {
      this.logger.error(`Payment initiation failed for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Verify payment and update verification request status
   * 
   * Called after user completes Paystack flow
   * Confirms payment with gateway and updates request to PAID status
   */
  async verifyPayment(paymentReference: string): Promise<IPaymentVerification> {
    try {
      this.logger.log(`Verifying payment: ${paymentReference}`);

      // Confirm payment with gateway
      const paymentResult = await this.paymentGatewayService.confirmPayment({
        paymentIntentId: paymentReference,
      });

      if (!paymentResult.success) {
        return {
          status: 'failed',
          reference: paymentReference,
          amount: 0,
          requestId: '',
          message: paymentResult.error?.message || 'Payment confirmation failed',
        };
      }

      // Extract request ID from payment metadata
      const requestId = paymentResult.paymentIntent.metadata?.requestId;
      if (!requestId) {
        throw new BadRequestException('Invalid payment: request ID not found in metadata');
      }

      // Update payment info and advance status after successful payment
      await this.updateVerificationUseCase.updatePayment(requestId, paymentReference, 'paid');
      await this.updateVerificationUseCase.changeStatus(requestId, { status: 'SUBMITTED' } as any);

      this.logger.log(`Payment verified and request ${requestId} updated after payment`);

      return {
        status: 'success',
        reference: paymentReference,
        amount: paymentResult.paymentIntent.amount / 100, // Convert from kobo back to Naira
        requestId,
        paidAt: new Date().toISOString(),
        message: 'Payment confirmed successfully',
      };
    } catch (error) {
      this.logger.error(`Payment verification failed for ${paymentReference}:`, error);
      
      return {
        status: 'failed',
        reference: paymentReference,
        amount: 0,
        requestId: '',
        message: error instanceof Error ? error.message : 'Payment verification failed',
      };
    }
  }

  /**
   * Get payment status
   * 
   * Check current status of payment without modifying request
   */
  async getPaymentStatus(paymentReference: string): Promise<IPaymentVerification> {
    try {
      this.logger.log(`Getting payment status: ${paymentReference}`);

      // Query payment intent from gateway (single source of truth)
      const paymentIntent = await this.paymentGatewayService.getPaymentIntent(paymentReference);

      const requestId = paymentIntent.metadata?.requestId || '';
      const status = paymentIntent.status === PaymentStatus.SUCCEEDED
        ? 'success'
        : paymentIntent.status === PaymentStatus.PENDING || paymentIntent.status === PaymentStatus.PROCESSING
          ? 'pending'
          : 'failed';

      return {
        status,
        reference: paymentReference,
        amount: paymentIntent.amount / 100,
        requestId,
        message: `Payment status: ${status}`,
      };
    } catch (error) {
      this.logger.error(`Get payment status failed for ${paymentReference}:`, error);
      
      return {
        status: 'failed',
        reference: paymentReference,
        amount: 0,
        requestId: '',
        message: error instanceof Error ? error.message : 'Unable to get payment status',
      };
    }
  }

  /**
   * Handle payment webhook from Paystack/Stripe
   * 
   * Updates request status when payment provider confirms transaction
   * This is the authoritative source of payment confirmation
   */
  async handlePaymentWebhook(event: any): Promise<void> {
    try {
      this.logger.log(`Processing payment webhook: ${event.type}`);

      const newLocal = event?.headers?.['x-paystack-signature'] ? 'paystack' : 'stripe';
      // Verify webhook signature
      const provider = newLocal;
      const signature = event?.headers?.['x-paystack-signature'] || event?.headers?.['stripe-signature'] || '';
      const payload = JSON.stringify(event?.body || event);

      const isValid = await this.paymentGatewayService.validateWebhook(provider as any, signature, payload);
      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      // Handle specific events
      if (event.type === 'charge.success' || event.type === 'charge.completed') {
        const reference = event.data.reference;
        const requestId = event.data.metadata?.requestId;

        if (requestId && reference) {
          // Update request payment and status via webhook
          await this.updateVerificationUseCase.updatePayment(requestId, reference, 'paid');
          await this.updateVerificationUseCase.changeStatus(requestId, { status: 'SUBMITTED' } as any);

          this.logger.log(`Request ${requestId} payment recorded from webhook`);

          // TODO: Trigger agent assignment and notification
        }
      }
    } catch (error) {
      this.logger.error('Webhook processing error:', error);
      // Don't re-throw webhook errors - they should be logged but not fail the response
    }
  }
}

// Re-export payment interfaces for external consumers
export type {
  IPaymentRequest,
  IPaymentResponse,
  IPaymentVerification,
} from '../../domain/interfaces/payment.interface';
