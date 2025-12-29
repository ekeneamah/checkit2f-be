import { Injectable, Inject, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { VerificationRequest, RejectionDetails } from '../../domain';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';
import { AssignAgentDto, ChangeStatusDto, CustomerRejectVerificationDto, SubmitVerificationDto } from '../dtos/verification-request.dto';

/**
 * Use case for updating verification requests
 * Handles business logic for status changes, assignments, and updates
 */
@Injectable()
export class UpdateVerificationRequestUseCase {
  private readonly logger = new Logger(UpdateVerificationRequestUseCase.name);

  constructor(
    @Inject('IVerificationRequestRepository')
    private readonly repository: IVerificationRequestRepository,
  ) {}

  /**
   * Assign agent to verification request
   */
  async assignAgent(requestId: string, dto: AssignAgentDto): Promise<VerificationRequest> {
    try {
      this.logger.log(`Assigning agent ${dto.agentId} to request: ${requestId}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Business logic validation
      if (!request.status.canBeAssigned()) {
        throw new BadRequestException(`Cannot assign agent to request in status: ${request.status.status}`);
      }

      // Assign agent using domain logic
      request.assignAgent(dto.agentId);

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Agent assigned successfully to request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to assign agent to request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change verification request status
   */
  async changeStatus(requestId: string, dto: ChangeStatusDto): Promise<VerificationRequest> {
    try {
      this.logger.log(`Changing status of request ${requestId} to: ${dto.status}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Handle different status changes using domain logic
      switch (dto.status) {
        case 'SUBMITTED':
          request.submit();
          break;
        case 'IN_PROGRESS':
          request.startVerification();
          break;
        case 'COMPLETED':
          request.complete();
          break;
        case 'CANCELLED':
          if (!dto.reason) {
            throw new BadRequestException('Reason is required for cancellation');
          }
          request.cancel(dto.reason);
          break;
        case 'REJECTED':
          if (!dto.reason) {
            throw new BadRequestException('Reason is required for rejection');
          }
          request.reject(dto.reason);
          break;
        default:
          throw new BadRequestException(`Invalid status: ${dto.status}`);
      }

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Status changed successfully for request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to change status of request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update payment information
   */
  async updatePayment(requestId: string, paymentId: string, paymentStatus: string): Promise<VerificationRequest> {
    try {
      this.logger.log(`Updating payment for request: ${requestId}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Update payment using domain logic
      request.updatePayment(paymentId, paymentStatus as any);

      // If payment is successful, submit the request
      if (paymentStatus === 'paid' && request.status.status === 'DRAFT') {
        request.submit();
      }

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Payment updated successfully for request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to update payment for request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add attachment to verification request
   */
  async addAttachment(requestId: string, attachmentUrl: string): Promise<VerificationRequest> {
    try {
      this.logger.log(`Adding attachment to request: ${requestId}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Add attachment using domain logic
      request.addAttachment(attachmentUrl);

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Attachment added successfully to request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to add attachment to request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Schedule verification request
   */
  async scheduleRequest(requestId: string, scheduledDate: Date): Promise<VerificationRequest> {
    try {
      this.logger.log(`Scheduling request: ${requestId} for ${scheduledDate.toISOString()}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Schedule using domain logic
      request.schedule(scheduledDate);

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Request scheduled successfully: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to schedule request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update notes for verification request
   */
  async updateNotes(requestId: string, notes: string): Promise<VerificationRequest> {
    try {
      this.logger.log(`Updating notes for request: ${requestId}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Update notes using domain logic
      request.updateNotes(notes);

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Notes updated successfully for request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to update notes for request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Customer accepts the verification result
   */
  async acceptByCustomer(requestId: string, clientId: string): Promise<VerificationRequest> {
    try {
      this.logger.log(`Customer ${clientId} accepting verification request: ${requestId}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Verify the customer owns this request
      if (request.clientId !== clientId) {
        throw new ForbiddenException('You can only respond to your own verification requests');
      }

      // Accept using domain logic
      request.acceptByCustomer();

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Verification accepted successfully by customer for request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to accept verification for request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Customer rejects the verification result
   */
  async rejectByCustomer(requestId: string, clientId: string, dto: CustomerRejectVerificationDto): Promise<VerificationRequest> {
    try {
      this.logger.log(`Customer ${clientId} rejecting verification request: ${requestId} with reason: ${dto.reason}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Verify the customer owns this request
      if (request.clientId !== clientId) {
        throw new ForbiddenException('You can only respond to your own verification requests');
      }

      // Create rejection details
      const rejectionDetails = new RejectionDetails(dto.reason, dto.notes, clientId);

      // Reject using domain logic
      request.rejectByCustomer(rejectionDetails);

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Verification rejected successfully by customer for request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to reject verification for request ${requestId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Agent submits verification result
   */
  async submitVerification(requestId: string, dto: SubmitVerificationDto, agentId: string): Promise<VerificationRequest> {
    try {
      this.logger.log(`Agent ${agentId} submitting verification for request: ${requestId}`);

      const request = await this.repository.findById(requestId);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${requestId} not found`);
      }

      // Verify the agent is assigned to this request
      if (request.assignedAgentId !== agentId) {
        throw new ForbiddenException('You can only submit verification for requests assigned to you');
      }

      // Complete the verification using domain logic
      request.complete();

      // Add verification details (this could be extended with specific verification result storage)
      // For now, we'll add the notes to the request notes field
      if (dto.notes) {
        request.updateNotes(dto.notes);
      }

      // Save updated request
      const updatedRequest = await this.repository.save(request);
      
      this.logger.log(`Verification submitted successfully by agent ${agentId} for request: ${requestId}`);
      return updatedRequest;

    } catch (error) {
      this.logger.error(`Failed to submit verification for request ${requestId}: ${error.message}`);
      throw error;
    }
  }
}