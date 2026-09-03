import { LocalAIEngine } from "./LocalAIEngine";
import { DecisionEngine } from "./DecisionEngine";
import { MedicalNoteGenerator } from "./MedicalNoteGenerator";
import { LocalPatientDB } from "./LocalPatientDB";
import { MedicalDataProtection } from "./MedicalDataProtection";
import { MedicalDisclaimerSystem } from "./MedicalDisclaimerSystem";
import { HumanInTheLoop } from "./HumanInTheLoop";
import { MedicationAnalysisEngine } from "./MedicationAnalysisEngine";
import { GapAnalysisEngine } from "./GapAnalysisEngine";
import { NotificationService } from "./NotificationService";
import { AdiPOZIntegrationEngine } from "./AdiPOZIntegrationEngine";
import { SovereignEngine } from "./SovereignEngine";
import { DataIngestionService, PatientData } from "./DataIngestion";

export class SystemOrchestrator {
  private aiEngine = new LocalAIEngine();
  private sovereignEngine = new SovereignEngine();
  private decisionEngine = new DecisionEngine();
  private medicationEngine = new MedicationAnalysisEngine();
  private gapEngine = new GapAnalysisEngine();
  private noteGenerator = new MedicalNoteGenerator();
  private patientDB = new LocalPatientDB();
  private disclaimer = new MedicalDisclaimerSystem();
  private hitl = new HumanInTheLoop();
  private adipoz = new AdiPOZIntegrationEngine();

  async processIngestedData(data: PatientData) {
    // 1. Convert ingested data to format required by analysis
    const symptoms = data.symptoms.join(', ');
    const medications = data.medications.join(', ');
    const vitals = { weight: data.weight, height: data.height };
    const patientInfo = { age: data.age, weight: data.weight, height: data.height, gender: 'U', bmi: data.weight / Math.pow(data.height / 100, 2) };

    // 2. Run analysis using existing logic
    return await this.runFullAnalysis('ingested-patient', symptoms, vitals, medications, patientInfo, true);
  }

  async runFullAnalysis(patientId: string, symptoms: string, vitals: any, medications: string, patientInfo: any = {}, isSovereignMode: boolean = false) {
    // 1. Ochrona danych (Anonimizacja)
    const anonymizedSymptoms = MedicalDataProtection.anonymize(symptoms);
    const anonymizedMeds = MedicalDataProtection.anonymize(medications);
    
    // 2. Analiza brakujących danych (Gap Analysis)
    const gapAnalysis = await this.gapEngine.analyze(anonymizedSymptoms, anonymizedMeds, vitals, patientInfo);
    
    // 3. Analiza leków (Nowy moduł)
    const medAnalysis = await this.medicationEngine.analyze(anonymizedMeds, anonymizedSymptoms, vitals);

    // 4. Powiadomienia o ryzykach leków
    if (!medAnalysis.isSafe) {
      const criticalRisks = medAnalysis.risks.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');
      criticalRisks.forEach(risk => {
        NotificationService.addNotification('MEDICATION_ALERT', `RYZYKO: ${risk.type}`, risk.message);
      });
    }

    // 5. Pobranie historii wizyt dla kontekstu AI
    const history = await this.patientDB.getHistory(patientId);

    // 6. AI Engine or Sovereign Engine
    let aiOutput;
    if (isSovereignMode) {
      aiOutput = await this.sovereignEngine.analyze(anonymizedSymptoms, anonymizedMeds, patientInfo);
      NotificationService.addNotification('INFO', 'Tryb Suwerenny', 'Analiza wykonana lokalnie bez użycia API chmurowego.');
    } else {
      aiOutput = await this.aiEngine.analyzeSymptoms(anonymizedSymptoms, anonymizedMeds, history, patientInfo);
    }
    
    // 7. DecisionEngine --- logika + alerty
    const decision = this.decisionEngine.process(aiOutput, vitals);
    
    // 8. Human in the loop
    const isApproved = await this.hitl.requireDoctorConfirmation({
      actionId: Date.now().toString(),
      actionType: 'diagnosis',
      description: `${decision.diagnosis}: ${decision.action}. Analiza leków: ${medAnalysis.summary}`,
      confidence: aiOutput.confidence || 0.8
    });

    if (!isApproved) {
      NotificationService.addNotification('WARNING', 'Analiza Odrzucona', 'Lekarz odrzucił sugerowaną diagnozę.');
      throw new Error("Decyzja odrzucona przez lekarza.");
    }

    // 9. MedicalNoteGenerator
    const note = this.noteGenerator.generate(patientId, decision, symptoms);
    
    // 10. Prepare full analysis object
    const fullAnalysis = {
      decision,
      medAnalysis,
      gapAnalysis,
      note,
      integration: {
        hl7: [],
        sql: [],
        nosql: {}
      }
    };

    // 11. AdiPOZ Integration
    const hl7Prescription = this.adipoz.generateHL7CDA({ patientId, content: medications }, 'e-prescription');
    const hl7Referral = this.adipoz.generateHL7CDA({ patientId, content: decision.action }, 'e-referral');
    const sqlQueries = this.adipoz.generateSQL(patientId, decision);
    const logSchema = this.adipoz.getSovereignLogSchema();

    // Update fullAnalysis with integration data
    fullAnalysis.integration = {
      hl7: [hl7Prescription, hl7Referral],
      sql: sqlQueries,
      nosql: logSchema
    };

    // 10. LocalPatientDB - Save AFTER integration data is ready
    await this.patientDB.saveAnalysis(patientId, symptoms, medications, vitals, fullAnalysis, patientInfo);

    NotificationService.addNotification('SUCCESS', 'Analiza Ukończona', `Zapisano analizę dla pacjenta ${patientId}`);

    // 12. Disclaimer
    return this.disclaimer.attachDisclaimer({
      ...fullAnalysis,
      history: history
    });
  }
}
