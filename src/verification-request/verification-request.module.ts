import { Module } from '@nestjs/common';
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

// Repositories
import { RequestTypeConfigRepository } from './infrastructure/repositories/request-type-config.repository';
import { FirestoreLocationPricingRepository } from './infrastructure/repositories/firestore-location-pricing.repository';

// Services
import { RequestTypePricingService } from './application/services/request-type-pricing.service';
import { AdminRequestTypeManagementService } from './application/services/admin-request-type-management.service';
import { RequestTypeSeederService } from './application/services/seeders/request-type.seeder';
import { LocationPricingSeederService } from './application/services/seeders/location-pricing.seeder';
import { GptRouterService } from './application/services/gpt-router.service';
import { GoogleMapsService } from './application/services/google-maps.service';
import { MapRouterService } from './application/services/map-router.service';
import { LocationPricingService } from './application/services/location-pricing.service';
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

/**
 * Verification Request module
 * Handles all verification request related functionality
 */
@Module({
  imports: [
    // Firebase module is already global, so no need to import here
    GeminiAIModule, // Import GeminiAIModule to make GeminiAIService available
    InfrastructureModule, // Import InfrastructureModule to make FirebaseService available
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
    RequestTypeConfigRepository,
    
    // Use case providers
    CreateVerificationRequestUseCase,
    GetVerificationRequestsUseCase,
    UpdateVerificationRequestUseCase,
    
    // Pricing services
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
    
    // Map Router services
    GptRouterService,
    GoogleMapsService,
    MapRouterService,
  ],
  controllers: [
    VerificationRequestController,
    PricingController,
    AdminRequestTypeController,
    MapRouterController,
    LocationPricingController,
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