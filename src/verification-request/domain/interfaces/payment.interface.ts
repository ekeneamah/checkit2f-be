/**
 * Payment Interfaces
 * 
 * Defines contracts for payment-related operations
 */

export interface IPaymentRequest {
  requestId: string;
  amount: number;
  email: string;
  metadata: Record<string, any>;
}

export interface IPaymentResponse {
  success: boolean;
  paymentReference: string;
  authorizationUrl?: string;
  amount: number;
  currency: string;
  requestId: string;
  expiresAt?: string;
}

export interface IPaymentVerification {
  status: 'success' | 'pending' | 'failed';
  reference: string;
  amount: number;
  requestId: string;
  paidAt?: string;
  message?: string;
}
