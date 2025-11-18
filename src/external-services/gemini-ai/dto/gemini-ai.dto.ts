import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsBoolean, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageRole, ContentType, AnalysisType, AssistantCapability } from '../interfaces/gemini-ai.interface';

/**
 * Chat message DTO
 */
export class ChatMessageDto {
  @ApiProperty({
    description: 'Message role',
    enum: MessageRole,
    example: MessageRole.USER,
  })
  @IsEnum(MessageRole)
  role: MessageRole;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, can you help me with verification process?',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { timestamp: '2024-01-01T00:00:00Z' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Chat request DTO
 */
export class ChatRequestDto {
  @ApiProperty({
    description: 'User message',
    example: 'Can you explain how the verification process works?',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Conversation ID for context',
    example: 'conv_123456789',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'System context for the conversation',
    example: 'You are a helpful assistant for a verification platform.',
  })
  @IsOptional()
  @IsString()
  systemContext?: string;

  @ApiPropertyOptional({
    description: 'Model temperature (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens for response',
    example: 500,
    minimum: 1,
    maximum: 4000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;
}

/**
 * Content generation request DTO
 */
export class ContentGenerationRequestDto {
  @ApiProperty({
    description: 'Type of content to generate',
    enum: ContentType,
    example: ContentType.EMAIL,
  })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiProperty({
    description: 'Prompt for content generation',
    example: 'Write a professional email to a client about verification completion',
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Additional context',
    example: 'Client name: John Doe, Verification type: Identity verification',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Content parameters',
  })
  @IsOptional()
  parameters?: {
    tone?: 'formal' | 'casual' | 'professional' | 'friendly';
    length?: 'short' | 'medium' | 'long';
    language?: string;
    targetAudience?: string;
    customInstructions?: string;
  };

  @ApiPropertyOptional({
    description: 'Template ID for predefined formats',
    example: 'email_completion_template',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}

/**
 * Text analysis request DTO
 */
export class TextAnalysisRequestDto {
  @ApiProperty({
    description: 'Text to analyze',
    example: 'The verification process was completed successfully and the client was very satisfied.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Types of analysis to perform',
    enum: AnalysisType,
    isArray: true,
    example: [AnalysisType.SENTIMENT, AnalysisType.ENTITY_EXTRACTION],
  })
  @IsArray()
  @IsEnum(AnalysisType, { each: true })
  analysisTypes: AnalysisType[];

  @ApiPropertyOptional({
    description: 'Context for analysis',
    example: 'Customer feedback about verification service',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Additional parameters for analysis',
  })
  @IsOptional()
  parameters?: Record<string, any>;
}

/**
 * Create conversation DTO
 */
export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Verification Support Chat',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Initial context for the conversation',
    example: 'User needs help with document verification',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'System prompt for the AI assistant',
    example: 'You are a helpful customer support assistant for a verification platform.',
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

/**
 * Update conversation DTO
 */
export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'Updated conversation title',
    example: 'Identity Verification Support',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated context',
    example: 'User completed identity verification successfully',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Whether the conversation is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Batch content generation DTO
 */
export class BatchContentGenerationDto {
  @ApiProperty({
    description: 'Array of content generation requests',
    type: [ContentGenerationRequestDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentGenerationRequestDto)
  requests: ContentGenerationRequestDto[];

  @ApiPropertyOptional({
    description: 'Maximum concurrent requests',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxConcurrent?: number;
}

/**
 * Model configuration DTO
 */
export class ModelConfigDto {
  @ApiPropertyOptional({
    description: 'AI model to use',
    example: 'gemini-pro',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Model temperature',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens',
    example: 1000,
    minimum: 1,
    maximum: 4000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Top-p parameter',
    example: 0.9,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({
    description: 'Top-k parameter',
    example: 40,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  topK?: number;
}

/**
 * Request type prompt assistance DTO
 */
export class RequestTypePromptRequestDto {
  @ApiProperty({
    description: 'Request type category',
    example: 'VERIFICATION',
  })
  @IsString()
  requestTypeCategory: string;

  @ApiProperty({
    description: 'Request type name',
    example: 'standard_verification',
  })
  @IsString()
  requestTypeName: string;

  @ApiPropertyOptional({
    description: 'User partial input or context',
    example: 'I want to verify a restaurant',
  })
  @IsOptional()
  @IsString()
  userInput?: string;

  @ApiPropertyOptional({
    description: 'Location information',
    example: { area: 'Victoria Island, Lagos' },
  })
  @IsOptional()
  locationInfo?: {
    area?: string;
    address?: string;
    landmark?: string;
  };
}

/**
 * Request type prompt response DTO
 */
export class RequestTypePromptResponseDto {
  @ApiProperty({
    description: 'Suggested prompt for the user',
    example: 'Verify ABC Restaurant at 123 Main Street, Victoria Island. Please confirm if it is open for business and check the cleanliness standards.',
  })
  suggestedPrompt: string;

  @ApiProperty({
    description: 'Helpful tips for this request type',
    type: [String],
    example: [
      'Include the exact address or business name',
      'Mention specific aspects you want verified',
      'Indicate any time constraints',
    ],
  })
  helpfulTips: string[];

  @ApiProperty({
    description: 'Example requests for inspiration',
    type: [String],
    example: [
      'Verify Golden Tulip Hotel on Victoria Island',
      'Check if ABC Company exists at this address',
    ],
  })
  exampleRequests: string[];

  @ApiProperty({
    description: 'Required information for this request type',
    type: [String],
    example: ['Exact address or business name', 'Specific verification requirements'],
  })
  requiredInfo: string[];

  @ApiProperty({
    description: 'Expected deliverables',
    type: [String],
    example: ['Minimum 3 photos', 'GPS coordinates', 'Written confirmation'],
  })
  deliverables: string[];
}

/**
 * Response DTOs
 */

/**
 * Chat response DTO
 */
export class ChatResponseDto {
  @ApiProperty({
    description: 'AI assistant response',
    example: 'I can help you with the verification process. Here are the steps...',
  })
  content: string;

  @ApiProperty({
    description: 'Conversation ID',
    example: 'conv_123456789',
  })
  conversationId: string;

  @ApiProperty({
    description: 'Response confidence score',
    example: 0.95,
  })
  confidence: number;

  @ApiProperty({
    description: 'Tokens used in this interaction',
    example: { prompt: 50, completion: 150, total: 200 },
  })
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  @ApiProperty({
    description: 'Response metadata',
  })
  metadata: {
    model: string;
    temperature: number;
    responseTime: number;
  };
}

/**
 * Content generation response DTO
 */
export class ContentGenerationResponseDto {
  @ApiProperty({
    description: 'Generated content',
    example: 'Dear John Doe,\n\nWe are pleased to inform you that your identity verification has been completed successfully...',
  })
  content: string;

  @ApiProperty({
    description: 'Content type',
    enum: ContentType,
  })
  type: ContentType;

  @ApiProperty({
    description: 'Generation quality score',
    example: 0.92,
  })
  qualityScore: number;

  @ApiProperty({
    description: 'Tokens used for generation',
  })
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Text analysis response DTO
 */
export class TextAnalysisResponseDto {
  @ApiPropertyOptional({
    description: 'Sentiment analysis result',
  })
  sentiment?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    score: number;
  };

  @ApiPropertyOptional({
    description: 'Extracted entities',
    type: 'array',
  })
  entities?: Array<{
    text: string;
    type: string;
    confidence: number;
    startOffset: number;
    endOffset: number;
  }>;

  @ApiPropertyOptional({
    description: 'Key phrases extracted from text',
    type: [String],
  })
  keyPhrases?: string[];

  @ApiPropertyOptional({
    description: 'Text classification result',
  })
  classification?: {
    category: string;
    confidence: number;
  };

  @ApiPropertyOptional({
    description: 'Risk assessment result',
  })
  riskAssessment?: {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    confidence: number;
  };

  @ApiPropertyOptional({
    description: 'Quality score assessment',
  })
  qualityScore?: {
    score: number;
    factors: Record<string, number>;
  };
}

/**
 * Conversation response DTO
 */
export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 'conv_123456789',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user_987654321',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Verification Support Chat',
  })
  title?: string;

  @ApiProperty({
    description: 'Messages in the conversation',
    type: [ChatMessageDto],
  })
  messages: ChatMessageDto[];

  @ApiPropertyOptional({
    description: 'Conversation context',
    example: 'User needs help with document verification',
  })
  context?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether the conversation is active',
    example: true,
  })
  isActive: boolean;
}