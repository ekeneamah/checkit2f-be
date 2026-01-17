/**
 * KYC Request Entity
 * Core aggregate root for KYC verification business logic
 * Implements the 5-phase KYC flow
 */
import { v4 as uuidv4 } from 'uuid';
import { 
  KycStatus, 
  isValidTransition, 
  getPhaseForStatus,
  KycVerificationType,
  KycUrgency,
  KycEvidenceType,
  ContactMethod,
  ContactOutcome,
  RatingCategory,
  QaFlagReason,
} from '../enums';
import { CustomerDetails } from '../value-objects/customer-details.value-object';
import { VerificationToken } from '../value-objects/verification-token.value-object';
import { Schedule } from '../value-objects/schedule.value-object';

/**
 * Contact Attempt record
 */
export interface ContactAttempt {
  id: string;
  method: ContactMethod;
  outcome: ContactOutcome;
  phoneNumber?: string;
  notes?: string;
  attemptedAt: Date;
  attemptedBy: string;
}

/**
 * Evidence record
 */
export interface KycEvidence {
  id: string;
  type: KycEvidenceType;
  url: string;
  description?: string;
  metadata?: Record<string, unknown>;
  capturedAt: Date;
  capturedBy: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

/**
 * Customer Rating
 */
export interface CustomerRating {
  overallRating: number; // 1-5
  categoryRatings?: Record<RatingCategory, number>;
  comment?: string;
  ratedAt: Date;
}

/**
 * QA Review
 */
export interface QaReview {
  reviewedBy: string;
  reviewedAt: Date;
  approved: boolean;
  flagReasons?: QaFlagReason[];
  comments?: string;
  requiresResubmission: boolean;
}

/**
 * Status History Entry
 */
export interface StatusHistoryEntry {
  status: KycStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Location for KYC
 */
export interface KycLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  accessInstructions?: string;
}

/**
 * KYC Request Entity
 */
export class KycRequest {
  private readonly _id: string;
  private readonly _bankId: string;
  private readonly _bankReference: string;
  private readonly _verificationType: KycVerificationType;
  private readonly _urgency: KycUrgency;
  private readonly _createdAt: Date;
  
  private _customer: CustomerDetails;
  private _location: KycLocation;
  private _status: KycStatus;
  private _statusHistory: StatusHistoryEntry[];
  private _verificationToken: VerificationToken | null;
  private _schedule: Schedule | null;
  
  // Assignments
  private _companyId: string | null;
  private _riderId: string | null;
  private _riderName: string | null;
  private _riderPhone: string | null;
  private _riderPhoto: string | null;
  
  // Bank letter
  private _introductoryLetterUrl: string | null;
  private _introductoryLetterUploadedAt: Date | null;
  
  // Evidence & Verification
  private _evidence: KycEvidence[];
  private _contactAttempts: ContactAttempt[];
  private _questionnaireResponses: Record<string, unknown> | null;
  
  // Check-in data
  private _checkInAt: Date | null;
  private _checkInLocation: { latitude: number; longitude: number } | null;
  private _checkOutAt: Date | null;
  
  // Post-verification
  private _customerRating: CustomerRating | null;
  private _qaReview: QaReview | null;
  private _completedAt: Date | null;
  private _reportUrl: string | null;
  private _reportSentAt: Date | null;
  
  // Consent
  private _customerConsentedAt: Date | null;
  private _customerConsentIp: string | null;
  
  // Metadata
  private _notes: string | null;
  private _modifiedAt: Date;

  constructor(
    bankId: string,
    bankReference: string,
    customer: CustomerDetails,
    location: KycLocation,
    verificationType: KycVerificationType = KycVerificationType.CUSTOMER_KYC,
    urgency: KycUrgency = KycUrgency.STANDARD,
    id?: string,
  ) {
    this._id = id || uuidv4();
    this._bankId = bankId;
    this._bankReference = bankReference;
    this._customer = customer;
    this._location = location;
    this._verificationType = verificationType;
    this._urgency = urgency;
    this._status = KycStatus.CREATED;
    this._statusHistory = [{
      status: KycStatus.CREATED,
      changedAt: new Date(),
      changedBy: 'SYSTEM',
      reason: 'KYC request created',
    }];
    this._createdAt = new Date();
    this._modifiedAt = new Date();
    
    // Initialize nullable fields
    this._verificationToken = null;
    this._schedule = null;
    this._companyId = null;
    this._riderId = null;
    this._riderName = null;
    this._riderPhone = null;
    this._riderPhoto = null;
    this._introductoryLetterUrl = null;
    this._introductoryLetterUploadedAt = null;
    this._evidence = [];
    this._contactAttempts = [];
    this._questionnaireResponses = null;
    this._checkInAt = null;
    this._checkInLocation = null;
    this._checkOutAt = null;
    this._customerRating = null;
    this._qaReview = null;
    this._completedAt = null;
    this._reportUrl = null;
    this._reportSentAt = null;
    this._customerConsentedAt = null;
    this._customerConsentIp = null;
    this._notes = null;
  }

  // ============ Getters ============
  get id(): string { return this._id; }
  get bankId(): string { return this._bankId; }
  get bankReference(): string { return this._bankReference; }
  get customer(): CustomerDetails { return this._customer; }
  get location(): KycLocation { return this._location; }
  get verificationType(): KycVerificationType { return this._verificationType; }
  get urgency(): KycUrgency { return this._urgency; }
  get status(): KycStatus { return this._status; }
  get statusHistory(): StatusHistoryEntry[] { return [...this._statusHistory]; }
  get verificationToken(): VerificationToken | null { return this._verificationToken; }
  get schedule(): Schedule | null { return this._schedule; }
  get companyId(): string | null { return this._companyId; }
  get riderId(): string | null { return this._riderId; }
  get riderName(): string | null { return this._riderName; }
  get riderPhone(): string | null { return this._riderPhone; }
  get riderPhoto(): string | null { return this._riderPhoto; }
  get introductoryLetterUrl(): string | null { return this._introductoryLetterUrl; }
  get evidence(): KycEvidence[] { return [...this._evidence]; }
  get contactAttempts(): ContactAttempt[] { return [...this._contactAttempts]; }
  get questionnaireResponses(): Record<string, unknown> | null { return this._questionnaireResponses; }
  get checkInAt(): Date | null { return this._checkInAt; }
  get checkInLocation(): { latitude: number; longitude: number } | null { return this._checkInLocation; }
  get checkOutAt(): Date | null { return this._checkOutAt; }
  get customerRating(): CustomerRating | null { return this._customerRating; }
  get qaReview(): QaReview | null { return this._qaReview; }
  get completedAt(): Date | null { return this._completedAt; }
  get reportUrl(): string | null { return this._reportUrl; }
  get customerConsentedAt(): Date | null { return this._customerConsentedAt; }
  get notes(): string | null { return this._notes; }
  get createdAt(): Date { return this._createdAt; }
  get modifiedAt(): Date { return this._modifiedAt; }
  
  get currentPhase(): string {
    return getPhaseForStatus(this._status);
  }

  // ============ Phase 1: Request Methods ============
  
  /**
   * Send confirmation request to customer
   */
  requestCustomerConfirmation(changedBy: string): void {
    this.transitionStatus(KycStatus.PENDING_CUSTOMER_CONFIRMATION, changedBy, 'Confirmation SMS sent to customer');
    this._verificationToken = new VerificationToken();
    this._modifiedAt = new Date();
  }

  /**
   * Customer confirms details and gives consent
   */
  customerConfirm(consentIp: string, changedBy: string): void {
    this.transitionStatus(KycStatus.CUSTOMER_CONFIRMED, changedBy, 'Customer confirmed details and gave consent');
    this._customerConsentedAt = new Date();
    this._customerConsentIp = consentIp;
    this._modifiedAt = new Date();
  }

  /**
   * Customer rejects/declines
   */
  customerReject(reason: string, changedBy: string): void {
    this.transitionStatus(KycStatus.CUSTOMER_REJECTED, changedBy, reason);
    this._modifiedAt = new Date();
  }

  /**
   * Submit for admin review
   */
  submitForAdminReview(changedBy: string): void {
    this.transitionStatus(KycStatus.PENDING_ADMIN_REVIEW, changedBy, 'Submitted for admin review');
    this._modifiedAt = new Date();
  }

  // ============ Phase 2: Assignment Methods ============

  /**
   * Admin approves and marks for assignment
   */
  approveForAssignment(changedBy: string): void {
    this.transitionStatus(KycStatus.PENDING_ASSIGNMENT, changedBy, 'Admin approved for assignment');
    this._modifiedAt = new Date();
  }

  /**
   * Assign to company
   */
  assignToCompany(companyId: string, changedBy: string): void {
    this.transitionStatus(KycStatus.ASSIGNED_TO_COMPANY, changedBy, `Assigned to company: ${companyId}`);
    this._companyId = companyId;
    this._modifiedAt = new Date();
  }

  /**
   * Company assigns rider
   */
  assignRider(riderId: string, riderName: string, riderPhone: string | null, riderPhoto: string | null, changedBy: string): void {
    this.transitionStatus(KycStatus.RIDER_ASSIGNED, changedBy, `Rider assigned: ${riderName}`);
    this._riderId = riderId;
    this._riderName = riderName;
    this._riderPhone = riderPhone;
    this._riderPhoto = riderPhoto;
    // Generate new OTP for mutual verification
    this._verificationToken = this._verificationToken?.regenerateOtp() || new VerificationToken();
    this.transitionStatus(KycStatus.PENDING_LETTER, changedBy, 'Awaiting bank introductory letter');
    this._modifiedAt = new Date();
  }

  /**
   * Bank uploads introductory letter
   */
  uploadIntroductoryLetter(letterUrl: string, changedBy: string): void {
    this._introductoryLetterUrl = letterUrl;
    this._introductoryLetterUploadedAt = new Date();
    this.transitionStatus(KycStatus.LETTER_UPLOADED, changedBy, 'Introductory letter uploaded');
    this._modifiedAt = new Date();
  }

  /**
   * Schedule visit
   */
  scheduleVisit(schedule: Schedule, changedBy: string): void {
    this._schedule = schedule;
    this.transitionStatus(KycStatus.SCHEDULED, changedBy, `Visit scheduled for ${schedule.formattedDate}`);
    this._modifiedAt = new Date();
  }

  // ============ Phase 3: Pre-Visit Methods ============

  /**
   * Rider starts journey
   */
  riderEnRoute(changedBy: string): void {
    this.transitionStatus(KycStatus.RIDER_EN_ROUTE, changedBy, 'Rider en route to location');
    this._modifiedAt = new Date();
  }

  /**
   * Rider arrives at location
   */
  riderArrived(latitude: number, longitude: number, changedBy: string): void {
    this.transitionStatus(KycStatus.ARRIVED, changedBy, 'Rider arrived at location');
    this._checkInAt = new Date();
    this._checkInLocation = { latitude, longitude };
    this.transitionStatus(KycStatus.PENDING_OTP, changedBy, 'Awaiting customer OTP entry');
    this._modifiedAt = new Date();
  }

  /**
   * Reschedule visit (customer initiated, up to 1 hour before)
   */
  reschedule(newDate: Date, timeStart: string, timeEnd: string, reason: string, changedBy: string): void {
    if (this._schedule && !this._schedule.canReschedule()) {
      throw new Error('Cannot reschedule less than 1 hour before scheduled time');
    }
    this._schedule = this._schedule?.reschedule(newDate, timeStart, timeEnd, reason) 
      || new Schedule(newDate, timeStart, timeEnd);
    this.transitionStatus(KycStatus.RESCHEDULED, changedBy, reason);
    this.transitionStatus(KycStatus.SCHEDULED, changedBy, 'Visit rescheduled');
    this._modifiedAt = new Date();
  }

  // ============ Phase 4: Verification Methods ============

  /**
   * Verify OTP entered by customer
   */
  verifyOtp(inputOtp: string, changedBy: string): boolean {
    if (!this._verificationToken) {
      throw new Error('No verification token generated');
    }
    
    const isValid = this._verificationToken.verifyOtp(inputOtp);
    if (isValid) {
      this._verificationToken = this._verificationToken.markAsUsed();
      this.transitionStatus(KycStatus.OTP_VERIFIED, changedBy, 'OTP verified successfully');
      this.transitionStatus(KycStatus.IN_PROGRESS, changedBy, 'Verification in progress');
      this._modifiedAt = new Date();
    }
    return isValid;
  }

  /**
   * Regenerate OTP
   */
  regenerateOtp(): string {
    this._verificationToken = this._verificationToken?.regenerateOtp() || new VerificationToken();
    this._modifiedAt = new Date();
    return this._verificationToken.otp;
  }

  /**
   * Add evidence
   */
  addEvidence(evidence: Omit<KycEvidence, 'id'>): void {
    this._evidence.push({
      ...evidence,
      id: uuidv4(),
    });
    this._modifiedAt = new Date();
  }

  /**
   * Add contact attempt
   */
  addContactAttempt(attempt: Omit<ContactAttempt, 'id'>): void {
    this._contactAttempts.push({
      ...attempt,
      id: uuidv4(),
    });
    this._modifiedAt = new Date();
  }

  /**
   * Submit questionnaire responses
   */
  submitQuestionnaireResponses(responses: Record<string, unknown>): void {
    this._questionnaireResponses = responses;
    this._modifiedAt = new Date();
  }

  /**
   * Mark evidence collection complete
   */
  markEvidenceCollected(changedBy: string): void {
    this.transitionStatus(KycStatus.EVIDENCE_COLLECTED, changedBy, 'All evidence collected');
    this._modifiedAt = new Date();
  }

  /**
   * Submit verification
   */
  submitVerification(changedBy: string): void {
    this._checkOutAt = new Date();
    this.transitionStatus(KycStatus.SUBMITTED, changedBy, 'Verification submitted');
    this.transitionStatus(KycStatus.PENDING_RATING, changedBy, 'Awaiting customer rating');
    this._modifiedAt = new Date();
  }

  // ============ Phase 5: Post-Verification Methods ============

  /**
   * Customer submits rating
   */
  submitRating(rating: CustomerRating, changedBy: string): void {
    this._customerRating = rating;
    // Check if QA review is needed (random or flagged)
    const needsQa = this.shouldFlagForQa();
    if (needsQa) {
      this.transitionStatus(KycStatus.PENDING_QA, changedBy, 'Flagged for QA review');
    } else {
      this.transitionStatus(KycStatus.COMPLETED, changedBy, 'Verification completed');
      this._completedAt = new Date();
    }
    this._modifiedAt = new Date();
  }

  /**
   * Skip rating (timeout or customer declined)
   */
  skipRating(reason: string, changedBy: string): void {
    const needsQa = this.shouldFlagForQa();
    if (needsQa) {
      this.transitionStatus(KycStatus.PENDING_QA, changedBy, reason);
    } else {
      this.transitionStatus(KycStatus.COMPLETED, changedBy, 'Verification completed without rating');
      this._completedAt = new Date();
    }
    this._modifiedAt = new Date();
  }

  /**
   * Check if should flag for QA
   */
  private shouldFlagForQa(): boolean {
    // Random 10% audit
    if (Math.random() < 0.1) return true;
    // Low rating
    if (this._customerRating && this._customerRating.overallRating <= 2) return true;
    // GPS mismatch (more than 500m from expected location)
    if (this._checkInLocation && this._location.latitude && this._location.longitude) {
      const distance = this.calculateDistance(
        this._checkInLocation.latitude,
        this._checkInLocation.longitude,
        this._location.latitude,
        this._location.longitude,
      );
      if (distance > 500) return true;
    }
    return false;
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Submit QA review
   */
  submitQaReview(review: QaReview, changedBy: string): void {
    this._qaReview = review;
    if (review.approved) {
      this.transitionStatus(KycStatus.QA_APPROVED, changedBy, 'QA approved');
      this.transitionStatus(KycStatus.COMPLETED, changedBy, 'Verification completed');
      this._completedAt = new Date();
    } else {
      this.transitionStatus(KycStatus.QA_REJECTED, changedBy, review.comments || 'QA rejected');
      if (review.requiresResubmission) {
        this.transitionStatus(KycStatus.IN_PROGRESS, changedBy, 'Resubmission required');
      }
    }
    this._modifiedAt = new Date();
  }

  /**
   * Generate and set report URL
   */
  setReportUrl(reportUrl: string): void {
    this._reportUrl = reportUrl;
    this._modifiedAt = new Date();
  }

  /**
   * Mark report as sent to bank
   */
  markReportSent(changedBy: string): void {
    this._reportSentAt = new Date();
    this.transitionStatus(KycStatus.REPORT_SENT, changedBy, 'Report sent to bank');
    this._modifiedAt = new Date();
  }

  /**
   * Mark payment processed
   */
  markPaymentProcessed(changedBy: string): void {
    this.transitionStatus(KycStatus.PAYMENT_PROCESSED, changedBy, 'Payment processed');
    this._modifiedAt = new Date();
  }

  // ============ Helper Methods ============

  /**
   * Transition status with validation
   */
  private transitionStatus(newStatus: KycStatus, changedBy: string, reason?: string): void {
    if (!isValidTransition(this._status, newStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`);
    }
    
    this._statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy,
      reason,
    });
    this._status = newStatus;
  }

  /**
   * Set notes
   */
  setNotes(notes: string): void {
    this._notes = notes;
    this._modifiedAt = new Date();
  }

  /**
   * Update location
   */
  updateLocation(location: KycLocation): void {
    this._location = location;
    this._modifiedAt = new Date();
  }

  /**
   * Update customer details
   */
  updateCustomer(customer: CustomerDetails): void {
    this._customer = customer;
    this._modifiedAt = new Date();
  }

  // ============ Serialization ============

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      bankId: this._bankId,
      bankReference: this._bankReference,
      customer: this._customer.toJSON(),
      location: this._location,
      verificationType: this._verificationType,
      urgency: this._urgency,
      status: this._status,
      currentPhase: this.currentPhase,
      statusHistory: this._statusHistory,
      verificationToken: this._verificationToken?.toJSON(),
      schedule: this._schedule?.toJSON(),
      companyId: this._companyId,
      riderId: this._riderId,
      riderName: this._riderName,
      riderPhone: this._riderPhone,
      riderPhoto: this._riderPhoto,
      introductoryLetterUrl: this._introductoryLetterUrl,
      introductoryLetterUploadedAt: this._introductoryLetterUploadedAt?.toISOString(),
      evidence: this._evidence,
      contactAttempts: this._contactAttempts,
      questionnaireResponses: this._questionnaireResponses,
      checkInAt: this._checkInAt?.toISOString(),
      checkInLocation: this._checkInLocation,
      checkOutAt: this._checkOutAt?.toISOString(),
      customerRating: this._customerRating,
      qaReview: this._qaReview,
      completedAt: this._completedAt?.toISOString(),
      reportUrl: this._reportUrl,
      reportSentAt: this._reportSentAt?.toISOString(),
      customerConsentedAt: this._customerConsentedAt?.toISOString(),
      customerConsentIp: this._customerConsentIp,
      notes: this._notes,
      createdAt: this._createdAt.toISOString(),
      modifiedAt: this._modifiedAt.toISOString(),
    };
  }

  static fromJSON(data: Record<string, unknown>): KycRequest {
    const customer = CustomerDetails.fromJSON(data.customer as Record<string, unknown>);
    const request = new KycRequest(
      data.bankId as string,
      data.bankReference as string,
      customer,
      data.location as KycLocation,
      data.verificationType as KycVerificationType,
      data.urgency as KycUrgency,
      data.id as string,
    );

    // Restore internal state
    request._status = data.status as KycStatus;
    request._statusHistory = data.statusHistory as StatusHistoryEntry[];
    request._verificationToken = data.verificationToken 
      ? VerificationToken.fromJSON(data.verificationToken as Record<string, unknown>) 
      : null;
    request._schedule = data.schedule 
      ? Schedule.fromJSON(data.schedule as Record<string, unknown>) 
      : null;
    request._companyId = data.companyId as string | null;
    request._riderId = data.riderId as string | null;
    request._riderName = data.riderName as string | null;
    request._riderPhone = data.riderPhone as string | null;
    request._riderPhoto = data.riderPhoto as string | null;
    request._introductoryLetterUrl = data.introductoryLetterUrl as string | null;
    request._introductoryLetterUploadedAt = data.introductoryLetterUploadedAt 
      ? new Date(data.introductoryLetterUploadedAt as string) 
      : null;
    request._evidence = data.evidence as KycEvidence[];
    request._contactAttempts = data.contactAttempts as ContactAttempt[];
    request._questionnaireResponses = data.questionnaireResponses as Record<string, unknown> | null;
    request._checkInAt = data.checkInAt ? new Date(data.checkInAt as string) : null;
    request._checkInLocation = data.checkInLocation as { latitude: number; longitude: number } | null;
    request._checkOutAt = data.checkOutAt ? new Date(data.checkOutAt as string) : null;
    request._customerRating = data.customerRating as CustomerRating | null;
    request._qaReview = data.qaReview as QaReview | null;
    request._completedAt = data.completedAt ? new Date(data.completedAt as string) : null;
    request._reportUrl = data.reportUrl as string | null;
    request._reportSentAt = data.reportSentAt ? new Date(data.reportSentAt as string) : null;
    request._customerConsentedAt = data.customerConsentedAt 
      ? new Date(data.customerConsentedAt as string) 
      : null;
    request._customerConsentIp = data.customerConsentIp as string | null;
    request._notes = data.notes as string | null;
    request._modifiedAt = new Date(data.modifiedAt as string);

    return request;
  }
}
