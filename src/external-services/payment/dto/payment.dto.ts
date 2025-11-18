import {
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
  Min,
  Max,
  Length,
  ValidateNested,
  IsPositive,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  PaymentProvider,
  PaymentStatus,
  PaymentMethod,
  Currency,
  SubscriptionStatus,
  RefundReason,
  WebhookEvent,
} from '../interfaces/payment.interface';

/**
 * Payment Service Data Transfer Objects
 * 
 * Comprehensive DTOs for payment processing with validation
 * and Swagger documentation for API endpoints.
 * 
 * Features:
 * - Input validation with class-validator
 * - Swagger API documentation
 * - Type transformation and sanitization
 * - Request/Response data structures
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

// ============================================================================
// Address and Billing DTOs
// ============================================================================

export class AddressDto {
  @ApiProperty({
    description: 'First line of address',
    example: '123 Main Street',
  })
  @IsString()
  @Length(1, 100)
  line1: string;

  @ApiPropertyOptional({
    description: 'Second line of address',
    example: 'Suite 456',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  line2?: string;

  @ApiProperty({
    description: 'City',
    example: 'Lagos',
  })
  @IsString()
  @Length(1, 50)
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Lagos State',
  })
  @IsString()
  @Length(1, 50)
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '100001',
  })
  @IsString()
  @Length(1, 20)
  postalCode: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'NG',
  })
  @IsString()
  @Length(2, 2)
  country: string;
}

export class BillingDetailsDto {
  @ApiPropertyOptional({
    description: 'Customer full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+234801234567',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer billing address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

// ============================================================================
// Customer Management DTOs
// ============================================================================

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Customer full name',
    example: 'Jane Smith',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+234801234567',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({
    description: 'Default payment method ID',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { userId: '12345', source: 'mobile_app' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'updated@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer full name',
    example: 'Jane Smith Updated',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+234801234567',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({
    description: 'Default payment method ID',
    example: 'pm_0987654321',
  })
  @IsOptional()
  @IsString()
  defaultPaymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { lastUpdated: '2024-01-15', notes: 'Premium customer' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CustomerResponseDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 'cus_1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'customer@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Customer full name',
    example: 'Jane Smith',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+234801234567',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Customer address',
    type: AddressDto,
  })
  address?: AddressDto;

  @ApiPropertyOptional({
    description: 'Default payment method ID',
    example: 'pm_1234567890',
  })
  defaultPaymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { userId: '12345', source: 'mobile_app' },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Customer creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Customer last update timestamp',
    example: '2024-01-15T14:20:00Z',
  })
  updatedAt: Date;
}

// ============================================================================
// Payment Processing DTOs
// ============================================================================

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount in the smallest currency unit (e.g., kobo for NGN)',
    example: 100000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsInt()
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    enum: Currency,
    example: Currency.NGN,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Customer ID for the payment',
    example: 'cus_1234567890',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Order #12345 - Product purchase',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { orderId: '12345', productName: 'Premium Plan' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email address for receipt',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  receiptEmail?: string;

  @ApiPropertyOptional({
    description: 'Return URL after payment completion',
    example: 'https://yourapp.com/payment/success',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Enable automatic payment methods',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  automaticPaymentMethods?: boolean;
}

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Payment intent ID to confirm',
    example: 'pi_1234567890',
  })
  @IsString()
  paymentIntentId: string;

  @ApiPropertyOptional({
    description: 'Payment method ID for confirmation',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Return URL after payment confirmation',
    example: 'https://yourapp.com/payment/complete',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Payment intent ID',
    example: 'pi_1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 100000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    enum: Currency,
    example: Currency.NGN,
  })
  currency: Currency;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Customer ID',
    example: 'cus_1234567890',
  })
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Order #12345 - Product purchase',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { orderId: '12345', productName: 'Premium Plan' },
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Client secret for frontend confirmation',
    example: 'pi_1234567890_secret_abcdef',
  })
  clientSecret?: string;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Payment last update timestamp',
    example: '2024-01-15T10:35:00Z',
  })
  updatedAt: Date;
}

// ============================================================================
// Refund Management DTOs
// ============================================================================

export class CreateRefundDto {
  @ApiProperty({
    description: 'Payment intent ID to refund',
    example: 'pi_1234567890',
  })
  @IsString()
  paymentIntentId: string;

  @ApiPropertyOptional({
    description: 'Refund amount (full refund if not specified)',
    example: 50000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @IsInt()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Reason for refund',
    enum: RefundReason,
    example: RefundReason.REQUESTED_BY_CUSTOMER,
  })
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { supportTicket: 'TK-123', agentId: 'agent_456' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RefundResponseDto {
  @ApiProperty({
    description: 'Refund ID',
    example: 're_1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Original payment intent ID',
    example: 'pi_1234567890',
  })
  paymentIntentId: string;

  @ApiProperty({
    description: 'Refund amount',
    example: 50000,
  })
  amount: number;

  @ApiProperty({
    description: 'Refund currency',
    enum: Currency,
    example: Currency.NGN,
  })
  currency: Currency;

  @ApiPropertyOptional({
    description: 'Reason for refund',
    enum: RefundReason,
    example: RefundReason.REQUESTED_BY_CUSTOMER,
  })
  reason?: RefundReason;

  @ApiProperty({
    description: 'Refund status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { supportTicket: 'TK-123', agentId: 'agent_456' },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Refund creation timestamp',
    example: '2024-01-15T11:30:00Z',
  })
  createdAt: Date;
}

// ============================================================================
// Subscription Management DTOs
// ============================================================================

export class CreateSubscriptionPlanDto {
  @ApiProperty({
    description: 'Plan name',
    example: 'Premium Monthly',
  })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Plan description',
    example: 'Full access to premium features',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiProperty({
    description: 'Plan amount in smallest currency unit',
    example: 2999,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsInt()
  amount: number;

  @ApiProperty({
    description: 'Plan currency',
    enum: Currency,
    example: Currency.NGN,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Billing interval',
    example: 'month',
  })
  @IsString()
  @IsEnum(['day', 'week', 'month', 'year'])
  interval: 'day' | 'week' | 'month' | 'year';

  @ApiProperty({
    description: 'Number of intervals between charges',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsInt()
  intervalCount: number;

  @ApiPropertyOptional({
    description: 'Trial period in days',
    example: 7,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsInt()
  trialPeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { features: ['feature1', 'feature2'], tier: 'premium' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({
    description: 'Plan name',
    example: 'Premium Monthly Updated',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Plan description',
    example: 'Enhanced premium features',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { features: ['feature1', 'feature2', 'feature3'], tier: 'premium' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Customer ID for subscription',
    example: 'cus_1234567890',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Subscription plan ID',
    example: 'plan_1234567890',
  })
  @IsString()
  planId: string;

  @ApiPropertyOptional({
    description: 'Default payment method ID',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Trial period in days (overrides plan default)',
    example: 14,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @IsInt()
  trialPeriodDays?: number;

  @ApiPropertyOptional({
    description: 'Cancel subscription at period end',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'web', campaign: 'holiday_2024' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'New subscription plan ID',
    example: 'plan_0987654321',
  })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({
    description: 'New default payment method ID',
    example: 'pm_0987654321',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Cancel subscription at period end',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { reason: 'plan_upgrade', agent: 'support_123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SubscriptionResponseDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: 'sub_1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Customer ID',
    example: 'cus_1234567890',
  })
  customerId: string;

  @ApiProperty({
    description: 'Plan ID',
    example: 'plan_1234567890',
  })
  planId: string;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Current period start',
    example: '2024-01-15T00:00:00Z',
  })
  currentPeriodStart: Date;

  @ApiProperty({
    description: 'Current period end',
    example: '2024-02-15T00:00:00Z',
  })
  currentPeriodEnd: Date;

  @ApiPropertyOptional({
    description: 'Trial start date',
    example: '2024-01-15T00:00:00Z',
  })
  trialStart?: Date;

  @ApiPropertyOptional({
    description: 'Trial end date',
    example: '2024-01-22T00:00:00Z',
  })
  trialEnd?: Date;

  @ApiPropertyOptional({
    description: 'Cancellation date',
    example: '2024-01-20T10:30:00Z',
  })
  canceledAt?: Date;

  @ApiProperty({
    description: 'Cancel at period end flag',
    example: false,
  })
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({
    description: 'Default payment method ID',
    example: 'pm_1234567890',
  })
  defaultPaymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'web', campaign: 'holiday_2024' },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Subscription creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Subscription last update timestamp',
    example: '2024-01-15T14:20:00Z',
  })
  updatedAt: Date;
}

// ============================================================================
// Invoice Management DTOs
// ============================================================================

export class InvoiceLineItemDto {
  @ApiProperty({
    description: 'Line item description',
    example: 'Premium Plan - Monthly Subscription',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Line item amount',
    example: 2500,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    enum: Currency,
    example: Currency.NGN,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Quantity',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Additional line item metadata',
    example: { service: 'verification', location: 'Lagos' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Customer ID to invoice',
    example: 'cus_1234567890',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Invoice line items',
    type: [InvoiceLineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @ApiPropertyOptional({
    description: 'Invoice due date',
    example: '2024-02-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  dueDate?: Date;

  @ApiPropertyOptional({
    description: 'Invoice description',
    example: 'January 2024 Verification Services',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional invoice metadata',
    example: { period: '2024-01', department: 'operations' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ============================================================================
// Analytics DTOs
// ============================================================================

export class AnalyticsFilterDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for analytics',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by currency',
    enum: Currency,
    example: Currency.NGN,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'cus_1234567890',
  })
  @IsOptional()
  @IsString()
  customerId?: string;
}

// ============================================================================
// Service Response DTOs
// ============================================================================

export class PaymentServiceResponseDto<T = any> {
  @ApiProperty({
    description: 'Request success status',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Response data',
  })
  data?: T;

  @ApiPropertyOptional({
    description: 'Error information',
    example: {
      code: 'PAYMENT_DECLINED',
      message: 'Your card was declined.',
    },
  })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiPropertyOptional({
    description: 'Request metadata',
    example: {
      requestId: 'req_1234567890',
      timestamp: '2024-01-15T10:30:00Z',
      provider: 'stripe',
      executionTime: 250,
    },
  })
  metadata?: {
    requestId: string;
    timestamp: Date;
    provider: PaymentProvider;
    executionTime: number;
  };
}