// Domain entities exports
export { BaseEntity } from './entities/base.entity';
export { VerificationRequest } from './entities/verification-request.entity';

// Value objects exports
export { Location } from './value-objects/location.value-object';
export { Price } from './value-objects/price.value-object';
export { 
  VerificationType, 
  VerificationTypeEnum, 
  VerificationUrgency 
} from './value-objects/verification-type.value-object';
export { 
  VerificationStatus, 
  VerificationRequestStatus 
} from './value-objects/verification-status.value-object';