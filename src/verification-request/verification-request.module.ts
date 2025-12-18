import { Module, forwardRef } from '@nestjs/common';
import { IVerificationRequestRepository } from './application/interfaces/verification-request.repository.interface';
import { FirestoreVerificationRequestRepository } from './infrastructure/repositories/firestore-verification-request.repository';

// Use Cases
import {
  CreateVerificationRequestUseCase,
  GetVerificationRequestsUseCase,
  UpdateVerificationRequestUseCase,
} from './application';

// Controllers
import { VerificationRequestController } from './presentation/controllers/verification-request.controller';
import { PricingController } from './presentation/controllers/pricing.controller';
import { AdminRequestTypeController } from './presentation/controllers/admin-request-type.controller';
import { MapRouterController } from './presentation/controllers/map-router.controller';
import { LocationPricingController } from './presentation/controllers/location-pricing.controller';
import { PaymentController } from './presentation/controllers/payment.controller';

// Repositories
import { RequestTypeConfigRepository } from './infrastructure/repositories/request-type-config.repository';
import { FirestoreLocationPricingRepository } from './infrastructure/repositories/firestore-location-pricing.repository';

// Services
import { RequestTypePricingService } from './application/services/request-type-pricing.service';
import { AdminRequestTypeManagementService } from './application/services/admin-request-type-management.service';
import { RequestTypeSeederService } from './application/services/seeders/request-type.seeder';
import { LocationPricingSeederService } from './application/services/seeders/location-pricing.seeder';
import { FirestorePricingConfigRepository } from './infrastructure/repositories/firestore-pricing-config.repository';
import { GptRouterService } from './application/services/gpt-router.service';
import { GoogleMapsService } from './application/services/google-maps.service';
import { MapRouterService } from './application/services/map-router.service';
import { LocationPricingService } from './application/services/location-pricing.service';
import { PricingCalculationService } from './application/services/pricing-calculation.service';
import { PricingConfigService } from './application/services/pricing-config.service';
import { VerificationPaymentService } from './application/services/verification-payment.service';
import { 
  FixedPriceCalculator,
  RadiusBasedCalculator,
  PerLocationCalculator,
  TieredCalculator,
  PremiumMultiplierCalculator,
  RecurringDiscountCalculator,
} from './application/services/pricing-calculators';

// External modules
import { GeminiAIModule } from '../external-services/gemini-ai/gemini-ai.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PaymentModule } from '../external-services/payment/payment.module';
import { AdminPricingConfigController } from './presentation/controllers/admin-pricing-config.controller';

/**
 * Verification Request module
 * Handles all verification request related functionality
 */
@Module({
  imports: [
    // Firebase module is already global, so no need to import here
    GeminiAIModule, // Import GeminiAIModule to make GeminiAIService available
    InfrastructureModule, // Import InfrastructureModule to make FirebaseService available
    forwardRef(() => PaymentModule), // Circular-safe import with PaymentModule
  ],
  providers: [
    // Repository providers
    {
      provide: 'IVerificationRequestRepository',
      useClass: FirestoreVerificationRequestRepository,
    },
    {
      provide: 'ILocationPricingRepository',
      useClass: FirestoreLocationPricingRepository,
    },
    {
      provide: 'IPricingConfigRepository',
      useClass: FirestorePricingConfigRepository,
    },
    RequestTypeConfigRepository,
    
    // Use case providers
    CreateVerificationRequestUseCase,
    GetVerificationRequestsUseCase,
    UpdateVerificationRequestUseCase,
    
    // Pricing services
    PricingConfigService,
    PricingCalculationService,
    RequestTypePricingService,
    LocationPricingService,
    AdminRequestTypeManagementService,
    RequestTypeSeederService,
    LocationPricingSeederService,
    FixedPriceCalculator,
    RadiusBasedCalculator,
    PerLocationCalculator,
    TieredCalculator,
    PremiumMultiplierCalculator,
    RecurringDiscountCalculator,
    
    // Payment services
    VerificationPaymentService,
    
    // Map Router services
    GptRouterService,
    GoogleMapsService,
    MapRouterService,
  ],
  controllers: [
    VerificationRequestController,
    PricingController,
    AdminPricingConfigController,
    AdminRequestTypeController,
    MapRouterController,
    LocationPricingController,
    PaymentController,
  ],
  exports: [
    'IVerificationRequestRepository',
    CreateVerificationRequestUseCase,
    GetVerificationRequestsUseCase,
    UpdateVerificationRequestUseCase,
  ],
})
export class VerificationRequestModule {
  constructor() {
    console.log('📋 Verification Request Module initialized');
  }
}