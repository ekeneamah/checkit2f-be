import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PricingConfigService } from '../../application/services/pricing-config.service';
import { UpdateMultipliersDto } from '../dto/update-multipliers.dto';
import { Inject } from '@nestjs/common';
import { IPricingConfigRepository } from '../../application/interfaces/pricing-config.repository.interface';
import { seedPricingConfiguration } from '../../infrastructure/seeders/pricing-config.seeder';
import { TimeSlotEnum, DifficultyEnum, ModeEnum, UrgencyEnum } from '../../domain/entities/pricing-config.entity';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Admin: Pricing Config')
@Controller('admin/pricing-config')
export class AdminPricingConfigController {
  constructor(
    private readonly pricingConfigService: PricingConfigService,
    @Inject('IPricingConfigRepository')
    private readonly pricingConfigRepository: IPricingConfigRepository,
  ) {}

  @Post('seed-default')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Seed default pricing configuration' })
  @ApiResponse({ status: 201, description: 'Seeded (or already present)' })
  async seedDefault() {
    await seedPricingConfiguration(this.pricingConfigRepository);
    return { status: 'ok' };
  }

  @Patch(':id/multipliers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update multiplier values for a pricing config' })
  @ApiResponse({ status: 200, description: 'Updated multipliers' })
  async updateMultipliers(
    @Param('id') id: string,
    @Body() dto: UpdateMultipliersDto,
  ) {
    const existing = await this.pricingConfigService.getConfigById(id);

    const updatedTimeSlotConfigs = existing.timeSlotConfigs.map(cfg => ({
      ...cfg,
      multiplier: dto.timeSlot && dto.timeSlot[cfg.slot] != null ? dto.timeSlot[cfg.slot] : cfg.multiplier,
    }));

    const updatedDifficultyConfigs = existing.difficultyConfigs.map(cfg => ({
      ...cfg,
      multiplier: dto.difficulty && dto.difficulty[cfg.difficulty] != null ? dto.difficulty[cfg.difficulty] : cfg.multiplier,
    }));

    const updatedModeConfigs = existing.modeConfigs.map(cfg => ({
      ...cfg,
      multiplier: dto.mode && dto.mode[cfg.mode] != null ? dto.mode[cfg.mode] : cfg.multiplier,
    }));

    const updatedUrgencyConfigs = existing.urgencyConfigs.map(cfg => ({
      ...cfg,
      multiplier: dto.urgency && dto.urgency[cfg.urgency] != null ? dto.urgency[cfg.urgency] : cfg.multiplier,
    }));

    const updated = await this.pricingConfigService.updateConfig(id, {
      timeSlotConfigs: updatedTimeSlotConfigs,
      difficultyConfigs: updatedDifficultyConfigs,
      modeConfigs: updatedModeConfigs,
      urgencyConfigs: updatedUrgencyConfigs,
    });

    return updated;
  }
}
