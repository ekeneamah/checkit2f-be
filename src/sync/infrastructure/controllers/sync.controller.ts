import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { SyncService } from '../../application/services/sync.service';
import {
  StartSyncSessionDto,
  CompleteSyncSessionDto,
  AddToSyncQueueDto,
  ProcessSyncQueueDto,
  ResolveConflictDto,
  AutoResolveConflictsDto,
  BulkSyncRequestDto,
  GetChangesFromServerDto,
} from '../../application/dtos/sync.dto';

/**
 * Offline Sync Controller
 * 
 * Handles sync sessions, queue management, conflict resolution,
 * and bulk synchronization for offline-capable mobile apps.
 * 
 * @author CheckIT24 Development Team
 */
@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  // ============================================================================
  // SYNC SESSIONS
  // ============================================================================

  @Post('sessions/start')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new sync session' })
  @ApiResponse({ status: 201, description: 'Sync session started' })
  async startSyncSession(
    @CurrentUser() user: any,
    @Body() dto: StartSyncSessionDto,
  ) {
    return this.syncService.startSyncSession(
      user.uid,
      dto.deviceId,
      dto.deviceInfo,
      dto.syncTypes,
      dto.lastSyncTimestamp ? new Date(dto.lastSyncTimestamp) : undefined,
    );
  }

  @Put('sessions/complete')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Complete a sync session' })
  @ApiResponse({ status: 200, description: 'Sync session completed' })
  async completeSyncSession(
    @CurrentUser() user: any,
    @Body() dto: CompleteSyncSessionDto,
  ) {
    return this.syncService.completeSyncSession(
      dto.sessionId,
      {
        itemsSynced: dto.itemsSynced,
        itemsFailed: dto.itemsFailed,
        conflictsResolved: dto.conflictsResolved,
      },
      dto.success ?? true,
      dto.errors,
    );
  }

  // ============================================================================
  // SYNC QUEUE
  // ============================================================================

  @Post('queue/add')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to sync queue' })
  @ApiResponse({ status: 201, description: 'Item added to queue' })
  async addToSyncQueue(
    @CurrentUser() user: any,
    @Body() dto: AddToSyncQueueDto,
  ) {
    return this.syncService.addToSyncQueue(
      user.uid,
      dto.deviceId,
      {
        entityType: dto.item.entityType,
        entityId: dto.item.entityId,
        action: dto.item.action,
        data: dto.item.data,
        localTimestamp: new Date(dto.item.localTimestamp),
        priority: dto.item.priority,
      },
    );
  }

  @Post('queue/process')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process pending sync queue items' })
  @ApiResponse({ status: 200, description: 'Queue processing results' })
  async processSyncQueue(
    @CurrentUser() user: any,
    @Body() dto: ProcessSyncQueueDto,
  ) {
    return this.syncService.processSyncQueue(user.uid, dto.deviceId, dto.limit);
  }

  @Get('queue/pending')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get pending sync queue items' })
  @ApiResponse({ status: 200, description: 'Pending queue items returned' })
  @ApiQuery({ name: 'deviceId', required: true, description: 'Device ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingSyncItems(
    @CurrentUser() user: any,
    @Query('deviceId') deviceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.syncService.getPendingSyncItems(user.uid, deviceId, limit);
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  @Get('conflicts')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get pending sync conflicts' })
  @ApiResponse({ status: 200, description: 'Pending conflicts returned' })
  async getPendingConflicts(@CurrentUser() user: any) {
    return this.syncService.getPendingConflicts(user.uid);
  }

  @Put('conflicts/resolve')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Resolve a sync conflict' })
  @ApiResponse({ status: 200, description: 'Conflict resolved' })
  async resolveConflict(
    @CurrentUser() user: any,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.syncService.resolveConflict(
      dto.conflictId,
      dto.resolution,
      dto.mergedData,
    );
  }

  @Post('conflicts/auto-resolve')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-resolve all pending conflicts with a strategy' })
  @ApiResponse({ status: 200, description: 'Conflicts auto-resolved' })
  async autoResolveConflicts(
    @CurrentUser() user: any,
    @Body() dto: AutoResolveConflictsDto,
  ) {
    const resolved = await this.syncService.autoResolveConflicts(user.uid, dto.strategy);
    return { resolved, message: `${resolved} conflicts auto-resolved using ${dto.strategy} strategy` };
  }

  // ============================================================================
  // BULK SYNC
  // ============================================================================

  @Post('bulk')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform bulk sync (upload and download changes)' })
  @ApiResponse({ status: 200, description: 'Bulk sync results' })
  async bulkSync(
    @CurrentUser() user: any,
    @Body() dto: BulkSyncRequestDto,
  ) {
    const items = dto.items.map(item => ({
      ...item,
      localTimestamp: new Date(item.localTimestamp),
    }));

    return this.syncService.processBulkSync(user.uid, dto.deviceId, {
      userId: user.uid,
      deviceId: dto.deviceId,
      items,
      lastSyncTimestamp: dto.lastSyncTimestamp ? new Date(dto.lastSyncTimestamp) : undefined,
      syncTypes: dto.syncTypes,
    });
  }

  @Post('changes')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get changes from server since timestamp' })
  @ApiResponse({ status: 200, description: 'Server changes returned' })
  async getChangesFromServer(
    @CurrentUser() user: any,
    @Body() dto: GetChangesFromServerDto,
  ) {
    return this.syncService.getChangesFromServer(
      user.uid,
      dto.entityTypes,
      new Date(dto.since),
    );
  }

  // ============================================================================
  // DEVICE STATE
  // ============================================================================

  @Get('device/:deviceId/state')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get device sync state' })
  @ApiResponse({ status: 200, description: 'Device sync state returned' })
  @ApiParam({ name: 'deviceId', description: 'Device ID' })
  async getDeviceSyncState(
    @CurrentUser() user: any,
    @Param('deviceId') deviceId: string,
  ) {
    return this.syncService.getDeviceSyncState(user.uid, deviceId);
  }

  @Get('devices')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get all devices for user' })
  @ApiResponse({ status: 200, description: 'User devices returned' })
  async getUserDevices(@CurrentUser() user: any) {
    return this.syncService.getUserDevices(user.uid);
  }

  // ============================================================================
  // STATUS ENDPOINT
  // ============================================================================

  @Get('status')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get overall sync status for user' })
  @ApiResponse({ status: 200, description: 'Sync status returned' })
  @ApiQuery({ name: 'deviceId', required: true, description: 'Device ID' })
  async getSyncStatus(
    @CurrentUser() user: any,
    @Query('deviceId') deviceId: string,
  ) {
    const [deviceState, conflicts, pendingItems] = await Promise.all([
      this.syncService.getDeviceSyncState(user.uid, deviceId),
      this.syncService.getPendingConflicts(user.uid),
      this.syncService.getPendingSyncItems(user.uid, deviceId, 100),
    ]);

    return {
      deviceId,
      isSyncing: deviceState?.isSyncing || false,
      lastSuccessfulSync: deviceState?.lastSuccessfulSync,
      syncVersion: deviceState?.syncVersion || 0,
      pendingItemsCount: pendingItems.length,
      conflictsCount: conflicts.length,
      hasUnresolvedConflicts: conflicts.length > 0,
      lastSyncError: deviceState?.lastSyncError,
    };
  }
}
