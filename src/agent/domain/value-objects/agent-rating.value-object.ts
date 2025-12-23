import { BadRequestException } from '@nestjs/common';

/**
 * Agent Rating Value Object
 * Represents agent's performance rating
 */
export class AgentRating {
  private constructor(
    private readonly _averageRating: number,
    private readonly _totalRatings: number,
    private readonly _completedVerifications: number,
    private readonly _successRate: number, // percentage
  ) {
    this.validate();
  }

  static create(
    averageRating: number = 0,
    totalRatings: number = 0,
    completedVerifications: number = 0,
    successRate: number = 100,
  ): AgentRating {
    return new AgentRating(averageRating, totalRatings, completedVerifications, successRate);
  }

  private validate(): void {
    if (this._averageRating < 0 || this._averageRating > 5) {
      throw new BadRequestException('Average rating must be between 0 and 5');
    }

    if (this._totalRatings < 0) {
      throw new BadRequestException('Total ratings cannot be negative');
    }

    if (this._completedVerifications < 0) {
      throw new BadRequestException('Completed verifications cannot be negative');
    }

    if (this._successRate < 0 || this._successRate > 100) {
      throw new BadRequestException('Success rate must be between 0 and 100');
    }
  }

  get averageRating(): number {
    return this._averageRating;
  }

  get totalRatings(): number {
    return this._totalRatings;
  }

  get completedVerifications(): number {
    return this._completedVerifications;
  }

  get successRate(): number {
    return this._successRate;
  }

  /**
   * Add a new rating
   */
  addRating(newRating: number): AgentRating {
    if (newRating < 1 || newRating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const newTotal = this._totalRatings + 1;
    const newAverage = (this._averageRating * this._totalRatings + newRating) / newTotal;

    return new AgentRating(
      newAverage,
      newTotal,
      this._completedVerifications,
      this._successRate,
    );
  }

  /**
   * Record a completed verification
   */
  recordCompletion(successful: boolean): AgentRating {
    const newCompleted = this._completedVerifications + 1;
    const totalAttempts = newCompleted;
    const successfulAttempts = Math.round((this._successRate / 100) * this._completedVerifications) + (successful ? 1 : 0);
    const newSuccessRate = (successfulAttempts / totalAttempts) * 100;

    return new AgentRating(
      this._averageRating,
      this._totalRatings,
      newCompleted,
      newSuccessRate,
    );
  }

  toJSON() {
    return {
      averageRating: this._averageRating,
      totalRatings: this._totalRatings,
      completedVerifications: this._completedVerifications,
      successRate: this._successRate,
    };
  }

  static fromJSON(data: any): AgentRating {
    return new AgentRating(
      data.averageRating || 0,
      data.totalRatings || 0,
      data.completedVerifications || 0,
      data.successRate || 100,
    );
  }
}
