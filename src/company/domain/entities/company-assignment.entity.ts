/**
 * Company Assignment Entity
 * Represents assignment of verification requests to riders
 */

export type AssignmentStatus = 
  | 'pending'      // Waiting for rider to accept
  | 'accepted'     // Rider accepted
  | 'in_progress'  // Rider is working on it
  | 'completed'    // Verification completed
  | 'cancelled'    // Cancelled by company
  | 'declined'     // Declined by rider
  | 'expired';     // Expired without response

export type AssignmentPriority = 'low' | 'normal' | 'high' | 'critical';

export type AssignmentMethod = 'auto' | 'proximity' | 'round_robin' | 'least_busy' | 'manual';

export interface AssignmentLocation {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  state?: string;
}

export interface AssignmentTimeline {
  assignedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  declinedAt?: Date;
  expiredAt?: Date;
}

export interface AssignmentStatusHistory {
  status: AssignmentStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
}

export interface RiderCandidate {
  riderId: string;
  riderName: string;
  distanceKm: number;
  estimatedTravelTime: number; // minutes
  activeAssignments: number;
  rating: number;
  isAvailable: boolean;
  isOnline: boolean;
  matchScore: number; // 0-100
  reason?: string;
}

export interface CompanyAssignment {
  id: string;
  
  // References
  companyId: string;
  verificationRequestId: string;
  
  // Rider Info
  riderId: string;
  riderName: string;
  riderPhone: string;
  
  // Bike Info (optional)
  bikeId?: string;
  bikePlate?: string;
  
  // Request Details (snapshot)
  requestTitle: string;
  verificationType: string;
  businessName?: string;
  fullName?: string;
  
  // Location
  location: AssignmentLocation;
  
  // Assignment Details
  status: AssignmentStatus;
  priority: AssignmentPriority;
  assignmentMethod: AssignmentMethod;
  
  // Timing
  timeline: AssignmentTimeline;
  dueDate?: Date;
  estimatedDuration?: number; // minutes
  actualDuration?: number;
  
  // Distance & Travel
  distanceKm?: number;
  estimatedTravelTime?: number;
  actualTravelTime?: number;
  
  // Payout
  payout: number;
  riderShare?: number;
  companyShare?: number;
  
  // Assignment Metadata
  assignedBy: string; // User ID who made the assignment
  assignmentNote?: string;
  
  // Decline/Cancel Info
  declineReason?: string;
  cancelReason?: string;
  cancelledBy?: string;
  
  // Reassignment
  reassignedFrom?: string; // Previous rider ID
  reassignmentReason?: string;
  reassignmentCount?: number;
  
  // Status History
  statusHistory: AssignmentStatusHistory[];
  
  // Smart Assignment Data
  candidatesConsidered?: RiderCandidate[];
  
  // Verification Result Reference
  verificationResultId?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export class CompanyAssignmentEntity implements CompanyAssignment {
  id: string;
  companyId: string;
  verificationRequestId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  bikeId?: string;
  bikePlate?: string;
  requestTitle: string;
  verificationType: string;
  businessName?: string;
  fullName?: string;
  location: AssignmentLocation;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  assignmentMethod: AssignmentMethod;
  timeline: AssignmentTimeline;
  dueDate?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  distanceKm?: number;
  estimatedTravelTime?: number;
  actualTravelTime?: number;
  payout: number;
  riderShare?: number;
  companyShare?: number;
  assignedBy: string;
  assignmentNote?: string;
  declineReason?: string;
  cancelReason?: string;
  cancelledBy?: string;
  reassignedFrom?: string;
  reassignmentReason?: string;
  reassignmentCount?: number;
  statusHistory: AssignmentStatusHistory[];
  candidatesConsidered?: RiderCandidate[];
  verificationResultId?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CompanyAssignment>) {
    Object.assign(this, partial);
    
    // Set defaults
    this.status = partial.status || 'pending';
    this.priority = partial.priority || 'normal';
    this.assignmentMethod = partial.assignmentMethod || 'manual';
    this.timeline = partial.timeline || { assignedAt: new Date() };
    this.statusHistory = partial.statusHistory || [
      { status: 'pending', timestamp: new Date() }
    ];
    this.reassignmentCount = partial.reassignmentCount || 0;
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus: AssignmentStatus, note?: string, updatedBy?: string): void {
    this.status = newStatus;
    this.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      note,
      updatedBy,
    });
    
    // Update timeline
    const now = new Date();
    switch (newStatus) {
      case 'accepted':
        this.timeline.acceptedAt = now;
        break;
      case 'in_progress':
        this.timeline.startedAt = now;
        break;
      case 'completed':
        this.timeline.completedAt = now;
        if (this.timeline.startedAt) {
          this.actualDuration = Math.round(
            (now.getTime() - this.timeline.startedAt.getTime()) / 60000
          );
        }
        break;
      case 'cancelled':
        this.timeline.cancelledAt = now;
        break;
      case 'declined':
        this.timeline.declinedAt = now;
        break;
      case 'expired':
        this.timeline.expiredAt = now;
        break;
    }
    
    this.updatedAt = now;
  }

  static create(data: Omit<CompanyAssignment, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>): CompanyAssignmentEntity {
    return new CompanyAssignmentEntity({
      ...data,
      id: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
    });
  }
}
