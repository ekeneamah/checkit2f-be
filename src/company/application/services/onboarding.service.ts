import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { CompanyRepository } from '../../infrastructure/repositories';
import { VerificationCompanyEntity, RiderEntity } from '../../domain/entities';
import { CreateCompanyDto, CreateRiderDto } from '../dtos';
import { EmailService } from '../../../external-services/notifications/email/email.service';
import { ISendEmailRequest } from '../../../external-services/notifications/interfaces/notification.interface';
import { UserRole } from '../../../auth/interfaces/auth.interface';

/**
 * Company & Rider Onboarding Service
 * 
 * Handles the complete onboarding flow:
 * 1. Admin creates company → Firebase Auth user created → Invite email sent
 * 2. Company logs in → Changes password → Adds riders
 * 3. Company adds rider → Firebase Auth user created → Credentials sent
 * 
 * Follows DRY principle with shared methods for:
 * - Password generation
 * - Firebase user creation
 * - Email notifications
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly webAppUrl: string;

  constructor(
    private readonly repository: CompanyRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.webAppUrl = this.configService.get<string>('COMPANY_WEB_APP_URL', 'https://company.checkit24.com');
  }

  // ============================================================================
  // SHARED UTILITIES (DRY)
  // ============================================================================

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    // Generate 12-character alphanumeric password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    const randomBytes = crypto.randomBytes(12);
    for (let i = 0; i < 12; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    return password;
  }

  /**
   * Create Firebase Auth user with specified role
   * Reusable for both company and rider creation
   */
  private async createFirebaseAuthUser(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    additionalClaims?: Record<string, any>,
  ): Promise<string> {
    try {
      // Check if user already exists
      try {
        const existingUser = await admin.auth().getUserByEmail(email);
        throw new ConflictException(`User with email ${email} already exists`);
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
        // User doesn't exist, proceed with creation
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      // Set custom claims for role
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role,
        ...additionalClaims,
      });

      this.logger.log(`✅ Firebase Auth user created: ${email} with role ${role}`);
      return userRecord.uid;
    } catch (error) {
      this.logger.error(`Failed to create Firebase Auth user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send invite email with credentials
   * Reusable for both company and rider invites
   */
  private async sendInviteEmail(
    recipientEmail: string,
    recipientName: string,
    temporaryPassword: string,
    loginUrl: string,
    templateType: 'company' | 'rider',
    additionalData?: Record<string, any>,
  ): Promise<void> {
    const subject = templateType === 'company'
      ? 'Your Zigo Account - Login Credentials Inside'
      : 'Your Zigo Rider Account - Login Credentials Inside';

    const htmlContent = this.generateInviteEmailHtml(
      recipientName,
      recipientEmail,
      temporaryPassword,
      loginUrl,
      templateType,
      additionalData,
    );

    const emailRequest: ISendEmailRequest = {
      to: { email: recipientEmail, name: recipientName },
      subject,
      htmlContent,
      textContent: this.generateInviteEmailText(
        recipientName,
        recipientEmail,
        temporaryPassword,
        loginUrl,
        templateType,
      ),
    };

    await this.emailService.sendEmail(emailRequest);
    this.logger.log(`✅ Invite email sent to ${recipientEmail}`);
  }

  /**
   * Generate HTML email template
   */
  private generateInviteEmailHtml(
    name: string,
    email: string,
    password: string,
    loginUrl: string,
    type: 'company' | 'rider',
    additionalData?: Record<string, any>,
  ): string {
    const title = type === 'company' 
      ? 'Your Company Account is Ready!' 
      : 'Your Rider Account is Ready!';
    
    const intro = type === 'company'
      ? 'Congratulations! Your company has been registered with Zigo Verification Services.'
      : `You've been added as a rider for ${additionalData?.companyName || 'your company'} on Zigo.`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="background-color: #2563eb; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: normal;">Zigo Verification Services</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${name},</p>
        
        <p style="margin-bottom: 20px;">${intro}</p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin: 25px 0;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Your Login Credentials</h3>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 8px 0; font-size: 14px;"><strong>Temporary Password:</strong> <span style="background-color: #e5e7eb; padding: 3px 8px; border-radius: 3px; font-family: 'Courier New', monospace;">${password}</span></p>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td align="center">
              <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 14px;">Access Your Account</a>
            </td>
          </tr>
        </table>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <tr>
            <td style="padding: 15px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Important:</strong> You must change your password when you first log in for security reasons.</p>
            </td>
          </tr>
        </table>
        
        ${type === 'company' ? `
        <p style="font-size: 14px; margin-top: 25px; color: #374151;"><strong>Next Steps:</strong></p>
        <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; font-size: 14px;">
          <li>Log in and change your password</li>
          <li>Complete your company profile</li>
          <li>Add riders to start accepting verification requests</li>
        </ol>
        ` : `
        <p style="font-size: 14px; margin-top: 25px; color: #374151;"><strong>Next Steps:</strong></p>
        <ol style="margin: 10px 0 0 0; padding-left: 20px; color: #374151; font-size: 14px;">
          <li>Download the Zigo mobile app</li>
          <li>Log in with your credentials</li>
          <li>Complete your profile and start accepting tasks</li>
        </ol>
        `}
        
        <p style="color: #6b7280; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          If you have any questions, please contact our support team at support@zigocheck.com
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0 0 10px 0;">
          This is an automated message from Zigo Verification Services.<br>
          © ${new Date().getFullYear()} Zigo. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          You received this email because an account was created for you.<br>
          If you believe this was sent in error, please contact support immediately.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate plain text email
   */
  private generateInviteEmailText(
    name: string,
    email: string,
    password: string,
    loginUrl: string,
    type: 'company' | 'rider',
  ): string {
    return `
Hello ${name},

${type === 'company' 
  ? 'Congratulations! Your company has been registered with Zigo Verification Services.'
  : "You've been added as a rider on Zigo."}

Your Login Credentials:
- Email: ${email}
- Temporary Password: ${password}

Login URL: ${loginUrl}

IMPORTANT: For security reasons, you will be required to change your password when you first log in.

If you didn't expect this email, please contact our support team.

© ${new Date().getFullYear()} Zigo Verification Services
    `.trim();
  }

  // ============================================================================
  // COMPANY ONBOARDING (Admin creates company)
  // ============================================================================

  /**
   * Create a new company by admin
   * - Creates Firebase Auth user for company owner
   * - Creates company record in database
   * - Sends invite email with credentials
   */
  async createCompanyByAdmin(dto: CreateCompanyDto, createdByAdminId: string): Promise<{
    company: VerificationCompanyEntity;
    temporaryPassword: string;
    inviteSent: boolean;
  }> {
    this.logger.log(`Admin ${createdByAdminId} creating company: ${dto.name}`);

    // Check if user already exists in Firebase Auth
    let existingUser: admin.auth.UserRecord | null = null;
    try {
      existingUser = await admin.auth().getUserByEmail(dto.ownerEmail);
      this.logger.log(`Found existing Firebase Auth user for email: ${dto.ownerEmail}`);
      
      // Check if this user already has a company
      const existingCompany = await this.repository.getCompanyByOwnerId(existingUser.uid);
      if (existingCompany) {
        throw new ConflictException(
          `A company already exists for this email (${dto.ownerEmail}). Company: ${existingCompany.name}. ` +
          `If you need to resend credentials, use the "Resend Invite" option.`
        );
      }
      
      this.logger.log(`User exists but has no company. Will use existing auth user and create company record.`);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
      // User doesn't exist, will create new one
      this.logger.log(`No existing user found for ${dto.ownerEmail}, will create new auth user`);
    }

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    
    // Get or create Firebase Auth user
    let firebaseUid: string;
    if (existingUser) {
      // Use existing user but update password and role
      firebaseUid = existingUser.uid;
      await admin.auth().updateUser(firebaseUid, {
        password: temporaryPassword,
        displayName: dto.ownerName,
      });
      await admin.auth().setCustomUserClaims(firebaseUid, {
        role: UserRole.COMPANY,
        companyName: dto.name,
      });
      this.logger.log(`Updated existing Firebase Auth user: ${firebaseUid}`);
    } else {
      // Create new Firebase Auth user
      firebaseUid = await this.createFirebaseAuthUser(
        dto.ownerEmail,
        temporaryPassword,
        dto.ownerName,
        UserRole.COMPANY,
        { companyName: dto.name },
      );
    }

    // Create company in database with rollback on failure
    let company: VerificationCompanyEntity;
    try {
      company = await this.repository.createCompany({
        ...dto,
        ownerId: firebaseUid,
        status: 'active',
        isFirstLogin: true,
        isVerified: false,
        inviteSentAt: new Date(),
        settings: {
          autoAssignEnabled: false,
          assignmentMethod: 'manual',
          maxDistanceKm: 20,
          maxActiveAssignments: 5,
          requireBikeAssignment: true,
          allowSelfAssign: true,
          notifyOnNewRequest: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    } catch (error) {
      // Rollback: Delete the Firebase Auth user ONLY if we created a new one
      if (!existingUser) {
        this.logger.error(`Failed to save company to database, rolling back Firebase Auth user: ${error.message}`);
        try {
          await admin.auth().deleteUser(firebaseUid);
          this.logger.log(`Rolled back Firebase Auth user: ${firebaseUid}`);
        } catch (deleteError) {
          this.logger.error(`Failed to rollback Firebase Auth user: ${deleteError.message}`);
        }
      }
      throw error;
    }

    // Send invite email
    let inviteSent = false;
    try {
      await this.sendInviteEmail(
        dto.ownerEmail,
        dto.ownerName,
        temporaryPassword,
        `${this.webAppUrl}/login`,
        'company',
      );
      inviteSent = true;
      this.logger.log(`✅ Invite email sent successfully to ${dto.ownerEmail}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send invite email to ${dto.ownerEmail}: ${error.message}`);
      this.logger.error(`Email error stack: ${error.stack}`);
    }

    this.logger.log(`✅ Company created: ${company.id} - ${company.name}`);

    return {
      company,
      temporaryPassword,
      inviteSent,
    };
  }

  /**
   * Resend company invite email
   */
  async resendCompanyInvite(companyId: string): Promise<{
    temporaryPassword: string;
    inviteSent: boolean;
  }> {
    const company = await this.repository.getCompanyById(companyId);

    // Generate new temporary password
    const temporaryPassword = this.generateTemporaryPassword();

    // Update Firebase Auth password
    await admin.auth().updateUser(company.ownerId, {
      password: temporaryPassword,
    });

    // Update company record
    await this.repository.updateCompany(companyId, {
      isFirstLogin: true,
      inviteSentAt: new Date(),
    });

    // Send invite email
    let inviteSent = false;
    try {
      await this.sendInviteEmail(
        company.ownerEmail,
        company.ownerName,
        temporaryPassword,
        `${this.webAppUrl}/login`,
        'company',
      );
      inviteSent = true;
    } catch (error) {
      this.logger.warn(`Failed to send invite email: ${error.message}`);
    }

    return { temporaryPassword, inviteSent };
  }

  // ============================================================================
  // RIDER ONBOARDING (Company adds rider)
  // ============================================================================

  /**
   * Create a new rider by company
   * - Creates Firebase Auth user for rider
   * - Creates rider record in database
   * - Sends invite email/SMS with credentials
   */
  async createRiderByCompany(
    companyId: string,
    dto: CreateRiderDto,
    createdByCompanyOwnerId: string,
  ): Promise<{
    rider: RiderEntity;
    temporaryPassword: string;
    inviteSent: boolean;
  }> {
    // Get company details for the email
    const company = await this.repository.getCompanyById(companyId);

    this.logger.log(`Company ${company.name} adding rider: ${dto.firstName} ${dto.lastName}`);

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();

    // Create Firebase Auth user for rider
    const firebaseUid = await this.createFirebaseAuthUser(
      dto.email,
      temporaryPassword,
      `${dto.firstName} ${dto.lastName}`,
      UserRole.RIDER,
      { companyId, companyName: company.name },
    );

    // Create rider in database
    const rider = await this.repository.createRider(companyId, {
      ...dto,
      firebaseUid,
      status: 'pending',
      isFirstLogin: true,
      inviteSentAt: new Date(),
      isOnline: false,
      isAvailable: false,
      activeAssignments: 0,
      documents: [],
      onboardingComplete: false,
      rating: 0,
      totalCompletedTasks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Send invite email
    let inviteSent = false;
    try {
      // Get the mobile app URL for rider login
      const mobileAppUrl = this.configService.get<string>('RIDER_APP_URL', 'https://rider.checkit24.com');
      
      await this.sendInviteEmail(
        dto.email,
        `${dto.firstName} ${dto.lastName}`,
        temporaryPassword,
        mobileAppUrl,
        'rider',
        { companyName: company.name },
      );
      inviteSent = true;
    } catch (error) {
      this.logger.warn(`Failed to send rider invite email: ${error.message}`);
    }

    this.logger.log(`✅ Rider created: ${rider.id} - ${rider.firstName} ${rider.lastName}`);

    return {
      rider,
      temporaryPassword,
      inviteSent,
    };
  }

  /**
   * Resend rider invite email
   */
  async resendRiderInvite(riderId: string): Promise<{
    temporaryPassword: string;
    inviteSent: boolean;
  }> {
    const rider = await this.repository.getRiderById(riderId);
    const company = await this.repository.getCompanyById(rider.companyId);

    if (!rider.firebaseUid) {
      throw new BadRequestException('Rider does not have a Firebase account');
    }

    // Generate new temporary password
    const temporaryPassword = this.generateTemporaryPassword();

    // Update Firebase Auth password
    await admin.auth().updateUser(rider.firebaseUid, {
      password: temporaryPassword,
    });

    // Update rider record
    await this.repository.updateRider(riderId, {
      isFirstLogin: true,
      inviteSentAt: new Date(),
    });

    // Send invite email
    let inviteSent = false;
    try {
      const mobileAppUrl = this.configService.get<string>('RIDER_APP_URL', 'https://rider.checkit24.com');
      
      await this.sendInviteEmail(
        rider.email,
        `${rider.firstName} ${rider.lastName}`,
        temporaryPassword,
        mobileAppUrl,
        'rider',
        { companyName: company.name },
      );
      inviteSent = true;
    } catch (error) {
      this.logger.warn(`Failed to send rider invite email: ${error.message}`);
    }

    return { temporaryPassword, inviteSent };
  }

  // ============================================================================
  // PASSWORD CHANGE & ONBOARDING STATUS
  // ============================================================================

  /**
   * Mark password as changed after first login
   */
  async markPasswordChanged(
    userId: string,
    userType: 'company' | 'rider',
  ): Promise<void> {
    const now = new Date();

    if (userType === 'company') {
      const company = await this.repository.getCompanyByOwnerId(userId);
      await this.repository.updateCompany(company.id, {
        isFirstLogin: false,
        passwordChangedAt: now,
      });
    } else {
      // Find rider by Firebase UID
      const riders = await this.repository.getRidersByCompany('', { limit: 1000 });
      const rider = riders.find(r => r.firebaseUid === userId);
      if (rider) {
        await this.repository.updateRider(rider.id, {
          isFirstLogin: false,
          passwordChangedAt: now,
        });
      }
    }

    this.logger.log(`✅ Password changed for ${userType}: ${userId}`);
  }

  /**
   * Get onboarding status for company
   */
  async getCompanyOnboardingStatus(companyOwnerId: string): Promise<{
    isFirstLogin: boolean;
    hasRiders: boolean;
    riderCount: number;
    profileComplete: boolean;
  }> {
    const company = await this.repository.getCompanyByOwnerId(companyOwnerId);
    const riders = await this.repository.getRidersByCompany(company.id, { limit: 1 });

    return {
      isFirstLogin: company.isFirstLogin ?? true,
      hasRiders: riders.length > 0,
      riderCount: company.stats?.totalRiders || 0,
      profileComplete: this.isCompanyProfileComplete(company),
    };
  }

  /**
   * Check if company profile is complete
   */
  private isCompanyProfileComplete(company: VerificationCompanyEntity): boolean {
    return !!(
      company.name &&
      company.email &&
      company.phone &&
      company.address &&
      company.city &&
      company.state &&
      company.serviceAreas?.length > 0
    );
  }

  /**
   * Record login for tracking
   */
  async recordLogin(userId: string, userType: 'company' | 'rider'): Promise<void> {
    const now = new Date();

    if (userType === 'company') {
      const company = await this.repository.getCompanyByOwnerId(userId);
      await this.repository.updateCompany(company.id, {
        lastLoginAt: now,
      });
    } else {
      const riders = await this.repository.getRidersByCompany('', { limit: 1000 });
      const rider = riders.find(r => r.firebaseUid === userId);
      if (rider) {
        await this.repository.updateRider(rider.id, {
          lastLoginAt: now,
          lastActiveAt: now,
        });
      }
    }
  }
}
