import { GoogleGenAI } from "@google/genai";

export interface DataGap {
  field: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  impactOnDiagnosis: string;
}

export interface GapAnalysis {
  gaps: DataGap[];
  isCompleteEnough: boolean;
  overallDataQuality: number; // 0-100
  recommendations: string[];
}

export class GapAnalysisEngine {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  async analyze(symptoms: string, medications: string, vitals: any, patientInfo: any): Promise<GapAnalysis> {
    const model = "gemini-2.5-flash";
    
    const prompt = `Analiza brakujących danych medycznych (Omissions & Missing Data Analysis):
    Objawy: ${symptoms}
    Leki: ${medications}
    Vitals: ${JSON.stringify(vitals)}
    Info o pacjencie: ${JSON.stringify(patientInfo)}
    
    Zidentyfikuj krytyczne braki w danych, które uniemożliwiają bezpieczną diagnozę lub analizę leków.
    Zwróć uwagę na: wiek, wagę, funkcję nerek/wątroby, ciążę, choroby przewlekłe.
    
    Zwróć odpowiedź w formacie JSON:
    {
      "gaps": [
        {
          "field": "Nazwa pola",
          "importance": "CRITICAL | HIGH | MEDIUM | LOW",
          "reason": "Dlaczego to jest ważne?",
          "impactOnDiagnosis": "Jak brak wpływa na wynik?"
        }
      ],
      "isCompleteEnough": boolean,
      "overallDataQuality": number (0-100),
      "recommendations": ["Zalecenie 1", "Zalecenie 2"]
    }`;

    const response = await this.ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const defaultResult: GapAnalysis = {
      gaps: [],
      isCompleteEnough: true,
      overallDataQuality: 100,
      recommendations: []
    };

    try {
      return JSON.parse(response.text || JSON.stringify(defaultResult));
    } catch (e) {
      console.error("Gap Analysis Parse Error:", e);
      return defaultResult;
    }
  }
}
