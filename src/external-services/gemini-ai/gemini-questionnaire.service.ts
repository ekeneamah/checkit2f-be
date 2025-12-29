import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

export interface QuestionnaireItem {
  id: string;
  question: string;
  type: 'text' | 'boolean' | 'number' | 'photo' | 'multiple_choice';
  required: boolean;
  options?: string[]; // For multiple choice
  placeholder?: string;
}

export interface Questionnaire {
  title: string;
  description: string;
  items: QuestionnaireItem[];
}

@Injectable()
export class GeminiQuestionnaireService {
  private readonly logger = new Logger(GeminiQuestionnaireService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;
  private questionnaireCache = new Map<string, { questionnaire: Questionnaire; timestamp: number }>();
  private readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('Gemini API key not configured');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use the same model as the main Gemini service
    const modelName = this.configService.get<string>('GEMINI_MODEL_ID', 'gemini-1.5-flash');
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.logger.log(`Gemini Questionnaire Service initialized with model: ${modelName}`);
  }

  /**
   * Generate cache key from verification details
   */
  private generateCacheKey(verificationType: string, description: string, specialInstructions?: string): string {
    return `${verificationType}:${description}:${specialInstructions || ''}`;
  }

  /**
   * Check if cached questionnaire is still valid
   */
  private getCachedQuestionnaire(cacheKey: string): Questionnaire | null {
    const cached = this.questionnaireCache.get(cacheKey);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS) {
      this.questionnaireCache.delete(cacheKey);
      this.logger.debug(`Cache expired for key: ${cacheKey.substring(0, 50)}...`);
      return null;
    }

    this.logger.log('Returning cached questionnaire');
    return cached.questionnaire;
  }

  /**
   * Convert verification instructions into a structured questionnaire
   */
  async generateQuestionnaire(
    verificationType: string,
    description: string,
    specialInstructions?: string,
  ): Promise<Questionnaire> {
    // Check cache first
    const cacheKey = this.generateCacheKey(verificationType, description, specialInstructions);
    const cached = this.getCachedQuestionnaire(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildQuestionnairePrompt(verificationType, description, specialInstructions);
      
      this.logger.log('Generating questionnaire with Gemini AI');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const questionnaire = this.parseQuestionnaireResponse(text);
      
      // Cache the generated questionnaire
      this.questionnaireCache.set(cacheKey, {
        questionnaire,
        timestamp: Date.now(),
      });
      
      this.logger.log(`Generated questionnaire with ${questionnaire.items.length} items and cached`);
      return questionnaire;
    } catch (error) {
      this.logger.error(`Failed to generate questionnaire: ${error.message}`);
      // Return fallback questionnaire
      return this.getFallbackQuestionnaire(verificationType, description);
    }
  }

  /**
   * Build prompt for questionnaire generation
   */
  private buildQuestionnairePrompt(
    verificationType: string,
    description: string,
    specialInstructions?: string,
  ): string {
    return `You are a verification task assistant. Convert the following verification request into a structured questionnaire for a field agent.

Verification Type: ${verificationType}
Description: ${description}
${specialInstructions ? `Special Instructions: ${specialInstructions}` : ''}

Create a JSON questionnaire with the following structure:
{
  "title": "Brief title for the questionnaire",
  "description": "Brief description of what needs to be verified",
  "items": [
    {
      "id": "unique_id",
      "question": "Clear, actionable question for the agent",
      "type": "text|boolean|number|photo|multiple_choice",
      "required": true|false,
      "options": ["option1", "option2"], // Only for multiple_choice
      "placeholder": "Helper text"
    }
  ]
}

Guidelines:
1. Break down complex instructions into clear, specific questions
2. Use "boolean" type for yes/no questions (e.g., "Is the property accessible?")
3. Use "photo" type when visual evidence is needed (e.g., "Take photo of the entrance")
4. Use "text" for descriptions (e.g., "Describe the condition of...")
5. Use "number" for measurements (e.g., "Number of rooms")
6. Use "multiple_choice" for predefined options (e.g., "Property type")
7. Mark critical items as required
8. Keep questions simple and unambiguous
9. Order questions logically (general → specific)
10. Include at least one "photo" type question for visual documentation

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Parse Gemini response into questionnaire object
   */
  private parseQuestionnaireResponse(text: string): Questionnaire {
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonText);
      
      // Validate and normalize
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Invalid questionnaire format');
      }

      // Add IDs if missing
      parsed.items.forEach((item: any, index: number) => {
        if (!item.id) {
          item.id = `q${index + 1}`;
        }
        if (item.required === undefined) {
          item.required = false;
        }
      });

      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse questionnaire response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get fallback questionnaire if AI generation fails
   */
  private getFallbackQuestionnaire(verificationType: string, description: string): Questionnaire {
    return {
      title: `${verificationType} Verification`,
      description: description.substring(0, 200),
      items: [
        {
          id: 'location_accessible',
          question: 'Is the location accessible and safe?',
          type: 'boolean',
          required: true,
        },
        {
          id: 'photo_overview',
          question: 'Take an overview photo of the location',
          type: 'photo',
          required: true,
          placeholder: 'Upload photo showing general view',
        },
        {
          id: 'general_condition',
          question: 'Describe the general condition',
          type: 'text',
          required: true,
          placeholder: 'Provide detailed description...',
        },
        {
          id: 'photo_details',
          question: 'Take photos of specific details mentioned in instructions',
          type: 'photo',
          required: true,
          placeholder: 'Upload additional photos',
        },
        {
          id: 'additional_observations',
          question: 'Any additional observations or concerns?',
          type: 'text',
          required: false,
          placeholder: 'Optional notes...',
        },
      ],
    };
  }

  /**
   * Compile questionnaire responses into a formatted report
   */
  async compileReport(
    questionnaire: Questionnaire,
    responses: Record<string, any>,
  ): Promise<string> {
    try {
      const prompt = `You are a verification report compiler. Create a professional verification report from the following questionnaire and agent responses.

Questionnaire Title: ${questionnaire.title}
Description: ${questionnaire.description}

Questions and Responses:
${questionnaire.items
  .map(
    (item) =>
      `Q: ${item.question}\nA: ${responses[item.id] !== undefined ? responses[item.id] : 'Not answered'}`,
  )
  .join('\n\n')}

Create a professional, well-structured verification report that:
1. Summarizes the key findings
2. Presents responses in a clear, organized manner
3. Highlights any concerns or important observations
4. Maintains professional tone
5. Is concise but comprehensive

Return the report as plain text.`;

      this.logger.log('Compiling verification report with Gemini AI');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const report = response.text();

      this.logger.log('Verification report compiled successfully');
      return report;
    } catch (error) {
      this.logger.error(`Failed to compile report: ${error.message}`);
      // Return simple fallback report
      return this.getFallbackReport(questionnaire, responses);
    }
  }

  /**
   * Get fallback report if AI generation fails
   */
  private getFallbackReport(questionnaire: Questionnaire, responses: Record<string, any>): string {
    let report = `VERIFICATION REPORT\n\n`;
    report += `Title: ${questionnaire.title}\n`;
    report += `Description: ${questionnaire.description}\n\n`;
    report += `RESPONSES:\n\n`;

    questionnaire.items.forEach((item, index) => {
      report += `${index + 1}. ${item.question}\n`;
      report += `   Answer: ${responses[item.id] !== undefined ? responses[item.id] : 'Not answered'}\n\n`;
    });

    return report;
  }
}
