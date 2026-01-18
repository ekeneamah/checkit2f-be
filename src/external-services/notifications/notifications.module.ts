/**
 * Notifications Module
 * Provides SMS, Email, and Push notification services
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SMSService } from './sms/sms.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [ConfigModule],
  providers: [SMSService, EmailService],
  exports: [SMSService, EmailService],
})
export class NotificationsModule {}
