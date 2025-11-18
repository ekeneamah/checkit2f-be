import { Module } from '@nestjs/common';

/**
 * Payment module
 * Handles payment processing functionality
 */
@Module({
  imports: [],
  providers: [],
  controllers: [],
  exports: [],
})
export class PaymentModule {
  constructor() {
    console.log('💳 Payment Module initialized');
  }
}