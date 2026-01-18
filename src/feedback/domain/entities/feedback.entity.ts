/**
 * Feedback Entity
 * Core aggregate root for feedback and complaints
 */
import { v4 as uuidv4 } from 'uuid';
import {
  FeedbackType,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackSource,
  isValidFeedbackTransition,
} from '../enums';

/**
 * Attachment for feedback
 */
export interface FeedbackAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

/**
 * Response/comment on feedback
 */
export interface FeedbackResponse {
  id: string;
  message: string;
  respondedBy: string;
  respondedByName: string;
  respondedByRole: string;
  isInternal: boolean; // Internal notes not visible to user
  attachments?: FeedbackAttachment[];
  createdAt: Date;
}

/**
 * Status history entry
 */
export interface FeedbackStatusHistory {
  status: FeedbackStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

/**
 * Related entity reference
 */
export interface RelatedEntity {
  entityType: 'KYC_REQUEST' | 'VERIFICATION_REQUEST' | 'PAYMENT' | 'AGENT' | 'OTHER';
  entityId: string;
  description?: string;
}

/**
 * Feedback Entity Props
 */
export interface FeedbackProps {
  id?: string;
  ticketNumber?: string;
  type: FeedbackType;
  category: FeedbackCategory;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  source?: FeedbackSource;
  
  // Submitter info
  submittedBy: string;        // User ID
  submittedByEmail: string;
  submittedByName: string;
  submittedByRole: string;    // BANK, CLIENT, AGENT, ADMIN
  submittedByPhone?: string;
  
  // Content
  subject: string;
  description: string;
  attachments?: FeedbackAttachment[];
  
  // Related entities (optional)
  relatedEntities?: RelatedEntity[];
  
  // Assignment
  assignedTo?: string;        // Admin user ID
  assignedToName?: string;
  assignedAt?: Date;
  
  // Resolution
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  
  // Responses
  responses?: FeedbackResponse[];
  
  // Status history
  statusHistory?: FeedbackStatusHistory[];
  
  // Satisfaction rating (after resolution)
  satisfactionRating?: number; // 1-5
  satisfactionComment?: string;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Feedback Entity Class
 */
export class FeedbackEntity {
  readonly id: string;
  readonly ticketNumber: string;
  readonly type: FeedbackType;
  readonly category: FeedbackCategory;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  readonly source: FeedbackSource;
  
  // Submitter info
  readonly submittedBy: string;
  readonly submittedByEmail: string;
  readonly submittedByName: string;
  readonly submittedByRole: string;
  readonly submittedByPhone?: string;
  
  // Content
  readonly subject: string;
  description: string;
  attachments: FeedbackAttachment[];
  
  // Related entities
  relatedEntities: RelatedEntity[];
  
  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Date;
  
  // Resolution
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  
  // Responses
  responses: FeedbackResponse[];
  
  // Status history
  statusHistory: FeedbackStatusHistory[];
  
  // Satisfaction
  satisfactionRating?: number;
  satisfactionComment?: string;
  
  // Timestamps
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: FeedbackProps) {
    this.id = props.id || uuidv4();
    this.ticketNumber = props.ticketNumber || this.generateTicketNumber();
    this.type = props.type;
    this.category = props.category;
    this.priority = props.priority || FeedbackPriority.MEDIUM;
    this.status = props.status || FeedbackStatus.SUBMITTED;
    this.source = props.source || FeedbackSource.WEB_APP;
    
    this.submittedBy = props.submittedBy;
    this.submittedByEmail = props.submittedByEmail;
    this.submittedByName = props.submittedByName;
    this.submittedByRole = props.submittedByRole;
    this.submittedByPhone = props.submittedByPhone;
    
    this.subject = props.subject;
    this.description = props.description;
    this.attachments = props.attachments || [];
    
    this.relatedEntities = props.relatedEntities || [];
    
    this.assignedTo = props.assignedTo;
    this.assignedToName = props.assignedToName;
    this.assignedAt = props.assignedAt;
    
    this.resolution = props.resolution;
    this.resolvedBy = props.resolvedBy;
    this.resolvedAt = props.resolvedAt;
    
    this.responses = props.responses || [];
    this.statusHistory = props.statusHistory || [];
    
    this.satisfactionRating = props.satisfactionRating;
    this.satisfactionComment = props.satisfactionComment;
    
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  /**
   * Create new feedback
   */
  static create(props: FeedbackProps): FeedbackEntity {
    const feedback = new FeedbackEntity(props);
    
    // Add initial status to history
    if (feedback.statusHistory.length === 0) {
      feedback.statusHistory.push({
        status: FeedbackStatus.SUBMITTED,
        changedAt: feedback.createdAt,
        changedBy: props.submittedBy,
        reason: 'Feedback submitted',
      });
    }
    
    return feedback;
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(data: FeedbackProps): FeedbackEntity {
    return new FeedbackEntity(data);
  }

  /**
   * Generate ticket number
   */
  private generateTicketNumber(): string {
    const prefix = this.type === FeedbackType.COMPLAINT ? 'CMP' : 'FBK';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Update status
   */
  updateStatus(newStatus: FeedbackStatus, changedBy: string, reason?: string): void {
    if (!isValidFeedbackTransition(this.status, newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }
    
    this.status = newStatus;
    this.updatedAt = new Date();
    this.statusHistory.push({
      status: newStatus,
      changedAt: this.updatedAt,
      changedBy,
      reason,
    });
  }

  /**
   * Assign to admin
   */
  assign(adminId: string, adminName: string, assignedBy: string): void {
    this.assignedTo = adminId;
    this.assignedToName = adminName;
    this.assignedAt = new Date();
    this.updatedAt = new Date();
    
    if (this.status === FeedbackStatus.SUBMITTED) {
      this.updateStatus(FeedbackStatus.UNDER_REVIEW, assignedBy, `Assigned to ${adminName}`);
    }
  }

  /**
   * Add response
   */
  addResponse(response: Omit<FeedbackResponse, 'id' | 'createdAt'>): FeedbackResponse {
    const newResponse: FeedbackResponse = {
      ...response,
      id: uuidv4(),
      createdAt: new Date(),
    };
    
    this.responses.push(newResponse);
    this.updatedAt = new Date();
    
    return newResponse;
  }

  /**
   * Resolve feedback
   */
  resolve(resolution: string, resolvedBy: string): void {
    this.resolution = resolution;
    this.resolvedBy = resolvedBy;
    this.resolvedAt = new Date();
    this.updateStatus(FeedbackStatus.RESOLVED, resolvedBy, 'Issue resolved');
  }

  /**
   * Escalate feedback
   */
  escalate(reason: string, escalatedBy: string): void {
    this.priority = FeedbackPriority.URGENT;
    this.updateStatus(FeedbackStatus.ESCALATED, escalatedBy, reason);
  }

  /**
   * Add satisfaction rating
   */
  addSatisfactionRating(rating: number, comment?: string): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    this.satisfactionRating = rating;
    this.satisfactionComment = comment;
    this.updatedAt = new Date();
  }

  /**
   * Add attachment
   */
  addAttachment(attachment: Omit<FeedbackAttachment, 'id' | 'uploadedAt'>): FeedbackAttachment {
    const newAttachment: FeedbackAttachment = {
      ...attachment,
      id: uuidv4(),
      uploadedAt: new Date(),
    };
    
    this.attachments.push(newAttachment);
    this.updatedAt = new Date();
    
    return newAttachment;
  }

  /**
   * Check if feedback is open
   */
  isOpen(): boolean {
    return ![FeedbackStatus.CLOSED, FeedbackStatus.REJECTED, FeedbackStatus.RESOLVED].includes(this.status);
  }

  /**
   * Check if user can respond
   */
  canUserRespond(): boolean {
    return this.status === FeedbackStatus.AWAITING_RESPONSE;
  }

  /**
   * Convert to plain object
   */
  toObject(): FeedbackProps {
    return {
      id: this.id,
      ticketNumber: this.ticketNumber,
      type: this.type,
      category: this.category,
      priority: this.priority,
      status: this.status,
      source: this.source,
      submittedBy: this.submittedBy,
      submittedByEmail: this.submittedByEmail,
      submittedByName: this.submittedByName,
      submittedByRole: this.submittedByRole,
      submittedByPhone: this.submittedByPhone,
      subject: this.subject,
      description: this.description,
      attachments: this.attachments,
      relatedEntities: this.relatedEntities,
      assignedTo: this.assignedTo,
      assignedToName: this.assignedToName,
      assignedAt: this.assignedAt,
      resolution: this.resolution,
      resolvedBy: this.resolvedBy,
      resolvedAt: this.resolvedAt,
      responses: this.responses,
      statusHistory: this.statusHistory,
      satisfactionRating: this.satisfactionRating,
      satisfactionComment: this.satisfactionComment,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
