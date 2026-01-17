/**
 * KYC Request Service
 * Core service for KYC request operations
 */
import { Injectable, Inject, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { 
  KycRequest, 
  KycStatus,
  KycLocation,
  CustomerDetails,
  Schedule,
  IKycRequestRepository,
  KYC_REPOSITORY_TOKEN,
  KycQueryFilters,
  KycQueryResult,
  KycStatistics,
  KycEvidence,
  ContactAttempt,
  CustomerRating,
  QaReview,
  isValidTransition,
} from '../../domain';
import {
  CreateKycRequestDto,
  CustomerConfirmationDto,
  AssignCompanyDto,
  AssignRiderDto,
  AdminAssignRiderDto,
  UploadLetterDto,
  ScheduleVisitDto,
  RescheduleDto,
  CheckInDto,
  VerifyOtpDto,
  AddEvidenceDto,
  AddContactAttemptDto,
  SubmitQuestionnaireDto,
  SubmitRatingDto,
  SubmitQaReviewDto,
  QueryKycRequestsDto,
} from '../dtos';
import { KycNotificationService } from './kyc-notification.service';

@Injectable()
export class KycRequestService {
  private readonly logger = new Logger(KycRequestService.name);

  constructor(
    @Inject(KYC_REPOSITORY_TOKEN)
    private readonly repository: IKycRequestRepository,
    private readonly notificationService: KycNotificationService,
  ) {}

  // =========================================================================
  // PHASE 1: REQUEST INITIATION
  // =========================================================================

  /**
   * Create a new KYC request (Bank initiates)
   */
  async createRequest(bankId: string, dto: CreateKycRequestDto): Promise<KycRequest> {
    this.logger.log(`Creating KYC request for bank: ${bankId}`);

    // Check for duplicate request
    const existing = await this.repository.findByBankReference(bankId, dto.bankReference);
    if (existing) {
      throw new BadRequestException(`KYC request with reference ${dto.bankReference} already exists`);
    }

    // Create customer details value object
    const customerDetails = new CustomerDetails(
      dto.customer.fullName,
      dto.customer.phoneNumber,
      dto.customer.email,
      dto.location.address,
      dto.customer.bvn,
      undefined, // accountNumber not in DTO
    );

    // Create location
    const location: KycLocation = {
      address: dto.location.address,
      city: dto.location.city,
      state: dto.location.state,
      country: dto.location.country || 'Nigeria',
      postalCode: dto.location.postalCode,
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      landmark: dto.location.landmark,
      accessInstructions: dto.location.accessInstructions,
    };

    // Create entity
    const request = new KycRequest(
      bankId,
      dto.bankReference,
      customerDetails,
      location,
      dto.verificationType,
      dto.urgency,
    );

    // Request customer confirmation
    request.requestCustomerConfirmation('SYSTEM');

    // Save
    const saved = await this.repository.create(request);

    // Send SMS to customer with confirmation link
    await this.notificationService.sendConfirmationRequest(saved);

    this.logger.log(`KYC request created: ${saved.id}, awaiting customer confirmation`);
    return saved;
  }

  /**
   * Customer confirms the KYC request
   */
  async customerConfirm(token: string, dto: CustomerConfirmationDto): Promise<KycRequest> {
    this.logger.log(`Processing customer confirmation for token: ${token}`);

    const request = await this.findByToken(token);

    if (!isValidTransition(request.status, KycStatus.CUSTOMER_CONFIRMED)) {
      throw new BadRequestException(`Cannot confirm request in status: ${request.status}`);
    }

    // Update customer details if provided
    if (dto.confirmedName || dto.confirmedPhone) {
      const updatedCustomer = new CustomerDetails(
        dto.confirmedName || request.customer.fullName,
        dto.confirmedPhone || request.customer.phoneNumber,
        request.customer.email,
        request.customer.bvn,
        request.customer.nin,
        request.customer.dateOfBirth,
        request.customer.gender,
        request.customer.nationality,
      );
      request.updateCustomer(updatedCustomer);
    }

    // Update location if provided
    if (dto.updatedLocation) {
      request.updateLocation({
        address: dto.updatedLocation.address || request.location.address,
        city: dto.updatedLocation.city || request.location.city,
        state: dto.updatedLocation.state || request.location.state,
        country: dto.updatedLocation.country || request.location.country,
        postalCode: dto.updatedLocation.postalCode,
        latitude: dto.updatedLocation.latitude,
        longitude: dto.updatedLocation.longitude,
        landmark: dto.updatedLocation.landmark,
        accessInstructions: dto.updatedLocation.accessInstructions,
      });
    }

    request.customerConfirm(dto.ipAddress || 'UNKNOWN', 'CUSTOMER');

    const saved = await this.repository.update(request);

    // Notify bank of confirmation
    await this.notificationService.notifyBankOfConfirmation(saved);

    this.logger.log(`Customer confirmed KYC request: ${saved.id}`);
    return saved;
  }

  /**
   * Customer rejects the KYC request
   */
  async customerReject(token: string, reason?: string): Promise<KycRequest> {
    this.logger.log(`Processing customer rejection for token: ${token}`);

    const request = await this.findByToken(token);

    if (!isValidTransition(request.status, KycStatus.CUSTOMER_REJECTED)) {
      throw new BadRequestException(`Cannot reject request in status: ${request.status}`);
    }

    request.customerReject(reason || 'Customer declined verification', 'CUSTOMER');

    const saved = await this.repository.update(request);

    // Notify bank of rejection
    await this.notificationService.notifyBankOfRejection(saved);

    this.logger.log(`Customer rejected KYC request: ${saved.id}`);
    return saved;
  }

  /**
   * Resend confirmation SMS to customer
   */
  async resendConfirmationSms(id: string, bankId: string): Promise<void> {
    const request = await this.findById(id);
    this.validateBankOwnership(request, bankId);

    if (request.status !== KycStatus.PENDING_CUSTOMER_CONFIRMATION) {
      throw new BadRequestException('Can only resend confirmation for requests pending customer confirmation');
    }

    // Re-send the SMS
    await this.notificationService.sendConfirmationReminder(request);

    this.logger.log(`Confirmation SMS resent for KYC request ${id}`);
  }

  /**
   * Submit for admin review (after customer confirmation)
   */
  async submitForAdminReview(id: string, bankId: string): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateBankOwnership(request, bankId);

    if (request.status !== KycStatus.CUSTOMER_CONFIRMED) {
      throw new BadRequestException('Request must be in CUSTOMER_CONFIRMED status for admin review');
    }

    request.submitForAdminReview(bankId);

    const saved = await this.repository.update(request);

    // Notify admin of new request pending review
    await this.notificationService.notifyAdminNewRequest(saved);

    this.logger.log(`KYC request ${saved.id} submitted for admin review`);
    return saved;
  }

  // =========================================================================
  // PHASE 2: ASSIGNMENT & SCHEDULING
  // =========================================================================

  /**
   * Admin approves request for company assignment
   */
  async approveForAssignment(id: string, adminId: string): Promise<KycRequest> {
    const request = await this.findById(id);

    if (request.status !== KycStatus.PENDING_ADMIN_REVIEW) {
      throw new BadRequestException('Request must be in PENDING_ADMIN_REVIEW status');
    }

    request.approveForAssignment(adminId);

    const saved = await this.repository.update(request);

    // Notify relevant companies about new assignment opportunity
    await this.notificationService.notifyCompaniesNewAssignment(saved);

    this.logger.log(`KYC request ${saved.id} approved by admin ${adminId} for assignment`);
    return saved;
  }

  /**
   * Assign request to a verification company
   */
  async assignToCompany(id: string, adminId: string, dto: AssignCompanyDto): Promise<KycRequest> {
    const request = await this.findById(id);

    if (request.status !== KycStatus.PENDING_ASSIGNMENT) {
      throw new BadRequestException('Request must be in PENDING_ASSIGNMENT status');
    }

    request.assignToCompany(dto.companyId, adminId);
    if (dto.notes) {
      request.setNotes(dto.notes);
    }

    const saved = await this.repository.update(request);

    // Notify company of assignment
    await this.notificationService.notifyCompanyOfAssignment(saved);

    this.logger.log(`KYC request ${saved.id} assigned to company ${dto.companyId}`);
    return saved;
  }

  /**
   * Company assigns a rider
   */
  async assignRider(id: string, companyId: string, dto: AssignRiderDto): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateCompanyOwnership(request, companyId);

    if (request.status !== KycStatus.ASSIGNED_TO_COMPANY) {
      throw new BadRequestException('Request must be in ASSIGNED_TO_COMPANY status');
    }

    request.assignRider(dto.riderId, dto.riderName, dto.riderPhone || null, dto.riderPhoto || null, companyId);

    const saved = await this.repository.update(request);

    // Notify rider of assignment
    await this.notificationService.notifyRiderOfAssignment(saved);

    this.logger.log(`KYC request ${saved.id} assigned to rider ${dto.riderId}`);
    return saved;
  }

  /**
   * Admin directly assigns a rider (bypasses company assignment step)
   * This allows admin to assign to a company AND rider in one step
   */
  async adminAssignRider(id: string, adminId: string, dto: AdminAssignRiderDto): Promise<KycRequest> {
    const request = await this.findById(id);

    // Admin can assign from PENDING_ASSIGNMENT (skipping company step) or ASSIGNED_TO_COMPANY
    const allowedStatuses = [KycStatus.PENDING_ASSIGNMENT, KycStatus.ASSIGNED_TO_COMPANY];
    if (!allowedStatuses.includes(request.status)) {
      throw new BadRequestException(`Cannot assign rider in status: ${request.status}. Must be PENDING_ASSIGNMENT or ASSIGNED_TO_COMPANY`);
    }

    // If not yet assigned to company, assign first
    if (request.status === KycStatus.PENDING_ASSIGNMENT) {
      request.assignToCompany(dto.companyId, adminId);
    }

    // Then assign rider
    request.assignRider(dto.riderId, dto.riderName, dto.riderPhone || null, dto.riderPhoto || null, adminId);

    const saved = await this.repository.update(request);

    // Notify company and rider of assignment
    await this.notificationService.notifyCompanyOfAssignment(saved);
    await this.notificationService.notifyRiderOfAssignment(saved);

    this.logger.log(`Admin ${adminId} directly assigned rider ${dto.riderId} to KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Bank uploads introductory letter
   */
  async uploadIntroductoryLetter(id: string, bankId: string, dto: UploadLetterDto): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateBankOwnership(request, bankId);

    // Validate status allows letter upload
    const allowedStatuses = [
      KycStatus.RIDER_ASSIGNED,
      KycStatus.PENDING_LETTER,
      KycStatus.SCHEDULED,
    ];
    if (!allowedStatuses.includes(request.status)) {
      throw new BadRequestException(`Cannot upload letter in status: ${request.status}`);
    }

    request.uploadIntroductoryLetter(dto.letterUrl, bankId);

    const saved = await this.repository.update(request);

    // Notify customer of letter upload and upcoming visit
    await this.notificationService.notifyCustomerLetterReady(saved);

    this.logger.log(`Introductory letter uploaded for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Schedule the verification visit
   */
  async scheduleVisit(id: string, actorId: string, dto: ScheduleVisitDto): Promise<KycRequest> {
    const request = await this.findById(id);

    // Validate status allows scheduling
    if (request.status !== KycStatus.LETTER_UPLOADED && request.status !== KycStatus.RIDER_ASSIGNED) {
      throw new BadRequestException(`Cannot schedule visit in status: ${request.status}`);
    }

    const schedule = new Schedule(
      new Date(dto.scheduledDate),
      dto.scheduledTimeStart,
      dto.scheduledTimeEnd,
    );

    request.scheduleVisit(schedule, actorId);

    const saved = await this.repository.update(request);

    // Notify customer of scheduled visit
    await this.notificationService.notifyCustomerVisitScheduled(saved);

    this.logger.log(`Visit scheduled for KYC request ${saved.id}`);
    return saved;
  }

  // =========================================================================
  // PHASE 3: PRE-VISIT & ARRIVAL
  // =========================================================================

  /**
   * Reschedule the verification visit
   */
  async rescheduleVisit(id: string, actorId: string, dto: RescheduleDto): Promise<KycRequest> {
    const request = await this.findById(id);

    if (!request.schedule) {
      throw new BadRequestException('No existing schedule to reschedule');
    }

    if (!request.schedule.canReschedule()) {
      throw new BadRequestException('Cannot reschedule - visit time is too close (within 1 hour)');
    }

    request.reschedule(
      new Date(dto.newDate), 
      dto.newTimeStart, 
      dto.newTimeEnd, 
      dto.reason,
      actorId
    );

    const saved = await this.repository.update(request);

    // Notify all parties of reschedule
    await this.notificationService.notifyReschedule(saved, dto.reason);

    this.logger.log(`KYC request ${saved.id} rescheduled`);
    return saved;
  }

  /**
   * Rider marks as en route
   */
  async riderEnRoute(id: string, riderId: string): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    if (request.status !== KycStatus.SCHEDULED) {
      throw new BadRequestException('Visit must be scheduled before marking en route');
    }

    request.riderEnRoute(riderId);

    const saved = await this.repository.update(request);

    // Notify customer that rider is on the way
    await this.notificationService.notifyCustomerRiderEnRoute(saved);

    this.logger.log(`Rider en route for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Rider arrives and checks in
   */
  async riderCheckIn(id: string, riderId: string, dto: CheckInDto): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    if (request.status !== KycStatus.RIDER_EN_ROUTE) {
      throw new BadRequestException('Rider must be en route before checking in');
    }

    request.riderArrived(dto.latitude, dto.longitude, riderId);

    const saved = await this.repository.update(request);

    // OTP was generated in entity, send to customer
    await this.notificationService.sendOtpToCustomer(saved);

    this.logger.log(`Rider checked in for KYC request ${saved.id}`);
    return saved;
  }

  // =========================================================================
  // PHASE 4: VERIFICATION EXECUTION
  // =========================================================================

  /**
   * Verify customer OTP
   */
  async verifyOtp(id: string, riderId: string, dto: VerifyOtpDto): Promise<{ valid: boolean; request: KycRequest }> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    if (request.status !== KycStatus.PENDING_OTP) {
      throw new BadRequestException('Request must be awaiting OTP verification');
    }

    const valid = request.verifyOtp(dto.otp, riderId);

    const saved = await this.repository.update(request);
    
    if (valid) {
      this.logger.log(`OTP verified successfully for KYC request ${saved.id}`);
    }
    
    return { valid, request: saved };
  }

  /**
   * Regenerate OTP
   */
  async regenerateOtp(id: string, riderId: string): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    request.regenerateOtp();

    const saved = await this.repository.update(request);

    // Send new OTP
    await this.notificationService.sendOtpToCustomer(saved);

    this.logger.log(`OTP regenerated for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Add evidence (photos, documents, videos)
   */
  async addEvidence(id: string, riderId: string, dto: AddEvidenceDto): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    if (request.status !== KycStatus.OTP_VERIFIED && request.status !== KycStatus.IN_PROGRESS) {
      throw new BadRequestException('Must be in verification phase to add evidence');
    }

    const evidence: Omit<KycEvidence, 'id'> = {
      type: dto.type,
      url: dto.url,
      description: dto.description,
      metadata: dto.metadata,
      capturedAt: new Date(),
      capturedBy: riderId,
      gpsCoordinates: dto.latitude && dto.longitude ? {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy || 0,
      } : undefined,
    };

    request.addEvidence(evidence);

    const saved = await this.repository.update(request);

    this.logger.log(`Evidence added to KYC request ${saved.id}: ${dto.type}`);
    return saved;
  }

  /**
   * Add contact attempt
   */
  async addContactAttempt(id: string, riderId: string, dto: AddContactAttemptDto): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    const attempt: Omit<ContactAttempt, 'id'> = {
      method: dto.method,
      outcome: dto.outcome,
      phoneNumber: dto.phoneNumber,
      notes: dto.notes,
      attemptedAt: new Date(),
      attemptedBy: riderId,
    };

    request.addContactAttempt(attempt);

    const saved = await this.repository.update(request);

    this.logger.log(`Contact attempt logged for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Submit questionnaire responses
   */
  async submitQuestionnaire(id: string, riderId: string, dto: SubmitQuestionnaireDto): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    request.submitQuestionnaireResponses(dto.responses);

    const saved = await this.repository.update(request);

    this.logger.log(`Questionnaire submitted for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Submit verification (complete evidence collection)
   */
  async submitVerification(id: string, riderId: string): Promise<KycRequest> {
    const request = await this.findById(id);
    this.validateRiderOwnership(request, riderId);

    request.markEvidenceCollected(riderId);
    request.submitVerification(riderId);

    const saved = await this.repository.update(request);

    // Notify customer verification is complete, request rating
    await this.notificationService.requestCustomerRating(saved);

    this.logger.log(`Verification submitted for KYC request ${saved.id}`);
    return saved;
  }

  // =========================================================================
  // PHASE 5: POST-VERIFICATION
  // =========================================================================

  /**
   * Customer submits rating
   */
  async submitRating(token: string, dto: SubmitRatingDto): Promise<KycRequest> {
    const request = await this.findByToken(token);

    if (request.status !== KycStatus.PENDING_RATING) {
      throw new BadRequestException('Request is not awaiting customer rating');
    }

    const rating: CustomerRating = {
      overallRating: dto.overallRating,
      categoryRatings: dto.categoryRatings,
      comment: dto.comment,
      ratedAt: new Date(),
    };

    request.submitRating(rating, 'CUSTOMER');

    const saved = await this.repository.update(request);

    // Check if QA review needed
    if (saved.status === KycStatus.PENDING_QA) {
      await this.notificationService.notifyQaTeam(saved);
    }

    this.logger.log(`Rating submitted for KYC request ${saved.id}: ${dto.overallRating}`);
    return saved;
  }

  /**
   * Skip customer rating (timeout or declined)
   */
  async skipRating(id: string): Promise<KycRequest> {
    const request = await this.findById(id);

    if (request.status !== KycStatus.PENDING_RATING) {
      throw new BadRequestException('Request is not awaiting customer rating');
    }

    request.skipRating('Rating skipped by timeout', 'SYSTEM');

    const saved = await this.repository.update(request);

    this.logger.log(`Rating skipped for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Submit QA review
   */
  async submitQaReview(id: string, qaReviewerId: string, dto: SubmitQaReviewDto): Promise<KycRequest> {
    const request = await this.findById(id);

    if (request.status !== KycStatus.PENDING_QA) {
      throw new BadRequestException('Request is not in QA review status');
    }

    const review: QaReview = {
      reviewedBy: qaReviewerId,
      reviewedAt: new Date(),
      approved: dto.approved,
      flagReasons: dto.flagReasons,
      comments: dto.comments,
      requiresResubmission: !dto.approved,
    };

    request.submitQaReview(review, qaReviewerId);

    const saved = await this.repository.update(request);

    this.logger.log(`QA review submitted for KYC request ${saved.id}: ${dto.approved ? 'PASSED' : 'FAILED'}`);
    return saved;
  }

  /**
   * Set report URL (generated report)
   */
  async setReportUrl(id: string, reportUrl: string): Promise<KycRequest> {
    const request = await this.findById(id);

    request.setReportUrl(reportUrl);

    const saved = await this.repository.update(request);

    this.logger.log(`Report URL set for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Mark report as sent to bank
   */
  async markReportSent(id: string): Promise<KycRequest> {
    const request = await this.findById(id);

    request.markReportSent('SYSTEM');

    const saved = await this.repository.update(request);

    // Notify bank of completed report
    await this.notificationService.notifyBankReportReady(saved);

    this.logger.log(`Report marked as sent for KYC request ${saved.id}`);
    return saved;
  }

  /**
   * Mark payment as processed
   */
  async markPaymentProcessed(id: string, paymentReference: string): Promise<KycRequest> {
    const request = await this.findById(id);

    request.markPaymentProcessed('SYSTEM');

    const saved = await this.repository.update(request);

    // Notify company of payment
    await this.notificationService.notifyCompanyPayment(saved);

    this.logger.log(`Payment processed for KYC request ${saved.id}: ${paymentReference}`);
    return saved;
  }

  // =========================================================================
  // QUERY OPERATIONS
  // =========================================================================

  /**
   * Find by ID
   */
  async findById(id: string): Promise<KycRequest> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundException(`KYC request not found: ${id}`);
    }
    return request;
  }

  /**
   * Find by token
   */
  async findByToken(token: string): Promise<KycRequest> {
    const request = await this.repository.findByToken(token);
    if (!request) {
      throw new NotFoundException('Invalid or expired token');
    }
    return request;
  }

  /**
   * Query requests with filters
   */
  async query(dto: QueryKycRequestsDto): Promise<KycQueryResult> {
    // Parse status string to KycStatus array if provided
    let status: KycStatus | KycStatus[] | undefined;
    if (dto.status) {
      const statuses = dto.status.split(',').map(s => s.trim() as KycStatus);
      status = statuses.length === 1 ? statuses[0] : statuses;
    }

    const filters: KycQueryFilters = {
      bankId: dto.bankId,
      companyId: dto.companyId,
      riderId: dto.riderId,
      status,
      verificationType: dto.verificationType,
      dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
      dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
      search: dto.search,
    };

    return this.repository.query(filters);
  }

  /**
   * Get statistics
   */
  async getStatistics(bankId?: string, companyId?: string, riderId?: string): Promise<KycStatistics> {
    return this.repository.getStatistics({ bankId, companyId, riderId });
  }

  /**
   * Get requests by bank
   */
  async findByBank(bankId: string): Promise<KycRequest[]> {
    return this.repository.findByBankId(bankId);
  }

  /**
   * Get requests by company
   */
  async findByCompany(companyId: string): Promise<KycRequest[]> {
    return this.repository.findByCompanyId(companyId);
  }

  /**
   * Get requests by rider
   */
  async findByRider(riderId: string): Promise<KycRequest[]> {
    return this.repository.findByRiderId(riderId);
  }

  /**
   * Get scheduled for today
   */
  async findScheduledForToday(): Promise<KycRequest[]> {
    return this.repository.findScheduledForToday();
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private validateBankOwnership(request: KycRequest, bankId: string): void {
    if (request.bankId !== bankId) {
      throw new ForbiddenException('You do not have access to this KYC request');
    }
  }

  private validateCompanyOwnership(request: KycRequest, companyId: string): void {
    if (request.companyId !== companyId) {
      throw new ForbiddenException('This request is not assigned to your company');
    }
  }

  private validateRiderOwnership(request: KycRequest, riderId: string): void {
    if (request.riderId !== riderId) {
      throw new ForbiddenException('This request is not assigned to you');
    }
  }
}
