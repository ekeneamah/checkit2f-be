import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { CompanyRepository } from '../../infrastructure/repositories';
import { VerificationCompanyEntity } from '../../domain/entities';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CompanyStatsResponseDto,
} from '../dtos';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly repository: CompanyRepository) {}

  async createCompany(dto: CreateCompanyDto): Promise<VerificationCompanyEntity> {
    // Check if company already exists for this owner
    const existing = await this.repository.getCompanyByOwnerId(dto.ownerId);
    if (existing) {
      throw new ConflictException('Company already exists for this owner');
    }

    const company = await this.repository.createCompany({
      ...dto,
      status: 'pending',
      isVerified: false,
      settings: {
        autoAssignEnabled: false,
        assignmentMethod: 'manual',
        maxDistanceKm: 20,
        maxActiveAssignments: 5,
        requireBikeAssignment: true,
        allowSelfAssign: true,
        notifyOnNewRequest: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    this.logger.log(`Created company: ${company.id} for owner: ${dto.ownerId}`);
    return company;
  }

  async getCompanyById(id: string): Promise<VerificationCompanyEntity> {
    return this.repository.getCompanyById(id);
  }

  async getCompanyByOwnerId(ownerId: string): Promise<VerificationCompanyEntity> {
    const company = await this.repository.getCompanyByOwnerId(ownerId);
    if (!company) {
      throw new NotFoundException('Company not found for this user');
    }
    return company;
  }

  async updateCompany(id: string, dto: UpdateCompanyDto): Promise<VerificationCompanyEntity> {
    await this.repository.getCompanyById(id); // Ensure exists
    
    // Convert DTO to partial entity, handling nested objects
    const updates: Partial<VerificationCompanyEntity> = { ...dto } as any;
    
    return this.repository.updateCompany(id, updates);
  }

  async updateSettings(
    id: string,
    settings: Partial<VerificationCompanyEntity['settings']>
  ): Promise<VerificationCompanyEntity> {
    const company = await this.repository.getCompanyById(id);
    const updatedSettings = { ...company.settings, ...settings };
    return this.repository.updateCompany(id, { settings: updatedSettings });
  }

  async updateCompanyStatus(id: string, status: string): Promise<VerificationCompanyEntity> {
    await this.repository.getCompanyById(id); // Ensure exists
    return this.repository.updateCompany(id, { status: status as any });
  }

  /**
   * Get all companies with optional filters (for admin)
   */
  async getAllCompanies(query: {
    status?: string;
    city?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<VerificationCompanyEntity[]> {
    return this.repository.getAllCompanies(query);
  }

  /**
   * Get admin dashboard statistics summary
   */
  async getAdminStatsSummary(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    pendingCompanies: number;
    suspendedCompanies: number;
    totalRiders: number;
    activeRiders: number;
  }> {
    const allCompanies = await this.repository.getAllCompanies({});
    const allRiders = await this.repository.getAllRiders();

    return {
      totalCompanies: allCompanies.length,
      activeCompanies: allCompanies.filter(c => c.status === 'active').length,
      pendingCompanies: allCompanies.filter(c => c.status === 'pending').length,
      suspendedCompanies: allCompanies.filter(c => c.status === 'suspended').length,
      totalRiders: allRiders.length,
      activeRiders: allRiders.filter(r => r.status === 'active').length,
    };
  }

  async getStats(companyId: string): Promise<CompanyStatsResponseDto> {
    const [riders, bikes, assignments] = await Promise.all([
      this.repository.getRidersByCompany(companyId),
      this.repository.getBikesByCompany(companyId),
      this.repository.getAssignmentsByCompany(companyId),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = assignments.filter(
      (a) =>
        a.status === 'completed' &&
        a.timeline.completedAt &&
        new Date(a.timeline.completedAt) >= today
    ).length;

    const pendingAssignments = assignments.filter(
      (a) => ['pending', 'accepted', 'in_progress'].includes(a.status)
    ).length;

    const completedAssignments = assignments.filter((a) => a.status === 'completed');
    const totalEarnings = completedAssignments.reduce((sum, a) => sum + (a.companyShare || 0), 0);

    // Calculate earnings by period
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const earningsToday = completedAssignments
      .filter((a) => a.timeline.completedAt && new Date(a.timeline.completedAt) >= today)
      .reduce((sum, a) => sum + (a.companyShare || 0), 0);

    const earningsWeek = completedAssignments
      .filter((a) => a.timeline.completedAt && new Date(a.timeline.completedAt) >= weekAgo)
      .reduce((sum, a) => sum + (a.companyShare || 0), 0);

    const earningsMonth = completedAssignments
      .filter((a) => a.timeline.completedAt && new Date(a.timeline.completedAt) >= monthAgo)
      .reduce((sum, a) => sum + (a.companyShare || 0), 0);

    const averageRating =
      riders.length > 0
        ? riders.reduce((sum, r) => sum + r.rating, 0) / riders.length
        : 0;

    const completionRate =
      assignments.length > 0
        ? (completedAssignments.length / assignments.length) * 100
        : 0;

    return {
      totalRequests: assignments.length,
      completedToday,
      pendingAssignments,
      activeRiders: riders.filter((r) => r.status === 'active' && r.isOnline).length,
      totalRiders: riders.length,
      activeBikes: bikes.filter((b) => b.status === 'active').length,
      totalBikes: bikes.length,
      earnings: {
        today: earningsToday,
        week: earningsWeek,
        month: earningsMonth,
      },
      averageRating: Math.round(averageRating * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
    };
  }

  mapToResponse(company: VerificationCompanyEntity): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      email: company.email,
      phone: company.phone,
      alternatePhone: company.alternatePhone,
      ownerId: company.ownerId,
      ownerName: company.ownerName,
      businessType: company.businessType,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      serviceAreas: company.serviceAreas,
      settings: company.settings,
      status: company.status,
      isVerified: company.isVerified,
      stats: company.stats,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }
}
