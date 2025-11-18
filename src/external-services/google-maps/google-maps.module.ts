import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleMapsService } from './google-maps.service';
import { GoogleMapsController } from './google-maps.controller';

/**
 * Google Maps Module
 * 
 * Provides Google Maps API integration services including:
 * - Geocoding and reverse geocoding
 * - Distance calculations
 * - Places search and details
 * - Address validation
 * - Batch operations
 * 
 * This module encapsulates all Google Maps related functionality
 * following the Single Responsibility Principle.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Module({
  imports: [ConfigModule],
  controllers: [GoogleMapsController],
  providers: [GoogleMapsService],
  exports: [GoogleMapsService],
})
export class GoogleMapsModule {}