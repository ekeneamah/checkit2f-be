import { RecurringFrequency } from '../enums';

/**
 * Recurring occurrence data
 */
export interface IRecurringOccurrence {
  occurrenceNumber: number;
  scheduledDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  agentId?: string;
  completedAt?: Date;
  deliverableId?: string;
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

  constructor(
    frequency: RecurringFrequency,
    startDate: Date,
    totalOccurrences: number,
    occurrences: IRecurringOccurrence[] = [],
  ) {
    this.validate(frequency, startDate, totalOccurrences);
    
    this._frequency = frequency;
    this._startDate = new Date(startDate);
    this._totalOccurrences = totalOccurrences;
    this._endDate = this.calculateEndDate(frequency, startDate, totalOccurrences);
    this._occurrences = Object.freeze([...occurrences]);
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
  }): RecurringScheduleVO {
    const startDate = typeof data.startDate === 'string' 
      ? new Date(data.startDate) 
      : data.startDate;
    
    return new RecurringScheduleVO(
      data.frequency,
      startDate,
      data.totalOccurrences,
      data.occurrences || [],
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
    };
  }
}
