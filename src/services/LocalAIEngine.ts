import { GoogleGenAI } from "@google/genai";
import { ICD10_CODES } from "../constants";
import { AnalysisRecord } from "./LocalPatientDB";

export class LocalAIEngine {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async analyzeSymptoms(symptoms: string, medications: string, history: AnalysisRecord[], patientInfo: any = {}) {
    const model = "gemini-2.5-flash";
    const icd10Context = JSON.stringify(ICD10_CODES, null, 2);
    
    // Przygotowanie kontekstu pacjenta
    const patientContext = `
DANE PACJENTA:
- Wiek: ${patientInfo.age || 'Nie podano'} lat
- Płeć: ${patientInfo.gender || 'Nie podano'}
- Waga: ${patientInfo.weight || 'Nie podano'} kg
- BMI: ${patientInfo.bmi || 'Nie podano'}
- Inne dane: ${patientInfo.other || 'Brak'}
`;

    // Przygotowanie kontekstu historycznego
    const historyContext = history.length > 0 
      ? history.map(record => `[${new Date(record.timestamp).toLocaleDateString('pl-PL')}]: 
        Objawy: ${record.symptoms}
        Diagnoza: ${record.analysis.diagnosis}
        Zalecenia: ${record.analysis.action}`).join("\n\n")
      : "Brak wcześniejszej historii wizyt.";

    const prompt = `Jesteś AdiPOZ – zaawansowanym systemem wsparcia decyzji klinicznych (CDSS) dla lekarzy POZ. Twoim zadaniem jest przeprowadzenie głębokiej analizy przypadku pacjenta, uwzględniając aktualne objawy, przyjmowane leki, historię medyczną oraz profil pacjenta.

${patientContext}

Zastosuj technikę Chain-of-Thought (myślenie krok po kroku):

KROK 1: Analiza danych wejściowych i historii
- Przeanalizuj profil pacjenta (wiek, płeć, waga) pod kątem ryzyk specyficznych dla grupy demograficznej.
- Przeanalizuj aktualne objawy: ${symptoms}
- Przeanalizuj aktualne leki: ${medications}
- Przeanalizuj historię wizyt:
${historyContext}
- Zidentyfikuj trendy (np. pogorszenie parametrów, nawracające objawy, stabilność chorób przewlekłych).

KROK 2: Mapowanie synonimów i terminologii
- Przetłumacz potoczne określenia na profesjonalny język medyczny.
- Uwzględnij warianty synonimów dla objawów.

KROK 3: Rozumowanie kliniczne (Differential Diagnosis)
- Rozważ możliwe diagnozy różnicowe.
- Uwzględnij polskie wytyczne medyczne (ESC, PTK, PTD) na lata 2025-2026, szczególnie w kontekście chorób przewlekłych (nadciśnienie, cukrzyca, POChP).
- Zidentyfikuj "Czerwone Flagi" (Red Flags) wymagające pilnej interwencji.

KROK 4: Planowanie i kodowanie
- Zasugeruj badania diagnostyczne (EKG, morfologia, obrazowe).
- Przypisz precyzyjne kody ICD-10 z poniższej listy:
${icd10Context}

DANE WEJŚCIOWE:
Objawy: ${symptoms}
Leki: ${medications}

Zwróć odpowiedź WYŁĄCZNIE w formacie JSON zawierającym pola:
- podsumowanie_wizyty (krótkie streszczenie wizyty medycznej w 3-6 zdaniach, bazując na danych wejściowych i analizie AI)
- diagnosis (nazwa diagnozy w języku medycznym)
- differential_diagnoses (tablica obiektów: diagnosis, explanation, probability 0-100)
- mappedSymptoms (tablica zmapowanych objawów na język medyczny)
- icd10Code (kod z powyższej listy, jeśli pasuje)
- action (zalecane działanie natychmiastowe)
- suggestedTests (tablica sugerowanych badań)
- alerts (tablica czerwonych flag / alertów bezpieczeństwa)
- confidence (liczba 0-1)
- explanation (szczegółowe uzasadnienie kliniczne oparte na rozumowaniu CoT, uwzględniające historię pacjenta i wytyczne)
- chronicDiseaseManagement (opcjonalnie: zalecenia dotyczące prowadzenia choroby przewlekłej, jeśli dotyczy)`;

    const response = await this.ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  }
}
