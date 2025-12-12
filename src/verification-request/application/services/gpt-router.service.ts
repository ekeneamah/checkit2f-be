import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RouterAction } from '../../presentation/dto/map-router.dto';

interface RouterRequest {
  query: string;
  hasGPS: boolean;
}

interface RouterResult {
  action: RouterAction;
  message?: string;
  reasoning?: string;
  use_gps_bias?: boolean; // Whether to use GPS for proximity biasing
}

/**
 * GPT-4.1 Router Service
 * Uses OpenAI GPT-4.1 to intelligently route search queries to appropriate Google Maps APIs
 */
@Injectable()
export class GptRouterService {
  private readonly logger = new Logger(GptRouterService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. GPT routing will fail.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Route a search query using GPT-4.1 intelligence
   * Determines the best Google Maps API to use based on query intent
   */
  async routeQuery(request: RouterRequest): Promise<RouterResult> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request);

      this.logger.log(`Routing query: "${request.query}" (GPS: ${request.hasGPS})`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1', // Using GPT-4.1
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('Empty response from GPT-4');
      }

      const parsed = JSON.parse(response) as RouterResult;
      
      this.logger.log(
        `Routed to: ${parsed.action} (Reason: ${parsed.reasoning})`,
      );

      return parsed;
    } catch (error) {
      this.logger.error(`GPT routing failed: ${error.message}`, error.stack);
      
      // Fallback to text search if GPT fails
      return {
        action: RouterAction.PLACES_TEXT_SEARCH,
        message: 'Using default search method',
        reasoning: 'GPT routing unavailable',
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are a search query router for a location verification app in Nigeria.
Your job is to analyze user search queries and determine the best Google Maps API to use.

AVAILABLE ACTIONS:
1. PLACES_TEXT_SEARCH - For specific place names, business names, or addresses
   Example: "Shoprite Victoria Island", "123 Main Street Lagos"

2. PLACES_NEARBY_SEARCH - For category searches near user location (REQUIRES GPS)
   Example: "restaurants near me", "banks nearby", "hospitals"

3. GEOCODE - For precise address lookups or coordinate searches
   Example: "lat 6.4281 lng 3.4219", "No 5 Admiralty Way Lekki"

4. ASK_FOR_LOCATION - User wants nearby search but hasn't enabled GPS
   Example: "shops near me" (but GPS not available)

5. NO_ACTION - Query is unclear or not location-related
   Example: "hello", "what is the weather", "help me"

RULES:
- If query contains "near me", "nearby", "closest" → check if GPS available
  - If GPS available → PLACES_NEARBY_SEARCH (use_gps_bias: true)
  - If GPS not available → ASK_FOR_LOCATION
- If query mentions specific location/city/country (e.g., "Lagos", "Victoria Island", "Nigeria") → PLACES_TEXT_SEARCH (use_gps_bias: false)
- If query is business name without location context → PLACES_TEXT_SEARCH (use_gps_bias: true if GPS available)
- If query contains coordinates or precise address → GEOCODE (use_gps_bias: false)
- If query is vague or non-location → NO_ACTION

IMPORTANT: Set use_gps_bias to false when query mentions specific geographic location (city, area, country)
This allows users from anywhere to search for locations in Nigeria without GPS interference.

RESPONSE FORMAT (JSON):
{
  "action": "PLACES_TEXT_SEARCH | PLACES_NEARBY_SEARCH | GEOCODE | ASK_FOR_LOCATION | NO_ACTION",
  "reasoning": "Brief explanation of why this action was chosen",
  "message": "Optional user-facing message (only for ASK_FOR_LOCATION or NO_ACTION)",
  "use_gps_bias": true | false
}`;
  }

  private buildUserPrompt(request: RouterRequest): string {
    return `Query: "${request.query}"
User GPS Available: ${request.hasGPS ? 'Yes' : 'No'}

Determine the best action and respond in JSON format.`;
  }
}
