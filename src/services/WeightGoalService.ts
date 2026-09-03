export interface WeightGoal {
  patientId: string;
  targetWeight: number; // w kg
  startWeight: number;  // w kg w momencie wyznaczenia celu
  startDate: string;    // Data rozpoczęcia (ISO)
  targetDate?: string;  // Data docelowa (opcjonalna)
  notes?: string;       // Notatki kliniczne/zalecenia
  createdAt: string;
  updatedAt: string;
}

export interface WeightGoalProgress {
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
  currentBmi: number;
  targetBmi: number;
  direction: 'loss' | 'gain' | 'maintain';
  totalToChangeKg: number;
  changedKg: number;
  remainingKg: number;
  percent: number;
  isAchieved: boolean;
}

const STORAGE_KEY = 'adi_poz_patient_weight_goals';

export class WeightGoalService {
  private static getStorageMap(): Record<string, WeightGoal> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Błąd odczytu celów wagi z localStorage:', e);
      return {};
    }
  }

  private static saveStorageMap(map: Record<string, WeightGoal>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent('weight-goal-changed'));
    } catch (e) {
      console.error('Błąd zapisu celów wagi w localStorage:', e);
    }
  }

  static getGoal(patientId: string): WeightGoal | null {
    if (!patientId) return null;
    const map = this.getStorageMap();
    return map[patientId] || null;
  }

  static saveGoal(goal: WeightGoal): void {
    const map = this.getStorageMap();
    map[goal.patientId] = {
      ...goal,
      updatedAt: new Date().toISOString()
    };
    this.saveStorageMap(map);
  }

  static deleteGoal(patientId: string): void {
    const map = this.getStorageMap();
    if (map[patientId]) {
      delete map[patientId];
      this.saveStorageMap(map);
    }
  }

  static calculateBmi(weightKg: number, heightCm: number): number {
    if (!heightCm || heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  }

  static calculateProgress(
    currentWeight: number,
    startWeight: number,
    targetWeight: number,
    heightCm: number
  ): WeightGoalProgress {
    const currentBmi = this.calculateBmi(currentWeight, heightCm);
    const targetBmi = this.calculateBmi(targetWeight, heightCm);

    let direction: 'loss' | 'gain' | 'maintain' = 'loss';
    if (targetWeight > startWeight) {
      direction = 'gain';
    } else if (targetWeight === startWeight) {
      direction = 'maintain';
    }

    const totalToChangeKg = Math.abs(startWeight - targetWeight);
    let changedKg = 0;
    let remainingKg = 0;
    let isAchieved = false;

    if (direction === 'loss') {
      changedKg = startWeight - currentWeight;
      remainingKg = Math.max(0, currentWeight - targetWeight);
      isAchieved = currentWeight <= targetWeight;
    } else if (direction === 'gain') {
      changedKg = currentWeight - startWeight;
      remainingKg = Math.max(0, targetWeight - currentWeight);
      isAchieved = currentWeight >= targetWeight;
    } else {
      changedKg = 0;
      remainingKg = Math.abs(currentWeight - targetWeight);
      isAchieved = Math.abs(currentWeight - targetWeight) <= 0.5;
    }

    let percent = 0;
    if (totalToChangeKg === 0) {
      percent = isAchieved ? 100 : 0;
    } else {
      percent = Math.min(100, Math.max(0, parseFloat(((changedKg / totalToChangeKg) * 100).toFixed(1))));
    }

    if (isAchieved) {
      percent = 100;
    }

    return {
      currentWeight,
      startWeight,
      targetWeight,
      currentBmi,
      targetBmi,
      direction,
      totalToChangeKg: parseFloat(totalToChangeKg.toFixed(1)),
      changedKg: parseFloat(changedKg.toFixed(1)),
      remainingKg: parseFloat(remainingKg.toFixed(1)),
      percent,
      isAchieved
    };
  }
}
