/**
 * KYC Module
 * Handles all KYC verification functionality
 */
import { Module } from '@nestjs/common';

// Domain
import { KYC_REPOSITORY_TOKEN } from './domain';

// Application Services
import { KycRequestService, KycNotificationService } from './application/services';

// Infrastructure
import { FirestoreKycRequestRepository } from './infrastructure/repositories';

// Presentation
import { KycRequestController } from './presentation/controllers';

// External modules
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';
import { NotificationsModule } from '@/external-services/notifications/notifications.module';

/**
 * KYC Module
 * Implements the 5-phase KYC verification workflow:
 * 1. Request Initiation (Bank → Customer confirmation)
 * 2. Assignment & Scheduling (Admin → Company → Rider)
 * 3. Pre-Visit & Arrival (Reminders, En-route, Check-in)
 * 4. Verification (OTP, Evidence, Questionnaire)
 * 5. Post-Verification (Rating, QA, Report, Payment)
 */
@Module({
  imports: [
    InfrastructureModule,
    NotificationsModule,
  ],
  providers: [
    // Repository provider
    {
      provide: KYC_REPOSITORY_TOKEN,
      useClass: FirestoreKycRequestRepository,
    },
    
    // Application services
    KycRequestService,
    KycNotificationService,
  ],
  controllers: [
    KycRequestController,
  ],
  exports: [
    KYC_REPOSITORY_TOKEN,
    KycRequestService,
  ],
})
export class KycModule {
  constructor() {
    console.log('🔐 KYC Module initialized');
  }
}
