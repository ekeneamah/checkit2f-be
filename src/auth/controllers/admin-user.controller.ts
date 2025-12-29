import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../interfaces/auth.interface';
import { AdminUserSeederService } from '../services/admin-user-seeder.service';

/**
 * Admin User Management Controller
 * Handles admin user creation and role management
 */
@ApiTags('Admin - User Management')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminUserController {
  private readonly logger = new Logger(AdminUserController.name);

  constructor(private readonly adminUserSeeder: AdminUserSeederService) {}

  /**
   * Seed default admin users
   * POST /api/admin/users/seed
   */
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Seed admin users',
    description: 'Create default admin users with predefined credentials',
  })
  @ApiResponse({
    status: 201,
    description: 'Admin users seeded successfully',
  })
  async seedAdminUsers(): Promise<{ message: string }> {
    try {
      this.logger.log('Seeding admin users...');
      await this.adminUserSeeder.seedAdminUsers();
      return {
        message: 'Admin users seeded successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to seed admin users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Make existing user an admin
   * POST /api/admin/users/make-admin
   */
  @Post('make-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Make user admin',
    description: 'Grant admin role to an existing user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        role: {
          type: 'string',
          enum: ['ADMIN', 'SUPER_ADMIN', 'AGENT_MANAGER'],
          example: 'ADMIN',
        },
      },
      required: ['email', 'role'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
  })
  async makeUserAdmin(
    @Body() body: { email: string; role: 'ADMIN' | 'SUPER_ADMIN' | 'AGENT_MANAGER' },
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Making ${body.email} an ${body.role}`);
      await this.adminUserSeeder.makeUserAdmin(body.email, body.role);
      return {
        message: `${body.email} is now an ${body.role}`,
      };
    } catch (error) {
      this.logger.error(`Failed to make user admin: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove admin role from user
   * POST /api/admin/users/remove-admin
   */
  @Post('remove-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove admin role',
    description: 'Remove admin role from a user',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Admin role removed successfully',
  })
  async removeAdminRole(@Body() body: { email: string }): Promise<{ message: string }> {
    try {
      this.logger.log(`Removing admin role from ${body.email}`);
      await this.adminUserSeeder.removeAdminRole(body.email);
      return {
        message: `Admin role removed from ${body.email}`,
      };
    } catch (error) {
      this.logger.error(`Failed to remove admin role: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all admin users
   * GET /api/admin/users/list
   */
  @Get('list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List admin users',
    description: 'Get list of all users with admin roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin users retrieved successfully',
  })
  async listAdminUsers(): Promise<any[]> {
    try {
      this.logger.log('Listing admin users');
      return await this.adminUserSeeder.listAdminUsers();
    } catch (error) {
      this.logger.error(`Failed to list admin users: ${error.message}`);
      throw error;
    }
  }
}
