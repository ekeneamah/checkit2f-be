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

// Repositories
import { RequestTypeConfigRepository } from './infrastructure/repositories/request-type-config.repository';

// Services
import { RequestTypePricingService } from './application/services/request-type-pricing.service';
import { AdminRequestTypeManagementService } from './application/services/admin-request-type-management.service';
import { RequestTypeSeederService } from './application/services/seeders/request-type.seeder';
import { GptRouterService } from './application/services/gpt-router.service';
import { GoogleMapsService } from './application/services/google-maps.service';
import { MapRouterService } from './application/services/map-router.service';
import { 
  FixedPriceCalculator,
  RadiusBasedCalculator,
  PerLocationCalculator,
  TieredCalculator,
  PremiumMultiplierCalculator,
  RecurringDiscountCalculator,
} from './application/services/pricing-calculators';

/**
 * Verification Request module
 * Handles all verification request related functionality
 */
@Module({
  imports: [
    // Firebase module is already global, so no need to import here
  ],
  providers: [
    // Repository providers
    {
      provide: 'IVerificationRequestRepository',
      useClass: FirestoreVerificationRequestRepository,
    },
    RequestTypeConfigRepository,
    
    // Use case providers
    CreateVerificationRequestUseCase,
    GetVerificationRequestsUseCase,
    UpdateVerificationRequestUseCase,
    
    // Pricing services
    RequestTypePricingService,
    AdminRequestTypeManagementService,
    RequestTypeSeederService,
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