import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  VerificationRequest, 
  RecurringScheduleVO, 
  RecurringFrequency,
  Price,
} from '../../domain';
import { RecurringDiscountCalculator } from './pricing-calculators';

/**
 * Recurring Verification Service
 * Manages recurring verification schedules, cancellations, and refunds
 */
@Injectable()
export class RecurringVerificationService {
  private readonly logger = new Logger(RecurringVerificationService.name);

  constructor(
    private readonly recurringDiscountCalculator: RecurringDiscountCalculator,
  ) {}

  /**
   * Calculate pricing for a recurring verification
   * Returns total price, price per occurrence, and discount details
   */
  calculateRecurringPrice(
    basePrice: number,
    frequency: RecurringFrequency,
    occurrences: number,
    discountConfigs: Array<{ minOccurrences: number; discountPercentage: number }>,
  ): {
    basePrice: number;
    pricePerOccurrence: number;
    totalWithoutDiscount: number;
    discountPercentage: number;
    discountAmount: number;
    totalPrice: number;
    savings: number;
    frequency: RecurringFrequency;
    occurrences: number;
    frequencyLabel: string;
    scheduleDescription: string;
  } {
    // Find applicable discount based on occurrences
    const sortedConfigs = [...discountConfigs].sort((a, b) => b.minOccurrences - a.minOccurrences);
    const applicableDiscount = sortedConfigs.find(c => occurrences >= c.minOccurrences);
    const discountPercentage = applicableDiscount?.discountPercentage || 0;

    // Calculate totals
    const totalWithoutDiscount = basePrice * occurrences;
    const discountAmount = Math.round((totalWithoutDiscount * discountPercentage) / 100);
    const totalPrice = totalWithoutDiscount - discountAmount;
    const pricePerOccurrence = Math.round(totalPrice / occurrences);

    // Get frequency label
    const frequencyLabel = this.getFrequencyLabel(frequency);

    // Calculate schedule description
    const scheduleDescription = this.getScheduleDescription(frequency, occurrences);

    this.logger.log(`Calculated recurring price: ${occurrences}x ${frequency} = ₦${totalPrice / 100} (${discountPercentage}% discount)`);

    return {
      basePrice,
      pricePerOccurrence,
      totalWithoutDiscount,
      discountPercentage,
      discountAmount,
      totalPrice,
      savings: discountAmount,
      frequency,
      occurrences,
      frequencyLabel,
      scheduleDescription,
    };
  }

  /**
   * Create a recurring schedule for a verification request
   */
  createRecurringSchedule(
    frequency: RecurringFrequency,
    startDate: Date,
    occurrences: number,
    defaultInstructions: string,
    pricePerOccurrence: number,
    totalPricePaid: number,
    discountPercentage: number,
  ): RecurringScheduleVO {
    this.logger.log(`Creating recurring schedule: ${frequency}, ${occurrences} occurrences starting ${startDate.toISOString()}`);

    return RecurringScheduleVO.createWithOccurrences(
      frequency,
      startDate,
      occurrences,
      defaultInstructions,
      pricePerOccurrence,
      totalPricePaid,
      discountPercentage,
    );
  }

  /**
   * Calculate refund for cancelled recurring verification
   * Returns refund amount in kobo/cents
   */
  calculateCancellationRefund(request: VerificationRequest): {
    refundAmount: number;
    completedOccurrences: number;
    remainingOccurrences: number;
    totalOccurrences: number;
    completedValue: number;
    refundPercentage: number;
  } {
    if (!request.isRecurring || !request.recurringSchedule) {
      throw new BadRequestException('This is not a recurring verification request');
    }

    const schedule = request.recurringSchedule;
    const completedOccurrences = schedule.getCompletedCount();
    const totalOccurrences = schedule.totalOccurrences;
    const remainingOccurrences = totalOccurrences - completedOccurrences;

    // Calculate value of completed occurrences (at full price, no discount)
    const completedValue = schedule.pricePerOccurrence * completedOccurrences;
    
    // Refund is total paid minus value of completed
    const refundAmount = Math.max(0, schedule.totalPricePaid - completedValue);
    const refundPercentage = schedule.totalPricePaid > 0 
      ? Math.round((refundAmount / schedule.totalPricePaid) * 100) 
      : 0;

    this.logger.log(`Cancellation refund calculated: ₦${refundAmount / 100} (${refundPercentage}% of total)`);

    return {
      refundAmount,
      completedOccurrences,
      remainingOccurrences,
      totalOccurrences,
      completedValue,
      refundPercentage,
    };
  }

  /**
   * Get occurrences that need admin reminder
   * Daily: 6 hours before
   * Weekly/Monthly: 48 hours before
   */
  getOccurrencesNeedingReminder(
    requests: VerificationRequest[],
  ): Array<{
    requestId: string;
    clientId: string;
    occurrenceNumber: number;
    scheduledDate: Date;
    frequency: RecurringFrequency;
    hoursUntil: number;
  }> {
    const reminders: Array<{
      requestId: string;
      clientId: string;
      occurrenceNumber: number;
      scheduledDate: Date;
      frequency: RecurringFrequency;
      hoursUntil: number;
    }> = [];

    const now = new Date();

    for (const request of requests) {
      if (!request.isRecurring || !request.recurringSchedule) {
        continue;
      }

      if (request.recurringSchedule.status !== 'ACTIVE') {
        continue;
      }

      const schedule = request.recurringSchedule;
      const occurrencesNeedingReminder = schedule.getOccurrencesNeedingReminder();

      for (const occ of occurrencesNeedingReminder) {
        const scheduledDate = new Date(occ.scheduledDate);
        const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        reminders.push({
          requestId: request.id,
          clientId: request.clientId,
          occurrenceNumber: occ.occurrenceNumber,
          scheduledDate,
          frequency: schedule.frequency,
          hoursUntil: Math.round(hoursUntil * 10) / 10,
        });
      }
    }

    this.logger.log(`Found ${reminders.length} occurrences needing admin reminder`);

    return reminders;
  }

  /**
   * Update instructions for an upcoming occurrence
   */
  updateOccurrenceInstructions(
    request: VerificationRequest,
    occurrenceNumber: number,
    instructions: string,
  ): void {
    if (!request.isRecurring || !request.recurringSchedule) {
      throw new BadRequestException('This is not a recurring verification request');
    }

    // Check if occurrence exists and is pending
    const occurrence = request.recurringSchedule.occurrences.find(
      o => o.occurrenceNumber === occurrenceNumber,
    );

    if (!occurrence) {
      throw new NotFoundException(`Occurrence ${occurrenceNumber} not found`);
    }

    if (occurrence.status !== 'PENDING') {
      throw new BadRequestException(`Cannot update instructions for ${occurrence.status.toLowerCase()} occurrence`);
    }

    request.updateOccurrenceInstructions(occurrenceNumber, instructions);

    this.logger.log(`Updated instructions for occurrence ${occurrenceNumber} of request ${request.id}`);
  }

  /**
   * Get human-readable frequency label
   */
  private getFrequencyLabel(frequency: RecurringFrequency): string {
    switch (frequency) {
      case RecurringFrequency.DAILY:
        return 'Daily';
      case RecurringFrequency.WEEKLY:
        return 'Weekly';
      case RecurringFrequency.MONTHLY:
        return 'Monthly';
      default:
        return frequency;
    }
  }

  /**
   * Get schedule description
   */
  private getScheduleDescription(frequency: RecurringFrequency, occurrences: number): string {
    const frequencyLabel = this.getFrequencyLabel(frequency).toLowerCase();
    
    switch (frequency) {
      case RecurringFrequency.DAILY:
        return `${occurrences} ${frequencyLabel} visits over ${occurrences} days`;
      case RecurringFrequency.WEEKLY:
        return `${occurrences} ${frequencyLabel} visits over ${occurrences} weeks`;
      case RecurringFrequency.MONTHLY:
        return `${occurrences} ${frequencyLabel} visits over ${occurrences} months`;
      default:
        return `${occurrences} visits`;
    }
  }

  /**
   * Get estimated end date for recurring schedule
   */
  getEstimatedEndDate(
    frequency: RecurringFrequency,
    startDate: Date,
    occurrences: number,
  ): Date {
    const end = new Date(startDate);

    switch (frequency) {
      case RecurringFrequency.DAILY:
        end.setDate(end.getDate() + (occurrences - 1));
        break;
      case RecurringFrequency.WEEKLY:
        end.setDate(end.getDate() + (occurrences - 1) * 7);
        break;
      case RecurringFrequency.MONTHLY:
        end.setMonth(end.getMonth() + (occurrences - 1));
        break;
    }

    return end;
  }

  /**
   * Get next occurrence date based on frequency
   */
  getNextOccurrenceDate(
    currentDate: Date,
    frequency: RecurringFrequency,
  ): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case RecurringFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case RecurringFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RecurringFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  /**
   * Get reminder hours based on frequency
   * Daily: 6 hours before
   * Weekly/Monthly: 48 hours before
   */
  getReminderHours(frequency: RecurringFrequency): number {
    return frequency === RecurringFrequency.DAILY ? 6 : 48;
  }
}
