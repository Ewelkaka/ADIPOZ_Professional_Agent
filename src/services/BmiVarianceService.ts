import { AnalysisRecord } from './LocalPatientDB';

export type BmiVarianceAlertType = 'RAPID_LOSS' | 'RAPID_GAIN' | 'NORMAL';
export type BmiVarianceSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface BmiVisitSnapshot {
  label: string;
  date: string;
  timestamp: number;
  weight: number;
  height: number;
  bmi: number;
  recordId?: string;
  diagnosis?: string;
}

export interface BmiVarianceAnalysis {
  latestVisit: BmiVisitSnapshot;
  previousVisit: BmiVisitSnapshot;
  currentBmi: number;
  previousBmi: number;
  deltaBmi: number;
  absDeltaBmi: number;
  variance: number; // (deltaBmi)^2
  currentWeight: number;
  previousWeight: number;
  deltaWeight: number;
  percentWeightChange: number;
  daysBetween: number;
  paceKgPerWeek: number;
  threshold: number;
  hasAlert: boolean;
  alertType: BmiVarianceAlertType;
  severity: BmiVarianceSeverity;
  title: string;
  message: string;
  clinicalExplanation: string;
  redFlags: string[];
  recommendations: string[];
  differentialDiagnoses: string[];
}

export class BmiVarianceService {
  public static DEFAULT_THRESHOLD = 2.0; // Domyślny próg wariancji BMI (> 2.0 pkt)

  /**
   * Wylicza wskaźnik BMI
   */
  static calculateBmi(weightKg: number, heightCm: number): number {
    if (!weightKg || !heightCm || heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
  }

  /**
   * Główna funkcja wyliczająca wariancję BMI i analizę dynamiki między dwoma punktami wizyt
   */
  static analyzeBmiVariance(
    latest: BmiVisitSnapshot,
    previous: BmiVisitSnapshot,
    threshold: number = BmiVarianceService.DEFAULT_THRESHOLD
  ): BmiVarianceAnalysis {
    const currentBmi = Number(latest.bmi.toFixed(2));
    const previousBmi = Number(previous.bmi.toFixed(2));
    const deltaBmi = Number((currentBmi - previousBmi).toFixed(2));
    const absDeltaBmi = Number(Math.abs(deltaBmi).toFixed(2));
    const variance = Number(Math.pow(deltaBmi, 2).toFixed(2));

    const currentWeight = Number(latest.weight.toFixed(1));
    const previousWeight = Number(previous.weight.toFixed(1));
    const deltaWeight = Number((currentWeight - previousWeight).toFixed(1));
    const percentWeightChange = previousWeight > 0
      ? Number(((deltaWeight / previousWeight) * 100).toFixed(1))
      : 0;

    const timeDiffMs = Math.abs(latest.timestamp - previous.timestamp);
    const daysBetween = Math.max(1, Math.round(timeDiffMs / (1000 * 60 * 60 * 24)));
    const paceKgPerWeek = Number(((deltaWeight / daysBetween) * 7).toFixed(2));

    const hasAlert = absDeltaBmi >= threshold;

    let alertType: BmiVarianceAlertType = 'NORMAL';
    let severity: BmiVarianceSeverity = 'INFO';
    let title = 'Stabilna dynamika masy ciała (brak alertu)';
    let message = `Różnica wskaźnika BMI (${deltaBmi > 0 ? `+${deltaBmi}` : deltaBmi} pkt) mieści się w bezpiecznym przedziale klinicznym poniżej progu ${threshold} pkt.`;
    let clinicalExplanation = 'Dynamika zmian masy ciała i wskaźnika BMI pacjenta między ostatnimi wizytami nie wykazuje niepokojących odchyleń.';
    let redFlags: string[] = [];
    let recommendations: string[] = [];
    let differentialDiagnoses: string[] = [];

    if (hasAlert) {
      if (deltaBmi <= -threshold) {
        alertType = 'RAPID_LOSS';
        const isCritical = absDeltaBmi >= 3.0 || (daysBetween <= 45 && absDeltaBmi >= 2.0);
        severity = isCritical ? 'CRITICAL' : 'WARNING';
        
        title = `⚠️ ALERT: Zbyt szybka utrata masy ciała (spadek o ${absDeltaBmi} pkt BMI)`;
        message = `U pacjenta odnotowano gwałtowny spadek BMI o ${absDeltaBmi} pkt (${deltaWeight} kg, ${percentWeightChange}%) w czasie ${daysBetween} dni (tempo: ${Math.abs(paceKgPerWeek)} kg/tydz.). Przekroczono próg ostrzegawczy ${threshold} pkt BMI.`;
        
        clinicalExplanation = `Niezamierzona i dynamiczna redukcja masy ciała u pacjenta stanowi istotny objaw alarmowy (tzw. "czerwoną flagę" w POZ). Gwałtowny ubytek tkanki beztłuszczowej i tłuszczowej wymaga pilnego różnicowania w celu wykluczenia podłoża onkologicznego, endokrynologicznego oraz gastroenterologicznego.`;
        
        redFlags = [
          `Gwałtowny spadek BMI: -${absDeltaBmi} pkt w ciągu ${daysBetween} dni`,
          `Utrata masy ciała: ${Math.abs(deltaWeight)} kg (${Math.abs(percentWeightChange)}% wyjściowej masy)`,
          `Szacowane tempo utraty: ${Math.abs(paceKgPerWeek)} kg na tydzień (norma bezpieczna: < 0.5-1.0 kg/tydz.)`
        ];

        recommendations = [
          'Pilna morfologia krwi obwodowej z rozmazem manualnym, OB i CRP',
          'Pakiet metaboliczno-hormonalny: TSH, fT4, glukoza na czczo, HbA1c',
          'Biochemia: mocznik, kreatynina, próby wątrobowe (ALT, AST, GGTP, bilirubina), elektrolity (Na, K, Ca), ferrytyna, żelazo',
          'Diagnostyka obrazowa: USG jamy brzusznej i przestrzeni zaotrzewnowej, RTG klatki piersiowej PA',
          'Ocena przewodu pokarmowego: krew utajona w kale (FIT) / skierowanie na gastroskopię i kolonoskopię',
          'Wywiad żywieniowy, ocena objawów depresyjnych oraz zaburzeń połykania/wchłaniania'
        ];

        differentialDiagnoses = [
          'Choroba nowotworowa (zespół kacheksji nowotworowej / paranowotworowy)',
          'Nadczynność tarczycy (wole guzkowe toksyczne, choroba Gravesa-Basedowa)',
          'Nierozpoznana lub niewyrównana cukrzyca (cukrzyca typu 1 / zaostrzenie typu 2)',
          'Zespoły złego wchłaniania i celiakia / nieswoiste zapalenia jelit (ChLC, WZJG)',
          'Przewlekłe infekcje (gruźlica, przewlekłe zakażenia wirusowe)',
          'Zaburzenia afektywne (ciężki epizod depresyjny, jadłowstręt psychiczny)'
        ];
      } else if (deltaBmi >= threshold) {
        alertType = 'RAPID_GAIN';
        const isCritical = absDeltaBmi >= 3.0 || (daysBetween <= 45 && absDeltaBmi >= 2.0);
        severity = isCritical ? 'CRITICAL' : 'WARNING';
        
        title = `⚠️ ALERT: Zbyt szybki przyrost masy ciała (wzrost o +${absDeltaBmi} pkt BMI)`;
        message = `U pacjenta odnotowano dynamiczny przyrost BMI o +${absDeltaBmi} pkt (+${deltaWeight} kg, +${percentWeightChange}%) w czasie ${daysBetween} dni (tempo: +${paceKgPerWeek} kg/tydz.). Przekroczono próg ostrzegawczy ${threshold} pkt BMI.`;
        
        clinicalExplanation = `Gwałtowny przyrost masy ciała w krótkim czasie rzadko wynika wyłącznie z nagromadzenia tkanki tłuszczowej i najczęściej jest sygnałem retencji płynów (obrzęków ukrytych i jawnych) w przebiegu dekompensacji układu krążenia, niewydolności nerek lub ciężkich zaburzeń metaboliczno-endokrynnych.`;
        
        redFlags = [
          `Dynamiczny skok BMI: +${absDeltaBmi} pkt w ciągu ${daysBetween} dni`,
          `Przyrost masy ciała: +${deltaWeight} kg (+${percentWeightChange}% masy ciała)`,
          `Szacowane tempo przyrostu: +${paceKgPerWeek} kg na tydzień`
        ];

        recommendations = [
          'Ocena w kierunku retencji płynów: badanie pod kątem obrzęków obwodowych, zastoju nad polami płucnymi i poszerzenia żył szyjnych',
          'Biomarkery sercowe: oznaczenie NT-proBNP / BNP w celu wykluczenia zaostrzenia niewydolności serca',
          'Ocena funkcji nerek: eGFR, kreatynina, mocznik, badanie ogólne moczu pod kątem białkomoczu (zespół nerczycowy)',
          'Profil hormonalny: TSH (ciężka niedoczynność tarczycy), kortyzol poranny / test z deksametazonem (zespół Cushinga)',
          'Weryfikacja farmakoterapii: sterydoterapia ogólna, leki przeciwcukrzycowe (pochodne sulfonylomocznika, insulina, pioglitazon), neuroleptyki, NLPZ',
          'Wdrożenie ograniczenia podaży sodu i płynów oraz ewentualna modyfikacja dawki diuretyków'
        ];

        differentialDiagnoses = [
          'Zaostrzenie przewlekłej niewydolności serca (dekompensacja krążenia, NYHA II-IV)',
          'Niewydolność nerek / zespół nerczycowy (retencja sodu i wody)',
          'Ciężka niewyrównana niedoczynność tarczycy (obrzęk śluzowaty)',
          'Działanie niepożądane leków (glikokortykosteroidy, leki przeciwpsychotyczne, pregabalina, NLPZ)',
          'Zespół Cushinga (endogenny hiperkortyzolizm)'
        ];
      }
    }

    return {
      latestVisit: latest,
      previousVisit: previous,
      currentBmi,
      previousBmi,
      deltaBmi,
      absDeltaBmi,
      variance,
      currentWeight,
      previousWeight,
      deltaWeight,
      percentWeightChange,
      daysBetween,
      paceKgPerWeek,
      threshold,
      hasAlert,
      alertType,
      severity,
      title,
      message,
      clinicalExplanation,
      redFlags,
      recommendations,
      differentialDiagnoses
    };
  }

  /**
   * Wyodrębnia dwie ostatnie wizyty z historii (lub bieżącej konsultacji) i wylicza analizę wariancji BMI
   */
  static evaluatePatientHistory(
    history: AnalysisRecord[],
    currentPatientInfo?: any,
    threshold: number = BmiVarianceService.DEFAULT_THRESHOLD
  ): BmiVarianceAnalysis | null {
    // 1. Zbuduj listę punktów pomiarowych (posortowanych od najnowszego do najstarszego)
    const snapshots: BmiVisitSnapshot[] = [];

    // Jeśli przekazano bieżące dane pacjenta z formularza
    if (
      currentPatientInfo &&
      currentPatientInfo.weight &&
      currentPatientInfo.height &&
      !isNaN(Number(currentPatientInfo.weight)) &&
      !isNaN(Number(currentPatientInfo.height))
    ) {
      const weight = Number(currentPatientInfo.weight);
      const height = Number(currentPatientInfo.height);
      const bmi = currentPatientInfo.bmi || BmiVarianceService.calculateBmi(weight, height);

      snapshots.push({
        label: 'Bieżąca konsultacja',
        date: new Date().toLocaleDateString('pl-PL'),
        timestamp: Date.now(),
        weight,
        height,
        bmi: Number(bmi.toFixed(2)),
        recordId: 'current'
      });
    }

    // Dodaj wizyty z bazy historii
    if (history && history.length > 0) {
      // Posortuj od najnowszej
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      for (const record of sortedHistory) {
        const weight = record.patientInfo?.weight || record.vitals?.weight;
        const height = record.patientInfo?.height || record.vitals?.height;
        if (weight && height && !isNaN(Number(weight)) && !isNaN(Number(height))) {
          const w = Number(weight);
          const h = Number(height);
          const bmi = record.patientInfo?.bmi || BmiVarianceService.calculateBmi(w, h);
          const recordDate = new Date(record.timestamp);

          // Jeśli bieżący snapshot jest identyczny pod względem timestampu lub wagi/daty (ta sama sekunda), pomiń duplikat
          const isDuplicate = snapshots.some(
            s => Math.abs(s.timestamp - recordDate.getTime()) < 1000 && s.weight === w
          );

          if (!isDuplicate) {
            snapshots.push({
              label: `Wizyta z dn. ${recordDate.toLocaleDateString('pl-PL')}`,
              date: recordDate.toLocaleDateString('pl-PL'),
              timestamp: recordDate.getTime(),
              weight: w,
              height: h,
              bmi: Number(bmi.toFixed(2)),
              recordId: record.id,
              diagnosis: record.analysis?.decision?.diagnosis || 'Wizyta lekarska'
            });
          }
        }
      }
    }

    // Wymagane są przynajmniej 2 punkty pomiarowe
    if (snapshots.length < 2) {
      return null;
    }

    const latest = snapshots[0];
    const previous = snapshots[1];

    return BmiVarianceService.analyzeBmiVariance(latest, previous, threshold);
  }
}
