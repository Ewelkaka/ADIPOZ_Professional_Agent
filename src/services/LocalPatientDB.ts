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
  patientInfo?: any;
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

  async saveAnalysis(patientId: string, symptoms: string, medications: string, vitals: any, analysis: any, patientInfo?: any) {
    const history = await this.loadHistory();
    const patientHistory = history.get(patientId) || [];
    
    const record: AnalysisRecord = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      patientId,
      timestamp: new Date().toISOString(),
      symptoms,
      medications,
      vitals,
      analysis,
      patientInfo
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
    const existing = history.get(patientId);
    if (existing && existing.length > 0) {
      return existing;
    }

    // Jeśli baza dla domyślnego pacjenta testowego jest pusta, wstawiamy realistyczną historię z farmakoterapią
    if (patientId === 'PAC-12345') {
      const seedHistory: AnalysisRecord[] = [
        {
          id: 'seed-visit-5',
          patientId: 'PAC-12345',
          timestamp: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
          symptoms: 'Wizyta kontrolna POZ, ocena tolerancji analogu GLP-1, zadowalająca redukcja masy ciała, brak dolegliwości dyspeptycznych',
          medications: 'Metformina 850mg 1x1, Ramipril 5mg 1x1, Ozempic (Semaglutyd) 0.5mg s.c. 1x/tydz.',
          vitals: { temp: 36.6, bp: '122/80', pulse: 68, allergies: [] },
          analysis: {
            decision: {
              diagnosis: 'Cukrzyca typu 2 zadowalająco wyrównana, znaczna redukcja masy ciała',
              icd10Code: 'E11.9',
              confidence: 0.94,
              reasoning: 'Kontrola glikemii i tolerancji po zwiększeniu dawki semaglutydu do 0.5mg. Wyraźny spadek masy ciała (-5.5 kg od wdrożenia GLP-1).',
              alerts: []
            },
            medAnalysis: { isSafe: true }
          },
          patientInfo: { age: 45, weight: 77.0, height: 175, gender: 'M', bmi: 25.1 }
        },
        {
          id: 'seed-visit-4',
          patientId: 'PAC-12345',
          timestamp: new Date(Date.now() - 48 * 24 * 3600 * 1000).toISOString(),
          symptoms: 'Wizyta planowa, wdrożenie agonisty receptora GLP-1 w celu redukcji masy ciała i optymalizacji kontroli glikemii',
          medications: 'Metformina 850mg 1x1, Ramipril 5mg 1x1, Ozempic (Semaglutyd) 0.25mg s.c. 1x/tydz.',
          vitals: { temp: 36.7, bp: '130/84', pulse: 74, allergies: [] },
          analysis: {
            decision: {
              diagnosis: 'Otyłość/nadwaga, cukrzyca typu 2 - wdrożenie analogu GLP-1',
              icd10Code: 'E11.8',
              confidence: 0.92,
              reasoning: 'Rozpoczęcie terapii semaglutydem w dawce początkowej 0.25 mg 1 raz w tygodniu.',
              alerts: ['Rozpoczęcie nowej farmakoterapii: Ozempic (Semaglutyd) 0.25mg']
            },
            medAnalysis: { isSafe: true }
          },
          patientInfo: { age: 45, weight: 82.5, height: 175, gender: 'M', bmi: 26.9 }
        },
        {
          id: 'seed-visit-3',
          patientId: 'PAC-12345',
          timestamp: new Date(Date.now() - 95 * 24 * 3600 * 1000).toISOString(),
          symptoms: 'Kontrola ciśnienia tętniczego, podwyższone wartości domowe 145/95 mmHg, wdrożenie leczenia hipotensyjnego',
          medications: 'Metformina 850mg 1x1, Ramipril 5mg 1x1',
          vitals: { temp: 36.6, bp: '145/95', pulse: 76, allergies: [] },
          analysis: {
            decision: {
              diagnosis: 'Nadciśnienie tętnicze pierwotne łagodne do umiarkowanego',
              icd10Code: 'I10',
              confidence: 0.95,
              reasoning: 'Wdrożono inhibitor ACE (Ramipril 5mg 1x1 rano). Zwiększono dawkę metforminy do 850mg.',
              alerts: ['Wdrożenie nowego leku: Ramipril 5mg']
            },
            medAnalysis: { isSafe: true }
          },
          patientInfo: { age: 45, weight: 86.0, height: 175, gender: 'M', bmi: 28.1 }
        },
        {
          id: 'seed-visit-2',
          patientId: 'PAC-12345',
          timestamp: new Date(Date.now() - 150 * 24 * 3600 * 1000).toISOString(),
          symptoms: 'Podwyższona glikemia na czczo (132 mg/dl), zmęczenie poposiłkowe, wdrożenie doustnego leku hipoglikemizującego',
          medications: 'Metformina 500mg 1x1',
          vitals: { temp: 36.6, bp: '138/88', pulse: 72, allergies: [] },
          analysis: {
            decision: {
              diagnosis: 'Cukrzyca typu 2 de novo, stan po niepowodzeniu leczenia dietetycznego',
              icd10Code: 'E11',
              confidence: 0.93,
              reasoning: 'Rozpoczęto leczenie metforminą w dawce 500mg po wieczornym posiłku.',
              alerts: ['Rozpoczęcie farmakoterapii: Metformina 500mg']
            },
            medAnalysis: { isSafe: true }
          },
          patientInfo: { age: 45, weight: 89.0, height: 175, gender: 'M', bmi: 29.1 }
        },
        {
          id: 'seed-visit-1',
          patientId: 'PAC-12345',
          timestamp: new Date(Date.now() - 210 * 24 * 3600 * 1000).toISOString(),
          symptoms: 'Badanie okresowe medycyny pracy, nadwaga, wywiad w kierunku zespołu metabolicznego',
          medications: 'Brak stałych leków',
          vitals: { temp: 36.5, bp: '135/86', pulse: 70, allergies: [] },
          analysis: {
            decision: {
              diagnosis: 'Nadwaga, stan przedcukrzycowy, zalecenia modyfikacji stylu życia',
              icd10Code: 'E66.0',
              confidence: 0.91,
              reasoning: 'Zalecenia dietetyczne redukcyjne i aktywność fizyczna. Brak stałej farmakoterapii.',
              alerts: []
            },
            medAnalysis: { isSafe: true }
          },
          patientInfo: { age: 45, weight: 88.5, height: 175, gender: 'M', bmi: 28.9 }
        }
      ];

      history.set(patientId, seedHistory);
      await this.saveHistory(history);
      return seedHistory;
    }

    return [];
  }

  async deleteAnalysis(patientId: string, analysisId: string) {
    const history = await this.loadHistory();
    const patientHistory = history.get(patientId) || [];
    const updatedHistory = patientHistory.filter(r => r.id !== analysisId);
    history.set(patientId, updatedHistory);
    await this.saveHistory(history);
  }
}
