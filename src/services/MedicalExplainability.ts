export interface Explanation {
  recommendation: string;
  justification: string;
  evidence: {
    symptomOrVital: string;
    relevance: string;
  }[];
}

export class MedicalExplainability {
  generateExplanation(aiOutput: any): Explanation {
    if (!aiOutput.explanation || !aiOutput.evidence) {
      throw new Error("AI nie dostarczyło wystarczającego uzasadnienia.");
    }

    return {
      recommendation: aiOutput.recommendation,
      justification: aiOutput.explanation,
      evidence: aiOutput.evidence
    };
  }
}
