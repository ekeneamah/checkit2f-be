import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EvidenceCollectionService } from './application/services/evidence-collection.service';
import { EvidenceController } from './infrastructure/controllers/evidence.controller';

/**
 * Evidence Module
 * 
 * Provides geo-tagged evidence collection including photos, videos,
 * documents, signatures, and voice memos for field verification.
 * 
 * @author CheckIT24 Development Team
 */
@Module({
  imports: [ConfigModule],
  controllers: [EvidenceController],
  providers: [EvidenceCollectionService],
  exports: [EvidenceCollectionService],
})
export class EvidenceModule {}
