/**
 * Feedback Module
 * Handles feedback and complaint management
 */
import { Module } from '@nestjs/common';

// Domain
import { FEEDBACK_REPOSITORY_TOKEN } from './domain';

// Application Services
import { FeedbackService } from './application/services';

// Infrastructure
import { FirestoreFeedbackRepository } from './infrastructure/repositories';

// Presentation
import { FeedbackController } from './presentation/controllers';

// External modules
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';

/**
 * Feedback Module
 * Implements feedback and complaint management:
 * - Create feedback/complaints
 * - Track status and responses
 * - Admin assignment and resolution
 * - Satisfaction ratings
 */
@Module({
  imports: [
    InfrastructureModule,
  ],
  providers: [
    // Repository provider
    {
      provide: FEEDBACK_REPOSITORY_TOKEN,
      useClass: FirestoreFeedbackRepository,
    },
    
    // Application services
    FeedbackService,
  ],
  controllers: [
    FeedbackController,
  ],
  exports: [
    FEEDBACK_REPOSITORY_TOKEN,
    FeedbackService,
  ],
})
export class FeedbackModule {
  constructor() {
    console.log('📝 Feedback Module initialized');
  }
}
