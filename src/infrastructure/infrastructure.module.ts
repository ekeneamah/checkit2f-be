import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase/firebase.service';
import { FirebaseStorageService } from './firebase/firebase-storage.service';
import { FirebaseModule } from '../shared/config/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [FirebaseService, FirebaseStorageService],
  exports: [FirebaseService, FirebaseStorageService],
})
export class InfrastructureModule {}