import { Injectable, Logger } from '@nestjs/common';
import { FirebaseConfigService } from '../../shared/config/firebase-config.service';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
}

/**
 * Firebase Storage Service
 * Handles file uploads to Firebase Storage following SOLID principles
 */
@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private readonly bucket: ReturnType<admin.storage.Storage['bucket']>;

  constructor(
    private readonly firebaseConfig: FirebaseConfigService,
    private readonly configService: ConfigService,
  ) {
    // Get bucket name from environment or use default
    // Support both FIREBASE_* (local) and FB_* (production - Firebase reserves FIREBASE_ prefix)
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || this.configService.get<string>('FB_PROJECT_ID');
    const bucketName = this.configService.get<string>('FIREBASE_STORAGE_BUCKET') 
      || projectId + '.appspot.com';
    
    this.bucket = admin.storage().bucket(bucketName);
    this.logger.log(`Firebase Storage Service initialized with bucket: ${bucketName}`);
  }

  /**
   * Upload a file buffer to Firebase Storage
   * @param buffer - File buffer
   * @param originalname - Original filename
   * @param mimetype - File MIME type
   * @param folder - Storage folder path (e.g., 'questionnaire-photos', 'verification-evidence')
   */
  async uploadFile(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const fileExtension = originalname.split('.').pop();
      const filename = `${uuidv4()}.${fileExtension}`;
      const filepath = `${folder}/${filename}`;

      this.logger.log(`Uploading file: ${filepath}`);

      // Create file reference
      const file = this.bucket.file(filepath);

      // Upload buffer
      await file.save(buffer, {
        metadata: {
          contentType: mimetype,
          metadata: {
            originalName: originalname,
            uploadedAt: new Date().toISOString(),
          },
        },
        public: true, // Make file publicly accessible
      });

      // Get public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future expiry
      });

      this.logger.log(`File uploaded successfully: ${filename}`);

      return {
        url,
        path: filepath,
        filename,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * @param files - Array of file data
   * @param folder - Storage folder path
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
    folder: string = 'uploads',
  ): Promise<UploadResult[]> {
    try {
      this.logger.log(`Uploading ${files.length} files to ${folder}`);

      const uploadPromises = files.map(file =>
        this.uploadFile(file.buffer, file.originalname, file.mimetype, folder),
      );

      const results = await Promise.all(uploadPromises);
      
      this.logger.log(`Successfully uploaded ${results.length} files`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to upload multiple files: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param filepath - Full path to file in storage
   */
  async deleteFile(filepath: string): Promise<void> {
    try {
      this.logger.log(`Deleting file: ${filepath}`);
      
      const file = this.bucket.file(filepath);
      await file.delete();
      
      this.logger.log(`File deleted successfully: ${filepath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${filepath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete multiple files
   * @param filepaths - Array of file paths
   */
  async deleteMultipleFiles(filepaths: string[]): Promise<void> {
    try {
      this.logger.log(`Deleting ${filepaths.length} files`);

      const deletePromises = filepaths.map(path => this.deleteFile(path));
      await Promise.all(deletePromises);
      
      this.logger.log(`Successfully deleted ${filepaths.length} files`);
    } catch (error) {
      this.logger.error(`Failed to delete multiple files: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists
   * @param filepath - Full path to file in storage
   */
  async fileExists(filepath: string): Promise<boolean> {
    try {
      const file = this.bucket.file(filepath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check file existence ${filepath}: ${error.message}`);
      return false;
    }
  }
}
