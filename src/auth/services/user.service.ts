import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  ChangePasswordDto,
  UpdateProfileDto 
} from '../dto/auth.dto';
import { IUser, UserRole, Permission, ROLE_PERMISSIONS } from '../interfaces/auth.interface';
import * as bcrypt from 'bcrypt';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';

/**
 * User Management Service
 * Handles user CRUD operations, password management, and profile updates
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly usersCollection = 'users';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
  ) {
    console.log('👤 User Management Service initialized');
  }

  /**
   * Create a new user with Firebase Auth (Best Practice: Firestore ID = Auth UID)
   * This is the recommended method for creating users
   */
  async createUserWithAuth(createUserDto: CreateUserDto, firebaseUid?: string): Promise<IUser> {
    try {
      this.logger.log(`Creating user with auth: ${createUserDto.email}`);

      // Check if user already exists
      const existingUser = await this.findUserByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User already exists with this email');
      }

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (createUserDto.password) {
        hashedPassword = await this.hashPassword(createUserDto.password);
      }

      const userData: IUser = {
        id: firebaseUid || '', // Will be set to Firebase Auth UID
        email: createUserDto.email,
        displayName: createUserDto.displayName,
        phoneNumber: createUserDto.phoneNumber || null,
        photoURL: createUserDto.photoURL || null,
        emailVerified: false,
        phoneVerified: false,
        role: createUserDto.role || UserRole.CLIENT,
        permissions: ROLE_PERMISSIONS[createUserDto.role || UserRole.CLIENT],
        provider: 'email',
        isActive: true,
        passwordHash: hashedPassword,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // If firebaseUid provided, use set() instead of add() to match Auth UID
      if (firebaseUid) {
        await this.firebaseService.set(this.usersCollection, firebaseUid, userData);
        userData.id = firebaseUid;
        this.logger.log(`User created with Firebase Auth UID: ${firebaseUid}`);
      } else {
        // Fallback to auto-generated ID (not recommended for auth users)
        const docRef = await this.firebaseService.create(this.usersCollection, userData);
        userData.id = docRef.id;
        this.logger.log(`User created with auto-generated ID: ${userData.id}`);
      }

      console.log(`✅ User created: ${userData.email} (ID: ${userData.id})`);

      // Remove password hash from returned object
      const { passwordHash, ...userWithoutPassword } = userData;
      return userWithoutPassword as IUser;

    } catch (error) {
      this.logger.error(`Failed to create user with auth: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create or update user from Firebase Auth (for OAuth/federated login)
   * Best Practice: Firestore doc ID matches Firebase Auth UID
   */
  async createOrUpdateFromFirebaseAuth(
    firebaseUid: string,
    email: string,
    userData: Partial<IUser>
  ): Promise<IUser> {
    try {
      this.logger.log(`Creating or updating user from Firebase Auth: ${email}`);

      // Check if user already exists
      const existingUser = await this.findUserById(firebaseUid);

      if (existingUser) {
        // Update existing user
        this.logger.log(`Updating existing user: ${firebaseUid}`);
        await this.update(this.usersCollection, firebaseUid, {
          ...userData,
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        });
        return this.findUserById(firebaseUid)!;
      }

      // Create new user with Firebase Auth UID as document ID
      const newUser: IUser = {
        id: firebaseUid,
        email,
        displayName: userData.displayName || email.split('@')[0],
        phoneNumber: userData.phoneNumber || null,
        photoURL: userData.photoURL || null,
        emailVerified: userData.emailVerified || false,
        phoneVerified: userData.phoneVerified || false,
        role: userData.role || UserRole.CLIENT,
        permissions: ROLE_PERMISSIONS[userData.role || UserRole.CLIENT],
        provider: userData.provider || 'firebase',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.firebaseService.set(this.usersCollection, firebaseUid, newUser);
      this.logger.log(`New user created from Firebase Auth: ${firebaseUid}`);
      console.log(`✅ User created from Firebase Auth: ${email} (UID: ${firebaseUid})`);

      return newUser;

    } catch (error) {
      this.logger.error(`Failed to create/update user from Firebase Auth: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new user (LEGACY - Use createUserWithAuth instead)
   * @deprecated Use createUserWithAuth for better Firebase Auth integration
   */
  async createUser(createUserDto: CreateUserDto): Promise<IUser> {
    try {
      this.logger.log(`Creating user: ${createUserDto.email}`);

      // Check if user already exists
      const existingUser = await this.findUserByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(createUserDto.password);

      const userData: IUser = {
        id: '', // Will be set by Firestore
        email: createUserDto.email,
        displayName: createUserDto.displayName,
        phoneNumber: createUserDto.phoneNumber || null,
        photoURL: createUserDto.photoURL || null,
        emailVerified: false,
        phoneVerified: false,
        role: createUserDto.role || UserRole.CLIENT,
        permissions: ROLE_PERMISSIONS[createUserDto.role || UserRole.CLIENT],
        provider: 'email',
        isActive: true,
        passwordHash: hashedPassword,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await this.firebaseService.create(this.usersCollection, userData);
      userData.id = docRef.id;

      this.logger.log(`User created successfully: ${userData.email} with ID: ${userData.id}`);
      console.log(`✅ User created: ${userData.email}`);

      // Remove password hash from returned object
      const { passwordHash, ...userWithoutPassword } = userData;
      return userWithoutPassword as IUser;

    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<IUser | null> {
    try {
      const userData = await this.firebaseService.findById(this.usersCollection, id);
      if (!userData) {
        return null;
      }

      // Remove password hash from returned object
      const { passwordHash, ...userWithoutPassword } = userData;
      return userWithoutPassword as IUser;

    } catch (error) {
      this.logger.error(`Failed to find user by ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<IUser | null> {
    try {
      const users = await this.firebaseService.findByField(
        this.usersCollection,
        'email',
        email
      );

      if (users.length === 0) {
        return null;
      }

      const userData = users[0];
      // Remove password hash from returned object
      const { passwordHash, ...userWithoutPassword } = userData;
      return userWithoutPassword as IUser;

    } catch (error) {
      this.logger.error(`Failed to find user by email: ${error.message}`);
      return null;
    }
  }

  /**
   * Find user with password (for authentication)
   */
  async findUserWithPassword(email: string): Promise<(IUser & { passwordHash?: string }) | null> {
    try {
      const users = await this.firebaseService.findByField(
        this.usersCollection,
        'email',
        email
      );

      if (users.length === 0) {
        return null;
      }

      return users[0] as (IUser & { passwordHash?: string });

    } catch (error) {
      this.logger.error(`Failed to find user with password: ${error.message}`);
      return null;
    }
  }

  /**
   * Update user
   */
  async update(collection: string, id: string, data: any): Promise<void> {
    await this.firebaseService.update(collection, id, data);
  }

  /**
   * Update user (public method)
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    try {
      this.logger.log(`Updating user: ${id}`);

      const existingUser = await this.findUserById(id);
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      const updateData: Partial<IUser> = {
        ...updateUserDto,
        updatedAt: new Date(),
      };

      // Update permissions if role changed
      if (updateUserDto.role && updateUserDto.role !== existingUser.role) {
        updateData.permissions = ROLE_PERMISSIONS[updateUserDto.role];
      }

      await this.firebaseService.update(this.usersCollection, id, updateData);

      const updatedUser = await this.findUserById(id);
      this.logger.log(`User updated successfully: ${id}`);
      console.log(`📝 User updated: ${updatedUser?.email}`);

      return updatedUser!;

    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, updateProfileDto: UpdateProfileDto): Promise<IUser> {
    try {
      this.logger.log(`Updating profile for user: ${id}`);

      const updateData: Partial<IUser> = {
        displayName: updateProfileDto.displayName,
        phoneNumber: updateProfileDto.phoneNumber,
        photoURL: updateProfileDto.photoURL,
        updatedAt: new Date(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await this.firebaseService.update(this.usersCollection, id, updateData);

      const updatedUser = await this.findUserById(id);
      this.logger.log(`Profile updated successfully for user: ${id}`);

      return updatedUser!;

    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    try {
      this.logger.log(`Changing password for user: ${id}`);

      const user = await this.findUserWithPassword(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify current password
      if (user.passwordHash) {
        const isCurrentPasswordValid = await bcrypt.compare(
          changePasswordDto.currentPassword,
          user.passwordHash
        );

        if (!isCurrentPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(changePasswordDto.newPassword);

      await this.firebaseService.update(this.usersCollection, id, {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      });

      this.logger.log(`Password changed successfully for user: ${id}`);
      console.log(`🔐 Password changed for user: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to change password: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string): Promise<void> {
    try {
      this.logger.log(`Deactivating user: ${id}`);

      await this.firebaseService.update(this.usersCollection, id, {
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`User deactivated successfully: ${id}`);
      console.log(`❌ User deactivated: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to deactivate user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activate user
   */
  async activateUser(id: string): Promise<void> {
    try {
      this.logger.log(`Activating user: ${id}`);

      await this.firebaseService.update(this.usersCollection, id, {
        isActive: true,
        updatedAt: new Date(),
      });

      this.logger.log(`User activated successfully: ${id}`);
      console.log(`✅ User activated: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to activate user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting user: ${id}`);

      const user = await this.findUserById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.firebaseService.delete(this.usersCollection, id);

      this.logger.log(`User deleted successfully: ${id}`);
      console.log(`🗑️ User deleted: ${user.email}`);

    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<IUser[]> {
    try {
      const users = await this.firebaseService.findByField(
        this.usersCollection,
        'role',
        role
      );

      return users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword as IUser;
      });

    } catch (error) {
      this.logger.error(`Failed to get users by role: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<{ users: IUser[]; total: number }> {
    try {
      const { data: users, total } = await this.firebaseService.findAll(
        this.usersCollection,
        limit,
        offset
      );

      const usersWithoutPassword = users.map(user => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword as IUser;
      });

      return { users: usersWithoutPassword, total };

    } catch (error) {
      this.logger.error(`Failed to get all users: ${error.message}`);
      return { users: [], total: 0 };
    }
  }

  /**
   * Update user login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.firebaseService.update(this.usersCollection, id, {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(`Last login updated for user: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to update last login: ${error.message}`);
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<IUser | null> {
    try {
      const user = await this.findUserWithPassword(email);
      if (!user || !user.passwordHash) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      // Remove password hash from returned object
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword as IUser;

    } catch (error) {
      this.logger.error(`Failed to verify password: ${error.message}`);
      return null;
    }
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Search users by email or display name
   */
  async searchUsers(query: string, limit: number = 20): Promise<IUser[]> {
    try {
      // Simple search implementation
      // In production, you might want to use Algolia or similar for better search
      const allUsers = await this.firebaseService.findAll(this.usersCollection, 1000);
      
      const filteredUsers = allUsers.data.filter(user => 
        user.email?.toLowerCase().includes(query.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);

      return filteredUsers.map(user => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword as IUser;
      });

    } catch (error) {
      this.logger.error(`Failed to search users: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<UserRole, number>;
  }> {
    try {
      const { total } = await this.firebaseService.findAll(this.usersCollection, 1);
      
      const activeUsers = await this.firebaseService.findByField(
        this.usersCollection,
        'isActive',
        true
      );

      const inactiveUsers = await this.firebaseService.findByField(
        this.usersCollection,
        'isActive',
        false
      );

      const byRole: Record<UserRole, number> = {} as Record<UserRole, number>;
      
      for (const role of Object.values(UserRole)) {
        const roleUsers = await this.firebaseService.findByField(
          this.usersCollection,
          'role',
          role
        );
        byRole[role] = roleUsers.length;
      }

      return {
        total,
        active: activeUsers.length,
        inactive: inactiveUsers.length,
        byRole,
      };

    } catch (error) {
      this.logger.error(`Failed to get user stats: ${error.message}`);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: {} as Record<UserRole, number>,
      };
    }
  }
}