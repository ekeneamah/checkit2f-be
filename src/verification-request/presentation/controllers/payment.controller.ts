import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { VerificationPaymentService } from '../../application/services/verification-payment.service';
import { IPaymentResponse, IPaymentVerification } from '../../domain/interfaces/payment.interface';

/**
 * Payment Endpoints for Verification Requests
 * 
 * Handles payment initiation, verification, and webhook processing
 */
@ApiTags('Verification Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly verificationPaymentService: VerificationPaymentService,
  ) {}

  /**
   * Initiate payment for a verification request
   * 
   * POST /api/v1/payments/initiate
   * 
   * Called by frontend when user clicks "Confirm & Continue to Payment"
   * Returns Paystack authorization URL for user to complete payment
   */
  @Public()
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initiate payment for verification request',
    description:
      'Creates a payment session and returns Paystack authorization URL. ' +
      'User is redirected to Paystack to complete payment.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['requestId', 'amount', 'email'],
      properties: {
        requestId: {
          type: 'string',
          description: 'Verification request ID',
          example: 'req_1234567890abcdef',
        },
        amount: {
          type: 'number',
          description: 'Amount in Naira (NGN)',
          example: 5000,
        },
        email: {
          type: 'string',
          description: 'Customer email for payment',
          example: 'customer@example.com',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata',
          example: { requestType: 'point', urgency: 'standard' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Payment session created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        paymentReference: { type: 'string' },
        authorizationUrl: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        requestId: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment request',
  })
  async initiatePayment(
    @Body('requestId') requestId: string,
    @Body('amount') amount: number,
    @Body('email') email: string,
    @Body('metadata') metadata?: Record<string, any>,
  ): Promise<IPaymentResponse> {
    try {
      this.logger.log(`Payment initiation requested: ${requestId}, ₦${amount}`);

      if (!requestId || !amount || !email) {
        throw new BadRequestException('Missing required fields: requestId, amount, email');
      }

      if (amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      return await this.verificationPaymentService.initiatePayment(
        requestId,
        amount,
        email,
        metadata || {},
      );
    } catch (error) {
      this.logger.error(`Payment initiation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify payment status
   * 
   * GET /api/v1/payments/verify/:reference
   * 
   * Called by frontend after user returns from Paystack
   * Confirms payment and updates verification request status
   */
  @Public()
  @Get('verify/:reference')
  @ApiOperation({
    summary: 'Verify payment and update request status',
    description:
      'Confirms payment with payment provider and updates verification request status to PAID. ' +
      'Called after user completes Paystack payment flow.',
  })
  @ApiParam({
    name: 'reference',
    description: 'Paystack payment reference',
    example: 'tsy1577821384167',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verified and request status updated',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['success', 'pending', 'failed'] },
        reference: { type: 'string' },
        amount: { type: 'number' },
        requestId: { type: 'string' },
        paidAt: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async verifyPayment(
    @Param('reference') reference: string,
  ): Promise<IPaymentVerification> {
    try {
      this.logger.log(`Payment verification requested: ${reference}`);

      if (!reference) {
        throw new BadRequestException('Payment reference is required');
      }

      return await this.verificationPaymentService.verifyPayment(reference);
    } catch (error) {
      this.logger.error(`Payment verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment status
   * 
   * GET /api/v1/payments/status/:reference
   * 
   * Check current status of a payment without modifying request
   */
  @Public()
  @Get('status/:reference')
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Check the current status of a payment transaction',
  })
  @ApiParam({
    name: 'reference',
    description: 'Paystack payment reference',
    example: 'tsy1577821384167',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved',
  })
  async getPaymentStatus(
    @Param('reference') reference: string,
  ): Promise<IPaymentVerification> {
    try {
      return await this.verificationPaymentService.getPaymentStatus(reference);
    } catch (error) {
      this.logger.error(`Get payment status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Webhook endpoint for payment provider notifications
   * 
   * POST /api/v1/payments/webhook/paystack
   * 
   * Receives payment confirmation from Paystack when transaction succeeds
   * Validates webhook signature and updates request status
   */
  @Public()
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paystack webhook handler',
    description:
      'Receives payment notifications from Paystack. ' +
      'Must validate webhook signature. Updates request status on payment success.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      example: {
        event: 'charge.success',
        data: {
          reference: 'tsy1577821384167',
          amount: 500000,
          status: 'success',
          customer: { email: 'customer@example.com' },
          metadata: { requestId: 'req_1234567890abcdef' },
        },
      },
    },
  })
  async handlePaystackWebhook(@Req() req: Request): Promise<{ status: string }> {
    try {
      this.logger.log('Paystack webhook received');

      const event = req.body;

      // Verify Paystack signature
      const signature = req.headers['x-paystack-signature'] as string;
      if (!signature) {
        throw new BadRequestException('Missing webhook signature');
      }

      // Process webhook
      await this.verificationPaymentService.handlePaymentWebhook({
        ...event,
        signature,
      });

      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      // Still return 200 OK to Paystack to acknowledge receipt
      // Errors are logged and don't prevent payment confirmation
      return { status: 'ok' };
    }
  }
}
