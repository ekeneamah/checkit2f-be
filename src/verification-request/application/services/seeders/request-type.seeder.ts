import { Injectable, Logger } from '@nestjs/common';
import { IRequestTypeConfig } from '../../../domain/interfaces';
import {
  RequestTypeCategory,
  PricingType,
  AgentLevel,
  AgentSpecialization,
} from '../../../domain/enums';
import { RequestTypeConfigRepository } from '../../../infrastructure/repositories/request-type-config.repository';

/**
 * Request Type Seeder Service
 * Seeds all 12 default request types (Phase 1: 6 core, Phase 2: 6 advanced)
 */
@Injectable()
export class RequestTypeSeederService {
  private readonly logger = new Logger(RequestTypeSeederService.name);

  constructor(
    private readonly requestTypeRepository: RequestTypeConfigRepository,
  ) {}

  /**
   * Seed all request types
   */
  async seedAll(): Promise<void> {
    this.logger.log('Starting request type seeding...');

    const existingTypes = await this.requestTypeRepository.findAll();
    
    if (existingTypes.length > 0) {
      this.logger.warn(
        `Request types already exist (${existingTypes.length}). Skipping seed.`,
      );
      return;
    }

    const requestTypes = this.getAllRequestTypes();

    await this.requestTypeRepository.bulkCreate(requestTypes);

    this.logger.log(`Successfully seeded ${requestTypes.length} request types`);
  }

  /**
   * Seed only Phase 1 types (for launch)
   */
  async seedPhase1(): Promise<void> {
    this.logger.log('Seeding Phase 1 request types...');

    const phase1Types = this.getPhase1Types();

    await this.requestTypeRepository.bulkCreate(phase1Types);

    this.logger.log(`Successfully seeded ${phase1Types.length} Phase 1 types`);
  }

  /**
   * Seed Phase 2 types (advanced features)
   */
  async seedPhase2(): Promise<void> {
    this.logger.log('Seeding Phase 2 request types...');

    const phase2Types = this.getPhase2Types();

    await this.requestTypeRepository.bulkCreate(phase2Types);

    this.logger.log(`Successfully seeded ${phase2Types.length} Phase 2 types`);
  }

  /**
   * Get all 12 request types
   */
  private getAllRequestTypes(): Partial<IRequestTypeConfig>[] {
    return [...this.getPhase1Types(), ...this.getPhase2Types()];
  }

  /**
   * Get Phase 1 request types (6 core types)
   */
  private getPhase1Types(): Partial<IRequestTypeConfig>[] {
    return [
      this.getStandardVerification(),
      this.getDiscoveryRequest(),
      this.getResearchRequest(),
      this.getComparisonRequest(),
      this.getSiteSurvey(),
      this.getUrgentPriority(),
    ];
  }

  /**
   * Get Phase 2 request types (6 advanced types)
   */
  private getPhase2Types(): Partial<IRequestTypeConfig>[] {
    return [
      this.getMysteryShopperRequest(),
      this.getRecurringVerification(),
      this.getVirtualTour(),
      this.getNeighborhoodAssessment(),
      this.getComplianceCheck(),
      this.getEventAttendance(),
    ];
  }

  /**
   * 1. STANDARD VERIFICATION
   */
  private getStandardVerification(): Partial<IRequestTypeConfig> {
    return {
      name: 'standard_verification',
      displayName: 'Standard Verification',
      description: 'Verify a specific location or business that you know',
      icon: '📍',
      category: RequestTypeCategory.VERIFICATION,
      pricingType: PricingType.FIXED,
      basePrice: 500000, // ₦5,000.00 in kobo
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 60,
      slaHours: 24,
      completionSlaHours: 1,
      allowExtension: true,
      extensionHours: 24,
      deliverables: {
        minPhotos: 3,
        maxPhotos: 10,
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
      requiredAgentLevel: AgentLevel.BASIC,
      broadcastRadiusKm: 15,
      priorityLevel: 5,
      canBroadcastToSocialMedia: true,
      requiresScheduling: false,
      allowsRecurring: true,
      isActive: true,
      isDefault: true,
      sortOrder: 1,
      badge: 'POPULAR',
      color: '#4CAF50',
      phase: 1,
      shortDescription: 'Quick verification of a specific location',
      longDescription:
        'Perfect when you know exactly what you want to verify. Our agent will visit the location and provide photos and confirmation.',
      exampleRequests: [
        'Verify Golden Tulip Hotel on Victoria Island',
        'Check if ABC Company exists at this address',
        'Confirm this restaurant is open for business',
      ],
      helpText:
        'Provide the exact address or business name. Agent will visit within 24 hours.',
      faqs: [
        {
          question: 'How long does verification take?',
          answer: 'Agent completes within 1 hour of accepting the request.',
        },
        {
          question: 'What if the location doesn\'t exist?',
          answer: 'Agent will document that and provide photos of the address.',
        },
      ],
      allowScheduling: false,
      requiresAdvancePayment: true,
      allowsPartialRefund: false,
      refundPercentage: 100,
      createdBy: 'system',
    };
  }

  /**
   * 2. DISCOVERY REQUEST
   */
  private getDiscoveryRequest(): Partial<IRequestTypeConfig> {
    return {
      name: 'discovery_request',
      displayName: 'Discovery Request',
      description: 'Find options for you in a specific area',
      icon: '🔍',
      category: RequestTypeCategory.DISCOVERY,
      pricingType: PricingType.RADIUS_BASED,
      radiusPricing: [
        { radiusKm: 5, price: 800000 }, // ₦8,000
        { radiusKm: 10, price: 1200000 }, // ₦12,000
        { radiusKm: 15, price: 1500000 }, // ₦15,000
      ],
      currency: 'NGN',
      requiresExactLocation: false,
      allowsRadiusSearch: true,
      defaultSearchRadius: 5,
      minSearchRadius: 1,
      maxSearchRadius: 15,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 180,
      slaHours: 24,
      completionSlaHours: 3,
      allowExtension: true,
      extensionHours: 24,
      deliverables: {
        minPhotos: 5,
        maxPhotos: 20,
        requiresVideo: false,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: true,
        requiresWrittenReport: true,
      },
      customerInputs: {
        requiresExactAddress: false,
        requiresSearchArea: true,
        requiresSearchRadius: true,
        requiresSearchCriteria: true,
        requiresLocationList: false,
        maxDescriptionLength: 1000,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      broadcastRadiusKm: 15,
      priorityLevel: 6,
      canBroadcastToSocialMedia: true,
      requiresScheduling: false,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 2,
      badge: 'POPULAR',
      color: '#2196F3',
      phase: 1,
      shortDescription: 'Find and compare options in an area',
      longDescription:
        'Tell us what you\'re looking for and where. Our agent will search the area and provide you with options to choose from.',
      exampleRequests: [
        'Find me a 3-star hotel in Victoria Island',
        'Discover affordable gyms in Lekki',
        'Search for restaurants with parking in Ikeja',
      ],
      helpText:
        'Specify the type of place and area. Agent will provide 3-5 options with photos.',
      faqs: [
        {
          question: 'How many options will I get?',
          answer: 'Agent typically provides 3-5 options matching your criteria.',
        },
        {
          question: 'Can I verify one option after?',
          answer: 'Yes! You can book a Standard Verification for your chosen option.',
        },
      ],
      allowScheduling: false,
      requiresAdvancePayment: true,
      allowsPartialRefund: false,
      refundPercentage: 100,
      createdBy: 'system',
    };
  }

  /**
   * 3. RESEARCH REQUEST
   */
  private getResearchRequest(): Partial<IRequestTypeConfig> {
    return {
      name: 'research_request',
      displayName: 'Research Request',
      description: 'Find businesses by service or product',
      icon: '📊',
      category: RequestTypeCategory.RESEARCH,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: 'SIMPLE', description: 'Single product/service', price: 1000000 }, // ₦10,000
        { tier: 'COMPLEX', description: 'Multiple criteria', price: 1500000 }, // ₦15,000
      ],
      currency: 'NGN',
      requiresExactLocation: false,
      allowsRadiusSearch: true,
      defaultSearchRadius: 10,
      minSearchRadius: 1,
      maxSearchRadius: 15,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 240,
      slaHours: 48,
      completionSlaHours: 4,
      allowExtension: true,
      extensionHours: 24,
      deliverables: {
        minPhotos: 10,
        maxPhotos: 30,
        requiresVideo: false,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: true,
      },
      customerInputs: {
        requiresExactAddress: false,
        requiresSearchArea: true,
        requiresSearchRadius: true,
        requiresSearchCriteria: true,
        requiresLocationList: false,
        maxDescriptionLength: 1500,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      requiresSpecialization: [AgentSpecialization.BUSINESS_RESEARCH],
      broadcastRadiusKm: 15,
      priorityLevel: 7,
      canBroadcastToSocialMedia: true,
      requiresScheduling: false,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 3,
      badge: null,
      color: '#FF9800',
      phase: 1,
      shortDescription: 'Research businesses offering specific services',
      longDescription:
        'Need to find businesses that offer specific products or services? Our agent will survey the area and provide a comprehensive list.',
      exampleRequests: [
        'Find shoe repair shops in Ikeja that also do key cutting',
        'Locate pharmacies in Surulere open 24/7',
        'Discover car washes with detailing services in Ajah',
      ],
      helpText:
        'Describe the product/service you need. Agent will provide detailed list with contact info.',
      faqs: [
        {
          question: 'What\'s the difference from Discovery?',
          answer: 'Research is more detailed and service-specific, while Discovery finds general options.',
        },
      ],
      allowScheduling: false,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 50,
      createdBy: 'system',
    };
  }

  /**
   * 4. COMPARISON REQUEST
   */
  private getComparisonRequest(): Partial<IRequestTypeConfig> {
    return {
      name: 'comparison_request',
      displayName: 'Comparison Request',
      description: 'Compare 2-5 specific locations',
      icon: '⚖️',
      category: RequestTypeCategory.COMPARISON,
      pricingType: PricingType.PER_LOCATION,
      pricePerLocation: 500000, // ₦5,000 per location
      minLocations: 2,
      maxLocations: 5,
      currency: 'NGN',
      requiresExactLocation: false,
      allowsRadiusSearch: false,
      requiresMultipleLocations: true,
      estimatedDurationMinutes: 60, // per location
      slaHours: 48,
      completionSlaHours: 5, // 1hr per location × 5 max
      allowExtension: true,
      extensionHours: 24,
      deliverables: {
        minPhotos: 3, // per location
        requiresVideo: false,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: true,
        requiresWrittenReport: true,
      },
      customerInputs: {
        requiresExactAddress: false,
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: false,
        requiresLocationList: true,
        maxDescriptionLength: 1000,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      broadcastRadiusKm: 20,
      priorityLevel: 6,
      canBroadcastToSocialMedia: true,
      requiresScheduling: false,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 4,
      badge: null,
      color: '#9C27B0',
      phase: 1,
      shortDescription: 'Side-by-side comparison of multiple locations',
      longDescription:
        'Provide 2-5 locations and we\'ll visit all of them, providing a detailed comparison report to help you decide.',
      exampleRequests: [
        'Compare these 3 gyms and tell me which has better equipment',
        'Visit 2 apartments and compare their conditions',
        'Check 4 restaurants and compare their ambiance',
      ],
      helpText:
        'Provide addresses for all locations. Agent will visit all and create comparison report.',
      faqs: [
        {
          question: 'Can locations be far apart?',
          answer: 'Yes, but agent will need reasonable time to travel between them.',
        },
      ],
      allowScheduling: false,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 50,
      createdBy: 'system',
    };
  }

  /**
   * 5. SITE SURVEY
   */
  private getSiteSurvey(): Partial<IRequestTypeConfig> {
    return {
      name: 'site_survey',
      displayName: 'Site Survey',
      description: 'Detailed property assessment with measurements',
      icon: '📐',
      category: RequestTypeCategory.SURVEY,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: 'RESIDENTIAL', description: 'Apartment, house', price: 2000000 }, // ₦20,000
        { tier: 'COMMERCIAL', description: 'Shop, office', price: 3500000 }, // ₦35,000
        { tier: 'WAREHOUSE', description: 'Warehouse, factory', price: 5000000 }, // ₦50,000
      ],
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 180,
      slaHours: 72,
      completionSlaHours: 4,
      allowExtension: true,
      extensionHours: 48,
      deliverables: {
        minPhotos: 15,
        maxPhotos: 50,
        requiresVideo: true,
        minVideoDuration: 60,
        requiresGPS: true,
        requiresMeasurements: true,
        requiresComparison: false,
        requiresWrittenReport: true,
        reportTemplate: 'site_survey_template',
      },
      customerInputs: {
        requiresExactAddress: true,
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: false,
        requiresLocationList: false,
        maxDescriptionLength: 2000,
      },
      requiredAgentLevel: AgentLevel.PROFESSIONAL,
      requiresSpecialization: [AgentSpecialization.PROPERTY_SURVEY],
      requiresCertification: false,
      broadcastRadiusKm: 20,
      priorityLevel: 8,
      canBroadcastToSocialMedia: false,
      requiresScheduling: false,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 5,
      badge: 'PROFESSIONAL',
      color: '#795548',
      phase: 1,
      shortDescription: 'Professional property survey with measurements',
      longDescription:
        'Comprehensive property assessment including measurements, floor plan sketch, condition report, and professional recommendations.',
      exampleRequests: [
        'Survey this warehouse for rental consideration',
        'Assess apartment condition before purchase',
        'Evaluate office space for business setup',
      ],
      helpText:
        'Professional agent will measure, document, and provide detailed condition report.',
      faqs: [
        {
          question: 'Do agents have measuring tools?',
          answer: 'Yes, professional agents are equipped with laser measurers and tools.',
        },
      ],
      allowScheduling: true,
      maxScheduleDays: 7,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 30,
      createdBy: 'system',
    };
  }

  /**
   * 6. URGENT/PRIORITY
   */
  private getUrgentPriority(): Partial<IRequestTypeConfig> {
    return {
      name: 'urgent_priority',
      displayName: 'Urgent/Priority',
      description: 'Fast-track any verification type',
      icon: '⚡',
      category: RequestTypeCategory.URGENT,
      pricingType: PricingType.PREMIUM_MULTIPLIER,
      premiumMultiplier: 1.5, // 50% premium
      appliesToTypes: [
        'standard_verification',
        'discovery_request',
        'comparison_request',
      ],
      currency: 'NGN',
      requiresExactLocation: false, // Depends on base type
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 30, // Half of standard
      slaHours: 6,
      completionSlaHours: 0.5, // 30 minutes
      allowExtension: false,
      deliverables: {
        minPhotos: 3,
        requiresVideo: false,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: false,
      },
      customerInputs: {
        requiresExactAddress: false, // Depends on base type
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: false,
        requiresLocationList: false,
        maxDescriptionLength: 500,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      requiredMinRating: 4.0,
      broadcastRadiusKm: 10,
      priorityLevel: 10, // Highest priority
      canBroadcastToSocialMedia: true,
      requiresScheduling: false,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 6,
      badge: 'FAST',
      color: '#F44336',
      phase: 1,
      shortDescription: 'Urgent verification with 50% premium',
      longDescription:
        'Need it done fast? Pay 50% premium and jump to the front of the queue. Agent will complete in half the time.',
      exampleRequests: [
        'Urgent verification needed in 3 hours',
        'Quick check before meeting in 2 hours',
        'Emergency business verification',
      ],
      helpText:
        'Urgent requests get priority assignment to nearby agents. 50% faster completion.',
      faqs: [
        {
          question: 'How much faster?',
          answer: 'Half the standard time. Standard 1hr becomes 30min.',
        },
      ],
      allowScheduling: false,
      requiresAdvancePayment: true,
      allowsPartialRefund: false,
      refundPercentage: 0,
      createdBy: 'system',
    };
  }

  /**
   * 7. MYSTERY SHOPPER (Phase 2)
   */
  private getMysteryShopperRequest(): Partial<IRequestTypeConfig> {
    return {
      name: 'mystery_shopper',
      displayName: 'Mystery Shopper',
      description: 'Undercover service quality evaluation',
      icon: '🕵️',
      category: RequestTypeCategory.MYSTERY_SHOPPER,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: 'BASIC', description: 'Quick visit, basic evaluation', price: 1500000 }, // ₦15,000
        { tier: 'DETAILED', description: 'Extended visit, detailed report', price: 2500000 }, // ₦25,000
      ],
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 150,
      slaHours: 48,
      completionSlaHours: 3,
      allowExtension: true,
      extensionHours: 24,
      deliverables: {
        minPhotos: 5,
        requiresVideo: false, // Covert operation
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: true,
        reportTemplate: 'mystery_shopper_template',
      },
      customerInputs: {
        requiresExactAddress: true,
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: true,
        requiresLocationList: false,
        maxDescriptionLength: 1500,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      requiresSpecialization: [AgentSpecialization.MYSTERY_SHOPPER],
      requiredMinRating: 4.5,
      broadcastRadiusKm: 15,
      priorityLevel: 7,
      canBroadcastToSocialMedia: false, // Confidential
      requiresScheduling: false,
      allowsRecurring: true,
      isActive: true,
      isDefault: false,
      sortOrder: 7,
      badge: 'PREMIUM',
      color: '#607D8B',
      phase: 2,
      shortDescription: 'Anonymous service quality evaluation',
      longDescription:
        'Agent poses as regular customer to evaluate service quality, cleanliness, staff behavior. Perfect for business owners monitoring standards.',
      exampleRequests: [
        'Visit this restaurant as a customer and rate service quality',
        'Check my shop anonymously and report staff behavior',
        'Evaluate customer experience at this salon',
      ],
      helpText:
        'Agent will blend in as regular customer. Report remains confidential.',
      faqs: [
        {
          question: 'Will business know?',
          answer: 'No. Agent operates completely anonymously as regular customer.',
        },
      ],
      allowScheduling: true,
      maxScheduleDays: 14,
      requiresAdvancePayment: true,
      allowsPartialRefund: false,
      refundPercentage: 0,
      createdBy: 'system',
    };
  }

  /**
   * 8. RECURRING VERIFICATION (Phase 2)
   */
  private getRecurringVerification(): Partial<IRequestTypeConfig> {
    return {
      name: 'recurring_verification',
      displayName: 'Recurring Verification',
      description: 'Regular scheduled checks (20% discount)',
      icon: '🔄',
      category: RequestTypeCategory.RECURRING,
      pricingType: PricingType.RECURRING_DISCOUNT,
      basePrice: 400000, // ₦4,000 per visit (20% off ₦5,000)
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 60,
      slaHours: 24,
      completionSlaHours: 1,
      allowExtension: false,
      recurringOptions: {
        frequencies: ['WEEKLY', 'MONTHLY'],
        minOccurrences: 4,
        maxOccurrences: 52,
        discountPercentage: 20,
      },
      deliverables: {
        minPhotos: 3,
        requiresVideo: false,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: true,
      },
      customerInputs: {
        requiresExactAddress: true,
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: false,
        requiresLocationList: false,
        maxDescriptionLength: 1000,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      requiredMinRating: 4.0,
      broadcastRadiusKm: 15,
      priorityLevel: 6,
      canBroadcastToSocialMedia: true,
      requiresScheduling: true,
      minAdvanceNoticeHours: 24,
      allowsRecurring: true,
      isActive: true,
      isDefault: false,
      sortOrder: 8,
      badge: 'BEST VALUE',
      color: '#00BCD4',
      phase: 2,
      shortDescription: 'Weekly/monthly checks with 20% discount',
      longDescription:
        'Perfect for construction monitoring, property management, or regular business checks. Save 20% with recurring commitment.',
      exampleRequests: [
        'Check my construction site every Friday for 3 months',
        'Monthly property condition checks',
        'Weekly business operations verification',
      ],
      helpText:
        'Commit to minimum 4 visits and save 20%. Same agent when possible.',
      faqs: [
        {
          question: 'Can I pause or cancel?',
          answer: 'Yes, but refund only for unvisited occurrences.',
        },
      ],
      allowScheduling: true,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 100, // Only for未completed visits
      createdBy: 'system',
    };
  }

  /**
   * 9. VIRTUAL TOUR (Phase 2)
   */
  private getVirtualTour(): Partial<IRequestTypeConfig> {
    return {
      name: 'virtual_tour',
      displayName: 'Virtual Tour',
      description: 'Live video walkthrough',
      icon: '📹',
      category: RequestTypeCategory.VIRTUAL_TOUR,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: '30MIN', description: '30-minute live tour', price: 1200000 }, // ₦12,000
        { tier: '60MIN', description: '60-minute live tour', price: 2000000 }, // ₦20,000
      ],
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 30,
      slaHours: 24,
      completionSlaHours: 1,
      allowExtension: false,
      deliverables: {
        minPhotos: 0,
        requiresVideo: true,
        minVideoDuration: 1800, // 30 minutes
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
      requiredAgentLevel: AgentLevel.PROFESSIONAL,
      requiresSpecialization: [AgentSpecialization.VIRTUAL_PRESENTER],
      requiredMinRating: 4.5,
      broadcastRadiusKm: 10,
      priorityLevel: 8,
      canBroadcastToSocialMedia: false,
      requiresScheduling: true,
      minAdvanceNoticeHours: 24,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 9,
      badge: 'LIVE',
      color: '#E91E63',
      phase: 2,
      shortDescription: 'Real-time video tour with two-way communication',
      longDescription:
        'Agent conducts live video call while touring the property. Ask questions in real-time, direct what you want to see.',
      exampleRequests: [
        'Walk me through this apartment via video call',
        'Live tour of this event venue before booking',
        'Show me the office space via video',
      ],
      helpText:
        'Schedule in advance. Requires stable internet at location. Recording provided.',
      faqs: [
        {
          question: 'What if internet is bad?',
          answer: 'Agent will record offline and send video if connection fails.',
        },
      ],
      allowScheduling: true,
      maxScheduleDays: 7,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 50,
      createdBy: 'system',
    };
  }

  /**
   * 10. NEIGHBORHOOD ASSESSMENT (Phase 2)
   */
  private getNeighborhoodAssessment(): Partial<IRequestTypeConfig> {
    return {
      name: 'neighborhood_assessment',
      displayName: 'Neighborhood Assessment',
      description: 'Comprehensive area evaluation',
      icon: '🏘️',
      category: RequestTypeCategory.NEIGHBORHOOD,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: 'BASIC', description: 'Safety & amenities check', price: 1800000 }, // ₦18,000
        { tier: 'COMPREHENSIVE', description: 'Full area report', price: 3000000 }, // ₦30,000
      ],
      currency: 'NGN',
      requiresExactLocation: false,
      allowsRadiusSearch: true,
      defaultSearchRadius: 2,
      minSearchRadius: 1,
      maxSearchRadius: 5,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 300,
      slaHours: 72,
      completionSlaHours: 6,
      allowExtension: true,
      extensionHours: 24,
      deliverables: {
        minPhotos: 20,
        maxPhotos: 50,
        requiresVideo: true,
        minVideoDuration: 180,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: true,
        reportTemplate: 'neighborhood_report_template',
      },
      customerInputs: {
        requiresExactAddress: false,
        requiresSearchArea: true,
        requiresSearchRadius: true,
        requiresSearchCriteria: true,
        requiresLocationList: false,
        maxDescriptionLength: 1000,
      },
      requiredAgentLevel: AgentLevel.PROFESSIONAL,
      requiresSpecialization: [AgentSpecialization.NEIGHBORHOOD_EXPERT],
      requiredMinRating: 4.5,
      broadcastRadiusKm: 20,
      priorityLevel: 7,
      canBroadcastToSocialMedia: false,
      requiresScheduling: false,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 10,
      badge: 'DETAILED',
      color: '#3F51B5',
      phase: 2,
      shortDescription: 'Full neighborhood report: safety, amenities, vibe',
      longDescription:
        'Comprehensive assessment of area including safety, nearby facilities, traffic, noise levels, and overall livability. Perfect for relocation decisions.',
      exampleRequests: [
        'Full neighborhood report for Lekki Phase 1',
        'Assess Banana Island for family living',
        'Evaluate Surulere area for business setup',
      ],
      helpText:
        'Agent will survey entire neighborhood over multiple visits if needed.',
      faqs: [
        {
          question: 'What areas are covered?',
          answer: 'Safety, schools, hospitals, markets, transport, noise, traffic, and overall vibe.',
        },
      ],
      allowScheduling: false,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 30,
      createdBy: 'system',
    };
  }

  /**
   * 11. COMPLIANCE CHECK (Phase 2)
   */
  private getComplianceCheck(): Partial<IRequestTypeConfig> {
    return {
      name: 'compliance_check',
      displayName: 'Compliance Check',
      description: 'Verify licenses and regulatory compliance',
      icon: '✅',
      category: RequestTypeCategory.COMPLIANCE,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: 'BASIC', description: '1-3 licenses/permits', price: 2500000 }, // ₦25,000
        { tier: 'COMPREHENSIVE', description: 'Full compliance audit', price: 4000000 }, // ₦40,000
      ],
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 180,
      slaHours: 72,
      completionSlaHours: 3,
      allowExtension: true,
      extensionHours: 48,
      deliverables: {
        minPhotos: 5,
        requiresVideo: false,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: true,
        reportTemplate: 'compliance_report_template',
      },
      customerInputs: {
        requiresExactAddress: true,
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: true,
        requiresLocationList: false,
        maxDescriptionLength: 1500,
      },
      requiredAgentLevel: AgentLevel.PROFESSIONAL,
      requiresSpecialization: [AgentSpecialization.COMPLIANCE_CHECK],
      requiresCertification: true,
      requiredMinRating: 4.8,
      broadcastRadiusKm: 20,
      priorityLevel: 9,
      canBroadcastToSocialMedia: false,
      requiresScheduling: true,
      minAdvanceNoticeHours: 48,
      allowsRecurring: true,
      isActive: true,
      isDefault: false,
      sortOrder: 11,
      badge: 'PROFESSIONAL',
      color: '#4CAF50',
      phase: 2,
      shortDescription: 'Verify business licenses and regulatory compliance',
      longDescription:
        'Professional verification of business licenses, health permits, tax compliance, safety certifications. Essential for B2B partnerships.',
      exampleRequests: [
        'Verify restaurant has health permits',
        'Check business tax compliance',
        'Confirm factory has safety certifications',
      ],
      helpText:
        'Professional agent will check and photograph all required documents.',
      faqs: [
        {
          question: 'What documents are checked?',
          answer: 'Business license, health permit, tax clearance, fire safety, and any specified certifications.',
        },
      ],
      allowScheduling: true,
      maxScheduleDays: 14,
      requiresAdvancePayment: true,
      allowsPartialRefund: false,
      refundPercentage: 0,
      createdBy: 'system',
    };
  }

  /**
   * 12. EVENT ATTENDANCE (Phase 2)
   */
  private getEventAttendance(): Partial<IRequestTypeConfig> {
    return {
      name: 'event_attendance',
      displayName: 'Event Attendance',
      description: 'Proof of event occurrence',
      icon: '🎫',
      category: RequestTypeCategory.EVENT,
      pricingType: PricingType.TIERED,
      tieredPricing: [
        { tier: '1-2HR', description: '1-2 hour event', price: 800000 }, // ₦8,000
        { tier: '3-4HR', description: '3-4 hour event', price: 1200000 }, // ₦12,000
        { tier: 'FULL_DAY', description: 'Full day event', price: 1500000 }, // ₦15,000
      ],
      currency: 'NGN',
      requiresExactLocation: true,
      allowsRadiusSearch: false,
      requiresMultipleLocations: false,
      estimatedDurationMinutes: 120, // Depends on event
      slaHours: 24, // Must schedule in advance
      completionSlaHours: 4,
      allowExtension: false,
      deliverables: {
        minPhotos: 10,
        requiresVideo: true,
        minVideoDuration: 60,
        requiresGPS: true,
        requiresMeasurements: false,
        requiresComparison: false,
        requiresWrittenReport: true,
      },
      customerInputs: {
        requiresExactAddress: true,
        requiresSearchArea: false,
        requiresSearchRadius: false,
        requiresSearchCriteria: true,
        requiresLocationList: false,
        maxDescriptionLength: 1000,
      },
      requiredAgentLevel: AgentLevel.VERIFIED,
      requiresSpecialization: [AgentSpecialization.EVENT_COVERAGE],
      requiredMinRating: 4.0,
      broadcastRadiusKm: 15,
      priorityLevel: 7,
      canBroadcastToSocialMedia: true,
      requiresScheduling: true,
      minAdvanceNoticeHours: 24,
      allowsRecurring: false,
      isActive: true,
      isDefault: false,
      sortOrder: 12,
      badge: 'SCHEDULED',
      color: '#FF5722',
      phase: 2,
      shortDescription: 'Verify event happened with timestamped proof',
      longDescription:
        'Agent attends event and provides timestamped photos/video proof. Perfect for verifying seminars, meetings, or gatherings.',
      exampleRequests: [
        'Attend this seminar at 2 PM and confirm it happened',
        'Verify this conference takes place',
        'Proof this meeting occurred at specified time',
      ],
      helpText:
        'Must schedule 24hrs in advance. Agent will provide timestamped media proof.',
      faqs: [
        {
          question: 'What if event is cancelled?',
          answer: 'Agent documents the cancellation. Partial refund provided.',
        },
      ],
      allowScheduling: true,
      maxScheduleDays: 30,
      requiresAdvancePayment: true,
      allowsPartialRefund: true,
      refundPercentage: 50,
      createdBy: 'system',
    };
  }
}
