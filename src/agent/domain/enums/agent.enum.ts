/**
 * Agent Status enum
 * Represents the different states an agent can be in
 */
export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ON_BREAK = 'ON_BREAK',
}

/**
 * Agent Availability Status
 */
export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

/**
 * Verification Type Specialization
 */
export enum VerificationSpecialization {
  PROPERTY_INSPECTION = 'PROPERTY_INSPECTION',
  DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION',
  IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',
  VEHICLE_INSPECTION = 'VEHICLE_INSPECTION',
  BUSINESS_VERIFICATION = 'BUSINESS_VERIFICATION',
  ASSET_VERIFICATION = 'ASSET_VERIFICATION',
  ADDRESS_VERIFICATION = 'ADDRESS_VERIFICATION',
  ALL = 'ALL',
}
