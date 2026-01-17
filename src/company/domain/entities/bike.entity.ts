/**
 * Bike/Vehicle Entity
 * Represents a motorcycle or vehicle in the company's fleet
 */

export type BikeStatus = 'active' | 'maintenance' | 'inactive' | 'decommissioned';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';
export type MaintenanceType = 'routine' | 'repair' | 'emergency' | 'inspection';
export type InsuranceType = 'comprehensive' | 'third_party' | 'basic';
export type InsuranceStatus = 'active' | 'expired' | 'pending' | 'cancelled';
export type VehicleDocumentType = 'registration' | 'insurance' | 'roadworthiness' | 'permit' | 'other';
export type VehicleDocumentStatus = 'valid' | 'expired' | 'pending';

export interface MaintenanceRecord {
  id: string;
  date: Date;
  type: MaintenanceType;
  description: string;
  cost: number;
  performedBy: string;
  vendorName?: string;
  mileageAtService?: number;
  nextServiceDue?: Date;
  nextServiceMileage?: number;
  parts?: {
    name: string;
    quantity: number;
    cost: number;
  }[];
  notes?: string;
  receiptUrl?: string;
}

export interface VehicleInsurance {
  provider: string;
  policyNumber: string;
  type: InsuranceType;
  startDate: Date;
  expiryDate: Date;
  premium: number;
  coverage?: string[];
  status: InsuranceStatus;
  documentUrl?: string;
}

export interface VehicleDocument {
  id: string;
  type: VehicleDocumentType;
  name?: string;
  fileUrl: string;
  uploadedAt: Date;
  expiryDate?: Date;
  status: VehicleDocumentStatus;
}

export interface BikeAssignmentHistory {
  riderId: string;
  riderName: string;
  startDate: Date;
  endDate?: Date;
  reason: 'new_assignment' | 'reassignment' | 'maintenance' | 'termination';
  mileageAtStart?: number;
  mileageAtEnd?: number;
  notes?: string;
}

export interface BikeCosts {
  maintenance: number;
  fuel: number;
  insurance: number;
  repairs: number;
  other: number;
  total?: number;
}

export interface BikeLocation {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface Bike {
  id: string;
  
  // Company Reference
  companyId: string;
  
  // Basic Info
  name?: string;
  registrationNumber: string;
  plateNumber: string;
  
  // Vehicle Details
  make: string;
  model: string;
  year: number;
  color: string;
  engineCapacity?: number; // cc
  fuelType: FuelType;
  chassisNumber?: string;
  engineNumber?: string;
  
  // Status
  status: BikeStatus;
  
  // Assignment
  assignedRiderId?: string;
  assignedRiderName?: string;
  dateAssigned?: Date;
  
  // Mileage Tracking
  currentMileage?: number;
  lastMileageUpdate?: Date;
  initialMileage?: number;
  
  // Maintenance
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  nextMaintenanceMileage?: number;
  maintenanceHistory: MaintenanceRecord[];
  
  // Insurance
  insurance?: VehicleInsurance;
  
  // Documents
  documents: VehicleDocument[];
  
  // Assignment History
  assignmentHistory: BikeAssignmentHistory[];
  
  // Costs (computed/cached)
  totalCosts?: BikeCosts;
  
  // Current Location (from GPS tracker)
  currentLocation?: BikeLocation;
  hasGpsTracker?: boolean;
  
  // Purchase Info
  purchaseDate?: Date;
  purchasePrice?: number;
  vendor?: string;
  warrantyExpiry?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export class BikeEntity implements Bike {
  id: string;
  companyId: string;
  name?: string;
  registrationNumber: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  engineCapacity?: number;
  fuelType: FuelType;
  chassisNumber?: string;
  engineNumber?: string;
  status: BikeStatus;
  assignedRiderId?: string;
  assignedRiderName?: string;
  dateAssigned?: Date;
  currentMileage?: number;
  lastMileageUpdate?: Date;
  initialMileage?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  nextMaintenanceMileage?: number;
  maintenanceHistory: MaintenanceRecord[];
  insurance?: VehicleInsurance;
  documents: VehicleDocument[];
  assignmentHistory: BikeAssignmentHistory[];
  totalCosts?: BikeCosts;
  currentLocation?: BikeLocation;
  hasGpsTracker?: boolean;
  purchaseDate?: Date;
  purchasePrice?: number;
  vendor?: string;
  warrantyExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Bike>) {
    Object.assign(this, partial);
    
    // Set defaults
    this.status = partial.status || 'active';
    this.fuelType = partial.fuelType || 'petrol';
    this.maintenanceHistory = partial.maintenanceHistory || [];
    this.documents = partial.documents || [];
    this.assignmentHistory = partial.assignmentHistory || [];
    this.currentMileage = partial.currentMileage || 0;
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = new Date();
  }

  get displayName(): string {
    return this.name || `${this.make} ${this.model}`;
  }

  get isAssigned(): boolean {
    return !!this.assignedRiderId;
  }

  get isInsuranceExpiringSoon(): boolean {
    if (!this.insurance?.expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(this.insurance.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30;
  }

  get isMaintenanceDue(): boolean {
    if (this.nextMaintenanceDate) {
      return new Date(this.nextMaintenanceDate) <= new Date();
    }
    if (this.nextMaintenanceMileage && this.currentMileage) {
      return this.currentMileage >= this.nextMaintenanceMileage;
    }
    return false;
  }

  static create(data: Omit<Bike, 'id' | 'createdAt' | 'updatedAt'>): BikeEntity {
    return new BikeEntity({
      ...data,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
