import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Offline Sync DTOs
 * 
 * @author CheckIT24 Development Team
 */

// ============================================================================
// DEVICE INFO DTOs
// ============================================================================

export class DeviceInfoDto {
  @ApiProperty({ description: 'Platform (ios, android, web)' })
  @IsNotEmpty()
  @IsString()
  platform: string;

  @ApiProperty({ description: 'App version' })
  @IsNotEmpty()
  @IsString()
  appVersion: string;

  @ApiProperty({ description: 'OS version' })
  @IsNotEmpty()
  @IsString()
  osVersion: string;

  @ApiPropertyOptional({ description: 'Device model' })
  @IsOptional()
  @IsString()
  deviceModel?: string;
}

// ============================================================================
// SYNC SESSION DTOs
// ============================================================================

export class StartSyncSessionDto {
  @ApiProperty({ description: 'Unique device identifier' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ type: DeviceInfoDto, description: 'Device information' })
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo: DeviceInfoDto;

  @ApiProperty({ description: 'Types of entities to sync', type: [String] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  syncTypes: string[];

  @ApiPropertyOptional({ description: 'Last successful sync timestamp (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastSyncTimestamp?: string;
}

export class CompleteSyncSessionDto {
  @ApiProperty({ description: 'Sync session ID' })
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Number of items successfully synced' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  itemsSynced: number;

  @ApiProperty({ description: 'Number of items that failed to sync' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  itemsFailed: number;

  @ApiProperty({ description: 'Number of conflicts resolved' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  conflictsResolved: number;

  @ApiPropertyOptional({ description: 'Whether sync was successful overall', default: true })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ description: 'Error messages if any', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}

// ============================================================================
// SYNC QUEUE DTOs
// ============================================================================

export class SyncQueueItemDto {
  @ApiProperty({ description: 'Entity type (collection name)' })
  @IsNotEmpty()
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsNotEmpty()
  @IsString()
  entityId: string;

  @ApiProperty({
    enum: ['create', 'update', 'delete'],
    description: 'Action to perform',
  })
  @IsNotEmpty()
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({ description: 'Entity data (for create/update)' })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: 'When the change was made locally (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  localTimestamp: string;

  @ApiPropertyOptional({
    enum: ['high', 'normal', 'low'],
    description: 'Sync priority',
    default: 'normal',
  })
  @IsOptional()
  @IsEnum(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';
}

export class AddToSyncQueueDto {
  @ApiProperty({ description: 'Device ID' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ type: SyncQueueItemDto, description: 'Item to add to sync queue' })
  @ValidateNested()
  @Type(() => SyncQueueItemDto)
  item: SyncQueueItemDto;
}

export class ProcessSyncQueueDto {
  @ApiProperty({ description: 'Device ID' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiPropertyOptional({ description: 'Maximum items to process', default: 50, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================================================
// CONFLICT RESOLUTION DTOs
// ============================================================================

export class ResolveConflictDto {
  @ApiProperty({ description: 'Conflict ID' })
  @IsNotEmpty()
  @IsString()
  conflictId: string;

  @ApiProperty({
    enum: ['keep_local', 'keep_server', 'merge'],
    description: 'How to resolve the conflict',
  })
  @IsNotEmpty()
  @IsEnum(['keep_local', 'keep_server', 'merge'])
  resolution: 'keep_local' | 'keep_server' | 'merge';

  @ApiPropertyOptional({ description: 'Merged data (required when resolution is "merge")' })
  @IsOptional()
  mergedData?: any;
}

export class AutoResolveConflictsDto {
  @ApiProperty({
    enum: ['last_write_wins', 'server_wins', 'local_wins'],
    description: 'Auto-resolution strategy',
  })
  @IsNotEmpty()
  @IsEnum(['last_write_wins', 'server_wins', 'local_wins'])
  strategy: 'last_write_wins' | 'server_wins' | 'local_wins';
}

// ============================================================================
// BULK SYNC DTOs
// ============================================================================

export class BulkSyncItemDto {
  @ApiProperty({ description: 'Entity type (collection name)' })
  @IsNotEmpty()
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsNotEmpty()
  @IsString()
  entityId: string;

  @ApiProperty({
    enum: ['create', 'update', 'delete'],
    description: 'Action to perform',
  })
  @IsNotEmpty()
  @IsEnum(['create', 'update', 'delete'])
  action: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({ description: 'Entity data' })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: 'Local timestamp (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  localTimestamp: string;

  @ApiPropertyOptional({
    enum: ['high', 'normal', 'low'],
    description: 'Priority',
    default: 'normal',
  })
  @IsOptional()
  @IsEnum(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';
}

export class BulkSyncRequestDto {
  @ApiProperty({ description: 'Device ID' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ type: [BulkSyncItemDto], description: 'Items to sync' })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSyncItemDto)
  items: BulkSyncItemDto[];

  @ApiPropertyOptional({ description: 'Last sync timestamp to get server changes (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastSyncTimestamp?: string;

  @ApiPropertyOptional({ description: 'Entity types to fetch from server', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  syncTypes?: string[];

  @ApiPropertyOptional({ description: 'Force overwrite server data', default: false })
  @IsOptional()
  @IsBoolean()
  forceOverwrite?: boolean;
}

export class GetChangesFromServerDto {
  @ApiProperty({ description: 'Device ID' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Entity types to fetch', type: [String] })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  entityTypes: string[];

  @ApiProperty({ description: 'Get changes since this timestamp (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  since: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class SyncSessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Session status' })
  status: string;

  @ApiProperty({ description: 'Started at' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: Date;
}

export class SyncQueueStatusResponseDto {
  @ApiProperty({ description: 'Number of pending items' })
  pendingItems: number;

  @ApiProperty({ description: 'Number of failed items' })
  failedItems: number;

  @ApiProperty({ description: 'Number of conflicts' })
  conflicts: number;

  @ApiProperty({ description: 'Last sync attempt' })
  lastSyncAttempt?: Date;

  @ApiProperty({ description: 'Last successful sync' })
  lastSuccessfulSync?: Date;
}

export class ConflictResponseDto {
  @ApiProperty({ description: 'Conflict ID' })
  id: string;

  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Local data' })
  localData: any;

  @ApiProperty({ description: 'Server data' })
  serverData: any;

  @ApiProperty({ description: 'Local timestamp' })
  localTimestamp: Date;

  @ApiProperty({ description: 'Server timestamp' })
  serverTimestamp: Date;

  @ApiProperty({ description: 'Status' })
  status: string;
}

export class BulkSyncResultDto {
  @ApiProperty({ description: 'Entity type' })
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  entityId: string;

  @ApiProperty({ description: 'Sync status' })
  status: 'synced' | 'conflict' | 'failed';

  @ApiPropertyOptional({ description: 'Server version (for synced items)' })
  serverVersion?: number;

  @ApiPropertyOptional({ description: 'Error message (for failed items)' })
  error?: string;
}

export class BulkSyncResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Successfully synced count' })
  successCount: number;

  @ApiProperty({ description: 'Failed count' })
  failedCount: number;

  @ApiProperty({ description: 'Conflict count' })
  conflictCount: number;

  @ApiProperty({ type: [BulkSyncResultDto], description: 'Individual results' })
  results: BulkSyncResultDto[];

  @ApiProperty({ description: 'Server timestamp' })
  serverTimestamp: Date;

  @ApiProperty({ description: 'New data from server since last sync', type: 'array' })
  newDataFromServer: Array<{
    entityType: string;
    entityId: string;
    data: any;
    serverTimestamp: Date;
  }>;
}

export class DeviceSyncStateResponseDto {
  @ApiProperty({ description: 'Device ID' })
  deviceId: string;

  @ApiProperty({ description: 'Is currently syncing' })
  isSyncing: boolean;

  @ApiProperty({ description: 'Sync version' })
  syncVersion: number;

  @ApiPropertyOptional({ description: 'Last successful sync' })
  lastSuccessfulSync?: Date;

  @ApiPropertyOptional({ description: 'Last sync error' })
  lastSyncError?: string;

  @ApiProperty({ description: 'Device info' })
  deviceInfo: {
    platform: string;
    appVersion: string;
    osVersion: string;
  };
}
