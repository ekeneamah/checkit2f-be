import { RecurringFrequency } from '../enums';

/**
 * Recurring Schedule Status
 * Tracks the overall status of a recurring schedule
 */
export type RecurringScheduleStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

/**
 * Recurring occurrence data
 */
export interface IRecurringOccurrence {
  occurrenceNumber: number;
  scheduledDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  agentId?: string;
  companyId?: string;
  completedAt?: Date;
  deliverableId?: string;
  /** Custom instructions for this specific occurrence (user can edit for upcoming visits) */
  instructions?: string;
  /** Reason for cancellation or failure */
  notes?: string;
  /** Reminder sent timestamp */
  reminderSentAt?: Date;
  /** Whether admin has been notified about this occurrence */
  adminNotified?: boolean;
}

/**
 * Recurring Schedule Value Object (Immutable)
 * Domain-Driven Design: Value Object pattern
 */
export class RecurringScheduleVO {
  private readonly _frequency: RecurringFrequency;
  private readonly _startDate: Date;
  private readonly _endDate: Date;
  private readonly _totalOccurrences: number;
  private readonly _occurrences: ReadonlyArray<IRecurringOccurrence>;
  private readonly _status: RecurringScheduleStatus;
  private readonly _defaultInstructions: string;
  private readonly _pricePerOccurrence: number;
  private readonly _totalPricePaid: number;
  private readonly _discountPercentage: number;
  private readonly _cancelledAt?: Date;
  private readonly _cancellationReason?: string;

  constructor(
    frequency: RecurringFrequency,
    startDate: Date,
    totalOccurrences: number,
    occurrences: IRecurringOccurrence[] = [],
    options?: {
      status?: RecurringScheduleStatus;
      defaultInstructions?: string;
      pricePerOccurrence?: number;
      totalPricePaid?: number;
      discountPercentage?: number;
      cancelledAt?: Date;
      cancellationReason?: string;
    },
  ) {
    this.validate(frequency, startDate, totalOccurrences);
    
    this._frequency = frequency;
    this._startDate = new Date(startDate);
    this._totalOccurrences = totalOccurrences;
    this._endDate = this.calculateEndDate(frequency, startDate, totalOccurrences);
    this._occurrences = Object.freeze([...occurrences]);
    this._status = options?.status || 'ACTIVE';
    this._defaultInstructions = options?.defaultInstructions || '';
    this._pricePerOccurrence = options?.pricePerOccurrence || 0;
    this._totalPricePaid = options?.totalPricePaid || 0;
    this._discountPercentage = options?.discountPercentage || 0;
    this._cancelledAt = options?.cancelledAt;
    this._cancellationReason = options?.cancellationReason;
  }

  get frequency(): RecurringFrequency {
    return this._frequency;
  }

  get startDate(): Date {
    return new Date(this._startDate);
  }

  get endDate(): Date {
    return new Date(this._endDate);
  }

  get totalOccurrences(): number {
    return this._totalOccurrences;
  }

  get occurrences(): ReadonlyArray<IRecurringOccurrence> {
    return this._occurrences;
  }

  get status(): RecurringScheduleStatus {
    return this._status;
  }

  get defaultInstructions(): string {
    return this._defaultInstructions;
  }

  get pricePerOccurrence(): number {
    return this._pricePerOccurrence;
  }

  get totalPricePaid(): number {
    return this._totalPricePaid;
  }

  get discountPercentage(): number {
    return this._discountPercentage;
  }

  get cancelledAt(): Date | undefined {
    return this._cancelledAt ? new Date(this._cancelledAt) : undefined;
  }

  get cancellationReason(): string | undefined {
    return this._cancellationReason;
  }

  /**
   * Get completed occurrences count
   */
  getCompletedCount(): number {
    return this._occurrences.filter((occ) => occ.status === 'COMPLETED').length;
  }

  /**
   * Get pending occurrences count
   */
  getPendingCount(): number {
    return this._occurrences.filter((occ) => occ.status === 'PENDING').length;
  }

  /**
   * Get next scheduled occurrence date
   */
  getNextScheduledDate(): Date | null {
    const pending = this._occurrences.find((occ) => occ.status === 'PENDING');
    return pending ? new Date(pending.scheduledDate) : null;
  }

  /**
   * Check if schedule is complete
   */
  isComplete(): boolean {
    return this.getCompletedCount() === this._totalOccurrences;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    return (this.getCompletedCount() / this._totalOccurrences) * 100;
  }

  /**
   * Calculate end date based on frequency and occurrences
   */
  private calculateEndDate(
    frequency: RecurringFrequency,
    startDate: Date,
    totalOccurrences: number,
  ): Date {
    const end = new Date(startDate);

    switch (frequency) {
      case RecurringFrequency.DAILY:
        end.setDate(end.getDate() + (totalOccurrences - 1));
        break;
      case RecurringFrequency.WEEKLY:
        end.setDate(end.getDate() + (totalOccurrences - 1) * 7);
        break;
      case RecurringFrequency.MONTHLY:
        end.setMonth(end.getMonth() + (totalOccurrences - 1));
        break;
    }

    return end;
  }

  /**
   * Generate all occurrence dates
   */
  generateOccurrenceDates(): Date[] {
    const dates: Date[] = [];
    const current = new Date(this._startDate);

    for (let i = 0; i < this._totalOccurrences; i++) {
      dates.push(new Date(current));

      switch (this._frequency) {
        case RecurringFrequency.DAILY:
          current.setDate(current.getDate() + 1);
          break;
        case RecurringFrequency.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;
        case RecurringFrequency.MONTHLY:
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }

  /**
   * Get human-readable breakdown
   */
  getBreakdown(): string {
    const completed = this.getCompletedCount();
    const total = this._totalOccurrences;
    const frequency = this._frequency.toLowerCase();
    
    return `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} schedule: ${completed}/${total} completed`;
  }

  /**
   * Calculate refund amount if cancelled now
   * Returns amount in kobo/cents
   */
  calculateRefundAmount(): number {
    const completedCount = this.getCompletedCount();
    const remainingOccurrences = this._totalOccurrences - completedCount;
    
    if (remainingOccurrences <= 0) {
      return 0;
    }

    // Calculate value of completed occurrences (without discount - they got the service)
    const completedValue = this._pricePerOccurrence * completedCount;
    
    // Refund is total paid minus value of completed occurrences
    const refundAmount = this._totalPricePaid - completedValue;
    
    return Math.max(0, Math.round(refundAmount));
  }

  /**
   * Get remaining occurrences count
   */
  getRemainingCount(): number {
    return this._totalOccurrences - this.getCompletedCount();
  }

  /**
   * Get the next pending occurrence
   */
  getNextPendingOccurrence(): IRecurringOccurrence | null {
    return this._occurrences.find((occ) => occ.status === 'PENDING') || null;
  }

  /**
   * Check if an occurrence needs admin reminder
   * Daily: 6 hours before, Weekly/Monthly: 48 hours before
   */
  getOccurrencesNeedingReminder(): IRecurringOccurrence[] {
    const now = new Date();
    const remindersNeeded: IRecurringOccurrence[] = [];

    for (const occ of this._occurrences) {
      if (occ.status !== 'PENDING' || occ.adminNotified) {
        continue;
      }

      const scheduledDate = new Date(occ.scheduledDate);
      const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Daily: remind 6 hours before
      // Weekly/Monthly: remind 48 hours before
      const reminderHours = this._frequency === RecurringFrequency.DAILY ? 6 : 48;

      if (hoursUntil <= reminderHours && hoursUntil > 0) {
        remindersNeeded.push(occ);
      }
    }

    return remindersNeeded;
  }

  /**
   * Create a new schedule with updated occurrence instructions
   * Returns a new immutable instance
   */
  withUpdatedOccurrenceInstructions(
    occurrenceNumber: number,
    instructions: string,
  ): RecurringScheduleVO {
    const updatedOccurrences = this._occurrences.map((occ) => {
      if (occ.occurrenceNumber === occurrenceNumber && occ.status === 'PENDING') {
        return { ...occ, instructions };
      }
      return occ;
    });

    return new RecurringScheduleVO(
      this._frequency,
      this._startDate,
      this._totalOccurrences,
      updatedOccurrences as IRecurringOccurrence[],
      {
        status: this._status,
        defaultInstructions: this._defaultInstructions,
        pricePerOccurrence: this._pricePerOccurrence,
        totalPricePaid: this._totalPricePaid,
        discountPercentage: this._discountPercentage,
        cancelledAt: this._cancelledAt,
        cancellationReason: this._cancellationReason,
      },
    );
  }

  /**
   * Create a new cancelled schedule
   * Returns a new immutable instance
   */
  withCancellation(reason: string): RecurringScheduleVO {
    // Mark all pending occurrences as cancelled
    const updatedOccurrences = this._occurrences.map((occ) => {
      if (occ.status === 'PENDING') {
        return { ...occ, status: 'CANCELLED' as const, notes: reason };
      }
      return occ;
    });

    return new RecurringScheduleVO(
      this._frequency,
      this._startDate,
      this._totalOccurrences,
      updatedOccurrences as IRecurringOccurrence[],
      {
        status: 'CANCELLED',
        defaultInstructions: this._defaultInstructions,
        pricePerOccurrence: this._pricePerOccurrence,
        totalPricePaid: this._totalPricePaid,
        discountPercentage: this._discountPercentage,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    );
  }

  /**
   * Create a new schedule with occurrence marked as completed
   * Returns a new immutable instance
   */
  withCompletedOccurrence(
    occurrenceNumber: number,
    agentId: string,
    deliverableId?: string,
  ): RecurringScheduleVO {
    const updatedOccurrences = this._occurrences.map((occ) => {
      if (occ.occurrenceNumber === occurrenceNumber) {
        return {
          ...occ,
          status: 'COMPLETED' as const,
          agentId,
          completedAt: new Date(),
          deliverableId,
        };
      }
      return occ;
    });

    // Check if all occurrences are now complete
    const allComplete = updatedOccurrences.every(
      (occ) => occ.status === 'COMPLETED' || occ.status === 'CANCELLED' || occ.status === 'SKIPPED',
    );

    return new RecurringScheduleVO(
      this._frequency,
      this._startDate,
      this._totalOccurrences,
      updatedOccurrences as IRecurringOccurrence[],
      {
        status: allComplete ? 'COMPLETED' : this._status,
        defaultInstructions: this._defaultInstructions,
        pricePerOccurrence: this._pricePerOccurrence,
        totalPricePaid: this._totalPricePaid,
        discountPercentage: this._discountPercentage,
        cancelledAt: this._cancelledAt,
        cancellationReason: this._cancellationReason,
      },
    );
  }

  /**
   * Create a new schedule with admin notified for occurrence
   */
  withAdminNotified(occurrenceNumber: number): RecurringScheduleVO {
    const updatedOccurrences = this._occurrences.map((occ) => {
      if (occ.occurrenceNumber === occurrenceNumber) {
        return { ...occ, adminNotified: true, reminderSentAt: new Date() };
      }
      return occ;
    });

    return new RecurringScheduleVO(
      this._frequency,
      this._startDate,
      this._totalOccurrences,
      updatedOccurrences as IRecurringOccurrence[],
      {
        status: this._status,
        defaultInstructions: this._defaultInstructions,
        pricePerOccurrence: this._pricePerOccurrence,
        totalPricePaid: this._totalPricePaid,
        discountPercentage: this._discountPercentage,
        cancelledAt: this._cancelledAt,
        cancellationReason: this._cancellationReason,
      },
    );
  }

  /**
   * Validate schedule parameters
   */
  private validate(
    frequency: RecurringFrequency,
    startDate: Date,
    totalOccurrences: number,
  ): void {
    if (!frequency) {
      throw new Error('Frequency is required');
    }

    if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (totalOccurrences < 1) {
      throw new Error('Total occurrences must be at least 1');
    }

    if (totalOccurrences > 365) {
      throw new Error('Total occurrences cannot exceed 365');
    }

    // Start date should not be in the past (allow same day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    if (start < today) {
      throw new Error('Start date cannot be in the past');
    }
  }

  /**
   * Create from plain object (for Firestore deserialization)
   */
  static fromPlainObject(data: {
    frequency: RecurringFrequency;
    startDate: Date | string;
    totalOccurrences: number;
    occurrences?: IRecurringOccurrence[];
    status?: RecurringScheduleStatus;
    defaultInstructions?: string;
    pricePerOccurrence?: number;
    totalPricePaid?: number;
    discountPercentage?: number;
    cancelledAt?: Date | string;
    cancellationReason?: string;
  }): RecurringScheduleVO {
    const startDate = typeof data.startDate === 'string' 
      ? new Date(data.startDate) 
      : data.startDate;
    
    const cancelledAt = data.cancelledAt 
      ? (typeof data.cancelledAt === 'string' ? new Date(data.cancelledAt) : data.cancelledAt)
      : undefined;
    
    return new RecurringScheduleVO(
      data.frequency,
      startDate,
      data.totalOccurrences,
      data.occurrences || [],
      {
        status: data.status,
        defaultInstructions: data.defaultInstructions,
        pricePerOccurrence: data.pricePerOccurrence,
        totalPricePaid: data.totalPricePaid,
        discountPercentage: data.discountPercentage,
        cancelledAt,
        cancellationReason: data.cancellationReason,
      },
    );
  }

  /**
   * Convert to plain object (for Firestore serialization)
   */
  toPlainObject() {
    return {
      frequency: this._frequency,
      startDate: this._startDate,
      endDate: this._endDate,
      totalOccurrences: this._totalOccurrences,
      occurrences: Array.from(this._occurrences),
      status: this._status,
      defaultInstructions: this._defaultInstructions,
      pricePerOccurrence: this._pricePerOccurrence,
      totalPricePaid: this._totalPricePaid,
      discountPercentage: this._discountPercentage,
      cancelledAt: this._cancelledAt,
      cancellationReason: this._cancellationReason,
    };
  }

  /**
   * Create initial occurrences for a new schedule
   */
  static createWithOccurrences(
    frequency: RecurringFrequency,
    startDate: Date,
    totalOccurrences: number,
    defaultInstructions: string,
    pricePerOccurrence: number,
    totalPricePaid: number,
    discountPercentage: number,
  ): RecurringScheduleVO {
    const occurrences: IRecurringOccurrence[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < totalOccurrences; i++) {
      occurrences.push({
        occurrenceNumber: i + 1,
        scheduledDate: new Date(current),
        status: 'PENDING',
        instructions: defaultInstructions,
        adminNotified: false,
      });

      // Move to next occurrence date
      switch (frequency) {
        case RecurringFrequency.DAILY:
          current.setDate(current.getDate() + 1);
          break;
        case RecurringFrequency.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;
        case RecurringFrequency.MONTHLY:
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return new RecurringScheduleVO(
      frequency,
      startDate,
      totalOccurrences,
      occurrences,
      {
        status: 'ACTIVE',
        defaultInstructions,
        pricePerOccurrence,
        totalPricePaid,
        discountPercentage,
      },
    );
  }
}
