import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  CreateApiKeyDto, 
  UpdateApiKeyDto, 
  ApiKeyResponseDto 
} from '../dto/auth.dto';
import { IApiKey, Permission } from '../interfaces/auth.interface';
import { JwtAuthService } from './jwt-auth.service';
import * as crypto from 'crypto';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';

/**
 * API Key Management Service
 * Handles API key generation, validation, and lifecycle management
 */
@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly apiKeysCollection = 'api_keys';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: ConfigService,
  ) {
    console.log('🔑 API Key Service initialized');
  }

  /**
   * Create a new API key
   */
  async createApiKey(createApiKeyDto: CreateApiKeyDto, createdBy: string): Promise<ApiKeyResponseDto> {
    try {
      this.logger.log(`Creating API key: ${createApiKeyDto.name}`);

      // Generate unique API key
      const keyValue = this.generateApiKey();
      const keyHash = this.hashApiKey(keyValue);

      const apiKeyData: IApiKey = {
        id: '', // Will be set by Firestore
        name: createApiKeyDto.name,
        description: createApiKeyDto.description,
        key: keyValue, // Store the plain key temporarily
        keyHash,
        permissions: (createApiKeyDto.permissions as Permission[]) || [],
        isActive: true,
        expiresAt: createApiKeyDto.expiresAt ? new Date(createApiKeyDto.expiresAt) : null,
        lastUsedAt: null,
        usageCount: 0,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await this.firebaseService.create(this.apiKeysCollection, apiKeyData);
      apiKeyData.id = docRef.id;

      this.logger.log(`API key created successfully: ${apiKeyData.name} with ID: ${apiKeyData.id}`);
      console.log(`🔑 API key created: ${apiKeyData.name}`);

      // Generate JWT token for the API key
      const token = await this.jwtAuthService.generateApiKeyToken({
        id: apiKeyData.id,
        permissions: apiKeyData.permissions,
      });

      return {
        id: apiKeyData.id,
        name: apiKeyData.name,
        description: apiKeyData.description,
        key: keyValue, // Return plain key only once
        token,
        permissions: apiKeyData.permissions,
        isActive: apiKeyData.isActive,
        expiresAt: apiKeyData.expiresAt,
        lastUsedAt: apiKeyData.lastUsedAt,
        usageCount: apiKeyData.usageCount,
        createdAt: apiKeyData.createdAt,
      };

    } catch (error) {
      this.logger.error(`Failed to create API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get API key by ID
   */
  async getApiKey(id: string): Promise<IApiKey | null> {
    try {
      const apiKeyData = await this.firebaseService.findById(this.apiKeysCollection, id);
      return apiKeyData as IApiKey;
    } catch (error) {
      this.logger.error(`Failed to get API key: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all API keys with pagination
   */
  async getAllApiKeys(limit: number = 50, offset: number = 0): Promise<{ apiKeys: IApiKey[]; total: number }> {
    try {
      const { data: apiKeys, total } = await this.firebaseService.findAll(
        this.apiKeysCollection,
        limit,
        offset
      );

      return { apiKeys: apiKeys as IApiKey[], total };

    } catch (error) {
      this.logger.error(`Failed to get API keys: ${error.message}`);
      return { apiKeys: [], total: 0 };
    }
  }

  /**
   * Get API keys by creator
   */
  async getApiKeysByCreator(createdBy: string): Promise<IApiKey[]> {
    try {
      const apiKeys = await this.firebaseService.findByField(
        this.apiKeysCollection,
        'createdBy',
        createdBy
      );

      return apiKeys as IApiKey[];

    } catch (error) {
      this.logger.error(`Failed to get API keys by creator: ${error.message}`);
      return [];
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(id: string, updateApiKeyDto: UpdateApiKeyDto): Promise<IApiKey> {
    try {
      this.logger.log(`Updating API key: ${id}`);

      const existingApiKey = await this.getApiKey(id);
      if (!existingApiKey) {
        throw new NotFoundException('API key not found');
      }

      const updateData: Partial<IApiKey> = {
        ...updateApiKeyDto,
        permissions: updateApiKeyDto.permissions ? (updateApiKeyDto.permissions as Permission[]) : undefined,
        updatedAt: new Date(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await this.firebaseService.update(this.apiKeysCollection, id, updateData);

      const updatedApiKey = await this.getApiKey(id);
      this.logger.log(`API key updated successfully: ${id}`);

      return updatedApiKey!;

    } catch (error) {
      this.logger.error(`Failed to update API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate API key
   */
  async deactivateApiKey(id: string): Promise<void> {
    try {
      this.logger.log(`Deactivating API key: ${id}`);

      await this.firebaseService.update(this.apiKeysCollection, id, {
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`API key deactivated successfully: ${id}`);
      console.log(`❌ API key deactivated: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to deactivate API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Activate API key
   */
  async activateApiKey(id: string): Promise<void> {
    try {
      this.logger.log(`Activating API key: ${id}`);

      await this.firebaseService.update(this.apiKeysCollection, id, {
        isActive: true,
        updatedAt: new Date(),
      });

      this.logger.log(`API key activated successfully: ${id}`);
      console.log(`✅ API key activated: ${id}`);

    } catch (error) {
      this.logger.error(`Failed to activate API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting API key: ${id}`);

      const apiKey = await this.getApiKey(id);
      if (!apiKey) {
        throw new NotFoundException('API key not found');
      }

      await this.firebaseService.delete(this.apiKeysCollection, id);

      this.logger.log(`API key deleted successfully: ${id}`);
      console.log(`🗑️ API key deleted: ${apiKey.name}`);

    } catch (error) {
      this.logger.error(`Failed to delete API key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<IApiKey | null> {
    try {
      const keyHash = this.hashApiKey(key);

      // Find API key by hash
      const apiKeys = await this.firebaseService.findByField(
        this.apiKeysCollection,
        'keyHash',
        keyHash
      );

      if (apiKeys.length === 0) {
        return null;
      }

      const apiKey = apiKeys[0] as IApiKey;

      // Check if API key is active
      if (!apiKey.isActive) {
        throw new UnauthorizedException('API key is deactivated');
      }

      // Check if API key is expired
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        throw new UnauthorizedException('API key has expired');
      }

      // Update usage statistics
      await this.updateApiKeyUsage(apiKey.id);

      this.logger.log(`API key validated successfully: ${apiKey.name}`);
      return apiKey;

    } catch (error) {
      this.logger.warn(`API key validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Update API key usage statistics
   */
  async updateApiKeyUsage(id: string): Promise<void> {
    try {
      await this.firebaseService.update(this.apiKeysCollection, id, {
        lastUsedAt: new Date(),
        usageCount: this.firebaseService.increment(1),
        updatedAt: new Date(),
      });

    } catch (error) {
      this.logger.warn(`Failed to update API key usage: ${error.message}`);
    }
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    totalUsage: number;
  }> {
    try {
      const { total } = await this.firebaseService.findAll(this.apiKeysCollection, 1);
      
      const activeKeys = await this.firebaseService.findByField(
        this.apiKeysCollection,
        'isActive',
        true
      );

      // Get expired keys (simplified check)
      const now = new Date();
      const allKeys = await this.firebaseService.findAll(this.apiKeysCollection, 1000);
      const expiredKeys = allKeys.data.filter(key => 
        key.expiresAt && new Date(key.expiresAt) < now
      );

      const totalUsage = allKeys.data.reduce((sum, key) => sum + (key.usageCount || 0), 0);

      return {
        total,
        active: activeKeys.length,
        expired: expiredKeys.length,
        totalUsage,
      };

    } catch (error) {
      this.logger.error(`Failed to get API key stats: ${error.message}`);
      return {
        total: 0,
        active: 0,
        expired: 0,
        totalUsage: 0,
      };
    }
  }

  /**
   * Cleanup expired API keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      this.logger.log('Starting cleanup of expired API keys');

      const allKeys = await this.firebaseService.findAll(this.apiKeysCollection, 1000);
      const now = new Date();
      let cleanedCount = 0;

      for (const key of allKeys.data) {
        if (key.expiresAt && new Date(key.expiresAt) < now && key.isActive) {
          await this.deactivateApiKey(key.id);
          cleanedCount++;
        }
      }

      this.logger.log(`Cleanup completed. Deactivated ${cleanedCount} expired API keys`);
      return cleanedCount;

    } catch (error) {
      this.logger.error(`API key cleanup failed: ${error.message}`);
      return 0;
    }
  }

  /**
   * Generate random API key
   */
  private generateApiKey(): string {
    const prefix = 'ck24'; // CheckIt24 prefix
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomPart}`;
  }

  /**
   * Hash API key for secure storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Check if API key has specific permission
   */
  hasPermission(apiKey: IApiKey, permission: Permission): boolean {
    return apiKey.permissions.includes(permission);
  }

  /**
   * Check if API key has any of the specified permissions
   */
  hasAnyPermission(apiKey: IApiKey, permissions: Permission[]): boolean {
    return permissions.some(permission => apiKey.permissions.includes(permission));
  }

  /**
   * Check if API key has all of the specified permissions
   */
  hasAllPermissions(apiKey: IApiKey, permissions: Permission[]): boolean {
    return permissions.every(permission => apiKey.permissions.includes(permission));
  }

  /**
   * Get API keys expiring soon
   */
  async getKeysExpiringSoon(days: number = 7): Promise<IApiKey[]> {
    try {
      const allKeys = await this.firebaseService.findAll(this.apiKeysCollection, 1000);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return allKeys.data.filter(key => 
        key.expiresAt && 
        new Date(key.expiresAt) <= futureDate && 
        new Date(key.expiresAt) > new Date() &&
        key.isActive
      ) as IApiKey[];

    } catch (error) {
      this.logger.error(`Failed to get keys expiring soon: ${error.message}`);
      return [];
    }
  }
}