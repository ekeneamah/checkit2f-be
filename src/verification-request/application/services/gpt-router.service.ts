import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

type AIProvider = 'openai' | 'gemini' | 'none';

/**
 * GPT Router Service
 * Uses OpenAI GPT-4.1 or Google Gemini to intelligently route search queries to appropriate Google Maps APIs
 * Falls back gracefully: OpenAI → Gemini → Pattern matching
 */
@Injectable()
export class GptRouterService {
  private readonly logger = new Logger(GptRouterService.name);
  private readonly openai: OpenAI | null = null;
  private readonly gemini: GoogleGenerativeAI | null = null;
  private readonly aiProvider: AIProvider = 'none';

  constructor(private readonly configService: ConfigService) {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      this.aiProvider = 'openai';
      this.logger.log('🤖 GPT Router using OpenAI');
    } else if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
      this.aiProvider = 'gemini';
      this.logger.log('🤖 GPT Router using Gemini');
    } else {
      this.logger.warn('No AI API key configured. GPT routing will use pattern-based fallback.');
      this.aiProvider = 'none';
    }
  }

  /**
   * Route a search query using AI intelligence
   * Determines the best Google Maps API to use based on query intent
   * Falls back: OpenAI → Gemini → Pattern matching
   */
  async routeQuery(request: RouterRequest): Promise<RouterResult> {
    // If no AI provider is configured, use fallback routing
    if (this.aiProvider === 'none') {
      return this.fallbackRouting(request);
    }

    try {
      this.logger.log(`Routing query: "${request.query}" (GPS: ${request.hasGPS}) via ${this.aiProvider}`);

      if (this.aiProvider === 'openai' && this.openai) {
        return await this.routeWithOpenAI(request);
      } else if (this.aiProvider === 'gemini' && this.gemini) {
        return await this.routeWithGemini(request);
      }

      return this.fallbackRouting(request);
    } catch (error) {
      this.logger.error(`AI routing failed: ${error.message}`, error.stack);
      
      // Fallback to pattern matching if AI fails
      return this.fallbackRouting(request);
    }
  }

  /**
   * Route using OpenAI GPT-4.1
   */
  private async routeWithOpenAI(request: RouterRequest): Promise<RouterResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4.1',
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
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(response) as RouterResult;
    this.logger.log(`OpenAI routed to: ${parsed.action} (Reason: ${parsed.reasoning})`);
    return parsed;
  }

  /**
   * Route using Google Gemini
   */
  private async routeWithGemini(request: RouterRequest): Promise<RouterResult> {
    const model = this.gemini!.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `${this.buildSystemPrompt()}\n\n${this.buildUserPrompt(request)}`;
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    if (!response) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(response) as RouterResult;
    this.logger.log(`Gemini routed to: ${parsed.action} (Reason: ${parsed.reasoning})`);
    return parsed;
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

  /**
   * Fallback routing when OpenAI is not configured
   * Uses simple pattern matching to route queries
   */
  private fallbackRouting(request: RouterRequest): RouterResult {
    const query = request.query.toLowerCase();
    
    // Check for "near me" or "nearby" patterns
    if (query.includes('near me') || query.includes('nearby') || query.includes('closest')) {
      if (request.hasGPS) {
        return {
          action: RouterAction.PLACES_NEARBY_SEARCH,
          reasoning: 'Fallback: Query contains proximity keywords and GPS available',
          use_gps_bias: true,
        };
      } else {
        return {
          action: RouterAction.ASK_FOR_LOCATION,
          message: 'Please enable location services to search for places near you',
          reasoning: 'Fallback: Query contains proximity keywords but no GPS',
        };
      }
    }
    
    // Check for coordinate patterns
    if (query.includes('lat') || query.includes('lng') || /\d+\.\d+/.test(query)) {
      return {
        action: RouterAction.GEOCODE,
        reasoning: 'Fallback: Query contains coordinate-like patterns',
        use_gps_bias: false,
      };
    }
    
    // Default to text search
    return {
      action: RouterAction.PLACES_TEXT_SEARCH,
      reasoning: 'Fallback: Default text search',
      use_gps_bias: request.hasGPS,
    };
  }
}
