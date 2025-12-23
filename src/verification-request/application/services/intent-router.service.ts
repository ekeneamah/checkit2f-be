import { Injectable, Logger } from '@nestjs/common';
import { PricingType } from '../../domain/enums';
import { RequestTypeConfigRepository } from '../../infrastructure/repositories/request-type-config.repository';
import { RequestTypePricingService } from './request-type-pricing.service';
import { IPriceCalculationResult, IRequestTypeConfig } from '../../domain/interfaces/request-type-config.interface';
import { GeminiAIService } from '../../../external-services/gemini-ai/gemini-ai.service';
import { ContentType } from '../../../external-services/gemini-ai/interfaces/gemini-ai.interface';

export interface IntentSuggestion {
  requestTypeName: string;
  pricingType: PricingType;
  params: Record<string, any>;
  reason: string;
}

@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);

  constructor(
    private readonly requestTypeRepo: RequestTypeConfigRepository,
    private readonly pricingService: RequestTypePricingService,
    private readonly geminiService: GeminiAIService,
  ) {}

  async suggestAndPrice(
    queryText: string,
    options: { latitude?: number; longitude?: number; radiusKm?: number } = {}
  ): Promise<{ intent: IntentSuggestion; price: IPriceCalculationResult }> {
    const radiusKm = options.radiusKm || 5;

    // Use Gemini AI to detect intent
    let requestTypeName = 'standard_verification';
    let pricingType = PricingType.FIXED;
    let reason = 'Single address verification detected';

    try {
      const aiAnalysis = await this.detectIntentWithGemini(queryText);
      requestTypeName = aiAnalysis.requestType;
      pricingType = aiAnalysis.pricingModel;
      reason = aiAnalysis.reason;
    } catch (error) {
      this.logger.warn(`Gemini AI intent detection failed, using fallback: ${error.message}`);
      // Fallback to basic regex-based detection
      const fallback = this.fallbackIntentDetection(queryText);
      requestTypeName = fallback.requestType;
      pricingType = fallback.pricingModel;
      reason = fallback.reason;
    }

    // Fetch request type config by name
    const config = await this.getConfigOrThrow(requestTypeName);

    // Build calc params based on pricing type
    let calcParams: Record<string, any> = { requestTypeId: config.id };
    
    if (pricingType === PricingType.RADIUS_BASED) {
      calcParams = {
        requestTypeId: config.id,
        radiusKm,
        radiusPricingTable: config.radiusPricing || [],
      };
    } else if (pricingType === PricingType.TIERED) {
      // For tiered pricing (research requests), default to 'simple' tier
      calcParams = {
        requestTypeId: config.id,
        selectedTier: 'simple',
      };
    } else if (pricingType === PricingType.PER_LOCATION) {
      // For per-location pricing, assume 1 location by default
      calcParams = {
        requestTypeId: config.id,
        numberOfLocations: 1,
      };
    }

    const price = this.pricingService.calculatePrice(config, calcParams);

    const intent: IntentSuggestion = {
      requestTypeName,
      pricingType,
      params: { radiusKm },
      reason,
    };

    return { intent, price };
  }

  private async getConfigOrThrow(name: string): Promise<IRequestTypeConfig> {
    const config = await this.requestTypeRepo.findByName(name);
    if (!config) {
      this.logger.warn(`Request type not found by name: ${name}. Falling back to default.`);
      const def = await this.requestTypeRepo.findDefault();
      if (!def) throw new Error('No suitable request type configuration found');
      return def;
    }
    return config;
  }

  /**
   * Use Gemini AI to intelligently detect intent from natural language
   */
  private async detectIntentWithGemini(queryText: string): Promise<{
    requestType: string;
    pricingModel: PricingType;
    reason: string;
  }> {
    const prompt = `Analyze this verification request query and classify it:

Query: "${queryText}"

Classification Rules (apply in order of priority):

1. RESEARCH/MARKET INTELLIGENCE (research_request + TIERED):
   - Researching services, prices, features, or capabilities across businesses
   - Finding businesses that offer SPECIFIC SERVICES or meet SPECIFIC CRITERIA
   - Keywords: "research", "investigate", "mystery", "study", "that also", "which ones", "compare", "pricing", "do they offer"
   - Pattern: "Find [business type] that [condition/criteria]" 
   - Examples: 
     * "Find shoe repair shops in Ikeja that also do key cutting" (specific service criteria)
     * "Research competitor pricing in the area"
     * "Which restaurants serve vegan options?"
     * "Find gyms that have swimming pools"
   
2. DISCOVERY/SIMPLE SEARCH (discovery_request + RADIUS_BASED):
   - Simple search for places WITHOUT specific service criteria
   - Just locating/finding businesses or places in an area
   - Keywords: "where is", "find all", "locate", "discover", "nearby", "in [area]"
   - Examples:
     * "Where is meat sold in GRA" (simple location search)
     * "Find all restaurants in Lekki" (simple category search)
     * "Locate pharmacies nearby" (simple discovery)
   
3. SINGLE ADDRESS VERIFICATION (standard_verification + FIXED):
   - Single specific address, property, or business location to verify
   - Contains full address with street, area, or postal code
   - Examples: "24 Unity St, PHALGA, Port Harcourt 500272", "verify the restaurant at 15 Marina Road"
   
4. MULTIPLE ADDRESSES (standard_verification + PER_LOCATION):
   - Explicit list of specific addresses separated by semicolons, commas, or "and"
   - Keywords: "these addresses", "these places", "multiple locations"
   - Examples: "verify 123 Main St and 456 Oak Ave", "check these three addresses"

IMPORTANT: If the query asks to find places with SPECIFIC CRITERIA or CONDITIONS (like "that also do X", "which have Y"), classify as RESEARCH, not DISCOVERY.

Respond ONLY with valid JSON (no markdown):
{
  "requestType": "standard_verification" | "discovery_request" | "research_request",
  "pricingModel": "FIXED" | "PER_LOCATION" | "RADIUS_BASED" | "TIERED",
  "reason": "Brief explanation of detection"
}`;

    const result = await this.geminiService.generateContent({
      type: ContentType.TEXT,
      prompt,
      parameters: {
        tone: 'professional',
        length: 'short',
      },
    }, 'system');

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Gemini AI request failed');
    }

    try {
      // Parse Gemini response
      const content = result.data.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(content);
      
      return {
        requestType: parsed.requestType || 'standard_verification',
        pricingModel: PricingType[parsed.pricingModel] || PricingType.FIXED,
        reason: parsed.reason || 'AI-detected intent',
      };
    } catch (parseError) {
      this.logger.warn(`Failed to parse Gemini response: ${parseError.message}`);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Fallback regex-based intent detection if Gemini fails
   */
  private fallbackIntentDetection(queryText: string): {
    requestType: string;
    pricingModel: PricingType;
    reason: string;
  } {
    const text = (queryText || '').toLowerCase();

    // Research/Investigation cues - check FIRST (higher priority than discovery)
    // Includes queries looking for businesses with specific criteria
    if (/\b(research|investigate|mystery|secret|undercover|study|analysis|compare|pricing)\b/.test(text) ||
        /\b(that also|which have|which offer|that have|that offer|do they)\b/.test(text)) {
      return {
        requestType: 'research_request',
        pricingModel: PricingType.TIERED,
        reason: 'Research query: investigating businesses with specific criteria',
      };
    }
    
    // Multiple locations cues
    if (/\b(addresses|these places|this list|multiple locations?|each location)\b/.test(text) ||
        /;/.test(text) || 
        (text.match(/\band\b/g)?.length > 0 && text.split(/\band\b/).length > 1)) {
      return {
        requestType: 'standard_verification',
        pricingModel: PricingType.PER_LOCATION,
        reason: 'Multiple address verification detected',
      };
    }

    // Discovery/Search cues - simple searches without specific criteria
    if (/\b(where|find|search|discover|locate|all|nearby)\b/.test(text) && 
        !/\b(verify|check|confirm|validate|inspect)\b/.test(text)) {
      return {
        requestType: 'discovery_request',
        pricingModel: PricingType.RADIUS_BASED,
        reason: 'Discovery query: searching for multiple places in an area',
      };
    }
    
    // Default: Single address
    return {
      requestType: 'standard_verification',
      pricingModel: PricingType.FIXED,
      reason: 'Single address verification detected',
    };
  }
}
