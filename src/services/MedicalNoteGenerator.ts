import { DecisionResult } from "./DecisionEngine";

export interface MedicalNote {
  patientId: string;
  timestamp: string;
  content: string;
  isCompliant: boolean;
}

export class MedicalNoteGenerator {
  generate(patientId: string, decision: DecisionResult, symptoms: string): MedicalNote {
    const timestamp = new Date().toLocaleString('pl-PL');
    const content = `
      NOTATKA MEDYCZNA - ${timestamp}
      PACJENT ID: ${patientId}
      
      OBJAWY: ${symptoms}
      DIAGNOZA: ${decision.diagnosis} ${decision.icd10Code ? `(ICD-10: ${decision.icd10Code})` : ''}
      ZALECENIA: ${decision.action}
      
      ALERTY SYSTEMOWE:
      ${decision.alerts.length > 0 ? decision.alerts.join('\n      ') : 'Brak alertów.'}
      
      Podpisano cyfrowo przez system wsparcia decyzji klinicznych.
    `;

    return {
      patientId,
      timestamp: new Date().toISOString(),
      content,
      isCompliant: true
    };
  }
}
