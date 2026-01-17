import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../infrastructure/repositories';
import {
  CompanyAssignmentEntity,
  RiderEntity,
  RiderCandidate,
  AssignmentStatus,
} from '../../domain/entities';
import {
  AssignToRiderDto,
  SelfAssignDto,
  ReassignDto,
  CancelAssignmentDto,
  DeclineAssignmentDto,
  SmartAssignRequestDto,
  SmartAssignResponseDto,
  AssignmentResponseDto,
  AssignmentQueryDto,
  IncomingRequestDto,
  RiderCandidateDto,
} from '../dtos';

interface VerificationRequest {
  id: string;
  title: string;
  verificationType: string;
  businessName?: string;
  fullName?: string;
  address: string;
  location?: { lat: number; lng: number };
  payout: number;
  priority: string;
  dueDate?: Date;
  createdAt: Date;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly repository: CompanyRepository) {}

  // ==================== SMART ASSIGNMENT ====================

  async getSmartAssignmentCandidates(
    companyId: string,
    requestLocation: { lat: number; lng: number },
    options?: SmartAssignRequestDto
  ): Promise<SmartAssignResponseDto> {
    const riders = await this.repository.getAvailableRiders(companyId);
    const method = options?.method || 'auto';
    const maxDistanceKm = options?.maxDistanceKm || 20;
    const limit = options?.limit || 10;

    const candidates: RiderCandidateDto[] = riders
      .map((rider) => {
        const distanceKm = rider.currentLocation
          ? this.calculateDistance(
              requestLocation.lat,
              requestLocation.lng,
              rider.currentLocation.lat,
              rider.currentLocation.lng
            )
          : 999;

        const estimatedTravelTime = Math.round((distanceKm / 30) * 60); // Assume 30km/h average

        let matchScore = 0;
        let reason = '';

        if (!rider.isOnline) {
          matchScore = 0;
          reason = 'Offline';
        } else if (!rider.isAvailable) {
          matchScore = 20;
          reason = 'Currently busy';
        } else {
          switch (method) {
            case 'proximity':
              matchScore = Math.max(0, 100 - distanceKm * 5);
              reason = `${distanceKm.toFixed(1)}km away`;
              break;
            case 'round_robin':
              matchScore = Math.max(0, 100 - rider.activeAssignments * 25);
              reason = `${rider.activeAssignments} active tasks`;
              break;
            case 'least_busy':
              matchScore = Math.max(0, 100 - rider.activeAssignments * 20);
              reason = `${rider.activeAssignments} active tasks`;
              break;
            case 'auto':
            default:
              // Weighted combination
              const distScore = Math.max(0, 100 - distanceKm * 3);
              const ratingScore = rider.rating * 15;
              const workloadScore = Math.max(0, 100 - rider.activeAssignments * 20);
              matchScore = distScore * 0.5 + ratingScore * 0.3 + workloadScore * 0.2;
              reason = `Best match (${distanceKm.toFixed(1)}km, ⭐${rider.rating.toFixed(1)})`;
              break;
          }
        }

        return {
          riderId: rider.id,
          riderName: `${rider.firstName} ${rider.lastName}`,
          distanceKm: Math.round(distanceKm * 10) / 10,
          estimatedTravelTime,
          activeAssignments: rider.activeAssignments,
          rating: rider.rating,
          isAvailable: rider.isAvailable,
          isOnline: rider.isOnline,
          matchScore: Math.round(matchScore),
          reason,
        };
      })
      .filter((c) => c.distanceKm <= maxDistanceKm)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    const recommended = candidates.find((c) => c.isOnline && c.isAvailable && c.matchScore >= 50);

    return {
      candidates,
      recommendedRiderId: recommended?.riderId,
      recommendedReason: recommended?.reason,
    };
  }

  // ==================== ASSIGN TO RIDER ====================

  async assignToRider(
    companyId: string,
    request: VerificationRequest,
    dto: AssignToRiderDto,
    assignedBy: string
  ): Promise<CompanyAssignmentEntity> {
    const rider = await this.repository.getRiderById(dto.riderId);

    // Validate
    if (rider.companyId !== companyId) {
      throw new BadRequestException('Rider does not belong to this company');
    }
    if (rider.status !== 'active') {
      throw new BadRequestException('Cannot assign to inactive rider');
    }

    // Get bike info if provided
    let bikePlate: string | undefined;
    if (dto.bikeId) {
      const bike = await this.repository.getBikeById(dto.bikeId);
      if (bike.companyId !== companyId) {
        throw new BadRequestException('Bike does not belong to this company');
      }
      bikePlate = bike.plateNumber;
    }

    // Calculate distance and travel time
    let distanceKm: number | undefined;
    let estimatedTravelTime: number | undefined;
    if (request.location && rider.currentLocation) {
      distanceKm = this.calculateDistance(
        request.location.lat,
        request.location.lng,
        rider.currentLocation.lat,
        rider.currentLocation.lng
      );
      estimatedTravelTime = Math.round((distanceKm / 30) * 60);
    }

    const assignment = await this.repository.createAssignment({
      companyId,
      verificationRequestId: request.id,
      riderId: dto.riderId,
      riderName: `${rider.firstName} ${rider.lastName}`,
      riderPhone: rider.phone,
      bikeId: dto.bikeId,
      bikePlate,
      requestTitle: request.title,
      verificationType: request.verificationType,
      businessName: request.businessName,
      fullName: request.fullName,
      location: {
        lat: request.location?.lat || 0,
        lng: request.location?.lng || 0,
        address: request.address,
      },
      status: 'pending',
      priority: dto.priority || 'normal',
      assignmentMethod: 'manual',
      timeline: { assignedAt: new Date() },
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      distanceKm,
      estimatedTravelTime,
      payout: request.payout,
      assignedBy,
      assignmentNote: dto.notes,
      statusHistory: [{ status: 'pending', timestamp: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update rider's active assignments
    await this.repository.updateRider(dto.riderId, {
      activeAssignments: rider.activeAssignments + 1,
    });

    this.logger.log(`Assigned request ${request.id} to rider ${dto.riderId}`);
    return assignment;
  }

  // ==================== SELF ASSIGN ====================

  async selfAssign(
    companyId: string,
    ownerId: string,
    request: VerificationRequest,
    dto?: SelfAssignDto
  ): Promise<CompanyAssignmentEntity> {
    // For self-assign, the owner takes the request
    // First check if owner is also registered as a rider
    const riders = await this.repository.getRidersByCompany(companyId);
    const ownerRider = riders.find((r) => r.firebaseUid === ownerId);

    if (!ownerRider) {
      throw new BadRequestException('Owner must be registered as a rider to self-assign');
    }

    return this.assignToRider(
      companyId,
      request,
      {
        riderId: ownerRider.id,
        bikeId: dto?.bikeId,
        notes: dto?.notes,
      },
      ownerId
    );
  }

  // ==================== REASSIGN ====================

  async reassign(
    assignmentId: string,
    dto: ReassignDto,
    reassignedBy: string
  ): Promise<CompanyAssignmentEntity> {
    const assignment = await this.repository.getAssignmentById(assignmentId);
    const newRider = await this.repository.getRiderById(dto.newRiderId);

    // Validate
    if (assignment.companyId !== newRider.companyId) {
      throw new BadRequestException('Rider does not belong to this company');
    }
    if (newRider.status !== 'active') {
      throw new BadRequestException('Cannot reassign to inactive rider');
    }
    if (['completed', 'cancelled'].includes(assignment.status)) {
      throw new BadRequestException('Cannot reassign completed or cancelled assignment');
    }

    // Update old rider's active assignments
    await this.repository.updateRider(assignment.riderId, {
      activeAssignments: Math.max(0, (await this.repository.getRiderById(assignment.riderId)).activeAssignments - 1),
    });

    // Get bike info if provided
    let bikePlate: string | undefined;
    if (dto.bikeId) {
      const bike = await this.repository.getBikeById(dto.bikeId);
      bikePlate = bike.plateNumber;
    }

    // Update assignment
    const updatedAssignment = await this.repository.updateAssignment(assignmentId, {
      riderId: dto.newRiderId,
      riderName: `${newRider.firstName} ${newRider.lastName}`,
      riderPhone: newRider.phone,
      bikeId: dto.bikeId,
      bikePlate,
      reassignedFrom: assignment.riderId,
      reassignmentReason: dto.reason,
      reassignmentCount: (assignment.reassignmentCount || 0) + 1,
      status: 'pending',
      timeline: { ...assignment.timeline, assignedAt: new Date() },
    });

    // Update new rider's active assignments
    await this.repository.updateRider(dto.newRiderId, {
      activeAssignments: newRider.activeAssignments + 1,
    });

    this.logger.log(`Reassigned ${assignmentId} from ${assignment.riderId} to ${dto.newRiderId}`);
    return updatedAssignment;
  }

  // ==================== CANCEL ====================

  async cancelAssignment(
    assignmentId: string,
    dto: CancelAssignmentDto,
    cancelledBy: string
  ): Promise<CompanyAssignmentEntity> {
    const assignment = await this.repository.getAssignmentById(assignmentId);

    if (['completed', 'cancelled'].includes(assignment.status)) {
      throw new BadRequestException('Assignment is already completed or cancelled');
    }

    // Update rider's active assignments
    await this.repository.updateRider(assignment.riderId, {
      activeAssignments: Math.max(0, (await this.repository.getRiderById(assignment.riderId)).activeAssignments - 1),
    });

    const updatedAssignment = await this.repository.updateAssignmentStatus(
      assignmentId,
      'cancelled',
      dto.reason,
      cancelledBy
    );

    await this.repository.updateAssignment(assignmentId, {
      cancelReason: dto.reason,
      cancelledBy,
    });

    this.logger.log(`Cancelled assignment: ${assignmentId}`);
    return updatedAssignment;
  }

  // ==================== RIDER ACTIONS ====================

  async acceptAssignment(assignmentId: string, riderId: string): Promise<CompanyAssignmentEntity> {
    const assignment = await this.repository.getAssignmentById(assignmentId);

    if (assignment.riderId !== riderId) {
      throw new BadRequestException('Assignment does not belong to this rider');
    }
    if (assignment.status !== 'pending') {
      throw new BadRequestException('Assignment is not pending');
    }

    return this.repository.updateAssignmentStatus(assignmentId, 'accepted', 'Rider accepted', riderId);
  }

  async startVerification(assignmentId: string, riderId: string): Promise<CompanyAssignmentEntity> {
    const assignment = await this.repository.getAssignmentById(assignmentId);

    if (assignment.riderId !== riderId) {
      throw new BadRequestException('Assignment does not belong to this rider');
    }
    if (!['pending', 'accepted'].includes(assignment.status)) {
      throw new BadRequestException('Assignment cannot be started');
    }

    return this.repository.updateAssignmentStatus(assignmentId, 'in_progress', 'Verification started', riderId);
  }

  async declineAssignment(
    assignmentId: string,
    riderId: string,
    dto: DeclineAssignmentDto
  ): Promise<CompanyAssignmentEntity> {
    const assignment = await this.repository.getAssignmentById(assignmentId);

    if (assignment.riderId !== riderId) {
      throw new BadRequestException('Assignment does not belong to this rider');
    }
    if (assignment.status !== 'pending') {
      throw new BadRequestException('Can only decline pending assignments');
    }

    // Update rider's active assignments
    const rider = await this.repository.getRiderById(riderId);
    await this.repository.updateRider(riderId, {
      activeAssignments: Math.max(0, rider.activeAssignments - 1),
    });

    const updatedAssignment = await this.repository.updateAssignmentStatus(
      assignmentId,
      'declined',
      dto.reason,
      riderId
    );

    await this.repository.updateAssignment(assignmentId, {
      declineReason: dto.reason,
    });

    this.logger.log(`Rider ${riderId} declined assignment: ${assignmentId}`);
    return updatedAssignment;
  }

  async completeAssignment(assignmentId: string, riderId: string): Promise<CompanyAssignmentEntity> {
    const assignment = await this.repository.getAssignmentById(assignmentId);

    if (assignment.riderId !== riderId) {
      throw new BadRequestException('Assignment does not belong to this rider');
    }
    if (assignment.status !== 'in_progress') {
      throw new BadRequestException('Assignment is not in progress');
    }

    // Update rider's stats
    const rider = await this.repository.getRiderById(riderId);
    await this.repository.updateRider(riderId, {
      activeAssignments: Math.max(0, rider.activeAssignments - 1),
      totalCompletedTasks: rider.totalCompletedTasks + 1,
    });

    return this.repository.updateAssignmentStatus(assignmentId, 'completed', 'Verification completed', riderId);
  }

  // ==================== QUERIES ====================

  async getAssignmentById(id: string): Promise<CompanyAssignmentEntity> {
    return this.repository.getAssignmentById(id);
  }

  async getAssignmentsByCompany(
    companyId: string,
    query?: AssignmentQueryDto
  ): Promise<CompanyAssignmentEntity[]> {
    return this.repository.getAssignmentsByCompany(companyId, query);
  }

  async getAssignmentsByRider(
    riderId: string,
    query?: { status?: AssignmentStatus }
  ): Promise<CompanyAssignmentEntity[]> {
    return this.repository.getAssignmentsByRider(riderId, query);
  }

  // ==================== HELPERS ====================

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  mapToResponse(assignment: CompanyAssignmentEntity): AssignmentResponseDto {
    return {
      id: assignment.id,
      companyId: assignment.companyId,
      verificationRequestId: assignment.verificationRequestId,
      riderId: assignment.riderId,
      riderName: assignment.riderName,
      riderPhone: assignment.riderPhone,
      bikeId: assignment.bikeId,
      bikePlate: assignment.bikePlate,
      requestTitle: assignment.requestTitle,
      verificationType: assignment.verificationType,
      businessName: assignment.businessName,
      fullName: assignment.fullName,
      location: assignment.location,
      status: assignment.status,
      priority: assignment.priority,
      assignmentMethod: assignment.assignmentMethod,
      timeline: assignment.timeline,
      dueDate: assignment.dueDate,
      distanceKm: assignment.distanceKm,
      estimatedTravelTime: assignment.estimatedTravelTime,
      payout: assignment.payout,
      riderShare: assignment.riderShare,
      companyShare: assignment.companyShare,
      assignedBy: assignment.assignedBy,
      assignmentNote: assignment.assignmentNote,
      declineReason: assignment.declineReason,
      cancelReason: assignment.cancelReason,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }
}
