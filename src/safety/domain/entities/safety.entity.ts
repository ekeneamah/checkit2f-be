/**
 * Safety & Emergency Domain Entities
 * 
 * Entities for SOS alerts, live location sharing, incident reporting.
 * Critical safety features for field agents.
 */

// Define types locally to avoid circular dependency
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPoint {
  coordinates: Coordinates;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export type EmergencyType = 'sos' | 'medical' | 'security' | 'accident' | 'harassment' | 'other';
export type EmergencyStatus = 'active' | 'acknowledged' | 'responding' | 'resolved' | 'false_alarm';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
  notifyOnSOS: boolean;
  createdAt: Date;
}

export interface SOSAlert {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  userName: string;
  userPhone: string;
  companyId?: string; // If rider, their parent company
  emergencyType: EmergencyType;
  status: EmergencyStatus;
  location: LocationPoint;
  address?: string;
  verificationRequestId?: string;
  message?: string;
  audioRecordingUrl?: string; // Auto-recorded audio during SOS
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  notifiedContacts: Array<{
    contactId: string;
    contactName: string;
    contactPhone: string;
    notifiedAt: Date;
    notificationMethod: 'sms' | 'call' | 'push' | 'email';
    delivered: boolean;
  }>;
  locationHistory: LocationPoint[]; // Continuous tracking during SOS
}

export interface IncidentReport {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  companyId?: string;
  verificationRequestId?: string;
  type: 'accident' | 'harassment' | 'theft' | 'assault' | 'medical_emergency' | 'property_damage' | 'traffic_violation' | 'safety_concern' | 'injury' | 'threat' | 'fraud_attempt' | 'other';
  severity: IncidentSeverity;
  title: string;
  description: string;
  location?: LocationPoint;
  address?: string;
  occurredAt: Date;
  reportedAt: Date;
  status: 'submitted' | 'under_review' | 'investigating' | 'resolved' | 'closed';
  attachments: Array<{
    type: string;
    url: string;
    description?: string;
  }>;
  witnesses?: Array<{
    name: string;
    contact?: string;
    statement?: string;
  }>;
  followUpActions?: Array<{
    action: string;
    assignedTo?: string;
    dueDate?: Date;
    completedAt?: Date;
    notes?: string;
  }>;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
}

export interface SafetyCheckIn {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  companyId?: string;
  verificationRequestId?: string;
  type: 'scheduled' | 'manual' | 'automated';
  status: 'pending' | 'checked_in' | 'missed' | 'late';
  scheduledTime: Date;
  actualTime?: Date;
  location?: LocationPoint;
  notes?: string;
  photoUrl?: string;
}

export interface SafetySettings {
  userId: string;
  sosEnabled: boolean;
  autoRecordOnSOS: boolean;
  shareLocationOnSOS: boolean;
  emergencyContacts: EmergencyContact[];
  checkInInterval?: number; // Minutes between required check-ins
  autoSOSOnInactivity: boolean;
  inactivityThresholdMinutes?: number;
  panicButtonEnabled: boolean;
  notifyCompanyOnSOS: boolean;
}

export interface LiveLocationSession {
  id: string;
  userId: string;
  userRole: 'COMPANY' | 'RIDER';
  shareToken: string; // Unique token for sharing link
  verificationRequestId?: string;
  isActive: boolean;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date;
  sharedWith: Array<{
    type: 'company' | 'customer' | 'emergency_contact' | 'admin';
    recipientId?: string;
    recipientName?: string;
    accessedAt?: Date;
  }>;
  currentLocation?: LocationPoint;
  updateFrequencySeconds: number;
}
