import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { ApiKeyService } from '../services/api-key.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  FirebaseTokenAuthDto,
  FederatedLoginDto,
  SendPhoneVerificationDto,
  PhoneVerificationDto,
  ChangePasswordDto,
  UpdateProfileDto,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  LoginResponseDto,
  RegisterResponseDto,
  ApiKeyResponseDto,
} from '../dto/auth.dto';
import { IUser, UserRole, Permission } from '../interfaces/auth.interface';
import { Auth, AuthWithRoles, AuthWithPermissions } from '../decorators/auth.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';

/**
 * Authentication Controller
 * Handles all authentication and authorization endpoints
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly apiKeyService: ApiKeyService,
  ) {
    console.log('🔐 Authentication Controller initialized');
  }

  // ===============================
  // PUBLIC AUTHENTICATION ENDPOINTS
  // ===============================

  /**
   * User login with email and password
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.log(`Login request for: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  /**
   * User registration with email and password
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful', type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    this.logger.log(`Registration request for: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  /**
   * Refresh access token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    this.logger.log('Token refresh request');
    return this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * Firebase token authentication
   */
  @Public()
  @Post('firebase')
  @ApiOperation({ summary: 'Authenticate with Firebase token' })
  @ApiBody({ type: FirebaseTokenAuthDto })
  @ApiResponse({ status: 200, description: 'Firebase authentication successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Firebase token' })
  async authenticateWithFirebase(@Body() tokenDto: FirebaseTokenAuthDto): Promise<LoginResponseDto> {
    this.logger.log('Firebase authentication request');
    return this.authService.authenticateWithFirebase(tokenDto);
  }

  /**
   * Federated login (Google, Facebook, etc.)
   */
  @Public()
  @Post('federated')
  @ApiOperation({ summary: 'Federated login (Google, Facebook)' })
  @ApiBody({ type: FederatedLoginDto })
  @ApiResponse({ status: 200, description: 'Federated login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Federated login failed' })
  async federatedLogin(@Body() federatedDto: FederatedLoginDto): Promise<LoginResponseDto> {
    this.logger.log(`Federated login request with ${federatedDto.provider}`);
    return this.authService.federatedLogin(federatedDto);
  }

  /**
   * Send phone verification code
   */
  @Public()
  @Post('phone/verify/send')
  @ApiOperation({ summary: 'Send phone verification code' })
  @ApiBody({ type: SendPhoneVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async sendPhoneVerification(@Body() phoneDto: SendPhoneVerificationDto) {
    this.logger.log(`Phone verification request for: ${phoneDto.phoneNumber}`);
    return this.authService.sendPhoneVerification(phoneDto);
  }

  /**
   * Verify phone number with code
   */
  @Public()
  @Post('phone/verify')
  @ApiOperation({ summary: 'Verify phone number' })
  @ApiBody({ type: PhoneVerificationDto })
  @ApiResponse({ status: 200, description: 'Phone number verified' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifyPhoneNumber(@Body() verificationDto: PhoneVerificationDto) {
    this.logger.log(`Phone verification attempt with ID: ${verificationDto.verificationId}`);
    return this.authService.verifyPhoneNumber(verificationDto);
  }

  /**
   * Send password reset email
   */
  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async sendPasswordResetEmail(@Body('email') email: string) {
    this.logger.log(`Password reset request for: ${email}`);
    return this.authService.sendPasswordResetEmail(email);
  }

  // ===============================
  // AUTHENTICATED USER ENDPOINTS
  // ===============================

  /**
   * Get current user profile
   */
  @Auth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: IUser): Promise<IUser> {
    this.logger.log(`Profile request for user: ${user.email}`);
    return user;
  }

  /**
   * Update user profile
   */
  @Auth()
  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<IUser> {
    this.logger.log(`Profile update request for user: ${userId}`);
    return this.userService.updateProfile(userId, updateProfileDto);
  }

  /**
   * Change password
   */
  @Auth()
  @Put('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.log(`Password change request for user: ${userId}`);
    return this.userService.changePassword(userId, changePasswordDto);
  }

  /**
   * Send email verification
   */
  @Auth()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification' })
  @ApiResponse({ status: 200, description: 'Email verification sent' })
  async sendEmailVerification(@CurrentUser('id') userId: string) {
    this.logger.log(`Email verification request for user: ${userId}`);
    return this.authService.sendEmailVerification(userId);
  }

  /**
   * Logout user
   */
  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    this.logger.log('Logout request');
    return this.authService.logout(token);
  }

  /**
   * Validate current session
   */
  @Auth()
  @Get('session')
  @ApiOperation({ summary: 'Validate current session' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  async validateSession(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    this.logger.log('Session validation request');
    return this.authService.validateSession(token);
  }

  // ===============================
  // USER MANAGEMENT ENDPOINTS
  // ===============================

  /**
   * Get all users (Admin only)
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    this.logger.log(`Get all users request (limit: ${limit}, offset: ${offset})`);
    return this.userService.getAllUsers(limit, offset);
  }

  /**
   * Get user by ID (Admin only)
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<IUser> {
    this.logger.log(`Get user by ID request: ${id}`);
    const user = await this.userService.findUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Search users (Admin only)
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('users/search')
  @ApiOperation({ summary: 'Search users (Admin only)' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users found' })
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit: number = 20,
  ): Promise<IUser[]> {
    this.logger.log(`User search request: ${query}`);
    return this.userService.searchUsers(query, limit);
  }

  /**
   * Deactivate user (Admin only)
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('users/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivateUser(@Param('id') id: string) {
    this.logger.log(`Deactivate user request: ${id}`);
    await this.userService.deactivateUser(id);
    return { message: 'User deactivated successfully' };
  }

  /**
   * Activate user (Admin only)
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string) {
    this.logger.log(`Activate user request: ${id}`);
    await this.userService.activateUser(id);
    return { message: 'User activated successfully' };
  }

  // ===============================
  // API KEY MANAGEMENT ENDPOINTS
  // ===============================

  /**
   * Create API key
   */
  @AuthWithPermissions(Permission.API_KEY_CREATE)
  @Post('api-keys')
  @ApiOperation({ summary: 'Create API key' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({ status: 201, description: 'API key created successfully', type: ApiKeyResponseDto })
  async createApiKey(
    @CurrentUser('id') userId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    this.logger.log(`Create API key request: ${createApiKeyDto.name}`);
    return this.apiKeyService.createApiKey(createApiKeyDto, userId);
  }

  /**
   * Get all API keys
   */
  @AuthWithPermissions(Permission.API_KEY_READ)
  @Get('api-keys')
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async getAllApiKeys(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    this.logger.log(`Get all API keys request (limit: ${limit}, offset: ${offset})`);
    return this.apiKeyService.getAllApiKeys(limit, offset);
  }

  /**
   * Get API key by ID
   */
  @AuthWithPermissions(Permission.API_KEY_READ)
  @Get('api-keys/:id')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getApiKey(@Param('id') id: string) {
    this.logger.log(`Get API key request: ${id}`);
    const apiKey = await this.apiKeyService.getApiKey(id);
    if (!apiKey) {
      throw new Error('API key not found');
    }
    return apiKey;
  }

  /**
   * Update API key
   */
  @AuthWithPermissions(Permission.API_KEY_UPDATE)
  @Put('api-keys/:id')
  @ApiOperation({ summary: 'Update API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiBody({ type: UpdateApiKeyDto })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    this.logger.log(`Update API key request: ${id}`);
    return this.apiKeyService.updateApiKey(id, updateApiKeyDto);
  }

  /**
   * Deactivate API key
   */
  @AuthWithPermissions(Permission.API_KEY_UPDATE)
  @Put('api-keys/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key deactivated successfully' })
  async deactivateApiKey(@Param('id') id: string) {
    this.logger.log(`Deactivate API key request: ${id}`);
    await this.apiKeyService.deactivateApiKey(id);
    return { message: 'API key deactivated successfully' };
  }

  /**
   * Delete API key
   */
  @AuthWithPermissions(Permission.API_KEY_DELETE)
  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  async deleteApiKey(@Param('id') id: string) {
    this.logger.log(`Delete API key request: ${id}`);
    await this.apiKeyService.deleteApiKey(id);
    return { message: 'API key deleted successfully' };
  }

  // ===============================
  // STATISTICS AND MONITORING
  // ===============================

  /**
   * Get authentication statistics
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('stats')
  @ApiOperation({ summary: 'Get authentication statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAuthStats() {
    this.logger.log('Get auth stats request');
    const [authStats, userStats, apiKeyStats] = await Promise.all([
      this.authService.getAuthStats(),
      this.userService.getUserStats(),
      this.apiKeyService.getApiKeyStats(),
    ]);

    return {
      auth: authStats,
      users: userStats,
      apiKeys: apiKeyStats,
      timestamp: new Date(),
    };
  }

  /**
   * Get API key statistics
   */
  @AuthWithPermissions(Permission.API_KEY_READ)
  @Get('api-keys/stats')
  @ApiOperation({ summary: 'Get API key statistics' })
  @ApiResponse({ status: 200, description: 'API key statistics retrieved' })
  async getApiKeyStats() {
    this.logger.log('Get API key stats request');
    return this.apiKeyService.getApiKeyStats();
  }

  /**
   * Health check endpoint
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Authentication service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'authentication',
      timestamp: new Date(),
      version: '1.0.0',
    };
  }
}