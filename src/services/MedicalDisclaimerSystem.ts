export interface DisclaimerWrapper<T> {
  data: T;
  disclaimer: string;
  timestamp: string;
}

export class MedicalDisclaimerSystem {
  private readonly DISCLAIMER_TEXT = 
    "UWAGA: System jest narzędziem wspierającym decyzje kliniczne. " +
    "Nie zastępuje on profesjonalnej oceny medycznej. " +
    "Ostateczna decyzja diagnostyczna i terapeutyczna należy wyłącznie do lekarza prowadzącego.";

  attachDisclaimer<T>(output: T): DisclaimerWrapper<T> {
    return {
      data: output,
      disclaimer: this.DISCLAIMER_TEXT,
      timestamp: new Date().toISOString()
    };
  }
}
