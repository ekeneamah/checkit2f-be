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
  ApiParam,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import {
  RegisterAgentDto,
  UpdateAgentProfileDto,
  UpdateServiceAreaDto,
  UpdateSpecializationsDto,
  UpdateAvailabilityDto,
  AgentResponseDto,
  AgentQueryDto,
} from '../../application/dtos';

import {
  RegisterAgentUseCase,
  GetAgentUseCase,
  UpdateAgentUseCase,
} from '../../application/use-cases';

import { Auth, AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { UserRole, IUser } from '../../../auth/interfaces/auth.interface';

/**
 * Agent REST API Controller
 * Handles all HTTP endpoints for agent management
 */
@ApiTags('Agents')
@Controller('agents')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly registerUseCase: RegisterAgentUseCase,
    private readonly getUseCase: GetAgentUseCase,
    private readonly updateUseCase: UpdateAgentUseCase,
  ) {}

  /**
   * Helper to get current agent - tries email first, then firebaseUid
   */
  private async getCurrentAgent(user: IUser) {
    this.logger.log(`Looking up agent for user: ${user.email}, id: ${user.id}`);
    try {
      const agent = await this.getUseCase.getByEmail(user.email);
      this.logger.log(`Found agent by email: ${agent.id}`);
      return agent;
    } catch (emailError: any) {
      this.logger.log(`Email lookup failed: ${emailError.message}, trying firebaseUid`);
      const firebaseUid = user.metadata?.firebaseUid || user.id;
      this.logger.log(`Looking up by firebaseUid: ${firebaseUid}`);
      return await this.getUseCase.getByFirebaseUid(firebaseUid);
    }
  }

  /**
   * Register a new agent
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new agent',
    description: 'Register a new verification agent with Firebase authentication',
  })
  @ApiCreatedResponse({
    description: 'Agent registered successfully',
    type: AgentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async registerAgent(
    @Body() registerDto: RegisterAgentDto,
  ): Promise<AgentResponseDto> {
    try {
      this.logger.log(`Registering new agent: ${registerDto.email}`);
      const agent = await this.registerUseCase.execute(registerDto);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to register agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get agent profile (own)
   */
  @Auth()
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current agent profile',
    description: 'Retrieve authenticated agent profile',
  })
  @ApiOkResponse({
    description: 'Agent profile retrieved successfully',
    type: AgentResponseDto,
  })
  async getMyProfile(
    @CurrentUser() user: IUser,
  ): Promise<AgentResponseDto> {
    try {
      this.logger.log(`Getting profile for user: ${user.email}, id: ${user.id}`);
      const agent = await this.getCurrentAgent(user);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to get agent profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  @Auth()
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get agent by ID',
    description: 'Retrieve agent details by ID',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiOkResponse({
    description: 'Agent retrieved successfully',
    type: AgentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async getAgent(@Param('id') id: string): Promise<AgentResponseDto> {
    try {
      const agent = await this.getUseCase.getById(id);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to get agent ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all agents (admin)
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all agents',
    description: 'Retrieve list of agents (Admin only)',
  })
  @ApiOkResponse({
    description: 'Agents retrieved successfully',
    type: [AgentResponseDto],
  })
  async getAllAgents(@Query() query: AgentQueryDto): Promise<AgentResponseDto[]> {
    try {
      const agents = await this.getUseCase.getAll(query.limit, query.offset);
      return agents.map(agent => this.mapToResponse(agent));
    } catch (error) {
      this.logger.error(`Failed to get agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available agents in area
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT_MANAGER)
  @Get('available/:city')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available agents in city',
    description: 'Find available agents in a specific city',
  })
  @ApiParam({ name: 'city', description: 'City name' })
  @ApiOkResponse({
    description: 'Available agents retrieved successfully',
    type: [AgentResponseDto],
  })
  async getAvailableAgents(
    @Param('city') city: string,
    @Query('specialization') specialization?: any,
  ): Promise<AgentResponseDto[]> {
    try {
      const agents = await this.getUseCase.getAvailableInArea(city, specialization);
      return agents.map(agent => this.mapToResponse(agent));
    } catch (error) {
      this.logger.error(`Failed to get available agents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update agent profile
   */
  @Auth()
  @Put('me/profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update agent profile',
    description: 'Update authenticated agent profile',
  })
  @ApiOkResponse({
    description: 'Profile updated successfully',
    type: AgentResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() updateDto: UpdateAgentProfileDto,
  ): Promise<AgentResponseDto> {
    try {
      const currentAgent = await this.getCurrentAgent(user);
      const agent = await this.updateUseCase.updateProfile(currentAgent.id, currentAgent.firebaseUid, updateDto);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update service area
   */
  @Auth()
  @Put('me/service-area')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update service area',
    description: 'Update agent service area',
  })
  @ApiOkResponse({
    description: 'Service area updated successfully',
    type: AgentResponseDto,
  })
  async updateServiceArea(
    @CurrentUser() user: IUser,
    @Body() updateDto: UpdateServiceAreaDto,
  ): Promise<AgentResponseDto> {
    try {
      const currentAgent = await this.getCurrentAgent(user);
      const agent = await this.updateUseCase.updateServiceArea(currentAgent.id, currentAgent.firebaseUid, updateDto);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to update service area: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update specializations
   */
  @Auth()
  @Put('me/specializations')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update specializations',
    description: 'Update agent specializations',
  })
  @ApiOkResponse({
    description: 'Specializations updated successfully',
    type: AgentResponseDto,
  })
  async updateSpecializations(
    @CurrentUser() user: IUser,
    @Body() updateDto: UpdateSpecializationsDto,
  ): Promise<AgentResponseDto> {
    try {
      const currentAgent = await this.getCurrentAgent(user);
      const agent = await this.updateUseCase.updateSpecializations(currentAgent.id, currentAgent.firebaseUid, updateDto);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to update specializations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update availability
   */
  @Auth()
  @Patch('me/availability')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update availability',
    description: 'Update agent availability status',
  })
  @ApiOkResponse({
    description: 'Availability updated successfully',
    type: AgentResponseDto,
  })
  async updateAvailability(
    @CurrentUser() user: IUser,
    @Body() updateDto: UpdateAvailabilityDto,
  ): Promise<AgentResponseDto> {
    try {
      const currentAgent = await this.getCurrentAgent(user);
      const agent = await this.updateUseCase.updateAvailability(currentAgent.id, currentAgent.firebaseUid, updateDto);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to update availability: ${error.message}`);
      throw error;
    }
  }

  /**
   * Go online
   */
  @Auth()
  @Post('me/online')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Go online',
    description: 'Set agent status to available',
  })
  @ApiOkResponse({
    description: 'Agent is now online',
    type: AgentResponseDto,
  })
  async goOnline(
    @CurrentUser() user: IUser,
  ): Promise<AgentResponseDto> {
    try {
      const currentAgent = await this.getCurrentAgent(user);
      const agent = await this.updateUseCase.goOnline(currentAgent.id, currentAgent.firebaseUid);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to go online: ${error.message}`);
      throw error;
    }
  }

  /**
   * Go offline
   */
  @Auth()
  @Post('me/offline')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Go offline',
    description: 'Set agent status to offline',
  })
  @ApiOkResponse({
    description: 'Agent is now offline',
    type: AgentResponseDto,
  })
  async goOffline(
    @CurrentUser() user: IUser,
  ): Promise<AgentResponseDto> {
    try {
      const currentAgent = await this.getCurrentAgent(user);
      const agent = await this.updateUseCase.goOffline(currentAgent.id, currentAgent.firebaseUid);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to go offline: ${error.message}`);
      throw error;
    }
  }

  /**
   * Admin: Activate agent
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/activate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate agent (Admin)',
    description: 'Activate an agent account',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiOkResponse({
    description: 'Agent activated successfully',
    type: AgentResponseDto,
  })
  async activateAgent(@Param('id') id: string): Promise<AgentResponseDto> {
    try {
      const agent = await this.updateUseCase.activateAgent(id);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to activate agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Admin: Suspend agent
   */
  @AuthWithRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/suspend')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Suspend agent (Admin)',
    description: 'Suspend an agent account',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiOkResponse({
    description: 'Agent suspended successfully',
    type: AgentResponseDto,
  })
  async suspendAgent(@Param('id') id: string): Promise<AgentResponseDto> {
    try {
      const agent = await this.updateUseCase.suspendAgent(id);
      return this.mapToResponse(agent);
    } catch (error) {
      this.logger.error(`Failed to suspend agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map domain entity to response DTO
   */
  private mapToResponse(agent: any): AgentResponseDto {
    return agent.toJSON();
  }
}
