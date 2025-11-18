import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AdminRequestTypeManagementService } from '../../application/services/admin-request-type-management.service';
import { CreateRequestTypeDto } from '../dto/create-request-type.dto';
import { UpdateRequestTypeDto } from '../dto/update-request-type.dto';
import { QueryRequestTypesDto } from '../dto/query-request-types.dto';
import { IRequestTypeConfig, IPriceCalculationResult } from '../../domain/interfaces/request-type-config.interface';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

/**
 * Admin Request Type Controller
 * Protected endpoints for administrators to manage request types
 * All endpoints require JWT authentication and ADMIN role
 */
@ApiTags('Admin - Request Types')
@ApiBearerAuth()
@Controller('admin/request-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminRequestTypeController {
  constructor(
    private readonly adminService: AdminRequestTypeManagementService,
  ) {}

  /**
   * Create a new request type
   * POST /api/admin/request-types
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create new request type',
    description: 'Create a new verification request type configuration' 
  })
  @ApiResponse({ status: 201, description: 'Request type created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async createRequestType(
    @Body() dto: CreateRequestTypeDto,
    @CurrentUser() user: any,
  ): Promise<IRequestTypeConfig> {
    return this.adminService.createRequestType(dto as any, user.uid || 'admin');
  }

  /**
   * Get all request types (including inactive)
   * GET /api/admin/request-types
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get all request types',
    description: 'Retrieve all verification request types including inactive ones' 
  })
  @ApiResponse({ status: 200, description: 'Request types retrieved successfully' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'phase', required: false, type: Number, description: 'Filter by phase (1 or 2)' })
  async getAllRequestTypes(
    @Query() query: QueryRequestTypesDto,
  ): Promise<IRequestTypeConfig[]> {
    if (query.isActive !== undefined) {
      // Filter by active status
      const allTypes = await this.adminService.getAllRequestTypes();
      return allTypes.filter((rt) => rt.isActive === query.isActive);
    }

    if (query.phase) {
      return this.adminService.getActiveRequestTypesByPhase(query.phase as 1 | 2);
    }

    return this.adminService.getAllRequestTypes();
  }

  /**
   * Get a single request type by ID
   * GET /api/admin/request-types/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get request type by ID',
    description: 'Retrieve a specific request type configuration by ID' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Request type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Request type not found' })
  async getRequestTypeById(
    @Param('id') id: string,
  ): Promise<IRequestTypeConfig> {
    return this.adminService.getRequestTypeById(id);
  }

  /**
   * Update a request type
   * PUT /api/admin/request-types/:id
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update request type',
    description: 'Update an existing request type configuration' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Request type updated successfully' })
  @ApiResponse({ status: 404, description: 'Request type not found' })
  async updateRequestType(
    @Param('id') id: string,
    @Body() dto: UpdateRequestTypeDto,
  ): Promise<IRequestTypeConfig> {
    return this.adminService.updateRequestType(id, dto as any);
  }

  /**
   * Toggle request type active status
   * PATCH /api/admin/request-types/:id/toggle
   */
  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Toggle request type active status',
    description: 'Enable or disable a request type' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  async toggleActive(@Param('id') id: string): Promise<IRequestTypeConfig> {
    return this.adminService.toggleActive(id);
  }

  /**
   * Set request type as default
   * PATCH /api/admin/request-types/:id/set-default
   */
  @Patch(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Set as default request type',
    description: 'Mark a request type as the default option' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Set as default successfully' })
  async setAsDefault(@Param('id') id: string): Promise<IRequestTypeConfig> {
    return this.adminService.setAsDefault(id);
  }

  /**
   * Change request type phase
   * PATCH /api/admin/request-types/:id/phase
   */
  @Patch(':id/phase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Change request type phase',
    description: 'Update the phase (1 or 2) for a request type' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Phase updated successfully' })
  async changePhase(
    @Param('id') id: string,
    @Body('phase') phase: 1 | 2,
  ): Promise<IRequestTypeConfig> {
    return this.adminService.changePhase(id, phase);
  }

  /**
   * Soft delete request type (mark as inactive)
   * DELETE /api/admin/request-types/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Soft delete request type',
    description: 'Mark a request type as inactive (soft delete)' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Request type soft deleted' })
  async deleteRequestType(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.adminService.deleteRequestType(id);
    return { message: 'Request type soft deleted successfully' };
  }

  /**
   * Permanently delete request type (use with caution)
   * DELETE /api/admin/request-types/:id/permanent
   */
  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Permanently delete request type',
    description: 'Permanently remove a request type from the database (use with caution)' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Request type permanently deleted' })
  async permanentlyDeleteRequestType(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.adminService.permanentlyDeleteRequestType(id);
    return { message: 'Request type permanently deleted' };
  }

  /**
   * Duplicate request type
   * POST /api/admin/request-types/:id/duplicate
   */
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Duplicate request type',
    description: 'Create a copy of an existing request type with a new name' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID to duplicate' })
  @ApiResponse({ status: 201, description: 'Request type duplicated successfully' })
  async duplicateRequestType(
    @Param('id') id: string,
    @Body('newName') newName: string,
    @CurrentUser() user: any,
  ): Promise<IRequestTypeConfig> {
    return this.adminService.duplicateRequestType(
      id,
      newName,
      user.uid || 'admin',
    );
  }

  /**
   * Reorder request types
   * POST /api/admin/request-types/reorder
   */
  @Post('reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reorder request types',
    description: 'Update the display order of request types' 
  })
  @ApiResponse({ status: 200, description: 'Request types reordered successfully' })
  async reorderRequestTypes(
    @Body('orderedIds') orderedIds: string[],
  ): Promise<{ message: string; updated: number }> {
    const updated = await this.adminService.reorderRequestTypes(orderedIds);
    return {
      message: 'Request types reordered successfully',
      updated: updated.length,
    };
  }

  /**
   * Bulk toggle active status
   * POST /api/admin/request-types/bulk-toggle
   */
  @Post('bulk-toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Bulk toggle active status',
    description: 'Enable or disable multiple request types at once' 
  })
  @ApiResponse({ status: 200, description: 'Bulk update completed successfully' })
  async bulkToggleActive(
    @Body('ids') ids: string[],
    @Body('isActive') isActive: boolean,
  ): Promise<{ message: string; updated: number }> {
    const updated = await this.adminService.bulkToggleActive(ids, isActive);
    return {
      message: `${updated.length} request types updated`,
      updated: updated.length,
    };
  }

  /**
   * Test price calculation for a request type
   * POST /api/admin/request-types/:id/test-price
   */
  @Post(':id/test-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Test price calculation',
    description: 'Test the price calculation for a request type with sample parameters' 
  })
  @ApiParam({ name: 'id', description: 'Request type ID' })
  @ApiResponse({ status: 200, description: 'Price calculation result' })
  async testPriceCalculation(
    @Param('id') id: string,
    @Body() params: Record<string, any>,
  ): Promise<IPriceCalculationResult> {
    return this.adminService.testPriceCalculation(id, params);
  }

  /**
   * Get request type statistics
   * GET /api/admin/request-types/stats/summary
   */
  @Get('stats/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get request type statistics',
    description: 'Retrieve summary statistics for all request types' 
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(): Promise<{
    total: number;
    active: number;
    phase1: number;
    phase2: number;
  }> {
    return this.adminService.getStatistics();
  }

  /**
   * Seed default request types
   * POST /api/admin/request-types/seed
   */
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Seed default request types',
    description: 'Initialize the database with default request type configurations' 
  })
  @ApiResponse({ status: 201, description: 'Default request types seeded successfully' })
  async seedDefaultTypes(
    @Body('phase') phase?: 1 | 2,
  ): Promise<{ message: string }> {
    await this.adminService.seedDefaultTypes(phase);
    const phaseText = phase ? `Phase ${phase}` : 'all';
    return {
      message: `Seeded ${phaseText} default request types`,
    };
  }
}
