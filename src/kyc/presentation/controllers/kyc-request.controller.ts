/**
 * KYC Request Controller
 * REST API endpoints for KYC verification workflow
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { KycRequestService } from '../../application/services';
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
} from '../../application/dtos';

// Import authentication decorators
import { Auth, AuthWithRoles } from '@/auth/decorators/auth.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Public } from '@/auth/decorators/public.decorator';
import { UserRole } from '@/auth/interfaces/auth.interface';

/**
 * KYC Request REST API Controller
 */
@ApiTags('KYC Verification')
@Controller('kyc')
export class KycRequestController {
  private readonly logger = new Logger(KycRequestController.name);

  constructor(private readonly kycService: KycRequestService) {}

  // =========================================================================
  // PHASE 1: REQUEST INITIATION
  // =========================================================================

  /**
   * Get KYC request by token (public - for bank customer)
   */
  @Public()
  @Get('public/token/:token')
  @ApiOperation({
    summary: 'Get KYC request by token',
    description: 'Public endpoint to retrieve KYC request using SMS token',
  })
  @ApiParam({ name: 'token', description: 'Verification token from SMS' })
  @ApiOkResponse({ description: 'KYC request details (limited fields for public)' })
  @ApiNotFoundResponse({ description: 'Invalid or expired token' })
  async getByToken(@Param('token') token: string) {
    const request = await this.kycService.findByToken(token);
    // Return limited data for public access
    const publicData = {
      id: request.id,
      customer: {
        fullName: request.customer.fullName,
        phoneNumber: request.customer.phoneNumber,
      },
      location: request.location,
      verificationType: request.verificationType,
      status: request.status,
      schedule: request.schedule?.toJSON(),
      riderName: request.riderName,
      riderPhoto: request.riderPhoto,
      createdAt: request.createdAt.toISOString(),
    };
    return { success: true, data: publicData };
  }

  /**
   * Customer confirms KYC request (public endpoint with token)
   */
  @Public()
  @Post('public/confirm/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Customer confirms KYC request',
    description: 'Customer confirms their details and gives consent for verification',
  })
  @ApiParam({ name: 'token', description: 'Confirmation token from SMS' })
  @ApiOkResponse({ description: 'Confirmation successful' })
  @ApiNotFoundResponse({ description: 'Invalid or expired token' })
  async customerConfirmPublic(
    @Param('token') token: string,
    @Body() dto: CustomerConfirmationDto,
  ) {
    this.logger.log(`Processing customer confirmation for token: ${token}`);
    const request = await this.kycService.customerConfirm(token, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Customer rejects KYC request (public endpoint with token)
   */
  @Public()
  @Post('public/reject/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Customer rejects KYC request',
    description: 'Customer declines the verification request',
  })
  @ApiParam({ name: 'token', description: 'Confirmation token from SMS' })
  async customerRejectPublic(
    @Param('token') token: string,
    @Body('reason') reason?: string,
  ) {
    this.logger.log(`Processing customer rejection for token: ${token}`);
    const request = await this.kycService.customerReject(token, reason);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Get rating page data by token (public)
   */
  @Public()
  @Get('public/rate/:token')
  @ApiOperation({
    summary: 'Get rating page data',
    description: 'Public endpoint to get data for rating page',
  })
  @ApiParam({ name: 'token', description: 'Rating token from SMS' })
  async getRatingPageData(@Param('token') token: string) {
    const request = await this.kycService.findByToken(token);
    return {
      success: true,
      data: {
        request: {
          id: request.id,
          status: request.status,
          customerRating: request.customerRating,
        },
        riderName: request.riderName || 'Our Agent',
      },
    };
  }

  /**
   * Customer submits rating (public with token)
   */
  @Public()
  @Post('public/rate/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer submits rating' })
  @ApiParam({ name: 'token', description: 'Rating token from SMS' })
  async submitRatingPublic(
    @Param('token') token: string,
    @Body() dto: SubmitRatingDto,
  ) {
    const request = await this.kycService.submitRating(token, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Create a new KYC request (Bank initiates)
   */
  @AuthWithRoles(UserRole.BANK, UserRole.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create KYC request',
    description: 'Bank initiates a new KYC verification request for a customer',
  })
  @ApiCreatedResponse({ description: 'KYC request created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request data or duplicate reference' })
  async createRequest(
    @Body() dto: CreateKycRequestDto,
    @CurrentUser('id') bankId: string,
  ) {
    this.logger.log(`Creating KYC request for bank: ${bankId}`);
    const request = await this.kycService.createRequest(bankId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Customer confirms KYC request (public endpoint with token)
   */
  @Public()
  @Post('confirm/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Customer confirms KYC request',
    description: 'Customer confirms their details and gives consent for verification',
  })
  @ApiParam({ name: 'token', description: 'Confirmation token from SMS' })
  @ApiOkResponse({ description: 'Confirmation successful' })
  @ApiNotFoundResponse({ description: 'Invalid or expired token' })
  async customerConfirm(
    @Param('token') token: string,
    @Body() dto: CustomerConfirmationDto,
  ) {
    this.logger.log(`Processing customer confirmation for token: ${token}`);
    const request = await this.kycService.customerConfirm(token, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Customer rejects KYC request (public endpoint with token)
   */
  @Public()
  @Post('reject/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Customer rejects KYC request',
    description: 'Customer declines the verification request',
  })
  @ApiParam({ name: 'token', description: 'Confirmation token from SMS' })
  async customerReject(
    @Param('token') token: string,
    @Body('reason') reason?: string,
  ) {
    this.logger.log(`Processing customer rejection for token: ${token}`);
    const request = await this.kycService.customerReject(token, reason);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Submit for admin review
   */
  @AuthWithRoles(UserRole.BANK)
  @Post(':id/submit-for-review')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit KYC request for admin review' })
  @ApiParam({ name: 'id', description: 'KYC request ID' })
  async submitForReview(
    @Param('id') id: string,
    @CurrentUser('id') bankId: string,
  ) {
    const request = await this.kycService.submitForAdminReview(id, bankId);
    return { success: true, data: request.toJSON() };
  }

  // =========================================================================
  // PHASE 2: ASSIGNMENT & SCHEDULING
  // =========================================================================

  /**
   * Admin approves for assignment
   */
  @AuthWithRoles(UserRole.ADMIN)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin approves KYC request for company assignment' })
  async approveForAssignment(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    const request = await this.kycService.approveForAssignment(id, adminId);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Assign to company
   */
  @AuthWithRoles(UserRole.ADMIN)
  @Post(':id/assign-company')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign KYC request to verification company' })
  async assignToCompany(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AssignCompanyDto,
  ) {
    const request = await this.kycService.assignToCompany(id, adminId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Admin directly assigns rider (can skip company assignment step)
   */
  @AuthWithRoles(UserRole.ADMIN)
  @Post(':id/admin-assign-rider')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Admin directly assigns rider to KYC request',
    description: 'Allows admin to assign a company AND rider in one step, bypassing the separate company assignment',
  })
  async adminAssignRider(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminAssignRiderDto,
  ) {
    const request = await this.kycService.adminAssignRider(id, adminId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Company assigns rider
   */
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN)
  @Post(':id/assign-rider')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign rider to KYC request' })
  async assignRider(
    @Param('id') id: string,
    @CurrentUser('id') companyId: string,
    @Body() dto: AssignRiderDto,
  ) {
    const request = await this.kycService.assignRider(id, companyId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Upload introductory letter
   */
  @AuthWithRoles(UserRole.BANK)
  @Post(':id/upload-letter')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload introductory letter from bank' })
  async uploadLetter(
    @Param('id') id: string,
    @CurrentUser('id') bankId: string,
    @Body() dto: UploadLetterDto,
  ) {
    const request = await this.kycService.uploadIntroductoryLetter(id, bankId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Schedule visit
   */
  @AuthWithRoles(UserRole.COMPANY, UserRole.ADMIN)
  @Post(':id/schedule')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule verification visit' })
  async scheduleVisit(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: ScheduleVisitDto,
  ) {
    const request = await this.kycService.scheduleVisit(id, actorId, dto);
    return { success: true, data: request.toJSON() };
  }

  // =========================================================================
  // PHASE 3: PRE-VISIT & ARRIVAL
  // =========================================================================

  /**
   * Reschedule visit
   */
  @AuthWithRoles(UserRole.RIDER, UserRole.COMPANY, UserRole.ADMIN)
  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule verification visit' })
  async rescheduleVisit(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: RescheduleDto,
  ) {
    const request = await this.kycService.rescheduleVisit(id, actorId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Rider marks as en route
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/en-route')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rider marks as en route to customer' })
  async riderEnRoute(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
  ) {
    const request = await this.kycService.riderEnRoute(id, riderId);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Rider check-in
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rider checks in at customer location' })
  async riderCheckIn(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
    @Body() dto: CheckInDto,
  ) {
    const request = await this.kycService.riderCheckIn(id, riderId, dto);
    return { success: true, data: request.toJSON() };
  }

  // =========================================================================
  // PHASE 4: VERIFICATION
  // =========================================================================

  /**
   * Verify OTP
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify customer OTP' })
  async verifyOtp(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
    @Body() dto: VerifyOtpDto,
  ) {
    const result = await this.kycService.verifyOtp(id, riderId, dto);
    return { success: true, valid: result.valid, data: result.request.toJSON() };
  }

  /**
   * Regenerate OTP
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/regenerate-otp')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate customer OTP' })
  async regenerateOtp(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
  ) {
    const request = await this.kycService.regenerateOtp(id, riderId);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Add evidence
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/evidence')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add evidence (photo, document, etc.)' })
  async addEvidence(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
    @Body() dto: AddEvidenceDto,
  ) {
    const request = await this.kycService.addEvidence(id, riderId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Add contact attempt
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/contact-attempt')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log a contact attempt' })
  async addContactAttempt(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
    @Body() dto: AddContactAttemptDto,
  ) {
    const request = await this.kycService.addContactAttempt(id, riderId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Submit questionnaire responses
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/questionnaire')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit questionnaire responses' })
  async submitQuestionnaire(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
    @Body() dto: SubmitQuestionnaireDto,
  ) {
    const request = await this.kycService.submitQuestionnaire(id, riderId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Submit verification
   */
  @AuthWithRoles(UserRole.RIDER)
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit completed verification' })
  async submitVerification(
    @Param('id') id: string,
    @CurrentUser('id') riderId: string,
  ) {
    const request = await this.kycService.submitVerification(id, riderId);
    return { success: true, data: request.toJSON() };
  }

  // =========================================================================
  // PHASE 5: POST-VERIFICATION
  // =========================================================================

  /**
   * Customer rating (public with token)
   */
  @Public()
  @Post('rate/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer submits rating' })
  @ApiParam({ name: 'token', description: 'Rating token from SMS' })
  async submitRating(
    @Param('token') token: string,
    @Body() dto: SubmitRatingDto,
  ) {
    const request = await this.kycService.submitRating(token, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Submit QA review
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.QA_REVIEWER)
  @Post(':id/qa-review')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit QA review' })
  async submitQaReview(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: SubmitQaReviewDto,
  ) {
    const request = await this.kycService.submitQaReview(id, reviewerId, dto);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Mark report sent
   */
  @AuthWithRoles(UserRole.ADMIN)
  @Post(':id/report-sent')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark report as sent to bank' })
  async markReportSent(@Param('id') id: string) {
    const request = await this.kycService.markReportSent(id);
    return { success: true, data: request.toJSON() };
  }

  /**
   * Process payment
   */
  @AuthWithRoles(UserRole.ADMIN)
  @Post(':id/payment')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark payment as processed' })
  async processPayment(
    @Param('id') id: string,
    @Body('paymentReference') paymentReference: string,
  ) {
    const request = await this.kycService.markPaymentProcessed(id, paymentReference);
    return { success: true, data: request.toJSON() };
  }

  // =========================================================================
  // QUERY ENDPOINTS
  // =========================================================================

  /**
   * Get KYC requests for bank (Bank Staff specific)
   * Routes with specific paths MUST come before :id routes
   */
  @AuthWithRoles(UserRole.BANK)
  @Get('bank')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC requests for bank staff' })
  async getBankRequests(
    @CurrentUser('id') bankId: string,
    @Query() dto: QueryKycRequestsDto,
  ) {
    // Override bankId with current user's bank ID
    const filters = { ...dto, bankId };
    const result = await this.kycService.query(filters);
    return {
      success: true,
      data: {
        items: result.items.map(r => r.toJSON()),
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    };
  }

  /**
   * Get statistics for current bank
   */
  @AuthWithRoles(UserRole.BANK)
  @Get('bank/statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC statistics for bank' })
  async getBankStatistics(@CurrentUser('id') bankId: string) {
    const stats = await this.kycService.getStatistics(bankId);
    return { success: true, data: stats };
  }

  /**
   * Resend confirmation SMS to customer
   */
  @AuthWithRoles(UserRole.BANK)
  @Post(':id/resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend confirmation SMS to customer' })
  async resendConfirmation(
    @Param('id') id: string,
    @CurrentUser('id') bankId: string,
  ) {
    // Fetch the request to validate ownership
    const request = await this.kycService.findById(id);
    if (request.bankId !== bankId) {
      throw new Error('Unauthorized access to this request');
    }
    // Re-trigger confirmation notification
    // This calls the notification service directly
    await this.kycService.resendConfirmationSms(id, bankId);
    return { success: true, message: 'Confirmation SMS resent' };
  }

  /**
   * Get requests scheduled for today
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.COMPANY, UserRole.RIDER)
  @Get('scheduled/today')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get requests scheduled for today' })
  async getScheduledForToday() {
    const requests = await this.kycService.findScheduledForToday();
    return { success: true, data: requests.map(r => r.toJSON()) };
  }

  /**
   * Get statistics
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.BANK, UserRole.COMPANY)
  @Get('statistics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC statistics' })
  async getStatistics(
    @Query('bankId') bankId?: string,
    @Query('companyId') companyId?: string,
    @Query('riderId') riderId?: string,
  ) {
    const stats = await this.kycService.getStatistics(bankId, companyId, riderId);
    return { success: true, data: stats };
  }

  /**
   * Query KYC requests
   */
  @Auth()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query KYC requests with filters' })
  async query(@Query() dto: QueryKycRequestsDto) {
    const result = await this.kycService.query(dto);
    return {
      success: true,
      data: {
        items: result.items.map(r => r.toJSON()),
        total: result.total,
        page: result.page,
        pages: result.pages,
      },
    };
  }

  /**
   * Get KYC request by ID - MUST be last among GET routes
   */
  @Auth()
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get KYC request by ID' })
  @ApiParam({ name: 'id', description: 'KYC request ID' })
  @ApiOkResponse({ description: 'KYC request details' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  async getById(@Param('id') id: string) {
    const request = await this.kycService.findById(id);
    return { success: true, data: request.toJSON() };
  }
}
