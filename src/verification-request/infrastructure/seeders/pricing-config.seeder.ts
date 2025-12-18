/**
 * Pricing Configuration Seeder
 * 
 * Creates default pricing configuration with all multipliers and discounts.
 * Run once during system initialization.
 * 
 * Usage:
 * - Via Firebase Functions onInit hook
 * - Or via NestJS bootstrap in main.ts
 */

import {
  TimeSlotEnum,
  DifficultyEnum,
  ModeEnum,
  UrgencyEnum,
  SurgeConditionEnum,
  ITimeSlotConfig,
  IDifficultyConfig,
  IModeConfig,
  IUrgencyConfig,
  ISurgeConfig,
  IRecurringDiscountConfig,
  IVolumeDiscountConfig,
  ICustomerTierDiscountConfig,
  CreatePricingConfigDto,
} from '../../domain/entities/pricing-config.entity';

/**
 * Default pricing configuration for CheckIT24
 * Professional, feature-complete configuration with all multipliers and discounts
 */
export const DEFAULT_PRICING_CONFIG: CreatePricingConfigDto = {
  configName: 'Default Pricing Configuration v1',
  description:
    'Professional pricing model for CheckIT24 with geographic base pricing, dynamic multipliers, surge pricing, and tiered discounts',
  baseFee: 500000, // ₦5,000 base in kobo

  // TIME SLOT MULTIPLIERS
  // Controls pricing based on time of day
  // Used for: Load balancing, peak-hour premiums, off-peak incentives
  timeSlotConfigs: [
    {
      slot: TimeSlotEnum.ECONOMY,
      multiplier: 0.85,
      startHour: 0,
      endHour: 6,
      description: 'Off-peak hours: 12:00 AM - 6:00 AM (15% discount)',
      isActive: true,
    },
    {
      slot: TimeSlotEnum.STANDARD,
      multiplier: 1.0,
      startHour: 6,
      endHour: 21,
      description: 'Standard hours: 6:00 AM - 9:00 PM (normal pricing)',
      isActive: true,
    },
    {
      slot: TimeSlotEnum.RUSH_HOUR,
      multiplier: 1.3,
      startHour: 21,
      endHour: 24,
      description: 'Rush hours: 9:00 PM - 12:00 AM (30% premium)',
      isActive: true,
    },
  ],

  // DIFFICULTY MULTIPLIERS
  // Controls pricing based on verification complexity
  // Used for: Compensation for agent expertise, time complexity
  difficultyConfigs: [
    {
      difficulty: DifficultyEnum.EASY,
      multiplier: 1.0,
      description: 'Straightforward verification: Direct location confirmation',
      applicableVerificationTypes: ['standard_verification', 'business_opening_hours'],
      isActive: true,
    },
    {
      difficulty: DifficultyEnum.MEDIUM,
      multiplier: 1.2,
      description: 'Moderate complexity: Required interviews or detailed checks',
      applicableVerificationTypes: [
        'background_check',
        'staff_capacity_verification',
        'environmental_compliance',
      ],
      isActive: true,
    },
    {
      difficulty: DifficultyEnum.HARD,
      multiplier: 1.5,
      description: 'High complexity: Extensive research, legal documents, specialized expertise',
      applicableVerificationTypes: [
        'financial_credibility_check',
        'insurance_verification',
        'regulatory_compliance_audit',
      ],
      isActive: true,
    },
  ],

  // MODE MULTIPLIERS
  // Controls pricing based on verification method
  // Used for: Incentivizing remote vs in-person, cost optimization
  modeConfigs: [
    {
      mode: ModeEnum.IN_PERSON,
      multiplier: 1.0,
      description: 'In-person verification: Agent physically visits location',
      isActive: true,
    },
    {
      mode: ModeEnum.REMOTE,
      multiplier: 0.7,
      description: 'Remote verification: Phone call or video interview (30% discount)',
      isActive: true,
    },
  ],

  // URGENCY PREMIUMS
  // Controls pricing based on completion time
  // Used for: Expedited service premiums, resource allocation
  urgencyConfigs: [
    {
      urgency: UrgencyEnum.STANDARD,
      multiplier: 1.0,
      completionTimeHours: 48,
      description: 'Standard delivery: 24-48 hours (normal price)',
      isActive: true,
    },
    {
      urgency: UrgencyEnum.URGENT,
      multiplier: 1.25,
      completionTimeHours: 24,
      description: 'Urgent delivery: 12-24 hours (25% premium)',
      isActive: true,
    },
    {
      urgency: UrgencyEnum.EXPRESS,
      multiplier: 1.5,
      completionTimeHours: 6,
      description: 'Express delivery: 3-6 hours (50% premium)',
      isActive: true,
    },
    {
      urgency: UrgencyEnum.IMMEDIATE,
      multiplier: 2.0,
      completionTimeHours: 3,
      description: 'Immediate delivery: < 3 hours (100% premium)',
      isActive: true,
    },
  ],

  // SURGE PRICING
  // Activates when demand exceeds agent availability
  // Used for: Managing peak-load requests, incentivizing agent availability
  surgeConfigs: [
    {
      condition: SurgeConditionEnum.LOW_AGENT_AVAILABILITY,
      multiplier: 1.2,
      minThreshold: 20, // Activate when 20+ pending requests
      description: 'Low agent availability: 20% premium',
      isActive: true,
    },
    {
      condition: SurgeConditionEnum.HIGH_DEMAND_PERIOD,
      multiplier: 1.15,
      validHours: { start: 17, end: 21 }, // 5 PM - 9 PM
      description: 'High demand period: 15% premium during 5 PM - 9 PM',
      isActive: true,
    },
    {
      condition: SurgeConditionEnum.WEEKEND_PREMIUM,
      multiplier: 1.25,
      description: 'Weekend premium: 25% additional cost on weekends',
      isActive: true,
    },
    {
      condition: SurgeConditionEnum.EXTREME_WEATHER,
      multiplier: 1.5,
      description: 'Extreme weather: 50% premium during severe conditions',
      isActive: false, // Disabled by default, manually activated
    },
  ],

  // RECURRING DISCOUNTS
  // Rewards customers for repeat bookings
  // Used for: Building long-term customer relationships
  recurringDiscountConfigs: [
    {
      occurrenceCount: 2,
      discountPercentage: 5,
      description: '2 recurring verifications: 5% discount per order',
      isActive: true,
    },
    {
      occurrenceCount: 3,
      discountPercentage: 10,
      description: '3 recurring verifications: 10% discount per order',
      isActive: true,
    },
    {
      occurrenceCount: 5,
      discountPercentage: 15,
      description: '5+ recurring verifications: 15% discount per order',
      isActive: true,
    },
  ],

  // VOLUME DISCOUNTS
  // Rewards customers for verifying multiple locations in one request
  // Used for: Encouraging bulk verifications, increasing order value
  volumeDiscountConfigs: [
    {
      locationCount: 2,
      discountPercentage: 5,
      description: '2 locations in one request: 5% discount',
      isActive: true,
    },
    {
      locationCount: 3,
      discountPercentage: 10,
      description: '3-5 locations in one request: 10% discount',
      isActive: true,
    },
    {
      locationCount: 5,
      discountPercentage: 15,
      description: '5+ locations in one request: 15% discount',
      isActive: true,
    },
  ],

  // CUSTOMER TIER DISCOUNTS
  // Progressive loyalty program with increasing benefits
  // Used for: Building customer loyalty, increasing lifetime value
  tierDiscountConfigs: [
    {
      tier: 'bronze',
      discountPercentage: 5,
      minRequestsRequired: 3,
      description: 'Bronze tier: 5 completed verifications → 5% discount',
      isActive: true,
    },
    {
      tier: 'silver',
      discountPercentage: 10,
      minRequestsRequired: 10,
      description: 'Silver tier: 10 completed verifications → 10% discount',
      isActive: true,
    },
    {
      tier: 'gold',
      discountPercentage: 15,
      minRequestsRequired: 25,
      description: 'Gold tier: 25 completed verifications → 15% discount',
      isActive: true,
    },
    {
      tier: 'platinum',
      discountPercentage: 20,
      minRequestsRequired: 50,
      description: 'Platinum tier: 50+ completed verifications → 20% discount',
      isActive: true,
    },
  ],
};

/**
 * Seeder function to initialize pricing configuration
 * Call this during system bootstrap
 */
export async function seedPricingConfiguration(
  pricingConfigRepository: any,
): Promise<void> {
  console.log('🌱 Seeding default pricing configuration...');

  try {
    // Check if default already exists
    const existing = await pricingConfigRepository.findDefault();
    if (existing) {
      console.log('✓ Default pricing configuration already exists');
      return;
    }

    // Create default configuration
    const config = await pricingConfigRepository.create(DEFAULT_PRICING_CONFIG);
    await pricingConfigRepository.setAsDefault(config.id);

    console.log('✓ Default pricing configuration created successfully');
    console.log(`  Configuration ID: ${config.id}`);
    console.log(`  Base Fee: ₦${config.baseFee / 100}`);
    console.log(`  Time Slots: ${config.timeSlotConfigs.length}`);
    console.log(`  Difficulty Levels: ${config.difficultyConfigs.length}`);
    console.log(`  Urgency Levels: ${config.urgencyConfigs.length}`);
    console.log(`  Recurring Discounts: ${config.recurringDiscountConfigs.length}`);
    console.log(`  Volume Discounts: ${config.volumeDiscountConfigs.length}`);
    console.log(`  Customer Tiers: ${config.tierDiscountConfigs.length}`);
  } catch (error) {
    console.error('✗ Failed to seed pricing configuration:', error);
    throw error;
  }
}
