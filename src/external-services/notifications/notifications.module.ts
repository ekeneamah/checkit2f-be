/**
 * Notifications Module
 * Provides SMS, Email, and Push notification services
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SMSService } from './sms/sms.service';

@Module({
  imports: [ConfigModule],
  providers: [SMSService],
  exports: [SMSService],
})
export class NotificationsModule {}
