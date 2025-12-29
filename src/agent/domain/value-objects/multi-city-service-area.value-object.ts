import { BadRequestException } from '@nestjs/common';

/**
 * City Coverage
 * Represents coverage in a specific city
 */
export interface CityArea {
  city: string;
  areas: string[];
}

/**
 * Multi-City Service Area Value Object
 * Represents multiple cities and areas an agent can service
 * Used for logistics companies with agents across multiple cities
 */
export class MultiCityServiceArea {
  private constructor(
    private readonly _cityAreas: CityArea[],
    private readonly _radius: number, // default radius in kilometers
  ) {
    this.validate();
  }

  static create(cityAreas: CityArea[], radius: number = 20): MultiCityServiceArea {
    return new MultiCityServiceArea(cityAreas, radius);
  }

  private validate(): void {
    if (!this._cityAreas || this._cityAreas.length === 0) {
      throw new BadRequestException('At least one city is required');
    }

    for (const cityArea of this._cityAreas) {
      if (!cityArea.city || cityArea.city.trim().length === 0) {
        throw new BadRequestException('City name is required');
      }

      if (!cityArea.areas || cityArea.areas.length === 0) {
        throw new BadRequestException(`At least one area is required for ${cityArea.city}`);
      }
    }

    if (this._radius <= 0 || this._radius > 100) {
      throw new BadRequestException('Service radius must be between 1 and 100 km');
    }
  }

  get cityAreas(): CityArea[] {
    return this._cityAreas.map(ca => ({
      city: ca.city,
      areas: [...ca.areas]
    }));
  }

  get cities(): string[] {
    return this._cityAreas.map(ca => ca.city);
  }

  get radius(): number {
    return this._radius;
  }

  /**
   * Get all areas for a specific city
   */
  getAreasForCity(city: string): string[] {
    const cityArea = this._cityAreas.find(ca => ca.city.toLowerCase() === city.toLowerCase());
    return cityArea ? [...cityArea.areas] : [];
  }

  /**
   * Check if a location is within the service area
   */
  isWithinServiceArea(city: string, area?: string): boolean {
    const cityArea = this._cityAreas.find(ca => ca.city.toLowerCase() === city.toLowerCase());
    
    if (!cityArea) {
      return false;
    }

    if (area && cityArea.areas.length > 0) {
      return cityArea.areas.some(a => a.toLowerCase() === area.toLowerCase());
    }

    return true;
  }

  /**
   * Add a new city with areas
   */
  addCity(city: string, areas: string[]): MultiCityServiceArea {
    const existingIndex = this._cityAreas.findIndex(ca => ca.city.toLowerCase() === city.toLowerCase());
    
    if (existingIndex >= 0) {
      // Merge areas if city exists
      const mergedAreas = [...new Set([...this._cityAreas[existingIndex].areas, ...areas])];
      const newCityAreas = [...this._cityAreas];
      newCityAreas[existingIndex] = { city, areas: mergedAreas };
      return new MultiCityServiceArea(newCityAreas, this._radius);
    } else {
      // Add new city
      return new MultiCityServiceArea([...this._cityAreas, { city, areas }], this._radius);
    }
  }

  /**
   * Remove a city
   */
  removeCity(city: string): MultiCityServiceArea {
    const filtered = this._cityAreas.filter(ca => ca.city.toLowerCase() !== city.toLowerCase());
    if (filtered.length === 0) {
      throw new BadRequestException('Cannot remove all cities. At least one city is required.');
    }
    return new MultiCityServiceArea(filtered, this._radius);
  }

  toJSON() {
    return {
      cityAreas: this.cityAreas, // Use getter to ensure plain objects
      radius: this._radius,
    };
  }

  static fromJSON(data: any): MultiCityServiceArea {
    // Support both old format (single city) and new format (multiple cities)
    if (data.city && data.areas) {
      // Old format: { city: 'Lagos', areas: ['Lekki', 'VI'] }
      return new MultiCityServiceArea([{ city: data.city, areas: data.areas }], data.radius || 20);
    } else if (data.cityAreas) {
      // New format: { cityAreas: [{ city: 'Lagos', areas: [...] }] }
      return new MultiCityServiceArea(data.cityAreas, data.radius || 20);
    } else {
      throw new BadRequestException('Invalid service area format');
    }
  }
}
