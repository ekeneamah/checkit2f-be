/**
 * Feedback Service
 * Business logic for feedback and complaints
 */
import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  FeedbackEntity,
  FEEDBACK_REPOSITORY_TOKEN,
  IFeedbackRepository,
  FeedbackQueryOptions,
  PaginatedFeedback,
  FeedbackStats,
} from '../../domain';
import { FeedbackStatus, FeedbackType } from '../../domain/enums';
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
} from '../dtos';

/**
 * User context for operations
 */
export interface UserContext {
  userId: string;
  email: string;
  displayName: string;
  role: string;
}

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY_TOKEN)
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create new feedback
   */
  async createFeedback(dto: CreateFeedbackDto, user: UserContext): Promise<FeedbackEntity> {
    const feedback = FeedbackEntity.create({
      type: dto.type,
      category: dto.category,
      priority: dto.priority,
      source: dto.source,
      subject: dto.subject,
      description: dto.description,
      submittedBy: user.userId,
      submittedByEmail: user.email,
      submittedByName: user.displayName,
      submittedByRole: user.role,
      submittedByPhone: dto.phone,
      relatedEntities: dto.relatedEntities,
    });

    const savedFeedback = await this.feedbackRepository.create(feedback);
    
    // TODO: Send notification to admin for new complaints
    if (dto.type === FeedbackType.COMPLAINT) {
      // await this.notifyAdminsOfNewComplaint(savedFeedback);
    }

    return savedFeedback;
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(id: string, user: UserContext): Promise<FeedbackEntity> {
    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(feedback, user);

    return feedback;
  }

  /**
   * Get feedback by ticket number
   */
  async getFeedbackByTicketNumber(ticketNumber: string, user: UserContext): Promise<FeedbackEntity> {
    const feedback = await this.feedbackRepository.findByTicketNumber(ticketNumber);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ticket ${ticketNumber} not found`);
    }

    this.checkAccessPermission(feedback, user);

    return feedback;
  }

  /**
   * List all feedback (admin only)
   */
  async listAllFeedback(query: QueryFeedbackDto, user: UserContext): Promise<PaginatedFeedback> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can list all feedback');
    }

    const options: FeedbackQueryOptions = {
      status: query.status,
      type: query.type,
      category: query.category,
      priority: query.priority,
      assignedTo: query.assignedTo,
      searchTerm: query.searchTerm,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    return this.feedbackRepository.findAll(options);
  }

  /**
   * List user's own feedback
   */
  async listMyFeedback(query: QueryFeedbackDto, user: UserContext): Promise<PaginatedFeedback> {
    const options: FeedbackQueryOptions = {
      submittedBy: user.userId,
      status: query.status,
      type: query.type,
      category: query.category,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    return this.feedbackRepository.findByUser(user.userId, options);
  }

  /**
   * List feedback assigned to admin
   */
  async listAssignedFeedback(query: QueryFeedbackDto, user: UserContext): Promise<PaginatedFeedback> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can view assigned feedback');
    }

    const options: FeedbackQueryOptions = {
      assignedTo: user.userId,
      status: query.status,
      type: query.type,
      category: query.category,
      priority: query.priority,
      page: query.page || 1,
      limit: query.limit || 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    return this.feedbackRepository.findAll(options);
  }

  /**
   * Update feedback (submitter only, before processing)
   */
  async updateFeedback(id: string, dto: UpdateFeedbackDto, user: UserContext): Promise<FeedbackEntity> {
    const feedback = await this.getFeedbackById(id, user);

    // Only submitter can update
    if (feedback.submittedBy !== user.userId) {
      throw new ForbiddenException('Only the submitter can update this feedback');
    }

    // Can only update if in SUBMITTED status
    if (feedback.status !== FeedbackStatus.SUBMITTED) {
      throw new BadRequestException('Cannot update feedback after it has been processed');
    }

    if (dto.description) {
      feedback.description = dto.description;
    }

    if (dto.relatedEntities) {
      feedback.relatedEntities = [...feedback.relatedEntities, ...dto.relatedEntities];
    }

    feedback.updatedAt = new Date();

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Update feedback status (admin only)
   */
  async updateStatus(id: string, dto: UpdateFeedbackStatusDto, user: UserContext): Promise<FeedbackEntity> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can update feedback status');
    }

    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.updateStatus(dto.status, user.userId, dto.reason);

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Assign feedback to admin
   */
  async assignFeedback(id: string, dto: AssignFeedbackDto, user: UserContext): Promise<FeedbackEntity> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can assign feedback');
    }

    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.assign(dto.assignedTo, dto.assignedToName, user.userId);

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Add response to feedback
   */
  async addResponse(id: string, dto: AddResponseDto, user: UserContext): Promise<FeedbackEntity> {
    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    // Check access - admin or submitter
    const isAdminUser = this.isAdmin(user);
    const isSubmitter = feedback.submittedBy === user.userId;

    if (!isAdminUser && !isSubmitter) {
      throw new ForbiddenException('You do not have permission to respond to this feedback');
    }

    // Submitters cannot add internal notes
    if (!isAdminUser && dto.isInternal) {
      throw new ForbiddenException('Only admins can add internal notes');
    }

    // Check if user can respond (for submitter)
    if (isSubmitter && !isAdminUser && !feedback.canUserRespond()) {
      throw new BadRequestException('You can only respond when the feedback is awaiting your response');
    }

    feedback.addResponse({
      message: dto.message,
      respondedBy: user.userId,
      respondedByName: user.displayName,
      respondedByRole: user.role,
      isInternal: dto.isInternal || false,
    });

    // If submitter responded, update status back to IN_PROGRESS
    if (isSubmitter && feedback.status === FeedbackStatus.AWAITING_RESPONSE) {
      feedback.updateStatus(FeedbackStatus.IN_PROGRESS, user.userId, 'User responded');
    }

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Resolve feedback
   */
  async resolveFeedback(id: string, dto: ResolveFeedbackDto, user: UserContext): Promise<FeedbackEntity> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can resolve feedback');
    }

    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.resolve(dto.resolution, user.userId);

    // TODO: Send notification to user about resolution
    // await this.notifyUserOfResolution(feedback);

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Escalate feedback
   */
  async escalateFeedback(id: string, dto: EscalateFeedbackDto, user: UserContext): Promise<FeedbackEntity> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can escalate feedback');
    }

    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.escalate(dto.reason, user.userId);

    // TODO: Send notification about escalation
    // await this.notifyManagersOfEscalation(feedback);

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Close feedback
   */
  async closeFeedback(id: string, user: UserContext): Promise<FeedbackEntity> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can close feedback');
    }

    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    feedback.updateStatus(FeedbackStatus.CLOSED, user.userId, 'Feedback closed');

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Add satisfaction rating
   */
  async addSatisfactionRating(id: string, dto: AddSatisfactionRatingDto, user: UserContext): Promise<FeedbackEntity> {
    const feedback = await this.feedbackRepository.findById(id);
    
    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    // Only submitter can rate
    if (feedback.submittedBy !== user.userId) {
      throw new ForbiddenException('Only the submitter can rate the resolution');
    }

    // Can only rate resolved feedback
    if (feedback.status !== FeedbackStatus.RESOLVED && feedback.status !== FeedbackStatus.CLOSED) {
      throw new BadRequestException('Can only rate resolved or closed feedback');
    }

    feedback.addSatisfactionRating(dto.rating, dto.comment);

    return this.feedbackRepository.update(feedback);
  }

  /**
   * Get feedback statistics (admin only)
   */
  async getStats(user: UserContext, startDate?: Date, endDate?: Date): Promise<FeedbackStats> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can view statistics');
    }

    return this.feedbackRepository.getStats({ startDate, endDate });
  }

  /**
   * Get feedback related to an entity
   */
  async getFeedbackByRelatedEntity(
    entityType: string,
    entityId: string,
    user: UserContext,
  ): Promise<FeedbackEntity[]> {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException('Only admins can search by related entity');
    }

    return this.feedbackRepository.findByRelatedEntity(entityType, entityId);
  }

  /**
   * Check if user is admin
   */
  private isAdmin(user: UserContext): boolean {
    return user.role === 'ADMIN' || user.role === 'SUPPORT';
  }

  /**
   * Check access permission
   */
  private checkAccessPermission(feedback: FeedbackEntity, user: UserContext): void {
    const isAdminUser = this.isAdmin(user);
    const isSubmitter = feedback.submittedBy === user.userId;

    if (!isAdminUser && !isSubmitter) {
      throw new ForbiddenException('You do not have permission to view this feedback');
    }
  }
}
