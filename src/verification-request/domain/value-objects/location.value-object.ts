/**
 * Location value object representing a geographical location
 * Immutable value object following DDD principles
 */
export class Location {
  constructor(
    private readonly _address: string,
    private readonly _latitude: number,
    private readonly _longitude: number,
    private readonly _placeId?: string,
    private readonly _landmark?: string,
    private readonly _accessInstructions?: string,
  ) {
    this.validateAddress();
    this.validateCoordinates();
  }

  get address(): string {
    return this._address;
  }

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }

  get placeId(): string | undefined {
    return this._placeId;
  }

  get landmark(): string | undefined {
    return this._landmark;
  }

  get accessInstructions(): string | undefined {
    return this._accessInstructions;
  }

  /**
   * Validate address format
   */
  private validateAddress(): void {
    if (!this._address || this._address.trim().length < 10) {
      throw new Error('Address must be at least 10 characters long');
    }
  }

  /**
   * Validate coordinates
   */
  private validateCoordinates(): void {
    if (this._latitude < -90 || this._latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    if (this._longitude < -180 || this._longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
  }

  /**
   * Calculate distance to another location in kilometers
   */
  public distanceTo(otherLocation: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(otherLocation._latitude - this._latitude);
    const dLon = this.toRadians(otherLocation._longitude - this._longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(this._latitude)) *
              Math.cos(this.toRadians(otherLocation._latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Check if location is within a certain radius of another location
   */
  public isWithinRadius(otherLocation: Location, radiusKm: number): boolean {
    return this.distanceTo(otherLocation) <= radiusKm;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check equality with another location
   */
  public equals(other: Location): boolean {
    return (
      this._address === other._address &&
      this._latitude === other._latitude &&
      this._longitude === other._longitude &&
      this._placeId === other._placeId
    );
  }

  /**
   * Convert to plain object
   */
  public toJSON(): Record<string, any> {
    return {
      address: this._address,
      latitude: this._latitude,
      longitude: this._longitude,
      placeId: this._placeId,
      landmark: this._landmark,
      accessInstructions: this._accessInstructions,
    };
  }

  /**
   * Create Location from plain object
   */
  public static fromJSON(data: any): Location {
    return new Location(
      data.address,
      data.latitude,
      data.longitude,
      data.placeId,
      data.landmark,
      data.accessInstructions,
    );
  }
}