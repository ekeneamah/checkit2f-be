import { BadRequestException } from '@nestjs/common';

/**
 * Agent Service Area Value Object
 * Represents the geographical area an agent can service
 */
export class ServiceArea {
  private constructor(
    private readonly _city: string,
    private readonly _areas: string[],
    private readonly _radius: number, // in kilometers
  ) {
    this.validate();
  }

  static create(city: string, areas: string[], radius: number): ServiceArea {
    return new ServiceArea(city, areas, radius);
  }

  private validate(): void {
    if (!this._city || this._city.trim().length === 0) {
      throw new BadRequestException('City is required');
    }

    if (!this._areas || this._areas.length === 0) {
      throw new BadRequestException('At least one area is required');
    }

    if (this._radius <= 0 || this._radius > 100) {
      throw new BadRequestException('Service radius must be between 1 and 100 km');
    }
  }

  get city(): string {
    return this._city;
  }

  get areas(): string[] {
    return [...this._areas];
  }

  get radius(): number {
    return this._radius;
  }

  /**
   * Check if a location is within the service area
   */
  isWithinServiceArea(city: string, area?: string): boolean {
    if (this._city.toLowerCase() !== city.toLowerCase()) {
      return false;
    }

    if (area && this._areas.length > 0) {
      return this._areas.some(a => a.toLowerCase() === area.toLowerCase());
    }

    return true;
  }

  toJSON() {
    return {
      city: this._city,
      areas: this._areas,
      radius: this._radius,
    };
  }

  static fromJSON(data: any): ServiceArea {
    return new ServiceArea(data.city, data.areas, data.radius);
  }
}
