import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { JwtAuthService } from './services/jwt-auth.service';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { ApiKeyService } from './services/api-key.service';

// Controllers
import { AuthController } from './controllers/auth.controller';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';

// Infrastructure

/**
 * Authentication Module
 * Provides comprehensive authentication and authorization functionality
 * 
 * Features:
 * - JWT Authentication with access and refresh tokens
 * - Role-Based Access Control (RBAC) with fine-grained permissions
 * - Firebase Authentication integration
 * - Federated login (Google, Facebook)
 * - Phone number verification
 * - API key management for external services
 * - User management and profile operations
 * - Session management and token blacklisting
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1h'),
          issuer: configService.get<string>('JWT_ISSUER', 'checkit24'),
          audience: configService.get<string>('JWT_AUDIENCE', 'checkit24-api'),
        },
      }),
      inject: [ConfigService],
    }),
    InfrastructureModule, // For Firebase and other infrastructure services
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    // Core Authentication Services
    AuthService,
    UserService,
    JwtAuthService,
    FirebaseAuthService,
    ApiKeyService,

    // Passport Strategy
    JwtStrategy,

    // Guards
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    // Export services for use in other modules
    AuthService,
    UserService,
    JwtAuthService,
    FirebaseAuthService,
    ApiKeyService,
    
    // Export guards for use in other modules
    JwtAuthGuard,
    RolesGuard,
    
    // Export JWT module for other modules that need JWT functionality
    JwtModule,
  ],
})
export class AuthModule {
  constructor() {
    console.log('🔐 Authentication Module initialized');
    console.log('✅ JWT Authentication enabled');
    console.log('✅ Role-Based Access Control (RBAC) enabled');
    console.log('✅ Firebase Authentication integration enabled');
    console.log('✅ API Key management enabled');
    console.log('✅ User management enabled');
  }
}