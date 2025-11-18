import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { VerificationRequest } from '../../domain';
import { IVerificationRequestRepository } from '../interfaces/verification-request.repository.interface';
import { VerificationRequestQueryDto } from '../dtos/verification-request.dto';
import { VerificationRequestStatus } from '../../domain/value-objects/verification-status.value-object';

/**
 * Use case for querying verification requests
 * Handles business logic for searching and filtering requests
 */
@Injectable()
export class GetVerificationRequestsUseCase {
  private readonly logger = new Logger(GetVerificationRequestsUseCase.name);

  constructor(
    @Inject('IVerificationRequestRepository')
    private readonly repository: IVerificationRequestRepository,
  ) {}

  /**
   * Get verification request by ID
   */
  async getById(id: string): Promise<VerificationRequest> {
    try {
      this.logger.log(`Getting verification request by ID: ${id}`);

      const request = await this.repository.findById(id);
      if (!request) {
        throw new NotFoundException(`Verification request with ID ${id} not found`);
      }

      return request;
    } catch (error) {
      this.logger.error(`Failed to get verification request ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification requests by client ID
   */
  async getByClientId(clientId: string, query: VerificationRequestQueryDto): Promise<{
    items: VerificationRequest[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.log(`Getting verification requests for client: ${clientId}`);

      const options = {
        limit: query.limit || 10,
        offset: ((query.page || 1) - 1) * (query.limit || 10),
        status: query.status,
      };

      const requests = await this.repository.findByClientId(clientId, options);
      const total = await this.repository.count({ clientId, status: query.status });

      return {
        items: requests,
        total,
        page: query.page || 1,
        totalPages: Math.ceil(total / (query.limit || 10)),
      };
    } catch (error) {
      this.logger.error(`Failed to get verification requests for client ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification requests with advanced filtering
   */
  async getWithFilters(query: VerificationRequestQueryDto): Promise<{
    items: VerificationRequest[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.log('Getting verification requests with filters');

      const filters = {
        status: query.status,
        verificationType: query.type,
        agentId: query.agentId,
      };

      const options = {
        limit: query.limit || 10,
        offset: ((query.page || 1) - 1) * (query.limit || 10),
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'desc',
      };

      return await this.repository.findWithFilters(filters, options);
    } catch (error) {
      this.logger.error(`Failed to get verification requests with filters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification requests by agent ID
   */
  async getByAgentId(agentId: string, query: VerificationRequestQueryDto): Promise<VerificationRequest[]> {
    try {
      this.logger.log(`Getting verification requests for agent: ${agentId}`);

      const options = {
        limit: query.limit || 10,
        offset: ((query.page || 1) - 1) * (query.limit || 10),
        status: query.status,
      };

      return await this.repository.findByAgentId(agentId, options);
    } catch (error) {
      this.logger.error(`Failed to get verification requests for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get overdue verification requests
   */
  async getOverdueRequests(): Promise<VerificationRequest[]> {
    try {
      this.logger.log('Getting overdue verification requests');
      return await this.repository.findOverdueRequests();
    } catch (error) {
      this.logger.error(`Failed to get overdue verification requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for a client
   */
  async getClientStats(clientId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
  }> {
    try {
      this.logger.log(`Getting dashboard stats for client: ${clientId}`);

      // Get all client requests to calculate stats
      const allRequests = await this.repository.findByClientId(clientId, {});

      const total = allRequests.length;
      const active = allRequests.filter(
        (r) => 
          r.status.status === VerificationRequestStatus.SUBMITTED || 
          r.status.status === VerificationRequestStatus.ASSIGNED || 
          r.status.status === VerificationRequestStatus.IN_PROGRESS
      ).length;
      const completed = allRequests.filter((r) => r.status.status === VerificationRequestStatus.COMPLETED).length;
      const cancelled = allRequests.filter((r) => r.status.status === VerificationRequestStatus.CANCELLED).length;
      const totalSpent = allRequests
        .filter((r) => r.status.status === VerificationRequestStatus.COMPLETED)
        .reduce((sum, r) => sum + (r.price?.amount || 0), 0);

      return {
        total,
        active,
        completed,
        cancelled,
        totalSpent,
      };
    } catch (error) {
      this.logger.error(`Failed to get client stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent verification requests for a client
   */
  async getRecentByClientId(clientId: string, limit: number = 5): Promise<VerificationRequest[]> {
    try {
      this.logger.log(`Getting ${limit} recent requests for client: ${clientId}`);

      const requests = await this.repository.findByClientId(clientId, {
        limit,
        offset: 0,
      });

      return requests;
    } catch (error) {
      this.logger.error(`Failed to get recent requests for client ${clientId}: ${error.message}`);
      throw error;
    }
  }
}