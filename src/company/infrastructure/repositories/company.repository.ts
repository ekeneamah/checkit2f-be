import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Firestore, FieldValue } from '@google-cloud/firestore';
import { FirebaseConfigService } from '../../../shared/config/firebase-config.service';
import {
  VerificationCompanyEntity,
  RiderEntity,
  BikeEntity,
  CompanyAssignmentEntity,
  Rider,
  Bike,
  CompanyAssignment,
  RiderDocument,
  MaintenanceRecord,
  TimeOffRequest,
  RiderStatus,
  BikeStatus,
  AssignmentStatus,
} from '../../domain/entities';

@Injectable()
export class CompanyRepository {
  private readonly logger = new Logger(CompanyRepository.name);
  private readonly db: Firestore;

  // Collection names
  private readonly COMPANIES = 'verification_companies';
  private readonly RIDERS = 'riders';
  private readonly BIKES = 'bikes';
  private readonly ASSIGNMENTS = 'company_assignments';

  constructor(private readonly firebaseService: FirebaseConfigService) {
    this.db = this.firebaseService.firestore as Firestore;
  }

  // ==================== COMPANY ====================

  async createCompany(data: Omit<VerificationCompanyEntity, 'id'>): Promise<VerificationCompanyEntity> {
    const docRef = this.db.collection(this.COMPANIES).doc();
    const company = new VerificationCompanyEntity({ ...data, id: docRef.id });
    await docRef.set(this.toFirestore(company));
    this.logger.log(`Created company: ${docRef.id}`);
    return company;
  }

  async getCompanyById(id: string): Promise<VerificationCompanyEntity> {
    const doc = await this.db.collection(this.COMPANIES).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Company not found: ${id}`);
    }
    return this.fromFirestore(doc, VerificationCompanyEntity);
  }

  async getCompanyByOwnerId(ownerId: string): Promise<VerificationCompanyEntity | null> {
    const snapshot = await this.db
      .collection(this.COMPANIES)
      .where('ownerId', '==', ownerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.fromFirestore(snapshot.docs[0], VerificationCompanyEntity);
  }

  async updateCompany(id: string, data: Partial<VerificationCompanyEntity>): Promise<VerificationCompanyEntity> {
    const docRef = this.db.collection(this.COMPANIES).doc(id);
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getCompanyById(id);
  }

  /**
   * Get all companies with optional filters (for admin)
   */
  async getAllCompanies(filters?: {
    status?: string;
    city?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<VerificationCompanyEntity[]> {
    let query: FirebaseFirestore.Query = this.db.collection(this.COMPANIES);

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.city) {
      query = query.where('city', '==', filters.city);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    let companies = snapshot.docs.map((doc) => this.fromFirestore(doc, VerificationCompanyEntity));

    // Apply search filter in memory (Firestore doesn't support full-text search)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      companies = companies.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.ownerName.toLowerCase().includes(searchLower)
      );
    }

    return companies;
  }

  /**
   * Get companies by multiple statuses for location aggregation
   */
  async getCompaniesByStatuses(statuses: string[]): Promise<VerificationCompanyEntity[]> {
    if (!statuses || statuses.length === 0) {
      return [];
    }

    // Firestore 'in' query supports up to 10 values
    const query = this.db
      .collection(this.COMPANIES)
      .where('status', 'in', statuses);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc, VerificationCompanyEntity));
  }

  // ==================== RIDERS ====================

  async createRider(companyId: string, data: Omit<Rider, 'id' | 'companyId'>): Promise<RiderEntity> {
    const docRef = this.db.collection(this.RIDERS).doc();
    const rider = new RiderEntity({
      ...data,
      id: docRef.id,
      companyId,
    });
    await docRef.set(this.toFirestore(rider));
    this.logger.log(`Created rider: ${docRef.id} for company: ${companyId}`);
    return rider;
  }

  async getRiderById(id: string): Promise<RiderEntity> {
    const doc = await this.db.collection(this.RIDERS).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Rider not found: ${id}`);
    }
    return this.fromFirestore(doc, RiderEntity);
  }

  /**
   * Get rider by Firebase UID
   */
  async getRiderByFirebaseUid(firebaseUid: string): Promise<RiderEntity | null> {
    const snapshot = await this.db
      .collection(this.RIDERS)
      .where('firebaseUid', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }
    return this.fromFirestore(snapshot.docs[0], RiderEntity);
  }

  async getRidersByCompany(
    companyId: string,
    filters?: { status?: RiderStatus; isOnline?: boolean; isAvailable?: boolean; limit?: number }
  ): Promise<RiderEntity[]> {
    let query: FirebaseFirestore.Query = this.db.collection(this.RIDERS);
    
    // Only filter by companyId if it's provided and not empty
    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.isOnline !== undefined) {
      query = query.where('isOnline', '==', filters.isOnline);
    }
    if (filters?.isAvailable !== undefined) {
      query = query.where('isAvailable', '==', filters.isAvailable);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc, RiderEntity));
  }

  /**
   * Get all riders across all companies (for admin)
   */
  async getAllRiders(): Promise<RiderEntity[]> {
    const snapshot = await this.db.collection(this.RIDERS).get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc, RiderEntity));
  }

  async getAvailableRiders(companyId: string): Promise<RiderEntity[]> {
    const snapshot = await this.db
      .collection(this.RIDERS)
      .where('companyId', '==', companyId)
      .where('status', '==', 'active')
      .where('isOnline', '==', true)
      .where('isAvailable', '==', true)
      .get();

    return snapshot.docs.map((doc) => this.fromFirestore(doc, RiderEntity));
  }

  async updateRider(id: string, data: Partial<Rider>): Promise<RiderEntity> {
    const docRef = this.db.collection(this.RIDERS).doc(id);
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getRiderById(id);
  }

  async updateRiderStatus(id: string, status: RiderStatus): Promise<RiderEntity> {
    return this.updateRider(id, { status });
  }

  async updateRiderLocation(
    id: string,
    location: { lat: number; lng: number; accuracy?: number }
  ): Promise<void> {
    await this.db.collection(this.RIDERS).doc(id).update({
      currentLocation: {
        ...location,
        timestamp: FieldValue.serverTimestamp(),
      },
      lastActiveAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async updateRiderOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.db.collection(this.RIDERS).doc(id).update({
      isOnline,
      lastActiveAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async addRiderDocument(riderId: string, document: RiderDocument): Promise<RiderEntity> {
    const rider = await this.getRiderById(riderId);
    const documents = [...(rider.documents || []), document];
    return this.updateRider(riderId, { documents });
  }

  async updateRiderDocument(
    riderId: string,
    documentId: string,
    updates: Partial<RiderDocument>
  ): Promise<RiderEntity> {
    const rider = await this.getRiderById(riderId);
    const documents = rider.documents.map((doc) =>
      doc.id === documentId ? { ...doc, ...updates } : doc
    );
    return this.updateRider(riderId, { documents });
  }

  async addTimeOffRequest(riderId: string, request: TimeOffRequest): Promise<RiderEntity> {
    const rider = await this.getRiderById(riderId);
    const timeOffRequests = [...(rider.timeOffRequests || []), request];
    return this.updateRider(riderId, { timeOffRequests });
  }

  async updateTimeOffRequest(
    riderId: string,
    requestId: string,
    updates: Partial<TimeOffRequest>
  ): Promise<RiderEntity> {
    const rider = await this.getRiderById(riderId);
    const timeOffRequests = (rider.timeOffRequests || []).map((req) =>
      req.id === requestId ? { ...req, ...updates } : req
    );
    return this.updateRider(riderId, { timeOffRequests });
  }

  async deleteRider(id: string): Promise<void> {
    await this.db.collection(this.RIDERS).doc(id).delete();
    this.logger.log(`Deleted rider: ${id}`);
  }

  // ==================== BIKES ====================

  async createBike(companyId: string, data: Omit<Bike, 'id' | 'companyId'>): Promise<BikeEntity> {
    const docRef = this.db.collection(this.BIKES).doc();
    const bike = new BikeEntity({
      ...data,
      id: docRef.id,
      companyId,
    });
    await docRef.set(this.toFirestore(bike));
    this.logger.log(`Created bike: ${docRef.id} for company: ${companyId}`);
    return bike;
  }

  async getBikeById(id: string): Promise<BikeEntity> {
    const doc = await this.db.collection(this.BIKES).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Bike not found: ${id}`);
    }
    return this.fromFirestore(doc, BikeEntity);
  }

  async getBikesByCompany(
    companyId: string,
    filters?: { status?: BikeStatus; assignedRiderId?: string; unassigned?: boolean }
  ): Promise<BikeEntity[]> {
    let query = this.db.collection(this.BIKES).where('companyId', '==', companyId);

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.assignedRiderId) {
      query = query.where('assignedRiderId', '==', filters.assignedRiderId);
    }

    const snapshot = await query.get();
    let bikes = snapshot.docs.map((doc) => this.fromFirestore(doc, BikeEntity));

    if (filters?.unassigned) {
      bikes = bikes.filter((bike) => !bike.assignedRiderId);
    }

    return bikes;
  }

  async getAvailableBikes(companyId: string): Promise<BikeEntity[]> {
    const snapshot = await this.db
      .collection(this.BIKES)
      .where('companyId', '==', companyId)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs
      .map((doc) => this.fromFirestore(doc, BikeEntity))
      .filter((bike) => !bike.assignedRiderId);
  }

  async updateBike(id: string, data: Partial<Bike>): Promise<BikeEntity> {
    const docRef = this.db.collection(this.BIKES).doc(id);
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getBikeById(id);
  }

  async updateBikeStatus(id: string, status: BikeStatus): Promise<BikeEntity> {
    return this.updateBike(id, { status });
  }

  async updateBikeMileage(id: string, mileage: number): Promise<BikeEntity> {
    return this.updateBike(id, {
      currentMileage: mileage,
      lastMileageUpdate: new Date(),
    });
  }

  async addMaintenanceRecord(bikeId: string, record: MaintenanceRecord): Promise<BikeEntity> {
    const bike = await this.getBikeById(bikeId);
    const maintenanceHistory = [...(bike.maintenanceHistory || []), record];
    
    // Update costs
    const totalMaintenanceCost = maintenanceHistory.reduce((sum, r) => sum + r.cost, 0);
    const totalCosts = {
      ...(bike.totalCosts || { maintenance: 0, fuel: 0, insurance: 0, repairs: 0, other: 0 }),
      maintenance: totalMaintenanceCost,
    };

    return this.updateBike(bikeId, {
      maintenanceHistory,
      totalCosts,
      lastMaintenanceDate: record.date,
      nextMaintenanceDate: record.nextServiceDue,
      nextMaintenanceMileage: record.nextServiceMileage,
    });
  }

  async assignBikeToRider(bikeId: string, riderId: string, riderName: string): Promise<BikeEntity> {
    const bike = await this.getBikeById(bikeId);
    
    // Add to assignment history
    const assignmentHistory = [...(bike.assignmentHistory || [])];
    
    // Close previous assignment if exists
    if (bike.assignedRiderId) {
      const lastAssignment = assignmentHistory[assignmentHistory.length - 1];
      if (lastAssignment && !lastAssignment.endDate) {
        lastAssignment.endDate = new Date();
        lastAssignment.mileageAtEnd = bike.currentMileage;
      }
    }

    // Add new assignment
    assignmentHistory.push({
      riderId,
      riderName,
      startDate: new Date(),
      reason: bike.assignedRiderId ? 'reassignment' : 'new_assignment',
      mileageAtStart: bike.currentMileage,
    });

    return this.updateBike(bikeId, {
      assignedRiderId: riderId,
      assignedRiderName: riderName,
      dateAssigned: new Date(),
      assignmentHistory,
    });
  }

  async unassignBike(bikeId: string): Promise<BikeEntity> {
    const bike = await this.getBikeById(bikeId);
    const assignmentHistory = [...(bike.assignmentHistory || [])];
    
    // Close current assignment
    const lastAssignment = assignmentHistory[assignmentHistory.length - 1];
    if (lastAssignment && !lastAssignment.endDate) {
      lastAssignment.endDate = new Date();
      lastAssignment.mileageAtEnd = bike.currentMileage;
    }

    return this.updateBike(bikeId, {
      assignedRiderId: undefined,
      assignedRiderName: undefined,
      dateAssigned: undefined,
      assignmentHistory,
    });
  }

  async deleteBike(id: string): Promise<void> {
    await this.db.collection(this.BIKES).doc(id).delete();
    this.logger.log(`Deleted bike: ${id}`);
  }

  // ==================== ASSIGNMENTS ====================

  async createAssignment(data: Omit<CompanyAssignment, 'id'>): Promise<CompanyAssignmentEntity> {
    const docRef = this.db.collection(this.ASSIGNMENTS).doc();
    const assignment = new CompanyAssignmentEntity({
      ...data,
      id: docRef.id,
    });
    await docRef.set(this.toFirestore(assignment));
    this.logger.log(`Created assignment: ${docRef.id}`);
    return assignment;
  }

  async getAssignmentById(id: string): Promise<CompanyAssignmentEntity> {
    const doc = await this.db.collection(this.ASSIGNMENTS).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Assignment not found: ${id}`);
    }
    return this.fromFirestore(doc, CompanyAssignmentEntity);
  }

  async getAssignmentsByCompany(
    companyId: string,
    filters?: { status?: AssignmentStatus; riderId?: string; limit?: number; offset?: number }
  ): Promise<CompanyAssignmentEntity[]> {
    let query = this.db
      .collection(this.ASSIGNMENTS)
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc');

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.riderId) {
      query = query.where('riderId', '==', filters.riderId);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc, CompanyAssignmentEntity));
  }

  async getAssignmentsByRider(
    riderId: string,
    filters?: { status?: AssignmentStatus }
  ): Promise<CompanyAssignmentEntity[]> {
    let query = this.db
      .collection(this.ASSIGNMENTS)
      .where('riderId', '==', riderId)
      .orderBy('createdAt', 'desc');

    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc, CompanyAssignmentEntity));
  }

  async updateAssignment(id: string, data: Partial<CompanyAssignment>): Promise<CompanyAssignmentEntity> {
    const docRef = this.db.collection(this.ASSIGNMENTS).doc(id);
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getAssignmentById(id);
  }

  async updateAssignmentStatus(
    id: string,
    status: AssignmentStatus,
    note?: string,
    updatedBy?: string
  ): Promise<CompanyAssignmentEntity> {
    const assignment = await this.getAssignmentById(id);
    assignment.updateStatus(status, note, updatedBy);
    
    await this.db.collection(this.ASSIGNMENTS).doc(id).update({
      status: assignment.status,
      timeline: assignment.timeline,
      statusHistory: assignment.statusHistory,
      actualDuration: assignment.actualDuration,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return assignment;
  }

  // ==================== HELPERS ====================

  private toFirestore(entity: any): Record<string, any> {
    // Deep clone to plain object, removing class prototypes
    const data = JSON.parse(JSON.stringify(entity));
    
    // Convert dates to Firestore timestamps
    if (entity.createdAt instanceof Date) {
      data.createdAt = FieldValue.serverTimestamp();
    }
    if (entity.updatedAt instanceof Date) {
      data.updatedAt = FieldValue.serverTimestamp();
    }
    
    return data;
  }

  private fromFirestore<T>(doc: FirebaseFirestore.DocumentSnapshot, EntityClass: new (data: any) => T): T {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }

    // Convert Firestore timestamps to Dates
    const converted = this.convertTimestamps(data);
    return new EntityClass({ ...converted, id: doc.id });
  }

  private convertTimestamps(data: any): any {
    if (!data) return data;
    if (data.toDate) return data.toDate();
    if (Array.isArray(data)) return data.map((item) => this.convertTimestamps(item));
    if (typeof data === 'object') {
      const result: any = {};
      for (const key in data) {
        result[key] = this.convertTimestamps(data[key]);
      }
      return result;
    }
    return data;
  }
}
