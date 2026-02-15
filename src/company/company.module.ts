import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from '../shared/config/firebase.module';
import { ExternalServicesModule } from '../external-services/external-services.module';
import { GeminiAIModule } from '../external-services/gemini-ai/gemini-ai.module';
import {
  CompanyController,
  RiderController,
  FleetController,
  AssignmentController,
  RiderAssignmentController,
  PartnerOnboardingController,
} from './presentation/controllers';
import { AdminCompanyController } from './presentation/controllers/admin-company.controller';
import { CompanyAuthController } from './presentation/controllers/company-auth.controller';
import {
  CompanyService,
  RiderService,
  FleetService,
  AssignmentService,
  OnboardingService,
  LocationDataService,
  PartnerOnboardingService,
} from './application/services';
import { CompanyRepository } from './infrastructure/repositories';
import { EmailService } from '../external-services/notifications/email/email.service';

@Module({
  imports: [
    FirebaseModule,
    ConfigModule,
    forwardRef(() => ExternalServicesModule),
    GeminiAIModule,
  ],
  controllers: [
    CompanyController,
    RiderController,
    FleetController,
    AssignmentController,
    RiderAssignmentController,
    AdminCompanyController,
    CompanyAuthController,
    PartnerOnboardingController,
  ],
  providers: [
    CompanyRepository,
    CompanyService,
    RiderService,
    FleetService,
    AssignmentService,
    OnboardingService,
    LocationDataService,
    PartnerOnboardingService,
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
