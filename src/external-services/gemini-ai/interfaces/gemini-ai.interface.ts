import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * Gemini AI Service Interfaces
 * 
 * This file defines all interfaces and types used by the Gemini AI service
 * for chat assistance, content generation, and intelligent analysis.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

/**
 * Message role in a conversation
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * Message interface for chat conversations
 */
export interface IChatMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

/**
 * Chat conversation interface
 */
export interface IChatConversation {
  id: string;
  userId: string;
  title?: string;
  messages: IChatMessage[];
  context?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * AI response interface
 */
export interface IAIResponse {
  content: string;
  confidence?: number;
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: {
    model: string;
    temperature: number;
    maxTokens: number;
    responseTime: number;
  };
}

/**
 * Content generation types
 */
export enum ContentType {
  TEXT = 'text',
  EMAIL = 'email',
  REPORT = 'report',
  SUMMARY = 'summary',
  ANALYSIS = 'analysis',
  RECOMMENDATION = 'recommendation',
  TRANSLATION = 'translation'
}

/**
 * Content generation request
 */
export interface IContentGenerationRequest {
  type: ContentType;
  prompt: string;
  context?: string;
  parameters?: {
    tone?: 'formal' | 'casual' | 'professional' | 'friendly';
    length?: 'short' | 'medium' | 'long';
    language?: string;
    targetAudience?: string;
    customInstructions?: string;
  };
  templateId?: string;
}

/**
 * Analysis types
 */
export enum AnalysisType {
  SENTIMENT = 'sentiment',
  ENTITY_EXTRACTION = 'entity_extraction',
  KEY_PHRASES = 'key_phrases',
  CLASSIFICATION = 'classification',
  RISK_ASSESSMENT = 'risk_assessment',
  QUALITY_SCORE = 'quality_score'
}

/**
 * Text analysis request
 */
export interface ITextAnalysisRequest {
  text: string;
  analysisTypes: AnalysisType[];
  context?: string;
  parameters?: Record<string, any>;
}

/**
 * Sentiment analysis result
 */
export interface ISentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  score: number; // -1 to 1
}

/**
 * Entity extraction result
 */
export interface IEntityResult {
  text: string;
  type: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Text analysis response
 */
export interface ITextAnalysisResponse {
  sentiment?: ISentimentResult;
  entities?: IEntityResult[];
  keyPhrases?: string[];
  classification?: {
    category: string;
    confidence: number;
  };
  riskAssessment?: {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    confidence: number;
  };
  qualityScore?: {
    score: number; // 0-100
    factors: Record<string, number>;
  };
}

/**
 * AI model configuration
 */
export interface IAIModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
}

/**
 * Gemini AI service configuration
 */
export interface IGeminiConfig {
  apiKey: string;
  defaultModel: string;
  defaultTemperature: number;
  maxTokens: number;
  timeout: number;
  retryConfig: {
    retries: number;
    backoffDelay: number;
  };
  safetySettings?: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];
}

/**
 * Chat session configuration
 */
export interface IChatSessionConfig {
  systemPrompt?: string;
  context?: string;
  maxMessages?: number;
  retainContext?: boolean;
  modelConfig?: Partial<IAIModelConfig>;
}

/**
 * Function calling interface (for advanced AI interactions)
 */
export interface IFunctionCall {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * AI assistant capabilities
 */
export enum AssistantCapability {
  CHAT = 'chat',
  CONTENT_GENERATION = 'content_generation',
  TEXT_ANALYSIS = 'text_analysis',
  CODE_REVIEW = 'code_review',
  TRANSLATION = 'translation',
  SUMMARIZATION = 'summarization',
  QUESTION_ANSWERING = 'question_answering'
}

/**
 * Service response wrapper for AI operations
 */
export interface IAIServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    executionTime: number;
    model: string;
    tokensUsed?: number;
  };
}

/**
 * Usage tracking for AI services
 */
export interface IUsageMetrics {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  errorRate: number;
  costEstimate: number;
  requestsByType: Record<string, number>;
}

/**
 * Content moderation result
 */
export interface IModerationResult {
  isSafe: boolean;
  categories: {
    category: string;
    probability: number;
    flagged: boolean;
  }[];
  overallScore: number;
}

/**
 * AI service health status
 */
export interface IServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  apiKeyValid: boolean;
  quotaRemaining?: number;
}