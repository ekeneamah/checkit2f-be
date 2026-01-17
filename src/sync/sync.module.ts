import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '@/shared/config/firebase.module';
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
  imports: [ConfigModule, FirebaseModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
