export interface AuditEvent {
  id: string;
  patientId: string;
  timestamp: string;
  actor: 'SYSTEM' | 'DOCTOR';
  actionType: 'AI_ANALYSIS' | 'RULE_ALERT' | 'DOCTOR_DECISION' | 'NOTE_GENERATION';
  payload: any;
  metadata: {
    version: string;
    deviceId: string;
  };
}

export class MedicalAuditLog {
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const fullEvent: AuditEvent = {
      ...event,
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
    };
    console.log("Log event:", fullEvent);
  }

  async getAuditTrail(patientId: string): Promise<AuditEvent[]> {
    console.log("Getting audit trail for:", patientId);
    return [];
  }
}
