export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Risk {
  level: RiskLevel;
  type: string;
  description: string;
  context: any;
}

export class RiskManagementSystem {
  identifyRisk(aiOutput: any, patientVitals: any): Risk | null {
    if (aiOutput.medication && patientVitals.allergies?.includes(aiOutput.medication)) {
      return {
        level: RiskLevel.HIGH,
        type: 'CONTRAINDICATION',
        description: 'AI zasugerowało lek, na który pacjent jest uczulony.',
        context: { medication: aiOutput.medication }
      };
    }

    if (aiOutput.confidence && aiOutput.confidence < 0.6) {
      return {
        level: RiskLevel.MEDIUM,
        type: 'LOW_CONFIDENCE',
        description: 'Niska pewność modelu AI co do diagnozy.',
        context: { confidence: aiOutput.confidence }
      };
    }

    return null;
  }

  mitigateRisk(risk: Risk): { shouldBlock: boolean; message: string } {
    switch (risk.level) {
      case RiskLevel.CRITICAL:
        return { shouldBlock: true, message: "KRYTYCZNY BŁĄD: System zatrzymany." };
      case RiskLevel.HIGH:
        return { shouldBlock: true, message: "BLOKADA: Sugestia niebezpieczna. Wymagana ręczna korekta." };
      case RiskLevel.MEDIUM:
        return { shouldBlock: false, message: "OSTRZEŻENIE: Sugestia wymaga weryfikacji przez lekarza." };
      default:
        return { shouldBlock: false, message: "Logowanie zdarzenia." };
    }
  }
}
