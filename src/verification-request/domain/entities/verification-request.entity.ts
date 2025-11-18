import { BaseEntity } from './base.entity';
import { Location } from '../value-objects/location.value-object';
import { Price } from '../value-objects/price.value-object';
import { VerificationType } from '../value-objects/verification-type.value-object';
import { VerificationStatus } from '../value-objects/verification-status.value-object';

/**
 * VerificationRequest domain entity
 * Core aggregate root for verification request business logic
 */
export class VerificationRequest extends BaseEntity {
  private _clientId: string;
  private _title: string;
  private _description: string;
  private _verificationType: VerificationType;
  private _location: Location;
  private _price: Price;
  private _status: VerificationStatus;
  private _assignedAgentId?: string;
  private _scheduledDate?: Date;
  private _estimatedCompletionDate?: Date;
  private _actualCompletionDate?: Date;
  private _attachments: string[];
  private _notes?: string;
  private _paymentId?: string;
  private _paymentReference?: string;
  private _paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  private _statusHistory: VerificationStatus[];

  constructor(
    clientId: string,
    title: string,
    description: string,
    verificationType: VerificationType,
    location: Location,
    price: Price,
    id?: string,
  ) {
    super(id);
    
    this._clientId = clientId;
    this._title = title;
    this._description = description;
    this._verificationType = verificationType;
    this._location = location;
    this._price = price;
    this._status = VerificationStatus.createDraft();
    this._attachments = [];
    this._paymentStatus = 'pending';
    this._statusHistory = [this._status];

    // Validate initial state
    this.validateRequest();
    this.calculateEstimatedCompletion();

    console.log(`VerificationRequest created: ${this.id} for client: ${clientId}`);
  }

  // Getters
  get clientId(): string {
    return this._clientId;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get verificationType(): VerificationType {
    return this._verificationType;
  }

  get location(): Location {
    return this._location;
  }

  get price(): Price {
    return this._price;
  }

  get status(): VerificationStatus {
    return this._status;
  }

  get assignedAgentId(): string | undefined {
    return this._assignedAgentId;
  }

  get scheduledDate(): Date | undefined {
    return this._scheduledDate;
  }

  get estimatedCompletionDate(): Date | undefined {
    return this._estimatedCompletionDate;
  }

  get actualCompletionDate(): Date | undefined {
    return this._actualCompletionDate;
  }

  get attachments(): string[] {
    return [...this._attachments];
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get paymentId(): string | undefined {
    return this._paymentId;
  }

  get paymentReference(): string | undefined {
    return this._paymentReference;
  }

  get paymentStatus(): string {
    return this._paymentStatus;
  }

  get statusHistory(): VerificationStatus[] {
    return [...this._statusHistory];
  }

  /**
   * Validate the verification request
   */
  private validateRequest(): void {
    if (!this._clientId || this._clientId.trim().length === 0) {
      throw new Error('Client ID is required');
    }

    if (!this._title || this._title.trim().length < 5) {
      throw new Error('Title must be at least 5 characters long');
    }

    if (!this._description || this._description.trim().length < 20) {
      throw new Error('Description must be at least 20 characters long');
    }

    console.log(`Validation passed for verification request: ${this.id}`);
  }

  /**
   * Calculate estimated completion date based on verification type
   */
  private calculateEstimatedCompletion(): void {
    const hoursToAdd = this._verificationType.getExpectedCompletionHours();
    this._estimatedCompletionDate = new Date();
    this._estimatedCompletionDate.setHours(
      this._estimatedCompletionDate.getHours() + hoursToAdd,
    );

    console.log(`Estimated completion calculated: ${this._estimatedCompletionDate.toISOString()}`);
  }

  /**
   * Set payment reference and mark as pending payment
   */
  public setPendingPayment(paymentReference: string): void {
    if (!paymentReference || paymentReference.trim().length === 0) {
      throw new Error('Payment reference is required');
    }

    this._paymentReference = paymentReference;
    this.changeStatus(VerificationStatus.createPendingPayment());
    console.log(`Payment reference set for verification request: ${this.id}`);
  }

  /**
   * Confirm payment and submit request
   */
  public confirmPayment(paymentId: string): void {
    if (this._status.status !== 'PENDING_PAYMENT') {
      throw new Error('Can only confirm payment for pending payment requests');
    }

    if (!paymentId || paymentId.trim().length === 0) {
      throw new Error('Payment ID is required');
    }

    this._paymentId = paymentId;
    this._paymentStatus = 'paid';
    this.changeStatus(VerificationStatus.createSubmitted());
    console.log(`Payment confirmed for verification request: ${this.id}`);
  }

  /**
   * Submit the verification request
   */
  public submit(): void {
    if (!this._status.canTransitionTo(VerificationStatus.createSubmitted().status)) {
      throw new Error('Cannot submit request in current status');
    }

    this.changeStatus(VerificationStatus.createSubmitted());
    console.log(`Verification request submitted: ${this.id}`);
  }

  /**
   * Assign agent to verification request
   */
  public assignAgent(agentId: string): void {
    if (!this._status.canBeAssigned()) {
      throw new Error('Cannot assign agent in current status');
    }

    if (!agentId || agentId.trim().length === 0) {
      throw new Error('Agent ID is required');
    }

    this._assignedAgentId = agentId;
    this.changeStatus(new VerificationStatus('ASSIGNED' as any));
    
    console.log(`Agent ${agentId} assigned to verification request: ${this.id}`);
  }

  /**
   * Start verification process
   */
  public startVerification(): void {
    if (!this._assignedAgentId) {
      throw new Error('Cannot start verification without assigned agent');
    }

    if (!this._status.canProgress()) {
      throw new Error('Cannot start verification in current status');
    }

    this.changeStatus(new VerificationStatus('IN_PROGRESS' as any));
    console.log(`Verification started for request: ${this.id}`);
  }

  /**
   * Complete verification request
   */
  public complete(): void {
    if (!this._status.canProgress()) {
      throw new Error('Cannot complete verification in current status');
    }

    this._actualCompletionDate = new Date();
    this.changeStatus(new VerificationStatus('COMPLETED' as any));
    
    console.log(`Verification completed for request: ${this.id}`);
  }

  /**
   * Cancel verification request
   */
  public cancel(reason: string, cancelledBy?: string): void {
    if (!this._status.canBeCancelled()) {
      throw new Error('Cannot cancel verification in current status');
    }

    this.changeStatus(VerificationStatus.createCancelled(reason, cancelledBy));
    console.log(`Verification cancelled for request: ${this.id}. Reason: ${reason}`);
  }

  /**
   * Reject verification request
   */
  public reject(reason: string, rejectedBy?: string): void {
    this.changeStatus(VerificationStatus.createRejected(reason, rejectedBy));
    console.log(`Verification rejected for request: ${this.id}. Reason: ${reason}`);
  }

  /**
   * Schedule verification
   */
  public schedule(scheduledDate: Date): void {
    if (scheduledDate <= new Date()) {
      throw new Error('Scheduled date must be in the future');
    }

    this._scheduledDate = scheduledDate;
    this.updateModified();
    
    console.log(`Verification scheduled for: ${scheduledDate.toISOString()}`);
  }

  /**
   * Add attachment
   */
  public addAttachment(attachmentUrl: string): void {
    if (!attachmentUrl || attachmentUrl.trim().length === 0) {
      throw new Error('Attachment URL is required');
    }

    if (this._attachments.includes(attachmentUrl)) {
      throw new Error('Attachment already exists');
    }

    this._attachments.push(attachmentUrl);
    this.updateModified();
    
    console.log(`Attachment added to verification request: ${this.id}`);
  }

  /**
   * Remove attachment
   */
  public removeAttachment(attachmentUrl: string): void {
    const index = this._attachments.indexOf(attachmentUrl);
    if (index === -1) {
      throw new Error('Attachment not found');
    }

    this._attachments.splice(index, 1);
    this.updateModified();
    
    console.log(`Attachment removed from verification request: ${this.id}`);
  }

  /**
   * Update notes
   */
  public updateNotes(notes: string): void {
    this._notes = notes;
    this.updateModified();
    
    console.log(`Notes updated for verification request: ${this.id}`);
  }

  /**
   * Update payment information
   */
  public updatePayment(paymentId: string, paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'): void {
    this._paymentId = paymentId;
    this._paymentStatus = paymentStatus;
    this.updateModified();
    
    console.log(`Payment updated for verification request: ${this.id}. Status: ${paymentStatus}`);
  }

  /**
   * Calculate total price including urgency multiplier
   */
  public calculateTotalPrice(): Price {
    const basePrice = new Price(this._verificationType.getBasePrice(), this._price.currency);
    const urgencyMultiplier = this._verificationType.getUrgencyMultiplier();
    
    return basePrice.multiply(urgencyMultiplier);
  }

  /**
   * Check if request is overdue
   */
  public isOverdue(): boolean {
    if (!this._estimatedCompletionDate || this._actualCompletionDate) {
      return false;
    }

    return new Date() > this._estimatedCompletionDate;
  }

  /**
   * Get duration since creation in hours
   */
  public getDurationHours(): number {
    const now = this._actualCompletionDate || new Date();
    const durationMs = now.getTime() - this.createdAt.getTime();
    return Math.round(durationMs / (1000 * 60 * 60));
  }

  /**
   * Change status and add to history
   */
  private changeStatus(newStatus: VerificationStatus): void {
    this._status = newStatus;
    this._statusHistory.push(newStatus);
    this.updateModified();
  }

  /**
   * Convert to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      clientId: this._clientId,
      title: this._title,
      description: this._description,
      verificationType: this._verificationType.toJSON(),
      location: this._location.toJSON(),
      price: this._price.toJSON(),
      status: this._status.toJSON(),
      assignedAgentId: this._assignedAgentId,
      scheduledDate: this._scheduledDate?.toISOString(),
      estimatedCompletionDate: this._estimatedCompletionDate?.toISOString(),
      actualCompletionDate: this._actualCompletionDate?.toISOString(),
      attachments: this._attachments,
      notes: this._notes,
      paymentId: this._paymentId,
      paymentReference: this._paymentReference,
      paymentStatus: this._paymentStatus,
      statusHistory: this._statusHistory.map(status => status.toJSON()),
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(data: any): VerificationRequest {
    const request = new VerificationRequest(
      data.clientId,
      data.title,
      data.description,
      VerificationType.fromJSON(data.verificationType),
      Location.fromJSON(data.location),
      Price.fromJSON(data.price),
      data.id,
    );

    // Restore additional properties
    request._status = VerificationStatus.fromJSON(data.status);
    request._assignedAgentId = data.assignedAgentId;
    request._scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : undefined;
    request._estimatedCompletionDate = data.estimatedCompletionDate 
      ? new Date(data.estimatedCompletionDate) : undefined;
    request._actualCompletionDate = data.actualCompletionDate 
      ? new Date(data.actualCompletionDate) : undefined;
    request._attachments = data.attachments || [];
    request._notes = data.notes;
    request._paymentId = data.paymentId;
    request._paymentReference = data.paymentReference;
    request._paymentStatus = data.paymentStatus || 'pending';
    request._statusHistory = data.statusHistory?.map((s: any) => VerificationStatus.fromJSON(s)) || [];

    return request;
  }
}