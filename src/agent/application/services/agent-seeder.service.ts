import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { Agent } from '../../domain/entities/agent.entity';
import { ContactInfo, ServiceArea } from '../../domain/value-objects';
import { VerificationSpecialization } from '../../domain/enums/agent.enum';

/**
 * Agent Seeder Service
 * 
 * Seeds sample agents into the database for testing and development
 */
@Injectable()
export class AgentSeederService {
  private readonly logger = new Logger(AgentSeederService.name);

  constructor(
    @Inject('IAgentRepository')
    private readonly agentRepository: IAgentRepository,
  ) {}

  /**
   * Seed sample agents
   */
  async seedAgents(): Promise<void> {
    this.logger.log('Starting agent seeding...');

    const agentsData = this.createSampleAgentsData();

    for (const agentData of agentsData) {
      try {
        const existing = await this.agentRepository.findByEmail(agentData.email);
        if (existing) {
          this.logger.log(`Agent already exists: ${agentData.email}`);
          continue;
        }

        // Create Firebase Auth user first
        let firebaseUser: admin.auth.UserRecord;
        try {
          firebaseUser = await admin.auth().createUser({
            email: agentData.email,
            password: agentData.password,
            displayName: `${agentData.firstName} ${agentData.lastName}`,
          });
          this.logger.log(`Created Firebase Auth user: ${firebaseUser.uid}`);
        } catch (error: any) {
          if (error.code === 'auth/email-already-exists') {
            firebaseUser = await admin.auth().getUserByEmail(agentData.email);
            this.logger.log(`Using existing Firebase Auth user: ${firebaseUser.uid}`);
          } else {
            throw error;
          }
        }

        // Create agent entity with real Firebase UID
        const contactInfo = ContactInfo.create(
          agentData.email,
          agentData.phone,
          agentData.alternatePhone,
        );
        const serviceArea = ServiceArea.create(
          agentData.city,
          agentData.areas,
          agentData.radius,
        );
        const agent = Agent.create(
          `agent_${uuidv4()}`,
          firebaseUser.uid, // Use real Firebase UID
          agentData.firstName,
          agentData.lastName,
          contactInfo,
          serviceArea,
          agentData.specializations,
        );
        agent.activate();

        await this.agentRepository.create(agent);
        this.logger.log(`Seeded agent: ${agent.fullName} (${agent.contactInfo.email})`);
      } catch (error) {
        this.logger.error(`Failed to seed agent ${agentData.email}: ${error.message}`);
      }
    }

    this.logger.log('Agent seeding completed');
  }

  /**
   * Create sample agents data
   */
  private createSampleAgentsData() {
    return [
      {
        email: 'john.lagos@checkit24.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Adebayo',
        phone: '+2348012345678',
        alternatePhone: '+2348012345679',
        city: 'Lagos',
        areas: ['Lekki', 'Victoria Island', 'Ikoyi', 'Ajah'],
        radius: 20,
        specializations: [VerificationSpecialization.PROPERTY_INSPECTION, VerificationSpecialization.ADDRESS_VERIFICATION],
      },
      {
        email: 'sarah.abuja@checkit24.com',
        password: 'Password123!',
        firstName: 'Sarah',
        lastName: 'Okonkwo',
        phone: '+2348023456789',
        alternatePhone: '+2348023456790',
        city: 'Abuja',
        areas: ['Maitama', 'Asokoro', 'Wuse', 'Garki'],
        radius: 25,
        specializations: [VerificationSpecialization.ALL],
      },
      {
        email: 'david.ph@checkit24.com',
        password: 'Password123!',
        firstName: 'David',
        lastName: 'Eze',
        phone: '+2348034567890',
        alternatePhone: '+2348034567891',
        city: 'Port Harcourt',
        areas: ['GRA', 'Trans Amadi', 'Rumuola', 'Eliozu'],
        radius: 15,
        specializations: [VerificationSpecialization.DOCUMENT_VERIFICATION, VerificationSpecialization.IDENTITY_VERIFICATION, VerificationSpecialization.BUSINESS_VERIFICATION],
      },
      {
        email: 'blessing.ibadan@checkit24.com',
        password: 'Password123!',
        firstName: 'Blessing',
        lastName: 'Oluwaseun',
        phone: '+2348045678901',
        alternatePhone: '+2348045678902',
        city: 'Ibadan',
        areas: ['Bodija', 'UI', 'Ring Road', 'Dugbe'],
        radius: 18,
        specializations: [VerificationSpecialization.VEHICLE_INSPECTION, VerificationSpecialization.ASSET_VERIFICATION],
      },
      {
        email: 'chioma.lagos@checkit24.com',
        password: 'Password123!',
        firstName: 'Chioma',
        lastName: 'Nwankwo',
        phone: '+2348056789012',
        alternatePhone: '+2348056789013',
        city: 'Lagos',
        areas: ['Ikeja', 'Surulere', 'Yaba', 'Maryland'],
        radius: 22,
        specializations: [VerificationSpecialization.PROPERTY_INSPECTION, VerificationSpecialization.ADDRESS_VERIFICATION, VerificationSpecialization.BUSINESS_VERIFICATION],
      },
    ];
  }
}
