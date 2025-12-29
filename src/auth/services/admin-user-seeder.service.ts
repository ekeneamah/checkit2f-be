import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Admin User Seeder Service
 * Creates admin users with appropriate roles and custom claims
 */
@Injectable()
export class AdminUserSeederService {
  private readonly logger = new Logger(AdminUserSeederService.name);

  /**
   * Seed admin users
   */
  async seedAdminUsers(): Promise<void> {
    this.logger.log('Starting admin user seeding...');

    const adminUsers = [
      {
        email: 'admin@checkit24.com',
        password: 'Admin@2024!',
        displayName: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
      {
        email: 'manager@checkit24.com',
        password: 'Manager@2024!',
        displayName: 'Agent Manager',
        role: 'AGENT_MANAGER',
      },
      {
        email: 'support@checkit24.com',
        password: 'Support@2024!',
        displayName: 'Admin Support',
        role: 'ADMIN',
      },
    ];

    for (const userData of adminUsers) {
      try {
        await this.createOrUpdateAdminUser(userData);
      } catch (error) {
        this.logger.error(
          `Failed to seed admin user ${userData.email}: ${error.message}`,
        );
      }
    }

    this.logger.log('Admin user seeding completed!');
  }

  /**
   * Create or update a single admin user
   */
  private async createOrUpdateAdminUser(userData: {
    email: string;
    password: string;
    displayName: string;
    role: string;
  }): Promise<void> {
    let user: admin.auth.UserRecord;

    try {
      // Check if user already exists
      user = await admin.auth().getUserByEmail(userData.email);
      this.logger.log(`User ${userData.email} already exists, updating...`);

      // Update existing user
      await admin.auth().updateUser(user.uid, {
        displayName: userData.displayName,
        password: userData.password,
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        this.logger.log(`Creating new admin user: ${userData.email}`);
        user = await admin.auth().createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true,
        });
      } else {
        throw error;
      }
    }

    // Set custom claims for role
    await admin.auth().setCustomUserClaims(user.uid, {
      role: userData.role,
    });

    this.logger.log(
      `✅ Admin user created/updated: ${userData.email} with role ${userData.role}`,
    );
  }

  /**
   * Set admin role for existing user by email
   */
  async makeUserAdmin(
    email: string,
    role: 'ADMIN' | 'SUPER_ADMIN' | 'AGENT_MANAGER' = 'ADMIN',
  ): Promise<void> {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { role });
      this.logger.log(`✅ ${email} is now an ${role}`);
    } catch (error) {
      this.logger.error(`Failed to set admin role for ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove admin role from user
   */
  async removeAdminRole(email: string): Promise<void> {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { role: null });
      this.logger.log(`✅ Admin role removed from ${email}`);
    } catch (error) {
      this.logger.error(`Failed to remove admin role from ${email}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all admin users
   */
  async listAdminUsers(): Promise<any[]> {
    const adminUsers = [];
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

      for (const userRecord of listUsersResult.users) {
        const customClaims = userRecord.customClaims || {};
        if (
          customClaims.role === 'ADMIN' ||
          customClaims.role === 'SUPER_ADMIN' ||
          customClaims.role === 'AGENT_MANAGER'
        ) {
          adminUsers.push({
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            role: customClaims.role,
            emailVerified: userRecord.emailVerified,
            disabled: userRecord.disabled,
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          });
        }
      }

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    return adminUsers;
  }
}
