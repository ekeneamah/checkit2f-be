import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SyncService } from './application/services/sync.service';
import { SyncController } from './infrastructure/controllers/sync.controller';

/**
 * Sync Module
 * 
 * Provides offline sync capabilities including queue management,
 * conflict resolution, and bulk synchronization for mobile apps.
 * 
 * @author CheckIT24 Development Team
 */
@Module({
  imports: [ConfigModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
