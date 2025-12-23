/**
 * Rejection reason enum
 */
export enum RejectionReason {
  INCORRECT_LOCATION = 'INCORRECT_LOCATION',
  INCOMPLETE_VERIFICATION = 'INCOMPLETE_VERIFICATION',
  POOR_PHOTO_QUALITY = 'POOR_PHOTO_QUALITY',
  MISSING_DOCUMENTS = 'MISSING_DOCUMENTS',
  INACCURATE_INFORMATION = 'INACCURATE_INFORMATION',
  WRONG_PROPERTY = 'WRONG_PROPERTY',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  TIMING_ISSUE = 'TIMING_ISSUE',
  OTHER = 'OTHER',
}

/**
 * Rejection details value object
 */
export class RejectionDetails {
  private readonly _reason: RejectionReason;
  private readonly _notes: string;
  private readonly _rejectedAt: Date;
  private readonly _rejectedBy: string;

  constructor(reason: RejectionReason, notes: string, rejectedBy: string) {
    this.validateRejection(reason, notes);
    
    this._reason = reason;
    this._notes = notes;
    this._rejectedAt = new Date();
    this._rejectedBy = rejectedBy;
  }

  get reason(): RejectionReason {
    return this._reason;
  }

  get notes(): string {
    return this._notes;
  }

  get rejectedAt(): Date {
    return this._rejectedAt;
  }

  get rejectedBy(): string {
    return this._rejectedBy;
  }

  private validateRejection(reason: RejectionReason, notes: string): void {
    if (!reason) {
      throw new Error('Rejection reason is required');
    }

    if (reason === RejectionReason.OTHER && (!notes || notes.trim().length < 10)) {
      throw new Error('Detailed notes are required when rejection reason is OTHER');
    }

    if (notes && notes.length > 500) {
      throw new Error('Rejection notes must not exceed 500 characters');
    }
  }

  toJSON(): Record<string, any> {
    return {
      reason: this._reason,
      notes: this._notes,
      rejectedAt: this._rejectedAt.toISOString(),
      rejectedBy: this._rejectedBy,
    };
  }
}
