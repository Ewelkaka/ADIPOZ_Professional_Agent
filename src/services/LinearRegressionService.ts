import { BmiChartPointData } from '../components/CustomBmiTooltip';
import { WeightGoal } from './WeightGoalService';

export interface RegressionMetrics {
  slopeKgPerDay: number;         // Nachylenie w kg/dzień
  slopeKgPerMonth: number;       // Nachylenie w kg/miesiąc (30.44 dni)
  slopeKgPerWeek: number;        // Nachylenie w kg/tydzień
  slopeBmiPerMonth?: number;     // Nachylenie BMI w pkt/miesiąc
  interceptKg: number;           // Wartość początkowa b
  rSquared: number;              // Współczynnik determinacji R² (0..1)
  correlation: number;           // Współczynnik korelacji r (-1..1)
  pointsCount: number;           // Liczba punktów pomiarowych
  startDate: string;             // Data pierwszego pomiaru
  latestDate: string;            // Data ostatniego pomiaru
  totalDaysSpan: number;         // Liczba dni między pierwszym a ostatnim pomiarem
  startWeight: number;           // Pierwsza waga (kg)
  latestWeight: number;          // Ostatnia waga (kg)
  totalWeightDelta: number;      // Całkowita zmiana wagi (kg)
  formulaString: string;         // Równanie prostej: y = ax + b
}

export type TrendDirection = 'LOSS' | 'GAIN' | 'STABLE' | 'INSUFFICIENT_DATA';
export type PredictionStatus = 'ON_TRACK' | 'AHEAD_OF_SCHEDULE' | 'BEHIND_SCHEDULE' | 'DIVERGING' | 'ACHIEVED' | 'PLATEAU' | 'NO_GOAL' | 'INSUFFICIENT_DATA';

export interface GoalPredictionResult {
  status: PredictionStatus;
  targetWeightKg?: number;
  targetBmi?: number;
  remainingKg?: number;
  predictedDate?: string;        // Przewidywana data osiągnięcia celu (np. "18 listopada 2026")
  predictedDaysRemaining?: number; // Liczba dni do osiągnięcia celu
  scheduledTargetDate?: string;  // Wyznaczony przez lekarza termin
  scheduleDifferenceDays?: number; // Różnica w dniach względem planu (ujemna = szybciej, dodatnia = opóźnienie)
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  clinicalSummary: string;       // Zwięzły opis predykcyjny dla lekarza
  recommendation: string;        // Wskazówka lekarska
}

export interface WeightTrendAnalysis {
  hasEnoughData: boolean;
  metrics: RegressionMetrics | null;
  trendDirection: TrendDirection;
  prediction: GoalPredictionResult;
}

export interface ProjectedPointData extends BmiChartPointData {
  isProjected?: boolean;
  projectedLabel?: string;
  weightTrend?: number;
  bmiTrend?: number;
}

export class LinearRegressionService {
  /**
   * Oblicza regresję liniową metodą najmniejszych kwadratów (OLS)
   * na podstawie historycznych pomiarów wagi w funkcji czasu (dni)
   */
  static calculateRegression(
    points: BmiChartPointData[],
    heightCm?: number
  ): RegressionMetrics | null {
    // Filtrujemy tylko punkty z prawidłową wagą i timestampem
    const validPoints = points
      .filter(p => p.weight !== undefined && !isNaN(Number(p.weight)) && Number(p.weight) > 0)
      .sort((a, b) => {
        const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
        const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
        return tA - tB;
      });

    if (validPoints.length < 2) {
      return null;
    }

    const t0 = typeof validPoints[0].timestamp === 'number'
      ? validPoints[0].timestamp
      : new Date(validPoints[0].timestamp).getTime();

    const n = validPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    const dataPairs: { x: number; y: number }[] = [];

    validPoints.forEach(p => {
      const t = typeof p.timestamp === 'number' ? p.timestamp : new Date(p.timestamp).getTime();
      const xDays = (t - t0) / (1000 * 60 * 60 * 24); // Czas w dniach od pierwszego pomiaru
      const yWeight = Number(p.weight);

      dataPairs.push({ x: xDays, y: yWeight });

      sumX += xDays;
      sumY += yWeight;
      sumXY += xDays * yWeight;
      sumXX += xDays * xDays;
      sumYY += yWeight * yWeight;
    });

    const meanX = sumX / n;
    const meanY = sumY / n;

    const sXX = sumXX - (sumX * sumX) / n;
    const sXY = sumXY - (sumX * sumY) / n;
    const sYY = sumYY - (sumY * sumY) / n;

    // Gdy wszystkie pomiary odbyły się tego samego dnia (sXX === 0), nachylenie jest nieokreślone
    if (Math.abs(sXX) < 0.0001) {
      return null;
    }

    const slope = sXY / sXX; // kg na dzień
    const intercept = meanY - slope * meanX; // waga w dniu t0

    // Obliczanie współczynnika determinacji R²
    let rSquared = 0;
    let correlation = 0;
    if (sYY > 0.0001) {
      correlation = sXY / Math.sqrt(sXX * sYY);
      rSquared = Math.max(0, Math.min(1, correlation * correlation));
    }

    const slopeKgPerMonth = slope * 30.4375;
    const slopeKgPerWeek = slope * 7;
    
    let slopeBmiPerMonth: number | undefined = undefined;
    if (heightCm && heightCm > 0) {
      const heightM = heightCm / 100;
      slopeBmiPerMonth = parseFloat((slopeKgPerMonth / (heightM * heightM)).toFixed(2));
    }

    const firstP = validPoints[0];
    const lastP = validPoints[validPoints.length - 1];
    const lastTime = typeof lastP.timestamp === 'number' ? lastP.timestamp : new Date(lastP.timestamp).getTime();
    const totalDays = Math.max(1, Math.round((lastTime - t0) / (1000 * 60 * 60 * 24)));
    const totalDelta = parseFloat((Number(lastP.weight) - Number(firstP.weight)).toFixed(1));

    const slopeSign = slope >= 0 ? '+' : '';
    const formulaString = `Waga(t) = ${slopeSign}${slope.toFixed(3)} · t + ${intercept.toFixed(1)} kg`;

    return {
      slopeKgPerDay: slope,
      slopeKgPerMonth: parseFloat(slopeKgPerMonth.toFixed(2)),
      slopeKgPerWeek: parseFloat(slopeKgPerWeek.toFixed(2)),
      slopeBmiPerMonth,
      interceptKg: parseFloat(intercept.toFixed(1)),
      rSquared: parseFloat(rSquared.toFixed(3)),
      correlation: parseFloat(correlation.toFixed(3)),
      pointsCount: n,
      startDate: firstP.date,
      latestDate: lastP.date,
      totalDaysSpan: totalDays,
      startWeight: Number(firstP.weight),
      latestWeight: Number(lastP.weight),
      totalWeightDelta: totalDelta,
      formulaString
    };
  }

  /**
   * Przeprowadza pełną analizę trendu i prognozuje moment osiągnięcia celu wagowego
   */
  static analyzeTrendAndGoal(
    points: BmiChartPointData[],
    weightGoal: WeightGoal | null,
    heightCm?: number
  ): WeightTrendAnalysis {
    const metrics = this.calculateRegression(points, heightCm);

    if (!metrics || metrics.pointsCount < 2) {
      return {
        hasEnoughData: false,
        metrics: null,
        trendDirection: 'INSUFFICIENT_DATA',
        prediction: {
          status: 'INSUFFICIENT_DATA',
          confidence: 'LOW',
          clinicalSummary: 'Wymagane są co najmniej 2 pomiary wagi w różnych terminach do wyznaczenia linii trendu regresji.',
          recommendation: 'Zarejestruj kolejną wizytę lub pomiar masy ciała pacjenta, aby aktywować model predykcyjny.'
        }
      };
    }

    // Określenie kierunku trendu
    let trendDirection: TrendDirection = 'STABLE';
    if (metrics.slopeKgPerMonth < -0.3) {
      trendDirection = 'LOSS';
    } else if (metrics.slopeKgPerMonth > 0.3) {
      trendDirection = 'GAIN';
    } else {
      trendDirection = 'STABLE';
    }

    // Analiza predykcji celu
    const prediction = this.predictGoalAchievement(metrics, weightGoal, points, heightCm);

    return {
      hasEnoughData: true,
      metrics,
      trendDirection,
      prediction
    };
  }

  /**
   * Prognozuje datę osiągnięcia celu wagowego na podstawie parametrów regresji
   */
  private static predictGoalAchievement(
    metrics: RegressionMetrics,
    weightGoal: WeightGoal | null,
    points: BmiChartPointData[],
    heightCm?: number
  ): GoalPredictionResult {
    if (!weightGoal || !weightGoal.targetWeight || isNaN(Number(weightGoal.targetWeight))) {
      const summary = metrics.slopeKgPerMonth < 0
        ? `Pacjent wykazuje stabilny trend redukcji masy ciała o ${Math.abs(metrics.slopeKgPerMonth)} kg/miesiąc.`
        : metrics.slopeKgPerMonth > 0
        ? `Pacjent wykazuje trend przyrostu masy ciała o +${metrics.slopeKgPerMonth} kg/miesiąc.`
        : `Masa ciała pacjenta pozostaje ustabilizowana (tempo zmian: ${metrics.slopeKgPerMonth} kg/miesiąc).`;

      return {
        status: 'NO_GOAL',
        confidence: metrics.rSquared > 0.7 ? 'HIGH' : metrics.rSquared > 0.4 ? 'MEDIUM' : 'LOW',
        clinicalSummary: `${summary} Brak zdefiniowanego celu wagowego w profilu pacjenta.`,
        recommendation: 'Wyznacz cel wagowy (np. redukcja o 5-10%), aby uzyskać dokładną prognozę daty jego realizacji.'
      };
    }

    const targetWeight = Number(weightGoal.targetWeight);
    const latestWeight = metrics.latestWeight;
    const remainingKg = parseFloat(Math.abs(latestWeight - targetWeight).toFixed(1));
    const targetBmi = heightCm && heightCm > 0
      ? parseFloat((targetWeight / Math.pow(heightCm / 100, 2)).toFixed(1))
      : undefined;

    // 1. Sprawdzenie czy cel jest już osiągnięty
    const isWeightLossGoal = targetWeight < metrics.startWeight || (weightGoal.startWeight && targetWeight < weightGoal.startWeight);
    const isWeightGainGoal = targetWeight > metrics.startWeight || (weightGoal.startWeight && targetWeight > weightGoal.startWeight);

    if (
      (isWeightLossGoal && latestWeight <= targetWeight) ||
      (isWeightGainGoal && latestWeight >= targetWeight) ||
      Math.abs(latestWeight - targetWeight) <= 0.3
    ) {
      return {
        status: 'ACHIEVED',
        targetWeightKg: targetWeight,
        targetBmi,
        remainingKg: 0,
        confidence: 'HIGH',
        clinicalSummary: `🎯 Założony cel wagowy (${targetWeight} kg / ${targetBmi ? targetBmi + ' BMI' : ''}) został pomyślnie osiągnięty! Aktualna waga pacjenta to ${latestWeight} kg.`,
        recommendation: 'Zaleć utrzymanie bieżącej diety i aktywności fizycznej oraz zaplanuj wizytę kontrolną podtrzymującą.'
      };
    }

    // 2. Sprawdzenie czy trend jest w stagnacji (plateau)
    if (Math.abs(metrics.slopeKgPerDay) < 0.005) { // mniej niż ~0.15 kg/miesiąc
      return {
        status: 'PLATEAU',
        targetWeightKg: targetWeight,
        targetBmi,
        remainingKg,
        confidence: 'MEDIUM',
        clinicalSummary: `⚖️ Zjawisko Plateau: Masa ciała pacjenta uległa stabilizacji na poziomie ok. ${latestWeight} kg (tempo: ${metrics.slopeKgPerMonth} kg/m-c).`,
        recommendation: 'Wskazana weryfikacja kaloryczności diety, modyfikacja planu treningowego lub przegląd farmakoterapii w celu wznowienia progresu.'
      };
    }

    // 3. Sprawdzenie czy trend zmierza w kierunku celu czy się oddala
    const isMovingTowardsGoal = (isWeightLossGoal && metrics.slopeKgPerDay < 0) || (isWeightGainGoal && metrics.slopeKgPerDay > 0);

    if (!isMovingTowardsGoal) {
      const trendText = metrics.slopeKgPerDay > 0 ? `wzrostu (+${metrics.slopeKgPerMonth} kg/m-c)` : `spadku (${metrics.slopeKgPerMonth} kg/m-c)`;
      return {
        status: 'DIVERGING',
        targetWeightKg: targetWeight,
        targetBmi,
        remainingKg,
        confidence: metrics.rSquared > 0.6 ? 'HIGH' : 'MEDIUM',
        clinicalSummary: `⚠️ Rozbieżność z celem: Wykryto trend ${trendText}, który oddala pacjenta od założonego celu (${targetWeight} kg). Do celu brakuje ${remainingKg} kg.`,
        recommendation: 'Konieczna pilna interwencja behawioralno-dietetyczna oraz ocena adherencji lekowej i potencjalnych działań niepożądanych.'
      };
    }

    // 4. Ekstrapolacja liniowa: obliczenie liczby dni do osiągnięcia celu
    // Waga(x) = slope * x + intercept  =>  targetWeight = slope * x_target + intercept
    // x_target = (targetWeight - intercept) / slope (dni od t0)
    const validPoints = points
      .filter(p => p.weight !== undefined && !isNaN(Number(p.weight)))
      .sort((a, b) => {
        const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
        const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
        return tA - tB;
      });

    const t0: number = typeof validPoints[0].timestamp === 'number'
      ? validPoints[0].timestamp
      : new Date(validPoints[0].timestamp).getTime();

    const lastTime: number = typeof validPoints[validPoints.length - 1].timestamp === 'number'
      ? (validPoints[validPoints.length - 1].timestamp as number)
      : new Date(validPoints[validPoints.length - 1].timestamp).getTime();

    const targetDaysFromT0 = (targetWeight - metrics.interceptKg) / metrics.slopeKgPerDay;
    const currentDaysFromT0 = (lastTime - t0) / (1000 * 60 * 60 * 24);
    const remainingDays = Math.max(1, Math.round(targetDaysFromT0 - currentDaysFromT0));

    const predictedTargetTimestamp: number = lastTime + remainingDays * (1000 * 60 * 60 * 24);
    const predictedDateObj = new Date(predictedTargetTimestamp);
    const predictedDateStr = predictedDateObj.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Poziom ufności modelu na podstawie R² i liczby pomiarów
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (metrics.rSquared >= 0.75 && metrics.pointsCount >= 3) {
      confidence = 'HIGH';
    } else if (metrics.rSquared >= 0.45 || metrics.pointsCount >= 2) {
      confidence = 'MEDIUM';
    }

    // Porównanie z terminem planowanym (jeśli podano targetDate w WeightGoal)
    let status: PredictionStatus = 'ON_TRACK';
    let scheduleDifferenceDays: number | undefined = undefined;
    let scheduledDateFormatted: string | undefined = undefined;

    if (weightGoal.targetDate) {
      const scheduledTargetTime = new Date(weightGoal.targetDate).getTime();
      if (!isNaN(scheduledTargetTime)) {
        scheduledDateFormatted = new Date(scheduledTargetTime).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        scheduleDifferenceDays = Math.round((predictedTargetTimestamp - scheduledTargetTime) / (1000 * 60 * 60 * 24));

        if (scheduleDifferenceDays <= -14) {
          status = 'AHEAD_OF_SCHEDULE';
        } else if (scheduleDifferenceDays >= 14) {
          status = 'BEHIND_SCHEDULE';
        } else {
          status = 'ON_TRACK';
        }
      }
    }

    let timingNote = '';
    if (status === 'AHEAD_OF_SCHEDULE' && scheduleDifferenceDays !== undefined) {
      timingNote = ` 🚀 Postęp wyprzedza planowany termin (${scheduledDateFormatted}) o ok. ${Math.abs(scheduleDifferenceDays)} dni!`;
    } else if (status === 'BEHIND_SCHEDULE' && scheduleDifferenceDays !== undefined) {
      timingNote = ` ⏱️ Tempo jest nieco wolniejsze od pierwotnego terminu (${scheduledDateFormatted}) o ok. ${scheduleDifferenceDays} dni.`;
    }

    const clinicalSummary = `📈 Przy bieżącym tempie redukcji (${Math.abs(metrics.slopeKgPerMonth)} kg/miesiąc, R²=${metrics.rSquared}), prognozowane osiągnięcie celu ${targetWeight} kg nastąpi: **${predictedDateStr}** (za ok. ${remainingDays} dni / ${Math.round(remainingDays / 30.4)} m-ce).${timingNote}`;

    const recommendation = metrics.slopeKgPerMonth < -4
      ? '⚠️ Uwaga: Tempo redukcji (>4 kg/m-c) jest wysokie. Wskazane monitorowanie elektrolitów i zapobieganie efektowi jojo.'
      : 'Utrzymuj dotychczasowe zalecenia terapeutyczne i kontynuuj regularny monitoring antropometryczny.';

    return {
      status,
      targetWeightKg: targetWeight,
      targetBmi,
      remainingKg,
      predictedDate: predictedDateStr,
      predictedDaysRemaining: remainingDays,
      scheduledTargetDate: scheduledDateFormatted,
      scheduleDifferenceDays,
      confidence,
      clinicalSummary,
      recommendation
    };
  }

  /**
   * Generuje dane wykresu wzbogacone o wartości trendu liniowego oraz opcjonalne punkty ekstrapolacji w przyszłość
   */
  static enrichChartDataWithRegression(
    chartData: BmiChartPointData[],
    metrics: RegressionMetrics | null,
    includeFutureForecast: boolean = true,
    targetPrediction?: GoalPredictionResult,
    heightCm?: number
  ): ProjectedPointData[] {
    if (!chartData || chartData.length === 0) return [];
    if (!metrics) return chartData.map(p => ({ ...p }));

    // Posortuj dane chronologicznie
    const sorted = [...chartData].sort((a, b) => {
      const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return tA - tB;
    });

    const t0: number = typeof sorted[0].timestamp === 'number'
      ? sorted[0].timestamp
      : new Date(sorted[0].timestamp).getTime();

    const heightM = heightCm && heightCm > 0 ? heightCm / 100 : undefined;

    // 1. Dodaj wartości linii trendu do punktów historycznych
    const enrichedHistory: ProjectedPointData[] = sorted.map(p => {
      const t: number = typeof p.timestamp === 'number' ? p.timestamp : new Date(p.timestamp).getTime();
      const xDays = (t - t0) / (1000 * 60 * 60 * 24);
      const weightTrendVal = parseFloat((metrics.slopeKgPerDay * xDays + metrics.interceptKg).toFixed(1));
      const bmiTrendVal = heightM
        ? parseFloat((weightTrendVal / (heightM * heightM)).toFixed(1))
        : undefined;

      return {
        ...p,
        weightTrend: weightTrendVal,
        bmiTrend: bmiTrendVal,
        isProjected: false
      };
    });

    // 2. Jeśli prognoza w przyszłość jest włączona i trend ma sens, dodaj punkty ekstrapolacji
    if (!includeFutureForecast || !targetPrediction) {
      return enrichedHistory;
    }

    const lastPoint = sorted[sorted.length - 1];
    const lastTimestamp: number = typeof lastPoint.timestamp === 'number'
      ? (lastPoint.timestamp as number)
      : new Date(lastPoint.timestamp).getTime();

    const forecastPoints: ProjectedPointData[] = [];

    // Jeśli cel jest w trakcie realizacji i mamy wyliczoną datę
    if (
      targetPrediction.predictedDaysRemaining &&
      targetPrediction.predictedDaysRemaining > 7 &&
      targetPrediction.status !== 'DIVERGING' &&
      targetPrediction.status !== 'ACHIEVED'
    ) {
      const totalDays = Math.min(365, targetPrediction.predictedDaysRemaining);

      // Krok 1: Punkt pośredni (+30 dni lub połowa drogi)
      const midDays = Math.round(totalDays / 2);
      if (midDays >= 14 && totalDays > 28) {
        const midTime = lastTimestamp + midDays * 86400000;
        const midDateObj = new Date(midTime);
        const xDaysMid = (midTime - t0) / 86400000;
        const midWeightTrend = parseFloat((metrics.slopeKgPerDay * xDaysMid + metrics.interceptKg).toFixed(1));
        const midBmiTrend = heightM
          ? parseFloat((midWeightTrend / (heightM * heightM)).toFixed(1))
          : undefined;

        forecastPoints.push({
          timestamp: midTime,
          date: midDateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
          time: 'Prognoza',
          bmi: midBmiTrend || 0,
          weight: undefined, // Brak kropki właściwej wagi
          weightTrend: midWeightTrend,
          bmiTrend: midBmiTrend,
          isProjected: true,
          projectedLabel: `Prognoza (+${midDays}d)`
        });
      }

      // Krok 2: Punkt docelowy (Dzień osiągnięcia celu)
      const targetTime = lastTimestamp + totalDays * 86400000;
      const targetDateObj = new Date(targetTime);
      const xDaysTarget = (targetTime - t0) / 86400000;
      const targetWeightTrend = targetPrediction.targetWeightKg !== undefined
        ? targetPrediction.targetWeightKg
        : parseFloat((metrics.slopeKgPerDay * xDaysTarget + metrics.interceptKg).toFixed(1));
      const targetBmiTrend = heightM
        ? parseFloat((targetWeightTrend / (heightM * heightM)).toFixed(1))
        : undefined;

      forecastPoints.push({
        timestamp: targetTime,
        date: targetDateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        time: 'Cel',
        bmi: targetBmiTrend || 0,
        weight: undefined,
        weightTrend: targetWeightTrend,
        bmiTrend: targetBmiTrend,
        isProjected: true,
        projectedLabel: `🎯 Cel: ${targetWeightTrend} kg`
      });
    } else if (metrics.slopeKgPerDay !== 0) {
      // Standardowa ekstrapolacja na 30 i 60 dni w przód, gdy brak celu
      [30, 60].forEach(d => {
        const fTime = lastTimestamp + d * 86400000;
        const fDateObj = new Date(fTime);
        const xDays = (fTime - t0) / 86400000;
        const fWeightTrend = parseFloat((metrics.slopeKgPerDay * xDays + metrics.interceptKg).toFixed(1));
        const fBmiTrend = heightM ? parseFloat((fWeightTrend / (heightM * heightM)).toFixed(1)) : undefined;

        forecastPoints.push({
          timestamp: fTime,
          date: fDateObj.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
          time: 'Prognoza',
          bmi: fBmiTrend || 0,
          weight: undefined,
          weightTrend: fWeightTrend,
          bmiTrend: fBmiTrend,
          isProjected: true,
          projectedLabel: `Prognoza (+${d}d)`
        });
      });
    }

    return [...enrichedHistory, ...forecastPoints];
  }
}
