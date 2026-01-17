import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationTrackingService } from './application/services/location-tracking.service';
import { TrackingController } from './infrastructure/controllers/tracking.controller';

/**
 * Tracking Module
 * 
 * Provides real-time GPS tracking, geofencing, route optimization,
 * and check-in/out functionality for field agents.
 * 
 * @author CheckIT24 Development Team
 */
@Module({
  imports: [ConfigModule],
  controllers: [TrackingController],
  providers: [LocationTrackingService],
  exports: [LocationTrackingService],
})
export class TrackingModule {}
