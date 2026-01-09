import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Infrastructure module for Firebase
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

// Email Services
import { EmailService } from '../external-services/notifications/email/email.service';
import { EmailTemplateService } from '../external-services/notifications/verification/email-template.service';
import { VerificationNotificationService } from '../external-services/notifications/verification/verification-notification.service';
import { NotificationEmitterService } from '../external-services/notifications/services/notification-emitter.service';
import { NotificationHelperService } from '../external-services/notifications/services/notification-helper.service';

/**
 * Notification module
 * Handles email, SMS, and push notification functionality.
 * Uses event-driven architecture for decoupled notifications.
 * 
 * @module NotificationModule
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    InfrastructureModule, // Provides FirebaseService for NotificationHelperService
    EventEmitterModule.forRoot({
      // Use wildcards for flexible event matching
      wildcard: true,
      // Delimiter for namespaced events
      delimiter: '.',
      // Enable async handlers
      newListener: false,
      removeListener: false,
      // Maximum listeners per event
      maxListeners: 10,
      // Verbose error messages
      verboseMemoryLeak: true,
      // Ignore errors in event handlers
      ignoreErrors: false,
    }),
  ],
  providers: [
    // Core email service
    EmailService,
    // Template rendering service
    EmailTemplateService,
    // Verification notification handlers (listens to events)
    VerificationNotificationService,
    // Event emitter service (for emitting events from use-cases)
    NotificationEmitterService,
    // Helper service for fetching user details
    NotificationHelperService,
  ],
  controllers: [],
  exports: [
    // Export emitter for use in other modules
    NotificationEmitterService,
    // Export helper for building payloads
    NotificationHelperService,
    // Export email service for direct use if needed
    EmailService,
  ],
})
export class NotificationModule {
  constructor() {
    console.log('📧 Notification Module initialized');
    console.log('✅ Event-driven email notifications enabled');
    console.log('✅ Verification notification handlers registered');
  }
}

