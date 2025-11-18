import { IsEmail, IsString, IsOptional, IsPhoneNumber, IsEnum, MinLength, IsBoolean, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../interfaces/auth.interface';

/**
 * Login with email and password DTO
 */
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@checkit24.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}

/**
 * Register with email and password DTO
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@checkit24.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'User phone number in international format',
    example: '+2348012345678',
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CLIENT,
    default: UserRole.CLIENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/**
 * Firebase token authentication DTO
 */
export class FirebaseTokenDto {
  @ApiProperty({
    description: 'Firebase ID token',
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  idToken: string;
}

/**
 * Firebase Token Auth DTO - for federated login (alias for compatibility)
 */
export class FirebaseTokenAuthDto {
  @ApiProperty({
    description: 'Firebase ID token from client',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjU5ZWE5...',
  })
  @IsString()
  idToken: string;

  @ApiProperty({
    description: 'OAuth provider',
    enum: ['google', 'facebook', 'apple', 'twitter'],
    example: 'google',
  })
  @IsString()
  @IsIn(['google', 'facebook', 'apple', 'twitter'])
  provider: string;

  @ApiProperty({
    description: 'Device info for session tracking',
    required: false,
  })
  @IsOptional()
  @IsObject()
  deviceInfo?: any;
}

/**
 * Federated login DTO (Google/Facebook)
 */
export class FederatedLoginDto {
  @ApiProperty({
    description: 'Provider name',
    example: 'google.com',
    enum: ['google.com', 'facebook.com'],
  })
  @IsString()
  provider: 'google.com' | 'facebook.com';

  @ApiProperty({
    description: 'Provider ID token or access token (ID token preferred for Firebase)',
    example: 'ya29.a0AfH6SMC... or eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({
    description: 'Provider access token (deprecated, use idToken)',
    example: 'ya29.a0AfH6SMC...',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;
}

/**
 * Phone verification DTO
 */
export class PhoneVerificationDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+2348012345678',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'Verification ID from phone verification request',
    example: 'abc123-def456-ghi789',
  })
  @IsString()
  verificationId: string;

  @ApiProperty({
    description: 'Verification code received via SMS',
    example: '123456',
  })
  @IsString()
  verificationCode: string;
}

/**
 * Verify phone with code DTO
 */
export class VerifyPhoneDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+2348012345678',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'Verification code sent via SMS',
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  verificationCode: string;
}

/**
 * Refresh token DTO
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}

/**
 * Reset password DTO
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@checkit24.com',
  })
  @IsEmail()
  email: string;
}

/**
 * Change password DTO
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

/**
 * Update profile DTO
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John Doe Updated',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+2348012345678',
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Photo URL',
    example: 'https://example.com/photo.jpg',
  })
  @IsOptional()
  @IsString()
  photoURL?: string;
}

/**
 * Create API key DTO
 */
export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API key name/description',
    example: 'Mobile App Production Key',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'API key description',
    example: 'API key for mobile app production environment',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Permissions for the API key',
    example: ['ACCESS_EXTERNAL_APIS'],
    type: [String],
  })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Expiration date for the API key',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Whether the API key is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Authentication response DTO
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'User information',
    type: Object,
  })
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneNumber?: string;
    phoneVerified: boolean;
    displayName?: string;
    photoURL?: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
  };

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}

/**
 * User response DTO
 */
export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  emailVerified: boolean;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional()
  photoURL?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastLoginAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

/**
 * Login response DTO
 */
export class LoginResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * Register response DTO
 */
export class RegisterResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * Create user DTO
 */
export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoURL?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

/**
 * Update user DTO
 */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoURL?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Send phone verification DTO
 */
export class SendPhoneVerificationDto {
  @ApiProperty()
  @IsPhoneNumber()
  phoneNumber: string;
}

/**
 * API key response DTO
 */
export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  key?: string; // Only included on creation

  @ApiProperty()
  token: string;

  @ApiProperty({ type: [String] })
  permissions: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  createdAt: Date;
}

/**
 * Update API key DTO
 */
export class UpdateApiKeyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}