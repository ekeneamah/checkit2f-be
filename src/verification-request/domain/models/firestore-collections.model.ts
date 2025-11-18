/**
 * Agent Failure Firestore Model (FLAT SCHEMA)
 * Collection: agent_failures
 */
export interface AgentFailureModel {
  id: string;
  agentId: string;
  agentName: string;
  requestId: string;
  requestNumber: string;
  requestTypeId: string;
  requestTypeName: string;

  failureType: 'TIMEOUT' | 'CANCELLATION' | 'NO_SHOW' | 'POOR_QUALITY' | 'CUSTOMER_COMPLAINT';
  failureReason: string;
  failedAt: Date;

  // Dispute
  disputed: boolean;
  disputeReason: string | null;
  disputeStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  disputeResolvedAt: Date | null;

  // Reference
  suspensionId: string | null;

  // Metadata
  createdAt: Date;
}

/**
 * Agent Suspension Firestore Model (FLAT SCHEMA)
 * Collection: agent_suspensions
 */
export interface AgentSuspensionModel {
  id: string;
  agentId: string;
  agentName: string;

  suspensionReason: string;
  failureCount: number;
  failureIds: string; // JSON array of failure IDs

  suspendedAt: Date;
  suspendedUntil: Date;

  status: 'ACTIVE' | 'EXPIRED' | 'MANUALLY_LIFTED';

  // Manual override
  liftedBy: string | null;
  liftedAt: Date | null;
  liftReason: string | null;

  // Reinstatement
  reinstatedAt: Date | null;
  failureCountReset: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration Firestore Model (FLAT SCHEMA)
 * Collection: integrations
 */
export interface IntegrationModel {
  id: string;
  platform: 'WHATSAPP' | 'TELEGRAM' | 'SLACK' | 'FACEBOOK';
  name: string;

  // Credentials (encrypted)
  credentialsApiKey: string | null;
  credentialsBotToken: string | null;
  credentialsChannelId: string | null;
  credentialsWebhookUrl: string | null;
  credentialsAccessToken: string | null;

  // Config
  configEnabled: boolean;
  configPriority: number;
  configMessageTemplate: string;
  configIncludeDeepLink: boolean;
  configRateLimitPerMinute: number;

  // Request Type Filters
  allowedRequestTypes: string; // JSON array (empty = all types)

  // Health
  healthLastSuccessfulBroadcast: Date | null;
  healthLastFailedBroadcast: Date | null;
  healthConsecutiveFailures: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Global Config Firestore Model (FLAT SCHEMA - Singleton)
 * Collection: global_config
 * Document ID: 'config'
 */
export interface GlobalConfigModel {
  id: 'config'; // Singleton

  // Blacklist Rules
  maxFailuresBeforeSuspension: number; // 5
  suspensionPeriodDays: number; // 30
  failureTrackingWindowDays: number; // 30

  // Platform Settings
  defaultCurrency: string; // 'NGN'
  platformFeePercentage: number; // 10
  taxPercentage: number; // 0

  // Request Defaults
  defaultRequestTypeId: string;
  maxActiveRequestsPerCustomer: number; // 10
  maxActiveRequestsPerAgent: number; // 5

  // Agent Settings
  minAgentRatingForPremium: number; // 4.0
  agentBackgroundLocationInterval: number; // 5 minutes

  // Notification Settings
  notificationRetryAttempts: number; // 3
  notificationRetryDelaySeconds: number; // 60

  // Deep Link Settings
  deepLinkScheme: string; // 'checkit24://'
  webFallbackUrl: string; // 'https://app.checkit24.com'

  // Metadata
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Helpers for JSON field serialization
 */
export class AgentSuspensionModelHelper {
  static toFirestore(suspension: any): AgentSuspensionModel {
    return {
      ...suspension,
      failureIds: JSON.stringify(suspension.failureIds || []),
    };
  }

  static fromFirestore(doc: AgentSuspensionModel): any {
    return {
      ...doc,
      failureIds: JSON.parse(doc.failureIds),
    };
  }
}

export class IntegrationModelHelper {
  static toFirestore(integration: any): IntegrationModel {
    return {
      ...integration,
      allowedRequestTypes: JSON.stringify(integration.allowedRequestTypes || []),
      // Flatten credentials
      credentialsApiKey: integration.credentials?.apiKey || null,
      credentialsBotToken: integration.credentials?.botToken || null,
      credentialsChannelId: integration.credentials?.channelId || null,
      credentialsWebhookUrl: integration.credentials?.webhookUrl || null,
      credentialsAccessToken: integration.credentials?.accessToken || null,
      // Flatten config
      configEnabled: integration.config?.enabled || false,
      configPriority: integration.config?.priority || 0,
      configMessageTemplate: integration.config?.messageTemplate || '',
      configIncludeDeepLink: integration.config?.includeDeepLink || true,
      configRateLimitPerMinute: integration.config?.rateLimitPerMinute || 60,
      // Flatten health
      healthLastSuccessfulBroadcast: integration.health?.lastSuccessfulBroadcast || null,
      healthLastFailedBroadcast: integration.health?.lastFailedBroadcast || null,
      healthConsecutiveFailures: integration.health?.consecutiveFailures || 0,
      healthStatus: integration.health?.status || 'HEALTHY',
    };
  }

  static fromFirestore(doc: IntegrationModel): any {
    return {
      ...doc,
      allowedRequestTypes: JSON.parse(doc.allowedRequestTypes),
      credentials: {
        apiKey: doc.credentialsApiKey,
        botToken: doc.credentialsBotToken,
        channelId: doc.credentialsChannelId,
        webhookUrl: doc.credentialsWebhookUrl,
        accessToken: doc.credentialsAccessToken,
      },
      config: {
        enabled: doc.configEnabled,
        priority: doc.configPriority,
        messageTemplate: doc.configMessageTemplate,
        includeDeepLink: doc.configIncludeDeepLink,
        rateLimitPerMinute: doc.configRateLimitPerMinute,
      },
      health: {
        lastSuccessfulBroadcast: doc.healthLastSuccessfulBroadcast,
        lastFailedBroadcast: doc.healthLastFailedBroadcast,
        consecutiveFailures: doc.healthConsecutiveFailures,
        status: doc.healthStatus,
      },
    };
  }
}
