import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
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
import { SafetyService } from '../../application/services/safety.service';
import { LocationPoint } from '../../domain/entities/safety.entity';
import {
  TriggerSOSDto,
  UpdateSOSLocationDto,
  AcknowledgeSOSDto,
  ResolveSOSDto,
  SubmitIncidentReportDto,
  RecordCheckInDto,
  UpdateSafetySettingsDto,
  AddEmergencyContactDto,
  StartLiveLocationShareDto,
} from '../../application/dtos/safety.dto';

/**
 * Safety & Emergency Controller
 * 
 * Handles SOS alerts, incident reporting, safety check-ins,
 * and live location sharing for emergency situations.
 * 
 * CRITICAL: SOS endpoints have priority processing
 * 
 * @author CheckIT24 Development Team
 */
@ApiTags('Safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('safety')
export class SafetyController {
  private readonly logger = new Logger(SafetyController.name);

  constructor(private readonly safetyService: SafetyService) {}

  // ============================================================================
  // SOS ALERTS - CRITICAL
  // ============================================================================

  @Post('sos')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger SOS alert - CRITICAL' })
  @ApiResponse({ status: 201, description: 'SOS alert triggered' })
  async triggerSOS(
    @CurrentUser() user: any,
    @Body() dto: TriggerSOSDto,
  ) {
    const location: LocationPoint = {
      coordinates: {
        latitude: dto.location.coordinates.latitude,
        longitude: dto.location.coordinates.longitude,
      },
      accuracy: dto.location.accuracy,
      altitude: dto.location.altitude,
      speed: dto.location.speed,
      heading: dto.location.heading,
      timestamp: new Date(),
    };

    return this.safetyService.triggerSOS(
      user.uid,
      user.role,
      user.displayName || user.email || 'Unknown',
      user.phone || '',
      location,
      dto.emergencyType || 'sos',
      dto.message,
      dto.verificationRequestId,
      user.companyId,
    );
  }

  @Put('sos/location')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Update location during active SOS' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateSOSLocation(
    @Body() dto: UpdateSOSLocationDto,
  ) {
    const location: LocationPoint = {
      coordinates: {
        latitude: dto.location.coordinates.latitude,
        longitude: dto.location.coordinates.longitude,
      },
      accuracy: dto.location.accuracy,
      altitude: dto.location.altitude,
      speed: dto.location.speed,
      heading: dto.location.heading,
      timestamp: new Date(),
    };

    return this.safetyService.updateSOSLocation(dto.alertId, location);
  }

  @Put('sos/:alertId/acknowledge')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Acknowledge an SOS alert' })
  @ApiResponse({ status: 200, description: 'SOS acknowledged' })
  @ApiParam({ name: 'alertId', description: 'SOS alert ID' })
  async acknowledgeSOS(
    @CurrentUser() user: any,
    @Param('alertId') alertId: string,
  ) {
    return this.safetyService.acknowledgeSOS(alertId, user.uid);
  }

  @Put('sos/:alertId/resolve')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve an SOS alert' })
  @ApiResponse({ status: 200, description: 'SOS resolved' })
  @ApiParam({ name: 'alertId', description: 'SOS alert ID' })
  async resolveSOS(
    @CurrentUser() user: any,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveSOSDto,
  ) {
    return this.safetyService.resolveSOS(
      alertId,
      user.uid,
      dto.resolutionNotes,
      dto.isFalseAlarm,
    );
  }

  @Get('sos/active')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get active SOS alerts' })
  @ApiResponse({ status: 200, description: 'Active SOS alerts returned' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company' })
  async getActiveSOSAlerts(
    @Query('companyId') companyId?: string,
  ) {
    return this.safetyService.getActiveSOSAlerts(companyId);
  }

  // ============================================================================
  // INCIDENT REPORTS
  // ============================================================================

  @Post('incident')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit an incident report' })
  @ApiResponse({ status: 201, description: 'Incident report submitted' })
  async submitIncidentReport(
    @CurrentUser() user: any,
    @Body() dto: SubmitIncidentReportDto,
  ) {
    let location: LocationPoint | undefined;
    if (dto.location) {
      location = {
        coordinates: {
          latitude: dto.location.coordinates.latitude,
          longitude: dto.location.coordinates.longitude,
        },
        accuracy: dto.location.accuracy,
        timestamp: new Date(),
      };
    }

    return this.safetyService.submitIncidentReport(
      user.uid,
      user.role,
      {
        type: dto.type as any,
        severity: dto.severity,
        title: dto.title,
        description: dto.description,
        location,
        verificationRequestId: dto.verificationRequestId,
        occurredAt: new Date(dto.occurredAt),
        attachments: dto.attachments,
        witnesses: dto.witnesses,
      },
      user.companyId,
    );
  }

  @Get('incidents')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get incident reports' })
  @ApiResponse({ status: 200, description: 'Incident reports returned' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'verificationRequestId', required: false })
  async getIncidentReports(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.safetyService.getIncidentReports(userId || user.uid, status);
  }

  // ============================================================================
  // SAFETY CHECK-INS
  // ============================================================================

  @Post('check-in')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a safety check-in' })
  @ApiResponse({ status: 201, description: 'Check-in recorded' })
  async recordCheckIn(
    @CurrentUser() user: any,
    @Body() dto: RecordCheckInDto,
  ) {
    const location: LocationPoint = {
      coordinates: {
        latitude: dto.location.coordinates.latitude,
        longitude: dto.location.coordinates.longitude,
      },
      accuracy: dto.location.accuracy,
      timestamp: new Date(),
    };

    return this.safetyService.recordCheckIn(
      user.uid,
      user.role,
      location,
      dto.verificationRequestId,
      dto.notes,
    );
  }

  @Get('check-in/history')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get check-in history' })
  @ApiResponse({ status: 200, description: 'Check-in history returned' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'verificationRequestId', required: false })
  async getCheckInHistory(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.safetyService.getCheckInHistory(userId || user.uid, limit);
  }

  // ============================================================================
  // SAFETY SETTINGS
  // ============================================================================

  @Get('settings')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Get safety settings' })
  @ApiResponse({ status: 200, description: 'Safety settings returned' })
  async getSafetySettings(@CurrentUser() user: any) {
    return this.safetyService.getSafetySettings(user.uid);
  }

  @Put('settings')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Update safety settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSafetySettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateSafetySettingsDto,
  ) {
    return this.safetyService.updateSafetySettings(user.uid, dto);
  }

  // ============================================================================
  // EMERGENCY CONTACTS
  // ============================================================================

  @Post('contacts')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add emergency contact' })
  @ApiResponse({ status: 201, description: 'Contact added' })
  async addEmergencyContact(
    @CurrentUser() user: any,
    @Body() dto: AddEmergencyContactDto,
  ) {
    return this.safetyService.addEmergencyContact(user.uid, {
      name: dto.contact.name,
      phone: dto.contact.phone,
      email: dto.contact.email,
      relationship: dto.contact.relationship || 'Other',
      isPrimary: false,
      notifyOnSOS: dto.contact.notifyOnSOS ?? true,
    });
  }

  @Delete('contacts/:contactId')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Remove emergency contact' })
  @ApiResponse({ status: 200, description: 'Contact removed' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  async removeEmergencyContact(
    @CurrentUser() user: any,
    @Param('contactId') contactId: string,
  ) {
    return this.safetyService.removeEmergencyContact(user.uid, contactId);
  }

  // ============================================================================
  // LIVE LOCATION SHARING (EMERGENCY)
  // ============================================================================

  @Post('live-location/start')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start emergency live location sharing' })
  @ApiResponse({ status: 201, description: 'Live location started' })
  async startLiveLocation(
    @CurrentUser() user: any,
    @Body() dto: StartLiveLocationShareDto,
  ) {
    return this.safetyService.startLiveLocationShare(
      user.uid,
      user.role,
      dto.durationMinutes,
      dto.verificationRequestId,
      dto.sharedWith,
    );
  }

  @Get('live-location/:shareToken')
  @ApiOperation({ summary: 'Get live location by token' })
  @ApiResponse({ status: 200, description: 'Live location returned' })
  @ApiParam({ name: 'shareToken', description: 'Share token' })
  async getLiveLocation(@Param('shareToken') shareToken: string) {
    return this.safetyService.getLiveLocationByToken(shareToken);
  }

  @Put('live-location/:sessionId/stop')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @ApiOperation({ summary: 'Stop live location sharing' })
  @ApiResponse({ status: 200, description: 'Live location stopped' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async stopLiveLocation(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.safetyService.stopLiveLocationShare(sessionId, user.uid);
  }
}
