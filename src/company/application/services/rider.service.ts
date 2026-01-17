import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CompanyRepository } from '../../infrastructure/repositories';
import { RiderEntity, RiderDocument, RiderSchedule, TimeOffRequest, RiderStatus } from '../../domain/entities';
import {
  CreateRiderDto,
  UpdateRiderDto,
  UpdateRiderStatusDto,
  RiderDocumentDto,
  UpdateDocumentStatusDto,
  RiderScheduleDto,
  CreateTimeOffRequestDto,
  UpdateTimeOffRequestDto,
  RiderResponseDto,
  RiderQueryDto,
} from '../dtos';

@Injectable()
export class RiderService {
  private readonly logger = new Logger(RiderService.name);

  constructor(private readonly repository: CompanyRepository) {}

  async createRider(companyId: string, dto: CreateRiderDto): Promise<RiderEntity> {
    const rider = await this.repository.createRider(companyId, {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      status: 'pending',
      isOnline: false,
      isAvailable: false,
      activeAssignments: 0,
      documents: [],
      onboardingComplete: false,
      rating: 0,
      totalCompletedTasks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    this.logger.log(`Created rider: ${rider.id} for company: ${companyId}`);
    return rider;
  }

  async getRiderById(id: string): Promise<RiderEntity> {
    return this.repository.getRiderById(id);
  }

  /**
   * Get rider by Firebase UID
   * Used for auth flow when rider logs in
   */
  async getRiderByFirebaseUid(firebaseUid: string): Promise<RiderEntity> {
    const rider = await this.repository.getRiderByFirebaseUid(firebaseUid);
    if (!rider) {
      throw new NotFoundException('Rider not found for this user');
    }
    return rider;
  }

  async getRidersByCompany(companyId: string, query?: RiderQueryDto): Promise<RiderEntity[]> {
    return this.repository.getRidersByCompany(companyId, query);
  }

  async getAvailableRiders(companyId: string): Promise<RiderEntity[]> {
    return this.repository.getAvailableRiders(companyId);
  }

async updateRider(id: string, dto: UpdateRiderDto): Promise<RiderEntity> {
    await this.repository.getRiderById(id); // Ensure exists
    
    // Convert DTO to partial entity, handling nested objects
    const updates: Partial<RiderEntity> = { ...dto } as any;
    
    return this.repository.updateRider(id, updates);
  }

  async updateRiderStatus(id: string, status: string): Promise<RiderEntity> {
    const rider = await this.repository.getRiderById(id);
    
    // Validate status transition
    this.validateStatusTransition(rider.status, status as RiderStatus);
    
    return this.repository.updateRiderStatus(id, status as RiderStatus);
  }

  async updateRiderLocation(
    id: string,
    location: { lat: number; lng: number; accuracy?: number }
  ): Promise<void> {
    await this.repository.updateRiderLocation(id, location);
  }

  async updateOnlineStatus(
    id: string,
    body: { isOnline: boolean; isAvailable?: boolean }
  ): Promise<RiderEntity> {
    await this.repository.updateRiderOnlineStatus(id, body.isOnline);
    if (body.isAvailable !== undefined) {
      return this.repository.updateRider(id, { isAvailable: body.isAvailable });
    }
    return this.repository.getRiderById(id);
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<RiderEntity> {
    return this.repository.updateRider(id, { isAvailable });
  }

  // ==================== DOCUMENTS ====================

  async addDocument(riderId: string, dto: RiderDocumentDto): Promise<RiderEntity> {
    const document: RiderDocument = {
      id: uuidv4(),
      type: dto.type,
      name: dto.name,
      fileUrl: dto.fileUrl,
      uploadedAt: new Date(),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      status: 'pending',
    };

    return this.repository.addRiderDocument(riderId, document);
  }

  async updateDocumentStatus(
    riderId: string,
    documentId: string,
    dto: UpdateDocumentStatusDto,
    verifiedBy?: string
  ): Promise<RiderEntity> {
    const updates: Partial<RiderDocument> = {
      status: dto.status,
      rejectionReason: dto.rejectionReason,
    };

    if (dto.status === 'verified') {
      updates.verifiedBy = verifiedBy;
      updates.verifiedAt = new Date();
    }

    const rider = await this.repository.updateRiderDocument(riderId, documentId, updates);

    // Check if onboarding is complete
    const requiredDocs = ['profile_photo', 'national_id', 'drivers_license', 'guarantor_id', 'guarantor_letter'];
    const verifiedDocs = rider.documents.filter((d) => d.status === 'verified');
    const allRequiredVerified = requiredDocs.every((type) =>
      verifiedDocs.some((d) => d.type === type)
    );

    if (allRequiredVerified && !rider.onboardingComplete) {
      return this.repository.updateRider(riderId, { onboardingComplete: true });
    }

    return rider;
  }

  async getRiderDocuments(riderId: string): Promise<RiderDocument[]> {
    const rider = await this.repository.getRiderById(riderId);
    return rider.documents;
  }

  // ==================== SCHEDULE ====================

  async updateSchedule(riderId: string, dto: RiderScheduleDto): Promise<RiderEntity> {
    const schedule: RiderSchedule = {
      weeklySchedule: dto.weeklySchedule.map((day) => ({
        day: day.day,
        isAvailable: day.isAvailable,
        shifts: day.shifts,
      })),
      timezone: dto.timezone,
      isFlexible: dto.isFlexible,
    };

    return this.repository.updateRider(riderId, { schedule });
  }

  async getSchedule(riderId: string): Promise<RiderSchedule | undefined> {
    const rider = await this.repository.getRiderById(riderId);
    return rider.schedule;
  }

  // ==================== TIME OFF ====================

  async requestTimeOff(riderId: string, dto: CreateTimeOffRequestDto): Promise<RiderEntity> {
    const request: TimeOffRequest = {
      id: uuidv4(),
      type: dto.type,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
      status: 'pending',
      requestedAt: new Date(),
    };

    return this.repository.addTimeOffRequest(riderId, request);
  }

  async updateTimeOffRequest(
    riderId: string,
    requestId: string,
    dto: UpdateTimeOffRequestDto,
    respondedBy?: string
  ): Promise<RiderEntity> {
    return this.repository.updateTimeOffRequest(riderId, requestId, {
      status: dto.status,
      respondedAt: new Date(),
      respondedBy,
    });
  }

  async getTimeOffRequests(riderId: string): Promise<TimeOffRequest[]> {
    const rider = await this.repository.getRiderById(riderId);
    return rider.timeOffRequests || [];
  }

  // ==================== BIKE ASSIGNMENT ====================

  async assignBike(riderId: string, bikeId: string): Promise<RiderEntity> {
    const [rider, bike] = await Promise.all([
      this.repository.getRiderById(riderId),
      this.repository.getBikeById(bikeId),
    ]);

    // Validate
    if (rider.companyId !== bike.companyId) {
      throw new BadRequestException('Bike and rider must belong to the same company');
    }
    if (bike.assignedRiderId && bike.assignedRiderId !== riderId) {
      throw new BadRequestException('Bike is already assigned to another rider');
    }

    // Unassign previous bike if any
    if (rider.assignedBikeId && rider.assignedBikeId !== bikeId) {
      await this.repository.unassignBike(rider.assignedBikeId);
    }

    // Assign new bike
    await this.repository.assignBikeToRider(bikeId, riderId, rider.fullName);

    return this.repository.updateRider(riderId, {
      assignedBikeId: bikeId,
      assignedBikePlate: bike.plateNumber,
    });
  }

  async unassignBike(riderId: string): Promise<RiderEntity> {
    const rider = await this.repository.getRiderById(riderId);
    
    if (rider.assignedBikeId) {
      await this.repository.unassignBike(rider.assignedBikeId);
    }

    return this.repository.updateRider(riderId, {
      assignedBikeId: undefined,
      assignedBikePlate: undefined,
    });
  }

  // ==================== DELETE ====================

  async deleteRider(id: string): Promise<void> {
    const rider = await this.repository.getRiderById(id);
    
    // Unassign bike if assigned
    if (rider.assignedBikeId) {
      await this.repository.unassignBike(rider.assignedBikeId);
    }

    await this.repository.deleteRider(id);
    this.logger.log(`Deleted rider: ${id}`);
  }

  // ==================== HELPERS ====================

  private validateStatusTransition(current: RiderStatus, next: RiderStatus): void {
    const validTransitions: Record<RiderStatus, RiderStatus[]> = {
      pending: ['active', 'inactive'],
      active: ['suspended', 'inactive'],
      suspended: ['active', 'inactive'],
      inactive: ['active'],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} -> ${next}`
      );
    }
  }

  mapToResponse(rider: RiderEntity): RiderResponseDto {
    return {
      id: rider.id,
      companyId: rider.companyId,
      firstName: rider.firstName,
      lastName: rider.lastName,
      email: rider.email,
      phone: rider.phone,
      alternatePhone: rider.alternatePhone,
      idType: rider.idType,
      idNumber: rider.idNumber,
      profilePhotoUrl: rider.profilePhotoUrl,
      status: rider.status,
      isOnline: rider.isOnline,
      isAvailable: rider.isAvailable,
      lastActiveAt: rider.lastActiveAt,
      currentLocation: rider.currentLocation,
      assignedBikeId: rider.assignedBikeId,
      assignedBikePlate: rider.assignedBikePlate,
      activeAssignments: rider.activeAssignments,
      onboardingComplete: rider.onboardingComplete,
      rating: rider.rating,
      totalCompletedTasks: rider.totalCompletedTasks,
      stats: rider.stats,
      createdAt: rider.createdAt,
      updatedAt: rider.updatedAt,
    };
  }
}
