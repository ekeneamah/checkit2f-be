import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import {
  IChatMessage,
  IChatConversation,
  IAIResponse,
  IContentGenerationRequest,
  ITextAnalysisRequest,
  ITextAnalysisResponse,
  IAIServiceResponse,
  IGeminiConfig,
  MessageRole,
  ContentType,
  AnalysisType,
  IModerationResult,
  IServiceHealth,
  IUsageMetrics,
} from './interfaces/gemini-ai.interface';
import {
  ChatRequestDto,
  ContentGenerationRequestDto,
  TextAnalysisRequestDto,
  CreateConversationDto,
  UpdateConversationDto,
  ChatResponseDto,
  ContentGenerationResponseDto,
  TextAnalysisResponseDto,
  ConversationResponseDto,
} from './dto/gemini-ai.dto';

/**
 * Gemini AI Service
 * 
 * Provides comprehensive Google Gemini AI integration including:
 * - Conversational AI chat capabilities
 * - Content generation for various formats
 * - Text analysis and sentiment detection
 * - Intelligent document processing
 * - Multi-modal AI interactions
 * 
 * Implements SOLID principles with proper error handling,
 * conversation management, and usage tracking.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@Injectable()
export class GeminiAIService {
  private readonly logger = new Logger(GeminiAIService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly config: IGeminiConfig;
  private readonly conversationsCollection = 'ai_conversations';
  private readonly usageMetricsCollection = 'ai_usage_metrics';

  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseService: FirebaseService,
  ) {
    this.config = this.loadConfiguration();
    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    
    this.logger.log('🤖 Gemini AI Service initialized');
    this.validateConfiguration();
  }

  /**
   * Load configuration from environment variables
   * @private
   */
  private loadConfiguration(): IGeminiConfig {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required but not configured');
    }

    return {
      apiKey,
      defaultModel: this.configService.get<string>('GEMINI_MODEL_ID', 'gemini-2.5-flash-lite'),
      defaultTemperature: this.configService.get<number>('GEMINI_DEFAULT_TEMPERATURE', 0.7),
      maxTokens: this.configService.get<number>('GEMINI_MAX_TOKENS', 2048),
      timeout: this.configService.get<number>('GEMINI_TIMEOUT', 30000),
      retryConfig: {
        retries: this.configService.get<number>('GEMINI_RETRY_COUNT', 3),
        backoffDelay: this.configService.get<number>('GEMINI_RETRY_DELAY', 1000),
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    };
  }

  /**
   * Validate service configuration
   * @private
   */
  private validateConfiguration(): void {
    try {
      if (!this.config.apiKey || this.config.apiKey.length < 10) {
        throw new Error('Invalid Gemini API key');
      }
      
      this.logger.log('✅ Gemini AI configuration validated');
    } catch (error) {
      this.logger.error(`❌ Configuration validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a chat message and get AI response
   * 
   * @param request - Chat request parameters
   * @param userId - ID of the user sending the message
   * @returns Promise<IAIServiceResponse<ChatResponseDto>>
   */
  async chat(request: ChatRequestDto, userId: string): Promise<IAIServiceResponse<ChatResponseDto>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`💬 Chat request from user ${userId}: ${request.message.substring(0, 50)}... [${requestId}]`);

      // Get or create conversation
      let conversation: IChatConversation;
      if (request.conversationId) {
        conversation = await this.getConversation(request.conversationId, userId);
        if (!conversation) {
          throw new BadRequestException('Conversation not found');
        }
      } else {
        conversation = await this.createConversation({}, userId);
      }

      // Add user message to conversation
      const userMessage: IChatMessage = {
        role: MessageRole.USER,
        content: request.message,
        timestamp: new Date(),
      };

      conversation.messages.push(userMessage);

      // Prepare context for AI
      const context = this.buildConversationContext(conversation, request.systemContext);

      // Get AI response
      const model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel,
        generationConfig: {
          temperature: request.temperature || this.config.defaultTemperature,
          maxOutputTokens: request.maxTokens || this.config.maxTokens,
        },
        safetySettings: this.config.safetySettings,
      });

      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(context);
      });

      const response = result.response;
      const aiContent = response.text();

      // Add AI response to conversation
      const aiMessage: IChatMessage = {
        role: MessageRole.ASSISTANT,
        content: aiContent,
        timestamp: new Date(),
      };

      conversation.messages.push(aiMessage);
      conversation.updatedAt = new Date();

      // Save updated conversation
      await this.updateConversationInFirebase(conversation);

      // Extract usage metadata
      const usageMetadata = result.response.usageMetadata;
      const totalTokens = usageMetadata?.totalTokenCount || 0;
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const completionTokens = usageMetadata?.candidatesTokenCount || 0;

      // Track usage
      await this.trackUsage('chat', totalTokens);

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Chat response generated for user ${userId} [${requestId}] (${executionTime}ms)`);

      const chatResponse: ChatResponseDto = {
        content: aiContent,
        conversationId: conversation.id,
        confidence: 0.95, // Placeholder - Gemini doesn't provide confidence scores
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        metadata: {
          model: this.config.defaultModel,
          temperature: request.temperature || this.config.defaultTemperature,
          responseTime: executionTime,
        },
      };

      return {
        success: true,
        data: chatResponse,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
          model: this.config.defaultModel,
          tokensUsed: totalTokens,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Chat failed for user ${userId} [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'CHAT_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
          model: this.config.defaultModel,
        },
      };
    }
  }

  /**
   * Generate content based on prompt and type
   * 
   * @param request - Content generation request
   * @param userId - ID of the user requesting content
   * @returns Promise<IAIServiceResponse<ContentGenerationResponseDto>>
   */
  async generateContent(
    request: ContentGenerationRequestDto,
    userId: string,
  ): Promise<IAIServiceResponse<ContentGenerationResponseDto>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`📝 Content generation request (${request.type}) from user ${userId} [${requestId}]`);

      // Build enhanced prompt based on content type and parameters
      const enhancedPrompt = this.buildContentPrompt(request);

      const model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel,
        generationConfig: {
          temperature: this.getTemperatureForContentType(request.type),
          maxOutputTokens: this.getMaxTokensForContentType(request.type),
        },
        safetySettings: this.config.safetySettings,
      });

      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(enhancedPrompt);
      });

      const response = result.response;
      const generatedContent = response.text();

      // Post-process content based on type
      const processedContent = this.postProcessContent(generatedContent, request.type);

      // Calculate quality score (simplified implementation)
      const qualityScore = this.calculateContentQuality(processedContent, request.type);

      // Extract usage metadata
      const usageMetadata = result.response.usageMetadata;
      const totalTokens = usageMetadata?.totalTokenCount || 0;
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const completionTokens = usageMetadata?.candidatesTokenCount || 0;

      // Track usage
      await this.trackUsage('content_generation', totalTokens);

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Content generated (${request.type}) for user ${userId} [${requestId}] (${executionTime}ms)`);

      const contentResponse: ContentGenerationResponseDto = {
        content: processedContent,
        type: request.type,
        qualityScore,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };

      return {
        success: true,
        data: contentResponse,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
          model: this.config.defaultModel,
          tokensUsed: totalTokens,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Content generation failed for user ${userId} [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'CONTENT_GENERATION_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
          model: this.config.defaultModel,
        },
      };
    }
  }

  /**
   * Analyze text for sentiment, entities, and other insights
   * 
   * @param request - Text analysis request
   * @param userId - ID of the user requesting analysis
   * @returns Promise<IAIServiceResponse<TextAnalysisResponseDto>>
   */
  async analyzeText(
    request: TextAnalysisRequestDto,
    userId: string,
  ): Promise<IAIServiceResponse<TextAnalysisResponseDto>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`🔍 Text analysis request from user ${userId} for ${request.analysisTypes.join(', ')} [${requestId}]`);

      const analysisResults: Partial<ITextAnalysisResponse> = {};

      // Perform each requested analysis type
      for (const analysisType of request.analysisTypes) {
        try {
          const result = await this.performSpecificAnalysis(request.text, analysisType, request.context);
          
          switch (analysisType) {
            case AnalysisType.SENTIMENT:
              analysisResults.sentiment = result as any;
              break;
            case AnalysisType.ENTITY_EXTRACTION:
              analysisResults.entities = result as any;
              break;
            case AnalysisType.KEY_PHRASES:
              analysisResults.keyPhrases = result as any;
              break;
            case AnalysisType.CLASSIFICATION:
              analysisResults.classification = result as any;
              break;
            case AnalysisType.RISK_ASSESSMENT:
              analysisResults.riskAssessment = result as any;
              break;
            case AnalysisType.QUALITY_SCORE:
              analysisResults.qualityScore = result as any;
              break;
          }
        } catch (error) {
          this.logger.warn(`Analysis type ${analysisType} failed: ${error.message}`);
        }
      }

      // Track usage
      await this.trackUsage('text_analysis', 0); // Simplified token counting

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Text analysis completed for user ${userId} [${requestId}] (${executionTime}ms)`);

      return {
        success: true,
        data: analysisResults as TextAnalysisResponseDto,
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
          model: this.config.defaultModel,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Text analysis failed for user ${userId} [${requestId}] (${executionTime}ms): ${error.message}`);
      
      return {
        success: false,
        error: {
          code: 'TEXT_ANALYSIS_FAILED',
          message: error.message,
          details: error,
        },
        metadata: {
          requestId,
          timestamp: new Date(),
          executionTime,
          model: this.config.defaultModel,
        },
      };
    }
  }

  /**
   * Create a new conversation
   * 
   * @param createDto - Conversation creation parameters
   * @param userId - ID of the user creating the conversation
   * @returns Promise<ConversationResponseDto>
   */
  async createConversation(
    createDto: CreateConversationDto,
    userId: string,
  ): Promise<IChatConversation> {
    try {
      this.logger.log(`Creating new conversation for user ${userId}`);

      const conversation: IChatConversation = {
        id: this.generateConversationId(),
        userId,
        title: createDto.title || 'New Conversation',
        messages: [],
        context: createDto.context,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      // Add system message if provided
      if (createDto.systemPrompt) {
        conversation.messages.push({
          role: MessageRole.SYSTEM,
          content: createDto.systemPrompt,
          timestamp: new Date(),
        });
      }

      // Save to Firebase
      const docRef = await this.firebaseService.create(this.conversationsCollection, conversation);
      conversation.id = docRef.id;

      this.logger.log(`✅ Conversation created: ${conversation.id}`);
      return conversation;

    } catch (error) {
      this.logger.error(`❌ Failed to create conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   * 
   * @param conversationId - Conversation ID
   * @param userId - User ID to verify ownership
   * @returns Promise<IChatConversation | null>
   */
  async getConversation(conversationId: string, userId: string): Promise<IChatConversation | null> {
    try {
      const conversation = await this.firebaseService.findById(this.conversationsCollection, conversationId);
      
      if (!conversation || conversation.userId !== userId) {
        return null;
      }

      return conversation as IChatConversation;

    } catch (error) {
      this.logger.error(`❌ Failed to get conversation ${conversationId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user's conversations
   * 
   * @param userId - User ID
   * @param limit - Maximum number of conversations to return
   * @param offset - Offset for pagination
   * @returns Promise<IChatConversation[]>
   */
  async getUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<IChatConversation[]> {
    try {
      const conversations = await this.firebaseService.findByField(
        this.conversationsCollection,
        'userId',
        userId,
        limit,
      );

      return conversations as IChatConversation[];

    } catch (error) {
      this.logger.error(`❌ Failed to get conversations for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Update conversation
   * 
   * @param conversationId - Conversation ID
   * @param updateDto - Update parameters
   * @param userId - User ID to verify ownership
   * @returns Promise<IChatConversation>
   */
  async updateConversation(
    conversationId: string,
    updateDto: UpdateConversationDto,
    userId: string,
  ): Promise<IChatConversation> {
    try {
      const conversation = await this.getConversation(conversationId, userId);
      if (!conversation) {
        throw new BadRequestException('Conversation not found');
      }

      const updateData = {
        ...updateDto,
        updatedAt: new Date(),
      };

      await this.firebaseService.update(this.conversationsCollection, conversationId, updateData);

      return { ...conversation, ...updateData } as IChatConversation;

    } catch (error) {
      this.logger.error(`❌ Failed to update conversation ${conversationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete conversation
   * 
   * @param conversationId - Conversation ID
   * @param userId - User ID to verify ownership
   * @returns Promise<void>
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId);
      if (!conversation) {
        throw new BadRequestException('Conversation not found');
      }

      await this.firebaseService.delete(this.conversationsCollection, conversationId);
      this.logger.log(`✅ Conversation deleted: ${conversationId}`);

    } catch (error) {
      this.logger.error(`❌ Failed to delete conversation ${conversationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Moderate content for safety
   * 
   * @param content - Content to moderate
   * @returns Promise<IModerationResult>
   */
  async moderateContent(content: string): Promise<IModerationResult> {
    try {
      // Use Gemini to analyze content safety
      const model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel,
        safetySettings: this.config.safetySettings,
      });

      const prompt = `Analyze the following content for safety issues including harassment, hate speech, explicit content, or dangerous material. Respond with a JSON object containing isSafe (boolean), categories (array of objects with category, probability, flagged), and overallScore (0-1): "${content}"`;

      try {
        const result = await model.generateContent(prompt);
        const response = JSON.parse(result.response.text());
        return response as IModerationResult;
      } catch {
        // If AI analysis fails, use basic keyword filtering
        return this.basicContentModeration(content);
      }

    } catch (error) {
      this.logger.error(`❌ Content moderation failed: ${error.message}`);
      return this.basicContentModeration(content);
    }
  }

  /**
   * Health check for Gemini AI service
   */
  async healthCheck(): Promise<IAIServiceResponse<IServiceHealth>> {
    try {
      const startTime = Date.now();
      
      // Simple test generation to verify API connectivity
      const model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel,
      });

      await model.generateContent('Hello, this is a health check.');
      
      const responseTime = Date.now() - startTime;

      const health: IServiceHealth = {
        status: 'healthy',
        lastCheck: new Date(),
        responseTime,
        errorRate: 0, // Would be calculated from actual metrics
        apiKeyValid: true,
      };

      return {
        success: true,
        data: health,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          executionTime: responseTime,
          model: this.config.defaultModel,
        },
      };

    } catch (error) {
      this.logger.error(`Gemini AI health check failed: ${error.message}`);
      
      const health: IServiceHealth = {
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: -1,
        errorRate: 100,
        apiKeyValid: false,
      };

      return {
        success: false,
        data: health,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error.message,
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          executionTime: 0,
          model: this.config.defaultModel,
        },
      };
    }
  }

  /**
   * Private helper methods
   */

  private async updateConversationInFirebase(conversation: IChatConversation): Promise<void> {
    try {
      await this.firebaseService.update(this.conversationsCollection, conversation.id, {
        messages: conversation.messages,
        updatedAt: conversation.updatedAt,
      });
    } catch (error) {
      this.logger.error(`Failed to update conversation in Firebase: ${error.message}`);
      throw error;
    }
  }

  private buildConversationContext(conversation: IChatConversation, systemContext?: string): string {
    let context = '';

    // Add system context if provided
    if (systemContext) {
      context += `System: ${systemContext}\n\n`;
    }

    // Add conversation context
    if (conversation.context) {
      context += `Context: ${conversation.context}\n\n`;
    }

    // Add recent messages (limit to prevent token overflow)
    const recentMessages = conversation.messages.slice(-10);
    for (const message of recentMessages) {
      const roleLabel = message.role === MessageRole.USER ? 'Human' : 'Assistant';
      context += `${roleLabel}: ${message.content}\n`;
    }

    context += 'Assistant:';
    return context;
  }

  private buildContentPrompt(request: ContentGenerationRequestDto): string {
    let prompt = '';

    // Add content type specific instructions
    switch (request.type) {
      case ContentType.EMAIL:
        prompt += 'Generate a professional email with the following requirements:\n';
        break;
      case ContentType.REPORT:
        prompt += 'Generate a detailed report with the following specifications:\n';
        break;
      case ContentType.SUMMARY:
        prompt += 'Create a concise summary of the following:\n';
        break;
      default:
        prompt += 'Generate content according to the following requirements:\n';
    }

    // Add main prompt
    prompt += `${request.prompt}\n\n`;

    // Add context if provided
    if (request.context) {
      prompt += `Context: ${request.context}\n\n`;
    }

    // Add parameter-based instructions
    if (request.parameters) {
      if (request.parameters.tone) {
        prompt += `Tone: ${request.parameters.tone}\n`;
      }
      if (request.parameters.length) {
        prompt += `Length: ${request.parameters.length}\n`;
      }
      if (request.parameters.targetAudience) {
        prompt += `Target Audience: ${request.parameters.targetAudience}\n`;
      }
      if (request.parameters.customInstructions) {
        prompt += `Additional Instructions: ${request.parameters.customInstructions}\n`;
      }
    }

    return prompt;
  }

  private getTemperatureForContentType(type: ContentType): number {
    switch (type) {
      case ContentType.EMAIL:
      case ContentType.REPORT:
        return 0.3; // More deterministic for formal content
      case ContentType.SUMMARY:
      case ContentType.ANALYSIS:
        return 0.5; // Balanced for analytical content
      default:
        return 0.7; // More creative for general content
    }
  }

  private getMaxTokensForContentType(type: ContentType): number {
    switch (type) {
      case ContentType.EMAIL:
        return 500;
      case ContentType.SUMMARY:
        return 300;
      case ContentType.REPORT:
        return 2000;
      default:
        return 1000;
    }
  }

  private postProcessContent(content: string, type: ContentType): string {
    // Basic post-processing based on content type
    switch (type) {
      case ContentType.EMAIL:
        // Ensure proper email structure
        if (!content.includes('Subject:') && !content.includes('Dear') && !content.includes('Hello')) {
          return `Subject: ${content.split('\n')[0]}\n\n${content}`;
        }
        break;
      case ContentType.REPORT:
        // Ensure proper report structure
        if (!content.includes('Executive Summary') && !content.includes('Introduction')) {
          return `# Report\n\n## Executive Summary\n\n${content}`;
        }
        break;
    }
    
    return content;
  }

  private calculateContentQuality(content: string, type: ContentType): number {
    // Simplified quality scoring
    let score = 0.5;

    // Length check
    const wordCount = content.split(' ').length;
    if (wordCount > 50) score += 0.2;
    if (wordCount > 200) score += 0.1;

    // Structure check
    if (content.includes('\n\n')) score += 0.1; // Has paragraphs
    if (content.match(/[.!?]/g)?.length > 2) score += 0.1; // Multiple sentences

    return Math.min(score, 1.0);
  }

  private async performSpecificAnalysis(text: string, analysisType: AnalysisType, context?: string): Promise<any> {
    const model = this.genAI.getGenerativeModel({
      model: this.config.defaultModel,
      generationConfig: {
        temperature: 0.1, // Low temperature for analytical tasks
      },
    });

    let prompt = '';

    switch (analysisType) {
      case AnalysisType.SENTIMENT:
        prompt = `Analyze the sentiment of the following text. Respond with JSON containing sentiment (positive/negative/neutral), confidence (0-1), and score (-1 to 1): "${text}"`;
        break;
      case AnalysisType.ENTITY_EXTRACTION:
        prompt = `Extract named entities from the following text. Respond with JSON array of objects containing text, type, confidence, startOffset, endOffset: "${text}"`;
        break;
      case AnalysisType.KEY_PHRASES:
        prompt = `Extract key phrases from the following text. Respond with JSON array of strings: "${text}"`;
        break;
      case AnalysisType.CLASSIFICATION:
        prompt = `Classify the following text. Respond with JSON containing category and confidence: "${text}"`;
        break;
      case AnalysisType.RISK_ASSESSMENT:
        prompt = `Assess risks in the following text. Respond with JSON containing riskLevel (low/medium/high), riskFactors array, and confidence: "${text}"`;
        break;
      case AnalysisType.QUALITY_SCORE:
        prompt = `Score the quality of the following text (0-100). Respond with JSON containing score and factors object: "${text}"`;
        break;
    }

    if (context) {
      prompt += `\n\nContext: ${context}`;
    }

    try {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      this.logger.warn(`Failed to parse analysis result for ${analysisType}: ${error.message}`);
      return this.getDefaultAnalysisResult(analysisType);
    }
  }

  private getDefaultAnalysisResult(analysisType: AnalysisType): any {
    switch (analysisType) {
      case AnalysisType.SENTIMENT:
        return { sentiment: 'neutral', confidence: 0.5, score: 0 };
      case AnalysisType.ENTITY_EXTRACTION:
        return [];
      case AnalysisType.KEY_PHRASES:
        return [];
      case AnalysisType.CLASSIFICATION:
        return { category: 'unknown', confidence: 0.5 };
      case AnalysisType.RISK_ASSESSMENT:
        return { riskLevel: 'low', riskFactors: [], confidence: 0.5 };
      case AnalysisType.QUALITY_SCORE:
        return { score: 50, factors: {} };
      default:
        return {};
    }
  }

  private basicContentModeration(content: string): IModerationResult {
    const flaggedWords = ['spam', 'abuse', 'harmful']; // Simplified list
    const foundWords = flaggedWords.filter(word => content.toLowerCase().includes(word));
    
    return {
      isSafe: foundWords.length === 0,
      categories: [{
        category: 'harmful_content',
        probability: foundWords.length > 0 ? 0.8 : 0.1,
        flagged: foundWords.length > 0,
      }],
      overallScore: foundWords.length > 0 ? 0.2 : 0.9,
    };
  }

  private async trackUsage(operationType: string, tokensUsed: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const usageDoc = await this.firebaseService.findById(this.usageMetricsCollection, today);

      if (usageDoc) {
        // Update existing metrics
        await this.firebaseService.update(this.usageMetricsCollection, today, {
          totalRequests: usageDoc.totalRequests + 1,
          totalTokens: usageDoc.totalTokens + tokensUsed,
          [`requestsByType.${operationType}`]: (usageDoc.requestsByType?.[operationType] || 0) + 1,
          updatedAt: new Date(),
        });
      } else {
        // Create new metrics
        const metrics: IUsageMetrics = {
          totalRequests: 1,
          totalTokens: tokensUsed,
          averageResponseTime: 0,
          errorRate: 0,
          costEstimate: 0,
          requestsByType: { [operationType]: 1 },
        };

        await this.firebaseService.create(this.usageMetricsCollection, {
          id: today,
          ...metrics,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to track usage: ${error.message}`);
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.retryConfig.retries;
    const baseDelay = this.config.retryConfig.backoffDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
        await this.delay(delay);
      }
    }

    throw new ServiceUnavailableException('Maximum retry attempts exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate contextual prompt suggestions for verification request types
   * 
   * @param requestTypeCategory - Category of the request type
   * @param requestTypeName - Name of the specific request type
   * @param userInput - Optional user's partial input
   * @param locationInfo - Optional location context
   * @returns Promise with prompt suggestions and guidance
   */
  async generateRequestTypePrompt(
    requestTypeCategory: string,
    requestTypeName: string,
    userInput?: string,
    locationInfo?: { area?: string; address?: string; landmark?: string },
  ): Promise<{
    suggestedPrompt: string;
    helpfulTips: string[];
    exampleRequests: string[];
    requiredInfo: string[];
    deliverables: string[];
  }> {
    try {
      this.logger.log(`Generating prompt assistance for ${requestTypeName} (${requestTypeCategory})`);

      // Build context-aware guidance based on request type
      const guidance = this.getRequestTypeGuidance(requestTypeCategory, requestTypeName);

      // If user has provided input, enhance it with AI
      let suggestedPrompt = '';
      if (userInput && userInput.trim().length > 5) {
        suggestedPrompt = await this.enhanceUserPromptWithAI(
          userInput,
          requestTypeCategory,
          requestTypeName,
          locationInfo,
          guidance,
        );
      } else {
        // Generate a template prompt
        suggestedPrompt = this.generateTemplatePrompt(
          requestTypeCategory,
          requestTypeName,
          locationInfo,
        );
      }

      return {
        suggestedPrompt,
        helpfulTips: guidance.tips,
        exampleRequests: guidance.examples,
        requiredInfo: guidance.required,
        deliverables: guidance.deliverables,
      };

    } catch (error) {
      this.logger.error(`Failed to generate request type prompt: ${error.message}`);
      
      // Return fallback guidance
      return this.getFallbackGuidance(requestTypeCategory);
    }
  }

  /**
   * Get type-specific guidance and requirements
   * @private
   */
  private getRequestTypeGuidance(category: string, name: string): {
    tips: string[];
    examples: string[];
    required: string[];
    deliverables: string[];
  } {
    const guidanceMap: Record<string, any> = {
      VERIFICATION: {
        tips: [
          'Provide the exact address or business name for accurate verification',
          'Specify what aspects you want verified (e.g., existence, operating hours, condition)',
          'Mention if you need photos of specific features or areas',
          'Indicate your urgency level and preferred visit time',
        ],
        examples: [
          'Verify ABC Restaurant at 123 Victoria Island, Lagos. Confirm if open and check hygiene standards.',
          'Check if XYZ Company exists at Plot 45, Lekki Phase 1. Take photos of the building exterior.',
          'Verify Golden Tulip Hotel, Victoria Island. Confirm room availability and facilities.',
        ],
        required: [
          'Exact address, landmark, or business name',
          'Specific verification requirements',
          'Any time constraints or scheduling preferences',
        ],
        deliverables: [
          'Minimum 3 clear photos with GPS coordinates',
          'Written confirmation of findings',
          'Verification report with timestamp',
        ],
      },
      DISCOVERY: {
        tips: [
          'Clearly describe what you\'re looking for (e.g., type of business, service, amenities)',
          'Specify your search area or neighborhood',
          'Mention your budget range or price expectations',
          'List must-have features vs nice-to-have features',
          'Indicate how many options you want to compare',
        ],
        examples: [
          'Find 3-5 affordable restaurants with outdoor seating in Lekki Phase 1, budget ₦5,000-₦10,000 per person.',
          'Discover coworking spaces near Ikoyi with high-speed internet, meeting rooms, and parking. Max ₦50,000/month.',
          'Find family-friendly hotels in Victoria Island with swimming pools, within ₦30,000/night.',
        ],
        required: [
          'Type of place/business/service you\'re looking for',
          'Search area or neighborhood',
          'Budget range or price expectations',
          'Key requirements and preferences',
        ],
        deliverables: [
          'List of 3-5 matching options with photos',
          'Brief description and pricing for each',
          'Location details with GPS coordinates',
          'Agent\'s recommendations',
        ],
      },
      RESEARCH: {
        tips: [
          'Specify the product or service category you\'re researching',
          'Define your research area or coverage zone',
          'List specific information you need (pricing, availability, brands, quality)',
          'Mention if you need comparative analysis',
          'Indicate your decision timeline',
        ],
        examples: [
          'Research laptop repair services in Ikeja. Get pricing for screen replacement, response time, and warranty terms.',
          'Compare prices for generator repairs (5KVA) across 5 vendors in Surulere. Include parts cost and labor.',
          'Research bakeries that deliver birthday cakes in Lekki. Get pricing for 2-tier fondant cakes.',
        ],
        required: [
          'Product/service category to research',
          'Geographic area for research',
          'Specific data points needed (pricing, availability, specs)',
          'Number of vendors/locations to cover',
        ],
        deliverables: [
          'Detailed research report with findings',
          'Comparison table with key metrics',
          'Photos of products/services where applicable',
          'Vendor contact information',
          'Agent\'s recommendations',
        ],
      },
      COMPARISON: {
        tips: [
          'List 2-5 specific locations you want compared',
          'Define comparison criteria (price, quality, service, ambiance, etc.)',
          'Prioritize what matters most to your decision',
          'Mention if you need side-by-side photos',
          'Indicate any deal-breakers or must-haves',
        ],
        examples: [
          'Compare ABC Gym vs XYZ Fitness in Lekki. Focus on equipment quality, membership fees, and class schedules.',
          'Compare 3 hotels: Radisson, Sheraton, and Eko Hotel. Check room quality, amenities, and customer service.',
          'Compare 2 daycare centers in Ikeja. Evaluate safety, staff, activities, and pricing.',
        ],
        required: [
          'List of 2-5 specific locations to compare',
          'Comparison criteria and priorities',
          'Budget constraints if applicable',
          'Your decision timeline',
        ],
        deliverables: [
          'Detailed comparison report with scoring',
          'Side-by-side photos of comparable features',
          'Pros and cons for each location',
          'Pricing breakdown',
          'Agent\'s recommendation with reasoning',
        ],
      },
      SURVEY: {
        tips: [
          'Clearly state the purpose of the survey (construction, renovation, assessment, etc.)',
          'Specify all measurements and documentation needed',
          'List specific features or areas to inspect',
          'Mention if you need technical expertise (e.g., structural, electrical)',
          'Indicate if you need a detailed floor plan or sketch',
        ],
        examples: [
          'Survey vacant land plot at Ajah for construction feasibility. Measure dimensions, check terrain, document utilities access.',
          'Inspect warehouse at Apapa for lease. Check roof condition, floor capacity, loading bay access, and security.',
          'Survey residential property at Ikoyi. Document all rooms, measure spaces, note repairs needed, check plumbing/electrical.',
        ],
        required: [
          'Property address and type (land, building, warehouse, etc.)',
          'Purpose of survey (purchase, lease, renovation, etc.)',
          'Specific measurements and documentation needed',
          'Areas or features requiring special attention',
        ],
        deliverables: [
          'Comprehensive photo documentation (20+ photos)',
          'Detailed measurements and dimensions',
          'Written report of findings and observations',
          'Condition assessment',
          'Floor plan or site sketch if applicable',
        ],
      },
      URGENT: {
        tips: [
          'Clearly state why this is urgent and your deadline',
          'Provide complete information upfront to avoid delays',
          'Ensure location details are accurate and accessible',
          'Be available for agent questions during the visit',
          'Consider scheduling if immediate response isn\'t available',
        ],
        examples: [
          'URGENT: Verify meeting venue at Eko Hotel within 2 hours. Meeting scheduled for 4 PM today.',
          'URGENT: Check if ABC Pharmacy on Allen Avenue is open NOW and has insulin in stock.',
          'URGENT: Verify event setup at Landmark Event Center by 6 PM today. Event starts at 7 PM.',
        ],
        required: [
          'Exact location with clear access instructions',
          'Urgent verification requirements',
          'Specific deadline (date and time)',
          'Reason for urgency',
          'Your contact information for immediate updates',
        ],
        deliverables: [
          'Immediate photos and preliminary report',
          'Real-time updates via call/message',
          'GPS-tagged photos',
          'Quick turnaround report within deadline',
        ],
      },
      MYSTERY_SHOPPER: {
        tips: [
          'Specify the business type and exact location',
          'Define what aspects to evaluate (service quality, cleanliness, staff behavior, etc.)',
          'Provide a cover story or scenario for the agent',
          'List specific interactions or questions the agent should have',
          'Mention if you need receipts or proof of purchase',
        ],
        examples: [
          'Mystery shop ABC Restaurant, Victoria Island. Order a meal, evaluate service speed, staff friendliness, food quality, and cleanliness.',
          'Pose as a customer at XYZ Electronics, Ikeja. Inquire about laptop models, test staff product knowledge and customer service.',
          'Visit ABC Hotel as a potential guest. Ask about room types, check reception professionalism, inspect lobby cleanliness.',
        ],
        required: [
          'Business name and location',
          'Evaluation criteria and focus areas',
          'Agent\'s cover story or interaction scenario',
          'Budget for any required purchases',
          'Specific questions or tests to conduct',
        ],
        deliverables: [
          'Detailed evaluation report with observations',
          'Discreet photos (where appropriate)',
          'Ratings on specified criteria',
          'Staff interaction summary',
          'Receipts if purchases were made',
          'Recommendations for improvement',
        ],
      },
      RECURRING: {
        tips: [
          'Specify the frequency (daily, weekly, monthly) and duration',
          'Define consistent verification points for each visit',
          'Mention if same agent is preferred for continuity',
          'Set expectations for reporting format',
          'Clarify payment structure (per visit vs subscription)',
        ],
        examples: [
          'Weekly verification of construction site at Lekki Phase 2 for next 3 months. Document progress, materials, and worker presence.',
          'Monthly compliance checks for 5 retail locations across Lagos. Verify stock levels, cleanliness, and staff presence.',
          'Daily restaurant monitoring in Victoria Island for 2 weeks. Check opening/closing times, customer traffic, and operations.',
        ],
        required: [
          'Location(s) to be visited',
          'Frequency and duration of recurring checks',
          'Consistent verification checklist',
          'Reporting timeline and format',
          'Total number of expected visits',
        ],
        deliverables: [
          'Standardized report for each visit',
          'Progress tracking and trend analysis',
          'Time-stamped photos with GPS',
          'Comparison reports highlighting changes',
          'Summary report at end of engagement',
        ],
      },
      VIRTUAL_TOUR: {
        tips: [
          'Specify the property type and exact location',
          'List all areas that must be shown in the tour',
          'Mention video duration preferences',
          'Indicate if you need live interaction during the tour',
          'Specify if you need commentary or narration',
        ],
        examples: [
          'Live virtual tour of 3-bedroom apartment at Ikoyi. Show all rooms, kitchen, bathrooms, balcony. Include neighborhood views.',
          'Video walkthrough of office space at Lekki Phase 1. Focus on layout, natural lighting, and parking area. 15-minute video.',
          'Live tour of event venue at Victoria Island. Show capacity, stage setup, restrooms, parking. Need to ask questions during tour.',
        ],
        required: [
          'Property address and type',
          'Specific areas or features to include',
          'Tour duration preference',
          'Live or pre-recorded preference',
          'Best date/time for the tour',
        ],
        deliverables: [
          'HD video tour (live or recorded)',
          'Complete coverage of all requested areas',
          'Narration describing features',
          'Photos of key highlights',
          'Video sent via secure link',
        ],
      },
      NEIGHBORHOOD: {
        tips: [
          'Define the neighborhood or area boundaries clearly',
          'List specific aspects to assess (safety, amenities, infrastructure, noise levels)',
          'Mention your lifestyle or priorities (family-friendly, nightlife, quiet, etc.)',
          'Specify time of day for assessment if relevant',
          'Indicate if you need information on specific facilities (schools, hospitals, markets)',
        ],
        examples: [
          'Assess Chevron Drive area, Lekki for family relocation. Check security, schools, hospitals, traffic, market access, and recreation.',
          'Evaluate Banana Island for executive living. Focus on exclusivity, security, luxury amenities, and maintenance standards.',
          'Research Surulere neighborhood for young professionals. Check nightlife, dining options, workspace availability, safety, and affordability.',
        ],
        required: [
          'Neighborhood or area name with boundaries',
          'Assessment criteria based on your needs',
          'Your lifestyle or household profile',
          'Preferred visit time (morning, evening, weekend)',
          'Specific facilities or amenities of interest',
        ],
        deliverables: [
          'Comprehensive neighborhood report',
          'Photos and videos of key areas',
          'Assessment of amenities and infrastructure',
          'Safety and security evaluation',
          'Traffic and accessibility analysis',
          'Cost of living indicators (if applicable)',
          'Agent\'s suitability recommendation',
        ],
      },
      COMPLIANCE: {
        tips: [
          'Specify the compliance standard or regulation being verified',
          'List exact compliance checkpoints or requirements',
          'Mention regulatory body or authority involved',
          'Provide checklist or compliance criteria',
          'Indicate if documentation or certificates need verification',
        ],
        examples: [
          'Verify restaurant compliance with NAFDAC standards at ABC Eatery, Ikeja. Check food handling, storage, hygiene, and permits.',
          'Compliance check for construction site safety at Lekki. Verify PPE usage, signage, barriers, and safety measures per FG regulations.',
          'Verify office fire safety compliance at Victoria Island tower. Check extinguishers, exits, alarms, and evacuation plans.',
        ],
        required: [
          'Location and business type',
          'Specific compliance standard or regulation',
          'Detailed compliance checklist',
          'Documents or certificates to verify',
          'Regulatory context and consequences',
        ],
        deliverables: [
          'Compliance verification report',
          'Checklist with pass/fail status for each item',
          'Photos of compliant and non-compliant areas',
          'Copies of relevant certificates/permits (if allowed)',
          'Recommendations for achieving compliance',
          'Risk assessment if non-compliant',
        ],
      },
      EVENT: {
        tips: [
          'Provide event name, venue, and exact date/time',
          'Specify what needs to be verified or documented',
          'Mention if attendance numbers are needed',
          'Indicate if you need proof of participation or presence',
          'Clarify photo/video requirements',
        ],
        examples: [
          'Verify attendance at ABC Conference at Eko Hotel, March 15 at 9 AM. Take photos of attendees, signage, and setup.',
          'Document product launch event at XYZ Mall, Lekki today at 5 PM. Capture crowd size, branding, and key moments.',
          'Confirm seminar is happening at Landmark Centre this afternoon. Provide photos showing event in progress.',
        ],
        required: [
          'Event name and type',
          'Venue address',
          'Exact date and time',
          'Verification or documentation requirements',
          'Specific aspects to capture',
        ],
        deliverables: [
          'Time-stamped photos showing event',
          'Attendance estimation if required',
          'Video clips of key moments',
          'Verification report confirming event occurred',
          'Photos of signage, branding, and setup',
        ],
      },
    };

    return guidanceMap[category] || this.getDefaultGuidance();
  }

  /**
   * Get default guidance for unknown categories
   * @private
   */
  private getDefaultGuidance(): {
    tips: string[];
    examples: string[];
    required: string[];
    deliverables: string[];
  } {
    return {
      tips: [
        'Provide clear and specific location details',
        'Describe exactly what you want verified or checked',
        'Include any time constraints or preferences',
        'Mention specific requirements for photos or documentation',
      ],
      examples: [
        'Verify the location exists and is accessible',
        'Check if the business is operational',
        'Document the current condition with photos',
      ],
      required: [
        'Clear location information',
        'Specific verification requirements',
        'Any time or schedule constraints',
      ],
      deliverables: [
        'Photos with GPS coordinates',
        'Written verification report',
        'Documentation of findings',
      ],
    };
  }

  /**
   * Enhance user's partial input using AI
   * @private
   */
  private async enhanceUserPromptWithAI(
    userInput: string,
    category: string,
    requestTypeName: string,
    locationInfo: any,
    guidance: any,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel,
        generationConfig: {
          temperature: 0.4, // Lower temperature for more focused suggestions
          maxOutputTokens: 300,
        },
      });

      const enhancementPrompt = `
You are helping a user create a detailed verification request for the CheckIT24 platform.

REQUEST TYPE: ${requestTypeName} (${category})
USER'S INPUT: "${userInput}"
${locationInfo?.area ? `LOCATION AREA: ${locationInfo.area}` : ''}
${locationInfo?.address ? `ADDRESS: ${locationInfo.address}` : ''}
${locationInfo?.landmark ? `LANDMARK: ${locationInfo.landmark}` : ''}

REQUIRED INFORMATION FOR THIS TYPE:
${guidance.required.map((r: string) => `- ${r}`).join('\n')}

HELPFUL TIPS:
${guidance.tips.slice(0, 3).map((t: string) => `- ${t}`).join('\n')}

Please enhance the user's input into a clear, complete, and professional verification request that includes:
1. All required information
2. Specific details about what needs to be verified
3. Clear location details
4. Any relevant context

Return ONLY the enhanced prompt text, without explanations or labels. Make it natural and actionable for an agent.
`;

      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(enhancementPrompt);
      });

      return result.response.text().trim();

    } catch (error) {
      this.logger.warn(`AI enhancement failed, using template: ${error.message}`);
      return this.generateTemplatePrompt(category, requestTypeName, locationInfo);
    }
  }

  /**
   * Generate template prompt based on request type
   * @private
   */
  private generateTemplatePrompt(
    category: string,
    requestTypeName: string,
    locationInfo?: any,
  ): string {
    const location = locationInfo?.address || locationInfo?.area || '[Specify location]';
    const landmark = locationInfo?.landmark ? ` near ${locationInfo.landmark}` : '';

    const templates: Record<string, string> = {
      VERIFICATION: `Verify [business/location name] at ${location}${landmark}. Please confirm [what you want verified] and provide photos with GPS coordinates.`,
      DISCOVERY: `Find [number] options for [type of business/service] in ${location}${landmark}. Budget range: [specify budget]. Must have: [list requirements].`,
      RESEARCH: `Research [product/service category] providers in ${location}${landmark}. Get pricing, availability, and compare [number] vendors for [specific items].`,
      COMPARISON: `Compare [Business A] and [Business B] in ${location}${landmark}. Focus on [criteria 1], [criteria 2], and [criteria 3]. Budget: [amount].`,
      SURVEY: `Survey the property at ${location}${landmark} for [purpose: purchase/lease/renovation]. Document [specific areas], measure [dimensions needed], and check [features].`,
      URGENT: `URGENT: Verify [what needs verification] at ${location}${landmark} by [deadline time]. Needed for [reason]. Please provide immediate confirmation with photos.`,
      MYSTERY_SHOPPER: `Mystery shop [business name] at ${location}${landmark}. Pose as [cover story]. Evaluate [service aspect 1], [aspect 2], and [aspect 3]. Budget: [amount].`,
      RECURRING: `[Frequency: weekly/monthly] verification of ${location}${landmark} for [duration]. Check [consistent criteria] on each visit and provide standardized reports.`,
      VIRTUAL_TOUR: `Live virtual tour of [property type] at ${location}${landmark}. Show [all rooms/areas], focus on [specific features]. Preferred date/time: [specify].`,
      NEIGHBORHOOD: `Assess ${location} neighborhood${landmark} for [purpose: family/professional/executive living]. Evaluate [safety/amenities/infrastructure]. Visit during [time of day].`,
      COMPLIANCE: `Verify compliance with [regulation/standard] at [business name], ${location}${landmark}. Check [specific requirements] and document [certifications/permits].`,
      EVENT: `Verify [event name] at ${location}${landmark} on [date] at [time]. Document [attendance/setup/key moments] with time-stamped photos.`,
    };

    return templates[category] || `Please verify the location at ${location}${landmark} and provide detailed documentation.`;
  }

  /**
   * Get fallback guidance when AI fails
   * @private
   */
  private getFallbackGuidance(category: string): {
    suggestedPrompt: string;
    helpfulTips: string[];
    exampleRequests: string[];
    requiredInfo: string[];
    deliverables: string[];
  } {
    const guidance = this.getRequestTypeGuidance(category, '');
    
    return {
      suggestedPrompt: this.generateTemplatePrompt(category, '', {}),
      helpfulTips: guidance.tips,
      exampleRequests: guidance.examples,
      requiredInfo: guidance.required,
      deliverables: guidance.deliverables,
    };
  }

  /**
   * Simple AI chat for public/anonymous users without conversation management
   * 
   * @param message - User message
   * @param systemContext - Optional system context/prompt
   * @param temperature - Optional temperature (0-1)
   * @param maxTokens - Optional max tokens
   * @returns Promise<string> - AI response text
   */
  async simpleChat(
    message: string,
    systemContext?: string,
    temperature?: number,
    maxTokens?: number,
  ): Promise<string> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.log(`💬 Simple chat request: ${message.substring(0, 50)}... [${requestId}]`);

      // Build prompt with system context if provided
      let prompt = message;
      if (systemContext) {
        prompt = `${systemContext}\n\nUser: ${message}\n\nAssistant:`;
      }

      // Get AI response
      const model = this.genAI.getGenerativeModel({
        model: this.config.defaultModel,
        generationConfig: {
          temperature: temperature || this.config.defaultTemperature,
          maxOutputTokens: maxTokens || this.config.maxTokens,
        },
        safetySettings: this.config.safetySettings,
      });

      const result = await this.executeWithRetry(async () => {
        return await model.generateContent(prompt);
      });

      const response = result.response;
      const aiContent = response.text();

      // Extract usage metadata
      const usageMetadata = result.response.usageMetadata;
      const totalTokens = usageMetadata?.totalTokenCount || 0;

      // Track usage
      await this.trackUsage('simple_chat', totalTokens);

      const executionTime = Date.now() - startTime;
      this.logger.log(`✅ Simple chat response generated [${requestId}] (${executionTime}ms, ${totalTokens} tokens)`);

      return aiContent;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`❌ Simple chat failed [${requestId}] (${executionTime}ms): ${error.message}`);
      throw error;
    }
  }
}