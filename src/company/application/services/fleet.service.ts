import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CompanyRepository } from '../../infrastructure/repositories';
import { BikeEntity, MaintenanceRecord, BikeStatus } from '../../domain/entities';
import {
  CreateBikeDto,
  UpdateBikeDto,
  UpdateBikeStatusDto,
  UpdateMileageDto,
  CreateMaintenanceRecordDto,
  AssignBikeToRiderDto,
  BikeResponseDto,
  BikeQueryDto,
} from '../dtos';

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);

  constructor(private readonly repository: CompanyRepository) {}

  async createBike(companyId: string, dto: CreateBikeDto): Promise<BikeEntity> {
    const bike = await this.repository.createBike(companyId, {
      ...dto,
      fuelType: dto.fuelType || 'petrol',
      status: 'active',
      currentMileage: dto.initialMileage || 0,
      initialMileage: dto.initialMileage || 0,
      maintenanceHistory: [],
      documents: [],
      assignmentHistory: [],
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
      insurance: dto.insurance
        ? {
            ...dto.insurance,
            startDate: new Date(dto.insurance.startDate),
            expiryDate: new Date(dto.insurance.expiryDate),
            status: 'active',
          }
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    this.logger.log(`Created bike: ${bike.id} for company: ${companyId}`);
    return bike;
  }

  async getBikeById(id: string): Promise<BikeEntity> {
    return this.repository.getBikeById(id);
  }

  async getBikesByCompany(companyId: string, query?: BikeQueryDto): Promise<BikeEntity[]> {
    return this.repository.getBikesByCompany(companyId, query);
  }

  async getAvailableBikes(companyId: string): Promise<BikeEntity[]> {
    return this.repository.getAvailableBikes(companyId);
  }

  async updateBike(id: string, dto: UpdateBikeDto): Promise<BikeEntity> {
    await this.repository.getBikeById(id); // Ensure exists

    // Build updates object, excluding insurance which needs special handling
    const { insurance, ...rest } = dto;
    const updates: Partial<BikeEntity> = { ...rest };

    if (insurance) {
      updates.insurance = {
        ...insurance,
        startDate: new Date(insurance.startDate),
        expiryDate: new Date(insurance.expiryDate),
        status: 'active',
      };
    }

    return this.repository.updateBike(id, updates);
  }

  async updateBikeStatus(id: string, status: string): Promise<BikeEntity> {
    const bike = await this.repository.getBikeById(id);
    
    // Validate status transition
    this.validateStatusTransition(bike.status, status as BikeStatus);
    
    return this.repository.updateBikeStatus(id, status as BikeStatus);
  }

  async updateMileage(id: string, mileage: number): Promise<BikeEntity> {
    const bike = await this.repository.getBikeById(id);
    
    if (mileage < (bike.currentMileage || 0)) {
      throw new BadRequestException('New mileage cannot be less than current mileage');
    }

    return this.repository.updateBikeMileage(id, mileage);
  }

  // ==================== MAINTENANCE ====================

  async addMaintenanceRecord(bikeId: string, dto: CreateMaintenanceRecordDto): Promise<BikeEntity> {
    const bike = await this.repository.getBikeById(bikeId);

    const record: MaintenanceRecord = {
      id: uuidv4(),
      date: new Date(),
      type: dto.type,
      description: dto.description,
      cost: dto.cost,
      performedBy: dto.performedBy,
      vendorName: dto.vendorName,
      mileageAtService: dto.mileageAtService || bike.currentMileage,
      nextServiceDue: dto.nextServiceDue ? new Date(dto.nextServiceDue) : undefined,
      nextServiceMileage: dto.nextServiceMileage,
      parts: dto.parts,
      notes: dto.notes,
      receiptUrl: dto.receiptUrl,
    };

    return this.repository.addMaintenanceRecord(bikeId, record);
  }

  async getMaintenanceHistory(bikeId: string): Promise<MaintenanceRecord[]> {
    const bike = await this.repository.getBikeById(bikeId);
    return bike.maintenanceHistory || [];
  }

  // ==================== ASSIGNMENT ====================

  async assignToRider(bikeId: string, riderId: string, assignedBy: string): Promise<BikeEntity> {
    const [bike, rider] = await Promise.all([
      this.repository.getBikeById(bikeId),
      this.repository.getRiderById(riderId),
    ]);

    // Validate
    if (bike.companyId !== rider.companyId) {
      throw new BadRequestException('Bike and rider must belong to the same company');
    }
    if (bike.status !== 'active') {
      throw new BadRequestException('Cannot assign inactive bike');
    }
    if (rider.status !== 'active') {
      throw new BadRequestException('Cannot assign bike to inactive rider');
    }

    // Unassign rider's previous bike if any
    if (rider.assignedBikeId && rider.assignedBikeId !== bikeId) {
      await this.repository.unassignBike(rider.assignedBikeId);
    }

    // Assign bike
    const updatedBike = await this.repository.assignBikeToRider(
      bikeId,
      riderId,
      `${rider.firstName} ${rider.lastName}`
    );

    // Update rider
    await this.repository.updateRider(riderId, {
      assignedBikeId: bikeId,
      assignedBikePlate: bike.plateNumber,
    });

    this.logger.log(`Assigned bike ${bikeId} to rider ${riderId}`);
    return updatedBike;
  }

  async unassignBike(bikeId: string, unassignedBy?: string): Promise<BikeEntity> {
    const bike = await this.repository.getBikeById(bikeId);
    
    if (bike.assignedRiderId) {
      // Update rider to remove bike assignment
      await this.repository.updateRider(bike.assignedRiderId, {
        assignedBikeId: undefined,
        assignedBikePlate: undefined,
      });
    }

    return this.repository.unassignBike(bikeId);
  }

  // ==================== FLEET SUMMARY ====================

  async getFleetSummary(companyId: string) {
    const bikes = await this.repository.getBikesByCompany(companyId);

    const total = bikes.length;
    const active = bikes.filter((b) => b.status === 'active').length;
    const maintenance = bikes.filter((b) => b.status === 'maintenance').length;
    const inactive = bikes.filter((b) => b.status === 'inactive').length;
    const decommissioned = bikes.filter((b) => b.status === 'decommissioned').length;
    const assigned = bikes.filter((b) => b.assignedRiderId).length;
    const available = bikes.filter((b) => b.status === 'active' && !b.assignedRiderId).length;

    const upcomingMaintenance = bikes.filter((b) => {
      if (!b.nextMaintenanceDate) return false;
      const daysUntil = Math.ceil(
        (new Date(b.nextMaintenanceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 7 && daysUntil > 0;
    }).length;

    const expiringInsurance = bikes.filter((b) => {
      if (!b.insurance?.expiryDate) return false;
      const daysUntil = Math.ceil(
        (new Date(b.insurance.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 30 && daysUntil > 0;
    }).length;

    const totalMileage = bikes.reduce((sum, b) => sum + (b.currentMileage || 0), 0);

    return {
      total,
      active,
      maintenance,
      inactive,
      decommissioned,
      assigned,
      available,
      upcomingMaintenance,
      expiringInsurance,
      totalMileage,
    };
  }

  // ==================== INSURANCE ====================

  async updateInsurance(bikeId: string, dto: any): Promise<BikeEntity> {
    await this.repository.getBikeById(bikeId); // Ensure exists

    const insurance = {
      ...dto,
      startDate: new Date(dto.startDate),
      expiryDate: new Date(dto.expiryDate),
      status: 'active',
    };

    return this.repository.updateBike(bikeId, { insurance });
  }

  // ==================== DELETE ====================

  async deleteBike(id: string): Promise<void> {
    const bike = await this.repository.getBikeById(id);
    
    // Unassign from rider if assigned
    if (bike.assignedRiderId) {
      await this.repository.updateRider(bike.assignedRiderId, {
        assignedBikeId: undefined,
        assignedBikePlate: undefined,
      });
    }

    await this.repository.deleteBike(id);
    this.logger.log(`Deleted bike: ${id}`);
  }

  // ==================== HELPERS ====================

  private validateStatusTransition(current: BikeStatus, next: BikeStatus): void {
    const validTransitions: Record<BikeStatus, BikeStatus[]> = {
      active: ['maintenance', 'inactive', 'decommissioned'],
      maintenance: ['active', 'inactive', 'decommissioned'],
      inactive: ['active', 'maintenance', 'decommissioned'],
      decommissioned: [], // Cannot transition from decommissioned
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} -> ${next}`
      );
    }
  }

  mapToResponse(bike: BikeEntity): BikeResponseDto {
    return {
      id: bike.id,
      companyId: bike.companyId,
      name: bike.name,
      registrationNumber: bike.registrationNumber,
      plateNumber: bike.plateNumber,
      make: bike.make,
      model: bike.model,
      year: bike.year,
      color: bike.color,
      engineCapacity: bike.engineCapacity,
      fuelType: bike.fuelType,
      status: bike.status,
      assignedRiderId: bike.assignedRiderId,
      assignedRiderName: bike.assignedRiderName,
      dateAssigned: bike.dateAssigned,
      currentMileage: bike.currentMileage,
      lastMileageUpdate: bike.lastMileageUpdate,
      lastMaintenanceDate: bike.lastMaintenanceDate,
      nextMaintenanceDate: bike.nextMaintenanceDate,
      insurance: bike.insurance
        ? {
            provider: bike.insurance.provider,
            policyNumber: bike.insurance.policyNumber,
            type: bike.insurance.type,
            startDate: bike.insurance.startDate.toISOString(),
            expiryDate: bike.insurance.expiryDate.toISOString(),
            premium: bike.insurance.premium,
            coverage: bike.insurance.coverage,
          }
        : undefined,
      totalCosts: bike.totalCosts
        ? {
            ...bike.totalCosts,
            total:
              (bike.totalCosts.maintenance || 0) +
              (bike.totalCosts.fuel || 0) +
              (bike.totalCosts.insurance || 0) +
              (bike.totalCosts.repairs || 0) +
              (bike.totalCosts.other || 0),
          }
        : undefined,
      createdAt: bike.createdAt,
      updatedAt: bike.updatedAt,
    };
  }
}
