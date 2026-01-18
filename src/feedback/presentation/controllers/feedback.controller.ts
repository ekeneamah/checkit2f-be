/**
 * Feedback Controller
 * REST API endpoints for feedback and complaints
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FeedbackService, UserContext } from '../../application/services';
import {
  CreateFeedbackDto,
  UpdateFeedbackDto,
  UpdateFeedbackStatusDto,
  AssignFeedbackDto,
  AddResponseDto,
  ResolveFeedbackDto,
  EscalateFeedbackDto,
  AddSatisfactionRatingDto,
  QueryFeedbackDto,
  FeedbackResponseDto,
  FeedbackListResponseDto,
  FeedbackStatsResponseDto,
} from '../../application/dtos';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@/auth/interfaces/auth.interface';
import { FeedbackEntity } from '../../domain';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Extract user context from request
   */
  private getUserContext(request: { user: { userId: string; email: string; displayName?: string; role: string } }): UserContext {
    return {
      userId: request.user.userId,
      email: request.user.email,
      displayName: request.user.displayName || request.user.email,
      role: request.user.role,
    };
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(entity: FeedbackEntity, includeInternalNotes = false): FeedbackResponseDto {
    const obj = entity.toObject();
    
    // Filter out internal notes for non-admin users
    const responses = obj.responses?.filter((r) => includeInternalNotes || !r.isInternal) || [];

    return {
      id: obj.id!,
      ticketNumber: obj.ticketNumber!,
      type: obj.type,
      category: obj.category,
      priority: obj.priority!,
      status: obj.status!,
      source: obj.source!,
      subject: obj.subject,
      description: obj.description,
      submittedBy: obj.submittedBy,
      submittedByEmail: obj.submittedByEmail,
      submittedByName: obj.submittedByName,
      submittedByRole: obj.submittedByRole,
      assignedTo: obj.assignedTo,
      assignedToName: obj.assignedToName,
      assignedAt: obj.assignedAt,
      resolution: obj.resolution,
      resolvedBy: obj.resolvedBy,
      resolvedAt: obj.resolvedAt,
      responses,
      satisfactionRating: obj.satisfactionRating,
      satisfactionComment: obj.satisfactionComment,
      createdAt: obj.createdAt!,
      updatedAt: obj.updatedAt!,
    };
  }

  /**
   * Create new feedback
   */
  @Post()
  @ApiOperation({ summary: 'Create new feedback or complaint' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Feedback created successfully' })
  async create(
    @Body() dto: CreateFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.createFeedback(dto, user);
    return this.toResponseDto(feedback);
  }

  /**
   * Get my feedback
   */
  @Get('my')
  @ApiOperation({ summary: 'Get my submitted feedback' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of user feedback' })
  async getMyFeedback(
    @Query() query: QueryFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackListResponseDto> {
    const user = this.getUserContext(req);
    const result = await this.feedbackService.listMyFeedback(query, user);
    
    return {
      items: result.items.map((item) => this.toResponseDto(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get all feedback (admin only)
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all feedback (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all feedback' })
  async getAllFeedback(
    @Query() query: QueryFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackListResponseDto> {
    const user = this.getUserContext(req);
    const result = await this.feedbackService.listAllFeedback(query, user);
    
    return {
      items: result.items.map((item) => this.toResponseDto(item, true)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get feedback assigned to me (admin only)
   */
  @Get('assigned')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get feedback assigned to me (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of assigned feedback' })
  async getAssignedFeedback(
    @Query() query: QueryFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackListResponseDto> {
    const user = this.getUserContext(req);
    const result = await this.feedbackService.listAssignedFeedback(query, user);
    
    return {
      items: result.items.map((item) => this.toResponseDto(item, true)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get statistics (admin only)
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get feedback statistics (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback statistics' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Request() req?: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackStatsResponseDto> {
    const user = this.getUserContext(req!);
    const stats = await this.feedbackService.getStats(
      user,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    
    return stats;
  }

  /**
   * Get feedback by ticket number
   */
  @Get('ticket/:ticketNumber')
  @ApiOperation({ summary: 'Get feedback by ticket number' })
  @ApiParam({ name: 'ticketNumber', description: 'Ticket number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback details' })
  async getByTicketNumber(
    @Param('ticketNumber') ticketNumber: string,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.getFeedbackByTicketNumber(ticketNumber, user);
    const isAdmin = user.role === 'ADMIN';
    return this.toResponseDto(feedback, isAdmin);
  }

  /**
   * Get feedback by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback details' })
  async getById(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.getFeedbackById(id, user);
    const isAdmin = user.role === 'ADMIN';
    return this.toResponseDto(feedback, isAdmin);
  }

  /**
   * Update feedback
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback (submitter only, before processing)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.updateFeedback(id, dto, user);
    return this.toResponseDto(feedback);
  }

  /**
   * Update feedback status (admin only)
   */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update feedback status (admin only)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.updateStatus(id, dto, user);
    return this.toResponseDto(feedback, true);
  }

  /**
   * Assign feedback (admin only)
   */
  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign feedback to admin (admin only)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback assigned' })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.assignFeedback(id, dto, user);
    return this.toResponseDto(feedback, true);
  }

  /**
   * Add response
   */
  @Post(':id/response')
  @ApiOperation({ summary: 'Add response to feedback' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Response added' })
  async addResponse(
    @Param('id') id: string,
    @Body() dto: AddResponseDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.addResponse(id, dto, user);
    const isAdmin = user.role === 'ADMIN';
    return this.toResponseDto(feedback, isAdmin);
  }

  /**
   * Resolve feedback (admin only)
   */
  @Post(':id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve feedback (admin only)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback resolved' })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.resolveFeedback(id, dto, user);
    return this.toResponseDto(feedback, true);
  }

  /**
   * Escalate feedback (admin only)
   */
  @Post(':id/escalate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Escalate feedback (admin only)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback escalated' })
  async escalate(
    @Param('id') id: string,
    @Body() dto: EscalateFeedbackDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.escalateFeedback(id, dto, user);
    return this.toResponseDto(feedback, true);
  }

  /**
   * Close feedback (admin only)
   */
  @Post(':id/close')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close feedback (admin only)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Feedback closed' })
  async close(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.closeFeedback(id, user);
    return this.toResponseDto(feedback, true);
  }

  /**
   * Rate resolution (submitter only)
   */
  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate resolution satisfaction (submitter only)' })
  @ApiParam({ name: 'id', description: 'Feedback ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rating added' })
  async rate(
    @Param('id') id: string,
    @Body() dto: AddSatisfactionRatingDto,
    @Request() req: { user: { userId: string; email: string; displayName?: string; role: string } },
  ): Promise<FeedbackResponseDto> {
    const user = this.getUserContext(req);
    const feedback = await this.feedbackService.addSatisfactionRating(id, dto, user);
    return this.toResponseDto(feedback);
  }
}
