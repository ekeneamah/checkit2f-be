import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CompanyRepository } from '../../infrastructure/repositories';
import { VerificationCompanyEntity, ServiceArea, ServiceAreaPricingEntity } from '../../domain/entities';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyResponseDto,
  CompanyStatsResponseDto,
  ServiceAreaDto,
  CreatePricingDto,
  UpdatePricingDto,
  PricingResponseDto,
  PriceCalculationResponseDto,
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

  // ==================== SERVICE AREA MANAGEMENT ====================

  /**
   * Get all service areas for a company
   */
  async getServiceAreas(companyId: string): Promise<ServiceArea[]> {
    const company = await this.repository.getCompanyById(companyId);
    return company.serviceAreas || [];
  }

  /**
   * Add a new service area to company
   */
  async addServiceArea(companyId: string, serviceArea: ServiceAreaDto): Promise<VerificationCompanyEntity> {
    const company = await this.repository.getCompanyById(companyId);
    
    const normalizedArea = this.normalizeServiceArea(serviceArea);
    
    // Check if service area already exists (same state + LGA + locality overlap)
    const exists = company.serviceAreas.some(sa => {
      if (sa.state.toLowerCase() !== normalizedArea.state.toLowerCase()) return false;
      if (sa.lga.toLowerCase() !== normalizedArea.lga.toLowerCase()) return false;
      
      // If both have no localities, they're covering the same LGA - conflict
      if (!sa.localities?.length && !normalizedArea.localities?.length) return true;
      
      // If one has localities and other doesn't, no conflict (specific vs entire LGA)
      if (!sa.localities?.length || !normalizedArea.localities?.length) return false;
      
      // Both have localities - check for overlap
      return sa.localities.some(loc => 
        normalizedArea.localities!.some(newLoc => 
          loc.toLowerCase() === newLoc.toLowerCase()
        )
      );
    });
    
    if (exists) {
      const location = normalizedArea.localities?.length 
        ? `${normalizedArea.localities.join(', ')}, ${normalizedArea.lga}`
        : normalizedArea.lga;
      throw new ConflictException(`Service area for ${location}, ${normalizedArea.state} already exists or overlaps`);
    }

    const updatedAreas = [...company.serviceAreas, normalizedArea];
    const updated = await this.repository.updateCompany(companyId, { 
      serviceAreas: updatedAreas 
    });

    this.logger.log(`Added service area to company: ${companyId}`);
    return updated;
  }

  /**
   * Add multiple service areas at once
   */
  async addMultipleServiceAreas(
    companyId: string, 
    serviceAreas: ServiceAreaDto[]
  ): Promise<VerificationCompanyEntity> {
    if (!serviceAreas || serviceAreas.length === 0) {
      throw new BadRequestException('Must provide at least one service area');
    }

    const company = await this.repository.getCompanyById(companyId);
    const normalizedAreas = serviceAreas.map(sa => this.normalizeServiceArea(sa));
    
    // Check for duplicates within the new areas
    for (let i = 0; i < normalizedAreas.length; i++) {
      for (let j = i + 1; j < normalizedAreas.length; j++) {
        const area1 = normalizedAreas[i];
        const area2 = normalizedAreas[j];
        
        if (area1.state.toLowerCase() !== area2.state.toLowerCase()) continue;
        if (area1.lga.toLowerCase() !== area2.lga.toLowerCase()) continue;
        
        // Same state + LGA
        if (!area1.localities?.length && !area2.localities?.length) {
          throw new ConflictException(`Duplicate LGA found: ${area1.lga}, ${area1.state}`);
        }
        
        if (!area1.localities?.length || !area2.localities?.length) continue;
        
        const overlap = area1.localities.some(loc1 => 
          area2.localities!.some(loc2 => loc1.toLowerCase() === loc2.toLowerCase())
        );
        
        if (overlap) {
          throw new ConflictException(`Duplicate localities found in ${area1.lga}, ${area1.state}`);
        }
      }
    }
    
    // Check against existing areas
    for (const newArea of normalizedAreas) {
      const exists = company.serviceAreas.some(sa => {
        if (sa.state.toLowerCase() !== newArea.state.toLowerCase()) return false;
        if (sa.lga.toLowerCase() !== newArea.lga.toLowerCase()) return false;
        
        if (!sa.localities?.length && !newArea.localities?.length) return true;
        if (!sa.localities?.length || !newArea.localities?.length) return false;
        
        return sa.localities.some(loc => 
          newArea.localities!.some(newLoc => loc.toLowerCase() === newLoc.toLowerCase())
        );
      });
      
      if (exists) {
        const location = newArea.localities?.length 
          ? `${newArea.localities.join(', ')}, ${newArea.lga}`
          : newArea.lga;
        throw new ConflictException(`Service area for ${location}, ${newArea.state} already exists`);
      }
    }

    const updatedAreas = [...company.serviceAreas, ...normalizedAreas];
    const updated = await this.repository.updateCompany(companyId, { 
      serviceAreas: updatedAreas 
    });

    this.logger.log(`Added ${normalizedAreas.length} service areas to company: ${companyId}`);
    return updated;
  }

  /**
   * Helper: Normalize service area to ensure LGA is valid
   */
  private normalizeServiceArea(serviceArea: ServiceAreaDto): ServiceAreaDto {
    if (!serviceArea.lga || serviceArea.lga.trim().length === 0) {
      throw new BadRequestException('Service area must have a valid LGA');
    }
    
    // Trim and remove duplicates from localities if provided
    const localities = serviceArea.localities?.length 
      ? Array.from(new Set(serviceArea.localities.map(l => l.trim()).filter(l => l.length > 0)))
      : [];
    
    return {
      ...serviceArea,
      lga: serviceArea.lga.trim(),
      localities: localities.length > 0 ? localities : undefined
    };
  }

  /**
   * Update an existing service area
   */
  async updateServiceArea(
    companyId: string, 
    updates: ServiceAreaDto
  ): Promise<VerificationCompanyEntity> {
    const company = await this.repository.getCompanyById(companyId);
    
    const index = company.serviceAreas.findIndex(
      sa => sa.state.toLowerCase() === updates.state.toLowerCase()
    );
    
    if (index === -1) {
      throw new NotFoundException(`Service area for state ${updates.state} not found`);
    }

    // Normalize the updates
    const normalizedUpdates = this.normalizeServiceArea(updates);

    const updatedAreas = [...company.serviceAreas];
    updatedAreas[index] = normalizedUpdates;

    const updated = await this.repository.updateCompany(companyId, { 
      serviceAreas: updatedAreas 
    });

    this.logger.log(`Updated service area for state ${updates.state} in company: ${companyId}`);
    return updated;
  }

  /**
   * Remove a service area from company
   */
  async removeServiceArea(
    companyId: string, 
    state: string
  ): Promise<VerificationCompanyEntity> {
    const company = await this.repository.getCompanyById(companyId);
    
    if (company.serviceAreas.length === 1) {
      throw new BadRequestException('Cannot remove the last service area. Company must have at least one service area.');
    }

    const updatedAreas = company.serviceAreas.filter(
      sa => sa.state.toLowerCase() !== state.toLowerCase()
    );

    if (updatedAreas.length === company.serviceAreas.length) {
      throw new NotFoundException(`Service area for state ${state} not found`);
    }

    const updated = await this.repository.updateCompany(companyId, { 
      serviceAreas: updatedAreas 
    });

    this.logger.log(`Removed service area for state ${state} from company: ${companyId}`);
    return updated;
  }

  /**
   * Replace all service areas (batch update)
   */
  async batchUpdateServiceAreas(
    companyId: string, 
    serviceAreas: ServiceAreaDto[]
  ): Promise<VerificationCompanyEntity> {
    if (!serviceAreas || serviceAreas.length === 0) {
      throw new BadRequestException('Company must have at least one service area');
    }

    // Normalize all service areas
    const normalizedAreas = serviceAreas.map(sa => this.normalizeServiceArea(sa));
    
    const company = await this.repository.getCompanyById(companyId);
    
    const updated = await this.repository.updateCompany(companyId, { 
      serviceAreas: normalizedAreas 
    });

    this.logger.log(`Batch updated service areas for company: ${companyId} (${normalizedAreas.length} areas)`);
    return updated;
  }

  /**
   * Get available LGAs and localities for a state from companies serving that area
   */
  async getAvailableLocationsForState(state: string): Promise<{ 
    lgas: string[]; 
    localitiesByLga: Record<string, string[]>;
  }> {
    // Fetch companies from repository with specific statuses
    const companies = await this.repository.getCompaniesByStatuses(['active', 'pending']);
    
    const lgasSet = new Set<string>();
    const localitiesMap = new Map<string, Set<string>>();
    
    const normalizedState = state.toLowerCase();
    
    // Extract LGAs and localities from service areas matching the state
    for (const company of companies) {
      const matchingAreas = company.serviceAreas.filter(
        sa => sa.state.toLowerCase() === normalizedState
      );
      
      for (const area of matchingAreas) {
        lgasSet.add(area.lga);
        
        if (area.localities?.length) {
          if (!localitiesMap.has(area.lga)) {
            localitiesMap.set(area.lga, new Set());
          }
          area.localities.forEach(loc => localitiesMap.get(area.lga)!.add(loc));
        }
      }
    }
    
    const localitiesByLga: Record<string, string[]> = {};
    localitiesMap.forEach((localities, lga) => {
      localitiesByLga[lga] = Array.from(localities).sort();
    });
    
    this.logger.log(`Found ${lgasSet.size} LGAs in ${state} from ${companies.length} companies`);
    
    return {
      lgas: Array.from(lgasSet).sort(),
      localitiesByLga,
    };
  }

  /**
   * Find all companies that serve a specific location
   * Used for request creation to check if any agents are available in the area
   * Supports both LGA-specific and city-level searches
   */
  async findCompaniesByLocation(query: {
    lga?: string;
    city?: string;
    state: string;
    locality?: string;
  }): Promise<VerificationCompanyEntity[]> {
    const locationDesc = query.lga 
      ? `${query.lga}, ${query.state}${query.locality ? `, ${query.locality}` : ''}`
      : `${query.city}, ${query.state} (city-level)`;
    this.logger.log(`Finding companies for location: ${locationDesc}`);
    
    // Only get active companies that can accept requests
    const companies = await this.repository.getCompaniesByStatuses(['active']);
    this.logger.log(`Total active companies: ${companies.length}`);
    
    // Log each company's service areas for debugging
    companies.forEach(company => {
      this.logger.debug(`Company ${company.name}: serviceAreas = ${JSON.stringify(company.serviceAreas.map(sa => ({ state: sa.state, lga: sa.lga, localities: sa.localities })))}`);
    });
    
    const matchingCompanies = companies.filter(company => {
      const hasMatch = company.serviceAreas.some(sa => {
        // Match state (required)
        const stateMatch = sa.state.toLowerCase() === query.state.toLowerCase();
        if (!stateMatch) {
          this.logger.debug(`Company ${company.name}: state mismatch (${sa.state} !== ${query.state})`);
          return false;
        }
        
        // If LGA is provided, do LGA-specific matching
        if (query.lga) {
          // Match LGA (required for LGA-specific search)
          const lgaMatch = sa.lga.toLowerCase() === query.lga.toLowerCase();
          if (!lgaMatch) {
            this.logger.debug(`Company ${company.name}: LGA mismatch (${sa.lga} !== ${query.lga})`);
            return false;
          }
          
          // If locality is provided, check if company serves it
          if (query.locality) {
            // If company has no localities specified, they serve the entire LGA
            if (!sa.localities?.length) return true;
            
            // Otherwise, check if the specific locality is in their list
            return sa.localities.some(loc => 
              loc.toLowerCase() === query.locality!.toLowerCase()
            );
          }
          
          // No locality specified - just LGA match is sufficient
          return true;
        }
        
        // City-level fallback: match any LGA in this state that contains the city name
        // This is a broader search when exact LGA is unknown
        if (query.city) {
          const cityLower = query.city.toLowerCase();
          const lgaLower = sa.lga.toLowerCase();
          
          // Check if LGA name contains the city name (e.g., "Port Harcourt City" contains "Port Harcourt")
          const cityMatch = lgaLower.includes(cityLower);
          this.logger.debug(`Company ${company.name}: City match check - "${lgaLower}".includes("${cityLower}") = ${cityMatch}`);
          return cityMatch;
        }
        
        return false;
      });
      
      if (hasMatch) {
        this.logger.log(`✅ Company ${company.name} matches`);
      }
      
      return hasMatch;
    });
    
    this.logger.log(`Found ${matchingCompanies.length} companies serving ${locationDesc}`);
    return matchingCompanies;
  }

  // ==================== PRICING MANAGEMENT ====================

  /**
   * Get all pricing rules for a company
   */
  async getPricing(companyId: string): Promise<PricingResponseDto[]> {
    const company = await this.repository.getCompanyById(companyId);
    
    if (!company.pricing || company.pricing.length === 0) {
      return [];
    }

    return company.pricing.map(p => ({
      id: p.id,
      state: p.state,
      lga: p.lga,
      locality: p.locality,
      basePrice: p.basePrice,
      pricePerKm: p.pricePerKm,
      minimumCharge: p.minimumCharge,
      maximumCharge: p.maximumCharge,
      surcharges: p.surcharges,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdBy: p.createdBy,
      notes: p.notes,
    }));
  }

  /**
   * Add a new pricing rule
   */
  async addPricing(companyId: string, pricingData: CreatePricingDto, createdBy?: string): Promise<PricingResponseDto> {
    const company = await this.repository.getCompanyById(companyId);
    
    // Check if pricing already exists for this location
    const exists = company.pricing?.some(p => 
      p.state.toLowerCase() === pricingData.state.toLowerCase() &&
      p.lga.toLowerCase() === pricingData.lga.toLowerCase() &&
      (!p.locality && !pricingData.locality || 
       p.locality?.toLowerCase() === pricingData.locality?.toLowerCase())
    );
    
    if (exists) {
      const location = pricingData.locality 
        ? `${pricingData.locality}, ${pricingData.lga}`
        : pricingData.lga;
      throw new ConflictException(`Pricing already exists for ${location}, ${pricingData.state}`);
    }

    const newPricing: ServiceAreaPricingEntity = {
      id: Date.now().toString(), // Simple ID generation
      ...pricingData,
      isActive: pricingData.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    const updatedPricing = [...(company.pricing || []), newPricing];
    await this.repository.updateCompany(companyId, { 
      pricing: updatedPricing as any
    });

    this.logger.log(`Added pricing rule for ${pricingData.lga}, ${pricingData.state} to company: ${companyId}`);
    
    return {
      id: newPricing.id,
      state: newPricing.state,
      lga: newPricing.lga,
      locality: newPricing.locality,
      basePrice: newPricing.basePrice,
      pricePerKm: newPricing.pricePerKm,
      minimumCharge: newPricing.minimumCharge,
      maximumCharge: newPricing.maximumCharge,
      surcharges: newPricing.surcharges,
      isActive: newPricing.isActive,
      createdAt: newPricing.createdAt,
      updatedAt: newPricing.updatedAt,
      createdBy: newPricing.createdBy,
      notes: newPricing.notes,
    };
  }

  /**
   * Update existing pricing rule
   */
  async updatePricing(companyId: string, pricingId: string, updates: UpdatePricingDto): Promise<PricingResponseDto> {
    const company = await this.repository.getCompanyById(companyId);
    
    const index = company.pricing?.findIndex(p => p.id === pricingId);
    if (index === undefined || index === -1) {
      throw new NotFoundException(`Pricing rule ${pricingId} not found`);
    }

    const updatedPricingItem = {
      ...company.pricing![index],
      ...updates,
      updatedAt: new Date(),
    };

    const updatedPricing = [...(company.pricing || [])];
    updatedPricing[index] = updatedPricingItem;

    await this.repository.updateCompany(companyId, { 
      pricing: updatedPricing as any
    });

    this.logger.log(`Updated pricing rule ${pricingId} for company: ${companyId}`);
    
    return {
      id: updatedPricingItem.id,
      state: updatedPricingItem.state,
      lga: updatedPricingItem.lga,
      locality: updatedPricingItem.locality,
      basePrice: updatedPricingItem.basePrice,
      pricePerKm: updatedPricingItem.pricePerKm,
      minimumCharge: updatedPricingItem.minimumCharge,
      maximumCharge: updatedPricingItem.maximumCharge,
      surcharges: updatedPricingItem.surcharges,
      isActive: updatedPricingItem.isActive,
      createdAt: updatedPricingItem.createdAt,
      updatedAt: updatedPricingItem.updatedAt,
      createdBy: updatedPricingItem.createdBy,
      notes: updatedPricingItem.notes,
    };
  }

  /**
   * Delete pricing rule
   */
  async deletePricing(companyId: string, pricingId: string): Promise<VerificationCompanyEntity> {
    const company = await this.repository.getCompanyById(companyId);
    
    const updatedPricing = company.pricing?.filter(p => p.id !== pricingId) || [];
    
    if (updatedPricing.length === company.pricing?.length) {
      throw new NotFoundException(`Pricing rule ${pricingId} not found`);
    }

    const updated = await this.repository.updateCompany(companyId, { 
      pricing: updatedPricing as any
    });

    this.logger.log(`Deleted pricing rule ${pricingId} from company: ${companyId}`);
    return updated;
  }

  /**
   * Calculate price for a verification request using hierarchical lookup
   * Hierarchy: Locality > LGA > State > Company Default
   */
  async calculatePrice(
    companyId: string,
    location: { state: string; lga: string; locality?: string },
    distanceKm: number,
    applySurcharges?: string[]
  ): Promise<{
    basePrice: number;
    distanceCharge: number;
    surchargeTotal: number;
    subtotal: number;
    finalPrice: number;
    pricingLevel: 'locality' | 'lga' | 'state' | 'default';
    breakdown: any;
  }> {
    const company = await this.repository.getCompanyById(companyId);
    
    // Try to find matching pricing rule (most specific first)
    let pricingRule: ServiceAreaPricingEntity | undefined;
    let pricingLevel: 'locality' | 'lga' | 'state' | 'default' = 'default';

    if (company.pricing?.length) {
      // 1. Try locality-specific pricing
      if (location.locality) {
        pricingRule = company.pricing.find(p =>
          p.isActive &&
          p.state.toLowerCase() === location.state.toLowerCase() &&
          p.lga.toLowerCase() === location.lga.toLowerCase() &&
          p.locality?.toLowerCase() === location.locality?.toLowerCase()
        );
        if (pricingRule) pricingLevel = 'locality';
      }

      // 2. Try LGA-wide pricing
      if (!pricingRule) {
        pricingRule = company.pricing.find(p =>
          p.isActive &&
          p.state.toLowerCase() === location.state.toLowerCase() &&
          p.lga.toLowerCase() === location.lga.toLowerCase() &&
          !p.locality
        );
        if (pricingRule) pricingLevel = 'lga';
      }

      // 3. Try state-wide pricing (any LGA in state without locality)
      if (!pricingRule) {
        pricingRule = company.pricing.find(p =>
          p.isActive &&
          p.state.toLowerCase() === location.state.toLowerCase() &&
          !p.locality
        );
        if (pricingRule) pricingLevel = 'state';
      }
    }

    // 4. Fall back to default company pricing
    if (!pricingRule) {
      pricingRule = {
        id: 'default',
        state: location.state,
        lga: location.lga,
        basePrice: 5000,
        pricePerKm: 200,
        minimumCharge: 3000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Calculate price components
    const basePrice = pricingRule.basePrice;
    const distanceCharge = distanceKm * pricingRule.pricePerKm;
    
    let surchargeTotal = 0;
    const surchargesBreakdown: { type: string; amount: number }[] = [];

    if (pricingRule.surcharges && applySurcharges) {
      for (const surchargeType of applySurcharges) {
        const surcharge = pricingRule.surcharges.find(s => s.type === surchargeType);
        if (surcharge) {
          let amount = surcharge.amount || 0;
          if (surcharge.percentage) {
            amount += (basePrice * surcharge.percentage) / 100;
          }
          surchargeTotal += amount;
          surchargesBreakdown.push({ type: surchargeType, amount });
        }
      }
    }

    let subtotal = basePrice + distanceCharge + surchargeTotal;
    let finalPrice = subtotal;

    // Apply minimum charge
    if (finalPrice < pricingRule.minimumCharge) {
      finalPrice = pricingRule.minimumCharge;
    }

    // Apply maximum charge cap if set
    if (pricingRule.maximumCharge && finalPrice > pricingRule.maximumCharge) {
      finalPrice = pricingRule.maximumCharge;
    }

    this.logger.log(
      `Calculated price for ${location.lga}, ${location.state}: ₦${finalPrice} (${pricingLevel} level)`
    );

    return {
      basePrice,
      distanceCharge,
      surchargeTotal,
      subtotal,
      finalPrice,
      pricingLevel,
      breakdown: {
        basePrice,
        distanceCharge,
        surcharges: surchargesBreakdown,
        minimumCap: finalPrice === pricingRule.minimumCharge ? pricingRule.minimumCharge : undefined,
        maximumCap: finalPrice === pricingRule.maximumCharge ? pricingRule.maximumCharge : undefined,
      },
    };
  }

  // ==================== RESPONSE MAPPING ====================

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
