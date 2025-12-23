import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

// Repository
import { FirestoreAgentRepository } from './infrastructure/repositories';

// Use Cases
import {
  RegisterAgentUseCase,
  GetAgentUseCase,
  UpdateAgentUseCase,
} from './application/use-cases';

// Controllers
import { AgentController } from './presentation/controllers';
import { AgentAuthController } from './presentation/controllers/agent-auth.controller';

// Services
import { AgentSeederService } from './application/services/agent-seeder.service';

/**
 * Agent Module
 * Handles all agent-related functionality
 * 
 * Following modular architecture principles
 */
@Module({
  imports: [
    InfrastructureModule, // Provides FirebaseService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'checkit24-agent-secret',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Repository
    {
      provide: 'IAgentRepository',
      useClass: FirestoreAgentRepository,
    },

    // Use Cases
    RegisterAgentUseCase,
    GetAgentUseCase,
    UpdateAgentUseCase,

    // Services
    AgentSeederService,
  ],
  controllers: [AgentController, AgentAuthController],
  exports: [
    'IAgentRepository',
    RegisterAgentUseCase,
    GetAgentUseCase,
    UpdateAgentUseCase,
  ],
})
export class AgentModule {
  constructor() {
    console.log('👤 Agent Module initialized');
  }
}
