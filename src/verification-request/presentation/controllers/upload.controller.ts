import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthWithRoles } from '../../../auth/decorators/auth.decorator';
import { UserRole } from '../../../auth/interfaces/auth.interface';
import { FirebaseStorageService } from '../../../infrastructure/firebase/firebase-storage.service';

/**
 * File Upload Controller
 * Handles photo and document uploads for verification requests
 */
@ApiTags('File Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly storageService: FirebaseStorageService) {}

  /**
   * Upload questionnaire photos
   */
  @AuthWithRoles(UserRole.AGENT)
  @Post('questionnaire-photos')
  @UseInterceptors(FilesInterceptor('photos', 10)) // Max 10 photos
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload questionnaire photos',
    description: 'Upload photos for questionnaire responses (max 10 files)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photos: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Photos uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          example: ['https://storage.googleapis.com/...', 'https://storage.googleapis.com/...'],
        },
        count: { type: 'number', example: 2 },
      },
    },
  })
  async uploadQuestionnairePhotos(@UploadedFiles() files: Express.Multer.File[]) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }

      this.logger.log(`Uploading ${files.length} questionnaire photos`);

      // Validate file types
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
      const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.mimetype));
      
      if (invalidFiles.length > 0) {
        throw new BadRequestException('Only JPEG, PNG, and HEIC images are allowed');
      }

      // Validate file sizes (max 10MB per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = files.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        throw new BadRequestException('File size must not exceed 10MB');
      }

      // Upload files to Firebase Storage
      const uploadResults = await this.storageService.uploadMultipleFiles(
        files.map(file => ({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        })),
        'questionnaire-photos',
      );

      const urls = uploadResults.map(result => result.url);

      this.logger.log(`Successfully uploaded ${urls.length} photos`);

      return {
        urls,
        count: urls.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload questionnaire photos: ${error.message}`);
      throw error;
    }
  }
}
