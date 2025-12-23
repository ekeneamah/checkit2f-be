import { Agent } from '../entities/agent.entity';
import { AgentStatus, AvailabilityStatus, VerificationSpecialization } from '../enums/agent.enum';

/**
 * Agent Repository Interface
 * Defines contract for agent data persistence
 * 
 * Following Interface Segregation Principle (ISP)
 * and Dependency Inversion Principle (DIP)
 */
export interface IAgentRepository {
  /**
   * Create a new agent
   */
  create(agent: Agent): Promise<Agent>;

  /**
   * Find agent by ID
   */
  findById(id: string): Promise<Agent | null>;

  /**
   * Find agent by Firebase UID
   */
  findByFirebaseUid(firebaseUid: string): Promise<Agent | null>;

  /**
   * Find agent by email
   */
  findByEmail(email: string): Promise<Agent | null>;

  /**
   * Update agent
   */
  update(agent: Agent): Promise<Agent>;

  /**
   * Delete agent
   */
  delete(id: string): Promise<void>;

  /**
   * Find all agents
   */
  findAll(limit?: number, offset?: number): Promise<Agent[]>;

  /**
   * Find agents by status
   */
  findByStatus(status: AgentStatus, limit?: number): Promise<Agent[]>;

  /**
   * Find available agents in a service area
   */
  findAvailableInArea(
    city: string,
    specialization?: VerificationSpecialization,
  ): Promise<Agent[]>;

  /**
   * Find agents by availability status
   */
  findByAvailability(
    availabilityStatus: AvailabilityStatus,
    limit?: number,
  ): Promise<Agent[]>;

  /**
   * Count total agents
   */
  count(): Promise<number>;

  /**
   * Count agents by status
   */
  countByStatus(status: AgentStatus): Promise<number>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Check if Firebase UID exists
   */
  firebaseUidExists(firebaseUid: string): Promise<boolean>;
}
