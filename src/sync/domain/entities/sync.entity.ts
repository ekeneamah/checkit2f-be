/**
 * Offline Sync Domain Entities
 * 
 * Entities for managing offline operations, sync queues, and conflict resolution.
 * Critical for field agents with unreliable connectivity.
 */

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';
export type OperationType = 'create' | 'update' | 'delete' | 'upload';
export type ConflictResolution = 'keep_local' | 'keep_server' | 'merge' | 'manual';

export interface SyncQueueItem {
  id: string;
  localId?: string; // Client-generated ID for tracking
  userId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  localTimestamp: Date;
  serverTimestamp?: Date;
  status: SyncStatus;
  retryCount: number;
  maxRetries?: number;
  priority: 'high' | 'normal' | 'low';
  checksum?: string;
  createdAt?: Date;
  lastAttemptAt?: Date;
  syncedAt?: Date;
  errorMessage?: string;
  conflictData?: SyncConflict;
}

export interface SyncConflict {
  id: string;
  queueItemId: string;
  entityType: string;
  entityId: string;
  userId?: string;
  deviceId?: string;
  localData: any;
  serverData: any;
  localTimestamp: Date;
  serverTimestamp: Date;
  conflictFields?: string[];
  status: 'pending' | 'resolved';
  resolution?: ConflictResolution;
  resolvedData?: any;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: 'system' | 'user';
}

export interface SyncSession {
  id: string;
  userId: string;
  deviceId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'partial' | 'failed';
  itemsToSync: number;
  itemsSynced: number;
  itemsFailed: number;
  conflictsFound: number;
  conflictsResolved: number;
  duration?: number;
  syncTypes: string[];
  lastSyncTimestamp?: Date;
  errors?: string[];
}

export interface DeviceSyncState {
  deviceId: string;
  userId: string;
  pendingUploadCount: number;
  pendingDownloadCount: number;
  lastSuccessfulSync?: Date;
  lastSyncAttempt?: Date;
  lastSyncError?: string;
  lastSyncErrorAt?: Date;
  isSyncing: boolean;
  isOnline: boolean;
  syncVersion?: number;
  storageUsedBytes?: number;
  storageQuotaBytes?: number;
}

export interface CachedEntity {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  deviceId: string;
  data: Record<string, any>;
  version: number;
  cachedAt: Date;
  expiresAt?: Date;
  isModifiedLocally: boolean;
  localModifications?: Record<string, any>;
}

export interface OfflineCapability {
  entityType: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  requiresSync: boolean;
  maxOfflineDuration?: number; // Hours before data must sync
  conflictStrategy: ConflictResolution;
  cacheStrategy: 'always' | 'on_demand' | 'never';
  maxCacheSize?: number; // Bytes
}

export interface SyncManifest {
  version: number;
  generatedAt: Date;
  entities: Array<{
    type: string;
    lastModified: Date;
    count: number;
    checksum: string;
  }>;
  requiredAppVersion?: string;
}

export interface BulkSyncRequest {
  userId: string;
  deviceId: string;
  lastSyncTimestamp?: Date;
  syncTypes?: string[];
  items: Array<{
    entityType: string;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    data?: any;
    localTimestamp: Date;
    priority?: 'high' | 'normal' | 'low';
  }>;
}

export interface BulkSyncResponse {
  sessionId: string;
  successCount: number;
  failedCount: number;
  conflictCount: number;
  serverTimestamp: Date;
  results: Array<{
    entityType: string;
    entityId: string;
    status: SyncStatus;
    serverVersion?: number;
    error?: string;
  }>;
  newDataFromServer: Array<{
    entityType: string;
    entityId: string;
    data: any;
    serverTimestamp: Date;
  }>;
}

export interface UploadQueue {
  id: string;
  userId: string;
  deviceId: string;
  items: Array<{
    localId: string;
    type: 'photo' | 'video' | 'audio' | 'document';
    filePath: string;
    fileSize: number;
    mimeType: string;
    metadata: Record<string, any>;
    priority: SyncPriority;
    status: SyncStatus;
    progress: number; // 0-100
    uploadedAt?: Date;
    serverUrl?: string;
    errorMessage?: string;
  }>;
  totalSize: number;
  uploadedSize: number;
  createdAt: Date;
  lastActivityAt: Date;
}
