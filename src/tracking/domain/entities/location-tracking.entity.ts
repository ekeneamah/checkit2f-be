/**
 * Location Tracking Domain Entities
 * 
 * Entities for real-time GPS tracking, geofencing, and route optimization.
 * Follows DDD principles with clear separation of concerns.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number; // degrees from north
  speed?: number; // meters per second
}

export interface LocationPoint extends Coordinates {
  timestamp: Date;
  source: 'gps' | 'network' | 'fused';
  batteryLevel?: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: Coordinates;
  radiusMeters: number;
  type: 'verification_site' | 'check_in' | 'restricted' | 'custom';
  metadata?: Record<string, any>;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  eventType: 'enter' | 'exit' | 'dwell';
  location: LocationPoint;
  timestamp: Date;
  verificationRequestId?: string;
}

export interface TrackingSession {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  verificationRequestId?: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  locationHistory: LocationPoint[];
  totalDistanceMeters?: number;
  averageSpeed?: number;
  geofenceEvents: GeofenceEvent[];
}

export interface RouteOptimizationRequest {
  origin: Coordinates;
  destinations: Array<{
    id: string;
    coordinates: Coordinates;
    priority?: number;
    timeWindow?: {
      start: Date;
      end: Date;
    };
  }>;
  optimizeFor: 'distance' | 'time' | 'balanced';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  vehicleType?: 'car' | 'motorcycle' | 'bicycle' | 'walking';
}

export interface OptimizedRoute {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  orderedDestinations: Array<{
    id: string;
    order: number;
    arrivalTime: Date;
    distanceFromPrevious: number;
    durationFromPrevious: number;
  }>;
  polyline: string; // Encoded polyline for map display
  waypoints: Coordinates[];
}

export interface NavigationStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver?: string;
  startLocation: Coordinates;
  endLocation: Coordinates;
  polyline: string;
}

export interface NavigationRoute {
  id: string;
  origin: Coordinates;
  destination: Coordinates;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  steps: NavigationStep[];
  polyline: string;
  trafficCondition?: 'light' | 'moderate' | 'heavy';
  alternativeRoutes?: NavigationRoute[];
}

export interface LiveLocationShare {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  shareToken: string;
  verificationRequestId?: string;
  isActive: boolean;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date;
  sharedWith: Array<{
    type: 'company' | 'customer' | 'emergency' | 'public';
    recipientId?: string;
    recipientName?: string;
  }>;
  updateFrequencySeconds: number;
  currentLocation?: LocationPoint;
}

export interface CheckInOut {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  verificationRequestId: string;
  type: 'check_in' | 'check_out';
  location: LocationPoint;
  timestamp: Date;
  isAutomatic: boolean; // True if triggered by geofence
  photoUrl?: string;
  notes?: string;
}
