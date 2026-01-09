/**
 * Notification Helper Service
 * 
 * Helper service to fetch user/agent details for notification payloads.
 * Follows Single Responsibility Principle - only handles data fetching for notifications.
 * 
 * @author CheckIT24 Development Team
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '@/infrastructure/firebase/firebase.service';
import { NotificationRecipient, LocationInfo, PriceInfo } from '../events/notification-payloads';

@Injectable()
export class NotificationHelperService {
  private readonly logger = new Logger(NotificationHelperService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Get user/client details for notification
   */
  async getClientDetails(clientId: string): Promise<NotificationRecipient> {
    try {
      const user = await this.firebaseService.findById('users', clientId);
      if (!user) {
        this.logger.warn(`Client not found: ${clientId}`);
        return {
          email: '',
          name: 'Unknown Client',
        };
      }

      return {
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Client',
        phone: user.phoneNumber || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get client details: ${error.message}`);
      return {
        email: '',
        name: 'Unknown Client',
      };
    }
  }

  /**
   * Get agent details for notification
   */
  async getAgentDetails(agentId: string): Promise<NotificationRecipient> {
    try {
      // Try agents collection first
      let agent = await this.firebaseService.findById('agents', agentId);
      
      // If not found in agents, try users collection
      if (!agent) {
        agent = await this.firebaseService.findById('users', agentId);
      }

      if (!agent) {
        this.logger.warn(`Agent not found: ${agentId}`);
        return {
          email: '',
          name: 'Unknown Agent',
        };
      }

      return {
        email: agent.email || '',
        name: agent.displayName || agent.name || agent.email?.split('@')[0] || 'Agent',
        phone: agent.phoneNumber || agent.phone || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get agent details: ${error.message}`);
      return {
        email: '',
        name: 'Unknown Agent',
      };
    }
  }

  /**
   * Build location info from verification request
   */
  buildLocationInfo(location: any): LocationInfo {
    return {
      address: location?.address || 'Unknown Address',
      city: location?.city || 'Unknown City',
      area: location?.area || undefined,
    };
  }

  /**
   * Build price info from verification request
   */
  buildPriceInfo(price: any): PriceInfo {
    return {
      amount: price?.amount || 0,
      currency: price?.currency || 'NGN',
    };
  }
}
