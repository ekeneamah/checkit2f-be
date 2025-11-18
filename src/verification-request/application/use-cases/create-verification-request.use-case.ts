import { Injectable, Inject, Logger } from '@nestjs/common';
import { VerificationRequest, Location, Price, VerificationType, VerificationRequestStatus } from '../../domain';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';
import { CreateVerificationRequestDto, UpdateVerificationRequestDto } from '../dtos/verification-request.dto';

/**
 * Use case for creating verification requests
 * Handles business logic for request creation
 */
@Injectable()
export class CreateVerificationRequestUseCase {
  private readonly logger = new Logger(CreateVerificationRequestUseCase.name);

  constructor(
    @Inject('IVerificationRequestRepository')
    private readonly repository: IVerificationRequestRepository,
  ) {}

  /**
   * Execute create verification request use case
   */
  async execute(clientId: string, dto: CreateVerificationRequestDto): Promise<VerificationRequest> {
    try {
      this.logger.log(`Creating verification request for client: ${clientId}`);

      // Create value objects
      const location = new Location(
        dto.location.address,
        dto.location.latitude,
        dto.location.longitude,
        dto.location.placeId,
        dto.location.landmark,
        dto.location.accessInstructions,
      );

      const verificationType = new VerificationType(
        dto.verificationType.type,
        dto.verificationType.urgency,
        dto.verificationType.requiresPhysicalPresence,
        dto.verificationType.estimatedDuration,
        dto.verificationType.specialInstructions,
      );

      // Calculate price based on verification type
      const basePrice = verificationType.getBasePrice();
      const urgencyMultiplier = verificationType.getUrgencyMultiplier();
      const finalAmount = basePrice * urgencyMultiplier;
      
      const price = new Price(finalAmount, 'USD');

      // Create domain entity
      const verificationRequest = new VerificationRequest(
        clientId,
        dto.title,
        dto.description,
        verificationType,
        location,
        price,
      );

      // Add attachments if provided
      if (dto.attachments) {
        dto.attachments.forEach(attachment => {
          verificationRequest.addAttachment(attachment);
        });
      }

      // Add notes if provided
      if (dto.notes) {
        verificationRequest.updateNotes(dto.notes);
      }

      // Schedule if date provided
      if (dto.scheduledDate) {
        verificationRequest.schedule(new Date(dto.scheduledDate));
      }

      // Set payment reference and mark as pending payment if provided
      if (dto.paymentReference) {
        verificationRequest.setPendingPayment(dto.paymentReference);
      }

      // Save to repository
      const savedRequest = await this.repository.save(verificationRequest);

      this.logger.log(`Verification request created successfully: ${savedRequest.id}`);
      return savedRequest;

    } catch (error) {
      this.logger.error(`Failed to create verification request: ${error.message}`, error.stack);
      throw new Error(`Failed to create verification request: ${error.message}`);
    }
  }
}