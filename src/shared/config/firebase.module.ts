import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseConfigService } from './firebase-config.service';

/**
 * Firebase module providing global Firebase services
 * Configured as global module for application-wide availability
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [FirebaseConfigService],
  exports: [FirebaseConfigService],
})
export class FirebaseModule {
  constructor(private firebaseConfig: FirebaseConfigService) {
    // Ensure Firebase is initialized when module loads
    console.log('🔥 Firebase module initialized');
    
    // Test connection on startup (non-blocking)
    this.firebaseConfig.testConnection().then(isConnected => {
      if (isConnected) {
        console.log('✅ Firebase/Firestore connection validated');
      } else {
        console.warn('⚠️  Firebase connection test inconclusive - check logs above');
      }
    }).catch(error => {
      console.error('❌ Firebase connection test error:', error.message);
    });
  }
}