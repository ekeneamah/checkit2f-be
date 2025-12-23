import {
  Injectable,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { Agent } from '../../domain/entities/agent.entity';
import { ContactInfo, ServiceArea } from '../../domain/value-objects';
import { RegisterAgentDto } from '../dtos/agent.dto';

/**
 * Register Agent Use Case
 * 
 * Responsibility: Handle agent registration business logic
 * Following Single Responsibility Principle
 */
@Injectable()
export class RegisterAgentUseCase {
  private readonly logger = new Logger(RegisterAgentUseCase.name);

  constructor(
    @Inject('IAgentRepository')
    private readonly agentRepository: IAgentRepository,
  ) {}

  async execute(dto: RegisterAgentDto): Promise<Agent> {
    this.logger.log(`Registering new agent: ${dto.email}`);

    // Check if email already exists
    const existingEmail = await this.agentRepository.emailExists(dto.email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if Firebase UID already exists
    const existingFirebaseUid = await this.agentRepository.firebaseUidExists(dto.firebaseUid);
    if (existingFirebaseUid) {
      throw new ConflictException('Firebase user already registered');
    }

    // Create value objects
    const contactInfo = ContactInfo.create(
      dto.email.toLowerCase(),
      dto.phoneNumber,
      dto.emergencyContact,
    );

    const serviceArea = ServiceArea.create(
      dto.city,
      dto.areas,
      dto.radius,
    );

    // Create agent entity
    const agentId = `agent_${uuidv4()}`;
    const agent = Agent.create(
      agentId,
      dto.firebaseUid,
      dto.firstName,
      dto.lastName,
      contactInfo,
      serviceArea,
      dto.specializations,
    );

    // Persist to database
    const savedAgent = await this.agentRepository.create(agent);

    this.logger.log(`Agent registered successfully: ${savedAgent.id}`);
    return savedAgent;
  }
}
