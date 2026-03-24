import { GoogleGenAI } from "@google/genai";

export interface MedicationRisk {
  type: 'INTERACTION' | 'CONTRAINDICATION' | 'DOSAGE' | 'GENERAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommendation: string;
}

export interface MedicationAnalysis {
  risks: MedicationRisk[];
  summary: string;
  isSafe: boolean;
}

export class MedicationAnalysisEngine {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async analyze(medications: string, symptoms: string, vitals: any): Promise<MedicationAnalysis> {
    const model = "gemini-3-flash-preview";
    
    const prompt = `Analiza bezpieczeństwa farmakoterapii:
    Leki pacjenta: ${medications}
    Aktualne objawy: ${symptoms}
    Parametry życiowe: ${JSON.stringify(vitals)}
    
    Zidentyfikuj:
    1. Interakcje międzylekowe.
    2. Przeciwwskazania (w oparciu o objawy i parametry).
    3. Poprawność dawkowania (jeśli podano).
    
    Zwróć odpowiedź w formacie JSON:
    {
      "risks": [
        {
          "type": "INTERACTION | CONTRAINDICATION | DOSAGE | GENERAL",
          "severity": "LOW | MEDIUM | HIGH | CRITICAL",
          "message": "Opis ryzyka",
          "recommendation": "Zalecenie"
        }
      ],
      "summary": "Krótkie podsumowanie",
      "isSafe": boolean (true jeśli brak ryzyk HIGH/CRITICAL)
    }`;

    const response = await this.ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{\"risks\": [], \"summary\": \"Błąd analizy\", \"isSafe\": false}");
  }
}
