import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  BaseEvidence,
  PhotoEvidence,
  VideoEvidence,
  DocumentEvidence,
  SignatureEvidence,
  VoiceMemoEvidence,
  EvidenceCollection,
  QualityMetrics,
  GeoTag,
  MediaMetadata,
} from '../../domain/entities/evidence.entity';
import {
  UploadPhotoEvidenceDto,
  UploadVideoEvidenceDto,
  UploadDocumentEvidenceDto,
  CaptureSignatureDto,
  UploadVoiceMemoDto,
} from '../dtos/evidence.dto';

/**
 * Evidence Collection Service
 * 
 * Handles capture, storage, and validation of all evidence types.
 * All evidence is geo-tagged and immutable for audit purposes.
 * 
 * Security: All cloud storage keys managed server-side.
 * 
 * @author CheckIT24 Development Team
 */
@Injectable()
export class EvidenceCollectionService {
  private readonly logger = new Logger(EvidenceCollectionService.name);
  private readonly db: admin.firestore.Firestore;
  private readonly storage: admin.storage.Storage;
  private readonly EVIDENCE_COLLECTION = 'evidence';
  private readonly EVIDENCE_BUCKET: string;

  // Quality thresholds
  private readonly MIN_GPS_ACCURACY_METERS = 100;
  private readonly MIN_PHOTO_QUALITY_SCORE = 60;
  private readonly MIN_BRIGHTNESS_SCORE = 30;
  private readonly MAX_BRIGHTNESS_SCORE = 95;

  constructor(private readonly configService: ConfigService) {
    this.db = admin.firestore();
    this.storage = admin.storage();
    this.EVIDENCE_BUCKET = this.configService.get<string>('FIREBASE_STORAGE_BUCKET', 'checkit24-evidence');
    this.logger.log('📸 Evidence Collection Service initialized');
  }

  // ============================================================================
  // PHOTO EVIDENCE
  // ============================================================================

  /**
   * Upload and process photo evidence
   */
  async uploadPhotoEvidence(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: UploadPhotoEvidenceDto,
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<PhotoEvidence> {
    this.logger.log(`📷 Processing photo evidence for verification ${dto.verificationRequestId}`);

    // Validate GPS accuracy
    if (dto.geoTag.accuracy && dto.geoTag.accuracy > this.MIN_GPS_ACCURACY_METERS) {
      throw new BadRequestException(
        `GPS accuracy (${dto.geoTag.accuracy}m) exceeds maximum allowed (${this.MIN_GPS_ACCURACY_METERS}m)`
      );
    }

    // Generate secure storage path
    const evidenceId = this.generateId();
    const storagePath = this.generateStoragePath(dto.verificationRequestId, 'photo', evidenceId, filename);

    // Upload to secure storage
    const { storageUrl, thumbnailUrl } = await this.uploadToStorage(file, storagePath, mimeType);

    // Create metadata
    const checksum = this.calculateChecksum(file);
    const metadata: MediaMetadata = {
      fileSizeBytes: file.length,
      mimeType,
      originalFilename: filename,
      checksum,
      deviceInfo: dto.deviceInfo,
    };

    // Perform quality validation (async processing)
    const qualityMetrics = await this.validatePhotoQuality(file, dto.geoTag);

    // Create evidence record
    const now = new Date();
    const evidence: PhotoEvidence = {
      id: evidenceId,
      verificationRequestId: dto.verificationRequestId,
      capturedBy: userId,
      capturedByRole: userRole,
      type: 'photo',
      category: dto.category as PhotoEvidence['category'],
      status: qualityMetrics.isAcceptable ? 'validated' : 'rejected',
      geoTag: this.createGeoTag(dto.geoTag),
      metadata,
      qualityMetrics,
      storageUrl,
      thumbnailUrl,
      createdAt: now,
      processedAt: now,
      notes: dto.notes,
    };

    // Save to database
    await this.db.collection(this.EVIDENCE_COLLECTION).doc(evidenceId).set({
      ...evidence,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      processedAt: admin.firestore.Timestamp.fromDate(now),
      geoTag: {
        ...evidence.geoTag,
        capturedAt: admin.firestore.Timestamp.fromDate(evidence.geoTag.capturedAt),
        serverTimestamp: admin.firestore.Timestamp.fromDate(evidence.geoTag.serverTimestamp),
      },
    });

    // Update collection status
    await this.updateCollectionStatus(dto.verificationRequestId);

    this.logger.log(`✅ Photo evidence ${evidenceId} saved successfully`);
    return evidence;
  }

  // ============================================================================
  // VIDEO EVIDENCE
  // ============================================================================

  /**
   * Upload and process video evidence
   */
  async uploadVideoEvidence(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: UploadVideoEvidenceDto,
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<VideoEvidence> {
    this.logger.log(`🎥 Processing video evidence for verification ${dto.verificationRequestId}`);

    // Validate duration
    if (dto.actualDurationSeconds > dto.maxDurationSeconds) {
      throw new BadRequestException(
        `Video duration (${dto.actualDurationSeconds}s) exceeds maximum allowed (${dto.maxDurationSeconds}s)`
      );
    }

    const evidenceId = this.generateId();
    const storagePath = this.generateStoragePath(dto.verificationRequestId, 'video', evidenceId, filename);

    const { storageUrl, thumbnailUrl } = await this.uploadToStorage(file, storagePath, mimeType);

    const checksum = this.calculateChecksum(file);
    const metadata: MediaMetadata = {
      fileSizeBytes: file.length,
      mimeType,
      originalFilename: filename,
      checksum,
      durationSeconds: dto.actualDurationSeconds,
      deviceInfo: dto.deviceInfo,
    };

    const now = new Date();
    const evidence: VideoEvidence = {
      id: evidenceId,
      verificationRequestId: dto.verificationRequestId,
      capturedBy: userId,
      capturedByRole: userRole,
      type: 'video',
      maxDurationSeconds: dto.maxDurationSeconds,
      actualDurationSeconds: dto.actualDurationSeconds,
      hasAudio: dto.hasAudio ?? true,
      status: 'validated',
      geoTag: this.createGeoTag(dto.geoTag),
      metadata,
      storageUrl,
      thumbnailUrl,
      createdAt: now,
      processedAt: now,
      notes: dto.notes,
    };

    await this.db.collection(this.EVIDENCE_COLLECTION).doc(evidenceId).set({
      ...evidence,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      processedAt: admin.firestore.Timestamp.fromDate(now),
      geoTag: {
        ...evidence.geoTag,
        capturedAt: admin.firestore.Timestamp.fromDate(evidence.geoTag.capturedAt),
        serverTimestamp: admin.firestore.Timestamp.fromDate(evidence.geoTag.serverTimestamp),
      },
    });

    await this.updateCollectionStatus(dto.verificationRequestId);

    this.logger.log(`✅ Video evidence ${evidenceId} saved successfully`);
    return evidence;
  }

  // ============================================================================
  // DOCUMENT EVIDENCE (with OCR)
  // ============================================================================

  /**
   * Upload and process document evidence
   */
  async uploadDocumentEvidence(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: UploadDocumentEvidenceDto,
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<DocumentEvidence> {
    this.logger.log(`📄 Processing document evidence for verification ${dto.verificationRequestId}`);

    const evidenceId = this.generateId();
    const storagePath = this.generateStoragePath(dto.verificationRequestId, 'document', evidenceId, filename);

    const { storageUrl, thumbnailUrl } = await this.uploadToStorage(file, storagePath, mimeType);

    const checksum = this.calculateChecksum(file);
    const metadata: MediaMetadata = {
      fileSizeBytes: file.length,
      mimeType,
      originalFilename: filename,
      checksum,
      deviceInfo: dto.deviceInfo,
    };

    // OCR processing (if requested)
    let ocrText: string | undefined;
    let extractedFields: Record<string, string> | undefined;
    if (dto.requestOcr) {
      const ocrResult = await this.performOcr(file, mimeType, dto.documentType);
      ocrText = ocrResult.text;
      extractedFields = ocrResult.fields;
    }

    const now = new Date();
    const evidence: DocumentEvidence = {
      id: evidenceId,
      verificationRequestId: dto.verificationRequestId,
      capturedBy: userId,
      capturedByRole: userRole,
      type: 'document',
      documentType: dto.documentType as DocumentEvidence['documentType'],
      pageCount: dto.pageCount || 1,
      ocrText,
      extractedFields,
      status: 'validated',
      geoTag: this.createGeoTag(dto.geoTag),
      metadata,
      storageUrl,
      thumbnailUrl,
      createdAt: now,
      processedAt: now,
      notes: dto.notes,
    };

    await this.db.collection(this.EVIDENCE_COLLECTION).doc(evidenceId).set({
      ...evidence,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      processedAt: admin.firestore.Timestamp.fromDate(now),
      geoTag: {
        ...evidence.geoTag,
        capturedAt: admin.firestore.Timestamp.fromDate(evidence.geoTag.capturedAt),
        serverTimestamp: admin.firestore.Timestamp.fromDate(evidence.geoTag.serverTimestamp),
      },
    });

    await this.updateCollectionStatus(dto.verificationRequestId);

    this.logger.log(`✅ Document evidence ${evidenceId} saved successfully`);
    return evidence;
  }

  // ============================================================================
  // DIGITAL SIGNATURE
  // ============================================================================

  /**
   * Capture digital signature
   */
  async captureSignature(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: CaptureSignatureDto,
    ipAddress?: string,
  ): Promise<SignatureEvidence> {
    this.logger.log(`✍️ Capturing signature for verification ${dto.verificationRequestId}`);

    const evidenceId = this.generateId();
    
    // Convert base64 signature to buffer and store
    const signatureBuffer = Buffer.from(dto.signatureData, 'base64');
    const storagePath = this.generateStoragePath(
      dto.verificationRequestId, 
      'signature', 
      evidenceId, 
      'signature.png'
    );

    const { storageUrl } = await this.uploadToStorage(signatureBuffer, storagePath, 'image/png');

    const checksum = this.calculateChecksum(signatureBuffer);
    const metadata: MediaMetadata = {
      fileSizeBytes: signatureBuffer.length,
      mimeType: 'image/png',
      originalFilename: 'signature.png',
      checksum,
    };

    const now = new Date();
    const evidence: SignatureEvidence = {
      id: evidenceId,
      verificationRequestId: dto.verificationRequestId,
      capturedBy: userId,
      capturedByRole: userRole,
      type: 'signature',
      signedBy: {
        name: dto.signedByName,
        role: dto.signedByRole,
        idVerified: dto.idVerified ?? false,
      },
      signatureData: dto.signatureData,
      legalDisclaimer: dto.legalDisclaimer,
      ipAddress,
      status: 'validated',
      geoTag: this.createGeoTag(dto.geoTag),
      metadata,
      storageUrl,
      createdAt: now,
      processedAt: now,
    };

    await this.db.collection(this.EVIDENCE_COLLECTION).doc(evidenceId).set({
      ...evidence,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      processedAt: admin.firestore.Timestamp.fromDate(now),
      geoTag: {
        ...evidence.geoTag,
        capturedAt: admin.firestore.Timestamp.fromDate(evidence.geoTag.capturedAt),
        serverTimestamp: admin.firestore.Timestamp.fromDate(evidence.geoTag.serverTimestamp),
      },
    });

    await this.updateCollectionStatus(dto.verificationRequestId);

    this.logger.log(`✅ Signature evidence ${evidenceId} saved successfully`);
    return evidence;
  }

  // ============================================================================
  // VOICE MEMO
  // ============================================================================

  /**
   * Upload voice memo
   */
  async uploadVoiceMemo(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    dto: UploadVoiceMemoDto,
    file: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<VoiceMemoEvidence> {
    this.logger.log(`🎙️ Processing voice memo for verification ${dto.verificationRequestId}`);

    const evidenceId = this.generateId();
    const storagePath = this.generateStoragePath(dto.verificationRequestId, 'voice_memo', evidenceId, filename);

    const { storageUrl } = await this.uploadToStorage(file, storagePath, mimeType);

    const checksum = this.calculateChecksum(file);
    const metadata: MediaMetadata = {
      fileSizeBytes: file.length,
      mimeType,
      originalFilename: filename,
      checksum,
      durationSeconds: dto.durationSeconds,
      deviceInfo: dto.deviceInfo,
    };

    // Transcription (if requested)
    let transcription: string | undefined;
    if (dto.requestTranscription) {
      transcription = await this.transcribeAudio(file, mimeType, dto.language);
    }

    const now = new Date();
    const evidence: VoiceMemoEvidence = {
      id: evidenceId,
      verificationRequestId: dto.verificationRequestId,
      capturedBy: userId,
      capturedByRole: userRole,
      type: 'voice_memo',
      durationSeconds: dto.durationSeconds,
      transcription,
      language: dto.language,
      status: 'validated',
      geoTag: this.createGeoTag(dto.geoTag),
      metadata,
      storageUrl,
      createdAt: now,
      processedAt: now,
    };

    await this.db.collection(this.EVIDENCE_COLLECTION).doc(evidenceId).set({
      ...evidence,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      processedAt: admin.firestore.Timestamp.fromDate(now),
      geoTag: {
        ...evidence.geoTag,
        capturedAt: admin.firestore.Timestamp.fromDate(evidence.geoTag.capturedAt),
        serverTimestamp: admin.firestore.Timestamp.fromDate(evidence.geoTag.serverTimestamp),
      },
    });

    await this.updateCollectionStatus(dto.verificationRequestId);

    this.logger.log(`✅ Voice memo evidence ${evidenceId} saved successfully`);
    return evidence;
  }

  // ============================================================================
  // EVIDENCE COLLECTION STATUS
  // ============================================================================

  /**
   * Get collection status for a verification request
   */
  async getCollectionStatus(verificationRequestId: string): Promise<{
    completionPercentage: number;
    status: 'incomplete' | 'complete' | 'exceeded';
    requiredEvidence: any[];
    collectedEvidence: any[];
  }> {
    const evidenceSnapshot = await this.db
      .collection(this.EVIDENCE_COLLECTION)
      .where('verificationRequestId', '==', verificationRequestId)
      .get();

    const collected = evidenceSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        category: data.category,
        status: data.status,
        thumbnailUrl: data.thumbnailUrl,
        capturedAt: data.createdAt?.toDate()?.toISOString(),
      };
    });

    // Get required evidence from verification request
    // This would come from the verification request's requirements
    const required = [
      { type: 'photo', category: 'location', minCount: 1, maxCount: 5 },
      { type: 'photo', category: 'subject', minCount: 1, maxCount: 3 },
    ];

    const completedCount = required.filter(req => {
      const matching = collected.filter(e => 
        e.type === req.type && 
        (!req.category || e.category === req.category) &&
        e.status === 'validated'
      );
      return matching.length >= req.minCount;
    }).length;

    const completionPercentage = Math.round((completedCount / required.length) * 100);

    return {
      completionPercentage,
      status: completionPercentage >= 100 ? 'complete' : 'incomplete',
      requiredEvidence: required.map(req => ({
        ...req,
        currentCount: collected.filter(e => 
          e.type === req.type && 
          (!req.category || e.category === req.category)
        ).length,
        isComplete: collected.filter(e => 
          e.type === req.type && 
          (!req.category || e.category === req.category) &&
          e.status === 'validated'
        ).length >= req.minCount,
      })),
      collectedEvidence: collected,
    };
  }

  // ============================================================================
  // QUALITY VALIDATION
  // ============================================================================

  /**
   * Validate photo quality
   */
  private async validatePhotoQuality(
    file: Buffer,
    geoTag: any,
  ): Promise<QualityMetrics> {
    // In production, use image processing libraries like sharp or cloud vision APIs
    // For now, we perform basic validation

    const rejectionReasons: string[] = [];
    const warnings: string[] = [];

    // GPS accuracy check
    const gpsAccuracyMeters = geoTag.accuracy || 0;
    if (gpsAccuracyMeters > this.MIN_GPS_ACCURACY_METERS) {
      rejectionReasons.push(`GPS accuracy too low: ${gpsAccuracyMeters}m (max ${this.MIN_GPS_ACCURACY_METERS}m)`);
    }

    // File size check (minimum 50KB for reasonable quality)
    if (file.length < 50000) {
      warnings.push('Image file size is very small, quality may be low');
    }

    // Basic quality score (placeholder - would use actual image analysis)
    const blurScore = 75; // Would be calculated from image analysis
    const brightnessScore = 70;
    const overallScore = Math.round((blurScore + brightnessScore) / 2);

    const isAcceptable = rejectionReasons.length === 0 && overallScore >= this.MIN_PHOTO_QUALITY_SCORE;

    return {
      overallScore,
      blurScore,
      brightnessScore,
      gpsAccuracyMeters,
      isAcceptable,
      rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : undefined,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async uploadToStorage(
    file: Buffer,
    path: string,
    mimeType: string,
  ): Promise<{ storageUrl: string; thumbnailUrl?: string }> {
    const bucket = this.storage.bucket(this.EVIDENCE_BUCKET);
    const fileRef = bucket.file(path);

    await fileRef.save(file, {
      contentType: mimeType,
      metadata: {
        cacheControl: 'private, max-age=31536000',
      },
    });

    // Generate signed URL (valid for 7 days)
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return {
      storageUrl: signedUrl,
      thumbnailUrl: signedUrl, // In production, generate actual thumbnail
    };
  }

  private generateStoragePath(
    verificationRequestId: string,
    type: string,
    evidenceId: string,
    filename: string,
  ): string {
    const date = new Date().toISOString().split('T')[0];
    const ext = filename.split('.').pop() || 'bin';
    return `evidence/${date}/${verificationRequestId}/${type}/${evidenceId}.${ext}`;
  }

  private createGeoTag(dto: any): GeoTag {
    const now = new Date();
    return {
      coordinates: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
      },
      address: dto.address,
      capturedAt: new Date(dto.capturedAt),
      deviceTimestamp: new Date(dto.capturedAt),
      serverTimestamp: now,
      timezone: dto.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private calculateChecksum(file: Buffer): string {
    return crypto.createHash('sha256').update(file).digest('hex');
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private async performOcr(
    file: Buffer,
    mimeType: string,
    documentType: string,
  ): Promise<{ text: string; fields: Record<string, string> }> {
    // In production, use Google Cloud Vision or similar
    // For now, return placeholder
    this.logger.log(`📝 Performing OCR on ${documentType} document`);
    return {
      text: '',
      fields: {},
    };
  }

  private async transcribeAudio(
    file: Buffer,
    mimeType: string,
    language?: string,
  ): Promise<string> {
    // In production, use Google Speech-to-Text or similar
    this.logger.log(`🎙️ Transcribing audio (${language || 'auto'})`);
    return '';
  }

  private async updateCollectionStatus(verificationRequestId: string): Promise<void> {
    // Update the evidence collection summary
    const status = await this.getCollectionStatus(verificationRequestId);
    
    await this.db.collection('verification_requests').doc(verificationRequestId).update({
      evidenceCollectionStatus: status.status,
      evidenceCompletionPercentage: status.completionPercentage,
      lastEvidenceUpdatedAt: admin.firestore.Timestamp.now(),
    });
  }
}
