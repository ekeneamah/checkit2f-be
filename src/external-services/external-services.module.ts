import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleMapsModule } from './google-maps/google-maps.module';
import { GeminiAIModule } from './gemini-ai/gemini-ai.module';
import { PaymentModule } from './payment/payment.module';

/**
 * External Services Module
 * 
 * Central module for all external service integrations including:
 * - Google Maps API services
 * - Google Gemini AI integration
 * - Payment gateway services (Stripe, Paystack)
 * - Notification services
 * - Cloud storage services
 * 
 * This module provides a clean separation of external dependencies
 * and ensures proper configuration management across all services.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Module({
  imports: [
    ConfigModule,
    GoogleMapsModule,
    GeminiAIModule,
    PaymentModule,
    // Other external service modules will be added here
  ],
  exports: [
    GoogleMapsModule,
    GeminiAIModule,
    PaymentModule,
    // Export other modules as they are added
  ],
})
export class ExternalServicesModule {}