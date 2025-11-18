import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Firebase configuration service
 * Handles Firebase Admin SDK initialization and Firestore connection
 */
@Injectable()
export class FirebaseConfigService {
  private readonly logger = new Logger(FirebaseConfigService.name);
  private _firestore: admin.firestore.Firestore;
  private _isInitialized = false;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    try {
      const environment = this.configService.get<string>('NODE_ENV', 'development');
      
      // Check if Firebase app already exists
      if (admin.apps.length > 0) {
        this.logger.log('Firebase app already initialized');
        this._firestore = admin.firestore();
        this._isInitialized = true;
        return;
      }

      // In Cloud Functions, Firebase Admin SDK is auto-initialized
      // We just need to get the default app
      if (process.env.FUNCTION_NAME || process.env.K_SERVICE) {
        this.logger.log('Running in Firebase Cloud Functions environment');
        admin.initializeApp(); // Auto-uses application default credentials
        this._firestore = admin.firestore();
        this._isInitialized = true;
        this.logger.log('✅ Firebase initialized with Cloud Functions default credentials');
        return;
      }

      // For local development, use environment variables
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      // In development, allow running without Firebase credentials
      if (environment === 'development' && !clientEmail && !privateKey) {
        this.logger.warn('⚠️  Running in development mode without Firebase credentials');
        this.logger.warn('⚠️  Firebase/Firestore features will be disabled');
        this.logger.warn('💡 To enable Firebase, either:');
        this.logger.warn('   1. Set FIRESTORE_EMULATOR_HOST=localhost:8080 and run Firebase emulator');
        this.logger.warn('   2. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env');
        this._isInitialized = false;
        return;
      }

      // For development, you can use the Firebase Admin SDK with application default credentials
      // For production, use service account key
      if (projectId && clientEmail && privateKey) {
        // Production configuration with service account
        const serviceAccount = {
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          projectId,
        });

        this.logger.log('✅ Firebase initialized with service account credentials');
      } else {
        // Development configuration with application default credentials
        const devProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID', 'checkit24-dev');
        
        admin.initializeApp({
          projectId: devProjectId,
        });

        this.logger.log('✅ Firebase initialized with application default credentials');
      }

      this._firestore = admin.firestore();
      
      // Configure Firestore settings
      this._firestore.settings({
        timestampsInSnapshots: true,
        ignoreUndefinedProperties: true,
      });

      this._isInitialized = true;
      this.logger.log('✅ Firestore connection established successfully');

    } catch (error) {
      const environment = this.configService.get<string>('NODE_ENV', 'development');
      
      if (environment === 'development') {
        this.logger.warn('⚠️  Firebase initialization failed in development mode');
        this.logger.warn('⚠️  Application will continue without Firebase/Firestore');
        this.logger.error('Firebase error:', error.message);
        this._isInitialized = false;
      } else {
        this.logger.error('❌ Failed to initialize Firebase:', error);
        throw new Error(`Firebase initialization failed: ${error.message}`);
      }
    }
  }

  /**
   * Get Firestore instance
   */
  public get firestore(): admin.firestore.Firestore {
    if (!this._isInitialized) {
      throw new Error('Firebase not initialized. Please configure Firebase credentials or use Firebase emulator.');
    }
    return this._firestore;
  }

  /**
   * Get Firebase Admin instance
   */
  public get admin(): typeof admin {
    return admin;
  }

  /**
   * Check if Firebase is initialized
   */
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Get collection reference
   */
  public getCollection(collectionName: string): admin.firestore.CollectionReference {
    return this.firestore.collection(collectionName);
  }

  /**
   * Get document reference
   */
  public getDocument(collectionName: string, documentId: string): admin.firestore.DocumentReference {
    return this.firestore.collection(collectionName).doc(documentId);
  }

  /**
   * Create a batch operation
   */
  public createBatch(): admin.firestore.WriteBatch {
    return this.firestore.batch();
  }

  /**
   * Get server timestamp
   */
  public getServerTimestamp(): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Generate document ID
   */
  public generateDocumentId(): string {
    return this.firestore.collection('temp').doc().id;
  }

  /**
   * Test Firestore connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Try to list collections (works even if no collections exist)
      const collections = await this.firestore.listCollections();
      this.logger.log(`✅ Firestore connection test successful (${collections.length} collections found)`);
      return true;
    } catch (error) {
      // More lenient error handling - check if it's just a permission/not-found issue
      if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
        this.logger.warn('⚠️  Firestore database may not be initialized yet, but connection is valid');
        this.logger.warn('💡 Go to Firebase Console > Firestore Database to create the database');
        return true; // Still consider it as connected
      }
      
      this.logger.error('❌ Firestore connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Health check for Firestore
   */
  public async healthCheck(): Promise<{ status: string; timestamp: Date; projectId?: string }> {
    try {
      const isConnected = await this.testConnection();
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        projectId: projectId || 'default',
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }
}