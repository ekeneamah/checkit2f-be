import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { EvidenceCollectionService } from '../../application/services/evidence-collection.service';
import {
  UploadPhotoEvidenceDto,
  UploadVideoEvidenceDto,
  UploadDocumentEvidenceDto,
  CaptureSignatureDto,
  UploadVoiceMemoDto,
} from '../../application/dtos/evidence.dto';

/**
 * Evidence Collection Controller
 * 
 * Handles geo-tagged photo, video, document, signature, and voice memo
 * evidence capture for field verification operations.
 * 
 * @author CheckIT24 Development Team
 */
@ApiTags('Evidence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('evidence')
export class EvidenceController {
  private readonly logger = new Logger(EvidenceController.name);

  constructor(private readonly evidenceService: EvidenceCollectionService) {}

  // ============================================================================
  // PHOTO EVIDENCE
  // ============================================================================

  @Post('photo')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload geo-tagged photo evidence' })
  @ApiResponse({ status: 201, description: 'Photo evidence uploaded' })
  async uploadPhotoEvidence(
    @CurrentUser() user: any,
    @Body() dto: UploadPhotoEvidenceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }

    return this.evidenceService.uploadPhotoEvidence(
      user.uid,
      user.role,
      dto,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post('photo/validate')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Validate photo quality before upload' })
  @ApiResponse({ status: 200, description: 'Quality validation result' })
  async validatePhotoQuality(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { accuracy?: number },
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required for validation');
    }

    // Return basic quality info - full validation happens on upload
    return {
      isValid: file.size > 0 && file.size < 10 * 1024 * 1024, // 10MB max
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      gpsAccuracyProvided: dto.accuracy !== undefined,
    };
  }

  // ============================================================================
  // VIDEO EVIDENCE
  // ============================================================================

  @Post('video')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video evidence' })
  @ApiResponse({ status: 201, description: 'Video evidence uploaded' })
  async uploadVideoEvidence(
    @CurrentUser() user: any,
    @Body() dto: UploadVideoEvidenceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    return this.evidenceService.uploadVideoEvidence(
      user.uid,
      user.role,
      dto,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  // ============================================================================
  // DOCUMENT EVIDENCE
  // ============================================================================

  @Post('document')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload scanned document evidence' })
  @ApiResponse({ status: 201, description: 'Document evidence uploaded' })
  async uploadDocumentEvidence(
    @CurrentUser() user: any,
    @Body() dto: UploadDocumentEvidenceDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    return this.evidenceService.uploadDocumentEvidence(
      user.uid,
      user.role,
      dto,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  // ============================================================================
  // SIGNATURE EVIDENCE
  // ============================================================================

  @Post('signature')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capture digital signature' })
  @ApiResponse({ status: 201, description: 'Signature captured' })
  async captureSignature(
    @CurrentUser() user: any,
    @Body() dto: CaptureSignatureDto,
  ) {
    return this.evidenceService.captureSignature(
      user.uid,
      user.role,
      dto,
    );
  }

  // ============================================================================
  // VOICE MEMO EVIDENCE
  // ============================================================================

  @Post('voice-memo')
  @Roles(UserRole.COMPANY, UserRole.RIDER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload voice memo evidence' })
  @ApiResponse({ status: 201, description: 'Voice memo uploaded' })
  async uploadVoiceMemo(
    @CurrentUser() user: any,
    @Body() dto: UploadVoiceMemoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    return this.evidenceService.uploadVoiceMemo(
      user.uid,
      user.role,
      dto,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  // ============================================================================
  // COLLECTION STATUS
  // ============================================================================

  @Get('collection/:verificationRequestId')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get evidence collection status for a verification' })
  @ApiResponse({ status: 200, description: 'Collection status returned' })
  @ApiParam({ name: 'verificationRequestId', description: 'Verification request ID' })
  async getCollectionStatus(
    @Param('verificationRequestId') verificationRequestId: string,
  ) {
    return this.evidenceService.getCollectionStatus(verificationRequestId);
  }

  @Get('verification/:verificationRequestId')
  @Roles(UserRole.COMPANY, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all evidence for a verification request' })
  @ApiResponse({ status: 200, description: 'Evidence list returned' })
  @ApiParam({ name: 'verificationRequestId', description: 'Verification request ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by evidence type' })
  async getVerificationEvidence(
    @Param('verificationRequestId') verificationRequestId: string,
    @Query('type') type?: string,
  ) {
    const status = await this.evidenceService.getCollectionStatus(verificationRequestId);
    
    if (type) {
      return {
        verificationRequestId,
        type,
        items: status.collectedEvidence.filter((e: any) => e.type === type),
        count: status.collectedEvidence.filter((e: any) => e.type === type).length,
      };
    }

    return status;
  }
}
