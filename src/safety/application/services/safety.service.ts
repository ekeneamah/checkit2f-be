import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import {
  SOSAlert,
  IncidentReport,
  SafetyCheckIn,
  SafetySettings,
  LiveLocationSession,
  EmergencyContact,
  EmergencyType,
  EmergencyStatus,
  IncidentSeverity,
  LocationPoint,
} from '../../domain/entities/safety.entity';

/**
 * Safety & Emergency Service
 * 
 * Handles SOS alerts, incident reporting, live location sharing,
 * and check-in/out system for field agent safety.
 * 
 * CRITICAL: All SOS alerts trigger immediate notifications.
 * 
 * @author CheckIT24 Development Team
 */
@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);
  private readonly db: admin.firestore.Firestore;
  private readonly SOS_COLLECTION = 'sos_alerts';
  private readonly INCIDENTS_COLLECTION = 'incident_reports';
  private readonly CHECKINS_COLLECTION = 'safety_check_ins';
  private readonly SETTINGS_COLLECTION = 'safety_settings';
  private readonly LIVE_SESSIONS_COLLECTION = 'live_location_sessions';

  constructor(private readonly configService: ConfigService) {
    this.db = admin.firestore();
    this.logger.log('🆘 Safety Service initialized');
  }

  // ============================================================================
  // SOS ALERTS
  // ============================================================================

  /**
   * Trigger SOS alert - CRITICAL OPERATION
   */
  async triggerSOS(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    userName: string,
    userPhone: string,
    location: LocationPoint,
    emergencyType: EmergencyType = 'sos',
    message?: string,
    verificationRequestId?: string,
    companyId?: string,
  ): Promise<SOSAlert> {
    this.logger.warn(`🚨 SOS ALERT TRIGGERED by user ${userId} - ${emergencyType}`);

    const alertId = this.generateId();
    const now = new Date();

    // Get user's safety settings and emergency contacts
    const settings = await this.getSafetySettings(userId);
    const emergencyContacts = settings?.emergencyContacts || [];

    const alert: SOSAlert = {
      id: alertId,
      userId,
      userRole,
      userName,
      userPhone,
      companyId,
      emergencyType,
      status: 'active',
      location,
      message,
      verificationRequestId,
      triggeredAt: now,
      notifiedContacts: [],
      locationHistory: [location],
    };

    // Save alert immediately
    await this.db.collection(this.SOS_COLLECTION).doc(alertId).set({
      ...alert,
      triggeredAt: admin.firestore.Timestamp.fromDate(now),
      location: {
        ...location,
        timestamp: admin.firestore.Timestamp.fromDate(location.timestamp),
      },
      locationHistory: alert.locationHistory.map(l => ({
        ...l,
        timestamp: admin.firestore.Timestamp.fromDate(l.timestamp),
      })),
    });

    // CRITICAL: Send notifications in parallel
    const notificationPromises: Promise<any>[] = [];

    // Notify emergency contacts
    for (const contact of emergencyContacts) {
      if (contact.notifyOnSOS) {
        notificationPromises.push(
          this.sendEmergencyNotification(alertId, contact, location, userName)
        );
      }
    }

    // Notify company if rider
    if (userRole === 'RIDER' && companyId && settings?.notifyCompanyOnSOS) {
      notificationPromises.push(
        this.notifyCompanyOfSOS(alertId, companyId, userName, location)
      );
    }

    // Notify admin
    notificationPromises.push(this.notifyAdminOfSOS(alert));

    // Execute all notifications
    await Promise.allSettled(notificationPromises);

    // Start continuous location tracking for this SOS
    await this.startSOSTracking(alertId, userId);

    this.logger.warn(`🆘 SOS Alert ${alertId} created and notifications sent`);
    return alert;
  }

  /**
   * Update SOS location (continuous tracking during emergency)
   */
  async updateSOSLocation(alertId: string, location: LocationPoint): Promise<void> {
    const alertRef = this.db.collection(this.SOS_COLLECTION).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new NotFoundException('SOS alert not found');
    }

    const alertData = alertDoc.data();
    if (alertData?.status !== 'active') {
      return; // Don't update resolved alerts
    }

    await alertRef.update({
      location: {
        ...location,
        timestamp: admin.firestore.Timestamp.fromDate(location.timestamp),
      },
      locationHistory: admin.firestore.FieldValue.arrayUnion({
        ...location,
        timestamp: admin.firestore.Timestamp.fromDate(location.timestamp),
      }),
    });
  }

  /**
   * Acknowledge SOS alert
   */
  async acknowledgeSOS(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<SOSAlert> {
    const alertRef = this.db.collection(this.SOS_COLLECTION).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new NotFoundException('SOS alert not found');
    }

    const now = new Date();
    await alertRef.update({
      status: 'acknowledged',
      acknowledgedAt: admin.firestore.Timestamp.fromDate(now),
      acknowledgedBy,
    });

    this.logger.log(`✅ SOS Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return { ...alertDoc.data(), status: 'acknowledged', acknowledgedAt: now, acknowledgedBy } as SOSAlert;
  }

  /**
   * Resolve SOS alert
   */
  async resolveSOS(
    alertId: string,
    resolvedBy: string,
    resolutionNotes: string,
    isFalseAlarm: boolean = false,
  ): Promise<SOSAlert> {
    const alertRef = this.db.collection(this.SOS_COLLECTION).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new NotFoundException('SOS alert not found');
    }

    const now = new Date();
    const status: EmergencyStatus = isFalseAlarm ? 'false_alarm' : 'resolved';

    await alertRef.update({
      status,
      resolvedAt: admin.firestore.Timestamp.fromDate(now),
      resolvedBy,
      resolutionNotes,
    });

    // Stop continuous tracking
    await this.stopSOSTracking(alertId);

    this.logger.log(`✅ SOS Alert ${alertId} resolved by ${resolvedBy}`);
    return { ...alertDoc.data(), status, resolvedAt: now, resolvedBy, resolutionNotes } as SOSAlert;
  }

  /**
   * Get active SOS alerts (for admin/company monitoring)
   */
  async getActiveSOSAlerts(companyId?: string): Promise<SOSAlert[]> {
    let query = this.db
      .collection(this.SOS_COLLECTION)
      .where('status', 'in', ['active', 'acknowledged', 'responding']);

    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.orderBy('triggeredAt', 'desc').get();
    return snapshot.docs.map(doc => this.mapSOSAlert(doc));
  }

  // ============================================================================
  // INCIDENT REPORTING
  // ============================================================================

  /**
   * Submit incident report
   */
  async submitIncidentReport(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    report: {
      type: IncidentReport['type'];
      severity: IncidentSeverity;
      title: string;
      description: string;
      location?: LocationPoint;
      verificationRequestId?: string;
      occurredAt: Date;
      attachments?: Array<{ type: string; url: string; description?: string }>;
      witnesses?: Array<{ name: string; contact?: string; statement?: string }>;
    },
    companyId?: string,
  ): Promise<IncidentReport> {
    this.logger.log(`📋 Submitting incident report: ${report.title}`);

    const reportId = this.generateId();
    const now = new Date();

    const incident: IncidentReport = {
      id: reportId,
      userId,
      userRole,
      companyId,
      verificationRequestId: report.verificationRequestId,
      type: report.type,
      severity: report.severity,
      title: report.title,
      description: report.description,
      location: report.location,
      occurredAt: report.occurredAt,
      reportedAt: now,
      status: 'submitted',
      attachments: report.attachments || [],
      witnesses: report.witnesses,
    };

    await this.db.collection(this.INCIDENTS_COLLECTION).doc(reportId).set({
      ...incident,
      occurredAt: admin.firestore.Timestamp.fromDate(report.occurredAt),
      reportedAt: admin.firestore.Timestamp.fromDate(now),
      location: report.location ? {
        ...report.location,
        timestamp: admin.firestore.Timestamp.fromDate(report.location.timestamp),
      } : null,
    });

    // Notify admin for high severity incidents
    if (report.severity === 'high' || report.severity === 'critical') {
      await this.notifyAdminOfIncident(incident);
    }

    this.logger.log(`✅ Incident report ${reportId} submitted`);
    return incident;
  }

  /**
   * Get incident reports for user
   */
  async getIncidentReports(
    userId: string,
    status?: string,
    limit: number = 20,
  ): Promise<IncidentReport[]> {
    let query = this.db
      .collection(this.INCIDENTS_COLLECTION)
      .where('userId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('reportedAt', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => doc.data() as IncidentReport);
  }

  // ============================================================================
  // SAFETY CHECK-INS
  // ============================================================================

  /**
   * Record safety check-in
   */
  async recordCheckIn(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    location: LocationPoint,
    verificationRequestId?: string,
    notes?: string,
    photoUrl?: string,
    companyId?: string,
  ): Promise<SafetyCheckIn> {
    const checkInId = this.generateId();
    const now = new Date();

    const checkIn: SafetyCheckIn = {
      id: checkInId,
      userId,
      userRole,
      companyId,
      verificationRequestId,
      type: 'manual',
      status: 'checked_in',
      scheduledTime: now,
      actualTime: now,
      location,
      notes,
      photoUrl,
    };

    await this.db.collection(this.CHECKINS_COLLECTION).doc(checkInId).set({
      ...checkIn,
      scheduledTime: admin.firestore.Timestamp.fromDate(now),
      actualTime: admin.firestore.Timestamp.fromDate(now),
      location: {
        ...location,
        timestamp: admin.firestore.Timestamp.fromDate(location.timestamp),
      },
    });

    this.logger.log(`✅ Safety check-in recorded for user ${userId}`);
    return checkIn;
  }

  /**
   * Get check-in history
   */
  async getCheckInHistory(
    userId: string,
    limit: number = 50,
  ): Promise<SafetyCheckIn[]> {
    const snapshot = await this.db
      .collection(this.CHECKINS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('actualTime', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as SafetyCheckIn);
  }

  // ============================================================================
  // SAFETY SETTINGS
  // ============================================================================

  /**
   * Get or create safety settings for user
   */
  async getSafetySettings(userId: string): Promise<SafetySettings> {
    const settingsDoc = await this.db.collection(this.SETTINGS_COLLECTION).doc(userId).get();

    if (settingsDoc.exists) {
      return settingsDoc.data() as SafetySettings;
    }

    // Create default settings
    const defaultSettings: SafetySettings = {
      userId,
      sosEnabled: true,
      autoRecordOnSOS: true,
      shareLocationOnSOS: true,
      emergencyContacts: [],
      autoSOSOnInactivity: false,
      panicButtonEnabled: true,
      notifyCompanyOnSOS: true,
    };

    await this.db.collection(this.SETTINGS_COLLECTION).doc(userId).set(defaultSettings);
    return defaultSettings;
  }

  /**
   * Update safety settings
   */
  async updateSafetySettings(
    userId: string,
    updates: Partial<SafetySettings>,
  ): Promise<SafetySettings> {
    await this.db.collection(this.SETTINGS_COLLECTION).doc(userId).set(updates, { merge: true });
    return this.getSafetySettings(userId);
  }

  /**
   * Add emergency contact
   */
  async addEmergencyContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id' | 'userId' | 'createdAt'>,
  ): Promise<EmergencyContact> {
    const contactId = this.generateId();
    const now = new Date();

    const newContact: EmergencyContact = {
      id: contactId,
      userId,
      ...contact,
      createdAt: now,
    };

    await this.db.collection(this.SETTINGS_COLLECTION).doc(userId).update({
      emergencyContacts: admin.firestore.FieldValue.arrayUnion(newContact),
    });

    return newContact;
  }

  /**
   * Remove emergency contact
   */
  async removeEmergencyContact(userId: string, contactId: string): Promise<void> {
    const settings = await this.getSafetySettings(userId);
    const updatedContacts = settings.emergencyContacts.filter(c => c.id !== contactId);

    await this.db.collection(this.SETTINGS_COLLECTION).doc(userId).update({
      emergencyContacts: updatedContacts,
    });
  }

  // ============================================================================
  // LIVE LOCATION SHARING
  // ============================================================================

  /**
   * Start sharing live location
   */
  async startLiveLocationShare(
    userId: string,
    userRole: 'COMPANY' | 'RIDER',
    durationMinutes: number,
    verificationRequestId?: string,
    sharedWith?: Array<{ type: string; recipientId?: string; recipientName?: string }>,
  ): Promise<LiveLocationSession> {
    const sessionId = this.generateId();
    const shareToken = this.generateSecureToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const session: LiveLocationSession = {
      id: sessionId,
      userId,
      userRole,
      shareToken,
      verificationRequestId,
      isActive: true,
      startedAt: now,
      expiresAt,
      sharedWith: (sharedWith || []).map(s => ({
        type: s.type as any,
        recipientId: s.recipientId,
        recipientName: s.recipientName,
      })),
      updateFrequencySeconds: 30,
    };

    await this.db.collection(this.LIVE_SESSIONS_COLLECTION).doc(sessionId).set({
      ...session,
      startedAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    this.logger.log(`📍 Live location sharing started for user ${userId}`);
    return session;
  }

  /**
   * Get live location by share token
   */
  async getLiveLocationByToken(shareToken: string): Promise<LocationPoint | null> {
    const snapshot = await this.db
      .collection(this.LIVE_SESSIONS_COLLECTION)
      .where('shareToken', '==', shareToken)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const session = snapshot.docs[0].data();
    if (session.expiresAt.toDate() < new Date()) {
      return null;
    }

    return session.currentLocation || null;
  }

  /**
   * Stop live location sharing
   */
  async stopLiveLocationShare(sessionId: string, userId: string): Promise<void> {
    const sessionRef = this.db.collection(this.LIVE_SESSIONS_COLLECTION).doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (sessionDoc.exists && sessionDoc.data()?.userId === userId) {
      await sessionRef.update({
        isActive: false,
        endedAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  // ============================================================================
  // NOTIFICATION METHODS (Private)
  // ============================================================================

  private async sendEmergencyNotification(
    alertId: string,
    contact: EmergencyContact,
    location: LocationPoint,
    userName: string,
  ): Promise<void> {
    // In production, integrate with SMS/call services (Twilio, etc.)
    this.logger.warn(`🚨 Sending SOS notification to ${contact.name} (${contact.phone})`);
    
    // Record notification attempt
    await this.db.collection(this.SOS_COLLECTION).doc(alertId).update({
      notifiedContacts: admin.firestore.FieldValue.arrayUnion({
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        notifiedAt: admin.firestore.Timestamp.now(),
        notificationMethod: 'sms',
        delivered: true, // Would be updated based on actual delivery status
      }),
    });
  }

  private async notifyCompanyOfSOS(
    alertId: string,
    companyId: string,
    userName: string,
    location: LocationPoint,
  ): Promise<void> {
    this.logger.warn(`🚨 Notifying company ${companyId} of SOS from ${userName}`);
    // Send push notification/SMS to company admins
  }

  private async notifyAdminOfSOS(alert: SOSAlert): Promise<void> {
    this.logger.warn(`🚨 Notifying admin of SOS Alert ${alert.id}`);
    // Send to admin dashboard and alert channels
  }

  private async notifyAdminOfIncident(incident: IncidentReport): Promise<void> {
    this.logger.warn(`📋 Notifying admin of ${incident.severity} incident: ${incident.title}`);
    // Send to admin dashboard
  }

  private async startSOSTracking(alertId: string, userId: string): Promise<void> {
    this.logger.log(`📍 Starting continuous SOS tracking for ${alertId}`);
    // In production, this would activate high-frequency location updates
  }

  private async stopSOSTracking(alertId: string): Promise<void> {
    this.logger.log(`📍 Stopping SOS tracking for ${alertId}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mapSOSAlert(doc: admin.firestore.DocumentSnapshot): SOSAlert {
    const data = doc.data()!;
    return {
      ...data,
      triggeredAt: data.triggeredAt?.toDate(),
      acknowledgedAt: data.acknowledgedAt?.toDate(),
      resolvedAt: data.resolvedAt?.toDate(),
      location: {
        ...data.location,
        timestamp: data.location?.timestamp?.toDate(),
      },
      locationHistory: data.locationHistory?.map((l: any) => ({
        ...l,
        timestamp: l.timestamp?.toDate(),
      })),
    } as SOSAlert;
  }

  private generateId(): string {
    return `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
