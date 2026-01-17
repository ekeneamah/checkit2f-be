/**
 * Rider Entity
 * Represents a rider/agent working for a verification company
 */

export type RiderStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type DocumentType = 
  | 'profile_photo'
  | 'national_id'
  | 'drivers_license'
  | 'passport'
  | 'address_proof'
  | 'guarantor_id'
  | 'guarantor_letter'
  | 'police_clearance'
  | 'medical_certificate'
  | 'other';

export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface RiderDocument {
  id: string;
  type: DocumentType;
  name: string;
  fileUrl: string;
  uploadedAt: Date;
  expiryDate?: Date;
  status: DocumentStatus;
  verifiedBy?: string;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface GuarantorInfo {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  relationship: string;
  occupation: string;
  idType: string;
  idNumber: string;
  verified: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface WorkShift {
  startTime: string; // HH:mm
  endTime: string;
  breakDuration?: number; // minutes
}

export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isAvailable: boolean;
  shifts: WorkShift[];
}

export interface RiderSchedule {
  weeklySchedule: DaySchedule[];
  timezone: string;
  isFlexible: boolean;
}

export interface TimeOffRequest {
  id: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: string;
}

export interface RiderLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: Date;
  address?: string;
}

export interface RiderStats {
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  cancelledAssignments: number;
  averageRating: number;
  totalRatings: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  totalDistanceKm: number;
  averageCompletionTimeMinutes: number;
}

export interface Rider {
  id: string;
  
  // Company Reference
  companyId: string;
  
  // Firebase Auth
  firebaseUid?: string;
  
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  
  // Identification
  idType: 'nin' | 'bvn' | 'drivers_license' | 'passport' | 'voters_card';
  idNumber: string;
  
  // Profile
  profilePhotoUrl?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  state?: string;
  
  // Status & Availability
  status: RiderStatus;
  isOnline: boolean;
  isAvailable: boolean;
  lastActiveAt?: Date;
  
  // Current Location
  currentLocation?: RiderLocation;
  
  // Assigned Bike
  assignedBikeId?: string;
  assignedBikePlate?: string;
  
  // Active Work
  activeAssignments: number;
  
  // Documents
  documents: RiderDocument[];
  onboardingComplete: boolean;
  
  // Guarantor
  guarantor?: GuarantorInfo;
  
  // Emergency Contact
  emergencyContact?: EmergencyContact;
  
  // Schedule
  schedule?: RiderSchedule;
  timeOffRequests?: TimeOffRequest[];
  
  // Performance
  rating: number;
  totalCompletedTasks: number;
  stats?: RiderStats;
  
  // Auth & Onboarding
  isFirstLogin: boolean;
  passwordChangedAt?: Date;
  inviteSentAt?: Date;
  lastLoginAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  joinedAt?: Date;
}

export class RiderEntity implements Rider {
  id: string;
  companyId: string;
  firebaseUid?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  idType: 'nin' | 'bvn' | 'drivers_license' | 'passport' | 'voters_card';
  idNumber: string;
  profilePhotoUrl?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  city?: string;
  state?: string;
  status: RiderStatus;
  isOnline: boolean;
  isAvailable: boolean;
  lastActiveAt?: Date;
  currentLocation?: RiderLocation;
  assignedBikeId?: string;
  assignedBikePlate?: string;
  activeAssignments: number;
  documents: RiderDocument[];
  onboardingComplete: boolean;
  guarantor?: GuarantorInfo;
  emergencyContact?: EmergencyContact;
  schedule?: RiderSchedule;
  timeOffRequests?: TimeOffRequest[];
  rating: number;
  totalCompletedTasks: number;
  stats?: RiderStats;
  isFirstLogin: boolean;
  passwordChangedAt?: Date;
  inviteSentAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  joinedAt?: Date;

  constructor(partial: Partial<Rider>) {
    Object.assign(this, partial);
    
    // Set defaults
    this.status = partial.status || 'pending';
    this.isOnline = partial.isOnline || false;
    this.isAvailable = partial.isAvailable || false;
    this.activeAssignments = partial.activeAssignments || 0;
    this.documents = partial.documents || [];
    this.onboardingComplete = partial.onboardingComplete || false;
    this.rating = partial.rating || 0;
    this.totalCompletedTasks = partial.totalCompletedTasks || 0;
    this.isFirstLogin = partial.isFirstLogin !== false; // Default to true for new riders
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = new Date();
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isDocumentsComplete(): boolean {
    const requiredDocs: DocumentType[] = [
      'profile_photo',
      'national_id',
      'drivers_license',
      'guarantor_id',
      'guarantor_letter',
    ];
    return requiredDocs.every(docType =>
      this.documents.some(d => d.type === docType && d.status === 'verified')
    );
  }

  static create(data: Omit<Rider, 'id' | 'createdAt' | 'updatedAt'>): RiderEntity {
    return new RiderEntity({
      ...data,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
