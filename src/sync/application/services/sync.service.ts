import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  SyncQueueItem,
  SyncConflict,
  SyncSession,
  DeviceSyncState,
  BulkSyncRequest,
  BulkSyncResponse,
  SyncStatus,
  ConflictResolution,
} from '../../domain/entities/sync.entity';

/**
 * Offline Sync Service
 * 
 * Manages sync queue, conflict resolution, and data synchronization
 * for offline-capable mobile applications.
 * 
 * @author CheckIT24 Development Team
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly db: admin.firestore.Firestore;
  private readonly SYNC_QUEUE_COLLECTION = 'sync_queue';
  private readonly SYNC_CONFLICTS_COLLECTION = 'sync_conflicts';
  private readonly SYNC_SESSIONS_COLLECTION = 'sync_sessions';
  private readonly DEVICE_STATE_COLLECTION = 'device_sync_states';

  constructor(private readonly configService: ConfigService) {
    this.db = admin.firestore();
    this.logger.log('🔄 Sync Service initialized');
  }

  // ============================================================================
  // SYNC SESSIONS
  // ============================================================================

  /**
   * Start a new sync session
   */
  async startSyncSession(
    userId: string,
    deviceId: string,
    deviceInfo: {
      platform: string;
      appVersion: string;
      osVersion: string;
    },
    syncTypes: string[],
    lastSyncTimestamp?: Date,
  ): Promise<SyncSession> {
    const sessionId = this.generateId();
    const now = new Date();

    const session: SyncSession = {
      id: sessionId,
      userId,
      deviceId,
      status: 'in_progress',
      startedAt: now,
      itemsToSync: 0,
      itemsSynced: 0,
      itemsFailed: 0,
      conflictsFound: 0,
      conflictsResolved: 0,
      syncTypes,
      lastSyncTimestamp,
    };

    await this.db.collection(this.SYNC_SESSIONS_COLLECTION).doc(sessionId).set({
      ...session,
      startedAt: admin.firestore.Timestamp.fromDate(now),
      lastSyncTimestamp: lastSyncTimestamp ? admin.firestore.Timestamp.fromDate(lastSyncTimestamp) : null,
    });

    // Update device state
    await this.updateDeviceSyncState(userId, deviceId, deviceInfo, {
      isSyncing: true,
      lastSyncAttempt: now,
    });

    this.logger.log(`🔄 Sync session ${sessionId} started for user ${userId}, device ${deviceId}`);
    return session;
  }

  /**
   * Complete a sync session
   */
  async completeSyncSession(
    sessionId: string,
    stats: {
      itemsSynced: number;
      itemsFailed: number;
      conflictsResolved: number;
    },
    success: boolean = true,
    errors?: string[],
  ): Promise<SyncSession> {
    const sessionRef = this.db.collection(this.SYNC_SESSIONS_COLLECTION).doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new NotFoundException('Sync session not found');
    }

    const session = sessionDoc.data()!;
    const now = new Date();
    const duration = now.getTime() - session.startedAt.toDate().getTime();

    const updateData = {
      status: success ? 'completed' : 'failed',
      completedAt: admin.firestore.Timestamp.fromDate(now),
      itemsSynced: stats.itemsSynced,
      itemsFailed: stats.itemsFailed,
      conflictsResolved: stats.conflictsResolved,
      duration,
      errors: errors || [],
    };

    await sessionRef.update(updateData);

    // Update device state
    if (success) {
      await this.db.collection(this.DEVICE_STATE_COLLECTION).doc(`${session.userId}_${session.deviceId}`).update({
        isSyncing: false,
        lastSuccessfulSync: admin.firestore.Timestamp.fromDate(now),
        syncVersion: admin.firestore.FieldValue.increment(1),
      });
    } else {
      await this.db.collection(this.DEVICE_STATE_COLLECTION).doc(`${session.userId}_${session.deviceId}`).update({
        isSyncing: false,
        lastSyncError: errors?.join('; '),
        lastSyncErrorAt: admin.firestore.Timestamp.fromDate(now),
      });
    }

    this.logger.log(`✅ Sync session ${sessionId} completed: ${stats.itemsSynced} items synced, ${stats.itemsFailed} failed`);
    return { ...session, ...updateData, completedAt: now } as SyncSession;
  }

  // ============================================================================
  // SYNC QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(
    userId: string,
    deviceId: string,
    item: {
      entityType: string;
      entityId: string;
      action: 'create' | 'update' | 'delete';
      data?: any;
      localTimestamp: Date;
      priority?: 'high' | 'normal' | 'low';
    },
  ): Promise<SyncQueueItem> {
    const queueItemId = this.generateId();
    const now = new Date();

    const queueItem: SyncQueueItem = {
      id: queueItemId,
      userId,
      deviceId,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      data: item.data,
      localTimestamp: item.localTimestamp,
      serverTimestamp: now,
      status: 'pending',
      retryCount: 0,
      priority: item.priority || 'normal',
      checksum: this.generateChecksum(item.data),
    };

    await this.db.collection(this.SYNC_QUEUE_COLLECTION).doc(queueItemId).set({
      ...queueItem,
      localTimestamp: admin.firestore.Timestamp.fromDate(item.localTimestamp),
      serverTimestamp: admin.firestore.Timestamp.fromDate(now),
    });

    return queueItem;
  }

  /**
   * Process sync queue items (batch)
   */
  async processSyncQueue(
    userId: string,
    deviceId: string,
    limit: number = 50,
  ): Promise<{ processed: number; failed: number; conflicts: number }> {
    const queue = await this.getPendingSyncItems(userId, deviceId, limit);
    
    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of queue) {
      try {
        const result = await this.processSyncItem(item);
        if (result.status === 'synced') {
          processed++;
        } else if (result.status === 'conflict') {
          conflicts++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        await this.markItemFailed(item.id, error.message);
      }
    }

    return { processed, failed, conflicts };
  }

  /**
   * Get pending sync items for device
   */
  async getPendingSyncItems(
    userId: string,
    deviceId: string,
    limit: number = 100,
  ): Promise<SyncQueueItem[]> {
    const snapshot = await this.db
      .collection(this.SYNC_QUEUE_COLLECTION)
      .where('userId', '==', userId)
      .where('deviceId', '==', deviceId)
      .where('status', 'in', ['pending', 'failed'])
      .orderBy('priority', 'desc')
      .orderBy('localTimestamp', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        localTimestamp: data.localTimestamp?.toDate(),
        serverTimestamp: data.serverTimestamp?.toDate(),
      } as SyncQueueItem;
    });
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: SyncQueueItem): Promise<{ status: 'synced' | 'conflict' | 'failed' }> {
    const itemRef = this.db.collection(this.SYNC_QUEUE_COLLECTION).doc(item.id);

    // Check for conflicts
    const serverEntity = await this.getServerEntity(item.entityType, item.entityId);
    
    if (serverEntity && item.action === 'update') {
      const serverTimestamp = serverEntity.updatedAt?.toDate?.() || serverEntity.updatedAt;
      if (serverTimestamp && serverTimestamp > item.localTimestamp) {
        // Conflict detected
        await this.createConflict(item, serverEntity);
        await itemRef.update({ status: 'conflict' });
        return { status: 'conflict' };
      }
    }

    // Apply the change
    try {
      await this.applySync(item);
      await itemRef.update({
        status: 'synced',
        syncedAt: admin.firestore.Timestamp.now(),
      });
      return { status: 'synced' };
    } catch (error) {
      await this.markItemFailed(item.id, error.message);
      return { status: 'failed' };
    }
  }

  /**
   * Apply sync to server
   */
  private async applySync(item: SyncQueueItem): Promise<void> {
    const entityRef = this.db.collection(item.entityType).doc(item.entityId);

    switch (item.action) {
      case 'create':
        await entityRef.set({
          ...item.data,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
          _syncedFrom: item.deviceId,
        });
        break;
      case 'update':
        await entityRef.update({
          ...item.data,
          updatedAt: admin.firestore.Timestamp.now(),
          _syncedFrom: item.deviceId,
        });
        break;
      case 'delete':
        await entityRef.delete();
        break;
    }
  }

  /**
   * Mark item as failed
   */
  private async markItemFailed(itemId: string, error: string): Promise<void> {
    const itemRef = this.db.collection(this.SYNC_QUEUE_COLLECTION).doc(itemId);
    const itemDoc = await itemRef.get();
    
    if (itemDoc.exists) {
      const retryCount = (itemDoc.data()?.retryCount || 0) + 1;
      await itemRef.update({
        status: retryCount >= 3 ? 'failed' : 'pending',
        retryCount,
        lastError: error,
        lastAttemptAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  /**
   * Create a conflict record
   */
  private async createConflict(item: SyncQueueItem, serverData: any): Promise<SyncConflict> {
    const conflictId = this.generateId();
    const now = new Date();

    const conflict: SyncConflict = {
      id: conflictId,
      queueItemId: item.id,
      userId: item.userId,
      entityType: item.entityType,
      entityId: item.entityId,
      localData: item.data,
      serverData,
      localTimestamp: item.localTimestamp,
      serverTimestamp: serverData.updatedAt?.toDate?.() || new Date(),
      deviceId: item.deviceId,
      status: 'pending',
      createdAt: now,
    };

    await this.db.collection(this.SYNC_CONFLICTS_COLLECTION).doc(conflictId).set({
      ...conflict,
      localTimestamp: admin.firestore.Timestamp.fromDate(item.localTimestamp),
      serverTimestamp: admin.firestore.Timestamp.fromDate(conflict.serverTimestamp),
      createdAt: admin.firestore.Timestamp.fromDate(now),
    });

    return conflict;
  }

  /**
   * Get pending conflicts for user
   */
  async getPendingConflicts(userId: string): Promise<SyncConflict[]> {
    const snapshot = await this.db
      .collection(this.SYNC_CONFLICTS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        localTimestamp: data.localTimestamp?.toDate(),
        serverTimestamp: data.serverTimestamp?.toDate(),
        createdAt: data.createdAt?.toDate(),
        resolvedAt: data.resolvedAt?.toDate(),
      } as SyncConflict;
    });
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    mergedData?: any,
  ): Promise<SyncConflict> {
    const conflictRef = this.db.collection(this.SYNC_CONFLICTS_COLLECTION).doc(conflictId);
    const conflictDoc = await conflictRef.get();

    if (!conflictDoc.exists) {
      throw new NotFoundException('Conflict not found');
    }

    const conflict = conflictDoc.data()!;
    const now = new Date();

    // Apply resolution
    let finalData: any;
    switch (resolution) {
      case 'keep_local':
        finalData = conflict.localData;
        break;
      case 'keep_server':
        finalData = conflict.serverData;
        break;
      case 'merge':
        if (!mergedData) {
          throw new BadRequestException('Merged data required for merge resolution');
        }
        finalData = mergedData;
        break;
    }

    // Update the entity with resolved data
    if (resolution !== 'keep_server') {
      await this.db.collection(conflict.entityType).doc(conflict.entityId).update({
        ...finalData,
        updatedAt: admin.firestore.Timestamp.now(),
        _conflictResolved: true,
      });
    }

    // Update conflict record
    await conflictRef.update({
      status: 'resolved',
      resolution,
      resolvedData: finalData,
      resolvedAt: admin.firestore.Timestamp.fromDate(now),
    });

    return {
      ...conflict,
      status: 'resolved',
      resolution,
      resolvedData: finalData,
      resolvedAt: now,
    } as SyncConflict;
  }

  /**
   * Auto-resolve conflicts (last-write-wins)
   */
  async autoResolveConflicts(userId: string, strategy: 'last_write_wins' | 'server_wins' | 'local_wins'): Promise<number> {
    const conflicts = await this.getPendingConflicts(userId);
    let resolved = 0;

    for (const conflict of conflicts) {
      let resolution: ConflictResolution;
      
      switch (strategy) {
        case 'last_write_wins':
          resolution = conflict.localTimestamp > conflict.serverTimestamp ? 'keep_local' : 'keep_server';
          break;
        case 'server_wins':
          resolution = 'keep_server';
          break;
        case 'local_wins':
          resolution = 'keep_local';
          break;
      }

      await this.resolveConflict(conflict.id, resolution);
      resolved++;
    }

    return resolved;
  }

  // ============================================================================
  // BULK SYNC
  // ============================================================================

  /**
   * Process bulk sync request
   */
  async processBulkSync(
    userId: string,
    deviceId: string,
    request: BulkSyncRequest,
  ): Promise<BulkSyncResponse> {
    this.logger.log(`📦 Processing bulk sync: ${request.items.length} items`);

    const response: BulkSyncResponse = {
      sessionId: this.generateId(),
      successCount: 0,
      failedCount: 0,
      conflictCount: 0,
      results: [],
      serverTimestamp: new Date(),
      newDataFromServer: [],
    };

    // Start sync session
    const session = await this.startSyncSession(userId, deviceId, {
      platform: 'unknown',
      appVersion: 'unknown',
      osVersion: 'unknown',
    }, ['bulk'], request.lastSyncTimestamp);

    // Process each item
    for (const item of request.items) {
      try {
        const queueItem = await this.addToSyncQueue(userId, deviceId, {
          entityType: item.entityType,
          entityId: item.entityId,
          action: item.action,
          data: item.data,
          localTimestamp: item.localTimestamp,
          priority: item.priority || 'normal',
        });

        const result = await this.processSyncItem(queueItem);
        
        response.results.push({
          entityType: item.entityType,
          entityId: item.entityId,
          status: result.status,
          serverVersion: result.status === 'synced' ? Date.now() : undefined,
        });

        if (result.status === 'synced') {
          response.successCount++;
        } else if (result.status === 'conflict') {
          response.conflictCount++;
        } else {
          response.failedCount++;
        }
      } catch (error) {
        response.results.push({
          entityType: item.entityType,
          entityId: item.entityId,
          status: 'failed',
          error: error.message,
        });
        response.failedCount++;
      }
    }

    // Get changes from server since last sync
    if (request.lastSyncTimestamp) {
      response.newDataFromServer = await this.getChangesFromServer(
        userId,
        request.syncTypes || [],
        request.lastSyncTimestamp,
      );
    }

    // Complete session
    await this.completeSyncSession(
      session.id,
      {
        itemsSynced: response.successCount,
        itemsFailed: response.failedCount,
        conflictsResolved: 0,
      },
      response.failedCount === 0,
    );

    return response;
  }

  /**
   * Get changes from server since timestamp
   */
  async getChangesFromServer(
    userId: string,
    entityTypes: string[],
    since: Date,
  ): Promise<Array<{ entityType: string; entityId: string; data: any; serverTimestamp: Date }>> {
    const changes: Array<{ entityType: string; entityId: string; data: any; serverTimestamp: Date }> = [];

    for (const entityType of entityTypes) {
      try {
        const snapshot = await this.db
          .collection(entityType)
          .where('userId', '==', userId)
          .where('updatedAt', '>', admin.firestore.Timestamp.fromDate(since))
          .get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          changes.push({
            entityType,
            entityId: doc.id,
            data,
            serverTimestamp: data.updatedAt?.toDate() || new Date(),
          });
        }
      } catch (error) {
        this.logger.warn(`Could not fetch changes for ${entityType}: ${error.message}`);
      }
    }

    return changes;
  }

  // ============================================================================
  // DEVICE STATE MANAGEMENT
  // ============================================================================

  /**
   * Get device sync state
   */
  async getDeviceSyncState(userId: string, deviceId: string): Promise<DeviceSyncState | null> {
    const stateDoc = await this.db
      .collection(this.DEVICE_STATE_COLLECTION)
      .doc(`${userId}_${deviceId}`)
      .get();

    if (!stateDoc.exists) {
      return null;
    }

    const data = stateDoc.data()!;
    return {
      ...data,
      lastSuccessfulSync: data.lastSuccessfulSync?.toDate(),
      lastSyncAttempt: data.lastSyncAttempt?.toDate(),
      lastSyncErrorAt: data.lastSyncErrorAt?.toDate(),
    } as DeviceSyncState;
  }

  /**
   * Update device sync state
   */
  async updateDeviceSyncState(
    userId: string,
    deviceId: string,
    deviceInfo: { platform: string; appVersion: string; osVersion: string },
    updates: Partial<DeviceSyncState>,
  ): Promise<void> {
    const stateRef = this.db.collection(this.DEVICE_STATE_COLLECTION).doc(`${userId}_${deviceId}`);
    
    const updateData: any = {
      userId,
      deviceId,
      ...updates,
      deviceInfo,
    };

    if (updates.lastSuccessfulSync) {
      updateData.lastSuccessfulSync = admin.firestore.Timestamp.fromDate(updates.lastSuccessfulSync);
    }
    if (updates.lastSyncAttempt) {
      updateData.lastSyncAttempt = admin.firestore.Timestamp.fromDate(updates.lastSyncAttempt);
    }

    await stateRef.set(updateData, { merge: true });
  }

  /**
   * Get all devices for user
   */
  async getUserDevices(userId: string): Promise<DeviceSyncState[]> {
    const snapshot = await this.db
      .collection(this.DEVICE_STATE_COLLECTION)
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        lastSuccessfulSync: data.lastSuccessfulSync?.toDate(),
        lastSyncAttempt: data.lastSyncAttempt?.toDate(),
      } as DeviceSyncState;
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getServerEntity(entityType: string, entityId: string): Promise<any> {
    try {
      const doc = await this.db.collection(entityType).doc(entityId).get();
      return doc.exists ? doc.data() : null;
    } catch {
      return null;
    }
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateChecksum(data: any): string {
    if (!data) return '';
    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }
}
