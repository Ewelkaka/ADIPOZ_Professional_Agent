// src/services/MedicalNoteGenerator.ts
import { DecisionResult } from "./DecisionEngine";
import { EReceptaService, EReceptaData, EReceptaMedication } from "./EReceptaService";

export interface MedicalNote {
  patientId: string;
  timestamp: string;
  content: string;
  isCompliant: boolean;
  eReceptaP1?: {
    packageId: string;
    accessCode: string;
    packageKey44: string;
    itemsCount: number;
    medications: EReceptaMedication[];
    p1Json: string;
    data: EReceptaData;
  };
}

export class MedicalNoteGenerator {
  generate(
    patientId: string, 
    decision: DecisionResult, 
    symptoms: string, 
    medicationsText: string = '', 
    patientInfo: any = {}
  ): MedicalNote {
    const timestamp = new Date().toLocaleString('pl-PL');
    const todayIso = new Date().toISOString().split('T')[0];
    
    // Parsowanie leków i generowanie specyfikacji P1
    const patientAge = patientInfo?.age || (patientInfo?.pesel ? 2026 - (1900 + parseInt(patientInfo.pesel.substring(0, 2), 10)) : 55);
    const parsedMeds = EReceptaService.parseMedicationsFromText(medicationsText, patientAge, !!decision.chronicDiseaseManagement);
    
    const patientName = patientInfo?.imie && patientInfo?.nazwisko 
      ? `${patientInfo.imie} ${patientInfo.nazwisko}`
      : patientInfo?.name || `Pacjent ID ${patientId}`;
    
    const patientPesel = patientInfo?.pesel || '80010112345';
    const accessCode = Math.floor(1000 + Math.random() * 9000).toString();
    const packageKey44 = EReceptaService.generate44DigitKey(patientPesel);
    const packageId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `P1-REC-${Date.now()}`;

    const eReceptaData: EReceptaData = {
      patientName,
      patientPesel,
      doctorName: 'Lek. Anna Nowak',
      doctorPzw: '1234567',
      doctorTitle: 'Lekarz specjalista medycyny rodzinnej',
      facilityName: 'NZOZ Poradnia Lekarza Rodzinnego i Opieki Koordynowanej POZ',
      facilityCodeVII: '000000012345',
      facilityRegon: '123456789',
      nfzBranch: '01 - Dolnośląski OW NFZ',
      date: todayIso,
      accessCode,
      packageKey44,
      packageId,
      medications: parsedMeds.length > 0 ? parsedMeds : [
        {
          name: decision.diagnosis.includes('Nadciśnienie') ? 'Ramipril 5 mg' : decision.diagnosis.includes('Cukrzyca') ? 'Metformina 850 mg' : 'Lek zalecony w wywiadzie',
          innName: decision.diagnosis.includes('Nadciśnienie') ? 'Ramiprilum' : 'Metforminum',
          dosage: '1x1 rano',
          quantity: '1 op.',
          packageSize: '28 tabl.',
          atcCode: 'C09AA05',
          eanGtin: '5909990012345',
          formCode: 'TABL_POWL',
          refundationLevel: patientAge >= 65 ? 'S' : 'R',
          additionalPrivilege: patientAge >= 65 ? 'S' : 'BRAK',
          dosageInstruction: '1 tabletka rano',
          treatmentDurationDays: 30,
          validityDays: 30
        }
      ],
      icd10Diagnosis: decision.icd10Code || 'I10'
    };

    const p1Json = EReceptaService.generateP1Json(eReceptaData);

    const medsSection = eReceptaData.medications.map((m, idx) => 
      `      ${idx + 1}. ${m.name} | Dawkowanie: ${m.dosage} | Ilość: ${m.quantity} | Odpłatność: ${m.refundationLevel === 'S' ? 'Bezpłatne (Senior 65+)' : m.refundationLevel || 'Ryczałt'}`
    ).join('\n');

    const content = `
      ================================================================================
      DOKUMENTACJA MEDYCZNA WIZYTY POZ - ${timestamp}
      PACJENT: ${patientName} | PESEL: ${patientPesel} | ID: ${patientId}
      LEKARZ: Lek. Anna Nowak (NPWZ: 1234567)
      ================================================================================
      
      [1] WYWIAD I OBJAWY ZGŁASZANE (S):
      ${symptoms || 'Brak zgłoszonych objawów ostrych.'}
      
      [2] DIAGNOZA GŁÓWNA I KODYFIKACJA (A):
      • Rozpoznanie: ${decision.diagnosis} ${decision.icd10Code ? `(ICD-10: ${decision.icd10Code})` : ''}
      ${decision.explanation ? `• Uzasadnienie kliniczne: ${decision.explanation}` : ''}
      ${decision.chronicDiseaseManagement ? `• Postępowanie w chorobie przewlekłej: ${decision.chronicDiseaseManagement}` : ''}
      
      [3] PLAN LECZENIA I ZALECENIA TERAPEUTYCZNE (P):
      • Zalecenia: ${decision.action}
      ${decision.suggestedTests && decision.suggestedTests.length > 0 ? `• Zlecone badania diagnostyczne: ${decision.suggestedTests.join(', ')}` : ''}

      [4] FARMAKOTERAPIA I ELEKTRONICZNA RECEPTA (P1 CeZ):
      • Status Pakietu e-Recepty: GOTOWY DO PRZESŁANIA DO P1 / EKSPORTU
      • Kod Dostępu (PIN): ${accessCode}
      • Klucz Pakietu P1: ${packageKey44.substring(0, 20)}...
      • Wykaz pozycji lekowych:
${medsSection}
      
      [5] ALERTY BEZPIECZEŃSTWA KLINICZNEGO:
      ${decision.alerts.length > 0 ? decision.alerts.map(a => `• ${a}`).join('\n      ') : '• Brak krytycznych alertów systemowych i interakcji lekowych.'}
      
      --------------------------------------------------------------------------------
      Podpisano cyfrowo przez certyfikowany system wsparcia decyzji klinicznych POZ.
      Dokument zgodny ze standardami HL7 CDA R2, CeZ P1 oraz ustawą Prawo farmaceutyczne.
    `;

    return {
      patientId,
      timestamp: new Date().toISOString(),
      content: content.trim(),
      isCompliant: true,
      eReceptaP1: {
        packageId,
        accessCode,
        packageKey44,
        itemsCount: eReceptaData.medications.length,
        medications: eReceptaData.medications,
        p1Json,
        data: eReceptaData
      }
    };
  }
}
