import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';
import { EmailService } from '@/external-services/notifications/email/email.service';
import { 
  CreatePartnerOnboardingDto, 
  UpdateOnboardingStatusDto,
  PartnerOnboardingQueryDto 
} from '../dtos/partner-onboarding.dto';
import { 
  PartnerOnboardingRequest, 
  OnboardingStatus 
} from '@/company/domain/entities/partner-onboarding-request.entity';
import { VerificationCompany } from '@/company/domain/entities/verification-company.entity';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Partner Onboarding Service
 * Handles the lifecycle of partner company onboarding requests
 * Follows SOLID principles and DRY patterns
 */
@Injectable()
export class PartnerOnboardingService {
  private readonly logger = new Logger(PartnerOnboardingService.name);
  private readonly COLLECTION = 'partner_onboarding_requests';
  private readonly COMPANIES_COLLECTION = 'verification_companies';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Submit a new partner onboarding request
   * Implements validation, sanitization, and email notifications
   */
  async submitOnboardingRequest(
    dto: CreatePartnerOnboardingDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PartnerOnboardingRequest> {
    try {
      this.logger.log(`Processing onboarding request for: ${dto.companyName}`);

      // Check for duplicate requests
      await this.checkDuplicateRequest(dto.companyEmail);

      // Create the onboarding request
      const requestId = this.firebaseService.generateId();
      const now = new Date();

      const onboardingRequest: PartnerOnboardingRequest = {
        id: requestId,
        companyName: this.sanitizeString(dto.companyName),
        companyEmail: dto.companyEmail.toLowerCase().trim(),
        companyPhone: this.normalizePhoneNumber(dto.companyPhone),
        alternatePhone: dto.alternatePhone ? this.normalizePhoneNumber(dto.alternatePhone) : undefined,
        registrationNumber: dto.registrationNumber ? this.sanitizeString(dto.registrationNumber) : undefined,
        taxId: dto.taxId ? this.sanitizeString(dto.taxId) : undefined,
        businessType: dto.businessType,
        address: this.sanitizeString(dto.address),
        city: this.sanitizeString(dto.city),
        state: this.sanitizeString(dto.state),
        country: this.sanitizeString(dto.country),
        serviceAreas: dto.serviceAreas.map(area => ({
          state: this.sanitizeString(area.state),
          lga: area.lga.map(lga => this.sanitizeString(lga)),
          areas: area.areas?.map(a => this.sanitizeString(a)),
        })),
        ownerName: this.sanitizeString(dto.ownerName),
        ownerEmail: dto.ownerEmail.toLowerCase().trim(),
        ownerPhone: this.normalizePhoneNumber(dto.ownerPhone),
        numberOfRiders: dto.numberOfRiders,
        numberOfBikes: dto.numberOfBikes,
        yearsInBusiness: dto.yearsInBusiness,
        description: dto.description ? this.sanitizeString(dto.description) : undefined,
        websiteUrl: dto.websiteUrl,
        status: 'pending',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
        ipAddress,
        userAgent,
      };

      // Save to Firebase
      await this.firebaseService
        .getFirestore()
        .collection(this.COLLECTION)
        .doc(requestId)
        .set(this.toFirestoreData(onboardingRequest));

      this.logger.log(`Onboarding request created: ${requestId}`);

      // Send email notifications (async, don't wait)
      this.sendOnboardingNotifications(onboardingRequest).catch(err => {
        this.logger.error(`Failed to send onboarding emails: ${err.message}`, err.stack);
      });

      return onboardingRequest;
    } catch (error) {
      this.logger.error(`Failed to submit onboarding request: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all onboarding requests with pagination and filtering
   */
  async getOnboardingRequests(query: PartnerOnboardingQueryDto): Promise<{
    requests: PartnerOnboardingRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { status, page = 1, limit = 10, search } = query;
      
      let firestoreQuery = this.firebaseService
        .getFirestore()
        .collection(this.COLLECTION)
        .orderBy('createdAt', 'desc');

      // Filter by status
      if (status) {
        firestoreQuery = firestoreQuery.where('status', '==', status);
      }

      // Execute query
      const snapshot = await firestoreQuery.get();
      let requests = snapshot.docs.map(doc => this.fromFirestoreData(doc));

      // Client-side search (Firestore doesn't support full-text search)
      if (search) {
        const searchLower = search.toLowerCase();
        requests = requests.filter(req =>
          req.companyName.toLowerCase().includes(searchLower) ||
          req.companyEmail.toLowerCase().includes(searchLower) ||
          req.ownerName.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      const total = requests.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedRequests = requests.slice(startIndex, startIndex + limit);

      return {
        requests: paginatedRequests,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get onboarding requests: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a single onboarding request by ID
   */
  async getOnboardingRequestById(id: string): Promise<PartnerOnboardingRequest> {
    try {
      const doc = await this.firebaseService
        .getFirestore()
        .collection(this.COLLECTION)
        .doc(id)
        .get();

      if (!doc.exists) {
        throw new NotFoundException(`Onboarding request not found: ${id}`);
      }

      return this.fromFirestoreData(doc);
    } catch (error) {
      this.logger.error(`Failed to get onboarding request: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update onboarding request status
   */
  async updateOnboardingStatus(
    id: string,
    dto: UpdateOnboardingStatusDto,
    adminId: string,
  ): Promise<PartnerOnboardingRequest> {
    try {
      const request = await this.getOnboardingRequestById(id);

      // Validate status transition
      this.validateStatusTransition(request.status, dto.status);

      // Validate rejection requires reason
      if (dto.status === 'rejected' && !dto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required when rejecting a request');
      }

      const now = new Date();
      const updates: Partial<PartnerOnboardingRequest> = {
        status: dto.status,
        adminNotes: dto.adminNotes,
        reviewedBy: adminId,
        reviewedAt: now,
        updatedAt: now,
      };

      if (dto.status === 'approved') {
        updates.approvedAt = now;
      } else if (dto.status === 'rejected') {
        updates.rejectedAt = now;
        updates.rejectionReason = dto.rejectionReason;
      }

      await this.firebaseService
        .getFirestore()
        .collection(this.COLLECTION)
        .doc(id)
        .update(updates);

      const updatedRequest = { ...request, ...updates };

      // Send status update email
      this.sendStatusUpdateEmail(updatedRequest).catch(err => {
        this.logger.error(`Failed to send status update email: ${err.message}`, err.stack);
      });

      this.logger.log(`Onboarding request ${id} updated to status: ${dto.status}`);
      return updatedRequest as PartnerOnboardingRequest;
    } catch (error) {
      this.logger.error(`Failed to update onboarding status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create company from approved onboarding request
   * Implements the full company creation workflow with security
   */
  async createCompanyFromRequest(
    requestId: string,
    adminId: string,
  ): Promise<{ company: VerificationCompany; request: PartnerOnboardingRequest }> {
    try {
      const request = await this.getOnboardingRequestById(requestId);

      // Validate request is approved
      if (request.status !== 'approved') {
        throw new BadRequestException('Only approved requests can be converted to companies');
      }

      // Check if company already created
      if (request.companyId) {
        throw new ConflictException('Company has already been created from this request');
      }

      // Check if email already exists in companies
      const existingCompany = await this.findCompanyByEmail(request.companyEmail);
      if (existingCompany) {
        throw new ConflictException('A company with this email already exists');
      }

      // Generate temporary password
      const tempPassword = this.generateSecurePassword();

      // Create Firebase Auth user for company owner
      const firebaseUser = await admin.auth().createUser({
        email: request.ownerEmail,
        password: tempPassword,
        displayName: request.ownerName,
        emailVerified: false,
      });

      // Create company document
      const companyId = this.firebaseService.generateId();
      const now = new Date();

      const company: VerificationCompany = {
        id: companyId,
        name: request.companyName,
        email: request.companyEmail,
        phone: request.companyPhone,
        alternatePhone: request.alternatePhone,
        ownerId: firebaseUser.uid,
        ownerName: request.ownerName,
        ownerEmail: request.ownerEmail,
        registrationNumber: request.registrationNumber,
        taxId: request.taxId,
        businessType: request.businessType,
        address: request.address,
        city: request.city,
        state: request.state,
        country: request.country,
        serviceAreas: request.serviceAreas.map(area => ({
          state: area.state,
          lga: area.lga[0], // Use first LGA (can be enhanced)
          localities: area.areas,
          country: request.country,
        })),
        settings: {
          autoAssignEnabled: false,
          assignmentMethod: 'manual',
          maxDistanceKm: 50,
          maxActiveAssignments: 10,
          requireBikeAssignment: true,
          allowSelfAssign: false,
          notifyOnNewRequest: true,
        },
        status: 'active',
        isVerified: false,
        isFirstLogin: true,
        specializations: [],
        createdAt: now,
        updatedAt: now,
      };

      // Save company to Firestore
      await this.firebaseService
        .getFirestore()
        .collection(this.COMPANIES_COLLECTION)
        .doc(companyId)
        .set(company);

      // Update onboarding request
      await this.firebaseService
        .getFirestore()
        .collection(this.COLLECTION)
        .doc(requestId)
        .update({
          status: 'company_created',
          companyId,
          companyCreatedAt: now,
          updatedAt: now,
        });

      const updatedRequest = {
        ...request,
        status: 'company_created' as OnboardingStatus,
        companyId,
        companyCreatedAt: now,
        updatedAt: now,
      };

      // Send welcome email with credentials
      this.sendCompanyWelcomeEmail(company, tempPassword).catch(err => {
        this.logger.error(`Failed to send welcome email: ${err.message}`, err.stack);
      });

      this.logger.log(`Company created from request ${requestId}: ${companyId}`);
      return { company, request: updatedRequest };
    } catch (error) {
      this.logger.error(`Failed to create company from request: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Check for duplicate onboarding requests
   */
  private async checkDuplicateRequest(email: string): Promise<void> {
    const snapshot = await this.firebaseService
      .getFirestore()
      .collection(this.COLLECTION)
      .where('companyEmail', '==', email.toLowerCase().trim())
      .where('status', 'in', ['pending', 'under_review', 'approved'])
      .get();

    if (!snapshot.empty) {
      throw new ConflictException(
        'An active onboarding request already exists for this email'
      );
    }
  }

  /**
   * Find company by email
   */
  private async findCompanyByEmail(email: string): Promise<VerificationCompany | null> {
    const snapshot = await this.firebaseService
      .getFirestore()
      .collection(this.COMPANIES_COLLECTION)
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as VerificationCompany;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: OnboardingStatus,
    newStatus: OnboardingStatus,
  ): void {
    const validTransitions: Record<OnboardingStatus, OnboardingStatus[]> = {
      pending: ['under_review', 'rejected'],
      under_review: ['approved', 'rejected', 'pending'],
      approved: ['company_created', 'rejected'],
      rejected: ['under_review'],
      company_created: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Generate secure random password
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each: lowercase, uppercase, number, special char
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Sanitize string inputs (prevent XSS)
   */
  private sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '');
  }

  /**
   * Normalize phone numbers to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Convert to +234 format
    if (digits.startsWith('234')) {
      return `+${digits}`;
    } else if (digits.startsWith('0')) {
      return `+234${digits.substring(1)}`;
    }
    return `+234${digits}`;
  }

  /**
   * Convert to Firestore data (handle dates)
   */
  private toFirestoreData(request: PartnerOnboardingRequest): any {
    return {
      ...request,
      submittedAt: admin.firestore.Timestamp.fromDate(request.submittedAt),
      reviewedAt: request.reviewedAt ? admin.firestore.Timestamp.fromDate(request.reviewedAt) : null,
      approvedAt: request.approvedAt ? admin.firestore.Timestamp.fromDate(request.approvedAt) : null,
      rejectedAt: request.rejectedAt ? admin.firestore.Timestamp.fromDate(request.rejectedAt) : null,
      companyCreatedAt: request.companyCreatedAt ? admin.firestore.Timestamp.fromDate(request.companyCreatedAt) : null,
      createdAt: admin.firestore.Timestamp.fromDate(request.createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(request.updatedAt),
    };
  }

  /**
   * Convert from Firestore data (handle dates)
   */
  private fromFirestoreData(doc: FirebaseFirestore.DocumentSnapshot): PartnerOnboardingRequest {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      submittedAt: data.submittedAt?.toDate(),
      reviewedAt: data.reviewedAt?.toDate(),
      approvedAt: data.approvedAt?.toDate(),
      rejectedAt: data.rejectedAt?.toDate(),
      companyCreatedAt: data.companyCreatedAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as PartnerOnboardingRequest;
  }

  // ============ EMAIL NOTIFICATION METHODS ============

  /**
   * Send email notifications when onboarding request is submitted
   */
  private async sendOnboardingNotifications(request: PartnerOnboardingRequest): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@checkit24.com';
    const appUrl = this.configService.get<string>('APP_URL') || 'https://checkit24.com';

    // Email to Admin
    await this.emailService.sendEmail({
      to: adminEmail,
      subject: `New Partner Onboarding Request - ${request.companyName}`,
      html: this.getAdminNotificationEmailHtml(request, appUrl),
    });

    // Email to Company
    await this.emailService.sendEmail({
      to: request.companyEmail,
      subject: 'Your Partner Application Has Been Received - CheckIt24',
      html: this.getCompanyConfirmationEmailHtml(request),
    });

    this.logger.log(`Onboarding emails sent for request: ${request.id}`);
  }

  /**
   * Send email when status is updated
   */
  private async sendStatusUpdateEmail(request: PartnerOnboardingRequest): Promise<void> {
    let subject: string;
    let html: string;

    switch (request.status) {
      case 'under_review':
        subject = 'Your Partner Application is Under Review - CheckIt24';
        html = this.getUnderReviewEmailHtml(request);
        break;
      case 'approved':
        subject = 'Congratulations! Your Partner Application Has Been Approved - CheckIt24';
        html = this.getApprovedEmailHtml(request);
        break;
      case 'rejected':
        subject = 'Update on Your Partner Application - CheckIt24';
        html = this.getRejectedEmailHtml(request);
        break;
      default:
        return;
    }

    await this.emailService.sendEmail({
      to: request.companyEmail,
      subject,
      html,
    });
  }

  /**
   * Send welcome email with credentials when company is created
   */
  private async sendCompanyWelcomeEmail(
    company: VerificationCompany,
    tempPassword: string,
  ): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'https://checkit24.com';

    await this.emailService.sendEmail({
      to: company.ownerEmail,
      subject: 'Welcome to CheckIt24 - Your Company Account is Ready!',
      html: this.getWelcomeEmailHtml(company, tempPassword, appUrl),
    });
  }

  // ============ EMAIL TEMPLATES ============

  private getAdminNotificationEmailHtml(request: PartnerOnboardingRequest, appUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .info-row { margin: 10px 0; padding: 10px; background: white; }
          .label { font-weight: bold; color: #555; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 New Partner Onboarding Request</h1>
          </div>
          <div class="content">
            <p>A new company has submitted a partner onboarding request:</p>
            
            <div class="info-row">
              <span class="label">Company Name:</span> ${request.companyName}
            </div>
            <div class="info-row">
              <span class="label">Email:</span> ${request.companyEmail}
            </div>
            <div class="info-row">
              <span class="label">Phone:</span> ${request.companyPhone}
            </div>
            <div class="info-row">
              <span class="label">Business Type:</span> ${request.businessType.replace('_', ' ')}
            </div>
            <div class="info-row">
              <span class="label">Owner:</span> ${request.ownerName}
            </div>
            <div class="info-row">
              <span class="label">Location:</span> ${request.city}, ${request.state}
            </div>
            <div class="info-row">
              <span class="label">Service Areas:</span> ${request.serviceAreas.length} area(s)
            </div>
            <div class="info-row">
              <span class="label">Submitted:</span> ${request.submittedAt.toLocaleString()}
            </div>
            
            <a href="${appUrl}/admin/partner-onboarding/${request.id}" class="button">
              Review Application →
            </a>
          </div>
          <div class="footer">
            <p>CheckIt24 Admin Portal</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getCompanyConfirmationEmailHtml(request: PartnerOnboardingRequest): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Application Received!</h1>
          </div>
          <div class="content">
            <p>Dear ${request.ownerName},</p>
            
            <p>Thank you for submitting your partner application to CheckIt24!</p>
            
            <p>We have received your application for <strong>${request.companyName}</strong> and our team will review it shortly.</p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Our team will review your application within 1-2 business days</li>
              <li>You'll receive an email update on the status of your application</li>
              <li>If approved, we'll create your company account and send you login credentials</li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The CheckIt24 Team</p>
          </div>
          <div class="footer">
            <p>© 2026 CheckIt24. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getUnderReviewEmailHtml(request: PartnerOnboardingRequest): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2196F3;">Application Under Review</h2>
          <p>Dear ${request.ownerName},</p>
          <p>Your partner application for <strong>${request.companyName}</strong> is currently under review by our team.</p>
          <p>We'll notify you once the review is complete.</p>
          <p>Best regards,<br>The CheckIt24 Team</p>
        </div>
      </body>
      </html>
    `;
  }

  private getApprovedEmailHtml(request: PartnerOnboardingRequest): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">🎉 Application Approved!</h2>
          <p>Dear ${request.ownerName},</p>
          <p>Great news! Your partner application for <strong>${request.companyName}</strong> has been approved!</p>
          <p>You will receive another email shortly with your account credentials and instructions on how to get started.</p>
          <p>Welcome to the CheckIt24 partner network!</p>
          <p>Best regards,<br>The CheckIt24 Team</p>
        </div>
      </body>
      </html>
    `;
  }

  private getRejectedEmailHtml(request: PartnerOnboardingRequest): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f44336;">Application Update</h2>
          <p>Dear ${request.ownerName},</p>
          <p>Thank you for your interest in partnering with CheckIt24.</p>
          <p>After careful review, we regret to inform you that we cannot approve your application for <strong>${request.companyName}</strong> at this time.</p>
          ${request.rejectionReason ? `<p><strong>Reason:</strong> ${request.rejectionReason}</p>` : ''}
          <p>You are welcome to reapply in the future if circumstances change.</p>
          <p>Best regards,<br>The CheckIt24 Team</p>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailHtml(
    company: VerificationCompany,
    tempPassword: string,
    appUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .credentials { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { color: #d32f2f; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to CheckIt24!</h1>
          </div>
          <div class="content">
            <p>Dear ${company.ownerName},</p>
            
            <p>Congratulations! Your company account has been created successfully.</p>
            
            <p><strong>Company:</strong> ${company.name}</p>
            
            <div class="credentials">
              <h3>Your Login Credentials</h3>
              <p><strong>Email:</strong> ${company.ownerEmail}</p>
              <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
              <p class="warning">⚠️ Please change your password after first login!</p>
            </div>
            
            <a href="${appUrl}/auth/login" class="button">
              Login to Your Account →
            </a>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Login using the credentials above</li>
              <li>Change your password immediately</li>
              <li>Complete your company profile</li>
              <li>Add your riders and bikes</li>
              <li>Start accepting verification requests</li>
            </ol>
            
            <p>If you have any questions or need assistance, our support team is here to help!</p>
            
            <p>Best regards,<br>The CheckIt24 Team</p>
          </div>
          <div class="footer">
            <p>© 2026 CheckIt24. All rights reserved.</p>
            <p>This email contains sensitive information. Please do not forward it.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
