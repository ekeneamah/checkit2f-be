import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';

import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { Agent } from '../../domain/entities/agent.entity';
import { ContactInfo, ServiceArea } from '../../domain/value-objects';
import {
  UpdateAgentProfileDto,
  UpdateServiceAreaDto,
  UpdateSpecializationsDto,
  UpdateAvailabilityDto,
} from '../dtos/agent.dto';

/**
 * Update Agent Use Case
 * 
 * Responsibility: Handle agent updates
 * Following Single Responsibility Principle
 */
@Injectable()
export class UpdateAgentUseCase {
  private readonly logger = new Logger(UpdateAgentUseCase.name);

  constructor(
    @Inject('IAgentRepository')
    private readonly agentRepository: IAgentRepository,
  ) {}

  /**
   * Update agent profile
   */
  async updateProfile(
    agentId: string,
    firebaseUid: string,
    dto: UpdateAgentProfileDto,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Verify ownership
    if (agent.firebaseUid !== firebaseUid) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Update profile fields
    if (dto.firstName || dto.lastName || dto.profilePhotoUrl) {
      agent.updateProfile(
        dto.firstName || agent.firstName,
        dto.lastName || agent.lastName,
        dto.profilePhotoUrl,
      );
    }

    // Update contact info if phone number changed
    if (dto.phoneNumber || dto.emergencyContact) {
      const newContactInfo = ContactInfo.create(
        agent.contactInfo.email,
        dto.phoneNumber || agent.contactInfo.phoneNumber,
        dto.emergencyContact !== undefined ? dto.emergencyContact : agent.contactInfo.emergencyContact,
      );
      agent.updateContactInfo(newContactInfo);
    }

    const updatedAgent = await this.agentRepository.update(agent);
    this.logger.log(`Agent profile updated: ${agentId}`);
    return updatedAgent;
  }

  /**
   * Update service area
   */
  async updateServiceArea(
    agentId: string,
    firebaseUid: string,
    dto: UpdateServiceAreaDto,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.firebaseUid !== firebaseUid) {
      throw new ForbiddenException('You can only update your own service area');
    }

    const serviceArea = ServiceArea.create(dto.city, dto.areas, dto.radius);
    agent.updateServiceArea(serviceArea);

    const updatedAgent = await this.agentRepository.update(agent);
    this.logger.log(`Agent service area updated: ${agentId}`);
    return updatedAgent;
  }

  /**
   * Update specializations
   */
  async updateSpecializations(
    agentId: string,
    firebaseUid: string,
    dto: UpdateSpecializationsDto,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.firebaseUid !== firebaseUid) {
      throw new ForbiddenException('You can only update your own specializations');
    }

    agent.updateSpecializations(dto.specializations);

    const updatedAgent = await this.agentRepository.update(agent);
    this.logger.log(`Agent specializations updated: ${agentId}`);
    return updatedAgent;
  }

  /**
   * Update availability status
   */
  async updateAvailability(
    agentId: string,
    firebaseUid: string,
    dto: UpdateAvailabilityDto,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.firebaseUid !== firebaseUid) {
      throw new ForbiddenException('You can only update your own availability');
    }

    agent.setAvailability(dto.availabilityStatus);

    const updatedAgent = await this.agentRepository.update(agent);
    this.logger.log(`Agent availability updated: ${agentId} - ${dto.availabilityStatus}`);
    return updatedAgent;
  }

  /**
   * Go online
   */
  async goOnline(agentId: string, firebaseUid: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.firebaseUid !== firebaseUid) {
      throw new ForbiddenException('Unauthorized');
    }

    agent.goOnline();
    return this.agentRepository.update(agent);
  }

  /**
   * Go offline
   */
  async goOffline(agentId: string, firebaseUid: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.firebaseUid !== firebaseUid) {
      throw new ForbiddenException('Unauthorized');
    }

    agent.goOffline();
    return this.agentRepository.update(agent);
  }

  /**
   * Admin: Activate agent
   */
  async activateAgent(agentId: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.activate();
    const updatedAgent = await this.agentRepository.update(agent);
    this.logger.log(`Agent activated: ${agentId}`);
    return updatedAgent;
  }

  /**
   * Admin: Suspend agent
   */
  async suspendAgent(agentId: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.suspend();
    const updatedAgent = await this.agentRepository.update(agent);
    this.logger.log(`Agent suspended: ${agentId}`);
    return updatedAgent;
  }
}
