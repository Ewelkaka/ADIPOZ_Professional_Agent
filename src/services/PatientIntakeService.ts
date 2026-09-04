/**
 * PatientIntakeService
 * Obsługa przedwizytowej ankiety pacjenta (formularz QR / link),
 * synchronizacja w czasie rzeczywistym między pacjentem a gabinetem lekarskim
 * oraz automatyczne formatowanie danych wywiadu do pola 'Objawy'.
 */

export interface PatientIntakeForm {
  id: string;
  patientId: string;
  patientName?: string;
  submittedAt: string;
  primaryReason: string;
  reasonDetails?: string;
  duration: string;
  painSeverity: number; // Skala VAS 0-10
  associatedSymptoms: string[];
  medicationsTaken?: string;
  measuredTemp?: number;
  measuredBp?: string;
  additionalNotes?: string;
}

const STORAGE_KEY_LATEST = 'adipoz_patient_intake_latest';
const STORAGE_KEY_HISTORY_PREFIX = 'adipoz_patient_intake_hist_';
const CHANNEL_NAME = 'adipoz_patient_intake_channel';

export class PatientIntakeService {
  private static broadcastChannel: BroadcastChannel | null = null;

  private static getChannel(): BroadcastChannel | null {
    if (typeof window === 'undefined') return null;
    if (!this.broadcastChannel && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      } catch (err) {
        console.warn('BroadcastChannel not supported or restricted:', err);
      }
    }
    return this.broadcastChannel;
  }

  /**
   * Formatuje dane z ankiety pacjenta w profesjonalny, ustrukturyzowany wywiad lekarski
   */
  public static formatIntakeAsSymptoms(intake: PatientIntakeForm): string {
    const dateFormatted = new Date(intake.submittedAt).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const lines: string[] = [];
    lines.push(`📋 [ANKIETA PRZEDWIZYTOWA PACJENTA - ${dateFormatted}]`);
    
    // Główny powód
    let reasonText = intake.primaryReason;
    if (intake.reasonDetails && intake.reasonDetails.trim().length > 0) {
      reasonText += ` (${intake.reasonDetails.trim()})`;
    }
    lines.push(`• Główny powód zgłoszenia: ${reasonText}`);

    // Czas trwania
    if (intake.duration) {
      lines.push(`• Czas trwania dolegliwości: ${intake.duration}`);
    }

    // Nasilenie dolegliwości VAS
    if (typeof intake.painSeverity === 'number') {
      const vasDesc = 
        intake.painSeverity === 0 ? 'Brak dolegliwości bólowych (0/10)' :
        intake.painSeverity <= 3 ? `Łagodne (${intake.painSeverity}/10)` :
        intake.painSeverity <= 6 ? `Umiarkowane (${intake.painSeverity}/10)` :
        intake.painSeverity <= 8 ? `Silne (${intake.painSeverity}/10)` :
        `Bardzo silne / ostre (${intake.painSeverity}/10)`;
      lines.push(`• Nasilenie dolegliwości (skala VAS): ${vasDesc}`);
    }

    // Objawy towarzyszące
    if (intake.associatedSymptoms && intake.associatedSymptoms.length > 0) {
      lines.push(`• Objawy towarzyszące: ${intake.associatedSymptoms.join(', ')}`);
    } else {
      lines.push(`• Objawy towarzyszące: Neguje inne ostre objawy`);
    }

    // Doraźne leki
    if (intake.medicationsTaken && intake.medicationsTaken.trim().length > 0) {
      lines.push(`• Przyjęte leki doraźne: ${intake.medicationsTaken.trim()}`);
    }

    // Pomiary domowe
    const homeVitals: string[] = [];
    if (intake.measuredTemp && intake.measuredTemp > 0) {
      homeVitals.push(`Temp: ${intake.measuredTemp}°C`);
    }
    if (intake.measuredBp && intake.measuredBp.trim().length > 0) {
      homeVitals.push(`RR: ${intake.measuredBp.trim()} mmHg`);
    }
    if (homeVitals.length > 0) {
      lines.push(`• Pomiary domowe zgłoszone przez pacjenta: ${homeVitals.join(', ')}`);
    }

    // Uwagi dodatkowe pacjenta
    if (intake.additionalNotes && intake.additionalNotes.trim().length > 0) {
      lines.push(`• Komentarz pacjenta: "${intake.additionalNotes.trim()}"`);
    }

    return lines.join('\n');
  }

  /**
   * Wysyła wypełnioną ankietę pacjenta do systemu gabinetowego
   */
  public static submitIntake(intake: PatientIntakeForm): void {
    if (typeof window === 'undefined') return;

    try {
      // 1. Zapis do localStorage
      localStorage.setItem(STORAGE_KEY_LATEST, JSON.stringify(intake));

      const histKey = `${STORAGE_KEY_HISTORY_PREFIX}${intake.patientId}`;
      const existingHistory = this.getIntakeHistory(intake.patientId);
      existingHistory.unshift(intake);
      localStorage.setItem(histKey, JSON.stringify(existingHistory.slice(0, 10)));

      // 2. Publikacja przez BroadcastChannel (między kartami i oknami)
      const channel = this.getChannel();
      if (channel) {
        channel.postMessage({ type: 'NEW_PATIENT_INTAKE', payload: intake });
      }

      // 3. Publikacja zdarzenia w bieżącym oknie
      window.dispatchEvent(new CustomEvent('patient-intake-submitted', { detail: intake }));
    } catch (err) {
      console.error('Błąd podczas zapisywania ankiety pacjenta:', err);
    }
  }

  /**
   * Pobiera najnowszą ankietę dla danego pacjenta
   */
  public static getLatestIntake(patientId?: string): PatientIntakeForm | null {
    if (typeof window === 'undefined') return null;
    try {
      if (patientId) {
        const hist = this.getIntakeHistory(patientId);
        if (hist.length > 0) return hist[0];
      }
      const raw = localStorage.getItem(STORAGE_KEY_LATEST);
      if (!raw) return null;
      const parsed: PatientIntakeForm = JSON.parse(raw);
      if (!patientId || parsed.patientId === patientId) {
        return parsed;
      }
    } catch (err) {
      console.error('Błąd odczytu ankiety:', err);
    }
    return null;
  }

  /**
   * Pobiera historię ankiet danego pacjenta
   */
  public static getIntakeHistory(patientId: string): PatientIntakeForm[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_HISTORY_PREFIX}${patientId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Nasłuchiwanie nadejścia nowej ankiety pacjenta
   */
  public static listenForSubmissions(callback: (intake: PatientIntakeForm) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    // 1. Obsługa CustomEvent (to samo okno)
    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<PatientIntakeForm>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };
    window.addEventListener('patient-intake-submitted', handleCustomEvent);

    // 2. Obsługa BroadcastChannel (inne karty/okna)
    const channel = this.getChannel();
    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_PATIENT_INTAKE' && event.data.payload) {
        callback(event.data.payload as PatientIntakeForm);
      }
    };
    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    // 3. Obsługa localStorage storage event (fallback między kartami)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY_LATEST && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          callback(parsed);
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Zwróć funkcję czyszczącą
    return () => {
      window.removeEventListener('patient-intake-submitted', handleCustomEvent);
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  /**
   * Generuje pełny URL ankiety dla pacjenta
   */
  public static generateSurveyUrl(patientId: string, patientName?: string): string {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const params = new URLSearchParams();
    params.set('mode', 'intake');
    params.set('patientId', patientId);
    if (patientName) {
      params.set('name', patientName);
    }
    return `${origin}${pathname}?${params.toString()}`;
  }
}
