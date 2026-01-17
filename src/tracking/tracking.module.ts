import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '@/shared/config/firebase.module';
import { GoogleMapsModule } from '@/external-services/google-maps/google-maps.module';
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
  imports: [ConfigModule, FirebaseModule, GoogleMapsModule],
  controllers: [TrackingController],
  providers: [LocationTrackingService],
  exports: [LocationTrackingService],
})
export class TrackingModule {}
