import { Injectable, Inject, Logger } from '@nestjs/common';
import { VerificationRequest, Location, Price, VerificationType, VerificationRequestStatus } from '../../domain';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';
import { CreateVerificationRequestDto, UpdateVerificationRequestDto } from '../dtos/verification-request.dto';
import { NotificationEmitterService } from '@/external-services/notifications/services/notification-emitter.service';
import { NotificationHelperService } from '@/external-services/notifications/services/notification-helper.service';

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
    private readonly notificationEmitter: NotificationEmitterService,
    private readonly notificationHelper: NotificationHelperService,
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
        dto.location.city,
        dto.location.area,
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

      // Use price from DTO if provided, otherwise calculate from verification type
      let price: Price;
      if (dto.price?.amount) {
        price = new Price(dto.price.amount, dto.price.currency || 'NGN');
        this.logger.log(`Using provided price: ${dto.price.amount} ${dto.price.currency || 'NGN'}`);
      } else {
        // Calculate price based on verification type
        const basePrice = verificationType.getBasePrice();
        const urgencyMultiplier = verificationType.getUrgencyMultiplier();
        const finalAmount = basePrice * urgencyMultiplier;
        price = new Price(finalAmount, 'NGN');
        this.logger.log(`Calculated price: ${finalAmount} NGN`);
      }

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

      // Emit notification event (async, non-blocking)
      this.emitRequestCreatedNotification(savedRequest, dto).catch(error => {
        this.logger.warn(`Failed to emit request created notification: ${error.message}`);
      });

      return savedRequest;

    } catch (error) {
      this.logger.error(`Failed to create verification request: ${error.message}`, error.stack);
      throw new Error(`Failed to create verification request: ${error.message}`);
    }
  }

  /**
   * Emit request created notification
   */
  private async emitRequestCreatedNotification(
    request: VerificationRequest,
    dto: CreateVerificationRequestDto,
  ): Promise<void> {
    try {
      const client = await this.notificationHelper.getClientDetails(request.clientId);
      
      this.notificationEmitter.emitRequestCreated({
        requestId: request.id,
        timestamp: new Date(),
        clientId: request.clientId,
        client,
        title: request.title,
        description: request.description,
        verificationType: dto.verificationType.type,
        urgency: dto.verificationType.urgency,
        location: this.notificationHelper.buildLocationInfo(dto.location),
        price: this.notificationHelper.buildPriceInfo(request.price),
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      });
    } catch (error) {
      this.logger.error(`Failed to emit request created notification: ${error.message}`);
    }
  }
}