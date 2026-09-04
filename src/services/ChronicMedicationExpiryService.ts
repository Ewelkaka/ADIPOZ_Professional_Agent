// src/services/ChronicMedicationExpiryService.ts
import { NotificationService } from './NotificationService';
import { AnalysisRecord } from './LocalPatientDB';

export type ChronicMedicationExpiryStatus = 'CRITICAL_7_DAYS' | 'WARNING_SOON' | 'ACTIVE' | 'EXPIRED';

export interface ChronicMedicationItem {
  id: string;
  patientId: string;
  name: string;
  innName: string;
  dosage: string;
  issueDate: string; // YYYY-MM-DD
  validityDays: number; // np. 30, 90, 180, 365
  validUntil: string; // YYYY-MM-DD
  daysRemaining: number;
  status: ChronicMedicationExpiryStatus;
  packageSize: string;
  p1AccessCode: string;
  chronicDisease: string;
  pillsRemainingEstimate?: number;
  refundationLevel?: '100%' | 'R' | '50%' | '30%' | 'bezpłatne' | 'S';
  lastAlertTimestamp?: string;
}

export interface ExpiryAuditSummary {
  totalCount: number;
  critical7DaysCount: number;
  warningSoonCount: number;
  activeCount: number;
  expiredCount: number;
  criticalMedications: ChronicMedicationItem[];
}

export class ChronicMedicationExpiryService {
  private static STORAGE_KEY = 'adi_poz_chronic_meds_expiry_v1';
  private static ALERT_HISTORY_KEY = 'adi_poz_chronic_meds_alerted_history_v1';

  /**
   * Oblicza liczbę pozostałych dni i status ważności recepty
   */
  public static calculateDaysRemainingAndStatus(validUntilStr: string): {
    daysRemaining: number;
    status: ChronicMedicationExpiryStatus;
  } {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [year, month, day] = validUntilStr.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: ChronicMedicationExpiryStatus = 'ACTIVE';
      if (daysRemaining < 0) {
        status = 'EXPIRED';
      } else if (daysRemaining <= 7) {
        status = 'CRITICAL_7_DAYS';
      } else if (daysRemaining <= 14) {
        status = 'WARNING_SOON';
      } else {
        status = 'ACTIVE';
      }

      return { daysRemaining, status };
    } catch {
      return { daysRemaining: 0, status: 'EXPIRED' };
    }
  }

  /**
   * Pomocnicza funkcja formatowania daty do YYYY-MM-DD
   */
  public static formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Dodaje liczbę dni do daty
   */
  public static addDaysToDate(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  }

  /**
   * Pobiera listę leków przewlekłych dla danego pacjenta
   */
  public static getPatientChronicMedications(
    patientId: string,
    currentMedsText?: string,
    history?: AnalysisRecord[],
    patientAge: number = 55
  ): ChronicMedicationItem[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return this.getDefaultSeededMedications(patientId, currentMedsText, patientAge);
      }

      const raw = localStorage.getItem(this.STORAGE_KEY);
      let allMap: Record<string, ChronicMedicationItem[]> = {};
      if (raw) {
        allMap = JSON.parse(raw);
      }

      let patientMeds = allMap[patientId];
      if (!patientMeds || patientMeds.length === 0) {
        patientMeds = this.getDefaultSeededMedications(patientId, currentMedsText, patientAge);
        allMap[patientId] = patientMeds;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allMap));
      }

      // Przeliczanie dynamiczne dat i statusów względem dzisiejszego dnia
      return patientMeds.map(item => {
        const { daysRemaining, status } = this.calculateDaysRemainingAndStatus(item.validUntil);
        return {
          ...item,
          daysRemaining,
          status
        };
      });
    } catch (e) {
      console.error('Error fetching chronic medications:', e);
      return this.getDefaultSeededMedications(patientId, currentMedsText, patientAge);
    }
  }

  /**
   * Zapisuje listę leków przewlekłych dla pacjenta
   */
  public static savePatientChronicMedications(
    patientId: string,
    medications: ChronicMedicationItem[]
  ): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const allMap: Record<string, ChronicMedicationItem[]> = raw ? JSON.parse(raw) : {};
      allMap[patientId] = medications;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allMap));
    } catch (e) {
      console.error('Error saving chronic medications:', e);
    }
  }

  /**
   * Odnawia e-receptę na zadany okres (np. 30, 90, 365 dni)
   */
  public static renewPrescription(
    patientId: string,
    medId: string,
    validityDays: number = 365
  ): ChronicMedicationItem | null {
    const list = this.getPatientChronicMedications(patientId);
    const todayStr = this.formatDate(new Date());
    const validUntil = this.addDaysToDate(todayStr, validityDays);
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();

    let updatedItem: ChronicMedicationItem | null = null;
    const updatedList = list.map(item => {
      if (item.id === medId) {
        const { daysRemaining, status } = this.calculateDaysRemainingAndStatus(validUntil);
        updatedItem = {
          ...item,
          issueDate: todayStr,
          validityDays,
          validUntil,
          daysRemaining,
          status,
          p1AccessCode: newCode
        };
        return updatedItem;
      }
      return item;
    });

    if (updatedItem) {
      this.savePatientChronicMedications(patientId, updatedList);
    }
    return updatedItem;
  }

  /**
   * Dodaje nowy lek przewlekły do monitoringu
   */
  public static addChronicMedication(
    patientId: string,
    item: Omit<ChronicMedicationItem, 'id' | 'daysRemaining' | 'status'>
  ): ChronicMedicationItem {
    const list = this.getPatientChronicMedications(patientId);
    const { daysRemaining, status } = this.calculateDaysRemainingAndStatus(item.validUntil);
    const newItem: ChronicMedicationItem = {
      ...item,
      id: `chron-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      daysRemaining,
      status
    };

    const updatedList = [newItem, ...list];
    this.savePatientChronicMedications(patientId, updatedList);
    return newItem;
  }

  /**
   * Usuwa lek z monitoringu
   */
  public static deleteChronicMedication(patientId: string, medId: string): void {
    const list = this.getPatientChronicMedications(patientId);
    const updatedList = list.filter(m => m.id !== medId);
    this.savePatientChronicMedications(patientId, updatedList);
  }

  /**
   * Automatyczna weryfikacja terminów ważności z wyzwalaniem alertu na 7 dni przed wygaśnięciem
   */
  public static checkAndTriggerAutomatic7DayAlerts(
    patientId: string,
    medications: ChronicMedicationItem[]
  ): { alertedMeds: ChronicMedicationItem[]; summary: ExpiryAuditSummary } {
    const critical7DaysMeds = medications.filter(m => m.status === 'CRITICAL_7_DAYS');
    const warningSoonMeds = medications.filter(m => m.status === 'WARNING_SOON');
    const activeMeds = medications.filter(m => m.status === 'ACTIVE');
    const expiredMeds = medications.filter(m => m.status === 'EXPIRED');

    const summary: ExpiryAuditSummary = {
      totalCount: medications.length,
      critical7DaysCount: critical7DaysMeds.length,
      warningSoonCount: warningSoonMeds.length,
      activeCount: activeMeds.length,
      expiredCount: expiredMeds.length,
      criticalMedications: critical7DaysMeds
    };

    // System zapobiegania powielaniu alertów w tej samej dobie (throttle 1 alert per day per med)
    const todayKey = this.formatDate(new Date());
    const alertedMeds: ChronicMedicationItem[] = [];

    try {
      const rawAlertHistory = typeof window !== 'undefined' ? localStorage.getItem(this.ALERT_HISTORY_KEY) : null;
      const alertHistory: Record<string, string> = rawAlertHistory ? JSON.parse(rawAlertHistory) : {};

      critical7DaysMeds.forEach(med => {
        const historyKey = `${patientId}_${med.id}_${todayKey}`;
        if (!alertHistory[historyKey]) {
          alertHistory[historyKey] = new Date().toISOString();
          alertedMeds.push(med);

          // Wysłanie automatycznego powiadomienia do centrum powiadomień
          NotificationService.addNotification(
            'MEDICATION_ALERT',
            `⚠️ Alert Ważności e-Recepty (≤ 7 dni): ${med.name}`,
            `Termin realizacji recepty na ${med.name} (${med.dosage}) upływa za ${med.daysRemaining} dni (${med.validUntil}). Wymagane pilne wystawienie kontynuacji terapii przewlekłej!`
          );
        }
      });

      if (typeof window !== 'undefined' && alertedMeds.length > 0) {
        localStorage.setItem(this.ALERT_HISTORY_KEY, JSON.stringify(alertHistory));
      }
    } catch (e) {
      console.warn('Could not check alert throttle history:', e);
    }

    return { alertedMeds, summary };
  }

  /**
   * Generuje inteligentne domyślne leki przewlekłe dla pacjenta z przykładowymi terminami (w tym <= 7 dni)
   */
  private static getDefaultSeededMedications(
    patientId: string,
    currentMedsText?: string,
    patientAge: number = 55
  ): ChronicMedicationItem[] {
    const today = new Date();
    const todayStr = this.formatDate(today);

    // Przykłady zróżnicowanych terminów (jeden wygasający za 4 dni - idealny do testowania alertu 7 dni!)
    const datePlus4Days = this.addDaysToDate(todayStr, 4);
    const datePlus12Days = this.addDaysToDate(todayStr, 12);
    const datePlus180Days = this.addDaysToDate(todayStr, 180);

    const meds: ChronicMedicationItem[] = [
      {
        id: `seed-1-${patientId}`,
        patientId,
        name: 'Metformax 1000 mg (Metforminum)',
        innName: 'Metformini hydrochloridum',
        dosage: '1 tabletka 2x dziennie po posiłkach (rano i wieczorem)',
        issueDate: this.addDaysToDate(todayStr, -26),
        validityDays: 30,
        validUntil: datePlus4Days, // Wygaśnie za 4 dni (ALERT ≤ 7 DNI!)
        daysRemaining: 4,
        status: 'CRITICAL_7_DAYS',
        packageSize: '60 tabl.',
        p1AccessCode: '7412',
        chronicDisease: 'Cukrzyca typu 2 (E11)',
        refundationLevel: patientAge >= 65 ? 'S' : 'R',
        pillsRemainingEstimate: 8
      },
      {
        id: `seed-2-${patientId}`,
        patientId,
        name: 'Ramipril 5 mg (Ramiprilum)',
        innName: 'Ramiprilum',
        dosage: '1 tabletka 1x dziennie rano',
        issueDate: this.addDaysToDate(todayStr, -18),
        validityDays: 30,
        validUntil: datePlus12Days, // Wygaśnie za 12 dni (WARNING)
        daysRemaining: 12,
        status: 'WARNING_SOON',
        packageSize: '28 tabl.',
        p1AccessCode: '3890',
        chronicDisease: 'Nadciśnienie tętnicze pierwotne (I10)',
        refundationLevel: patientAge >= 65 ? 'S' : 'R',
        pillsRemainingEstimate: 12
      },
      {
        id: `seed-3-${patientId}`,
        patientId,
        name: 'Atorvasterol 20 mg (Atorvastatinum)',
        innName: 'Atorvastatinum',
        dosage: '1 tabletka 1x dziennie wieczorem',
        issueDate: this.addDaysToDate(todayStr, -15),
        validityDays: 365,
        validUntil: datePlus180Days, // Ważny 180 dni (ACTIVE)
        daysRemaining: 180,
        status: 'ACTIVE',
        packageSize: '90 tabl.',
        p1AccessCode: '9154',
        chronicDisease: 'Hipercholesterolemia (E78.0)',
        refundationLevel: patientAge >= 65 ? 'S' : 'R',
        pillsRemainingEstimate: 75
      }
    ];

    return meds;
  }
}
