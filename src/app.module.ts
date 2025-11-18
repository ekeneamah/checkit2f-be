import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { VerificationRequestModule } from './verification-request/verification-request.module';
import { UserModule } from './user/user.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { SharedModule } from './shared/shared.module';
import { CommonModule } from './common/common.module';
import { FirebaseModule } from './shared/config/firebase.module';
import { AuthModule } from './auth/auth.module';
import { ExternalServicesModule } from './external-services/external-services.module';
import { HealthController } from './health/health.controller';

import { validateEnvironmentConfig } from './config/env.validation';

// Import authentication guards and interceptors
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

/**
 * Root application module
 * Configures all feature modules and global settings
 */
@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironmentConfig,
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 1000, // 1000 requests per 15 minutes
      },
    ]),

    // Core modules
    CommonModule,
    SharedModule,
    FirebaseModule, // Global Firebase configuration

    // Authentication module (must be imported before feature modules)
    AuthModule,

    // External services
    ExternalServicesModule,

    // Feature modules
    VerificationRequestModule,
    UserModule,
    PaymentModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard (runs after authentication)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {
  constructor() {
    console.log('🚀 CheckIt24 Backend API Module initialized');
    console.log('🔐 Global authentication and authorization enabled');
    console.log('✅ JWT Authentication Guard active globally');
    console.log('✅ Role-Based Access Control (RBAC) active globally');
    console.log('✅ Use @Public() decorator for public endpoints');
  }
}