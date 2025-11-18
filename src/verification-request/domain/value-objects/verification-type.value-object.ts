/**
 * Verification type enumeration
 */
export enum VerificationTypeEnum {
  PROPERTY_INSPECTION = 'PROPERTY_INSPECTION',
  DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION',
  BUSINESS_VERIFICATION = 'BUSINESS_VERIFICATION',
  IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',
  LOCATION_VERIFICATION = 'LOCATION_VERIFICATION',
  ASSET_VERIFICATION = 'ASSET_VERIFICATION',
  CUSTOM_VERIFICATION = 'CUSTOM_VERIFICATION',
}

/**
 * Verification urgency levels
 */
export enum VerificationUrgency {
  STANDARD = 'STANDARD', // 24-48 hours
  URGENT = 'URGENT',     // 12-24 hours
  EXPRESS = 'EXPRESS',   // 6-12 hours
  IMMEDIATE = 'IMMEDIATE', // 2-6 hours
}

/**
 * VerificationType value object representing the type and characteristics of verification
 * Immutable value object following DDD principles
 */
export class VerificationType {
  constructor(
    private readonly _type: VerificationTypeEnum,
    private readonly _urgency: VerificationUrgency = VerificationUrgency.STANDARD,
    private readonly _requiresPhysicalPresence: boolean = true,
    private readonly _estimatedDuration: number = 60, // in minutes
    private readonly _specialInstructions?: string,
  ) {
    this.validateType();
    this.validateUrgency();
    this.validateDuration();
  }

  get type(): VerificationTypeEnum {
    return this._type;
  }

  get urgency(): VerificationUrgency {
    return this._urgency;
  }

  get requiresPhysicalPresence(): boolean {
    return this._requiresPhysicalPresence;
  }

  get estimatedDuration(): number {
    return this._estimatedDuration;
  }

  get specialInstructions(): string | undefined {
    return this._specialInstructions;
  }

  /**
   * Validate verification type
   */
  private validateType(): void {
    if (!Object.values(VerificationTypeEnum).includes(this._type)) {
      throw new Error('Invalid verification type');
    }
  }

  /**
   * Validate urgency level
   */
  private validateUrgency(): void {
    if (!Object.values(VerificationUrgency).includes(this._urgency)) {
      throw new Error('Invalid verification urgency level');
    }
  }

  /**
   * Validate duration
   */
  private validateDuration(): void {
    if (this._estimatedDuration <= 0 || this._estimatedDuration > 480) { // max 8 hours
      throw new Error('Estimated duration must be between 1 and 480 minutes');
    }
  }

  /**
   * Get display name for verification type
   */
  public getDisplayName(): string {
    const displayNames: Record<VerificationTypeEnum, string> = {
      [VerificationTypeEnum.PROPERTY_INSPECTION]: 'Property Inspection',
      [VerificationTypeEnum.DOCUMENT_VERIFICATION]: 'Document Verification',
      [VerificationTypeEnum.BUSINESS_VERIFICATION]: 'Business Verification',
      [VerificationTypeEnum.IDENTITY_VERIFICATION]: 'Identity Verification',
      [VerificationTypeEnum.LOCATION_VERIFICATION]: 'Location Verification',
      [VerificationTypeEnum.ASSET_VERIFICATION]: 'Asset Verification',
      [VerificationTypeEnum.CUSTOM_VERIFICATION]: 'Custom Verification',
    };

    return displayNames[this._type];
  }

  /**
   * Get urgency multiplier for pricing
   */
  public getUrgencyMultiplier(): number {
    const multipliers: Record<VerificationUrgency, number> = {
      [VerificationUrgency.STANDARD]: 1.0,
      [VerificationUrgency.URGENT]: 1.25,
      [VerificationUrgency.EXPRESS]: 1.5,
      [VerificationUrgency.IMMEDIATE]: 2.0,
    };

    return multipliers[this._urgency];
  }

  /**
   * Get expected completion time in hours based on urgency
   */
  public getExpectedCompletionHours(): number {
    const completionHours: Record<VerificationUrgency, number> = {
      [VerificationUrgency.STANDARD]: 48,
      [VerificationUrgency.URGENT]: 24,
      [VerificationUrgency.EXPRESS]: 12,
      [VerificationUrgency.IMMEDIATE]: 6,
    };

    return completionHours[this._urgency];
  }

  /**
   * Check if verification type supports online/remote verification
   */
  public supportsRemoteVerification(): boolean {
    const remoteSupported = [
      VerificationTypeEnum.DOCUMENT_VERIFICATION,
      VerificationTypeEnum.IDENTITY_VERIFICATION,
    ];

    return remoteSupported.includes(this._type);
  }

  /**
   * Get base price for verification type (without urgency multiplier)
   */
  public getBasePrice(): number {
    const basePrices: Record<VerificationTypeEnum, number> = {
      [VerificationTypeEnum.PROPERTY_INSPECTION]: 50.00,
      [VerificationTypeEnum.DOCUMENT_VERIFICATION]: 25.00,
      [VerificationTypeEnum.BUSINESS_VERIFICATION]: 75.00,
      [VerificationTypeEnum.IDENTITY_VERIFICATION]: 30.00,
      [VerificationTypeEnum.LOCATION_VERIFICATION]: 40.00,
      [VerificationTypeEnum.ASSET_VERIFICATION]: 60.00,
      [VerificationTypeEnum.CUSTOM_VERIFICATION]: 100.00,
    };

    return basePrices[this._type];
  }

  /**
   * Get required documents for verification type
   */
  public getRequiredDocuments(): string[] {
    const requiredDocs: Record<VerificationTypeEnum, string[]> = {
      [VerificationTypeEnum.PROPERTY_INSPECTION]: ['Property deed', 'Building plan', 'Survey report'],
      [VerificationTypeEnum.DOCUMENT_VERIFICATION]: ['Original document', 'Supporting documents'],
      [VerificationTypeEnum.BUSINESS_VERIFICATION]: ['Business registration', 'Tax certificate', 'Operating license'],
      [VerificationTypeEnum.IDENTITY_VERIFICATION]: ['Government ID', 'Proof of address'],
      [VerificationTypeEnum.LOCATION_VERIFICATION]: ['Location permit', 'Access authorization'],
      [VerificationTypeEnum.ASSET_VERIFICATION]: ['Asset documentation', 'Ownership proof'],
      [VerificationTypeEnum.CUSTOM_VERIFICATION]: ['Custom requirements as specified'],
    };

    return requiredDocs[this._type];
  }

  /**
   * Check equality with another verification type
   */
  public equals(other: VerificationType): boolean {
    return (
      this._type === other._type &&
      this._urgency === other._urgency &&
      this._requiresPhysicalPresence === other._requiresPhysicalPresence &&
      this._estimatedDuration === other._estimatedDuration
    );
  }

  /**
   * Convert to plain object
   */
  public toJSON(): Record<string, any> {
    return {
      type: this._type,
      urgency: this._urgency,
      requiresPhysicalPresence: this._requiresPhysicalPresence,
      estimatedDuration: this._estimatedDuration,
      specialInstructions: this._specialInstructions,
    };
  }

  /**
   * Create VerificationType from plain object
   */
  public static fromJSON(data: any): VerificationType {
    return new VerificationType(
      data.type,
      data.urgency,
      data.requiresPhysicalPresence,
      data.estimatedDuration,
      data.specialInstructions,
    );
  }
}