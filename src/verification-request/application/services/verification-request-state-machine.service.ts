import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RequestStatus } from '../../domain/enums/request-status.enum';
import { IRequestTypeConfig } from '../../domain/interfaces/request-type-config.interface';

/**
 * State Transition Definition
 */
export interface IStateTransition {
  from: RequestStatus;
  to: RequestStatus;
  action: string;
  validations?: ((context: IRequestContext) => boolean)[];
  sideEffects?: ((context: IRequestContext) => Promise<void>)[];
}

/**
 * Request Context for state transitions
 */
export interface IRequestContext {
  requestId: string;
  currentStatus: RequestStatus;
  requestType: IRequestTypeConfig;
  agentId?: string;
  customerId: string;
  createdAt: Date;
  scheduledFor?: Date;
  isUrgent?: boolean;
  isRecurring?: boolean;
  metadata?: Record<string, any>;
}

/**
 * SLA Configuration
 */
export interface ISLAConfig {
  findAgentHours: number;
  completionHours: number;
  allowExtension: boolean;
  maxExtensionHours: number;
}

/**
 * Verification Request State Machine Service
 * Manages request lifecycle and status transitions
 * Follows Finite State Machine pattern
 */
@Injectable()
export class VerificationRequestStateMachineService {
  private readonly logger = new Logger(
    VerificationRequestStateMachineService.name,
  );

  private readonly transitions: Map<string, IStateTransition>;

  constructor() {
    this.transitions = this.initializeTransitions();
  }

  /**
   * Initialize all valid state transitions
   */
  private initializeTransitions(): Map<string, IStateTransition> {
    const transitions = new Map<string, IStateTransition>();

    // Helper to create transition key
    const key = (from: RequestStatus, action: string) => `${from}:${action}`;

    // CREATED → PENDING_ASSIGNMENT
    transitions.set(
      key(RequestStatus.CREATED, 'START_SEARCH'),
      {
        from: RequestStatus.CREATED,
        to: RequestStatus.PENDING_ASSIGNMENT,
        action: 'START_SEARCH',
      },
    );

    // PENDING_ASSIGNMENT → ASSIGNED (agent found and accepted)
    transitions.set(
      key(RequestStatus.PENDING_ASSIGNMENT, 'AGENT_ACCEPTED'),
      {
        from: RequestStatus.PENDING_ASSIGNMENT,
        to: RequestStatus.ASSIGNED,
        action: 'AGENT_ACCEPTED',
        validations: [this.validateAgentAssignment.bind(this)],
      },
    );

    // ASSIGNED → IN_PROGRESS
    transitions.set(
      key(RequestStatus.ASSIGNED, 'START_WORK'),
      {
        from: RequestStatus.ASSIGNED,
        to: RequestStatus.IN_PROGRESS,
        action: 'START_WORK',
      },
    );

    // IN_PROGRESS → COMPLETED
    transitions.set(
      key(RequestStatus.IN_PROGRESS, 'COMPLETE'),
      {
        from: RequestStatus.IN_PROGRESS,
        to: RequestStatus.COMPLETED,
        action: 'COMPLETE',
      },
    );

    // ASSIGNED/IN_PROGRESS → EXTENDED
    transitions.set(
      key(RequestStatus.ASSIGNED, 'EXTEND_SLA'),
      {
        from: RequestStatus.ASSIGNED,
        to: RequestStatus.EXTENDED,
        action: 'EXTEND_SLA',
        validations: [this.validateExtensionRequest.bind(this)],
      },
    );

    transitions.set(
      key(RequestStatus.IN_PROGRESS, 'EXTEND_SLA'),
      {
        from: RequestStatus.IN_PROGRESS,
        to: RequestStatus.EXTENDED,
        action: 'EXTEND_SLA',
        validations: [this.validateExtensionRequest.bind(this)],
      },
    );

    // EXTENDED → IN_PROGRESS (resume after extension)
    transitions.set(
      key(RequestStatus.EXTENDED, 'RESUME_WORK'),
      {
        from: RequestStatus.EXTENDED,
        to: RequestStatus.IN_PROGRESS,
        action: 'RESUME_WORK',
      },
    );

    // EXTENDED → COMPLETED
    transitions.set(
      key(RequestStatus.EXTENDED, 'COMPLETE'),
      {
        from: RequestStatus.EXTENDED,
        to: RequestStatus.COMPLETED,
        action: 'COMPLETE',
      },
    );

    // Any status → CANCELLED (by customer)
    [
      RequestStatus.CREATED,
      RequestStatus.PENDING_ASSIGNMENT,
      RequestStatus.SCHEDULED,
      RequestStatus.ASSIGNED,
    ].forEach((status) => {
      transitions.set(
        key(status, 'CANCEL_BY_CUSTOMER'),
        {
          from: status,
          to: RequestStatus.CANCELLED,
          action: 'CANCEL_BY_CUSTOMER',
        },
      );
    });

    // ASSIGNED/IN_PROGRESS → REASSIGNMENT_NEEDED (agent failed)
    [
      RequestStatus.ASSIGNED,
      RequestStatus.IN_PROGRESS,
      RequestStatus.EXTENDED,
    ].forEach((status) => {
      transitions.set(
        key(status, 'AGENT_FAILED'),
        {
          from: status,
          to: RequestStatus.REASSIGNMENT_NEEDED,
          action: 'AGENT_FAILED',
        },
      );
    });

    // REASSIGNMENT_NEEDED → PENDING_ASSIGNMENT (retry)
    transitions.set(
      key(RequestStatus.REASSIGNMENT_NEEDED, 'RETRY_ASSIGNMENT'),
      {
        from: RequestStatus.REASSIGNMENT_NEEDED,
        to: RequestStatus.PENDING_ASSIGNMENT,
        action: 'RETRY_ASSIGNMENT',
      },
    );

    // REASSIGNMENT_NEEDED → REFUNDED (no agent found after retries)
    transitions.set(
      key(RequestStatus.REASSIGNMENT_NEEDED, 'REFUND'),
      {
        from: RequestStatus.REASSIGNMENT_NEEDED,
        to: RequestStatus.REFUNDED,
        action: 'REFUND',
      },
    );

    // PENDING_ASSIGNMENT → REFUNDED (no agent found)
    transitions.set(
      key(RequestStatus.PENDING_ASSIGNMENT, 'NO_AGENT_FOUND'),
      {
        from: RequestStatus.PENDING_ASSIGNMENT,
        to: RequestStatus.REFUNDED,
        action: 'NO_AGENT_FOUND',
      },
    );

    // PENDING_ASSIGNMENT → EXPIRED (SLA breach)
    transitions.set(
      key(RequestStatus.PENDING_ASSIGNMENT, 'SLA_EXPIRED'),
      {
        from: RequestStatus.PENDING_ASSIGNMENT,
        to: RequestStatus.EXPIRED,
        action: 'SLA_EXPIRED',
      },
    );

    // ASSIGNED/IN_PROGRESS/EXTENDED → EXPIRED (completion SLA breach)
    [RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS, RequestStatus.EXTENDED].forEach(
      (status) => {
        transitions.set(
          key(status, 'COMPLETION_SLA_EXPIRED'),
          {
            from: status,
            to: RequestStatus.EXPIRED,
            action: 'COMPLETION_SLA_EXPIRED',
          },
        );
      },
    );

    // CREATED → SCHEDULED (for requests requiring scheduling)
    transitions.set(
      key(RequestStatus.CREATED, 'SCHEDULE'),
      {
        from: RequestStatus.CREATED,
        to: RequestStatus.SCHEDULED,
        action: 'SCHEDULE',
      },
    );

    // SCHEDULED → PENDING_ASSIGNMENT (when scheduled time arrives)
    transitions.set(
      key(RequestStatus.SCHEDULED, 'ACTIVATE_SCHEDULED'),
      {
        from: RequestStatus.SCHEDULED,
        to: RequestStatus.PENDING_ASSIGNMENT,
        action: 'ACTIVATE_SCHEDULED',
      },
    );

    // Recurring request transitions
    transitions.set(
      key(RequestStatus.COMPLETED, 'START_RECURRING'),
      {
        from: RequestStatus.COMPLETED,
        to: RequestStatus.RECURRING_ACTIVE,
        action: 'START_RECURRING',
      },
    );

    transitions.set(
      key(RequestStatus.RECURRING_ACTIVE, 'PAUSE_RECURRING'),
      {
        from: RequestStatus.RECURRING_ACTIVE,
        to: RequestStatus.RECURRING_PAUSED,
        action: 'PAUSE_RECURRING',
      },
    );

    transitions.set(
      key(RequestStatus.RECURRING_PAUSED, 'RESUME_RECURRING'),
      {
        from: RequestStatus.RECURRING_PAUSED,
        to: RequestStatus.RECURRING_ACTIVE,
        action: 'RESUME_RECURRING',
      },
    );

    transitions.set(
      key(RequestStatus.RECURRING_ACTIVE, 'COMPLETE_RECURRING'),
      {
        from: RequestStatus.RECURRING_ACTIVE,
        to: RequestStatus.RECURRING_COMPLETED,
        action: 'COMPLETE_RECURRING',
      },
    );

    return transitions;
  }

  /**
   * Attempt to transition request to new status
   */
  async transition(
    context: IRequestContext,
    action: string,
  ): Promise<RequestStatus> {
    this.logger.debug(
      `Attempting transition: ${context.currentStatus} -> ${action}`,
    );

    const transitionKey = `${context.currentStatus}:${action}`;
    const transition = this.transitions.get(transitionKey);

    if (!transition) {
      throw new BadRequestException(
        `Invalid transition: Cannot ${action} from ${context.currentStatus}`,
      );
    }

    // Run validations
    if (transition.validations) {
      for (const validation of transition.validations) {
        if (!validation(context)) {
          throw new BadRequestException(
            `Validation failed for transition ${action}`,
          );
        }
      }
    }

    // Execute side effects
    if (transition.sideEffects) {
      for (const sideEffect of transition.sideEffects) {
        await sideEffect(context);
      }
    }

    this.logger.log(
      `Transition successful: ${context.currentStatus} -> ${transition.to}`,
    );

    return transition.to;
  }

  /**
   * Check if a transition is valid
   */
  canTransition(currentStatus: RequestStatus, action: string): boolean {
    const transitionKey = `${currentStatus}:${action}`;
    return this.transitions.has(transitionKey);
  }

  /**
   * Get all possible actions for current status
   */
  getPossibleActions(currentStatus: RequestStatus): string[] {
    const actions: string[] = [];

    this.transitions.forEach((transition, key) => {
      if (transition.from === currentStatus) {
        actions.push(transition.action);
      }
    });

    return actions;
  }

  /**
   * Calculate SLA deadlines for a request
   */
  calculateSLADeadlines(
    requestType: IRequestTypeConfig,
    createdAt: Date,
    isUrgent: boolean = false,
  ): {
    findAgentDeadline: Date;
    completionDeadline: Date;
    slaConfig: ISLAConfig;
  } {
    const urgentMultiplier = isUrgent ? 0.5 : 1; // Urgent requests get 50% less time

    const findAgentHours = requestType.slaHours * urgentMultiplier;
    const completionHours = requestType.completionSlaHours * urgentMultiplier;

    const findAgentDeadline = new Date(createdAt);
    findAgentDeadline.setHours(findAgentDeadline.getHours() + findAgentHours);

    const completionDeadline = new Date(createdAt);
    completionDeadline.setHours(
      completionDeadline.getHours() + findAgentHours + completionHours,
    );

    return {
      findAgentDeadline,
      completionDeadline,
      slaConfig: {
        findAgentHours,
        completionHours,
        allowExtension: requestType.allowExtension,
        maxExtensionHours: requestType.extensionHours || 0,
      },
    };
  }

  /**
   * Check if request is overdue
   */
  isOverdue(
    currentStatus: RequestStatus,
    findAgentDeadline: Date,
    completionDeadline: Date,
  ): { isOverdue: boolean; reason?: string } {
    const now = new Date();

    if (
      currentStatus === RequestStatus.PENDING_ASSIGNMENT &&
      now > findAgentDeadline
    ) {
      return {
        isOverdue: true,
        reason: 'Failed to find agent within SLA',
      };
    }

    if (
      [RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS, RequestStatus.EXTENDED].includes(
        currentStatus,
      ) &&
      now > completionDeadline
    ) {
      return {
        isOverdue: true,
        reason: 'Failed to complete within SLA',
      };
    }

    return { isOverdue: false };
  }

  /**
   * Calculate next occurrence for recurring request
   */
  calculateNextOccurrence(
    scheduledFor: Date,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  ): Date {
    const nextDate = new Date(scheduledFor);

    switch (frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * Validate agent assignment
   */
  private validateAgentAssignment(context: IRequestContext): boolean {
    if (!context.agentId) {
      throw new BadRequestException('Agent ID is required for assignment');
    }
    return true;
  }

  /**
   * Validate extension request
   */
  private validateExtensionRequest(context: IRequestContext): boolean {
    if (!context.requestType.allowExtension) {
      throw new BadRequestException(
        'Extensions are not allowed for this request type',
      );
    }

    if (!context.requestType.extensionHours || context.requestType.extensionHours === 0) {
      throw new BadRequestException(
        'No extension hours configured for this request type',
      );
    }

    return true;
  }

  /**
   * Get request lifecycle timeline
   */
  getLifecycleTimeline(): {
    status: RequestStatus;
    description: string;
    isFinal: boolean;
  }[] {
    return [
      {
        status: RequestStatus.CREATED,
        description: 'Request created by customer',
        isFinal: false,
      },
      {
        status: RequestStatus.PENDING_ASSIGNMENT,
        description: 'Searching for qualified agent',
        isFinal: false,
      },
      {
        status: RequestStatus.SCHEDULED,
        description: 'Scheduled for future date/time',
        isFinal: false,
      },
      {
        status: RequestStatus.ASSIGNED,
        description: 'Agent accepted, preparing to start',
        isFinal: false,
      },
      {
        status: RequestStatus.IN_PROGRESS,
        description: 'Agent working on request',
        isFinal: false,
      },
      {
        status: RequestStatus.EXTENDED,
        description: 'SLA extended by customer',
        isFinal: false,
      },
      {
        status: RequestStatus.REASSIGNMENT_NEEDED,
        description: 'Agent failed, finding replacement',
        isFinal: false,
      },
      {
        status: RequestStatus.COMPLETED,
        description: 'Request completed successfully',
        isFinal: true,
      },
      {
        status: RequestStatus.CANCELLED,
        description: 'Request cancelled by customer',
        isFinal: true,
      },
      {
        status: RequestStatus.EXPIRED,
        description: 'Request expired due to SLA breach',
        isFinal: true,
      },
      {
        status: RequestStatus.REFUNDED,
        description: 'Request refunded to customer',
        isFinal: true,
      },
      {
        status: RequestStatus.RECURRING_ACTIVE,
        description: 'Recurring request active',
        isFinal: false,
      },
      {
        status: RequestStatus.RECURRING_PAUSED,
        description: 'Recurring request paused',
        isFinal: false,
      },
      {
        status: RequestStatus.RECURRING_COMPLETED,
        description: 'All recurring occurrences completed',
        isFinal: true,
      },
    ];
  }
}
