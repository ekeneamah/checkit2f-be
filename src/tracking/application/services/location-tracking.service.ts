import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { GoogleMapsService } from '../../../external-services/google-maps/google-maps.service';
import {
  Coordinates,
  LocationPoint,
  TrackingSession,
  GeofenceZone,
  GeofenceEvent,
  CheckInOut,
  LiveLocationShare,
  OptimizedRoute,
  NavigationRoute,
} from '../../domain/entities/location-tracking.entity';
import {
  UpdateLocationDto,
  BatchLocationUpdateDto,
  StartTrackingSessionDto,
  CreateGeofenceDto,
  CheckGeofenceDto,
  RouteOptimizationRequestDto,
  GetNavigationDto,
  CheckInOutDto,
  StartLiveShareDto,
} from '../dtos/tracking.dto';
import * as crypto from 'crypto';

/**
 * Location Tracking Service
 * 
 * Handles real-time GPS tracking, geofencing, route optimization, and navigation.
 * All map API keys are securely managed server-side.
 * 
 * @author CheckIT24 Development Team
 */
@Injectable()
export class LocationTrackingService {
  private readonly logger = new Logger(LocationTrackingService.name);
  private readonly db: admin.firestore.Firestore;
  private readonly TRACKING_COLLECTION = 'tracking_sessions';
  private readonly GEOFENCE_COLLECTION = 'geofences';
  private readonly CHECKIN_COLLECTION = 'check_ins';
  private readonly LIVE_SHARE_COLLECTION = 'live_location_shares';

  constructor(
    private readonly configService: ConfigService,
    private readonly googleMapsService: GoogleMapsService,
  ) {
    this.db = admin.firestore();
    this.logger.log('📍 Location Tracking Service initialized');
  }

  // ============================================================================
  // REAL-TIME LOCATION TRACKING
  // ============================================================================

  /**
   * Start a new tracking session
   */
  async startTrackingSession(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: StartTrackingSessionDto,
  ): Promise<TrackingSession> {
    const sessionId = this.generateId();
    const now = new Date();

    const session: TrackingSession = {
      id: sessionId,
      userId,
      userRole,
      verificationRequestId: dto.verificationRequestId,
      startTime: now,
      status: 'active',
      locationHistory: [this.mapLocationPoint(dto.startLocation)],
      geofenceEvents: [],
    };

    await this.db.collection(this.TRACKING_COLLECTION).doc(sessionId).set({
      ...session,
      startTime: admin.firestore.Timestamp.fromDate(now),
      locationHistory: session.locationHistory.map(l => ({
        ...l,
        timestamp: admin.firestore.Timestamp.fromDate(l.timestamp),
      })),
    });

    this.logger.log(`✅ Started tracking session ${sessionId} for user ${userId}`);
    return session;
  }

  /**
   * Update location in active session
   */
  async updateLocation(
    userId: string,
    dto: UpdateLocationDto,
  ): Promise<{ success: boolean; geofenceEvents?: GeofenceEvent[] }> {
    const locationPoint = this.mapLocationPoint(dto.location);

    // If session ID provided, update that session
    if (dto.sessionId) {
      const sessionRef = this.db.collection(this.TRACKING_COLLECTION).doc(dto.sessionId);
      const sessionDoc = await sessionRef.get();

      if (sessionDoc.exists && sessionDoc.data()?.status === 'active') {
        await sessionRef.update({
          locationHistory: admin.firestore.FieldValue.arrayUnion({
            ...locationPoint,
            timestamp: admin.firestore.Timestamp.fromDate(locationPoint.timestamp),
          }),
        });
      }
    }

    // Check for geofence events
    let geofenceEvents: GeofenceEvent[] = [];
    if (dto.verificationRequestId) {
      geofenceEvents = await this.checkGeofences(userId, locationPoint, dto.verificationRequestId);
    }

    // Update real-time location for live sharing
    await this.updateLiveShareLocation(userId, locationPoint);

    return { success: true, geofenceEvents };
  }

  /**
   * Batch update locations (for offline sync)
   */
  async batchUpdateLocations(
    userId: string,
    dto: BatchLocationUpdateDto,
  ): Promise<{ success: boolean; processedCount: number }> {
    const batch = this.db.batch();
    const sessionRef = this.db.collection(this.TRACKING_COLLECTION).doc(dto.sessionId || userId);

    const locationPoints = dto.locations.map(l => ({
      ...this.mapLocationPoint(l),
      timestamp: admin.firestore.Timestamp.fromDate(new Date(l.timestamp)),
    }));

    // Add all locations to the session
    locationPoints.forEach(location => {
      batch.update(sessionRef, {
        locationHistory: admin.firestore.FieldValue.arrayUnion(location),
      });
    });

    await batch.commit();

    this.logger.log(`✅ Batch updated ${locationPoints.length} locations for user ${userId}`);
    return { success: true, processedCount: locationPoints.length };
  }

  /**
   * End tracking session
   */
  async endTrackingSession(
    sessionId: string,
    userId: string,
  ): Promise<TrackingSession> {
    const sessionRef = this.db.collection(this.TRACKING_COLLECTION).doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new BadRequestException('Tracking session not found');
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.userId !== userId) {
      throw new BadRequestException('Not authorized to end this session');
    }

    const now = new Date();
    const updates = {
      endTime: admin.firestore.Timestamp.fromDate(now),
      status: 'completed',
      totalDistanceMeters: this.calculateTotalDistance(sessionData?.locationHistory || []),
    };

    await sessionRef.update(updates);

    this.logger.log(`✅ Ended tracking session ${sessionId}`);
    return { ...sessionData, ...updates, endTime: now } as unknown as TrackingSession;
  }

  // ============================================================================
  // GEOFENCING
  // ============================================================================

  /**
   * Create a geofence zone
   */
  async createGeofence(
    userId: string,
    dto: CreateGeofenceDto,
  ): Promise<GeofenceZone> {
    const geofenceId = this.generateId();

    const geofence: GeofenceZone = {
      id: geofenceId,
      name: dto.name,
      center: dto.center,
      radiusMeters: dto.radiusMeters,
      type: (dto.type as GeofenceZone['type']) || 'custom',
      metadata: {
        verificationRequestId: dto.verificationRequestId,
        createdBy: userId,
      },
    };

    await this.db.collection(this.GEOFENCE_COLLECTION).doc(geofenceId).set(geofence);

    this.logger.log(`✅ Created geofence ${geofenceId}: ${dto.name}`);
    return geofence;
  }

  /**
   * Check if location is within geofences
   */
  async checkGeofenceStatus(
    dto: CheckGeofenceDto,
  ): Promise<Array<{ geofenceId: string; isInside: boolean; distanceMeters: number }>> {
    const results = [];

    for (const geofenceId of dto.geofenceIds) {
      const geofenceDoc = await this.db.collection(this.GEOFENCE_COLLECTION).doc(geofenceId).get();
      
      if (geofenceDoc.exists) {
        const geofence = geofenceDoc.data() as GeofenceZone;
        const distance = this.calculateDistance(dto.location, geofence.center);
        
        results.push({
          geofenceId,
          isInside: distance <= geofence.radiusMeters,
          distanceMeters: Math.round(distance),
        });
      }
    }

    return results;
  }

  /**
   * Internal: Check geofences and create events
   */
  private async checkGeofences(
    userId: string,
    location: LocationPoint,
    verificationRequestId: string,
  ): Promise<GeofenceEvent[]> {
    const events: GeofenceEvent[] = [];

    // Find geofences for this verification request
    const geofencesSnapshot = await this.db
      .collection(this.GEOFENCE_COLLECTION)
      .where('metadata.verificationRequestId', '==', verificationRequestId)
      .get();

    for (const doc of geofencesSnapshot.docs) {
      const geofence = doc.data() as GeofenceZone;
      const distance = this.calculateDistance(location, geofence.center);
      const isInside = distance <= geofence.radiusMeters;

      // TODO: Compare with previous state to determine enter/exit events
      if (isInside) {
        const event: GeofenceEvent = {
          id: this.generateId(),
          geofenceId: geofence.id,
          userId,
          userRole: 'RIDER', // Will be passed from caller
          eventType: 'enter',
          location,
          timestamp: new Date(),
          verificationRequestId,
        };
        events.push(event);
      }
    }

    return events;
  }

  // ============================================================================
  // CHECK-IN/CHECK-OUT
  // ============================================================================

  /**
   * Record check-in or check-out
   */
  async recordCheckInOut(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: CheckInOutDto,
  ): Promise<CheckInOut> {
    const checkInId = this.generateId();
    const now = new Date();

    const checkIn: CheckInOut = {
      id: checkInId,
      userId,
      userRole,
      verificationRequestId: dto.verificationRequestId,
      type: dto.type as 'check_in' | 'check_out',
      location: this.mapLocationPoint(dto.location),
      timestamp: now,
      isAutomatic: dto.isAutomatic || false,
      photoUrl: dto.photoUrl,
      notes: dto.notes,
    };

    await this.db.collection(this.CHECKIN_COLLECTION).doc(checkInId).set({
      ...checkIn,
      timestamp: admin.firestore.Timestamp.fromDate(now),
      location: {
        ...checkIn.location,
        timestamp: admin.firestore.Timestamp.fromDate(checkIn.location.timestamp),
      },
    });

    // If this is a check-in, update the verification request status
    if (dto.type === 'check_in') {
      await this.updateVerificationRequestArrival(dto.verificationRequestId, userId);
    }

    this.logger.log(`✅ Recorded ${dto.type} for verification ${dto.verificationRequestId}`);
    return checkIn;
  }

  /**
   * Get check-in history for a verification
   */
  async getCheckInHistory(verificationRequestId: string): Promise<CheckInOut[]> {
    const snapshot = await this.db
      .collection(this.CHECKIN_COLLECTION)
      .where('verificationRequestId', '==', verificationRequestId)
      .orderBy('timestamp', 'asc')
      .get();

    return snapshot.docs.map(doc => doc.data() as CheckInOut);
  }

  // ============================================================================
  // ROUTE OPTIMIZATION
  // ============================================================================

  /**
   * Optimize route for multiple destinations
   */
  async optimizeRoute(dto: RouteOptimizationRequestDto): Promise<OptimizedRoute> {
    this.logger.log(`🗺️ Optimizing route for ${dto.destinations.length} destinations`);

    // Use Google Maps Directions API with waypoint optimization
    const waypoints = dto.destinations.map(d => `${d.coordinates.latitude},${d.coordinates.longitude}`);
    
    // For now, return a basic optimization based on distance
    // In production, use Google Routes API with optimizeWaypoints
    const orderedDestinations = await this.calculateOptimalOrder(
      dto.origin,
      dto.destinations,
      dto.optimizeFor || 'balanced',
    );

    const result: OptimizedRoute = {
      totalDistanceMeters: orderedDestinations.reduce((sum, d) => sum + d.distanceFromPrevious, 0),
      totalDurationSeconds: orderedDestinations.reduce((sum, d) => sum + d.durationFromPrevious, 0),
      orderedDestinations,
      polyline: '', // Would be populated by Maps API
      waypoints: orderedDestinations.map(d => ({
        latitude: d.coordinates.latitude,
        longitude: d.coordinates.longitude,
      })),
    };

    return result;
  }

  /**
   * Get turn-by-turn navigation
   */
  async getNavigation(dto: GetNavigationDto): Promise<NavigationRoute> {
    this.logger.log(`🧭 Getting navigation from (${dto.origin.latitude},${dto.origin.longitude})`);

    // Use Google Maps Distance Matrix API
    const directionsResult = await this.googleMapsService.calculateDistance({
      origin: { latitude: dto.origin.latitude, longitude: dto.origin.longitude },
      destination: { latitude: dto.destination.latitude, longitude: dto.destination.longitude },
      mode: (dto.travelMode as any) || 'driving',
    });

    // Build navigation route from directions
    const route: NavigationRoute = {
      id: this.generateId(),
      origin: dto.origin,
      destination: dto.destination,
      totalDistanceMeters: directionsResult.data?.distance?.value || 0,
      totalDurationSeconds: directionsResult.data?.duration?.value || 0,
      steps: [], // Would be populated from full Directions API response
      polyline: '',
      trafficCondition: 'moderate',
    };

    return route;
  }

  // ============================================================================
  // LIVE LOCATION SHARING
  // ============================================================================

  /**
   * Start sharing live location
   */
  async startLiveShare(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: StartLiveShareDto,
  ): Promise<LiveLocationShare> {
    const shareId = this.generateId();
    const shareToken = this.generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + dto.durationMinutes * 60 * 1000);

    const liveShare: LiveLocationShare = {
      id: shareId,
      userId,
      userRole,
      shareToken,
      verificationRequestId: dto.verificationRequestId,
      isActive: true,
      startedAt: now,
      expiresAt,
      sharedWith: (dto.shareWith || []).map(type => ({
        type: type as any,
      })),
      updateFrequencySeconds: dto.updateFrequencySeconds || 30,
    };

    await this.db.collection(this.LIVE_SHARE_COLLECTION).doc(shareId).set({
      ...liveShare,
      startedAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    this.logger.log(`✅ Started live location sharing for user ${userId}, expires in ${dto.durationMinutes} minutes`);
    return liveShare;
  }

  /**
   * Get live location by share token (for viewers)
   */
  async getLiveLocation(shareToken: string): Promise<LocationPoint | null> {
    const snapshot = await this.db
      .collection(this.LIVE_SHARE_COLLECTION)
      .where('shareToken', '==', shareToken)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const share = snapshot.docs[0].data();
    
    // Check if expired
    if (share.expiresAt.toDate() < new Date()) {
      return null;
    }

    return share.currentLocation || null;
  }

  /**
   * Stop live location sharing
   */
  async stopLiveShare(shareId: string, userId: string): Promise<void> {
    const shareRef = this.db.collection(this.LIVE_SHARE_COLLECTION).doc(shareId);
    const shareDoc = await shareRef.get();

    if (shareDoc.exists && shareDoc.data()?.userId === userId) {
      await shareRef.update({
        isActive: false,
        endedAt: admin.firestore.Timestamp.now(),
      });
      this.logger.log(`✅ Stopped live location sharing ${shareId}`);
    }
  }

  /**
   * Update current location for live shares
   */
  private async updateLiveShareLocation(userId: string, location: LocationPoint): Promise<void> {
    const snapshot = await this.db
      .collection(this.LIVE_SHARE_COLLECTION)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        currentLocation: {
          ...location,
          timestamp: admin.firestore.Timestamp.fromDate(location.timestamp),
        },
      });
    });

    if (!snapshot.empty) {
      await batch.commit();
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mapLocationPoint(dto: any): LocationPoint {
    return {
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      altitude: dto.altitude,
      heading: dto.heading,
      speed: dto.speed,
      timestamp: new Date(dto.timestamp),
      source: dto.source || 'gps',
      batteryLevel: dto.batteryLevel,
    };
  }

  private calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = point1.latitude * Math.PI / 180;
    const lat2 = point2.latitude * Math.PI / 180;
    const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateTotalDistance(locationHistory: any[]): number {
    let total = 0;
    for (let i = 1; i < locationHistory.length; i++) {
      total += this.calculateDistance(locationHistory[i - 1], locationHistory[i]);
    }
    return Math.round(total);
  }

  private async calculateOptimalOrder(
    origin: Coordinates,
    destinations: any[],
    optimizeFor: string,
  ): Promise<any[]> {
    // Simple nearest-neighbor algorithm
    const ordered = [];
    const remaining = [...destinations];
    let currentPosition = origin;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.calculateDistance(currentPosition, remaining[i].coordinates);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0];
      ordered.push({
        id: nearest.id,
        order: ordered.length + 1,
        arrivalTime: new Date(), // Would be calculated based on travel time
        distanceFromPrevious: Math.round(nearestDist),
        durationFromPrevious: Math.round(nearestDist / 10), // Rough estimate
        coordinates: nearest.coordinates,
      });
      currentPosition = nearest.coordinates;
    }

    return ordered;
  }

  private async updateVerificationRequestArrival(
    verificationRequestId: string,
    userId: string,
  ): Promise<void> {
    // Update the verification request to mark agent arrival
    const requestRef = this.db.collection('verification_requests').doc(verificationRequestId);
    await requestRef.update({
      agentArrivedAt: admin.firestore.Timestamp.now(),
      status: 'IN_PROGRESS',
    });
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
