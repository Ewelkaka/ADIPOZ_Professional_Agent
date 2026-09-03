import { RiskManagementSystem, RiskLevel } from "./RiskManagementSystem";
import { MedicalValidationLayer } from "./MedicalValidationLayer";
import { BmiVarianceService, BmiVarianceAnalysis } from "./BmiVarianceService";

export interface DecisionResult {
  podsumowanie_wizyty?: string;
  diagnosis: string;
  mappedSymptoms: string[];
  icd10Code?: string;
  action: string;
  suggestedTests: string[];
  alerts: string[];
  isSafe: boolean;
  explanation: string;
  chronicDiseaseManagement?: string;
  differential_diagnoses?: { diagnosis: string; explanation: string; probability: number }[];
  bmiVariance?: BmiVarianceAnalysis | null;
}

export class DecisionEngine {
  private riskSystem = new RiskManagementSystem();
  private validator = new MedicalValidationLayer();

  process(aiOutput: any, patientVitals: any, history?: any[], patientInfo?: any): DecisionResult {
    const alerts: string[] = [...(aiOutput.alerts || [])];
    
    // 1. Walidacja AI
    const validation = this.validator.validateAIOutput(aiOutput);
    if (!validation.isValid) {
      alerts.push(...validation.flags);
    }

    // 2. Zarządzanie ryzykiem
    const risk = this.riskSystem.identifyRisk(aiOutput, patientVitals);
    if (risk) {
      const mitigation = this.riskSystem.mitigateRisk(risk);
      alerts.push(mitigation.message);
    }

    // 3. Analiza wariancji i dynamiki BMI między ostatnimi wizytami
    let bmiVariance: BmiVarianceAnalysis | null = null;
    if (history && history.length > 0) {
      bmiVariance = BmiVarianceService.evaluatePatientHistory(history, patientInfo);
      if (bmiVariance && bmiVariance.hasAlert) {
        alerts.unshift(`${bmiVariance.title}: ${bmiVariance.message}`);
      }
    }

    // 4. Logika decyzji
    return {
      podsumowanie_wizyty: aiOutput.podsumowanie_wizyty,
      diagnosis: aiOutput.diagnosis || "Nieznana",
      mappedSymptoms: aiOutput.mappedSymptoms || [],
      icd10Code: aiOutput.icd10Code,
      action: aiOutput.action || "Dalsza obserwacja",
      suggestedTests: aiOutput.suggestedTests || [],
      alerts,
      isSafe: !alerts.some(a => a.includes("KRYTYCZNY") || a.includes("BLOKADA") || a.includes("Czerwona Flaga") || a.includes("STAN ALARMOWY")),
      explanation: aiOutput.explanation || "",
      chronicDiseaseManagement: aiOutput.chronicDiseaseManagement,
      differential_diagnoses: aiOutput.differential_diagnoses || [],
      bmiVariance
    };
  }
}
