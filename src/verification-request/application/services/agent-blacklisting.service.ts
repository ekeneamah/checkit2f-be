import { Injectable, Logger } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import {
  AgentFailureModel,
  AgentSuspensionModel,
} from '../../domain/models/firestore-collections.model';

// Firestore collection names
const AGENT_FAILURES_COLLECTION = 'agent_failures';
const AGENT_SUSPENSIONS_COLLECTION = 'agent_suspensions';

/**
 * Agent Blacklist Entry
 */
export interface IAgentBlacklistEntry {
  agentId: string;
  requestId: string;
  failureReason: string;
  failedAt: Date;
  canRetry: boolean; // False for per-request blacklist
}

/**
 * Agent Suspension Details
 */
export interface IAgentSuspensionDetails {
  agentId: string;
  isSuspended: boolean;
  suspendedUntil?: Date;
  suspensionReason?: string;
  failureCount?: number;
  canAppeal: boolean;
}

/**
 * Agent Blacklisting Service
 * Manages per-request blacklisting and platform-wide suspensions
 * Business Rule: 5 failures in 30 days = 30-day suspension
 */
@Injectable()
export class AgentBlacklistingService {
  private readonly logger = new Logger(AgentBlacklistingService.name);

  // Business rules configuration
  private readonly SUSPENSION_THRESHOLD = 5; // failures
  private readonly SUSPENSION_PERIOD_DAYS = 30;
  private readonly FAILURE_WINDOW_DAYS = 30;
  private readonly SUSPENSION_DURATION_DAYS = 30;

  constructor(private readonly firestore: Firestore) {}

  /**
   * Record agent failure for a request
   * Implements per-request blacklisting
   */
  async recordFailure(
    agentId: string,
    agentName: string,
    requestId: string,
    requestNumber: string,
    requestTypeId: string,
    requestTypeName: string,
    failureType: 'TIMEOUT' | 'CANCELLATION' | 'NO_SHOW' | 'POOR_QUALITY' | 'CUSTOMER_COMPLAINT',
    failureReason: string,
  ): Promise<{
    recorded: boolean;
    blacklistedForRequest: boolean;
    suspensionTriggered: boolean;
    suspensionDetails?: IAgentSuspensionDetails;
  }> {
    this.logger.log(
      `Recording failure for agent ${agentId} on request ${requestId}`,
    );

    const now = new Date();

    // Create failure record
    const failure: AgentFailureModel = {
      id: this.firestore.collection(AGENT_FAILURES_COLLECTION).doc().id,
      agentId,
      agentName,
      requestId,
      requestNumber,
      requestTypeId,
      requestTypeName,
      failureType,
      failureReason,
      failedAt: now,
      disputed: false,
      disputeReason: null,
      disputeStatus: null,
      disputeResolvedAt: null,
      suspensionId: null,
      createdAt: now,
    };

    // Save to Firestore
    await this.firestore
      .collection(AGENT_FAILURES_COLLECTION)
      .doc(failure.id)
      .set(failure);

    this.logger.debug(`Failure recorded: ${failure.id}`);

    // Per-request blacklist: Agent cannot re-accept this specific request
    const blacklistedForRequest = true;

    // Check if this triggers platform-wide suspension
    const recentFailures = await this.getRecentFailures(agentId);
    let suspensionTriggered = false;
    let suspensionDetails: IAgentSuspensionDetails | undefined;

    if (recentFailures >= this.SUSPENSION_THRESHOLD) {
      this.logger.warn(
        `Agent ${agentId} has ${recentFailures} failures in ${this.FAILURE_WINDOW_DAYS} days - triggering suspension`,
      );

      suspensionDetails = await this.suspendAgent(
        agentId,
        agentName,
        `${recentFailures} failures in ${this.FAILURE_WINDOW_DAYS} days`,
      );
      suspensionTriggered = true;
    }

    return {
      recorded: true,
      blacklistedForRequest,
      suspensionTriggered,
      suspensionDetails,
    };
  }

  /**
   * Check if agent is blacklisted for a specific request
   */
  async isBlacklistedForRequest(
    agentId: string,
    requestId: string,
  ): Promise<boolean> {
    const snapshot = await this.firestore
      .collection(AGENT_FAILURES_COLLECTION)
      .where('agentId', '==', agentId)
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    const isBlacklisted = !snapshot.empty;

    if (isBlacklisted) {
      this.logger.debug(
        `Agent ${agentId} is blacklisted for request ${requestId}`,
      );
    }

    return isBlacklisted;
  }

  /**
   * Check if agent is currently suspended platform-wide
   */
  async isSuspended(agentId: string): Promise<IAgentSuspensionDetails> {
    const snapshot = await this.firestore
      .collection(AGENT_SUSPENSIONS_COLLECTION)
      .where('agentId', '==', agentId)
      .where('status', '==', 'ACTIVE')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        agentId,
        isSuspended: false,
        canAppeal: false,
      };
    }

    const suspension = snapshot.docs[0].data() as AgentSuspensionModel;
    const now = new Date();

    // Check if suspension has expired
    if (suspension.suspendedUntil && now > suspension.suspendedUntil) {
      this.logger.log(
        `Suspension for agent ${agentId} has expired, reinstating`,
      );
      await this.reinstateAgent(agentId);

      return {
        agentId,
        isSuspended: false,
        canAppeal: false,
      };
    }

    return {
      agentId,
      isSuspended: true,
      suspendedUntil: suspension.suspendedUntil,
      suspensionReason: suspension.suspensionReason,
      failureCount: suspension.failureCount,
      canAppeal: true,
    };
  }

  /**
   * Suspend an agent platform-wide
   */
  async suspendAgent(
    agentId: string,
    agentName: string,
    suspensionReason: string,
  ): Promise<IAgentSuspensionDetails> {
    this.logger.warn(`Suspending agent ${agentId}: ${suspensionReason}`);

    const now = new Date();
    const suspendedUntil = new Date(now);
    suspendedUntil.setDate(suspendedUntil.getDate() + this.SUSPENSION_DURATION_DAYS);

    const recentFailures = await this.getRecentFailures(agentId);

    // Get recent failure IDs
    const failureSnapshot = await this.firestore
      .collection(AGENT_FAILURES_COLLECTION)
      .where('agentId', '==', agentId)
      .orderBy('failedAt', 'desc')
      .limit(this.SUSPENSION_THRESHOLD)
      .get();

    const failureIds = failureSnapshot.docs.map((doc) => doc.id);

    const suspension: AgentSuspensionModel = {
      id: this.firestore.collection(AGENT_SUSPENSIONS_COLLECTION).doc().id,
      agentId,
      agentName,
      suspensionReason,
      failureCount: recentFailures,
      failureIds: JSON.stringify(failureIds),
      suspendedAt: now,
      suspendedUntil,
      status: 'ACTIVE',
      liftedBy: null,
      liftedAt: null,
      liftReason: null,
      reinstatedAt: null,
      failureCountReset: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.firestore
      .collection(AGENT_SUSPENSIONS_COLLECTION)
      .doc(suspension.id)
      .set(suspension);

    // Update failure records with suspension ID
    const batch = this.firestore.batch();
    failureSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { suspensionId: suspension.id });
    });
    await batch.commit();

    this.logger.log(
      `Agent ${agentId} suspended until ${suspendedUntil.toISOString()}`,
    );

    return {
      agentId,
      isSuspended: true,
      suspendedUntil,
      suspensionReason,
      failureCount: recentFailures,
      canAppeal: true,
    };
  }

  /**
   * Reinstate a suspended agent
   */
  async reinstateAgent(agentId: string): Promise<void> {
    this.logger.log(`Reinstating agent ${agentId}`);

    const snapshot = await this.firestore
      .collection(AGENT_SUSPENSIONS_COLLECTION)
      .where('agentId', '==', agentId)
      .where('status', '==', 'ACTIVE')
      .get();

    const batch = this.firestore.batch();
    const now = new Date();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'EXPIRED',
        reinstatedAt: now,
        updatedAt: now,
      });
    });

    await batch.commit();

    this.logger.log(`Agent ${agentId} reinstated successfully`);
  }

  /**
   * Get count of recent failures within the failure window
   */
  async getRecentFailures(agentId: string): Promise<number> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - this.FAILURE_WINDOW_DAYS);

    const snapshot = await this.firestore
      .collection(AGENT_FAILURES_COLLECTION)
      .where('agentId', '==', agentId)
      .where('failedAt', '>=', windowStart)
      .get();

    const count = snapshot.size;

    this.logger.debug(
      `Agent ${agentId} has ${count} failures in last ${this.FAILURE_WINDOW_DAYS} days`,
    );

    return count;
  }

  /**
   * Get all failures for an agent
   */
  async getAgentFailures(
    agentId: string,
    limit: number = 50,
  ): Promise<IAgentBlacklistEntry[]> {
    const snapshot = await this.firestore
      .collection(AGENT_FAILURES_COLLECTION)
      .where('agentId', '==', agentId)
      .orderBy('failedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as AgentFailureModel;
      return {
        agentId: data.agentId,
        requestId: data.requestId,
        failureReason: data.failureReason,
        failedAt: data.failedAt,
        canRetry: false, // Per-request blacklist means no retry
      };
    });
  }

  /**
   * Get suspension history for an agent
   */
  async getSuspensionHistory(
    agentId: string,
  ): Promise<AgentSuspensionModel[]> {
    const snapshot = await this.firestore
      .collection(AGENT_SUSPENSIONS_COLLECTION)
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as AgentSuspensionModel);
  }

  /**
   * Manually lift a suspension (admin action)
   */
  async manuallyLiftSuspension(
    agentId: string,
    liftedBy: string,
    liftReason: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Manually lifting suspension for agent ${agentId} by ${liftedBy}`);

    const snapshot = await this.firestore
      .collection(AGENT_SUSPENSIONS_COLLECTION)
      .where('agentId', '==', agentId)
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        success: false,
        message: 'No active suspension found',
      };
    }

    const suspensionDoc = snapshot.docs[0];
    await suspensionDoc.ref.update({
      status: 'MANUALLY_LIFTED',
      liftedBy,
      liftedAt: new Date(),
      liftReason,
      updatedAt: new Date(),
    });

    this.logger.log(`Suspension lifted for agent ${agentId}`);

    return {
      success: true,
      message: 'Suspension lifted successfully',
    };
  }

  /**
   * Get statistics for blacklisting and suspensions
   */
  async getStatistics(): Promise<{
    totalFailures: number;
    totalSuspensions: number;
    activeSuspensions: number;
    expiredSuspensions: number;
    manuallyLiftedSuspensions: number;
  }> {
    const [
      failuresSnapshot,
      suspensionsSnapshot,
      activeSuspensionsSnapshot,
      expiredSuspensionsSnapshot,
      liftedSuspensionsSnapshot,
    ] = await Promise.all([
      this.firestore.collection(AGENT_FAILURES_COLLECTION).get(),
      this.firestore.collection(AGENT_SUSPENSIONS_COLLECTION).get(),
      this.firestore
        .collection(AGENT_SUSPENSIONS_COLLECTION)
        .where('status', '==', 'ACTIVE')
        .get(),
      this.firestore
        .collection(AGENT_SUSPENSIONS_COLLECTION)
        .where('status', '==', 'EXPIRED')
        .get(),
      this.firestore
        .collection(AGENT_SUSPENSIONS_COLLECTION)
        .where('status', '==', 'MANUALLY_LIFTED')
        .get(),
    ]);

    return {
      totalFailures: failuresSnapshot.size,
      totalSuspensions: suspensionsSnapshot.size,
      activeSuspensions: activeSuspensionsSnapshot.size,
      expiredSuspensions: expiredSuspensionsSnapshot.size,
      manuallyLiftedSuspensions: liftedSuspensionsSnapshot.size,
    };
  }

  /**
   * Clean up expired suspensions (to be run periodically)
   */
  async cleanupExpiredSuspensions(): Promise<number> {
    this.logger.log('Cleaning up expired suspensions');

    const now = new Date();
    const snapshot = await this.firestore
      .collection(AGENT_SUSPENSIONS_COLLECTION)
      .where('status', '==', 'ACTIVE')
      .where('suspendedUntil', '<=', now)
      .get();

    const batch = this.firestore.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'EXPIRED',
        updatedAt: now,
      });
      count++;
    });

    await batch.commit();

    this.logger.log(`Cleaned up ${count} expired suspensions`);

    return count;
  }
}
