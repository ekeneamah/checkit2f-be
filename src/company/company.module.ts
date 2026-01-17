import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '../shared/config/firebase.module';
import { ExternalServicesModule } from '../external-services/external-services.module';
import {
  CompanyController,
  RiderController,
  FleetController,
  AssignmentController,
  RiderAssignmentController,
} from './presentation/controllers';
import { AdminCompanyController } from './presentation/controllers/admin-company.controller';
import { CompanyAuthController } from './presentation/controllers/company-auth.controller';
import {
  CompanyService,
  RiderService,
  FleetService,
  AssignmentService,
  OnboardingService,
} from './application/services';
import { CompanyRepository } from './infrastructure/repositories';
import { EmailService } from '../external-services/notifications/email/email.service';

@Module({
  imports: [
    FirebaseModule,
    ConfigModule,
    forwardRef(() => ExternalServicesModule),
  ],
  controllers: [
    CompanyController,
    RiderController,
    FleetController,
    AssignmentController,
    RiderAssignmentController,
    AdminCompanyController,
    CompanyAuthController,
  ],
  providers: [
    CompanyRepository,
    CompanyService,
    RiderService,
    FleetService,
    AssignmentService,
    OnboardingService,
    EmailService,
  ],
  exports: [
    CompanyService,
    RiderService,
    FleetService,
    AssignmentService,
    OnboardingService,
    CompanyRepository,
  ],
})
export class CompanyModule {}
