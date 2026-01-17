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
import { EarningsService } from '../../application/services/earnings.service';
import {
  RequestPayoutDto,
  ProcessPayoutDto,
  GetEarningsSummaryDto,
  GetPerformanceMetricsDto,
  GetLeaderboardDto,
  CreateEarningsGoalDto,
  RecordEarningDto,
} from '../../application/dtos/earnings.dto';

/**
 * Earnings & Analytics Controller
 * 
 * Handles earnings tracking, payout requests, performance metrics,
 * and leaderboards for Companies and Riders.
 * 
 * @author CheckIT24 Development Team
 */
@ApiTags('Earnings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('earnings')
export class EarningsController {
  private readonly logger = new Logger(EarningsController.name);

  constructor(private readonly earningsService: EarningsService) {}

  // ============================================================================
  // EARNINGS SUMMARY
  // ============================================================================

  @Get('summary')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get earnings summary' })
  @ApiResponse({ status: 200, description: 'Earnings summary returned' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'all'] })
  async getEarningsSummary(
    @CurrentUser() user: any,
    @Query('period') period?: 'today' | 'week' | 'month' | 'all',
  ) {
    return this.earningsService.getEarningsSummary(user.uid, period);
  }

  @Get('recent')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get recent earnings' })
  @ApiResponse({ status: 200, description: 'Recent earnings returned' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentEarnings(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.earningsService.getRecentEarnings(user.uid, limit);
  }

  // ============================================================================
  // COMPANY OVERVIEW (Companies with Riders)
  // ============================================================================

  @Get('company/overview')
  @Roles(UserRole.COMPANY)
  @ApiOperation({ summary: 'Get company earnings overview (includes rider earnings)' })
  @ApiResponse({ status: 200, description: 'Company earnings overview returned' })
  async getCompanyEarningsOverview(@CurrentUser() user: any) {
    return this.earningsService.getCompanyEarningsOverview(user.uid);
  }

  // ============================================================================
  // PAYOUT REQUESTS
  // ============================================================================

  @Post('payout/request')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a payout' })
  @ApiResponse({ status: 201, description: 'Payout request created' })
  async requestPayout(
    @CurrentUser() user: any,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.earningsService.requestPayout(
      user.uid,
      user.role,
      dto.amount,
      dto.bankDetails,
    );
  }

  @Get('payout/history')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get payout history' })
  @ApiResponse({ status: 200, description: 'Payout history returned' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPayoutHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.earningsService.getPayoutHistory(user.uid, limit);
  }

  @Put('payout/process')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process a payout request (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payout processed' })
  async processPayout(
    @CurrentUser() user: any,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.earningsService.processPayout(
      dto.payoutId,
      dto.status,
      user.uid,
      dto.transactionReference,
      dto.rejectionReason,
    );
  }

  // ============================================================================
  // PERFORMANCE METRICS
  // ============================================================================

  @Get('performance')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics returned' })
  @ApiQuery({ name: 'period', required: true, enum: ['week', 'month', 'year'] })
  async getPerformanceMetrics(
    @CurrentUser() user: any,
    @Query('period') period: 'week' | 'month' | 'year',
  ) {
    return this.earningsService.getPerformanceMetrics(user.uid, period);
  }

  // ============================================================================
  // LEADERBOARD
  // ============================================================================

  @Get('leaderboard')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard returned' })
  @ApiQuery({ name: 'type', required: true, enum: ['earnings', 'completions', 'quality'] })
  @ApiQuery({ name: 'period', required: true, enum: ['week', 'month', 'all'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company' })
  async getLeaderboard(
    @CurrentUser() user: any,
    @Query('type') type: 'earnings' | 'completions' | 'quality',
    @Query('period') period: 'week' | 'month' | 'all',
    @Query('limit') limit?: number,
    @Query('companyId') companyId?: string,
  ) {
    // If company user viewing leaderboard, default to their company
    const filterCompanyId = companyId || (user.role === 'COMPANY' ? user.uid : undefined);
    return this.earningsService.getLeaderboard(type, period, limit, filterCompanyId);
  }

  // ============================================================================
  // EARNINGS GOALS
  // ============================================================================

  @Post('goals')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an earnings goal' })
  @ApiResponse({ status: 201, description: 'Earnings goal created' })
  async createEarningsGoal(
    @CurrentUser() user: any,
    @Body() dto: CreateEarningsGoalDto,
  ) {
    return this.earningsService.createEarningsGoal(
      user.uid,
      dto.targetAmount,
      new Date(dto.deadline),
      dto.type,
      dto.name,
    );
  }

  @Get('goals')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get active earnings goals' })
  @ApiResponse({ status: 200, description: 'Active goals returned' })
  async getActiveGoals(@CurrentUser() user: any) {
    return this.earningsService.getActiveGoals(user.uid);
  }

  // ============================================================================
  // INTERNAL/ADMIN - RECORD EARNINGS
  // ============================================================================

  @Post('record')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record verification earning (Admin/Internal)' })
  @ApiResponse({ status: 201, description: 'Earning recorded' })
  async recordEarning(
    @CurrentUser() admin: any,
    @Body() dto: RecordEarningDto,
  ) {
    return this.earningsService.recordVerificationEarning(
      dto.verificationRequestId,
      dto.userId,
      dto.userRole,
      dto.baseAmount,
      dto.verificationType,
      new Date(dto.completedAt),
      dto.qualityScore,
      dto.bonuses,
      dto.companyId,
      dto.riderId,
    );
  }
}
