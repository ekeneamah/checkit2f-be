import { Controller, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FirebaseConfigService } from '../shared/config/firebase-config.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Health check controller
 * Provides application and service health status
 */
@ApiTags('Health')
@Controller('health')
@Public() // Make all health endpoints public
export class HealthController {
  constructor(private readonly firebaseConfig: FirebaseConfigService) {}

  /**
   * Basic health check
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Application health check',
    description: 'Check if the application is running and responsive',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-15T10:00:00Z' },
        uptime: { type: 'number', example: 3600 },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Database health check
   */
  @Get('database')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Database health check',
    description: 'Check Firestore database connectivity',
  })
  @ApiResponse({
    status: 200,
    description: 'Database is healthy',
  })
  async getDatabaseHealth() {
    return await this.firebaseConfig.healthCheck();
  }

  /**
   * Detailed health check
   */
  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Comprehensive health check including all services',
  })
  async getDetailedHealth() {
    const [appHealth, dbHealth] = await Promise.all([
      Promise.resolve(this.getHealth()),
      this.firebaseConfig.healthCheck(),
    ]);

    return {
      application: appHealth,
      database: dbHealth,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
      },
    };
  }
}