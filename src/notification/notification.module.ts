import { Module } from '@nestjs/common';

/**
 * Notification module
 * Handles email and push notification functionality
 * @module NotificationModule
 * @class NotificationModule
 * @constructor
 * @description Initializes the Notification module
 * @returns {void}
 * @example
 * ```typescript
 * import { NotificationModule } from './notification/notification.module';
 * ```
 */
@Module({
  imports: [],
  providers: [],
  controllers: [],
  exports: [],
})
export class NotificationModule {
  constructor() {
    console.log('📧 Notification Module initialized');
  }
}

