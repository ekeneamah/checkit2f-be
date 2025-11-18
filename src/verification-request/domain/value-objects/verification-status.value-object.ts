/**
 * Status enumeration for verification requests
 */
export enum VerificationRequestStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  SUBMITTED = 'SUBMITTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  REQUIRES_REVISION = 'REQUIRES_REVISION',
}

/**
 * VerificationRequestStatus value object
 * Immutable value object following DDD principles
 */
export class VerificationStatus {
  constructor(
    private readonly _status: VerificationRequestStatus,
    private readonly _reason?: string,
    private readonly _changedAt: Date = new Date(),
    private readonly _changedBy?: string,
  ) {
    this.validateStatus();
    this.validateStatusTransition();
  }

  get status(): VerificationRequestStatus {
    return this._status;
  }

  get reason(): string | undefined {
    return this._reason;
  }

  get changedAt(): Date {
    return this._changedAt;
  }

  get changedBy(): string | undefined {
    return this._changedBy;
  }

  /**
   * Validate status
   */
  private validateStatus(): void {
    if (!Object.values(VerificationRequestStatus).includes(this._status)) {
      throw new Error('Invalid verification request status');
    }
  }

  /**
   * Validate status transitions and required reasons
   */
  private validateStatusTransition(): void {
    const statusesRequiringReason = [
      VerificationRequestStatus.CANCELLED,
      VerificationRequestStatus.REJECTED,
      VerificationRequestStatus.REQUIRES_REVISION,
    ];

    if (statusesRequiringReason.includes(this._status) && !this._reason) {
      throw new Error(`Status '${this._status}' requires a reason`);
    }
  }

  /**
   * Check if status is final (cannot be changed)
   */
  public isFinal(): boolean {
    const finalStatuses = [
      VerificationRequestStatus.COMPLETED,
      VerificationRequestStatus.CANCELLED,
      VerificationRequestStatus.REJECTED,
    ];

    return finalStatuses.includes(this._status);
  }

  /**
   * Check if status allows assignment
   */
  public canBeAssigned(): boolean {
    const assignableStatuses = [
      VerificationRequestStatus.SUBMITTED,
      VerificationRequestStatus.REQUIRES_REVISION,
    ];

    return assignableStatuses.includes(this._status);
  }

  /**
   * Check if status allows progress updates
   */
  public canProgress(): boolean {
    const progressableStatuses = [
      VerificationRequestStatus.ASSIGNED,
      VerificationRequestStatus.IN_PROGRESS,
    ];

    return progressableStatuses.includes(this._status);
  }

  /**
   * Check if status allows cancellation
   */
  public canBeCancelled(): boolean {
    const cancellableStatuses = [
      VerificationRequestStatus.DRAFT,
      VerificationRequestStatus.SUBMITTED,
      VerificationRequestStatus.ASSIGNED,
    ];

    return cancellableStatuses.includes(this._status);
  }

  /**
   * Get valid next statuses
   */
  public getValidNextStatuses(): VerificationRequestStatus[] {
    const transitions: Record<VerificationRequestStatus, VerificationRequestStatus[]> = {
      [VerificationRequestStatus.DRAFT]: [
        VerificationRequestStatus.PENDING_PAYMENT,
        VerificationRequestStatus.SUBMITTED,
        VerificationRequestStatus.CANCELLED,
      ],
      [VerificationRequestStatus.PENDING_PAYMENT]: [
        VerificationRequestStatus.SUBMITTED,
        VerificationRequestStatus.CANCELLED,
      ],
      [VerificationRequestStatus.SUBMITTED]: [
        VerificationRequestStatus.ASSIGNED,
        VerificationRequestStatus.REJECTED,
        VerificationRequestStatus.CANCELLED,
      ],
      [VerificationRequestStatus.ASSIGNED]: [
        VerificationRequestStatus.IN_PROGRESS,
        VerificationRequestStatus.CANCELLED,
        VerificationRequestStatus.REQUIRES_REVISION,
      ],
      [VerificationRequestStatus.IN_PROGRESS]: [
        VerificationRequestStatus.COMPLETED,
        VerificationRequestStatus.REQUIRES_REVISION,
        VerificationRequestStatus.CANCELLED,
      ],
      [VerificationRequestStatus.REQUIRES_REVISION]: [
        VerificationRequestStatus.SUBMITTED,
        VerificationRequestStatus.CANCELLED,
      ],
      [VerificationRequestStatus.COMPLETED]: [],
      [VerificationRequestStatus.CANCELLED]: [],
      [VerificationRequestStatus.REJECTED]: [],
    };

    return transitions[this._status] || [];
  }

  /**
   * Check if transition to another status is valid
   */
  public canTransitionTo(newStatus: VerificationRequestStatus): boolean {
    return this.getValidNextStatuses().includes(newStatus);
  }

  /**
   * Get display name for status
   */
  public getDisplayName(): string {
    const displayNames: Record<VerificationRequestStatus, string> = {
      [VerificationRequestStatus.DRAFT]: 'Draft',
      [VerificationRequestStatus.PENDING_PAYMENT]: 'Pending Payment',
      [VerificationRequestStatus.SUBMITTED]: 'Submitted',
      [VerificationRequestStatus.ASSIGNED]: 'Assigned',
      [VerificationRequestStatus.IN_PROGRESS]: 'In Progress',
      [VerificationRequestStatus.COMPLETED]: 'Completed',
      [VerificationRequestStatus.CANCELLED]: 'Cancelled',
      [VerificationRequestStatus.REJECTED]: 'Rejected',
      [VerificationRequestStatus.REQUIRES_REVISION]: 'Requires Revision',
    };

    return displayNames[this._status];
  }

  /**
   * Get status color for UI
   */
  public getStatusColor(): string {
    const colors: Record<VerificationRequestStatus, string> = {
      [VerificationRequestStatus.DRAFT]: '#6b7280',
      [VerificationRequestStatus.PENDING_PAYMENT]: '#f59e0b',
      [VerificationRequestStatus.SUBMITTED]: '#3b82f6',
      [VerificationRequestStatus.ASSIGNED]: '#8b5cf6',
      [VerificationRequestStatus.IN_PROGRESS]: '#f59e0b',
      [VerificationRequestStatus.COMPLETED]: '#10b981',
      [VerificationRequestStatus.CANCELLED]: '#6b7280',
      [VerificationRequestStatus.REJECTED]: '#ef4444',
      [VerificationRequestStatus.REQUIRES_REVISION]: '#f97316',
    };

    return colors[this._status];
  }

  /**
   * Check equality with another status
   */
  public equals(other: VerificationStatus): boolean {
    return this._status === other._status;
  }

  /**
   * Convert to plain object
   */
  public toJSON(): Record<string, any> {
    return {
      status: this._status,
      reason: this._reason,
      changedAt: this._changedAt.toISOString(),
      changedBy: this._changedBy,
    };
  }

  /**
   * Create VerificationStatus from plain object
   */
  public static fromJSON(data: any): VerificationStatus {
    return new VerificationStatus(
      data.status,
      data.reason,
      new Date(data.changedAt),
      data.changedBy,
    );
  }

  /**
   * Create initial draft status
   */
  public static createDraft(): VerificationStatus {
    return new VerificationStatus(VerificationRequestStatus.DRAFT);
  }

  /**
   * Create pending payment status
   */
  public static createPendingPayment(): VerificationStatus {
    return new VerificationStatus(VerificationRequestStatus.PENDING_PAYMENT);
  }

  /**
   * Create submitted status
   */
  public static createSubmitted(): VerificationStatus {
    return new VerificationStatus(VerificationRequestStatus.SUBMITTED);
  }

  /**
   * Create cancelled status with reason
   */
  public static createCancelled(reason: string, cancelledBy?: string): VerificationStatus {
    return new VerificationStatus(
      VerificationRequestStatus.CANCELLED,
      reason,
      new Date(),
      cancelledBy,
    );
  }

  /**
   * Create rejected status with reason
   */
  public static createRejected(reason: string, rejectedBy?: string): VerificationStatus {
    return new VerificationStatus(
      VerificationRequestStatus.REJECTED,
      reason,
      new Date(),
      rejectedBy,
    );
  }
}