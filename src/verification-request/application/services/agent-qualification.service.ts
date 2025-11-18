import { Injectable, Logger } from '@nestjs/common';
import { IAgentProfile } from '../../domain/models/agent-profile.model';
import { IRequestTypeConfig } from '../../domain/interfaces/request-type-config.interface';
import { AgentLevel } from '../../domain/enums/agent-level.enum';
import { AgentSpecialization } from '../../domain/enums/agent-specialization.enum';

/**
 * Agent Qualification Match Result
 */
export interface IAgentQualificationMatch {
  agentId: string;
  isQualified: boolean;
  matchScore: number; // 0-100
  qualificationDetails: {
    meetsLevelRequirement: boolean;
    hasRequiredSpecializations: boolean;
    meetsRatingRequirement: boolean;
    hasCertifications: boolean;
    hasRequiredEquipment: boolean;
    isAvailable: boolean;
    isWithinTravelDistance: boolean;
  };
  disqualificationReasons: string[];
  warnings: string[];
}

/**
 * Agent Qualification Matching Service
 * Determines if an agent is qualified for a specific request type
 * Follows SOLID principles (SRP - Single Responsibility)
 */
@Injectable()
export class AgentQualificationService {
  private readonly logger = new Logger(AgentQualificationService.name);

  /**
   * Check if an agent is qualified for a request type
   */
  async isAgentQualified(
    agent: IAgentProfile,
    requestType: IRequestTypeConfig,
    requestLocation?: { latitude: number; longitude: number },
  ): Promise<IAgentQualificationMatch> {
    this.logger.debug(
      `Checking qualification for agent ${agent.id} against request type ${requestType.name}`,
    );

    const disqualificationReasons: string[] = [];
    const warnings: string[] = [];

    // Check basic eligibility
    if (!agent.isActive) {
      disqualificationReasons.push('Agent account is not active');
    }

    if (agent.isSuspended) {
      disqualificationReasons.push(
        `Agent is suspended until ${agent.suspendedUntil?.toISOString() || 'indefinitely'}`,
      );
    }

    if (!agent.isVerified) {
      disqualificationReasons.push('Agent is not verified');
    }

    if (!agent.kycCompleted) {
      warnings.push('Agent KYC is not completed');
    }

    // Check level requirement
    const meetsLevelRequirement = this.checkLevelRequirement(
      agent.level,
      requestType.requiredAgentLevel,
    );
    if (!meetsLevelRequirement && requestType.requiredAgentLevel) {
      disqualificationReasons.push(
        `Agent level ${agent.level} does not meet minimum requirement: ${requestType.requiredAgentLevel}`,
      );
    }

    // Check specializations
    const hasRequiredSpecializations = this.checkSpecializations(
      agent.specializations,
      requestType.requiresSpecialization,
    );
    if (
      !hasRequiredSpecializations &&
      requestType.requiresSpecialization?.length > 0
    ) {
      disqualificationReasons.push(
        `Agent lacks required specializations: ${requestType.requiresSpecialization.join(', ')}`,
      );
    }

    // Check rating requirement
    const meetsRatingRequirement = this.checkRatingRequirement(
      agent.averageRating,
      agent.totalRatings,
      requestType.requiredMinRating,
    );
    if (!meetsRatingRequirement && requestType.requiredMinRating) {
      disqualificationReasons.push(
        `Agent rating ${agent.averageRating.toFixed(1)} does not meet minimum: ${requestType.requiredMinRating}`,
      );
    }

    // Check certifications
    const hasCertifications = this.checkCertifications(
      agent.certifications,
      agent.certificationExpiries,
      requestType.requiresCertification,
    );
    if (!hasCertifications && requestType.requiresCertification) {
      warnings.push('Agent may lack required certifications');
    }

    // Check equipment requirements
    const hasRequiredEquipment = this.checkEquipmentRequirements(
      agent,
      requestType,
    );
    if (!hasRequiredEquipment) {
      disqualificationReasons.push(
        'Agent lacks required equipment for this request type',
      );
    }

    // Check availability
    const isAvailable = this.checkAvailability(agent);
    if (!isAvailable) {
      disqualificationReasons.push(
        `Agent is ${agent.availabilityStatus} and cannot accept requests`,
      );
    }

    // Check concurrent requests capacity
    if (agent.currentActiveRequests >= agent.maxConcurrentRequests) {
      disqualificationReasons.push(
        `Agent has reached maximum concurrent requests (${agent.maxConcurrentRequests})`,
      );
    }

    // Check travel distance
    let isWithinTravelDistance = true;
    if (requestLocation) {
      isWithinTravelDistance = this.checkTravelDistance(
        agent,
        requestLocation,
      );
      if (!isWithinTravelDistance) {
        disqualificationReasons.push(
          `Request location exceeds agent's maximum travel distance (${agent.maxTravelDistanceKm} km)`,
        );
      }
    }

    // Calculate match score
    const matchScore = this.calculateMatchScore(
      agent,
      requestType,
      {
        meetsLevelRequirement,
        hasRequiredSpecializations,
        meetsRatingRequirement,
        hasCertifications,
        hasRequiredEquipment,
        isAvailable,
        isWithinTravelDistance,
      },
    );

    const isQualified = disqualificationReasons.length === 0;

    this.logger.debug(
      `Agent ${agent.id} qualification result: ${isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'} (Score: ${matchScore})`,
    );

    return {
      agentId: agent.id,
      isQualified,
      matchScore,
      qualificationDetails: {
        meetsLevelRequirement,
        hasRequiredSpecializations,
        meetsRatingRequirement,
        hasCertifications,
        hasRequiredEquipment,
        isAvailable,
        isWithinTravelDistance,
      },
      disqualificationReasons,
      warnings,
    };
  }

  /**
   * Find best qualified agents from a list
   */
  async findBestQualifiedAgents(
    agents: IAgentProfile[],
    requestType: IRequestTypeConfig,
    requestLocation?: { latitude: number; longitude: number },
    limit: number = 10,
  ): Promise<IAgentQualificationMatch[]> {
    this.logger.debug(
      `Finding best qualified agents from pool of ${agents.length}`,
    );

    // Check qualification for all agents
    const matches = await Promise.all(
      agents.map((agent) =>
        this.isAgentQualified(agent, requestType, requestLocation),
      ),
    );

    // Filter qualified agents and sort by match score
    const qualifiedMatches = matches
      .filter((match) => match.isQualified)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    this.logger.debug(
      `Found ${qualifiedMatches.length} qualified agents out of ${agents.length}`,
    );

    return qualifiedMatches;
  }

  /**
   * Check if agent meets level requirement
   */
  private checkLevelRequirement(
    agentLevel: AgentLevel,
    requiredLevel?: AgentLevel,
  ): boolean {
    if (!requiredLevel) return true;

    const levelHierarchy: Record<AgentLevel, number> = {
      [AgentLevel.BASIC]: 1,
      [AgentLevel.VERIFIED]: 2,
      [AgentLevel.PROFESSIONAL]: 3,
      [AgentLevel.EXPERT]: 4,
    };

    return levelHierarchy[agentLevel] >= levelHierarchy[requiredLevel];
  }

  /**
   * Check if agent has required specializations
   */
  private checkSpecializations(
    agentSpecializations: AgentSpecialization[],
    requiredSpecializations?: AgentSpecialization[],
  ): boolean {
    if (!requiredSpecializations || requiredSpecializations.length === 0) {
      return true;
    }

    return requiredSpecializations.every((required) =>
      agentSpecializations.includes(required),
    );
  }

  /**
   * Check if agent meets rating requirement
   */
  private checkRatingRequirement(
    averageRating: number,
    totalRatings: number,
    requiredMinRating?: number,
  ): boolean {
    if (!requiredMinRating) return true;

    // Require at least 5 ratings to be considered
    if (totalRatings < 5) return false;

    return averageRating >= requiredMinRating;
  }

  /**
   * Check if agent has valid certifications
   */
  private checkCertifications(
    certifications: string[],
    certificationExpiries: Record<string, string>,
    requiresCertification?: boolean,
  ): boolean {
    if (!requiresCertification) return true;

    // Check if any certifications exist
    if (certifications.length === 0) return false;

    // Check if certifications are not expired
    const now = new Date();
    for (const cert of certifications) {
      const expiry = certificationExpiries[cert];
      if (expiry && new Date(expiry) < now) {
        // Certification expired
        return false;
      }
    }

    return true;
  }

  /**
   * Check if agent has required equipment
   */
  private checkEquipmentRequirements(
    agent: IAgentProfile,
    requestType: IRequestTypeConfig,
  ): boolean {
    // Check deliverable requirements
    const deliverables = requestType.deliverables;

    if (deliverables.requiresGPS && !agent.hasSmartphone) {
      return false;
    }

    if (deliverables.requiresVideo && !agent.hasCamera) {
      return false;
    }

    if (deliverables.requiresMeasurements && !agent.hasMeasuringTools) {
      return false;
    }

    // Add more equipment checks as needed
    return true;
  }

  /**
   * Check if agent is available
   */
  private checkAvailability(agent: IAgentProfile): boolean {
    if (!agent.isAvailable) return false;
    if (!agent.isOnline) return false;
    if (agent.availabilityStatus !== 'AVAILABLE') return false;

    return true;
  }

  /**
   * Check if request location is within agent's travel distance
   * Uses Haversine formula for distance calculation
   */
  private checkTravelDistance(
    agent: IAgentProfile,
    requestLocation: { latitude: number; longitude: number },
  ): boolean {
    const distance = this.calculateDistance(
      agent.currentLatitude,
      agent.currentLongitude,
      requestLocation.latitude,
      requestLocation.longitude,
    );

    return distance <= agent.maxTravelDistanceKm;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate overall match score (0-100)
   */
  private calculateMatchScore(
    agent: IAgentProfile,
    requestType: IRequestTypeConfig,
    qualificationDetails: any,
  ): number {
    let score = 0;

    // Base qualifications (60 points)
    if (qualificationDetails.meetsLevelRequirement) score += 15;
    if (qualificationDetails.hasRequiredSpecializations) score += 15;
    if (qualificationDetails.meetsRatingRequirement) score += 10;
    if (qualificationDetails.hasCertifications) score += 10;
    if (qualificationDetails.hasRequiredEquipment) score += 10;

    // Availability (20 points)
    if (qualificationDetails.isAvailable) score += 15;
    if (qualificationDetails.isWithinTravelDistance) score += 5;

    // Performance bonuses (20 points)
    if (agent.averageRating >= 4.5) score += 10;
    if (agent.successRate >= 95) score += 5;
    if (agent.onTimeCompletionRate >= 90) score += 5;

    // Specialization match bonus
    if (
      requestType.requiresSpecialization?.length > 0 &&
      agent.primarySpecialization &&
      requestType.requiresSpecialization.includes(agent.primarySpecialization)
    ) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Get agent level progression requirements
   */
  getLevelProgressionRequirements(currentLevel: AgentLevel): {
    nextLevel?: AgentLevel;
    requiredCompletedRequests: number;
    requiredSuccessRate: number;
    requiredRating: number;
  } {
    const requirements: Record<AgentLevel, any> = {
      [AgentLevel.BASIC]: {
        nextLevel: AgentLevel.VERIFIED,
        requiredCompletedRequests: 10,
        requiredSuccessRate: 80,
        requiredRating: 3.5,
      },
      [AgentLevel.VERIFIED]: {
        nextLevel: AgentLevel.PROFESSIONAL,
        requiredCompletedRequests: 50,
        requiredSuccessRate: 85,
        requiredRating: 4.0,
      },
      [AgentLevel.PROFESSIONAL]: {
        nextLevel: AgentLevel.EXPERT,
        requiredCompletedRequests: 200,
        requiredSuccessRate: 90,
        requiredRating: 4.5,
      },
      [AgentLevel.EXPERT]: {
        nextLevel: undefined, // Max level
        requiredCompletedRequests: 0,
        requiredSuccessRate: 0,
        requiredRating: 0,
      },
    };

    return requirements[currentLevel];
  }

  /**
   * Check if agent is eligible for level upgrade
   */
  isEligibleForLevelUpgrade(agent: IAgentProfile): {
    eligible: boolean;
    nextLevel?: AgentLevel;
    missingRequirements: string[];
  } {
    const requirements = this.getLevelProgressionRequirements(agent.level);
    const missingRequirements: string[] = [];

    if (!requirements.nextLevel) {
      return {
        eligible: false,
        missingRequirements: ['Agent is already at maximum level (EXPERT)'],
      };
    }

    if (
      agent.totalCompletedRequests < requirements.requiredCompletedRequests
    ) {
      missingRequirements.push(
        `Need ${requirements.requiredCompletedRequests - agent.totalCompletedRequests} more completed requests`,
      );
    }

    if (agent.successRate < requirements.requiredSuccessRate) {
      missingRequirements.push(
        `Success rate ${agent.successRate}% is below required ${requirements.requiredSuccessRate}%`,
      );
    }

    if (agent.averageRating < requirements.requiredRating) {
      missingRequirements.push(
        `Average rating ${agent.averageRating.toFixed(1)} is below required ${requirements.requiredRating}`,
      );
    }

    return {
      eligible: missingRequirements.length === 0,
      nextLevel: requirements.nextLevel,
      missingRequirements,
    };
  }
}
