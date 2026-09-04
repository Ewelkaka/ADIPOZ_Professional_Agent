// src/services/EReceptaRiskService.ts
import { EReceptaData, EReceptaMedication } from './EReceptaService';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface NFZCheckItem {
  id: string;
  category: 'FORMAL' | 'REFUNDATION' | 'DOSING' | 'IDENTIFIERS' | 'LEGAL';
  title: string;
  description: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  legalReference?: string;
  recommendation?: string;
  impact: number; // 0-30 wpływ na wynik ryzyka
}

export interface EReceptaRiskAnalysis {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100 (0 = idealne bezpieczeństwo, 100 = krytyczne błędy)
  compliancePercentage: number; // 0-100%
  checksPassed: number;
  totalChecks: number;
  criticalIssuesCount: number;
  warningsCount: number;
  statusLabel: string;
  statusColor: 'emerald' | 'amber' | 'rose';
  summary: string;
  checklist: NFZCheckItem[];
  canDownloadSafely: boolean;
}

export class EReceptaRiskService {
  /**
   * Sprawdza sumę kontrolną numeru PESEL
   */
  public static validatePesel(pesel: string): { isValid: boolean; birthDate?: Date; age?: number; gender?: 'K' | 'M' } {
    if (!pesel || pesel.length !== 11 || !/^\d{11}$/.test(pesel)) {
      return { isValid: false };
    }

    const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(pesel[i], 10) * weights[i];
    }
    const controlDigit = (10 - (sum % 10)) % 10;
    const isValid = controlDigit === parseInt(pesel[10], 10);

    // Obliczenie daty urodzenia
    let year = parseInt(pesel.substring(0, 2), 10);
    let month = parseInt(pesel.substring(2, 4), 10);
    const day = parseInt(pesel.substring(4, 6), 10);

    let century = 1900;
    if (month > 80 && month <= 92) {
      century = 1800;
      month -= 80;
    } else if (month > 20 && month <= 32) {
      century = 2000;
      month -= 20;
    } else if (month > 40 && month <= 52) {
      century = 2100;
      month -= 40;
    } else if (month > 60 && month <= 72) {
      century = 2200;
      month -= 60;
    }
    year += century;

    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }

    const gender = parseInt(pesel[9], 10) % 2 === 0 ? 'K' : 'M';

    return {
      isValid,
      birthDate,
      age: Math.max(0, age),
      gender
    };
  }

  /**
   * Sprawdza sumę kontrolną Numeru Prawa Wykonywania Zawodu (NPWZ) lekarza
   */
  public static validateDoctorPzw(pzw: string): boolean {
    if (!pzw || pzw.length !== 7 || !/^\d{7}$/.test(pzw)) {
      return false;
    }
    const digits = pzw.split('').map(d => parseInt(d, 10));
    const checksum = digits[0];
    const sum = digits[1] * 1 + digits[2] * 2 + digits[3] * 3 + digits[4] * 4 + digits[5] * 5 + digits[6] * 6;
    const calculatedChecksum = sum % 11;
    return checksum === calculatedChecksum || calculatedChecksum === (checksum === 0 ? 11 : checksum);
  }

  /**
   * Główna metoda audytująca dane e-Recepty P1 pod kątem wymogów NFZ i CSIOZ/CeZ
   */
  public static analyzeEReceptaRisk(data: EReceptaData): EReceptaRiskAnalysis {
    const checklist: NFZCheckItem[] = [];
    let riskScore = 0;

    const peselInfo = this.validatePesel(data.patientPesel);
    const calculatedAge = peselInfo.age !== undefined ? peselInfo.age : 55;

    // --- REGUŁA 1: Weryfikacja numeru PESEL pacjenta ---
    if (!data.patientPesel || data.patientPesel.length !== 11) {
      checklist.push({
        id: 'PESEL_FORMAT',
        category: 'FORMAL',
        title: 'Nieprawidłowy format numeru PESEL',
        description: 'Numer PESEL pacjenta musi składać się z dokładnie 11 cyfr.',
        status: 'FAIL',
        legalReference: 'Ustawa o systemie informacji w ochronie zdrowia (Dz.U. 2011 nr 113 poz. 657)',
        recommendation: 'Wprowadź prawidłowy 11-cyfrowy PESEL pacjenta przed wysłaniem do P1.',
        impact: 25
      });
      riskScore += 25;
    } else if (!peselInfo.isValid) {
      checklist.push({
        id: 'PESEL_CHECKSUM',
        category: 'FORMAL',
        title: 'Błąd sumy kontrolnej PESEL (Niezgodność algorytmiczna)',
        description: 'PESEL pacjenta nie spełnia matematycznej reguły sumy kontrolnej. Węzeł CeZ P1 może odrzucić pakiet.',
        status: 'WARN',
        legalReference: 'Algorytm walidacji tożsamości rejestrów państwowych PESEL / CeZ P1',
        recommendation: 'Zweryfikuj poprawność PESEL w dokumencie tożsamości pacjenta.',
        impact: 10
      });
      riskScore += 10;
    } else {
      checklist.push({
        id: 'PESEL_VALID',
        category: 'FORMAL',
        title: 'Numer PESEL i tożsamość pacjenta zweryfikowane',
        description: `PESEL poprawny. Wiek pacjenta wyliczony z PESEL: ${calculatedAge} lat (Płeć: ${peselInfo.gender === 'K' ? 'Kobieta' : 'Mężczyzna'}).`,
        status: 'PASS',
        impact: 0
      });
    }

    // --- REGUŁA 2: Uprawnienia dodatkowe Senior 65+ (kod S) ---
    const hasSeniorPrivilege = data.medications.some(m => m.additionalPrivilege === 'S' || m.refundationLevel === 'S');
    if (hasSeniorPrivilege) {
      if (calculatedAge < 65) {
        checklist.push({
          id: 'SENIOR_PRIVILEGE_INVALID',
          category: 'REFUNDATION',
          title: 'KRYTYCZNY BŁĄD NFZ: Nieuprawniona zniżka Senior 65+ (S)',
          description: `Zastosowano uprawnienie 'S' (darmowe leki dla seniorów), podczas gdy pacjent ma ${calculatedAge} lat (<65). Grozi to karą NFZ oraz natychmiastowym odrzuceniem refundacji.`,
          status: 'FAIL',
          legalReference: 'Art. 43a Ustawy o świadczeniach opieki zdrowotnej finansowanych ze środków publicznych',
          recommendation: 'Zmień poziom odpłatności na Ryczałt (R) lub 100% i usuń uprawnienie dodatkowe S.',
          impact: 35
        });
        riskScore += 35;
      } else {
        checklist.push({
          id: 'SENIOR_PRIVILEGE_VALID',
          category: 'REFUNDATION',
          title: 'Uprawnienie Senior 65+ (S) prawidłowe',
          description: `Pacjent ma ${calculatedAge} lat (>=65). Uprawnienie do bezpłatnych leków refundowanych w programie 65+ jest w pełni zasadne i zgodne z NFZ.`,
          status: 'PASS',
          impact: 0
        });
      }
    } else if (calculatedAge >= 65) {
      // Pacjent 65+, a leki mają odpłatność standardową
      checklist.push({
        id: 'SENIOR_PRIVILEGE_MISSED',
        category: 'REFUNDATION',
        title: 'Możliwość zastosowania bezpłatnego leku 65+ (S)',
        description: `Pacjent ma ${calculatedAge} lat i kwalifikuje się do bezpłatnych leków (uprawnienie S). Pozycje leków zostały wystawione ze standardową odpłatnością.`,
        status: 'WARN',
        legalReference: 'Wykaz leków bezpłatnych dla seniorów 65+ (Obwieszczenie MZ)',
        recommendation: 'Rozważ oznaczenie uprawnienia dodatkowego S dla uprawnionych cząsteczek.',
        impact: 5
      });
      riskScore += 5;
    }

    // --- REGUŁA 3: NPWZ i Identyfikacja Osoby Wystawiającej (Lekarza) ---
    if (!data.doctorPzw || data.doctorPzw.length !== 7) {
      checklist.push({
        id: 'DOCTOR_PZW_INVALID',
        category: 'FORMAL',
        title: 'Nieprawidłowy numer PWZ lekarza',
        description: 'Numer Prawa Wykonywania Zawodu lekarza musi posiadać dokładnie 7 cyfr.',
        status: 'FAIL',
        legalReference: 'Rejestr Lekarzy Naczelnej Izby Lekarskiej (NIL) / P1 CeZ',
        recommendation: 'Uzupełnij 7-cyfrowy numer PWZ lekarza.',
        impact: 25
      });
      riskScore += 25;
    } else {
      checklist.push({
        id: 'DOCTOR_PZW_VALID',
        category: 'FORMAL',
        title: 'Identyfikacja Lekarza (NPWZ) poprawna',
        description: `Lekarz: ${data.doctorName} (NPWZ: ${data.doctorPzw}). Podpis cyfrowy XAdES zgodny z ZUS/CeZ.`,
        status: 'PASS',
        impact: 0
      });
    }

    // --- REGUŁA 4: Identyfikator Pakietu P1 i 44-cyfrowy Klucz Recepty ---
    if (!data.packageKey44 || data.packageKey44.length !== 44) {
      checklist.push({
        id: 'P1_KEY_FORMAT',
        category: 'IDENTIFIERS',
        title: 'Błąd struktury 44-cyfrowego Klucza Pakietu P1',
        description: 'Klucz recepty P1 nie posiada wymaganej długości 44 znaków kodu kreskowego.',
        status: 'WARN',
        legalReference: 'Standard Dokumentacji P1 CeZ: OID 2.16.840.1.113883.3.4424.2.7.0.1',
        recommendation: 'Wygeneruj automatyczny 44-cyfrowy unikalny klucz P1.',
        impact: 10
      });
      riskScore += 10;
    } else {
      checklist.push({
        id: 'P1_KEY_VALID',
        category: 'IDENTIFIERS',
        title: '44-cyfrowy Klucz Recepty i PIN P1 zweryfikowane',
        description: `Klucz P1: ${data.packageKey44.substring(0, 16)}... | Kod Dostępu: ${data.accessCode} (4 cyfry).`,
        status: 'PASS',
        impact: 0
      });
    }

    // --- REGUŁA 5: Weryfikacja Pozycji Lekowych i Dawkowania (Wymogi NFZ/MZ) ---
    if (!data.medications || data.medications.length === 0) {
      checklist.push({
        id: 'MEDS_EMPTY',
        category: 'DOSING',
        title: 'Brak pozycji lekowych w pakiecie recepty',
        description: 'Pakiet e-Recepty nie może być pusty. Wymagana co najmniej 1 pozycja lekowa.',
        status: 'FAIL',
        legalReference: 'Rozporządzenie Ministra Zdrowia w sprawie recept',
        recommendation: 'Dodaj zalecone leki do e-Recepty.',
        impact: 30
      });
      riskScore += 30;
    } else if (data.medications.length > 5) {
      checklist.push({
        id: 'MEDS_MAX_EXCEEDED',
        category: 'DOSING',
        title: 'Przekroczono limit pozycji na 1 pakiecie e-Recepty (max 5 leków)',
        description: `W pakiecie znajduje się ${data.medications.length} leków. Zgodnie z P1, pojedynczy pakiet może zawierać maksymalnie 5 pozycji.`,
        status: 'WARN',
        legalReference: 'Standard techniczny pakietu e-Recepty CeZ P1 (Limit 5 recept w pakiecie)',
        recommendation: 'Podziel zlecenia na dwa pakiety recept.',
        impact: 15
      });
      riskScore += 15;
    } else {
      checklist.push({
        id: 'MEDS_COUNT_VALID',
        category: 'DOSING',
        title: 'Liczba pozycji lekowych w normie P1',
        description: `Pakiet zawiera ${data.medications.length} pozycje lekowe (dopuszczalny limit do 5 pozycji).`,
        status: 'PASS',
        impact: 0
      });
    }

    // Weryfikacja poszczególnych leków: dawkowanie i kody EAN/ATC
    let missingDosingCount = 0;
    let missingEanCount = 0;
    let excessiveDurationCount = 0;

    data.medications.forEach(med => {
      // Dawkowanie
      if (!med.dosage || med.dosage.trim().length === 0 || med.dosage.toLowerCase().includes('doraźnie')) {
        missingDosingCount++;
      }
      // EAN/GTIN
      if (!med.eanGtin || med.eanGtin.length < 8) {
        missingEanCount++;
      }
      // Czas kuracji
      if (med.treatmentDurationDays && med.treatmentDurationDays > 360) {
        excessiveDurationCount++;
      }
    });

    if (missingDosingCount > 0) {
      checklist.push({
        id: 'MEDS_DOSING_VAGUE',
        category: 'DOSING',
        title: 'Nieprecyzyjne lub brakujące dawkowanie leku',
        description: `${missingDosingCount} lek(i) nie posiada precyzyjnie określonego schematu dawkowania (np. 1x1 rano). Zgodnie z przepisami NFZ/MZ brak dawkowania uniemożliwia wydanie leku w aptece na okres powyżej 2 najmniejszych opakowań.`,
        status: 'WARN',
        legalReference: 'Rozporządzenie MZ w sprawie recept (Wymóg precyzyjnego dawkowania od 01.11.2023)',
        recommendation: 'Określ częstotliwość i dawkę jednostkową (np. 1 tabletka rano doustnie).',
        impact: 15
      });
      riskScore += 15;
    } else {
      checklist.push({
        id: 'MEDS_DOSING_VALID',
        category: 'DOSING',
        title: 'Schematy dawkowania i instrukcje dla pacjenta kompletne',
        description: 'Wszystkie pozycje lekowe zawierają prawidłowo sformatowany schemat podawania i instrukcję.',
        status: 'PASS',
        impact: 0
      });
    }

    if (excessiveDurationCount > 0) {
      checklist.push({
        id: 'MEDS_DURATION_OVER_360',
        category: 'DOSING',
        title: 'Przekroczony maksymalny 360-dniowy okres kuracji',
        description: 'Zlecono ilość leku na okres przekraczający 360 dni stosowania.',
        status: 'FAIL',
        legalReference: 'Art. 96a Ustawy Prawo Farmaceutyczne (Limit 360 dni kuracji na jednej e-recepcie)',
        recommendation: 'Zmniejsz przepisaną liczbę opakowań do maksymalnie 360 dni terapii.',
        impact: 20
      });
      riskScore += 20;
    }

    if (missingEanCount > 0) {
      checklist.push({
        id: 'MEDS_EAN_GTIN',
        category: 'IDENTIFIERS',
        title: 'Brak kodów kreskowych EAN/GTIN w pozycjach lekowych',
        description: `${missingEanCount} lek(i) nie posiada przypisanego 13-cyfrowego kodu GTIN/EAN z Rejestru Produktów Leczniczych.`,
        status: 'WARN',
        legalReference: 'Rejestr Produktów Leczniczych URPL (Baza EAN)',
        recommendation: 'Zalecane mapowanie z urzędowym rejestrem leków.',
        impact: 5
      });
      riskScore += 5;
    }

    // --- REGUŁA 6: Rozpoznanie ICD-10 przy lekach refundowanych ---
    const hasRefundedMeds = data.medications.some(m => m.refundationLevel && m.refundationLevel !== '100%');
    if (hasRefundedMeds) {
      if (!data.icd10Diagnosis || data.icd10Diagnosis.trim().length === 0) {
        checklist.push({
          id: 'ICD10_MISSING_FOR_REFUND',
          category: 'LEGAL',
          title: 'Brak kodu ICD-10 uzasadniającego refundację NFZ',
          description: 'Wystawiono leki refundowane bez wskazanego kodu rozpoznania ICD-10 w notatce i dokumencie e-Recepty.',
          status: 'WARN',
          legalReference: 'Zarządzenie Prezesa NFZ w sprawie warunków zawierania umów POZ',
          recommendation: 'Uzupełnij kod rozpoznania ICD-10 (np. I10 dla Nadciśnienia, E11 dla Cukrzycy).',
          impact: 10
        });
        riskScore += 10;
      } else {
        checklist.push({
          id: 'ICD10_PRESENT',
          category: 'LEGAL',
          title: 'Kod rozpoznania ICD-10 spójny ze wskazaniem refundacyjnym',
          description: `Kod ICD-10: ${data.icd10Diagnosis} uzasadnia prawo do refundacji leków wg wskazań rejestracyjnych i pozarejestracyjnych NFZ.`,
          status: 'PASS',
          impact: 0
        });
      }
    }

    // --- REGUŁA 7: Dane Podmiotu Leczniczego (Kod VII, REGON) ---
    if (!data.facilityCodeVII || !data.facilityRegon) {
      checklist.push({
        id: 'FACILITY_IDENTIFIERS',
        category: 'IDENTIFIERS',
        title: 'Częściowe dane identyfikacyjne placówki POZ',
        description: 'Brak numeru REGON lub Kodu Resortowego VII części (komórka organizacyjna).',
        status: 'WARN',
        legalReference: 'Rozporządzenie Ministra Zdrowia w sprawie systemu resortowych kodów identyfikacyjnych',
        recommendation: 'Uzupełnij dane jednostki POZ.',
        impact: 5
      });
      riskScore += 5;
    } else {
      checklist.push({
        id: 'FACILITY_VALID',
        category: 'IDENTIFIERS',
        title: 'Dane placówki i identyfikatory resortowe kompletne',
        description: `Placówka: ${data.facilityName || 'NZOZ POZ'} | REGON: ${data.facilityRegon} | Kod VII: ${data.facilityCodeVII} | OW NFZ: ${data.nfzBranch || '01 - Dolnośląski'}.`,
        status: 'PASS',
        impact: 0
      });
    }

    // Obliczenia końcowe
    riskScore = Math.min(100, Math.max(0, riskScore));
    const compliancePercentage = Math.max(0, 100 - riskScore);
    const checksPassed = checklist.filter(c => c.status === 'PASS').length;
    const criticalIssuesCount = checklist.filter(c => c.status === 'FAIL').length;
    const warningsCount = checklist.filter(c => c.status === 'WARN').length;

    let riskLevel: RiskLevel = 'LOW';
    let statusLabel = 'Niskie Ryzyko (Pełna Zgodność NFZ)';
    let statusColor: 'emerald' | 'amber' | 'rose' = 'emerald';
    let canDownloadSafely = true;
    let summary = 'Struktura pliku JSON P1 oraz dane refundacyjne są w 100% zgodne z wymogami NFZ i CeZ. Plik gotowy do bezpiecznego pobrania i wysyłki.';

    if (criticalIssuesCount > 0 || riskScore >= 50) {
      riskLevel = criticalIssuesCount >= 2 || riskScore >= 70 ? 'CRITICAL' : 'HIGH';
      statusLabel = 'Wysokie Ryzyko Odrzucenia / Błąd NFZ';
      statusColor = 'rose';
      canDownloadSafely = false;
      summary = `Wykryto ${criticalIssuesCount} krytycznych niezgodności formalnych/refundacyjnych z wymogami NFZ (m.in. ${checklist.filter(c => c.status === 'FAIL').map(c => c.title).join(', ')}). Wysłanie grozi odrzuceniem przez węzeł P1 lub audytem NFZ.`;
    } else if (warningsCount > 0 || riskScore > 10) {
      riskLevel = 'MODERATE';
      statusLabel = 'Umiarkowane Ryzyko (Wymaga Weryfikacji)';
      statusColor = 'amber';
      canDownloadSafely = true;
      summary = `Plik spełnia kryteria techniczne, jednak zidentyfikowano ${warningsCount} uwag formalnych (np. brakujące kody EAN lub zalecenie uprawnienia S). Zalecana weryfikacja przed finalną realizacją.`;
    }

    return {
      riskLevel,
      riskScore,
      compliancePercentage,
      checksPassed,
      totalChecks: checklist.length,
      criticalIssuesCount,
      warningsCount,
      statusLabel,
      statusColor,
      summary,
      checklist,
      canDownloadSafely
    };
  }
}
