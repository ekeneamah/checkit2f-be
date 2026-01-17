import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EarningsService } from './application/services/earnings.service';
import { EarningsController } from './infrastructure/controllers/earnings.controller';

/**
 * Earnings Module
 * 
 * Provides earnings tracking, payout requests, performance metrics,
 * and leaderboards for Companies and Riders.
 * 
 * @author CheckIT24 Development Team
 */
@Module({
  imports: [ConfigModule],
  controllers: [EarningsController],
  providers: [EarningsService],
  exports: [EarningsService],
})
export class EarningsModule {}
