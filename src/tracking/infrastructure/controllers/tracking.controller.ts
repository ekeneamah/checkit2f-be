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
import { LocationTrackingService } from '../../application/services/location-tracking.service';
import {
  StartTrackingSessionDto,
  UpdateLocationDto,
  CreateGeofenceDto,
  CheckGeofenceDto,
  CheckInOutDto,
  RouteOptimizationRequestDto,
  GetNavigationDto,
  StartLiveShareDto,
} from '../../application/dtos/tracking.dto';

/**
 * Location Tracking Controller
 * 
 * Handles real-time GPS tracking, geofencing, route optimization,
 * and live location sharing for field agents.
 * 
 * @author CheckIT24 Development Team
 */
@ApiTags('Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tracking')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly trackingService: LocationTrackingService) {}

  // ============================================================================
  // REAL-TIME LOCATION TRACKING
  // ============================================================================

  @Post('session/start')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new tracking session' })
  @ApiResponse({ status: 201, description: 'Tracking session started' })
  async startTrackingSession(
    @CurrentUser() user: any,
    @Body() dto: StartTrackingSessionDto,
  ) {
    return this.trackingService.startTrackingSession(
      user.uid,
      user.role,
      dto,
    );
  }

  @Put('session/:sessionId/end')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'End an active tracking session' })
  @ApiResponse({ status: 200, description: 'Tracking session ended' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to end' })
  async endTrackingSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.trackingService.endTrackingSession(sessionId, user.uid);
  }

  @Post('location/update')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @CurrentUser() user: any,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.trackingService.updateLocation(user.uid, dto);
  }

  // ============================================================================
  // GEOFENCING
  // ============================================================================

  @Post('geofence')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a geofence zone' })
  @ApiResponse({ status: 201, description: 'Geofence created' })
  async createGeofence(
    @CurrentUser() user: any,
    @Body() dto: CreateGeofenceDto,
  ) {
    return this.trackingService.createGeofence(user.uid, dto);
  }

  @Post('geofence/check')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if location is within geofences' })
  @ApiResponse({ status: 200, description: 'Geofence status returned' })
  async checkGeofenceStatus(@Body() dto: CheckGeofenceDto) {
    return this.trackingService.checkGeofenceStatus(dto);
  }

  // ============================================================================
  // CHECK-IN/CHECK-OUT
  // ============================================================================

  @Post('check-in-out')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record check-in or check-out at a location' })
  @ApiResponse({ status: 201, description: 'Check-in/out recorded' })
  async recordCheckInOut(
    @CurrentUser() user: any,
    @Body() dto: CheckInOutDto,
  ) {
    return this.trackingService.recordCheckInOut(
      user.uid,
      user.role,
      dto,
    );
  }

  @Get('check-in-out/:verificationRequestId')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get check-in/out history for a verification' })
  @ApiResponse({ status: 200, description: 'Check-in history returned' })
  @ApiParam({ name: 'verificationRequestId', description: 'Verification request ID' })
  async getCheckInHistory(
    @Param('verificationRequestId') verificationRequestId: string,
  ) {
    return this.trackingService.getCheckInHistory(verificationRequestId);
  }

  // ============================================================================
  // ROUTE OPTIMIZATION & NAVIGATION
  // ============================================================================

  @Post('route/optimize')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Optimize route for multiple destinations' })
  @ApiResponse({ status: 200, description: 'Optimized route returned' })
  async optimizeRoute(@Body() dto: RouteOptimizationRequestDto) {
    return this.trackingService.optimizeRoute(dto);
  }

  @Post('navigation')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get turn-by-turn navigation' })
  @ApiResponse({ status: 200, description: 'Navigation route returned' })
  async getNavigation(@Body() dto: GetNavigationDto) {
    return this.trackingService.getNavigation(dto);
  }

  // ============================================================================
  // LIVE LOCATION SHARING
  // ============================================================================

  @Post('live-share/start')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start sharing live location' })
  @ApiResponse({ status: 201, description: 'Live sharing started' })
  async startLiveShare(
    @CurrentUser() user: any,
    @Body() dto: StartLiveShareDto,
  ) {
    return this.trackingService.startLiveShare(
      user.uid,
      user.role,
      dto,
    );
  }

  @Get('live-share/:shareToken')
  @ApiOperation({ summary: 'Get live location by share token' })
  @ApiResponse({ status: 200, description: 'Live location returned' })
  @ApiParam({ name: 'shareToken', description: 'Share token' })
  async getLiveLocation(@Param('shareToken') shareToken: string) {
    return this.trackingService.getLiveLocation(shareToken);
  }

  @Put('live-share/:shareId/stop')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Stop sharing live location' })
  @ApiResponse({ status: 200, description: 'Live sharing stopped' })
  @ApiParam({ name: 'shareId', description: 'Share session ID' })
  async stopLiveShare(
    @CurrentUser() user: any,
    @Param('shareId') shareId: string,
  ) {
    return this.trackingService.stopLiveShare(shareId, user.uid);
  }
}
