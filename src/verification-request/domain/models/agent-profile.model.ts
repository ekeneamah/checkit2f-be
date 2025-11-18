import { AgentLevel } from '../enums/agent-level.enum';
import { AgentSpecialization } from '../enums/agent-specialization.enum';

/**
 * Agent Profile Model (Flat Firestore Schema)
 * Represents an agent's qualifications, capabilities, and performance metrics
 * All fields at root level - no nested collections
 */
export interface IAgentProfile {
  // Identity
  id: string;
  userId: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  profilePhotoUrl?: string;

  // Qualification Level
  level: AgentLevel;
  levelAchievedAt: Date;
  previousLevel?: AgentLevel;

  // Specializations (stored as JSON string array in Firestore)
  specializations: AgentSpecialization[];
  primarySpecialization?: AgentSpecialization;

  // Certifications (stored as JSON string array)
  certifications: string[]; // ['ISO_9001', 'REAL_ESTATE_LICENSE', etc.]
  certificationDates: Record<string, string>; // { 'ISO_9001': '2024-01-15' }
  certificationExpiries: Record<string, string>; // { 'ISO_9001': '2026-01-15' }

  // Performance Metrics
  averageRating: number; // 0-5
  totalRatings: number;
  totalCompletedRequests: number;
  totalFailedRequests: number;
  successRate: number; // 0-100
  onTimeCompletionRate: number; // 0-100

  // Capabilities (boolean flags at root level)
  hasInternetAccess: boolean;
  hasMeasuringTools: boolean;
  hasCamera: boolean;
  hasVehicle: boolean;
  hasSmartphone: boolean;
  hasLaptop: boolean;

  // Additional Equipment (stored as JSON string array)
  additionalEquipment: string[]; // ['DRONE', 'THERMAL_CAMERA', 'GPS_DEVICE']

  // Location & Availability
  currentLatitude: number;
  currentLongitude: number;
  currentCity: string;
  currentState: string;
  currentCountry: string;
  lastLocationUpdate: Date;

  // Availability
  isAvailable: boolean;
  isOnline: boolean;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK';
  maxConcurrentRequests: number;
  currentActiveRequests: number;

  // Work Preferences (stored as JSON string)
  preferredRequestTypes: string[]; // Request type IDs
  preferredCategories: string[]; // RequestTypeCategory values
  maxTravelDistanceKm: number;
  workingHoursStart: string; // '09:00'
  workingHoursEnd: string; // '18:00'
  workingDays: string[]; // ['MONDAY', 'TUESDAY', ...]

  // Financial
  walletBalance: number; // In kobo
  totalEarnings: number; // In kobo
  pendingEarnings: number; // In kobo
  currency: string;

  // Compliance & Status
  isVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  suspendedUntil?: Date;
  suspensionReason?: string;
  kycCompleted: boolean;
  kycVerifiedAt?: Date;

  // Statistics (for level progression)
  requestsCompletedThisMonth: number;
  requestsCompletedThisYear: number;
  streakDays: number; // Consecutive days with completed requests
  lastRequestCompletedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  version: number;
}

/**
 * Agent Profile Model for Firestore (Flat Schema)
 * Helper class to convert between IAgentProfile and Firestore document
 */
export class AgentProfileModel {
  /**
   * Convert IAgentProfile to Firestore document
   */
  static toFirestore(profile: IAgentProfile): Record<string, any> {
    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      phoneNumber: profile.phoneNumber,
      profilePhotoUrl: profile.profilePhotoUrl || null,

      // Qualification
      level: profile.level,
      levelAchievedAt: profile.levelAchievedAt,
      previousLevel: profile.previousLevel || null,

      // Specializations (array of strings)
      specializations: profile.specializations,
      primarySpecialization: profile.primarySpecialization || null,

      // Certifications (arrays and objects as JSON strings)
      certifications: JSON.stringify(profile.certifications),
      certificationDates: JSON.stringify(profile.certificationDates),
      certificationExpiries: JSON.stringify(profile.certificationExpiries),

      // Performance
      averageRating: profile.averageRating,
      totalRatings: profile.totalRatings,
      totalCompletedRequests: profile.totalCompletedRequests,
      totalFailedRequests: profile.totalFailedRequests,
      successRate: profile.successRate,
      onTimeCompletionRate: profile.onTimeCompletionRate,

      // Capabilities
      hasInternetAccess: profile.hasInternetAccess,
      hasMeasuringTools: profile.hasMeasuringTools,
      hasCamera: profile.hasCamera,
      hasVehicle: profile.hasVehicle,
      hasSmartphone: profile.hasSmartphone,
      hasLaptop: profile.hasLaptop,

      // Additional equipment
      additionalEquipment: JSON.stringify(profile.additionalEquipment),

      // Location
      currentLatitude: profile.currentLatitude,
      currentLongitude: profile.currentLongitude,
      currentCity: profile.currentCity,
      currentState: profile.currentState,
      currentCountry: profile.currentCountry,
      lastLocationUpdate: profile.lastLocationUpdate,

      // Availability
      isAvailable: profile.isAvailable,
      isOnline: profile.isOnline,
      availabilityStatus: profile.availabilityStatus,
      maxConcurrentRequests: profile.maxConcurrentRequests,
      currentActiveRequests: profile.currentActiveRequests,

      // Work preferences
      preferredRequestTypes: JSON.stringify(profile.preferredRequestTypes),
      preferredCategories: JSON.stringify(profile.preferredCategories),
      maxTravelDistanceKm: profile.maxTravelDistanceKm,
      workingHoursStart: profile.workingHoursStart,
      workingHoursEnd: profile.workingHoursEnd,
      workingDays: JSON.stringify(profile.workingDays),

      // Financial
      walletBalance: profile.walletBalance,
      totalEarnings: profile.totalEarnings,
      pendingEarnings: profile.pendingEarnings,
      currency: profile.currency,

      // Compliance
      isVerified: profile.isVerified,
      isActive: profile.isActive,
      isSuspended: profile.isSuspended,
      suspendedUntil: profile.suspendedUntil || null,
      suspensionReason: profile.suspensionReason || null,
      kycCompleted: profile.kycCompleted,
      kycVerifiedAt: profile.kycVerifiedAt || null,

      // Statistics
      requestsCompletedThisMonth: profile.requestsCompletedThisMonth,
      requestsCompletedThisYear: profile.requestsCompletedThisYear,
      streakDays: profile.streakDays,
      lastRequestCompletedAt: profile.lastRequestCompletedAt || null,

      // Metadata
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      lastActiveAt: profile.lastActiveAt,
      version: profile.version,
    };
  }

  /**
   * Convert Firestore document to IAgentProfile
   */
  static fromFirestore(doc: any): IAgentProfile {
    return {
      id: doc.id,
      userId: doc.userId,
      email: doc.email,
      displayName: doc.displayName,
      phoneNumber: doc.phoneNumber,
      profilePhotoUrl: doc.profilePhotoUrl,

      // Qualification
      level: doc.level,
      levelAchievedAt: doc.levelAchievedAt?.toDate?.() || doc.levelAchievedAt,
      previousLevel: doc.previousLevel,

      // Specializations
      specializations: doc.specializations || [],
      primarySpecialization: doc.primarySpecialization,

      // Certifications
      certifications: doc.certifications
        ? JSON.parse(doc.certifications)
        : [],
      certificationDates: doc.certificationDates
        ? JSON.parse(doc.certificationDates)
        : {},
      certificationExpiries: doc.certificationExpiries
        ? JSON.parse(doc.certificationExpiries)
        : {},

      // Performance
      averageRating: doc.averageRating || 0,
      totalRatings: doc.totalRatings || 0,
      totalCompletedRequests: doc.totalCompletedRequests || 0,
      totalFailedRequests: doc.totalFailedRequests || 0,
      successRate: doc.successRate || 0,
      onTimeCompletionRate: doc.onTimeCompletionRate || 0,

      // Capabilities
      hasInternetAccess: doc.hasInternetAccess || false,
      hasMeasuringTools: doc.hasMeasuringTools || false,
      hasCamera: doc.hasCamera || false,
      hasVehicle: doc.hasVehicle || false,
      hasSmartphone: doc.hasSmartphone || false,
      hasLaptop: doc.hasLaptop || false,

      // Additional equipment
      additionalEquipment: doc.additionalEquipment
        ? JSON.parse(doc.additionalEquipment)
        : [],

      // Location
      currentLatitude: doc.currentLatitude || 0,
      currentLongitude: doc.currentLongitude || 0,
      currentCity: doc.currentCity || '',
      currentState: doc.currentState || '',
      currentCountry: doc.currentCountry || '',
      lastLocationUpdate: doc.lastLocationUpdate?.toDate?.() || doc.lastLocationUpdate,

      // Availability
      isAvailable: doc.isAvailable || false,
      isOnline: doc.isOnline || false,
      availabilityStatus: doc.availabilityStatus || 'OFFLINE',
      maxConcurrentRequests: doc.maxConcurrentRequests || 1,
      currentActiveRequests: doc.currentActiveRequests || 0,

      // Work preferences
      preferredRequestTypes: doc.preferredRequestTypes
        ? JSON.parse(doc.preferredRequestTypes)
        : [],
      preferredCategories: doc.preferredCategories
        ? JSON.parse(doc.preferredCategories)
        : [],
      maxTravelDistanceKm: doc.maxTravelDistanceKm || 10,
      workingHoursStart: doc.workingHoursStart || '09:00',
      workingHoursEnd: doc.workingHoursEnd || '18:00',
      workingDays: doc.workingDays ? JSON.parse(doc.workingDays) : [],

      // Financial
      walletBalance: doc.walletBalance || 0,
      totalEarnings: doc.totalEarnings || 0,
      pendingEarnings: doc.pendingEarnings || 0,
      currency: doc.currency || 'NGN',

      // Compliance
      isVerified: doc.isVerified || false,
      isActive: doc.isActive || false,
      isSuspended: doc.isSuspended || false,
      suspendedUntil: doc.suspendedUntil?.toDate?.() || doc.suspendedUntil,
      suspensionReason: doc.suspensionReason,
      kycCompleted: doc.kycCompleted || false,
      kycVerifiedAt: doc.kycVerifiedAt?.toDate?.() || doc.kycVerifiedAt,

      // Statistics
      requestsCompletedThisMonth: doc.requestsCompletedThisMonth || 0,
      requestsCompletedThisYear: doc.requestsCompletedThisYear || 0,
      streakDays: doc.streakDays || 0,
      lastRequestCompletedAt: doc.lastRequestCompletedAt?.toDate?.() || doc.lastRequestCompletedAt,

      // Metadata
      createdAt: doc.createdAt?.toDate?.() || doc.createdAt,
      updatedAt: doc.updatedAt?.toDate?.() || doc.updatedAt,
      lastActiveAt: doc.lastActiveAt?.toDate?.() || doc.lastActiveAt,
      version: doc.version || 1,
    };
  }
}

/**
 * Firestore collection name
 */
export const AGENT_PROFILES_COLLECTION = 'agent_profiles';
