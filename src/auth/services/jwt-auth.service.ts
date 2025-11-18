import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IUser, UserRole, Permission } from '../interfaces/auth.interface';

/**
 * JWT Authentication Service
 * Handles JWT token generation, validation, and management
 */
@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '1h');
    this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    
    console.log('🔐 JWT Authentication Service initialized');
  }

  /**
   * Generate access token
   */
  async generateAccessToken(user: IUser): Promise<string> {
    try {
      const payload: IJwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        iat: Math.floor(Date.now() / 1000),
        type: 'access',
      };

      const token = await this.jwtService.signAsync(payload, {
        expiresIn: this.accessTokenExpiry,
      });

      this.logger.log(`Access token generated for user: ${user.email}`);
      return token;

    } catch (error) {
      this.logger.error(`Failed to generate access token: ${error.message}`);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(user: IUser): Promise<string> {
    try {
      const payload: IJwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        iat: Math.floor(Date.now() / 1000),
        type: 'refresh',
      };

      const token = await this.jwtService.signAsync(payload, {
        expiresIn: this.refreshTokenExpiry,
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 
               this.configService.get<string>('JWT_SECRET'),
      });

      this.logger.log(`Refresh token generated for user: ${user.email}`);
      return token;

    } catch (error) {
      this.logger.error(`Failed to generate refresh token: ${error.message}`);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(user: IUser): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(user),
        this.generateRefreshToken(user),
      ]);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getExpirySeconds(this.accessTokenExpiry),
      };

    } catch (error) {
      this.logger.error(`Failed to generate token pair: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<IJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token);
      
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token is expired
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Token has expired');
      }

      this.logger.log(`Access token validated for user: ${payload.email}`);
      return payload;

    } catch (error) {
      this.logger.warn(`Access token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<IJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 
               this.configService.get<string>('JWT_SECRET'),
      });
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token is expired
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      this.logger.log(`Refresh token validated for user: ${payload.email}`);
      return payload;

    } catch (error) {
      this.logger.warn(`Refresh token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without validation (for debugging)
   */
  decodeToken(token: string): IJwtPayload | null {
    try {
      return this.jwtService.decode(token) as IJwtPayload;
    } catch (error) {
      this.logger.warn(`Failed to decode token: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return true;
      
      return decoded.exp < Math.floor(Date.now() / 1000);
    } catch (error) {
      return true;
    }
  }

  /**
   * Get time until token expires (in seconds)
   */
  getTimeToExpiry(token: string): number {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract user ID from token
   */
  getUserIdFromToken(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.sub || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract user role from token
   */
  getUserRoleFromToken(token: string): UserRole | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.role || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract permissions from token
   */
  getPermissionsFromToken(token: string): Permission[] {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.permissions || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Convert expiry string to seconds
   */
  private getExpirySeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 3600; // Default to 1 hour
    }
  }

  /**
   * Blacklist token (for logout functionality)
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      // In a production environment, you would store blacklisted tokens in Redis
      // or a database with expiration matching the token's expiry
      // For now, we'll just log it
      const decoded = this.decodeToken(token);
      if (decoded) {
        this.logger.log(`Token blacklisted for user: ${decoded.email}`);
        // TODO: Store in Redis or database
        // await this.redisService.setex(`blacklist:${token}`, decoded.exp - Math.floor(Date.now() / 1000), 'true');
      }
    } catch (error) {
      this.logger.error(`Failed to blacklist token: ${error.message}`);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // In production, check Redis or database
      // const isBlacklisted = await this.redisService.exists(`blacklist:${token}`);
      // return isBlacklisted === 1;
      return false; // For now, no tokens are blacklisted
    } catch (error) {
      this.logger.error(`Failed to check token blacklist: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate API key token
   */
  async generateApiKeyToken(apiKey: { id: string; permissions: Permission[] }): Promise<string> {
    try {
      const payload = {
        sub: apiKey.id,
        permissions: apiKey.permissions,
        type: 'api_key',
        iat: Math.floor(Date.now() / 1000),
      };

      return await this.jwtService.signAsync(payload, {
        expiresIn: '365d', // API keys have longer expiry
      });

    } catch (error) {
      this.logger.error(`Failed to generate API key token: ${error.message}`);
      throw new Error('Failed to generate API key token');
    }
  }
}