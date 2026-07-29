export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface ClinicalAlert {
  id: string;
  severity: AlertSeverity;
  message: string;
}

export class ClinicalAlertEngine {
  static analyzeInput(input: string): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];
    const lowerInput = input.toLowerCase();

    // Simple keyword-based analysis
    if (lowerInput.includes('ból w klatce') || lowerInput.includes('duszność')) {
      alerts.push({
        id: 'chest-pain',
        severity: AlertSeverity.CRITICAL,
        message: 'Wykryto objawy sugerujące stan zagrożenia życia (ból w klatce/duszność). Wymagana natychmiastowa interwencja!'
      });
    }

    if (lowerInput.includes('gorączka') && lowerInput.includes('39')) {
      alerts.push({
        id: 'high-fever',
        severity: AlertSeverity.WARNING,
        message: 'Wysoka gorączka (>39°C) - monitoruj stan pacjenta.'
      });
    }

    // Blood pressure pattern (e.g., "BP 180/110")
    const bpMatch = lowerInput.match(/(\d{3})\/(\d{2,3})/);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1]);
      const dia = parseInt(bpMatch[2]);
      if (sys >= 180 || dia >= 120) {
        alerts.push({
          id: 'hypertensive-crisis',
          severity: AlertSeverity.CRITICAL,
          message: `Wykryto przełom nadciśnieniowy (${sys}/${dia}). Wymagana natychmiastowa reakcja!`
        });
      } else if (sys >= 140 || dia >= 90) {
        alerts.push({
          id: 'hypertension',
          severity: AlertSeverity.WARNING,
          message: `Wykryto podwyższone ciśnienie (${sys}/${dia}).`
        });
      }
    }

    return alerts;
  }
}
