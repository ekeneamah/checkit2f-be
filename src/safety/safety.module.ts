import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SafetyService } from './application/services/safety.service';
import { SafetyController } from './infrastructure/controllers/safety.controller';

/**
 * Safety Module
 * 
 * Provides SOS alerts, incident reporting, safety check-ins,
 * and emergency contact management for field agent safety.
 * 
 * @author CheckIT24 Development Team
 */
@Module({
  imports: [ConfigModule],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
