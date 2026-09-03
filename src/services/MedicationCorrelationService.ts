import { BmiChartPointData } from '../components/CustomBmiTooltip';

export interface MedicationEvent {
  recordId?: string;
  date: string;
  time?: string;
  timestamp: number;
  newMedications: string[];
  allMedications: string[];
  weightAtEvent?: number;
  bmiAtEvent?: number;
  weightDeltaAfterMed?: number;
  bmiDeltaAfterMed?: number;
  daysObservedAfterMed?: number;
  latestWeight?: number;
  latestBmi?: number;
  trend: 'LOSS' | 'GAIN' | 'STABLE' | 'PENDING';
  clinicalNote: string;
}

export class MedicationCorrelationService {
  /**
   * Wyciąga listę poszczególnych leków z ciągu tekstowego
   */
  static parseMedicationsList(medsStr?: string): string[] {
    if (!medsStr || typeof medsStr !== 'string') return [];
    
    // Normalizacja separatorów
    const normalized = medsStr
      .replace(/\r\n/g, '\n')
      .replace(/[\n;+•]/g, ',')
      .replace(/\band\b/gi, ',')
      .replace(/\boraz\b/gi, ',');

    return normalized
      .split(',')
      .map(item => item.trim())
      .filter(item => {
        if (!item || item.length < 2) return false;
        const lower = item.toLowerCase();
        return !['brak', 'brak leków', 'none', 'nie dotyczy', 'nd', '-', 'brak stałych leków'].includes(lower);
      });
  }

  /**
   * Zwraca uproszczony rdzeń nazwy leku do porównywania czy lek jest nowy
   */
  static extractDrugRoot(drug: string): string {
    return drug
      .toLowerCase()
      .replace(/\d+(\.\d+)?\s*(mg|g|mcg|µg|ml|j\.m\.|jm|iu|tabl|tab|kaps|s\.c\.|dawk|x\d+)/gi, '')
      .replace(/\b\d+x\d+\b/gi, '')
      .replace(/[^a-ząćęłńóśźż\s]/gi, ' ')
      .trim()
      .split(/\s+/)[0] || drug.toLowerCase().trim();
  }

  /**
   * Wzbogaca dane wykresu BMI o znaczniki nowych leków oraz korelację z dynamiką masy ciała
   */
  static enrichChartDataWithMedicationEvents(chartData: BmiChartPointData[]): BmiChartPointData[] {
    if (!chartData || chartData.length === 0) return [];

    // Upewniamy się, że dane są posortowane chronologicznie
    const sorted = [...chartData].sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    const seenDrugRoots = new Set<string>();
    const latestPoint = sorted[sorted.length - 1];
    const latestWeight = latestPoint?.weight;
    const latestBmi = latestPoint?.bmi;

    return sorted.map((point, index) => {
      const currentMeds = this.parseMedicationsList(point.medications);
      const newMeds: string[] = [];

      currentMeds.forEach(drug => {
        const root = this.extractDrugRoot(drug);
        if (root && root.length > 2 && !seenDrugRoots.has(root)) {
          newMeds.push(drug);
          seenDrugRoots.add(root);
        }
      });

      const hasNewMedication = newMeds.length > 0;
      let weightDeltaAfterMed: number | undefined = undefined;
      let bmiDeltaAfterMed: number | undefined = undefined;
      let daysObservedAfterMed: number | undefined = undefined;
      let medicationChangeNote: string | undefined = undefined;

      if (hasNewMedication && point.weight !== undefined && latestWeight !== undefined) {
        weightDeltaAfterMed = parseFloat((latestWeight - point.weight).toFixed(1));
        if (point.bmi !== undefined && latestBmi !== undefined) {
          bmiDeltaAfterMed = parseFloat((latestBmi - point.bmi).toFixed(1));
        }

        const pointTime = typeof point.timestamp === 'number' ? point.timestamp : new Date(point.timestamp).getTime();
        const latestTime = typeof latestPoint.timestamp === 'number' ? latestPoint.timestamp : new Date(latestPoint.timestamp).getTime();
        daysObservedAfterMed = Math.max(0, Math.round((latestTime - pointTime) / (1000 * 60 * 60 * 24)));

        if (weightDeltaAfterMed < -0.5) {
          medicationChangeNote = `Redukcja wagi o ${Math.abs(weightDeltaAfterMed)} kg (${Math.abs(bmiDeltaAfterMed || 0)} pkt BMI) po wdrożeniu leków`;
        } else if (weightDeltaAfterMed > 0.5) {
          medicationChangeNote = `Przyrost wagi o +${weightDeltaAfterMed} kg (+${bmiDeltaAfterMed || 0} pkt BMI) po wdrożeniu leków`;
        } else {
          medicationChangeNote = `Stabilizacja masy ciała (Δ ${weightDeltaAfterMed} kg) po wdrożeniu leków`;
        }
      }

      return {
        ...point,
        hasNewMedication,
        newMedications: hasNewMedication ? newMeds : undefined,
        allMedications: currentMeds,
        medicationChangeNote,
        weightDeltaAfterMed,
        bmiDeltaAfterMed,
        daysObservedAfterMed
      };
    });
  }

  /**
   * Pobiera listę wszystkich wykrytych zdarzeń farmakoterapii do celów analitycznych i osi czasu
   */
  static extractMedicationEvents(enrichedChartData: BmiChartPointData[]): MedicationEvent[] {
    const events: MedicationEvent[] = [];
    const latestPoint = enrichedChartData[enrichedChartData.length - 1];

    enrichedChartData.forEach(point => {
      if (point.hasNewMedication && point.newMedications && point.newMedications.length > 0) {
        const pointTime = typeof point.timestamp === 'number' ? point.timestamp : new Date(point.timestamp).getTime();
        const deltaW = point.weightDeltaAfterMed;
        const deltaB = point.bmiDeltaAfterMed;

        let trend: 'LOSS' | 'GAIN' | 'STABLE' | 'PENDING' = 'PENDING';
        if (deltaW !== undefined) {
          if (deltaW < -0.5) trend = 'LOSS';
          else if (deltaW > 0.5) trend = 'GAIN';
          else trend = 'STABLE';
        }

        let clinicalNote = '';
        if (trend === 'LOSS') {
          clinicalNote = `Korelacja z redukcją masy ciała: -${Math.abs(deltaW!)} kg (-${Math.abs(deltaB || 0)} pkt BMI)`;
        } else if (trend === 'GAIN') {
          clinicalNote = `Korelacja ze wzrostem masy ciała: +${deltaW} kg (+${deltaB || 0} pkt BMI)`;
        } else if (trend === 'STABLE') {
          clinicalNote = `Stabilizacja masy ciała w okresie obserwacji (Δ ${deltaW || 0} kg)`;
        } else {
          clinicalNote = 'Nowo wdrożona farmakoterapia – trwa zbieranie danych';
        }

        events.push({
          recordId: point.recordId,
          date: point.date,
          time: point.time,
          timestamp: pointTime,
          newMedications: point.newMedications,
          allMedications: point.allMedications || [],
          weightAtEvent: point.weight,
          bmiAtEvent: point.bmi,
          weightDeltaAfterMed: deltaW,
          bmiDeltaAfterMed: deltaB,
          daysObservedAfterMed: point.daysObservedAfterMed,
          latestWeight: latestPoint?.weight,
          latestBmi: latestPoint?.bmi,
          trend,
          clinicalNote
        });
      }
    });

    return events;
  }
}
