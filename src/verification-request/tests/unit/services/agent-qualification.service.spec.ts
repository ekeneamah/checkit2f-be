import { Test, TestingModule } from '@nestjs/testing';
import { AgentQualificationService } from '../../../application/services/agent-qualification.service';
import { IAgentProfile } from '../../../domain/models/agent-profile.model';
import { IRequestTypeConfig } from '../../../domain/interfaces/request-type-config.interface';
import { AgentLevel } from '../../../domain/enums/agent-level.enum';
import { AgentSpecialization } from '../../../domain/enums/agent-specialization.enum';
import { RequestTypeCategory } from '../../../domain/enums/request-type-category.enum';
import { PricingType } from '../../../domain/enums/pricing-type.enum';

describe('AgentQualificationService', () => {
  let service: AgentQualificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentQualificationService],
    }).compile();

    service = module.get<AgentQualificationService>(AgentQualificationService);
  });

  describe('isAgentQualified', () => {
    it('should qualify agent with all requirements met', async () => {
      const agent: IAgentProfile = createMockAgent({
        level: AgentLevel.VERIFIED,
        specializations: [AgentSpecialization.PROPERTY_SURVEY],
        averageRating: 4.5,
        totalRatings: 20,
        isActive: true,
        isVerified: true,
        kycCompleted: true,
        hasCamera: true,
        isAvailable: true,
        availabilityStatus: 'AVAILABLE',
      });

      const requestType: IRequestTypeConfig = createMockRequestType({
        requiredAgentLevel: AgentLevel.VERIFIED,
        requiresSpecialization: [AgentSpecialization.PROPERTY_SURVEY],
        requiredMinRating: 4.0,
      });

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(true);
      expect(result.disqualificationReasons).toHaveLength(0);
      expect(result.matchScore).toBeGreaterThan(50);
    });

    it('should disqualify inactive agent', async () => {
      const agent: IAgentProfile = createMockAgent({
        isActive: false,
      });

      const requestType: IRequestTypeConfig = createMockRequestType({});

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(false);
      expect(result.disqualificationReasons).toContain(
        'Agent account is not active',
      );
    });

    it('should disqualify suspended agent', async () => {
      const agent: IAgentProfile = createMockAgent({
        isSuspended: true,
        suspendedUntil: new Date('2025-12-31'),
      });

      const requestType: IRequestTypeConfig = createMockRequestType({});

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(false);
      expect(result.disqualificationReasons.length).toBeGreaterThan(0);
    });

    it('should disqualify agent with insufficient level', async () => {
      const agent: IAgentProfile = createMockAgent({
        level: AgentLevel.BASIC,
        isActive: true,
        isVerified: true,
      });

      const requestType: IRequestTypeConfig = createMockRequestType({
        requiredAgentLevel: AgentLevel.PROFESSIONAL,
      });

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(false);
      expect(result.qualificationDetails.meetsLevelRequirement).toBe(false);
    });

    it('should disqualify agent lacking specialization', async () => {
      const agent: IAgentProfile = createMockAgent({
        specializations: [AgentSpecialization.GENERAL],
        isActive: true,
        isVerified: true,
      });

      const requestType: IRequestTypeConfig = createMockRequestType({
        requiresSpecialization: [AgentSpecialization.PROPERTY_SURVEY],
      });

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(false);
      expect(result.qualificationDetails.hasRequiredSpecializations).toBe(false);
    });

    it('should disqualify agent with low rating', async () => {
      const agent: IAgentProfile = createMockAgent({
        averageRating: 3.0,
        totalRatings: 10,
        isActive: true,
        isVerified: true,
      });

      const requestType: IRequestTypeConfig = createMockRequestType({
        requiredMinRating: 4.0,
      });

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(false);
      expect(result.qualificationDetails.meetsRatingRequirement).toBe(false);
    });

    it('should disqualify agent with insufficient ratings count', async () => {
      const agent: IAgentProfile = createMockAgent({
        averageRating: 5.0,
        totalRatings: 2, // Less than required 5
        isActive: true,
        isVerified: true,
      });

      const requestType: IRequestTypeConfig = createMockRequestType({
        requiredMinRating: 4.0,
      });

      const result = await service.isAgentQualified(agent, requestType);

      expect(result.isQualified).toBe(false);
      expect(result.qualificationDetails.meetsRatingRequirement).toBe(false);
    });
  });

  describe('isEligibleForLevelUpgrade', () => {
    it('should return eligible when all requirements met', () => {
      const agent: IAgentProfile = createMockAgent({
        level: AgentLevel.BASIC,
        totalCompletedRequests: 15,
        successRate: 85,
        averageRating: 4.0,
      });

      const result = service.isEligibleForLevelUpgrade(agent);

      expect(result.eligible).toBe(true);
      expect(result.nextLevel).toBe(AgentLevel.VERIFIED);
      expect(result.missingRequirements).toHaveLength(0);
    });

    it('should return not eligible when requests insufficient', () => {
      const agent: IAgentProfile = createMockAgent({
        level: AgentLevel.BASIC,
        totalCompletedRequests: 5,
        successRate: 85,
        averageRating: 4.0,
      });

      const result = service.isEligibleForLevelUpgrade(agent);

      expect(result.eligible).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
    });

    it('should return not eligible when at max level', () => {
      const agent: IAgentProfile = createMockAgent({
        level: AgentLevel.EXPERT,
      });

      const result = service.isEligibleForLevelUpgrade(agent);

      expect(result.eligible).toBe(false);
      expect(result.missingRequirements).toContain(
        'Agent is already at maximum level (EXPERT)',
      );
    });
  });
});

// Helper functions for creating mock objects
function createMockAgent(overrides: Partial<IAgentProfile> = {}): IAgentProfile {
  return {
    id: 'agent-123',
    userId: 'user-123',
    email: 'agent@example.com',
    displayName: 'Test Agent',
    phoneNumber: '+1234567890',
    level: AgentLevel.BASIC,
    levelAchievedAt: new Date(),
    specializations: [],
    certifications: [],
    certificationDates: {},
    certificationExpiries: {},
    averageRating: 0,
    totalRatings: 0,
    totalCompletedRequests: 0,
    totalFailedRequests: 0,
    successRate: 0,
    onTimeCompletionRate: 0,
    hasInternetAccess: true,
    hasMeasuringTools: false,
    hasCamera: false,
    hasVehicle: false,
    hasSmartphone: true,
    hasLaptop: false,
    additionalEquipment: [],
    currentLatitude: 6.5244,
    currentLongitude: 3.3792,
    currentCity: 'Lagos',
    currentState: 'Lagos',
    currentCountry: 'Nigeria',
    lastLocationUpdate: new Date(),
    isAvailable: false,
    isOnline: false,
    availabilityStatus: 'OFFLINE',
    maxConcurrentRequests: 3,
    currentActiveRequests: 0,
    preferredRequestTypes: [],
    preferredCategories: [],
    maxTravelDistanceKm: 10,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    walletBalance: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    currency: 'NGN',
    isVerified: false,
    isActive: false,
    isSuspended: false,
    kycCompleted: false,
    requestsCompletedThisMonth: 0,
    requestsCompletedThisYear: 0,
    streakDays: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveAt: new Date(),
    version: 1,
    ...overrides,
  };
}

function createMockRequestType(
  overrides: Partial<IRequestTypeConfig> = {},
): IRequestTypeConfig {
  return {
    id: 'request-type-123',
    name: 'standard_verification',
    displayName: 'Standard Verification',
    description: 'Basic verification request',
    category: RequestTypeCategory.VERIFICATION,
    pricingType: PricingType.FIXED,
    basePrice: 500000,
    currency: 'NGN',
    requiresExactLocation: true,
    allowsRadiusSearch: false,
    requiresMultipleLocations: false,
    estimatedDurationMinutes: 120,
    slaHours: 24,
    completionSlaHours: 48,
    allowExtension: true,
    extensionHours: 24,
    deliverables: {
      minPhotos: 3,
      requiresVideo: false,
      requiresGPS: true,
      requiresMeasurements: false,
      requiresComparison: false,
      requiresWrittenReport: false,
    },
    customerInputs: {
      requiresExactAddress: true,
      requiresSearchArea: false,
      requiresSearchRadius: false,
      requiresSearchCriteria: false,
      requiresLocationList: false,
      maxDescriptionLength: 500,
    },
    broadcastRadiusKm: 5,
    priorityLevel: 5,
    canBroadcastToSocialMedia: true,
    requiresScheduling: false,
    allowsRecurring: false,
    isActive: true,
    isDefault: false,
    sortOrder: 1,
    phase: 1,
    shortDescription: 'Quick verification',
    longDescription: 'Detailed description',
    exampleRequests: [],
    helpText: 'Help text',
    allowScheduling: false,
    requiresAdvancePayment: true,
    allowsPartialRefund: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    version: 1,
    ...overrides,
  };
}
