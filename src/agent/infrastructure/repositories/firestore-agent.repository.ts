import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../../../infrastructure/firebase/firebase.service';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { Agent } from '../../domain/entities/agent.entity';
import { AgentStatus, AvailabilityStatus, VerificationSpecialization } from '../../domain/enums/agent.enum';

/**
 * Firestore implementation of Agent Repository
 * 
 * Following:
 * - Single Responsibility Principle: Only handles agent persistence
 * - Dependency Inversion Principle: Depends on IAgentRepository interface
 */
@Injectable()
export class FirestoreAgentRepository implements IAgentRepository {
  private readonly logger = new Logger(FirestoreAgentRepository.name);
  private readonly collectionName = 'agents';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(agent: Agent): Promise<Agent> {
    try {
      const db = this.firebaseService.db;
      const agentData = agent.toJSON();

      await db.collection(this.collectionName).doc(agent.id).set(agentData);

      this.logger.log(`Agent created with ID: ${agent.id}`);
      return agent;
    } catch (error) {
      this.logger.error(`Failed to create agent: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create agent');
    }
  }

  async findById(id: string): Promise<Agent | null> {
    try {
      const db = this.firebaseService.db;
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return Agent.fromJSON({ id: doc.id, ...doc.data() });
    } catch (error) {
      this.logger.error(`Failed to find agent by ID ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve agent');
    }
  }

  async findByFirebaseUid(firebaseUid: string): Promise<Agent | null> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .where('firebaseUid', '==', firebaseUid)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return Agent.fromJSON({ id: doc.id, ...doc.data() });
    } catch (error) {
      this.logger.error(`Failed to find agent by Firebase UID: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve agent');
    }
  }

  async findByEmail(email: string): Promise<Agent | null> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .where('contactInfo.email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return Agent.fromJSON({ id: doc.id, ...doc.data() });
    } catch (error) {
      this.logger.error(`Failed to find agent by email: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve agent');
    }
  }

  async update(agent: Agent): Promise<Agent> {
    try {
      const db = this.firebaseService.db;
      const agentData = agent.toJSON();

      await db.collection(this.collectionName).doc(agent.id).update(agentData);

      this.logger.log(`Agent updated: ${agent.id}`);
      return agent;
    } catch (error) {
      this.logger.error(`Failed to update agent ${agent.id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update agent');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = this.firebaseService.db;
      await db.collection(this.collectionName).doc(id).delete();

      this.logger.log(`Agent deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete agent ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete agent');
    }
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<Agent[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => 
        Agent.fromJSON({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve agents: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve agents');
    }
  }

  async findByStatus(status: AgentStatus, limit: number = 50): Promise<Agent[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .where('status', '==', status)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => 
        Agent.fromJSON({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve agents by status: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve agents');
    }
  }

  async findAvailableInArea(
    city: string,
    specialization?: VerificationSpecialization,
  ): Promise<Agent[]> {
    try {
      const db = this.firebaseService.db;
      let query = db
        .collection(this.collectionName)
        .where('status', '==', AgentStatus.ACTIVE)
        .where('availabilityStatus', '==', AvailabilityStatus.AVAILABLE)
        .where('serviceArea.city', '==', city);

      if (specialization) {
        query = query.where('specializations', 'array-contains', specialization);
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => 
        Agent.fromJSON({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      this.logger.error(`Failed to find available agents: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to find available agents');
    }
  }

  async findByAvailability(
    availabilityStatus: AvailabilityStatus,
    limit: number = 50,
  ): Promise<Agent[]> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .where('availabilityStatus', '==', availabilityStatus)
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => 
        Agent.fromJSON({ id: doc.id, ...doc.data() })
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve agents by availability: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve agents');
    }
  }

  async count(): Promise<number> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db.collection(this.collectionName).count().get();
      return snapshot.data().count;
    } catch (error) {
      this.logger.error(`Failed to count agents: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to count agents');
    }
  }

  async countByStatus(status: AgentStatus): Promise<number> {
    try {
      const db = this.firebaseService.db;
      const snapshot = await db
        .collection(this.collectionName)
        .where('status', '==', status)
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      this.logger.error(`Failed to count agents by status: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to count agents');
    }
  }

  async emailExists(email: string): Promise<boolean> {
    const agent = await this.findByEmail(email);
    return agent !== null;
  }

  async firebaseUidExists(firebaseUid: string): Promise<boolean> {
    const agent = await this.findByFirebaseUid(firebaseUid);
    return agent !== null;
  }
}
