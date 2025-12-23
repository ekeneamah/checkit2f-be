import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';

import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { Agent } from '../../domain/entities/agent.entity';

/**
 * Get Agent Use Case
 * 
 * Responsibility: Retrieve agent information
 * Following Single Responsibility Principle
 */
@Injectable()
export class GetAgentUseCase {
  private readonly logger = new Logger(GetAgentUseCase.name);

  constructor(
    @Inject('IAgentRepository')
    private readonly agentRepository: IAgentRepository,
  ) {}

  /**
   * Get agent by ID
   */
  async getById(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  /**
   * Get agent by Firebase UID
   */
  async getByFirebaseUid(firebaseUid: string): Promise<Agent> {
    const agent = await this.agentRepository.findByFirebaseUid(firebaseUid);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  /**
   * Get agent by email
   */
  async getByEmail(email: string): Promise<Agent> {
    const agent = await this.agentRepository.findByEmail(email.toLowerCase());
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    return agent;
  }

  /**
   * Get all agents
   */
  async getAll(limit?: number, offset?: number): Promise<Agent[]> {
    return this.agentRepository.findAll(limit, offset);
  }

  /**
   * Get available agents in a service area
   */
  async getAvailableInArea(city: string, specialization?: any): Promise<Agent[]> {
    return this.agentRepository.findAvailableInArea(city, specialization);
  }
}
