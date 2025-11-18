import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GeminiAIService } from './gemini-ai.service';
import { GoogleMapsService } from '../google-maps/google-maps.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { UserRole } from '../../auth/interfaces/auth.interface';
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
  RequestTypePromptRequestDto,
  RequestTypePromptResponseDto,
} from './dto/gemini-ai.dto';
import { AIAssistChatRequestDto, AIAssistChatResponseDto } from './dto/ai-assist.dto';
import { MapChatRequestDto, MapChatResponseDto } from './dto/map-chat.dto';
import {
  IAIServiceResponse,
  IChatConversation,
  IModerationResult,
  IServiceHealth,
} from './interfaces/gemini-ai.interface';

/**
 * Gemini AI Controller
 * 
 * Provides REST API endpoints for Google Gemini AI integration:
 * - Chat and conversation management
 * - Content generation for various formats
 * - Text analysis and sentiment detection
 * - Content moderation and safety
 * - Service health monitoring
 * 
 * All endpoints require JWT authentication and appropriate permissions.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */
@ApiTags('🤖 Gemini AI')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class GeminiAIController {
  private readonly logger = new Logger(GeminiAIController.name);

  constructor(
    private readonly geminiAIService: GeminiAIService,
    private readonly googleMapsService: GoogleMapsService,
  ) {}

  /**
   * Send a chat message to AI assistant
   * 
   * @route POST /api/v1/ai/chat
   */
  @Post('chat')
  //@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat with AI Assistant',
    description: `
      Send a message to the AI assistant and receive an intelligent response.
      
      Features:
      - Contextual conversations with memory
      - System-level context injection
      - Conversation threading
      - Auto-moderation for safety
      - Usage tracking and analytics
      
      The AI assistant can help with:
      - General questions and information
      - Task planning and problem solving
      - Document analysis and summarization
      - Creative writing assistance
      - Technical support and guidance
    `,
  })
  @ApiBody({
    type: ChatRequestDto,
    description: 'Chat request with message and optional parameters',
    examples: {
      simple: {
        summary: 'Simple chat message',
        value: {
          message: 'Hello, can you help me plan a project timeline?',
        },
      },
      withContext: {
        summary: 'Chat with system context',
        value: {
          message: 'Review this code and suggest improvements',
          systemContext: 'You are a senior software engineer reviewing code for best practices',
          conversationId: 'conv_123456789',
          temperature: 0.7,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response with AI-generated content',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or conversation not found',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
  })
  async chat(
    @Body() chatRequest: ChatRequestDto,
    @Request() req: any,
  ): Promise<IAIServiceResponse<ChatResponseDto>> {
    const userId = req.user.id;
    this.logger.log(`💬 Chat request from user ${userId}: ${chatRequest.message.substring(0, 50)}...`);

    try {
      const result = await this.geminiAIService.chat(chatRequest, userId);
      
      if (result.success) {
        this.logger.log(`✅ Chat response sent to user ${userId}`);
      } else {
        this.logger.warn(`⚠️ Chat failed for user ${userId}: ${result.error?.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Chat error for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate content based on prompt and type
   * 
   * @route POST /api/v1/ai/generate
   */
  @Post('generate')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Content',
    description: `
      Generate various types of content using AI based on prompts and parameters.
      
      Supported content types:
      - EMAIL: Professional emails and communications
      - REPORT: Detailed reports and documentation
      - SUMMARY: Concise summaries of content
      - ANALYSIS: Analytical content and insights
      - ARTICLE: Blog posts and articles
      - PROPOSAL: Business proposals and plans
      
      Features:
      - Customizable tone and style
      - Target audience specification
      - Length control
      - Context-aware generation
      - Quality scoring
    `,
  })
  @ApiBody({
    type: ContentGenerationRequestDto,
    description: 'Content generation request with type and parameters',
    examples: {
      email: {
        summary: 'Generate professional email',
        value: {
          type: 'email',
          prompt: 'Write an email to inform customers about a new product launch',
          parameters: {
            tone: 'professional',
            length: 'medium',
            targetAudience: 'existing customers',
          },
        },
      },
      report: {
        summary: 'Generate business report',
        value: {
          type: 'report',
          prompt: 'Create a quarterly sales report based on the provided data',
          context: 'Q3 2024 sales data shows 15% growth over Q2',
          parameters: {
            tone: 'formal',
            length: 'long',
            targetAudience: 'executives',
            customInstructions: 'Include charts and recommendations',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Generated content with quality metrics',
    type: ContentGenerationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid content type or parameters',
  })
  async generateContent(
    @Body() request: ContentGenerationRequestDto,
    @Request() req: any,
  ): Promise<IAIServiceResponse<ContentGenerationResponseDto>> {
    const userId = req.user.id;
    this.logger.log(`📝 Content generation request (${request.type}) from user ${userId}`);

    try {
      const result = await this.geminiAIService.generateContent(request, userId);
      
      if (result.success) {
        this.logger.log(`✅ Content generated (${request.type}) for user ${userId}`);
      } else {
        this.logger.warn(`⚠️ Content generation failed for user ${userId}: ${result.error?.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Content generation error for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze text for insights and sentiment
   * 
   * @route POST /api/v1/ai/analyze
   */
  @Post('analyze')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze Text',
    description: `
      Perform comprehensive text analysis including sentiment, entity extraction, and more.
      
      Available analysis types:
      - SENTIMENT: Emotional tone and sentiment scoring
      - ENTITY_EXTRACTION: Named entity recognition
      - KEY_PHRASES: Important phrases and keywords
      - CLASSIFICATION: Text categorization
      - RISK_ASSESSMENT: Content risk evaluation
      - QUALITY_SCORE: Writing quality assessment
      
      Use cases:
      - Customer feedback analysis
      - Content moderation
      - Document processing
      - Quality assurance
      - Risk assessment
    `,
  })
  @ApiBody({
    type: TextAnalysisRequestDto,
    description: 'Text analysis request with analysis types',
    examples: {
      sentiment: {
        summary: 'Sentiment analysis',
        value: {
          text: 'I love this new feature! It makes my work so much easier.',
          analysisTypes: ['sentiment'],
        },
      },
      comprehensive: {
        summary: 'Comprehensive analysis',
        value: {
          text: 'The company reported strong quarterly results with revenue growth of 15% year-over-year.',
          analysisTypes: ['sentiment', 'entity_extraction', 'key_phrases', 'classification'],
          context: 'Financial earnings report',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Text analysis results with insights',
    type: TextAnalysisResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid text or analysis types',
  })
  async analyzeText(
    @Body() request: TextAnalysisRequestDto,
    @Request() req: any,
  ): Promise<IAIServiceResponse<TextAnalysisResponseDto>> {
    const userId = req.user.id;
    this.logger.log(`🔍 Text analysis request from user ${userId} for ${request.analysisTypes.join(', ')}`);

    try {
      const result = await this.geminiAIService.analyzeText(request, userId);
      
      if (result.success) {
        this.logger.log(`✅ Text analysis completed for user ${userId}`);
      } else {
        this.logger.warn(`⚠️ Text analysis failed for user ${userId}: ${result.error?.message}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Text analysis error for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new conversation
   * 
   * @route POST /api/v1/ai/conversations
   */
  @Post('conversations')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create New Conversation',
    description: `
      Create a new AI conversation thread for organizing related messages.
      
      Features:
      - Custom conversation titles
      - System prompts for context
      - Conversation context settings
      - Persistent message history
      
      Conversations help organize:
      - Project-specific discussions
      - Long-term assistance sessions
      - Contextual AI interactions
      - Knowledge building over time
    `,
  })
  @ApiBody({
    type: CreateConversationDto,
    description: 'Conversation creation parameters',
    examples: {
      simple: {
        summary: 'Simple conversation',
        value: {
          title: 'Project Planning Discussion',
        },
      },
      withContext: {
        summary: 'Conversation with system prompt',
        value: {
          title: 'Code Review Session',
          systemPrompt: 'You are a senior software engineer providing code review and best practices guidance',
          context: 'React TypeScript application development',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createConversation(
    @Body() createDto: CreateConversationDto,
    @Request() req: any,
  ): Promise<IChatConversation> {
    const userId = req.user.id;
    this.logger.log(`Creating new conversation for user ${userId}: ${createDto.title}`);

    try {
      const conversation = await this.geminiAIService.createConversation(createDto, userId);
      this.logger.log(`✅ Conversation created: ${conversation.id}`);
      return conversation;
    } catch (error) {
      this.logger.error(`❌ Failed to create conversation for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's conversations
   * 
   * @route GET /api/v1/ai/conversations
   */
  @Get('conversations')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @ApiOperation({
    summary: 'Get User Conversations',
    description: `
      Retrieve a list of the user's AI conversations with pagination support.
      
      Returns:
      - Conversation metadata
      - Recent message preview
      - Creation and update timestamps
      - Activity status
    `,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of conversations to return (default: 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of conversations to skip for pagination (default: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of user conversations',
    type: [ConversationResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getUserConversations(
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ): Promise<IChatConversation[]> {
    const userId = req.user.id;
    this.logger.log(`Fetching conversations for user ${userId} (limit: ${limit}, offset: ${offset})`);

    try {
      const conversations = await this.geminiAIService.getUserConversations(userId, limit, offset);
      this.logger.log(`✅ Retrieved ${conversations.length} conversations for user ${userId}`);
      return conversations;
    } catch (error) {
      this.logger.error(`❌ Failed to get conversations for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get specific conversation
   * 
   * @route GET /api/v1/ai/conversations/:id
   */
  @Get('conversations/:id')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @ApiOperation({
    summary: 'Get Conversation',
    description: `
      Retrieve a specific conversation with full message history.
      
      Returns:
      - Complete conversation details
      - All messages with timestamps
      - Conversation context and settings
      - Metadata and statistics
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv_1234567890_abcdef123',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation details',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Conversation not found or access denied',
  })
  async getConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ): Promise<IChatConversation> {
    const userId = req.user.id;
    this.logger.log(`Fetching conversation ${conversationId} for user ${userId}`);

    try {
      const conversation = await this.geminiAIService.getConversation(conversationId, userId);
      
      if (!conversation) {
        this.logger.warn(`Conversation ${conversationId} not found for user ${userId}`);
        throw new Error('Conversation not found');
      }

      this.logger.log(`✅ Retrieved conversation ${conversationId} for user ${userId}`);
      return conversation;
    } catch (error) {
      this.logger.error(`❌ Failed to get conversation ${conversationId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update conversation
   * 
   * @route PUT /api/v1/ai/conversations/:id
   */
  @Put('conversations/:id')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @ApiOperation({
    summary: 'Update Conversation',
    description: `
      Update conversation metadata such as title, context, or settings.
      
      Updatable fields:
      - Title
      - Context information
      - Activity status
      - Custom settings
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv_1234567890_abcdef123',
  })
  @ApiBody({
    type: UpdateConversationDto,
    description: 'Conversation update parameters',
    examples: {
      title: {
        summary: 'Update title',
        value: {
          title: 'Updated Project Planning Discussion',
        },
      },
      context: {
        summary: 'Update context',
        value: {
          title: 'Code Review Session',
          context: 'React TypeScript application with Next.js framework',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Conversation not found or access denied',
  })
  async updateConversation(
    @Param('id') conversationId: string,
    @Body() updateDto: UpdateConversationDto,
    @Request() req: any,
  ): Promise<IChatConversation> {
    const userId = req.user.id;
    this.logger.log(`Updating conversation ${conversationId} for user ${userId}`);

    try {
      const conversation = await this.geminiAIService.updateConversation(conversationId, updateDto, userId);
      this.logger.log(`✅ Updated conversation ${conversationId} for user ${userId}`);
      return conversation;
    } catch (error) {
      this.logger.error(`❌ Failed to update conversation ${conversationId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete conversation
   * 
   * @route DELETE /api/v1/ai/conversations/:id
   */
  @Delete('conversations/:id')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete Conversation',
    description: `
      Permanently delete a conversation and all its messages.
      
      Warning: This action cannot be undone. All conversation history will be lost.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'conv_1234567890_abcdef123',
  })
  @ApiResponse({
    status: 204,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Conversation not found or access denied',
  })
  async deleteConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user.id;
    this.logger.log(`Deleting conversation ${conversationId} for user ${userId}`);

    try {
      await this.geminiAIService.deleteConversation(conversationId, userId);
      this.logger.log(`✅ Deleted conversation ${conversationId} for user ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete conversation ${conversationId} for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Moderate content for safety
   * 
   * @route POST /api/v1/ai/moderate
   */
  @Post('moderate')
//@Roles(UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Moderate Content',
    description: `
      Check content for safety violations and harmful material.
      
      Moderation checks for:
      - Harassment and hate speech
      - Explicit content
      - Dangerous or harmful material
      - Spam and abuse
      
      Admin/Manager access only for content moderation workflows.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to moderate',
          example: 'This is sample content to check for safety violations.',
        },
      },
      required: ['content'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Content moderation results',
    schema: {
      type: 'object',
      properties: {
        isSafe: { type: 'boolean' },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              probability: { type: 'number' },
              flagged: { type: 'boolean' },
            },
          },
        },
        overallScore: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  async moderateContent(
    @Body('content') content: string,
    @Request() req: any,
  ): Promise<IModerationResult> {
    const userId = req.user.id;
    this.logger.log(`Content moderation request from user ${userId}`);

    try {
      const result = await this.geminiAIService.moderateContent(content);
      this.logger.log(`✅ Content moderation completed for user ${userId}: ${result.isSafe ? 'Safe' : 'Flagged'}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Content moderation error for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Service health check
   * 
   * @route GET /api/v1/ai/health
   */
  @Get('health')
//@Roles(UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @ApiOperation({
    summary: 'AI Service Health Check',
    description: `
      Check the health and status of the Gemini AI service.
      
      Returns:
      - Service availability status
      - Response time metrics
      - API connectivity status
      - Error rates and performance data
      
      Admin/Manager access only for service monitoring.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            lastCheck: { type: 'string' },
            responseTime: { type: 'number' },
            errorRate: { type: 'number' },
            apiKeyValid: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin/Manager access required',
  })
  async healthCheck(@Request() req: any): Promise<IAIServiceResponse<IServiceHealth>> {
    const userId = req.user.id;
    this.logger.log(`AI service health check requested by user ${userId}`);

    try {
      const result = await this.geminiAIService.healthCheck();
      this.logger.log(`✅ Health check completed: ${result.data?.status || 'unknown'}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Health check error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate smart prompt suggestions for verification request types
   * 
   * @route POST /api/v1/ai/request-type-prompt
   */
  @Post('request-type-prompt')
//@Roles(UserRole.CLIENT, UserRole.ADMIN, UserRole.AGENT_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get AI-Powered Prompt Suggestions for Request Types',
    description: `
      Generate intelligent, context-aware prompt suggestions to help users create better verification requests.
      
      Features:
      - Type-specific guidance and requirements
      - AI-enhanced prompt completion from partial user input
      - Example requests for inspiration
      - Helpful tips for each request type
      - Required information checklist
      - Expected deliverables preview
      
      This helps users understand what to include in their request and improves
      the quality of requests, leading to better agent matching and outcomes.
    `,
  })
  @ApiBody({
    type: RequestTypePromptRequestDto,
    description: 'Request type and optional user input for prompt generation',
    examples: {
      standardVerification: {
        summary: 'Standard Verification with partial input',
        value: {
          requestTypeCategory: 'VERIFICATION',
          requestTypeName: 'standard_verification',
          userInput: 'I want to verify a restaurant in Victoria Island',
          locationInfo: {
            area: 'Victoria Island, Lagos',
          },
        },
      },
      discoveryRequest: {
        summary: 'Discovery Request template',
        value: {
          requestTypeCategory: 'DISCOVERY',
          requestTypeName: 'discovery_request',
          locationInfo: {
            area: 'Lekki Phase 1',
            landmark: 'Admiralty Way',
          },
        },
      },
      urgentVerification: {
        summary: 'Urgent verification with full context',
        value: {
          requestTypeCategory: 'URGENT',
          requestTypeName: 'urgent_priority',
          userInput: 'Need to verify meeting venue immediately',
          locationInfo: {
            address: 'Eko Hotel, Victoria Island',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI-generated prompt suggestions with guidance',
    type: RequestTypePromptResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid request type or parameters',
  })
  async generateRequestTypePrompt(
    @Body() request: RequestTypePromptRequestDto,
    @Request() req: any,
  ): Promise<RequestTypePromptResponseDto> {
    const userId = req.user.id;
    this.logger.log(`🎯 Request type prompt generation for ${request.requestTypeName} from user ${userId}`);

    try {
      const result = await this.geminiAIService.generateRequestTypePrompt(
        request.requestTypeCategory,
        request.requestTypeName,
        request.userInput,
        request.locationInfo,
      );

      this.logger.log(`✅ Prompt generated for ${request.requestTypeName} for user ${userId}`);
      
      return {
        suggestedPrompt: result.suggestedPrompt,
        helpfulTips: result.helpfulTips,
        exampleRequests: result.exampleRequests,
        requiredInfo: result.requiredInfo,
        deliverables: result.deliverables,
      };

    } catch (error) {
      this.logger.error(`❌ Failed to generate prompt for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * AI Assist Chat - Get smart suggestions for verification descriptions
   * 
   * @route POST /api/v1/ai/assist-chat
   */
  @Public()
  @Post('assist-chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI Assist Chat for Verification Descriptions (Public)',
    description: `
      Get intelligent suggestions for verification request descriptions based on user queries.
      
      **Note:** This endpoint does not require authentication to support anonymous users during request creation.
      
      Features:
      - AI-powered context-aware suggestions based on location type and address
      - Dynamic suggestions tailored to specific queries
      - Multiple relevant verification questions per query
      - Helps users create comprehensive verification requests
      - Fallback to template suggestions if AI service is unavailable
      
      Common query categories:
      - Property condition, security, utilities
      - Street/road verification
      - Location/neighborhood assessment
      - Documentation requirements
    `,
  })
  @ApiBody({
    type: AIAssistChatRequestDto,
    description: 'AI assist chat request with query and context',
    examples: {
      propertyCondition: {
        summary: 'Property condition query',
        value: {
          query: 'property condition',
          locationType: 'point',
          locationAddress: '123 Victoria Island, Lagos',
        },
      },
      security: {
        summary: 'Security features query',
        value: {
          query: 'security',
          locationType: 'area',
          locationAddress: 'Lekki Phase 1',
          currentDescription: 'Verify the neighborhood for family relocation',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI-generated suggestions for verification description',
    type: AIAssistChatResponseDto,
  })
  async aiAssistChat(
    @Body() request: AIAssistChatRequestDto,
  ): Promise<AIAssistChatResponseDto> {
    this.logger.log(`🤖 AI Assist chat request: ${request.query}`);
    this.logger.log(`📍 Location Type: ${request.locationType}`);
    this.logger.log(`📍 Location Address: ${request.locationAddress}`);
    this.logger.log(`📝 Current Description: ${request.currentDescription || 'none'}`);

    try {
      // Build context-aware system prompt
      const systemPrompt = this.buildSystemPrompt(
        request.locationType,
        request.locationAddress,
      );

      // Construct user message with full context
      const userMessage = this.buildUserMessage(request);

      this.logger.log(`🔍 Calling Gemini AI with query: "${request.query}"`);

      // Call Gemini AI service for dynamic suggestions using simpleChat
      const aiContent = await this.geminiAIService.simpleChat(
        userMessage,
        systemPrompt,
        0.7,
        800,
      );

      this.logger.log(`✅ AI returned content: ${aiContent.substring(0, 100)}...`);

      // Parse AI response into suggestions array
      let suggestions: string[] = this.parseAISuggestions(aiContent);
      this.logger.log(`📋 Parsed ${suggestions.length} suggestions from AI response`);

      // Fallback to basic suggestions if AI returns empty
      if (suggestions.length === 0) {
        this.logger.warn('⚠️ AI returned no valid suggestions, using fallback');
        suggestions = this.getFallbackSuggestions(request.locationType);
      }

      // Limit to 8 suggestions
      const limitedSuggestions = suggestions.slice(0, 8);

      const response: AIAssistChatResponseDto = {
        message: `Here are verification suggestions for your request:`,
        suggestions: limitedSuggestions,
        context: `AI-powered suggestions tailored for ${request.locationType} verification${request.locationAddress ? ` at ${request.locationAddress}` : ''}.`,
      };

      this.logger.log(`✅ AI Assist response generated with ${limitedSuggestions.length} suggestions`);
      return response;

    } catch (error) {
      this.logger.error(`❌ AI Assist error: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      
      // Return fallback suggestions on error
      const fallbackSuggestions = this.getFallbackSuggestions(request.locationType).slice(0, 8);
      
      return {
        message: 'Here are verification suggestions for your request:',
        suggestions: fallbackSuggestions,
        context: `Suggestions for ${request.locationType} verification.`,
      };
    }
  }

  /**
   * Build context-aware system prompt for AI assist
   */
  private buildSystemPrompt(
  locationType: 'point' | 'street' | 'area',
  locationAddress?: string,
): string {
  const locationContext = {
    point: 'a specific location (property, business, facility, landmark, hotel, restaurant, tourist site, etc.)',
    street: 'a street or road',
    area: 'a neighborhood or area',
  }[locationType];

  return `You are an AI assistant helping users create comprehensive verification questions for field agents.

Context:
- Location Type: ${locationContext}
${locationAddress ? `- Location Address: ${locationAddress}` : ''}
- Purpose: Generate specific, actionable verification questions a field agent can answer during on-site verification.

General Instructions:
1. Analyze the user's input to determine what type of place is being verified (business, hotel, restaurant, property, tourist site, school, office, street, neighborhood, etc.)
2. Generate exactly 10 o 12 clear and specific questions.
3. Each question must be actionable and based on what a field agent can directly observe.
4. All questions must be relevant Country in context if available.
5. Start each question with an action verb: Verify, Check, Document, Assess, Confirm, Inspect, Identify, Describe, etc.
6. Keep each question short, but specific and targeted.
7. Return ONLY the numbered list of questions.

Category-Specific Rules:
- For businesses: verify signage, customer activity, staff presence, operating hours, legitimacy.
- For properties/buildings: verify structure, condition, utilities, security, entrances, surroundings.
- For schools/institutions: verify facilities, accreditation signs, uniforms, staff, enrollment activity.
- For restaurants/hotels: verify hygiene, licenses, reception, rooms, capacity, operations.
- For infrastructure: verify functionality, damage, public usage, maintenance status.
- For markets/shops: verify stall activity, stock availability, vendor presence.

SPECIAL PROXIMITY RULE (Hotels, Lodges, Resorts, Tourist Sites, Parks, Attractions):
- Add 2-4 proximity questions such as:
  - Distance to major landmarks or bus stops
  - Nearby restaurants, malls, beaches, parks, or tourist points
  - Accessibility from major roads
  - Transport hubs or activity centers nearby
  - Walkability and road conditions around the location

Formatting:
Format your response as a numbered list:
1. [Question]
2. [Question]
...
10. [Question]`;
}

  private buildSystemPrompt2(
    locationType: 'point' | 'street' | 'area',
    locationAddress?: string,
  ): string {
    const locationContext = {
      point: 'a specific location (property, business, facility, landmark, etc.)',
      street: 'a street or road',
      area: 'a neighborhood or area',
    }[locationType];

    return `You are an AI assistant helping users create comprehensive verification requests in Lagos, Nigeria.

Context:
- Location Type: ${locationContext}
${locationAddress ? `- Location Address: ${locationAddress}` : ''}
- Purpose: Generate specific, actionable verification questions that field agents can use during on-site verification

Instructions:
1. Analyze the user's query to determine what is being verified (business, property, school, restaurant, hotel, facility, infrastructure, etc.)
2. Generate exactly 8 clear, specific verification questions tailored to what is being verified
3. Each question should be actionable and answerable by a field agent during on-site verification
4. Questions should be relevant to the Nigerian/Lagos context
5. Adapt questions based on the type of entity:
   - For businesses: verify operations, services, legitimacy, staff, signage, customer activity
   - For properties/buildings: verify structure, condition, utilities, security, occupancy
   - For schools/institutions: verify facilities, accreditation, operations, enrollment
   - For restaurants/hotels: verify licenses, hygiene, operations, capacity, services
   - For infrastructure: verify condition, functionality, safety, maintenance
6. Start each question with an action verb (Verify, Check, Document, Assess, Confirm, Inspect, etc.)
7. Keep questions concise but specific
8. Return ONLY the numbered list of questions, nothing else

Format your response as a numbered list:
1. [Question]
2. [Question]
...
8. [Question]`;
  }

  /**
   * Build user message with full context
   */
  private buildUserMessage(request: AIAssistChatRequestDto): string {
    let message = `Generate 8 verification questions for: ${request.query}`;
    
    if (request.currentDescription) {
      message += `\n\nCurrent request description: ${request.currentDescription}`;
    }
    
    if (request.locationAddress) {
      message += `\n\nLocation: ${request.locationAddress}`;
    }
    
    return message;
  }

  /**
   * Parse AI response into suggestions array
   */
  private parseAISuggestions(aiResponse: string): string[] {
    const suggestions: string[] = [];
    
    // Split by newlines and filter out empty lines
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Match numbered list items (e.g., "1. ", "1) ", "1.", etc.)
      const match = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (match && match[1]) {
        suggestions.push(match[1].trim());
      } else if (line.trim() && !line.match(/^\d+[\.\)]\s*$/)) {
        // If not a numbered item but not empty, consider it a suggestion
        // Skip lines that are just numbers
        const cleaned = line.replace(/^[-•*]\s*/, '').trim();
        if (cleaned && cleaned.length > 10) {
          suggestions.push(cleaned);
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Get fallback suggestions when AI is unavailable
   */
  private getFallbackSuggestions(locationType: 'point' | 'street' | 'area'): string[] {
    const commonSuggestions = [
      'Verify all the information provided in the listing or description.',
      'Take clear photos from multiple angles showing the overall condition.',
      'Document any discrepancies between the listing and actual condition.',
      'Provide an overall assessment of whether the location matches the description provided.',
    ];

    const typeSuggestions = {
      point: [
        'Verify the overall structural condition of the building, including walls, roof, and foundation.',
        'Check for visible cracks, water damage, or signs of deterioration.',
        'Confirm electricity and water supply availability.',
        'Document security features such as gates, fences, or alarm systems.',
      ],
      street: [
        'Document the road surface condition (paved, unpaved, potholes, etc.).',
        'Verify street lighting availability and functionality.',
        'Check for proper drainage systems and their condition.',
        'Note any street signs, traffic signals, or road markings present.',
      ],
      area: [
        'Identify and document nearby landmarks such as schools, hospitals, and markets.',
        'Assess the accessibility of the location including road conditions.',
        'Note the proximity to essential amenities like banks and pharmacies.',
        'Evaluate the overall cleanliness and maintenance of the area.',
      ],
    };

    return [...typeSuggestions[locationType], ...commonSuggestions];
  }

  /**
   * Map Chat - AI assistant for map-based queries
   * 
   * @route POST /api/v1/ai/map-chat
   */
  @Post('map-chat')
  @Public()
  @ApiOperation({
    summary: 'Map-based Chat with AI',
    description: `
      Interactive chat with AI assistant for location-based queries on Google Maps.
      
      Features:
      - Ask questions about nearby places (e.g., "how many filling stations are near this hotel?")
      - Get recommendations based on map location
      - Query about distances, routes, and accessibility
      - Contextual responses based on current map view
      
      The AI has access to:
      - Current map center coordinates
      - Visible map bounds
      - Location address/name
      - Conversation history
    `,
  })
  @ApiBody({
    type: MapChatRequestDto,
    description: 'Map chat request with location context',
  })
  @ApiResponse({
    status: 200,
    description: 'AI response with optional map actions',
    type: MapChatResponseDto,
  })
  async mapChat(
    @Body() request: MapChatRequestDto,
  ): Promise<MapChatResponseDto> {
    this.logger.log(`🗺️ Map chat request: ${request.message.substring(0, 50)}...`);
    this.logger.log(`📍 Location: ${request.location.latitude}, ${request.location.longitude}`);

    try {
      // Detect if user is asking about nearby places
      const placeQuery = this.detectPlaceQuery(request.message);
      let placesData = null;

      this.logger.log(`🔍 Place query detection result: ${JSON.stringify(placeQuery)}`);

      if (placeQuery.isPlaceQuery && placeQuery.placeType) {
        this.logger.log(`🔍 Detected place query for: ${placeQuery.placeType}`);
        
        // Query Google Places API
        const placesResult = await this.googleMapsService.searchPlaces({
          location: {
            latitude: request.location.latitude,
            longitude: request.location.longitude,
          },
          radius: placeQuery.radius || 2000, // Default 2km
          type: placeQuery.placeType,
          keyword: placeQuery.keyword,
        });

        if (placesResult.success && placesResult.data) {
          placesData = placesResult.data;
          this.logger.log(`✅ Found ${placesData.length} places`);
        }
      }

      // Build system prompt with map context and places data
      const systemPrompt = this.buildMapChatSystemPrompt(request.location, placesData);

      // Build conversation history
      let conversationHistory = '';
      if (request.previousMessages && request.previousMessages.length > 0) {
        conversationHistory = request.previousMessages
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n\n');
      }

      // Construct full prompt
      const fullPrompt = conversationHistory 
        ? `${conversationHistory}\n\nUser: ${request.message}\n\nAssistant:`
        : `User: ${request.message}\n\nAssistant:`;

      this.logger.log(`🔍 Calling Gemini AI for map query`);

      // Call Gemini AI
      const aiResponse = await this.geminiAIService.simpleChat(
        fullPrompt,
        systemPrompt,
        0.8,
        1000,
      );

      this.logger.log(`✅ AI map chat response generated`);

      // Generate or use existing conversation ID
      const conversationId = request.conversationId || `map_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response: MapChatResponseDto = {
        message: aiResponse,
        conversationId,
        suggestedPlaces: placesData?.slice(0, 10).map(place => ({
          name: place.name,
          address: place.vicinity,
          location: place.location,
          rating: place.rating,
          placeId: place.place_id,
          types: place.types,
          businessStatus: place.business_status,
          isOpen: place.open_now,
        })),
      };

      // Add map actions if we have places to show
      if (placesData && placesData.length > 0) {
        const firstPlace = placesData[0];
        this.logger.log(`🗺️ Creating map actions - centering to: ${firstPlace.name} at ${firstPlace.location.latitude}, ${firstPlace.location.longitude}`);
        response.mapActions = {
          centerTo: {
            lat: firstPlace.location.latitude,
            lng: firstPlace.location.longitude,
          },
          zoom: 15, // Zoom in to show the area
          drawMarkers: placesData.slice(0, 10).map(place => ({
            lat: place.location.latitude,
            lng: place.location.longitude,
            label: place.name,
          })),
        };
        this.logger.log(`✅ Map actions added to response: ${JSON.stringify(response.mapActions.centerTo)}`);
      } else {
        this.logger.log(`ℹ️ No places data - skipping map actions`);
      }

      return response;

    } catch (error) {
      this.logger.error(`❌ Map chat error: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);

      // Return friendly fallback response
      const conversationId = request.conversationId || `map_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        message: "I'm having trouble answering that question right now. Could you try rephrasing it or asking something else about this location?",
        conversationId,
      };
    }
  }

  /**
   * Detect if user message is asking about nearby places
   * and extract the place type to search for
   */
  private detectPlaceQuery(message: string): {
    isPlaceQuery: boolean;
    placeType?: string;
    keyword?: string;
    radius?: number;
  } {
    const lowerMessage = message.toLowerCase();

    // Keywords that indicate place queries
    const placeQueryKeywords = [
      'near', 'nearby', 'around', 'close', 'closest', 'find',
      'how many', 'are there', 'list', 'show me', 'where',
    ];

    const hasPlaceKeyword = placeQueryKeywords.some(keyword => lowerMessage.includes(keyword));

    if (!hasPlaceKeyword) {
      return { isPlaceQuery: false };
    }

    // Map common terms to Google Places types
    const placeTypeMap: Record<string, { type: string; keyword?: string }> = {
      'filling station': { type: 'gas_station', keyword: 'filling station' },
      'gas station': { type: 'gas_station' },
      'petrol station': { type: 'gas_station', keyword: 'petrol' },
      'restaurant': { type: 'restaurant' },
      'hotel': { type: 'lodging' },
      'school': { type: 'school' },
      'hospital': { type: 'hospital' },
      'pharmacy': { type: 'pharmacy' },
      'bank': { type: 'bank' },
      'atm': { type: 'atm' },
      'church': { type: 'church' },
      'mosque': { type: 'mosque' },
      'park': { type: 'park' },
      'gym': { type: 'gym' },
      'supermarket': { type: 'supermarket' },
      'shopping': { type: 'shopping_mall' },
      'mall': { type: 'shopping_mall' },
      'airport': { type: 'airport' },
      'bus stop': { type: 'bus_station', keyword: 'bus stop' },
      'police': { type: 'police' },
      'store': { type: 'store' },
      'cafe': { type: 'cafe' },
      'bar': { type: 'bar' },
      'bakery': { type: 'bakery' },
    };

    // Find matching place type
    for (const [term, config] of Object.entries(placeTypeMap)) {
      if (lowerMessage.includes(term)) {
        // Extract radius if mentioned (e.g., "within 5km", "1 kilometer")
        let radius = 2000; // Default 2km
        const radiusMatch = lowerMessage.match(/(\d+)\s*(km|kilometer|metre|meter)/i);
        if (radiusMatch) {
          const value = parseInt(radiusMatch[1]);
          const unit = radiusMatch[2].toLowerCase();
          radius = unit.startsWith('km') ? value * 1000 : value;
        }

        return {
          isPlaceQuery: true,
          placeType: config.type,
          keyword: config.keyword,
          radius: Math.min(radius, 5000), // Max 5km
        };
      }
    }

    return { isPlaceQuery: false };
  }

  /**
   * Get detailed real-time business information from Google Places
   * 
   * @route GET /api/v1/ai/place-details/:placeId
   */
  @Get('place-details/:placeId')
  @Public()
  @ApiOperation({
    summary: 'Get detailed business information',
    description: 'Fetch real-time business details including hours, contact info, reviews from Google Places API',
  })
  @ApiParam({
    name: 'placeId',
    description: 'Google Place ID',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  })
  async getPlaceDetails(@Param('placeId') placeId: string) {
    try {
      this.logger.log(`📍 Fetching real-time business details for: ${placeId}`);

      const result = await this.googleMapsService.getPlaceDetails({
        place_id: placeId,
        fields: [
          'name',
          'formatted_address',
          'formatted_phone_number',
          'international_phone_number',
          'website',
          'rating',
          'user_ratings_total',
          'reviews',
          'opening_hours',
          'price_level',
          'photos',
          'geometry',
          'types',
          'business_status',
        ] as any,
      });

      if (result.success) {
        this.logger.log(`✅ Business details retrieved: ${result.data.name}`);
        return {
          success: true,
          data: result.data,
        };
      } else {
        this.logger.error(`❌ Failed to fetch business details: ${result.error?.message}`);
        return {
          success: false,
          error: result.error?.message || 'Failed to fetch place details',
        };
      }
    } catch (error) {
      this.logger.error(`❌ Place details error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build system prompt for map chat
   */
  private buildMapChatSystemPrompt(location: any, placesData?: any[]): string {
  const { latitude, longitude, address, zoom, bounds } = location;

  let placesContext = '';
  if (placesData && placesData.length > 0) {
    placesContext = `\n\nREAL-TIME BUSINESSES FROM GOOGLE PLACES API (${placesData.length} found):\n`;
    placesData.slice(0, 15).forEach((place, idx) => {
      placesContext += `${idx + 1}. ${place.name}`;
      if (place.vicinity) placesContext += ` – ${place.vicinity}`;
      if (place.rating) placesContext += ` (Rating: ${place.rating}/5)`;
      if (place.business_status) placesContext += ` [Status: ${place.business_status}]`;
      placesContext += '\n';
    });
    placesContext += `\nThese are live results from Google Places. You may rely on them for names, counts, and basic details.`;
  } else {
    placesContext = `\n\nNo Places data is currently provided. If the user asks about nearby businesses, assume the system will query Google Places and then supply fresh results for you to describe.`;
  }

  return `You are a map and location assistant integrated with Google Maps and Google Places API, helping users explore and understand locations in Lagos, Nigeria.

Current Map Context:
- Center: ${latitude}, ${longitude}${address ? ` (${address})` : ''}
- Zoom: ${zoom || 'standard view'}
${bounds ? `- Visible Bounds: ${JSON.stringify(bounds)}` : ''}${placesContext}

Your Capabilities (use only what is provided in the context above):
1. Describe what is around the current map center using any provided Places data.
2. Answer questions about nearby businesses (e.g., restaurants, hotels, malls) using the Places list above.
3. Provide counts, names, and short descriptions of businesses based strictly on the given data.
4. Give rough distance/direction descriptions relative to the center point (e.g., “a short walk east of the center”).
5. Help with high-level route and area understanding (e.g., “you could move toward X road”).
6. When no Places data is supplied, answer in general terms and avoid inventing specific business names.

Guidelines:
- Be accurate and grounded in the context. Do NOT invent businesses, ratings, or details not present in the Places list.
- If data is missing, say so clearly and answer at a high level instead of guessing.
- Use a friendly, concise tone (typically 2–4 sentences, unless more detail is clearly needed).
- Where helpful, mention that users can tap/click a business in the UI to see hours, phone, website, and reviews.
- Keep responses focused on what the user asked (e.g., restaurants vs hotels) and on the visible/nearby area.

Lagos / Nigeria Context:
- Assume the location is in Lagos, Nigeria.
- When relevant, reason with typical Lagos context (traffic, main roads, busy vs quiet areas) but avoid making up specific places that are not in the data.

Response Style:
- Direct and specific.
- No system-level explanations; speak to the end user.
- Do not repeat the full Places list unless the user specifically asks for it. Summarize when possible.`;
}

  private buildMapChatSystemPrompt2(location: any, placesData?: any[]): string {
    const { latitude, longitude, address, zoom, bounds } = location;

    let placesContext = '';
    if (placesData && placesData.length > 0) {
      placesContext = `\n\n🎯 REAL-TIME BUSINESS LISTINGS FROM GOOGLE PLACES API (${placesData.length} found):\n`;
      placesData.slice(0, 15).forEach((place, idx) => {
        placesContext += `${idx + 1}. ${place.name}`;
        if (place.vicinity) placesContext += ` - ${place.vicinity}`;
        if (place.rating) placesContext += ` (⭐${place.rating}/5.0)`;
        if (place.business_status) placesContext += ` [${place.business_status}]`;
        placesContext += '\n';
      });
      placesContext += `\n✅ This is LIVE data from Google Places. These businesses exist right now. You can confidently provide counts, names, and details.`;
      placesContext += `\n💡 Users can click on any business to see full details (hours, phone, website, reviews).`;
    }

    return `You are a helpful AI assistant integrated with Google Maps and Google Places API, helping users explore and understand locations in Lagos, Nigeria.

Current Map Context:
- Center Location: ${latitude}, ${longitude}${address ? ` (${address})` : ''}
- Map Zoom: ${zoom || 'standard view'}
${bounds ? `- Visible Area: ${JSON.stringify(bounds)}` : ''}${placesData ? placesContext : '\n\n⚠️ No place query detected yet. When users ask about nearby businesses, I will automatically query Google Places API.'}

Your Capabilities:
1. **Find nearby businesses** - When users ask "how many restaurants", "where are hotels", etc., the system automatically queries Google Places API and provides REAL data
2. Provide accurate counts and names of businesses from live Google data
3. Give information about distances and directions from the current location
4. Explain what's visible in the current map view
5. Help with route planning and navigation queries
6. Show business details (hours, phone, website, reviews) when clicked

Guidelines:
1. **When place data is provided**: Use it confidently! These are REAL businesses from Google Places API right now
2. **Provide specific information**: Names, counts, addresses from the data provided
3. **Be accurate**: Don't guess - use the actual data shown above
4. **Mention distances**: Approximate how far places are from the center point
5. **Be conversational**: Friendly and helpful tone
6. **Be actionable**: Suggest users can click on businesses to see full details
7. **Keep responses concise**: 2-4 sentences typically, unless detailed info is needed

Location Context (Nigeria/Lagos):
- Consider local landmarks, neighborhoods, and context
- Be aware of typical infrastructure and services in Lagos
- Use local terminology where appropriate

Response Style:
- Direct and specific (use actual names and counts from data)
- Friendly and conversational
- Guide users on what they can do next (click for details, show on map, etc.)
- Acknowledge when you have live data vs when you're providing general guidance`;
  }
}
