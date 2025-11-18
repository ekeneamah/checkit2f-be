import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiAIService } from './gemini-ai.service';
import { GeminiAIController } from './gemini-ai.controller';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { GoogleMapsModule } from '../google-maps/google-maps.module';

/**
 * Gemini AI Module
 * 
 * Provides Google Gemini AI integration for:
 * - Conversational AI capabilities
 * - Content generation services
 * - Text analysis and insights
 * - Content moderation
 * - AI-powered assistance
 * - Map-based chat with Google Places integration
 * 
 * Dependencies:
 * - ConfigModule: Environment configuration
 * - InfrastructureModule: Firebase service for data persistence
 * - GoogleMapsModule: Google Places API for location queries
 * 
 * Exports:
 * - GeminiAIService: For use in other modules
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Module({
  imports: [
    ConfigModule,
    InfrastructureModule,
    GoogleMapsModule,
  ],
  controllers: [GeminiAIController],
  providers: [GeminiAIService],
  exports: [GeminiAIService],
})
export class GeminiAIModule {}