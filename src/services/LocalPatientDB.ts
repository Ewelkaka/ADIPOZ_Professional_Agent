import { MedicalNote } from "./MedicalNoteGenerator";
import { MedicalAuditLog } from "./MedicalAuditLog";

export interface AnalysisRecord {
  id: string;
  patientId: string;
  timestamp: string;
  symptoms: string;
  medications: string;
  vitals: any;
  analysis: any;
}

export class LocalPatientDB {
  private auditLog = new MedicalAuditLog();
  private STORAGE_KEY = 'adi_poz_patient_history';

  private async loadHistory(): Promise<Map<string, AnalysisRecord[]>> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return new Map();
    try {
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch (e) {
      console.error("Failed to parse patient history:", e);
      return new Map();
    }
  }

  private async saveHistory(history: Map<string, AnalysisRecord[]>) {
    const obj = Object.fromEntries(history);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
  }

  async saveAnalysis(patientId: string, symptoms: string, medications: string, vitals: any, analysis: any) {
    const history = await this.loadHistory();
    const patientHistory = history.get(patientId) || [];
    
    const record: AnalysisRecord = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      patientId,
      timestamp: new Date().toISOString(),
      symptoms,
      medications,
      vitals,
      analysis
    };

    patientHistory.unshift(record); // Newest first
    history.set(patientId, patientHistory);
    await this.saveHistory(history);

    // Audyt zapisu
    await this.auditLog.logEvent({
      patientId: patientId,
      actor: 'SYSTEM',
      actionType: 'AI_ANALYSIS',
      payload: { analysisId: record.id },
      metadata: { version: '1.0', deviceId: 'LOCAL_BROWSER' }
    });
  }

  async getHistory(patientId: string): Promise<AnalysisRecord[]> {
    const history = await this.loadHistory();
    return history.get(patientId) || [];
  }

  async deleteAnalysis(patientId: string, analysisId: string) {
    const history = await this.loadHistory();
    const patientHistory = history.get(patientId) || [];
    const updatedHistory = patientHistory.filter(r => r.id !== analysisId);
    history.set(patientId, updatedHistory);
    await this.saveHistory(history);
  }
}
