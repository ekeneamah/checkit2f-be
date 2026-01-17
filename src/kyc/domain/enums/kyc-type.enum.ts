/**
 * KYC Verification Type Enumeration
 * Types of KYC verifications supported
 */
export enum KycVerificationType {
  CUSTOMER_KYC = 'CUSTOMER_KYC',                 // Standard customer KYC
  BUSINESS_KYC = 'BUSINESS_KYC',                 // Business KYC verification
  ADDRESS_VERIFICATION = 'ADDRESS_VERIFICATION', // Address verification only
  EMPLOYMENT_VERIFICATION = 'EMPLOYMENT_VERIFICATION', // Employment verification
  INCOME_VERIFICATION = 'INCOME_VERIFICATION',   // Income verification
  DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION', // Document authenticity check
  ENHANCED_DUE_DILIGENCE = 'ENHANCED_DUE_DILIGENCE', // EDD for high-risk customers
}

/**
 * KYC Urgency Level
 */
export enum KycUrgency {
  STANDARD = 'STANDARD',     // 3-5 business days
  EXPRESS = 'EXPRESS',       // 1-2 business days
  URGENT = 'URGENT',         // Within 24 hours
  SAME_DAY = 'SAME_DAY',     // Same day verification
}

/**
 * Contact Method for attempts
 */
export enum ContactMethod {
  PHONE = 'PHONE',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

/**
 * Contact Outcome
 */
export enum ContactOutcome {
  NO_ANSWER = 'NO_ANSWER',
  WRONG_NUMBER = 'WRONG_NUMBER',
  LINE_BUSY = 'LINE_BUSY',
  PHONE_OFF = 'PHONE_OFF',
  ANSWERED = 'ANSWERED',
  VOICEMAIL = 'VOICEMAIL',
  MESSAGE_DELIVERED = 'MESSAGE_DELIVERED',
  MESSAGE_READ = 'MESSAGE_READ',
}

/**
 * Evidence Type
 */
export enum KycEvidenceType {
  PHOTO_ID = 'PHOTO_ID',                 // Government-issued ID photo
  SELFIE = 'SELFIE',                     // Customer selfie for comparison
  ADDRESS_PROOF = 'ADDRESS_PROOF',       // Utility bill, bank statement
  LOCATION_PHOTO = 'LOCATION_PHOTO',     // Photo of the location
  SIGNATURE = 'SIGNATURE',               // Customer signature
  VIDEO = 'VIDEO',                       // Video recording
  DOCUMENT_SCAN = 'DOCUMENT_SCAN',       // Scanned documents
  GPS_CHECK = 'GPS_CHECK',               // GPS verification data
  NEIGHBOR_CONFIRMATION = 'NEIGHBOR_CONFIRMATION', // Neighbor verification
  QUESTIONNAIRE_RESPONSE = 'QUESTIONNAIRE_RESPONSE', // Filled questionnaire
}

/**
 * Rating Category
 */
export enum RatingCategory {
  PROFESSIONALISM = 'PROFESSIONALISM',
  PUNCTUALITY = 'PUNCTUALITY',
  COMMUNICATION = 'COMMUNICATION',
  OVERALL = 'OVERALL',
}

/**
 * QA Flag Reason
 */
export enum QaFlagReason {
  EVIDENCE_QUALITY = 'EVIDENCE_QUALITY',     // Poor quality evidence
  INCONSISTENT_DATA = 'INCONSISTENT_DATA',   // Data inconsistencies
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY', // Suspicious patterns
  CUSTOMER_COMPLAINT = 'CUSTOMER_COMPLAINT', // Customer complained
  RANDOM_AUDIT = 'RANDOM_AUDIT',             // Random QA audit
  TIME_ANOMALY = 'TIME_ANOMALY',             // Unusual timing patterns
  GPS_MISMATCH = 'GPS_MISMATCH',             // GPS data mismatch
}
