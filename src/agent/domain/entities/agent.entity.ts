import { BadRequestException } from '@nestjs/common';
import { AgentStatus, AvailabilityStatus, VerificationSpecialization } from '../enums/agent.enum';
import { ServiceArea } from '../value-objects/service-area.value-object';
import { MultiCityServiceArea } from '../value-objects/multi-city-service-area.value-object';
import { AgentRating } from '../value-objects/agent-rating.value-object';
import { ContactInfo } from '../value-objects/contact-info.value-object';

/**
 * Agent Aggregate Root
 * Represents a verification agent in the system
 * 
 * Follows DDD principles:
 * - Encapsulates business logic
 * - Maintains invariants
 * - Exposes behavior through methods
 */
export class Agent {
  private constructor(
    private readonly _id: string,
    private readonly _firebaseUid: string,
    private _firstName: string,
    private _lastName: string,
    private _contactInfo: ContactInfo,
    private _serviceArea: ServiceArea | MultiCityServiceArea,
    private _specializations: VerificationSpecialization[],
    private _status: AgentStatus,
    private _availabilityStatus: AvailabilityStatus,
    private _rating: AgentRating,
    private _profilePhotoUrl?: string,
    private _idCardUrl?: string,
    private _certifications?: string[],
    private readonly _createdAt: Date = new Date(),
    private _modifiedAt: Date = new Date(),
    private _lastActiveAt?: Date,
  ) {
    this.validate();
  }

  /**
   * Factory method to create a new agent
   */
  static create(
    id: string,
    firebaseUid: string,
    firstName: string,
    lastName: string,
    contactInfo: ContactInfo,
    serviceArea: ServiceArea | MultiCityServiceArea,
    specializations: VerificationSpecialization[],
  ): Agent {
    return new Agent(
      id,
      firebaseUid,
      firstName,
      lastName,
      contactInfo,
      serviceArea,
      specializations,
      AgentStatus.INACTIVE, // New agents start as inactive until verified
      AvailabilityStatus.OFFLINE,
      AgentRating.create(),
    );
  }

  /**
   * Validate agent invariants
   */
  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new BadRequestException('Agent ID is required');
    }

    if (!this._firebaseUid || this._firebaseUid.trim().length === 0) {
      throw new BadRequestException('Firebase UID is required');
    }

    if (!this._firstName || this._firstName.trim().length === 0) {
      throw new BadRequestException('First name is required');
    }

    if (!this._lastName || this._lastName.trim().length === 0) {
      throw new BadRequestException('Last name is required');
    }

    if (!this._specializations || this._specializations.length === 0) {
      throw new BadRequestException('At least one specialization is required');
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get firebaseUid(): string {
    return this._firebaseUid;
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  get email(): string {
    return this._contactInfo.email;
  }

  get contactInfo(): ContactInfo {
    return this._contactInfo;
  }

  get serviceArea(): ServiceArea | MultiCityServiceArea {
    return this._serviceArea;
  }

  get specializations(): VerificationSpecialization[] {
    return [...this._specializations];
  }

  get status(): AgentStatus {
    return this._status;
  }

  get availabilityStatus(): AvailabilityStatus {
    return this._availabilityStatus;
  }

  get rating(): AgentRating {
    return this._rating;
  }

  get profilePhotoUrl(): string | undefined {
    return this._profilePhotoUrl;
  }

  get idCardUrl(): string | undefined {
    return this._idCardUrl;
  }

  get certifications(): string[] | undefined {
    return this._certifications ? [...this._certifications] : undefined;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get modifiedAt(): Date {
    return this._modifiedAt;
  }

  get lastActiveAt(): Date | undefined {
    return this._lastActiveAt;
  }

  /**
   * Update agent profile
   */
  updateProfile(
    firstName: string,
    lastName: string,
    profilePhotoUrl?: string,
  ): void {
    this._firstName = firstName;
    this._lastName = lastName;
    if (profilePhotoUrl) {
      this._profilePhotoUrl = profilePhotoUrl;
    }
    this._modifiedAt = new Date();
    this.validate();
  }

  /**
   * Update contact information
   */
  updateContactInfo(contactInfo: ContactInfo): void {
    this._contactInfo = contactInfo;
    this._modifiedAt = new Date();
  }

  /**
   * Update service area
   */
  updateServiceArea(serviceArea: ServiceArea | MultiCityServiceArea): void {
    this._serviceArea = serviceArea;
    this._modifiedAt = new Date();
  }

  /**
   * Update specializations
   */
  updateSpecializations(specializations: VerificationSpecialization[]): void {
    if (!specializations || specializations.length === 0) {
      throw new BadRequestException('At least one specialization is required');
    }
    this._specializations = specializations;
    this._modifiedAt = new Date();
  }

  /**
   * Activate agent (admin action)
   */
  activate(): void {
    if (this._status === AgentStatus.ACTIVE) {
      throw new BadRequestException('Agent is already active');
    }
    this._status = AgentStatus.ACTIVE;
    this._modifiedAt = new Date();
  }

  /**
   * Suspend agent (admin action)
   */
  suspend(): void {
    if (this._status === AgentStatus.SUSPENDED) {
      throw new BadRequestException('Agent is already suspended');
    }
    this._status = AgentStatus.SUSPENDED;
    this._availabilityStatus = AvailabilityStatus.OFFLINE;
    this._modifiedAt = new Date();
  }

  /**
   * Deactivate agent
   */
  deactivate(): void {
    this._status = AgentStatus.INACTIVE;
    this._availabilityStatus = AvailabilityStatus.OFFLINE;
    this._modifiedAt = new Date();
  }

  /**
   * Set availability status (agent action)
   */
  setAvailability(status: AvailabilityStatus): void {
    if (this._status !== AgentStatus.ACTIVE) {
      throw new BadRequestException('Only active agents can change availability');
    }
    this._availabilityStatus = status;
    this._lastActiveAt = new Date();
    this._modifiedAt = new Date();
  }

  /**
   * Go online
   */
  goOnline(): void {
    this.setAvailability(AvailabilityStatus.AVAILABLE);
  }

  /**
   * Go offline
   */
  goOffline(): void {
    this.setAvailability(AvailabilityStatus.OFFLINE);
  }

  /**
   * Set as busy
   */
  setBusy(): void {
    this.setAvailability(AvailabilityStatus.BUSY);
  }

  /**
   * Take a break
   */
  takeBreak(): void {
    if (this._status !== AgentStatus.ACTIVE) {
      throw new BadRequestException('Only active agents can take breaks');
    }
    this._status = AgentStatus.ON_BREAK;
    this._availabilityStatus = AvailabilityStatus.OFFLINE;
    this._modifiedAt = new Date();
  }

  /**
   * Return from break
   */
  returnFromBreak(): void {
    if (this._status !== AgentStatus.ON_BREAK) {
      throw new BadRequestException('Agent is not on break');
    }
    this._status = AgentStatus.ACTIVE;
    this._modifiedAt = new Date();
  }

  /**
   * Add a rating
   */
  addRating(rating: number): void {
    this._rating = this._rating.addRating(rating);
    this._modifiedAt = new Date();
  }

  /**
   * Record a completed verification
   */
  recordCompletion(successful: boolean): void {
    this._rating = this._rating.recordCompletion(successful);
    this._lastActiveAt = new Date();
    this._modifiedAt = new Date();
  }

  /**
   * Upload ID card
   */
  uploadIdCard(idCardUrl: string): void {
    this._idCardUrl = idCardUrl;
    this._modifiedAt = new Date();
  }

  /**
   * Add certification
   */
  addCertification(certificationUrl: string): void {
    if (!this._certifications) {
      this._certifications = [];
    }
    this._certifications.push(certificationUrl);
    this._modifiedAt = new Date();
  }

  /**
   * Check if agent can handle a verification type in a location
   */
  canHandleVerification(
    verificationType: VerificationSpecialization,
    city: string,
    area?: string,
  ): boolean {
    // Check status
    if (this._status !== AgentStatus.ACTIVE) {
      return false;
    }

    // Check availability
    if (this._availabilityStatus !== AvailabilityStatus.AVAILABLE) {
      return false;
    }

    // Check specialization
    const hasSpecialization = this._specializations.includes(verificationType) || 
                             this._specializations.includes(VerificationSpecialization.ALL);
    if (!hasSpecialization) {
      return false;
    }

    // Check service area
    return this._serviceArea.isWithinServiceArea(city, area);
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this._id,
      firebaseUid: this._firebaseUid,
      firstName: this._firstName,
      lastName: this._lastName,
      fullName: this.fullName,
      email: this._contactInfo.email, // Top-level for convenience
      phoneNumber: this._contactInfo.phoneNumber, // Top-level for convenience
      contactInfo: this._contactInfo.toJSON(),
      serviceArea: this._serviceArea.toJSON(),
      specializations: this._specializations,
      status: this._status,
      availabilityStatus: this._availabilityStatus,
      rating: this._rating.toJSON(),
      profilePhotoUrl: this._profilePhotoUrl,
      idCardUrl: this._idCardUrl,
      certifications: this._certifications,
      createdAt: this._createdAt.toISOString(),
      modifiedAt: this._modifiedAt.toISOString(),
      lastActiveAt: this._lastActiveAt?.toISOString(),
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: any): Agent {
    // Determine if it's multi-city or single city format
    let serviceArea: ServiceArea | MultiCityServiceArea;
    if (data.serviceArea.cityAreas || (Array.isArray(data.serviceArea) && data.serviceArea.length > 0)) {
      serviceArea = MultiCityServiceArea.fromJSON(data.serviceArea);
    } else {
      serviceArea = ServiceArea.fromJSON(data.serviceArea);
    }

    return new Agent(
      data.id,
      data.firebaseUid,
      data.firstName,
      data.lastName,
      ContactInfo.fromJSON(data.contactInfo),
      serviceArea,
      data.specializations,
      data.status,
      data.availabilityStatus,
      AgentRating.fromJSON(data.rating),
      data.profilePhotoUrl,
      data.idCardUrl,
      data.certifications,
      new Date(data.createdAt),
      new Date(data.modifiedAt),
      data.lastActiveAt ? new Date(data.lastActiveAt) : undefined,
    );
  }
}
