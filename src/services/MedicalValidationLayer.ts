export interface ValidationResult {
  isValid: boolean;
  blocked: boolean;
  flags: string[];
  sanitizedOutput: any;
}

export class MedicalValidationLayer {
  private readonly PROHIBITED_TERMS = ['eutanazja', 'lethal dose', 'amputacja bez znieczulenia'];

  validateAIOutput(output: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      blocked: false,
      flags: [],
      sanitizedOutput: output
    };

    if (this.containsProhibitedTerms(output)) {
      result.blocked = true;
      result.flags.push("Wykryto niedozwolone sformułowania.");
    }

    if (!output.plan || output.plan.length < 10) {
      result.isValid = false;
      result.flags.push("Notatka niekompletna: brak planu leczenia.");
    }

    return result;
  }

  flagUnsafeContent(output: any): string[] {
    const flags: string[] = [];
    if (output.dosage && output.dosage > 4000) {
      flags.push("OSTRZEŻENIE: Dawka leku przekracza bezpieczny limit (4000mg).");
    }
    return flags;
  }

  private containsProhibitedTerms(output: any): boolean {
    const text = JSON.stringify(output).toLowerCase();
    return this.PROHIBITED_TERMS.some(term => text.includes(term));
  }
}
