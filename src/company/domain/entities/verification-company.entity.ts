import { ServiceAreaPricing } from './service-area-pricing.entity';

/**
 * Verification Company Entity
 * Represents a company that employs riders to perform verifications
 */

export interface ServiceArea {
  lga: string; // Local Government Area (Required)
  localities?: string[]; // Specific areas/neighborhoods within LGA (optional, empty = serve entire LGA)
  state: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  radiusKm?: number;
}

export interface CompanySettings {
  autoAssignEnabled: boolean;
  assignmentMethod: 'proximity' | 'round_robin' | 'least_busy' | 'manual';
  maxDistanceKm: number;
  maxActiveAssignments: number;
  requireBikeAssignment: boolean;
  allowSelfAssign: boolean;
  notifyOnNewRequest: boolean;
  workingHours?: {
    start: string; // HH:mm format
    end: string;
    timezone: string;
    workDays: number[]; // 0-6, Sunday = 0
  };
}

export interface CompanyStats {
  totalRiders: number;
  activeRiders: number;
  totalBikes: number;
  activeBikes: number;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  averageRating: number;
  totalEarnings: number;
}

export type CompanyStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export interface VerificationCompany {
  id: string;
  
  // Basic Info
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  
  // Owner/Manager Info
  ownerId: string; // Firebase UID of owner
  ownerName: string;
  ownerEmail: string;
  
  // Business Details
  registrationNumber?: string;
  taxId?: string;
  businessType: 'sole_proprietorship' | 'partnership' | 'limited_company';
  
  // Location
  address: string;
  city: string;
  state: string;
  country: string;
  
  // Service Areas
  serviceAreas: ServiceArea[];
  
  // Pricing (location-based)
  pricing?: ServiceAreaPricing[];
  
  // Settings
  settings: CompanySettings;
  
  // Status
  status: CompanyStatus;
  isVerified: boolean;
  verifiedAt?: Date;
  
  // Auth & Onboarding
  isFirstLogin: boolean;
  passwordChangedAt?: Date;
  inviteSentAt?: Date;
  lastLoginAt?: Date;
  
  // Stats (computed/cached)
  stats?: CompanyStats;
  
  // Specializations
  specializations?: string[];
  
  // Documents
  documents?: {
    type: string;
    fileUrl: string;
    uploadedAt: Date;
    status: 'pending' | 'verified' | 'rejected';
  }[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export class VerificationCompanyEntity implements VerificationCompany {
  id: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  registrationNumber?: string;
  taxId?: string;
  businessType: 'sole_proprietorship' | 'partnership' | 'limited_company';
  address: string;
  city: string;
  state: string;
  country: string;
  serviceAreas: ServiceArea[];
  pricing?: ServiceAreaPricing[];
  settings: CompanySettings;
  status: CompanyStatus;
  isVerified: boolean;
  verifiedAt?: Date;
  isFirstLogin: boolean;
  passwordChangedAt?: Date;
  inviteSentAt?: Date;
  lastLoginAt?: Date;
  stats?: CompanyStats;
  specializations?: string[];
  documents?: {
    type: string;
    fileUrl: string;
    uploadedAt: Date;
    status: 'pending' | 'verified' | 'rejected';
  }[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<VerificationCompany>) {
    Object.assign(this, partial);
    
    // Set defaults
    this.status = partial.status || 'pending';
    this.isVerified = partial.isVerified || false;
    this.isFirstLogin = partial.isFirstLogin !== false; // Default to true for new companies
    this.serviceAreas = partial.serviceAreas || [];
    this.settings = partial.settings || {
      autoAssignEnabled: false,
      assignmentMethod: 'manual',
      maxDistanceKm: 20,
      maxActiveAssignments: 5,
      requireBikeAssignment: true,
      allowSelfAssign: true,
      notifyOnNewRequest: true,
    };
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = new Date();
  }

  static create(data: Omit<VerificationCompany, 'id' | 'createdAt' | 'updatedAt'>): VerificationCompanyEntity {
    return new VerificationCompanyEntity({
      ...data,
      id: '', // Will be set by repository
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
