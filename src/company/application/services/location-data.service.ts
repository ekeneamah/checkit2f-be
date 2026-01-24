import { Injectable, Logger } from '@nestjs/common';
import { GeminiAIService } from '../../../external-services/gemini-ai/gemini-ai.service';
import { ContentType } from '../../../external-services/gemini-ai/interfaces/gemini-ai.interface';

export interface CityData {
  name: string;
  lgas: string[];
}

export interface StateCitiesResponse {
  state: string;
  cities: CityData[];
}

@Injectable()
export class LocationDataService {
  private readonly logger = new Logger(LocationDataService.name);

  constructor(private readonly geminiService: GeminiAIService) {}

  /**
   * Fetch all cities and their LGAs for a Nigerian state using Gemini AI
   */
  async getCitiesAndLGAsForState(stateName: string): Promise<StateCitiesResponse> {
    try {
      this.logger.log(`Fetching cities and LGAs for state: ${stateName}`);

      const prompt = `You are a Nigerian geography expert. For the state of "${stateName}" in Nigeria:

1. List the major cities (at least 5-10 cities)
2. For each city, list the Local Government Areas (LGAs) that are part of or near that city

Return the response in this EXACT JSON format (no markdown, no code blocks, just pure JSON):
{
  "state": "${stateName}",
  "cities": [
    {
      "name": "City Name",
      "lgas": ["LGA 1", "LGA 2", "LGA 3"]
    }
  ]
}

Requirements:
- Include all major cities in the state
- Each city should have its relevant LGAs
- Use official names for LGAs
- Return ONLY valid JSON, no additional text
- Be comprehensive and accurate`;

      const response = await this.geminiService.generateContent(
        {
          type: ContentType.TEXT,
          prompt,
          parameters: {
            length: 'long',
          },
        },
        'system' // userId
      );

      // Parse the JSON response
      if (!response.success || !response.data) {
        throw new Error('Invalid response from Gemini AI');
      }
      
      const jsonMatch = response.data.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const data = JSON.parse(jsonMatch[0]) as StateCitiesResponse;
      
      this.logger.log(`Successfully fetched ${data.cities.length} cities for ${stateName}`);
      return data;

    } catch (error) {
      this.logger.error(`Failed to fetch cities for ${stateName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch just the major cities for a state (simpler, faster)
   */
  async getCitiesForState(stateName: string): Promise<string[]> {
    try {
      const prompt = `List the major cities in ${stateName} state, Nigeria. Return ONLY a JSON array of city names, nothing else. Example: ["City1", "City2", "City3"]`;

      const response = await this.geminiService.generateContent(
        {
          type: ContentType.TEXT,
          prompt,
          parameters: {
            length: 'short',
          },
        },
        'system' // userId
      );

      if (!response.success || !response.data) {
        throw new Error('Invalid response from Gemini AI');
      }
      
      const jsonMatch = response.data.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to fetch cities for ${stateName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all LGAs for a Nigerian state
   */
  async getLGAsForState(stateName: string): Promise<string[]> {
    try {
      const prompt = `List ALL Local Government Areas (LGAs) in ${stateName} state, Nigeria. Return ONLY a JSON array of LGA names, nothing else. Use official LGA names. Example: ["LGA1", "LGA2"]`;

      const response = await this.geminiService.generateContent(
        {
          type: ContentType.TEXT,
          prompt,
          parameters: {
            length: 'medium',
          },
        },
        'system' // userId
      );

      if (!response.success || !response.data) {
        throw new Error('Invalid response from Gemini AI');
      }
      
      const jsonMatch = response.data.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to fetch LGAs for ${stateName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all localities/areas within a specific LGA
   * Example: For "Port Harcourt" LGA in Rivers state, returns ["Old GRA", "New GRA", "D-Line", etc.]
   */
  async getLocalitiesForLGA(stateName: string, lgaName: string): Promise<string[]> {
    try {
      this.logger.log(`Fetching localities for LGA: ${lgaName}, ${stateName}`);

      // Normalize LGA name for better Gemini understanding
      const normalizedLGA = lgaName.replace(/\//g, ' / '); // Add spaces around slashes

      const prompt = `You are a Nigerian geography expert. List ALL major localities, neighborhoods, and areas within the "${normalizedLGA}" Local Government Area (LGA) in ${stateName} State, Nigeria.

IMPORTANT: 
- "${normalizedLGA}" is a single LGA (not multiple LGAs)
- If the name contains "/", it's ONE administrative unit (e.g., "Obio/Akpor" or "Obio / Akpor" is ONE LGA in Rivers State)

Include:
- Residential areas (GRAs, estates, neighborhoods)  
- Commercial districts
- Industrial zones
- Notable landmarks/areas
- Traditional communities
- Town/village names within this LGA

Examples for context:
- Port Harcourt LGA: ["Old GRA", "New GRA", "D-Line", "Trans-Amadi", "Mile 1", "Mile 2", "Borokiri", "Diobu"]
- Obio/Akpor LGA: ["Rumuokoro", "Rumuola", "Rumueme", "Rumuogba", "Eliozu", "Elelenwo", "Rukpokwu", "Choba"]
- Ikeja LGA: ["Allen Avenue", "Alausa", "Ikeja GRA", "Computer Village", "Oregun"]

Return ONLY a JSON array of locality names, nothing else. Format: ["Locality 1", "Locality 2", "Locality 3"]

Provide at least 15-30 localities if they exist in this LGA.`;

      const response = await this.geminiService.generateContent(
        {
          type: ContentType.TEXT,
          prompt,
          parameters: {
            length: 'medium',
          },
        },
        'system' // userId
      );

      if (!response.success || !response.data) {
        throw new Error('Invalid response from Gemini AI');
      }
      
      const jsonMatch = response.data.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn(`No valid JSON array found for ${lgaName}. Returning empty array.`);
        return [];
      }

      const localities = JSON.parse(jsonMatch[0]) as string[];
      this.logger.log(`Successfully fetched ${localities.length} localities for ${lgaName}, ${stateName}`);
      return localities;
      return localities;

    } catch (error) {
      this.logger.error(`Failed to fetch localities for ${lgaName}, ${stateName}: ${error.message}`);
      throw error;
    }
  }
}
