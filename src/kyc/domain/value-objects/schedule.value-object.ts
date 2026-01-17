/**
 * Schedule Value Object
 * Handles scheduling and time slot management
 */
export class Schedule {
  constructor(
    public readonly scheduledDate: Date,
    public readonly preferredTimeStart: string, // HH:mm format
    public readonly preferredTimeEnd: string,   // HH:mm format
    public readonly timezone: string = 'Africa/Lagos',
    public readonly reminderSent: boolean = false,
    public readonly rescheduledFrom?: Date,
    public readonly rescheduledReason?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    
    if (!timeRegex.test(this.preferredTimeStart)) {
      throw new Error('Invalid preferred time start format. Use HH:mm');
    }
    if (!timeRegex.test(this.preferredTimeEnd)) {
      throw new Error('Invalid preferred time end format. Use HH:mm');
    }
    
    const [startHour, startMin] = this.preferredTimeStart.split(':').map(Number);
    const [endHour, endMin] = this.preferredTimeEnd.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes >= endMinutes) {
      throw new Error('Preferred time end must be after start time');
    }
  }

  /**
   * Check if visit can still be rescheduled (1 hour before cutoff)
   */
  canReschedule(): boolean {
    const cutoffTime = new Date(this.scheduledDate);
    const [hour, min] = this.preferredTimeStart.split(':').map(Number);
    cutoffTime.setHours(hour - 1, min, 0, 0);
    
    return new Date() < cutoffTime;
  }

  /**
   * Check if it's the day of visit (for morning reminder)
   */
  isVisitDay(): boolean {
    const today = new Date();
    return (
      today.getFullYear() === this.scheduledDate.getFullYear() &&
      today.getMonth() === this.scheduledDate.getMonth() &&
      today.getDate() === this.scheduledDate.getDate()
    );
  }

  /**
   * Get formatted date string
   */
  get formattedDate(): string {
    return this.scheduledDate.toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get formatted time range
   */
  get formattedTimeRange(): string {
    return `${this.preferredTimeStart} - ${this.preferredTimeEnd}`;
  }

  /**
   * Alias for preferredTimeStart for convenience
   */
  get startTime(): string {
    return this.preferredTimeStart;
  }

  /**
   * Alias for preferredTimeEnd for convenience
   */
  get endTime(): string {
    return this.preferredTimeEnd;
  }

  /**
   * Create rescheduled schedule
   */
  reschedule(newDate: Date, newTimeStart: string, newTimeEnd: string, reason: string): Schedule {
    return new Schedule(
      newDate,
      newTimeStart,
      newTimeEnd,
      this.timezone,
      false,
      this.scheduledDate,
      reason,
    );
  }

  /**
   * Mark reminder as sent
   */
  markReminderSent(): Schedule {
    return new Schedule(
      this.scheduledDate,
      this.preferredTimeStart,
      this.preferredTimeEnd,
      this.timezone,
      true,
      this.rescheduledFrom,
      this.rescheduledReason,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      scheduledDate: this.scheduledDate.toISOString(),
      preferredTimeStart: this.preferredTimeStart,
      preferredTimeEnd: this.preferredTimeEnd,
      timezone: this.timezone,
      reminderSent: this.reminderSent,
      rescheduledFrom: this.rescheduledFrom?.toISOString(),
      rescheduledReason: this.rescheduledReason,
    };
  }

  static fromJSON(data: Record<string, unknown>): Schedule {
    return new Schedule(
      new Date(data.scheduledDate as string),
      data.preferredTimeStart as string,
      data.preferredTimeEnd as string,
      data.timezone as string,
      data.reminderSent as boolean,
      data.rescheduledFrom ? new Date(data.rescheduledFrom as string) : undefined,
      data.rescheduledReason as string | undefined,
    );
  }
}
