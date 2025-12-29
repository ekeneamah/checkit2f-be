import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/auth.interface';
import { GetVerificationRequestsUseCase } from '../verification-request/application/use-cases/get-verification-requests.use-case';
import { GetAgentUseCase } from '../agent/application/use-cases/get-agent.use-case';
import { IVerificationRequestRepository } from '../verification-request/application/interfaces/verification-request.repository.interface';
import { AgentStatus } from '../agent/domain/enums/agent.enum';

/**
 * Admin Dashboard Controller
 * Provides dashboard statistics and overview data for admin portal
 */
@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT_MANAGER)
export class AdminDashboardController {
  private readonly logger = new Logger(AdminDashboardController.name);

  constructor(
    private readonly getVerificationRequestsUseCase: GetVerificationRequestsUseCase,
    private readonly getAgentUseCase: GetAgentUseCase,
    @Inject('IVerificationRequestRepository')
    private readonly verificationRequestRepository: IVerificationRequestRepository,
  ) {}

  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Retrieve comprehensive statistics for admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number', example: 150 },
        activeRequests: { type: 'number', example: 25 },
        completedRequests: { type: 'number', example: 100 },
        totalAgents: { type: 'number', example: 50 },
        activeAgents: { type: 'number', example: 40 },
        totalRevenue: { type: 'number', example: 500000 },
        pendingPayments: { type: 'number', example: 25000 },
      },
    },
  })
  async getStatistics(): Promise<{
    totalRequests: number;
    activeRequests: number;
    completedRequests: number;
    totalAgents: number;
    activeAgents: number;
    totalRevenue: number;
    pendingPayments: number;
  }> {
    try {
      this.logger.log('Getting dashboard statistics');

      // Get verification request stats
      const allRequests = await this.verificationRequestRepository.findWithFilters({}, { limit: 1000 });
      const totalRequests = allRequests.total;
      const activeRequests = allRequests.items.filter((r) =>
        ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status.status),
      ).length;
      const completedRequests = allRequests.items.filter(
        (r) => r.status.status === 'COMPLETED',
      ).length;

      // Calculate total revenue from completed requests
      const totalRevenue = allRequests.items
        .filter((r) => r.status.status === 'COMPLETED')
        .reduce((sum, r) => sum + r.price.amount, 0);

      // Get agent stats
      const agents = await this.getAgentUseCase.getAll(1000, 0);
      const totalAgents = agents.length;
      const activeAgents = agents.filter((a) => a.status === AgentStatus.ACTIVE).length;

      // Calculate pending payments (from active requests)
      const pendingPayments = allRequests.items
        .filter((r) => ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status.status))
        .reduce((sum, r) => sum + r.price.amount, 0);

      return {
        totalRequests,
        activeRequests,
        completedRequests,
        totalAgents,
        activeAgents,
        totalRevenue,
        pendingPayments,
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent activity
   * GET /api/admin/dashboard/activity
   */
  @Get('activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recent activity',
    description: 'Retrieve recent platform activity for admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity retrieved successfully',
  })
  async getRecentActivity(): Promise<any[]> {
    try {
      this.logger.log('Getting recent activity');

      // Get recent requests (last 10)
      const recentRequests = await this.verificationRequestRepository.findWithFilters({}, {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      return recentRequests.items.map((request) => ({
        id: request.id,
        type: 'verification_request',
        title: request.title,
        status: request.status.status,
        timestamp: request.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get recent activity: ${error.message}`);
      throw error;
    }
  }
}
