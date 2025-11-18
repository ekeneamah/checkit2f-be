import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import {
  CreateVerificationRequestDto,
  UpdateVerificationRequestDto,
  VerificationRequestResponseDto,
  VerificationRequestQueryDto,
  AssignAgentDto,
  ChangeStatusDto,
} from '../../application';

import {
  CreateVerificationRequestUseCase,
  GetVerificationRequestsUseCase,
  UpdateVerificationRequestUseCase,
} from '../../application';

// Import authentication decorators
import { Auth, AuthWithRoles, AuthWithPermissions } from '../../../auth/decorators/auth.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { UserRole, Permission } from '../../../auth/interfaces/auth.interface';

/**
 * Verification Request REST API Controller
 * Handles all HTTP endpoints for verification request management
 */
@ApiTags('Verification Requests')
@Controller('verification-requests')
export class VerificationRequestController {
  private readonly logger = new Logger(VerificationRequestController.name);

  constructor(
    private readonly createUseCase: CreateVerificationRequestUseCase,
    private readonly getUseCase: GetVerificationRequestsUseCase,
    private readonly updateUseCase: UpdateVerificationRequestUseCase,
  ) {}

  /**
   * Create a new verification request
   */
  @Auth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create verification request',
    description: 'Create a new verification request with location, type, and pricing details',
  })
  @ApiCreatedResponse({
    description: 'Verification request created successfully',
    type: VerificationRequestResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async createVerificationRequest(
    @Body() createDto: CreateVerificationRequestDto,
    @CurrentUser('id') clientId: string,
  ): Promise<VerificationRequestResponseDto> {
    try {
      this.logger.log(`Creating verification request for client: ${clientId}`);

      const verificationRequest = await this.createUseCase.execute(clientId, createDto);

      return this.mapToResponse(verificationRequest);
    } catch (error) {
      this.logger.error(`Failed to create verification request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification request by ID
   */
  @Auth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get verification request by ID',
    description: 'Retrieve a specific verification request by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Verification request unique identifier',
    example: 'req_1234567890abcdef',
  })
  @ApiOkResponse({
    description: 'Verification request retrieved successfully',
    type: VerificationRequestResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Verification request not found' })
  async getVerificationRequest(@Param('id') id: string): Promise<VerificationRequestResponseDto> {
    try {
      this.logger.log(`Getting verification request: ${id}`);

      const verificationRequest = await this.getUseCase.getById(id);
      return this.mapToResponse(verificationRequest);
    } catch (error) {
      this.logger.error(`Failed to get verification request ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification requests with filtering and pagination
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT_MANAGER)
  @Get()
  @ApiOperation({
    summary: 'Get verification requests',
    description: 'Retrieve verification requests with optional filtering, sorting, and pagination',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by verification type' })
  @ApiQuery({ name: 'agentId', required: false, description: 'Filter by assigned agent' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort direction', enum: ['asc', 'desc'] })
  @ApiOkResponse({
    description: 'Verification requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/VerificationRequestResponseDto' },
        },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        totalPages: { type: 'number', example: 5 },
      },
    },
  })
  async getVerificationRequests(
    @Query() query: VerificationRequestQueryDto,
  ): Promise<{
    items: VerificationRequestResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.log('Getting verification requests with filters');

      const result = await this.getUseCase.getWithFilters(query);

      return {
        ...result,
        items: result.items.map(item => this.mapToResponse(item)),
      };
    } catch (error) {
      this.logger.error(`Failed to get verification requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for authenticated client
   */
  @AuthWithRoles(UserRole.CLIENT)
  @Get('client/dashboard-stats')
  @ApiOperation({
    summary: 'Get client dashboard statistics',
    description: 'Retrieve statistics for the authenticated client dashboard',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 25 },
        active: { type: 'number', example: 5 },
        completed: { type: 'number', example: 18 },
        cancelled: { type: 'number', example: 2 },
        totalSpent: { type: 'number', example: 150000 },
      },
    },
  })
  async getClientDashboardStats(
    @CurrentUser('id') clientId: string,
  ): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
  }> {
    try {
      this.logger.log(`Getting dashboard stats for client: ${clientId}`);

      const stats = await this.getUseCase.getClientStats(clientId);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get client dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent verification requests for authenticated client
   */
  @AuthWithRoles(UserRole.CLIENT)
  @Get('client/recent')
  @ApiOperation({
    summary: 'Get recent verification requests',
    description: 'Retrieve the most recent verification requests for the authenticated client',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recent requests to return', example: 5 })
  @ApiOkResponse({
    description: 'Recent requests retrieved successfully',
    type: [VerificationRequestResponseDto],
  })
  async getRecentRequests(
    @Query('limit') limit: number = 5,
    @CurrentUser('id') clientId: string,
  ): Promise<VerificationRequestResponseDto[]> {
    try {
      this.logger.log(`Getting recent requests for client: ${clientId}`);

      const requests = await this.getUseCase.getRecentByClientId(clientId, limit);
      return requests.map(request => this.mapToResponse(request));
    } catch (error) {
      this.logger.error(`Failed to get recent requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification requests for authenticated client
   */
  @AuthWithRoles(UserRole.CLIENT)
  @Get('client/my-requests')
  @ApiOperation({
    summary: 'Get my verification requests',
    description: 'Retrieve verification requests for the authenticated client',
  })
  @ApiOkResponse({
    description: 'Client verification requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/VerificationRequestResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getMyVerificationRequests(
    @Query() query: VerificationRequestQueryDto,
    @CurrentUser('id') clientId: string,
  ): Promise<{
    items: VerificationRequestResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.log(`Getting verification requests for client: ${clientId}`);

      const result = await this.getUseCase.getByClientId(clientId, query);

      return {
        ...result,
        items: result.items.map(item => this.mapToResponse(item)),
      };
    } catch (error) {
      this.logger.error(`Failed to get client verification requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification requests for authenticated agent
   */
  @AuthWithRoles(UserRole.AGENT)
  @Get('agent/my-assignments')
  @ApiOperation({
    summary: 'Get my assigned verification requests',
    description: 'Retrieve verification requests assigned to the authenticated agent',
  })
  @ApiOkResponse({
    description: 'Agent verification requests retrieved successfully',
    type: [VerificationRequestResponseDto],
  })
  async getMyAssignments(
    @Query() query: VerificationRequestQueryDto,
    @CurrentUser('id') agentId: string,
  ): Promise<VerificationRequestResponseDto[]> {
    try {
      this.logger.log(`Getting verification requests for agent: ${agentId}`);

      const requests = await this.getUseCase.getByAgentId(agentId, query);
      return requests.map(request => this.mapToResponse(request));
    } catch (error) {
      this.logger.error(`Failed to get agent verification requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign agent to verification request
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT_MANAGER)
  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign agent to verification request',
    description: 'Assign a verification agent to handle the request',
  })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiOkResponse({
    description: 'Agent assigned successfully',
    type: VerificationRequestResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Verification request not found' })
  @ApiBadRequestResponse({ description: 'Cannot assign agent in current status' })
  async assignAgent(
    @Param('id') id: string,
    @Body() assignDto: AssignAgentDto,
  ): Promise<VerificationRequestResponseDto> {
    try {
      this.logger.log(`Assigning agent to verification request: ${id}`);

      const verificationRequest = await this.updateUseCase.assignAgent(id, assignDto);
      return this.mapToResponse(verificationRequest);
    } catch (error) {
      this.logger.error(`Failed to assign agent to request ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change verification request status
   */
  @AuthWithPermissions(Permission.UPDATE_VERIFICATION_REQUEST)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change verification request status',
    description: 'Update the status of a verification request',
  })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiOkResponse({
    description: 'Status changed successfully',
    type: VerificationRequestResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Verification request not found' })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  async changeStatus(
    @Param('id') id: string,
    @Body() statusDto: ChangeStatusDto,
  ): Promise<VerificationRequestResponseDto> {
    try {
      this.logger.log(`Changing status of verification request: ${id}`);

      const verificationRequest = await this.updateUseCase.changeStatus(id, statusDto);
      return this.mapToResponse(verificationRequest);
    } catch (error) {
      this.logger.error(`Failed to change status of request ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update payment information
   */
  @AuthWithPermissions(Permission.PROCESS_PAYMENT)
  @Patch(':id/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update payment information',
    description: 'Update payment details for verification request',
  })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiOkResponse({
    description: 'Payment updated successfully',
    type: VerificationRequestResponseDto,
  })
  async updatePayment(
    @Param('id') id: string,
    @Body() paymentData: { paymentId: string; paymentStatus: string },
  ): Promise<VerificationRequestResponseDto> {
    try {
      this.logger.log(`Updating payment for verification request: ${id}`);

      const verificationRequest = await this.updateUseCase.updatePayment(
        id,
        paymentData.paymentId,
        paymentData.paymentStatus,
      );
      return this.mapToResponse(verificationRequest);
    } catch (error) {
      this.logger.error(`Failed to update payment for request ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add attachment to verification request
   */
  @Auth()
  @Post(':id/attachments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add attachment',
    description: 'Add file attachment to verification request',
  })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiOkResponse({
    description: 'Attachment added successfully',
    type: VerificationRequestResponseDto,
  })
  async addAttachment(
    @Param('id') id: string,
    @Body() attachmentData: { attachmentUrl: string },
  ): Promise<VerificationRequestResponseDto> {
    try {
      this.logger.log(`Adding attachment to verification request: ${id}`);

      const verificationRequest = await this.updateUseCase.addAttachment(id, attachmentData.attachmentUrl);
      return this.mapToResponse(verificationRequest);
    } catch (error) {
      this.logger.error(`Failed to add attachment to request ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get overdue verification requests
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT_MANAGER)
  @Get('reports/overdue')
  @ApiOperation({
    summary: 'Get overdue verification requests',
    description: 'Retrieve verification requests that are past their estimated completion date',
  })
  @ApiOkResponse({
    description: 'Overdue requests retrieved successfully',
    type: [VerificationRequestResponseDto],
  })
  async getOverdueRequests(): Promise<VerificationRequestResponseDto[]> {
    try {
      this.logger.log('Getting overdue verification requests');

      const requests = await this.getUseCase.getOverdueRequests();
      return requests.map(request => this.mapToResponse(request));
    } catch (error) {
      this.logger.error(`Failed to get overdue requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map domain entity to response DTO
   */
  private mapToResponse(request: any): VerificationRequestResponseDto {
    return {
      id: request.id,
      clientId: request.clientId,
      title: request.title,
      description: request.description,
      verificationType: {
        type: request.verificationType.type,
        urgency: request.verificationType.urgency,
        requiresPhysicalPresence: request.verificationType.requiresPhysicalPresence,
        estimatedDuration: request.verificationType.estimatedDuration,
        specialInstructions: request.verificationType.specialInstructions,
      },
      location: {
        address: request.location.address,
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        placeId: request.location.placeId,
        landmark: request.location.landmark,
        accessInstructions: request.location.accessInstructions,
      },
      status: request.status.status,
      price: {
        amount: request.price.amount,
        currency: request.price.currency,
      },
      assignedAgentId: request.assignedAgentId,
      scheduledDate: request.scheduledDate?.toISOString(),
      estimatedCompletionDate: request.estimatedCompletionDate?.toISOString(),
      actualCompletionDate: request.actualCompletionDate?.toISOString(),
      attachments: request.attachments,
      notes: request.notes,
      paymentId: request.paymentId,
      paymentStatus: request.paymentStatus,
      createdAt: request.createdAt.toISOString(),
      modifiedAt: request.modifiedAt.toISOString(),
    };
  }
}