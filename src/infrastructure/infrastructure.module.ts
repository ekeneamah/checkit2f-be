import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase/firebase.service';
import { FirebaseModule } from '../shared/config/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class InfrastructureModule {}