/**
 * Evidence Collection Domain Entities
 * 
 * Entities for geo-tagged photos, videos, documents, signatures, and voice memos.
 * All evidence is immutable once captured for legal/audit purposes.
 */

// Define Coordinates locally to avoid circular dependency
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number;
}

export type EvidenceType = 'photo' | 'video' | 'document' | 'signature' | 'voice_memo' | 'questionnaire';
export type EvidenceStatus = 'pending_upload' | 'uploading' | 'processing' | 'validated' | 'rejected' | 'archived';

export interface GeoTag {
  coordinates: Coordinates;
  address?: string;
  capturedAt: Date;
  deviceTimestamp: Date;
  serverTimestamp: Date;
  timezone: string;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  durationSeconds?: number;
  fileSizeBytes: number;
  mimeType: string;
  originalFilename: string;
  checksum: string; // SHA-256 hash for integrity verification
  deviceInfo?: {
    model: string;
    os: string;
    osVersion: string;
  };
}

export interface QualityMetrics {
  overallScore: number; // 0-100
  blurScore?: number;
  brightnessScore?: number;
  contrastScore?: number;
  faceDetected?: boolean;
  faceCount?: number;
  documentDetected?: boolean;
  textReadable?: boolean;
  gpsAccuracyMeters?: number;
  isAcceptable: boolean;
  rejectionReasons?: string[];
}

export interface BaseEvidence {
  id: string;
  verificationRequestId: string;
  capturedBy: string; // User ID
  capturedByRole: 'COMPANY' | 'RIDER';
  type: EvidenceType;
  status: EvidenceStatus;
  geoTag: GeoTag;
  metadata: MediaMetadata;
  qualityMetrics?: QualityMetrics;
  storageUrl?: string; // Secure cloud storage URL
  thumbnailUrl?: string;
  createdAt: Date;
  processedAt?: Date;
  notes?: string;
}

export interface PhotoEvidence extends BaseEvidence {
  type: 'photo';
  category: 'location' | 'subject' | 'document' | 'id_card' | 'proof' | 'panorama' | 'other';
  ocrText?: string; // Extracted text from OCR
  labels?: string[]; // AI-detected labels
  faces?: Array<{
    boundingBox: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
}

export interface VideoEvidence extends BaseEvidence {
  type: 'video';
  maxDurationSeconds: number;
  actualDurationSeconds: number;
  frameRate?: number;
  hasAudio: boolean;
  transcription?: string;
}

export interface DocumentEvidence extends BaseEvidence {
  type: 'document';
  documentType: 'id_card' | 'passport' | 'utility_bill' | 'bank_statement' | 'certificate' | 'contract' | 'other';
  pageCount: number;
  ocrText?: string;
  extractedFields?: Record<string, string>; // Structured data from OCR
  isVerified?: boolean;
}

export interface SignatureEvidence extends BaseEvidence {
  type: 'signature';
  signedBy: {
    name: string;
    role: string;
    idVerified: boolean;
  };
  signatureData: string; // Base64 encoded signature image or vector data
  legalDisclaimer: string;
  ipAddress?: string;
}

export interface VoiceMemoEvidence extends BaseEvidence {
  type: 'voice_memo';
  durationSeconds: number;
  transcription?: string;
  language?: string;
}

export interface EvidenceCollection {
  id: string;
  verificationRequestId: string;
  collectedBy: string;
  collectedByRole: 'COMPANY' | 'RIDER';
  requiredEvidence: Array<{
    type: EvidenceType;
    category?: string;
    minCount: number;
    maxCount: number;
    isRequired: boolean;
  }>;
  collectedEvidence: BaseEvidence[];
  completionStatus: 'incomplete' | 'complete' | 'exceeded';
  completionPercentage: number;
  startedAt: Date;
  completedAt?: Date;
  lastModifiedAt: Date;
}

export interface EvidenceUploadRequest {
  verificationRequestId: string;
  type: EvidenceType;
  category?: string;
  file: Buffer;
  filename: string;
  mimeType: string;
  geoTag: GeoTag;
  deviceInfo?: MediaMetadata['deviceInfo'];
  notes?: string;
}

export interface EvidenceValidationResult {
  isValid: boolean;
  qualityMetrics: QualityMetrics;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
