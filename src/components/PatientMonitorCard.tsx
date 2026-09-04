import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Pill, 
  Heart, 
  Thermometer, 
  Scale, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  ShieldAlert, 
  FileText, 
  Sparkles,
  EyeOff,
  RefreshCw,
  Clock,
  QrCode,
  Calendar,
  Layers,
  Filter,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Check,
  BellRing,
  ShieldCheck,
  Hourglass,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import { BmiVarianceAnalysis } from '../services/BmiVarianceService';
import { NotificationService } from '../services/NotificationService';
import { AnalysisRecord } from '../services/LocalPatientDB';
import { ChronicMedicationExpiryService, ChronicMedicationItem, ExpiryAuditSummary } from '../services/ChronicMedicationExpiryService';

export interface MedicalAlertItem {
  id: string;
  category: 'VITALS' | 'MEDICATION' | 'ALLERGY' | 'BMI' | 'CLINICAL';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  title: string;
  measuredValue: string;
  clinicalThreshold: string;
  recommendation: string;
  iconType: 'heart' | 'bp' | 'temp' | 'pill' | 'scale' | 'alert';
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export interface TimelineAlertPoint {
  id: string;
  recordId?: string;
  date: string;
  formattedDate: string;
  isCurrentVisit: boolean;
  maxSeverity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'NORMAL';
  deviations: {
    type: 'BP' | 'PULSE' | 'TEMP' | 'BMI' | 'MED';
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
    label: string;
    value: string;
    norm: string;
    clinicalNote: string;
  }[];
}

interface PatientMonitorCardProps {
  patientId: string;
  patientInfo: {
    imie?: string;
    nazwisko?: string;
    age: number;
    gender: string;
    weight: number;
    height: number;
    bmi: number;
    allergies?: string;
  };
  vitals: {
    bp: string;
    pulse?: number;
    temp: number;
  };
  medications: string;
  symptoms: string;
  analysis: any;
  patientHistory?: AnalysisRecord[];
  bmiVarianceAnalysis?: BmiVarianceAnalysis | null;
  onFocusField: (fieldId: string) => void;
  onAppendRecommendation: (text: string) => void;
  onOpenWeightGoalModal: () => void;
  onOpenFhirExportModal: () => void;
  onNavigateToSection: (sectionId: string) => void;
  onOpenIntakeModal?: () => void;
  onNavigateToHistoryVisit?: (recordId: string) => void;
}

export const PatientMonitorCard: React.FC<PatientMonitorCardProps> = ({
  patientId,
  patientInfo,
  vitals,
  medications,
  symptoms,
  analysis,
  patientHistory = [],
  bmiVarianceAnalysis,
  onFocusField,
  onAppendRecommendation,
  onOpenWeightGoalModal,
  onOpenFhirExportModal,
  onNavigateToSection,
  onOpenIntakeModal,
  onNavigateToHistoryVisit
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'VITALS' | 'MEDICATION'>('ALL');
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [showTimeline, setShowTimeline] = useState(true);
  const [selectedTimelinePointId, setSelectedTimelinePointId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'CRITICAL_ONLY'>('ALL');

  // --- 0. STAN MONITOROWANIA LEKÓW PRZEWLEKŁYCH & WAŻNOŚCI RECEPT (ALERT 7 DNI) ---
  const [chronicMedications, setChronicMedications] = useState<ChronicMedicationItem[]>(() =>
    ChronicMedicationExpiryService.getPatientChronicMedications(patientId, medications, patientHistory, patientInfo.age)
  );
  const [chronicFilter, setChronicFilter] = useState<'ALL' | 'CRITICAL_7_DAYS' | 'WARNING_SOON' | 'ACTIVE'>('ALL');
  const [isAddingChronicMed, setIsAddingChronicMed] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Formularz nowego leku przewlekłego
  const [newMedName, setNewMedName] = useState('');
  const [newMedInn, setNewMedInn] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1x1 rano');
  const [newMedPackSize, setNewMedPackSize] = useState('30 tabl.');
  const [newMedValidityDays, setNewMedValidityDays] = useState<number>(365);
  const [newMedDisease, setNewMedDisease] = useState('');
  const [newMedRefund, setNewMedRefund] = useState<'100%' | 'R' | '50%' | '30%' | 'bezpłatne' | 'S'>('R');

  // Synchronizacja przy zmianie pacjenta
  useEffect(() => {
    const meds = ChronicMedicationExpiryService.getPatientChronicMedications(patientId, medications, patientHistory, patientInfo.age);
    setChronicMedications(meds);
  }, [patientId, medications, patientHistory, patientInfo.age]);

  // Automatyczne wyzwalanie alertu dla leków wygasających <= 7 dni
  useEffect(() => {
    if (chronicMedications.length > 0) {
      ChronicMedicationExpiryService.checkAndTriggerAutomatic7DayAlerts(patientId, chronicMedications);
    }
  }, [patientId, chronicMedications]);

  const handleRenewMed = (medId: string, days: number = 365) => {
    const updated = ChronicMedicationExpiryService.renewPrescription(patientId, medId, days);
    if (updated) {
      setChronicMedications(prev => prev.map(m => m.id === medId ? updated! : m));
      onAppendRecommendation(`Przedłużono e-Receptę na lek przewlekły: ${updated.name} (${updated.dosage}, op: ${updated.packageSize}) na okres ${days} dni. Kod dostępu P1: ${updated.p1AccessCode}. Nowy termin realizacji: ${updated.validUntil}.`);
      NotificationService.addNotification('SUCCESS', 'Odnowniono e-Receptę', `Przedłużono ważność e-Recepty na ${updated.name} na ${days} dni (Kod P1: ${updated.p1AccessCode})`);
    }
  };

  const handleDeleteMed = (medId: string) => {
    ChronicMedicationExpiryService.deleteChronicMedication(patientId, medId);
    setChronicMedications(prev => prev.filter(m => m.id !== medId));
    NotificationService.addNotification('INFO', 'Usunięto lek', 'Usunięto lek z monitoringu leków przewlekłych');
  };

  const handleCopyCode = (code: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
      NotificationService.addNotification('SUCCESS', 'Skopiowano Kod P1', `Kod e-Recepty: ${code} został skopiowany`);
    }
  };

  const handleCreateChronicMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    const todayStr = ChronicMedicationExpiryService.formatDate(new Date());
    const validUntil = ChronicMedicationExpiryService.addDaysToDate(todayStr, newMedValidityDays);
    const p1Code = Math.floor(1000 + Math.random() * 9000).toString();

    const created = ChronicMedicationExpiryService.addChronicMedication(patientId, {
      patientId,
      name: newMedName.trim(),
      innName: newMedInn.trim() || newMedName.trim(),
      dosage: newMedDosage.trim() || '1x1 rano',
      issueDate: todayStr,
      validityDays: newMedValidityDays,
      validUntil,
      packageSize: newMedPackSize.trim() || '30 tabl.',
      p1AccessCode: p1Code,
      chronicDisease: newMedDisease.trim() || 'Leczenie przewlekłe',
      refundationLevel: newMedRefund,
      pillsRemainingEstimate: parseInt(newMedPackSize, 10) || 30
    });

    setChronicMedications(prev => [created, ...prev]);
    setIsAddingChronicMed(false);
    setNewMedName('');
    setNewMedInn('');
    setNewMedDosage('1x1 rano');
    setNewMedPackSize('30 tabl.');
    setNewMedDisease('');

    NotificationService.addNotification('SUCCESS', 'Dodano Lek Przewlekły', `Dodano ${created.name} do monitoringu ważności recept (Ważna do: ${created.validUntil})`);
  };

  // --- STATYSTYKI I FILTROWANIE LEKÓW PRZEWLEKŁYCH ---
  const chronicStats = useMemo(() => {
    let critical7 = 0;
    let warning = 0;
    let active = 0;
    let expired = 0;

    chronicMedications.forEach(m => {
      if (m.status === 'EXPIRED') expired++;
      else if (m.status === 'CRITICAL_7_DAYS') critical7++;
      else if (m.status === 'WARNING_SOON') warning++;
      else active++;
    });

    return { critical7, warning, active, expired, total: chronicMedications.length };
  }, [chronicMedications]);

  const filteredChronicMeds = useMemo(() => {
    return chronicMedications.filter(med => {
      if (chronicFilter === 'CRITICAL_7_DAYS') return med.status === 'CRITICAL_7_DAYS' || med.status === 'EXPIRED';
      if (chronicFilter === 'WARNING_SOON') return med.status === 'WARNING_SOON';
      if (chronicFilter === 'ACTIVE') return med.status === 'ACTIVE';
      return true;
    });
  }, [chronicMedications, chronicFilter]);

  // --- 1. OBLICZENIA I EKSTRAKCJA AKTUALNYCH ALERTÓW ---
  const alerts = useMemo<MedicalAlertItem[]>(() => {
    const list: MedicalAlertItem[] = [];

    // --- 1.1 CIŚNIENIE TĘTNICZE (BP) ---
    if (vitals.bp) {
      const bpParts = vitals.bp.split('/');
      const systolic = parseInt(bpParts[0], 10);
      const diastolic = bpParts.length > 1 ? parseInt(bpParts[1], 10) : NaN;

      if (!isNaN(systolic)) {
        if (systolic >= 180 || (!isNaN(diastolic) && diastolic >= 120)) {
          list.push({
            id: 'vital-bp-critical',
            category: 'VITALS',
            severity: 'CRITICAL',
            title: 'Kryzys nadciśnieniowy (Zagrożenie narządowe)',
            measuredValue: `${vitals.bp} mmHg`,
            clinicalThreshold: 'Próg alarmowy: ≥ 180 / 120 mmHg',
            recommendation: 'Pilna weryfikacja objawów mózgowych/wieńcowych, podanie doraźnego leku hipotensyjnego, ewentualny transport do OIT/SOR.',
            iconType: 'bp',
            primaryAction: {
              label: 'Zastosuj Captopril 25mg s.l.',
              onClick: () => {
                onAppendRecommendation('Pilne: Podano Captopril 25mg s.l. ze względu na RR ' + vitals.bp + ' mmHg. Kontrola ciśnienia za 30 min.');
                NotificationService.addNotification('WARNING', 'Interwencja Hipotensyjna', `Wpisano zalecenie podania Captoprilu 25mg s.l. dla pacjenta ${patientId}`);
              }
            },
            secondaryAction: {
              label: 'Skoryguj pomiar RR',
              onClick: () => onFocusField('input-vitals-bp')
            }
          });
        } else if (systolic >= 140 || (!isNaN(diastolic) && diastolic >= 90)) {
          list.push({
            id: 'vital-bp-high',
            category: 'VITALS',
            severity: 'HIGH',
            title: 'Nadciśnienie tętnicze (Przekroczenie norm PTNT/ESC)',
            measuredValue: `${vitals.bp} mmHg`,
            clinicalThreshold: 'Wartość docelowa POZ: < 140 / 90 mmHg (optymalnie < 130/80)',
            recommendation: 'Wskazana modyfikacja farmakoterapii hipotensyjnej, zlecenie domowego dzienniczka RR lub badania Holter RR.',
            iconType: 'bp',
            primaryAction: {
              label: 'Zleć Holter RR + Dzienniczek',
              onClick: () => {
                onAppendRecommendation('Zlecono: 24h automatyczne monitorowanie ciśnienia tętniczego (ABPM/Holter RR) oraz prowadzenie 7-dniowego dzienniczka pomiarów ciśnienia.');
                NotificationService.addNotification('SUCCESS', 'Zlecenie Holter RR', 'Dodano zlecenie diagnostyki ciśnieniowej do zaleceń');
              }
            },
            secondaryAction: {
              label: 'Edytuj pole RR',
              onClick: () => onFocusField('input-vitals-bp')
            }
          });
        } else if (systolic < 90 || (!isNaN(diastolic) && diastolic < 60 && diastolic > 0)) {
          list.push({
            id: 'vital-bp-low',
            category: 'VITALS',
            severity: 'HIGH',
            title: 'Hipotensja tętnicza (Niedociśnienie)',
            measuredValue: `${vitals.bp} mmHg`,
            clinicalThreshold: 'Dolny próg normy: 90 / 60 mmHg',
            recommendation: 'Ryzyko hipoperfuzji narządowej, omdleń i upadków. Zweryfikować dawki leków hipotensyjnych i diuretyków oraz stopień nawodnienia.',
            iconType: 'bp',
            primaryAction: {
              label: 'Wstrzymaj/Zredukuj diuretyk',
              onClick: () => {
                onAppendRecommendation('Zalecenie: Czasowe wstrzymanie lub redukcja dawki diuretyku/leku hipotensyjnego ze względu na skłonność do hipotonii (' + vitals.bp + ' mmHg). Obfite nawodnienie (min. 2L płynów/dobę).');
                NotificationService.addNotification('WARNING', 'Korekta dawek', 'Wprowadzono zalecenie redukcji dawek hipotensyjnych');
              }
            },
            secondaryAction: {
              label: 'Sprawdź leki',
              onClick: () => onFocusField('input-patient-medications')
            }
          });
        }
      }
    }

    // --- 1.2 TĘTNO (PULSE) ---
    if (vitals.pulse !== undefined && vitals.pulse !== null && vitals.pulse > 0) {
      if (vitals.pulse >= 120) {
        list.push({
          id: 'vital-pulse-critical',
          category: 'VITALS',
          severity: 'CRITICAL',
          title: 'Ciężka tachykardia spoczynkowa (Zagrożenie tachyarytmią)',
          measuredValue: `${vitals.pulse} BPM`,
          clinicalThreshold: 'Tętno spoczynkowe prawidłowe: 60 - 90 BPM (alarm: ≥ 120 BPM)',
          recommendation: 'Wskazane natychmiastowe wykonanie spoczynkowego badania EKG 12-odprowadzeniowego w celu wykluczenia migotania przedsionków (AF) lub częstoskurczu.',
          iconType: 'heart',
          primaryAction: {
            label: 'Zleć natychmiastowe EKG',
            onClick: () => {
              onAppendRecommendation('Pilne zlecenie POZ: Spoczynkowe badanie EKG 12-odprowadzeniowe w gabinecie zabiegowym z powodu tachykardii ' + vitals.pulse + ' BPM.');
              NotificationService.addNotification('WARNING', 'Badanie EKG', 'Zlecono pilne EKG spoczynkowe w gabinecie POZ');
            }
          },
          secondaryAction: {
            label: 'Koryguj tętno',
            onClick: () => onFocusField('input-vitals-pulse')
          }
        });
      } else if (vitals.pulse > 100) {
        list.push({
          id: 'vital-pulse-high',
          category: 'VITALS',
          severity: 'HIGH',
          title: 'Tachykardia spoczynkowa',
          measuredValue: `${vitals.pulse} BPM`,
          clinicalThreshold: 'Maksymalne tętno fizjologiczne: 100 BPM',
          recommendation: 'Wykluczyć infekcję, odwodnienie, nadczynność tarczycy (TSH), anemię lub działanie leków sympatykomimetycznych.',
          iconType: 'heart',
          primaryAction: {
            label: 'Zleć pakiet: EKG + TSH + Morfologia',
            onClick: () => {
              onAppendRecommendation('Zlecono diagnostykę tachykardii (' + vitals.pulse + ' BPM): EKG 12-odprowadzeniowe, TSH, Morfologia krwi z rozmazem, Elektrolity (K, Na).');
              NotificationService.addNotification('SUCCESS', 'Pakiet Diagnostyczny', 'Dodano zlecenia badań w kierunku tachykardii');
            }
          },
          secondaryAction: {
            label: 'Edytuj tętno',
            onClick: () => onFocusField('input-vitals-pulse')
          }
        });
      } else if (vitals.pulse < 50) {
        list.push({
          id: 'vital-pulse-brady',
          category: 'VITALS',
          severity: 'HIGH',
          title: 'Bradykardia spoczynkowa',
          measuredValue: `${vitals.pulse} BPM`,
          clinicalThreshold: 'Dolna granica tętna: 50 - 60 BPM',
          recommendation: 'Wskazana ocena EKG (ryzyko bloków przewodzenia AV) oraz przegląd leków zwalniających przewodzenie (beta-blokery, digoksyna, werapamil).',
          iconType: 'heart',
          primaryAction: {
            label: 'Weryfikacja leków chronotropowo ujemnych',
            onClick: () => {
              onAppendRecommendation('Uwaga: Stwierdzono bradykardię (' + vitals.pulse + ' BPM). Wskazana weryfikacja i ewentualna redukcja dawki beta-adrenolityku. Wykonanie kontrolnego EKG.');
              onFocusField('input-patient-medications');
            }
          }
        });
      }
    }

    // --- 1.3 TEMPERATURA CIAŁA ---
    if (vitals.temp) {
      if (vitals.temp >= 38.5) {
        list.push({
          id: 'vital-temp-high',
          category: 'VITALS',
          severity: 'HIGH',
          title: 'Wysoka gorączka / Ostry stan zapalny',
          measuredValue: `${vitals.temp} °C`,
          clinicalThreshold: 'Norma: 36.0 - 37.0 °C (Gorączka wysoka: ≥ 38.5 °C)',
          recommendation: 'Podejrzenie ostrej infekcji bakteryjnej lub wirusowej. Konieczna diagnostyka wskaźników zapalnych (CRP) oraz leczenie przeciwgorączkowe.',
          iconType: 'temp',
          primaryAction: {
            label: 'Zleć CRP + Paracetamol 1000mg',
            onClick: () => {
              onAppendRecommendation('Zalecono: Badanie CRP z krwi włośniczkowej (aparat POZ) oraz Paracetamol 1000mg p.o. w razie gorączki > 38.5°C co 6h.');
              NotificationService.addNotification('SUCCESS', 'Zalecenie Przeciwgorączkowe', 'Wpisano zalecenie przeciwgorączkowe i diagnostykę CRP');
            }
          },
          secondaryAction: {
            label: 'Koryguj temperaturę',
            onClick: () => onFocusField('input-vitals-temp')
          }
        });
      } else if (vitals.temp >= 38.0) {
        list.push({
          id: 'vital-temp-moderate',
          category: 'VITALS',
          severity: 'MODERATE',
          title: 'Gorączka umiarkowana',
          measuredValue: `${vitals.temp} °C`,
          clinicalThreshold: 'Norma: < 37.5 °C (Stan podgorączkowy: 37.1 - 37.9 °C)',
          recommendation: 'Monitorowanie ciepłoty ciała, obfita podaż płynów, leczenie objawowe.',
          iconType: 'temp',
          primaryAction: {
            label: 'Dodaj zalecenie nawadniania i obserwacji',
            onClick: () => {
              onAppendRecommendation('Zalecono: Pomiary temperatury 3x dziennie, picie min. 2.5L płynów, w razie wzrostu > 38.5°C Paracetamol 500-1000mg.');
            }
          }
        });
      } else if (vitals.temp < 35.5 && vitals.temp > 0) {
        list.push({
          id: 'vital-temp-low',
          category: 'VITALS',
          severity: 'HIGH',
          title: 'Hipotermia / Niska temperatura ciała',
          measuredValue: `${vitals.temp} °C`,
          clinicalThreshold: 'Dolna granica normy: 35.5 °C',
          recommendation: 'Wykluczyć ciężką sepsę, skrajną niedoczynność tarczycy lub ekspozycję na zimno. Ogrzanie pacjenta.',
          iconType: 'temp',
          primaryAction: {
            label: 'Zleć TSH i ponowny pomiar',
            onClick: () => onFocusField('input-vitals-temp')
          }
        });
      }
    }

    // --- 1.4 BMI & ZMIENNOŚĆ MASY CIAŁA ---
    if (patientInfo.bmi > 0) {
      if (patientInfo.bmi >= 35) {
        list.push({
          id: 'bmi-obesity-2',
          category: 'BMI',
          severity: 'HIGH',
          title: 'Otyłość stopnia II/III (Kwalifikacja do leczenia specjalistycznego)',
          measuredValue: `BMI ${patientInfo.bmi} kg/m² (${patientInfo.weight} kg)`,
          clinicalThreshold: 'Otyłość zaawansowana: BMI ≥ 35.0 kg/m²',
          recommendation: 'Wysokie ryzyko powikłań sercowo-naczyniowych i metabolicznych. Wskazana farmakoterapia analogami GLP-1 lub konsultacja bariatryczna.',
          iconType: 'scale',
          primaryAction: {
            label: 'Ustal cel terapeutyczny wagi',
            onClick: onOpenWeightGoalModal
          },
          secondaryAction: {
            label: 'Pokaż historię na wykresie',
            onClick: () => onNavigateToSection('section-bmi-chart')
          }
        });
      } else if (patientInfo.bmi >= 30) {
        list.push({
          id: 'bmi-obesity-1',
          category: 'BMI',
          severity: 'MODERATE',
          title: 'Otyłość stopnia I (Wskazanie do interwencji dietetycznej)',
          measuredValue: `BMI ${patientInfo.bmi} kg/m²`,
          clinicalThreshold: 'Próg otyłości: BMI ≥ 30.0 kg/m²',
          recommendation: 'Edukacja dietetyczna, zwiększenie aktywności fizycznej, kontrola glikemii i profilu lipidowego.',
          iconType: 'scale',
          primaryAction: {
            label: 'Ustal cel wagi',
            onClick: onOpenWeightGoalModal
          }
        });
      } else if (patientInfo.bmi < 18.5) {
        list.push({
          id: 'bmi-underweight',
          category: 'BMI',
          severity: 'HIGH',
          title: 'Niedowaga (Ryzyko niedożywienia)',
          measuredValue: `BMI ${patientInfo.bmi} kg/m²`,
          clinicalThreshold: 'Dolna norma BMI: 18.5 kg/m²',
          recommendation: 'Diagnostyka przyczyn utraty wagi. Ocena albumin i morfologii.',
          iconType: 'scale',
          primaryAction: {
            label: 'Zleć badania w kierunku niedożywienia',
            onClick: () => {
              onAppendRecommendation('Zlecono diagnostykę niedowagi (BMI ' + patientInfo.bmi + '): morfologia, albuminy, TSH, badanie ogólne moczu, USG jamy brzusznej.');
            }
          }
        });
      }
    }

    // --- 1.5 ALERTY WARIANCJI BMI ---
    if (bmiVarianceAnalysis && bmiVarianceAnalysis.hasAlert) {
      const isDrop = bmiVarianceAnalysis.alertType === 'RAPID_LOSS';
      const sev: MedicalAlertItem['severity'] = bmiVarianceAnalysis.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
      list.push({
        id: 'bmi-variance-alert',
        category: 'BMI',
        severity: sev,
        title: `Gwałtowna zmiana BMI (${isDrop ? 'Utrata' : 'Przyrost'} Δ ${Math.abs(bmiVarianceAnalysis.deltaBmi)} kg/m²)`,
        measuredValue: `${bmiVarianceAnalysis.deltaWeight > 0 ? '+' : ''}${bmiVarianceAnalysis.deltaWeight} kg w czasie ${bmiVarianceAnalysis.daysBetween} dni`,
        clinicalThreshold: `Próg czujności: |ΔBMI| ≥ ${bmiVarianceAnalysis.threshold} kg/m²`,
        recommendation: bmiVarianceAnalysis.clinicalExplanation || bmiVarianceAnalysis.recommendations[0] || 'Wskazana pogłębiona diagnostyka dynamiki wagi.',
        iconType: 'scale',
        primaryAction: {
          label: 'Przejdź do analizy dynamiki BMI',
          onClick: () => onNavigateToSection('section-bmi-variance')
        }
      });
    }

    // --- 1.6 ALERGIE PACJENTA ---
    if (patientInfo.allergies && patientInfo.allergies.trim()) {
      const allergiesLower = patientInfo.allergies.toLowerCase();
      const medsLower = medications.toLowerCase();

      if (allergiesLower.includes('penicylin') && (medsLower.includes('amoksycylin') || medsLower.includes('augmentin') || medsLower.includes('duomox') || medsLower.includes('ospamox') || medsLower.includes('taromentin'))) {
        list.push({
          id: 'allergy-penicillin-critical',
          category: 'ALLERGY',
          severity: 'CRITICAL',
          title: 'BEZWZGLĘDNA BLOKADA: Alergia na penicyliny a ordynacja aminopenicyliny',
          measuredValue: `Alergia: ${patientInfo.allergies}`,
          clinicalThreshold: 'Ryzyko wstrząsu anafilaktycznego (Stan zagrożenia życia)',
          recommendation: 'Natychmiast wycofaj penicyliny! Zamień na makrolid (np. Klarytromycyna, Azytromycyna) lub cefalosporynę III gen. (po wykluczeniu reakcji krzyżowej) lub fluorochinolon.',
          iconType: 'alert',
          primaryAction: {
            label: 'Zastąp antybiotykiem makrolidowym',
            onClick: () => {
              onAppendRecommendation('PILNA ZMIANA LEKU: Wycofano aminopenicylinę ze względu na alergię w wywiadzie. Zastosowano Klarytromycynę 500mg 2x1 p.o. przez 7 dni.');
              onFocusField('input-patient-medications');
              NotificationService.addNotification('WARNING', 'Korekta Alergiczna', 'Zastosowano bezpieczny zamiennik antybiotyku');
            }
          },
          secondaryAction: {
            label: 'Edytuj leki',
            onClick: () => onFocusField('input-patient-medications')
          }
        });
      }
    }

    // --- 1.7 RYZYKA FARMAKOLOGICZNE ---
    if (analysis?.data?.medAnalysis?.risks?.length > 0) {
      analysis.data.medAnalysis.risks.forEach((risk: any, idx: number) => {
        list.push({
          id: `med-risk-${idx}`,
          category: 'MEDICATION',
          severity: risk.severity === 'CRITICAL' ? 'CRITICAL' : risk.severity === 'HIGH' ? 'HIGH' : 'MODERATE',
          title: `Ryzyko Farmakoterapii: ${risk.type}`,
          measuredValue: risk.message,
          clinicalThreshold: `Priorytet CDSS: ${risk.severity}`,
          recommendation: risk.recommendation,
          iconType: 'pill',
          primaryAction: {
            label: 'Przejdź do mapy interakcji',
            onClick: () => onNavigateToSection('section-med-analysis')
          },
          secondaryAction: {
            label: 'Dopisz uwagę do zaleceń',
            onClick: () => {
              onAppendRecommendation(`Korekta farmakoterapii: ${risk.message}. Zalecenie: ${risk.recommendation}`);
              NotificationService.addNotification('SUCCESS', 'Korekta Lekowa', 'Dopisano zalecenie modyfikacji leków');
            }
          }
        });
      });
    }

    // --- 1.8 MONITORING WAŻNOŚCI LEKÓW PRZEWLEKŁYCH & RECEPT (ALERT 7 DNI) ---
    chronicMedications.forEach(med => {
      if (med.status === 'CRITICAL_7_DAYS' || med.status === 'EXPIRED') {
        const isExpired = med.status === 'EXPIRED';
        list.push({
          id: `chronic-expiry-${med.id}`,
          category: 'MEDICATION',
          severity: isExpired ? 'CRITICAL' : 'HIGH',
          title: isExpired
            ? `Wygasła e-Recepta: ${med.name} (Przeterminowana!)`
            : `⚠️ Pilny alert ważności e-Recepty: ${med.name} (Wygasa za ${med.daysRemaining} dni!)`,
          measuredValue: `Ważność do: ${med.validUntil} (Pozostało: ${med.daysRemaining} dni, Kod P1: ${med.p1AccessCode})`,
          clinicalThreshold: 'Próg ostrzegawczy POZ: ≤ 7 dni przed wygaśnięciem recepty',
          recommendation: `Pilnie wystaw e-Receptę kontynuacyjną na leczenie przewlekłe (${med.chronicDisease}), aby zapobiec przerwaniu ciągłości farmakoterapii.`,
          iconType: 'pill',
          primaryAction: {
            label: '⚡ Odnów e-Receptę (+365 dni)',
            onClick: () => handleRenewMed(med.id, 365)
          },
          secondaryAction: {
            label: 'Wstaw do zaleceń wizyty',
            onClick: () => {
              onAppendRecommendation(`Pilna kontynuacja terapii przewlekłej: Wystawiono nową e-Receptę na ${med.name} (${med.dosage}, op: ${med.packageSize}) dla rozpoznania ${med.chronicDisease}. Kod dostępu P1: ${med.p1AccessCode}, ważność do: ${med.validUntil}.`);
              NotificationService.addNotification('SUCCESS', 'Wpisano do zaleceń', `Dopisano przedłużenie leku ${med.name}`);
            }
          }
        });
      } else if (med.status === 'WARNING_SOON') {
        list.push({
          id: `chronic-expiry-warn-${med.id}`,
          category: 'MEDICATION',
          severity: 'MODERATE',
          title: `Zbliża się termin wygaśnięcia e-Recepty: ${med.name} (za ${med.daysRemaining} dni)`,
          measuredValue: `Ważna do: ${med.validUntil} (${med.daysRemaining} dni pozostało)`,
          clinicalThreshold: 'Próg wczesnego ostrzegania POZ: 8 - 14 dni',
          recommendation: `Zaplanuj wystawienie e-recepty rocznej na leczenie przewlekłe (${med.chronicDisease}) podczas bieżącej wizyty.`,
          iconType: 'pill',
          primaryAction: {
            label: '⚡ Przedłuż na 365 dni',
            onClick: () => handleRenewMed(med.id, 365)
          }
        });
      }
    });

    return list;
  }, [patientId, patientInfo, vitals, medications, symptoms, analysis, bmiVarianceAnalysis, chronicMedications, onFocusField, onAppendRecommendation, onOpenWeightGoalModal, onNavigateToSection]);

  // --- 2. OŚ CZASU ALERTÓW (TIMELINE OF HISTORICAL & CURRENT DEVIATIONS) ---
  const timelinePoints = useMemo<TimelineAlertPoint[]>(() => {
    const points: TimelineAlertPoint[] = [];

    // Helper: ekstrakcja odchyleń z parametrów wizyty
    const extractDeviations = (
      visitVitals: { bp?: string; pulse?: number; temp?: number },
      visitPatientInfo: { weight?: number; height?: number; bmi?: number },
      visitAnalysis: any
    ) => {
      const devs: TimelineAlertPoint['deviations'] = [];

      // 1. BP
      if (visitVitals?.bp) {
        const parts = visitVitals.bp.split('/');
        const sys = parseInt(parts[0], 10);
        const dia = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
        if (!isNaN(sys)) {
          if (sys >= 180 || (!isNaN(dia) && dia >= 120)) {
            devs.push({
              type: 'BP',
              severity: 'CRITICAL',
              label: 'Kryzys nadciśnieniowy',
              value: `${visitVitals.bp} mmHg`,
              norm: '< 140/90 mmHg',
              clinicalNote: 'Skrajne przekroczenie ciśnienia tętniczego, ryzyko powikłań naczyniowych.'
            });
          } else if (sys >= 160 || (!isNaN(dia) && dia >= 100)) {
            devs.push({
              type: 'BP',
              severity: 'HIGH',
              label: 'Nadciśnienie st. II/III',
              value: `${visitVitals.bp} mmHg`,
              norm: '< 140/90 mmHg',
              clinicalNote: 'Wskazana intensyfikacja leczenia hipotensyjnego.'
            });
          } else if (sys >= 140 || (!isNaN(dia) && dia >= 90)) {
            devs.push({
              type: 'BP',
              severity: 'MODERATE',
              label: 'Nadciśnienie st. I',
              value: `${visitVitals.bp} mmHg`,
              norm: '< 140/90 mmHg',
              clinicalNote: 'Przekroczenie normy ambulatoryjnej POZ.'
            });
          } else if (sys < 90) {
            devs.push({
              type: 'BP',
              severity: 'HIGH',
              label: 'Hipotensja',
              value: `${visitVitals.bp} mmHg`,
              norm: '≥ 90/60 mmHg',
              clinicalNote: 'Ryzyko omdleń i hipoperfuzji.'
            });
          }
        }
      }

      // 2. Pulse
      if (visitVitals?.pulse) {
        if (visitVitals.pulse >= 120) {
          devs.push({
            type: 'PULSE',
            severity: 'CRITICAL',
            label: 'Tachykardia ciężka',
            value: `${visitVitals.pulse} BPM`,
            norm: '60 - 90 BPM',
            clinicalNote: 'Ryzyko napadowego migotania przedsionków lub tachyarytmii.'
          });
        } else if (visitVitals.pulse > 100) {
          devs.push({
            type: 'PULSE',
            severity: 'HIGH',
            label: 'Tachykardia',
            value: `${visitVitals.pulse} BPM`,
            norm: '60 - 90 BPM',
            clinicalNote: 'Przyspieszona akcja serca w spoczynku.'
          });
        } else if (visitVitals.pulse < 50) {
          devs.push({
            type: 'PULSE',
            severity: 'HIGH',
            label: 'Bradykardia',
            value: `${visitVitals.pulse} BPM`,
            norm: '50 - 90 BPM',
            clinicalNote: 'Zwolniona czynność serca.'
          });
        }
      }

      // 3. Temp
      if (visitVitals?.temp) {
        if (visitVitals.temp >= 38.5) {
          devs.push({
            type: 'TEMP',
            severity: 'HIGH',
            label: 'Wysoka gorączka',
            value: `${visitVitals.temp} °C`,
            norm: '36.0 - 37.0 °C',
            clinicalNote: 'Ostry stan zapalny / infekcja.'
          });
        } else if (visitVitals.temp >= 38.0) {
          devs.push({
            type: 'TEMP',
            severity: 'MODERATE',
            label: 'Stan gorączkowy',
            value: `${visitVitals.temp} °C`,
            norm: '< 37.5 °C',
            clinicalNote: 'Podwyższona ciepłota ciała.'
          });
        }
      }

      // 4. BMI
      if (visitPatientInfo?.bmi) {
        if (visitPatientInfo.bmi >= 35) {
          devs.push({
            type: 'BMI',
            severity: 'HIGH',
            label: 'Otyłość st. II/III',
            value: `BMI ${visitPatientInfo.bmi}`,
            norm: '18.5 - 24.9',
            clinicalNote: 'Zaawansowane powikłania metaboliczne.'
          });
        }
      }

      // 5. Med Risks
      if (visitAnalysis?.data?.medAnalysis?.risks?.length > 0) {
        visitAnalysis.data.medAnalysis.risks.forEach((r: any) => {
          if (r.severity === 'CRITICAL' || r.severity === 'HIGH') {
            devs.push({
              type: 'MED',
              severity: r.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
              label: 'Ryzyko lekowe',
              value: r.message,
              norm: 'Brak interakcji',
              clinicalNote: r.recommendation || 'Wymaga korekty dawki/zamiany leku.'
            });
          }
        });
      }

      return devs;
    };

    // A. Przetwarzanie historii wizyt (od najstarszej do najnowszej)
    if (patientHistory && patientHistory.length > 0) {
      const sortedHistory = [...patientHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      sortedHistory.forEach((rec, idx) => {
        const devs = extractDeviations(rec.vitals, rec.patientInfo, rec.analysis);
        let maxSev: TimelineAlertPoint['maxSeverity'] = 'NORMAL';
        if (devs.some(d => d.severity === 'CRITICAL')) maxSev = 'CRITICAL';
        else if (devs.some(d => d.severity === 'HIGH')) maxSev = 'HIGH';
        else if (devs.some(d => d.severity === 'MODERATE')) maxSev = 'MODERATE';

        const dt = new Date(rec.timestamp);
        const formatted = isNaN(dt.getTime()) ? rec.timestamp : dt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

        points.push({
          id: `hist-${rec.id || idx}`,
          recordId: rec.id,
          date: rec.timestamp,
          formattedDate: formatted,
          isCurrentVisit: false,
          maxSeverity: maxSev,
          deviations: devs
        });
      });
    }

    // B. Dodanie bieżącej wizyty na koniec osi
    const currentDevs = extractDeviations(vitals, patientInfo, analysis);
    let currentMaxSev: TimelineAlertPoint['maxSeverity'] = 'NORMAL';
    if (currentDevs.some(d => d.severity === 'CRITICAL')) currentMaxSev = 'CRITICAL';
    else if (currentDevs.some(d => d.severity === 'HIGH')) currentMaxSev = 'HIGH';
    else if (currentDevs.some(d => d.severity === 'MODERATE')) currentMaxSev = 'MODERATE';

    points.push({
      id: 'current-visit-point',
      date: new Date().toISOString(),
      formattedDate: 'Bieżąca wizyta (Dzisiaj)',
      isCurrentVisit: true,
      maxSeverity: currentMaxSev,
      deviations: currentDevs
    });

    return points;
  }, [patientHistory, vitals, patientInfo, analysis]);

  // Filtrowane punkty na osi czasu
  const displayedTimelinePoints = useMemo(() => {
    if (timelineFilter === 'CRITICAL_ONLY') {
      return timelinePoints.filter(p => p.maxSeverity === 'CRITICAL' || p.maxSeverity === 'HIGH');
    }
    return timelinePoints;
  }, [timelinePoints, timelineFilter]);

  // Aktywny wybrany punkt na osi czasu
  const activePoint = useMemo(() => {
    if (!selectedTimelinePointId) {
      // Domyślnie ostatni punkt z odchyleniami lub bieżący
      const criticalPoint = [...timelinePoints].reverse().find(p => p.deviations.length > 0);
      return criticalPoint || timelinePoints[timelinePoints.length - 1];
    }
    return timelinePoints.find(p => p.id === selectedTimelinePointId) || null;
  }, [timelinePoints, selectedTimelinePointId]);

  // Filtrowanie alertów oraz wykluczenie wyciszonych
  const activeAlerts = useMemo(() => {
    return alerts.filter(a => !dismissedAlertIds.has(a.id));
  }, [alerts, dismissedAlertIds]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'ALL') return activeAlerts;
    if (activeFilter === 'CRITICAL') return activeAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
    if (activeFilter === 'VITALS') return activeAlerts.filter(a => a.category === 'VITALS' || a.category === 'BMI');
    if (activeFilter === 'MEDICATION') return activeAlerts.filter(a => a.category === 'MEDICATION' || a.category === 'ALLERGY');
    return activeAlerts;
  }, [activeAlerts, activeFilter]);

  const criticalCount = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = activeAlerts.filter(a => a.severity === 'HIGH').length;
  const moderateCount = activeAlerts.filter(a => a.severity === 'MODERATE').length;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAlertIds(prev => new Set([...prev, id]));
    NotificationService.addNotification('INFO', 'Wyciszono alert', 'Alert został oznaczony jako zweryfikowany dla bieżącej sesji');
  };

  const handleRestoreAll = () => {
    setDismissedAlertIds(new Set());
    NotificationService.addNotification('INFO', 'Przywrócono alerty', 'Wszystkie wyciszone alerty zostały przywrócone do widoku');
  };

  const getIcon = (type: MedicalAlertItem['iconType'], severity: MedicalAlertItem['severity']) => {
    const colorClass = severity === 'CRITICAL' 
      ? 'text-red-500' 
      : severity === 'HIGH' 
        ? 'text-amber-500' 
        : 'text-yellow-500';

    switch (type) {
      case 'heart': return <Heart className={colorClass} size={18} />;
      case 'bp': return <Activity className={colorClass} size={18} />;
      case 'temp': return <Thermometer className={colorClass} size={18} />;
      case 'pill': return <Pill className={colorClass} size={18} />;
      case 'scale': return <Scale className={colorClass} size={18} />;
      default: return <AlertTriangle className={colorClass} size={18} />;
    }
  };

  // Status ogólny pacjenta
  const patientStatus = useMemo(() => {
    if (criticalCount > 0) {
      return {
        label: 'STAN KRYTYCZNY / WYMAGA NATYCHMIASTOWEJ INTERWENCJI',
        badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40',
        ringColor: 'ring-red-500/40',
        dotColor: 'bg-red-500 animate-ping'
      };
    }
    if (highCount > 0) {
      return {
        label: 'WYKRYTO ISTOTNE ALERTY KLINICZNE',
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        ringColor: 'ring-amber-500/30',
        dotColor: 'bg-amber-500'
      };
    }
    if (moderateCount > 0) {
      return {
        label: 'ZALECANA UWAGA I MONITOROWANIE',
        badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        ringColor: 'ring-yellow-500/20',
        dotColor: 'bg-yellow-400'
      };
    }
    return {
      label: 'PARAMETRY W NORMIE • BRAK AKTYWNYCH ZAGROŻEŃ',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      ringColor: 'ring-emerald-500/20',
      dotColor: 'bg-emerald-500'
    };
  }, [criticalCount, highCount, moderateCount]);

  return (
    <section 
      id="patient-monitor-section"
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300"
    >
      {/* Pasek Tytułowy Monitora Pacjenta */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
            <Activity size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Monitor Pacjenta</span>
                <span className="text-xs font-normal text-slate-400">({patientId})</span>
              </h2>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${patientStatus.badgeBg}`}>
                <span className={`w-2 h-2 rounded-full ${patientStatus.dotColor}`} />
                {patientStatus.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Zagregowane alerty medyczne i wizualna oś czasu odchyleń parametrów życiowych • POZ Decision Support
            </p>
          </div>
        </div>

        {/* Pasek Szybkich Akcji Paska */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {onOpenIntakeModal && (
            <button
              type="button"
              onClick={onOpenIntakeModal}
              className="text-xs font-semibold text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/50 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Generuj kod QR i link ankiety przedwizytowej dla pacjenta"
            >
              <QrCode size={13} className="text-emerald-400" />
              <span>Ankieta QR</span>
            </button>
          )}

          {dismissedAlertIds.size > 0 && (
            <button
              type="button"
              onClick={handleRestoreAll}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Przywróć wyciszone alerty medyczne"
            >
              <RefreshCw size={12} />
              <span>Przywróć ({dismissedAlertIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenFhirExportModal}
            className="text-xs font-semibold text-sky-300 hover:text-white px-2.5 py-1 rounded-lg bg-sky-950/50 hover:bg-sky-900 border border-sky-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Eksportuj telemetrię i alerty do HL7 FHIR Bundle R4"
          >
            <Sparkles size={12} className="text-sky-400" />
            <span>FHIR R4</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={isExpanded ? 'Zwiń szczegóły monitora' : 'Rozwiń szczegóły monitora'}
            aria-label="Przełącz widoczność monitora"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Skrócony Pasek Parametrów Życiowych (Mini Telemetria POZ) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs border-b border-slate-100 dark:border-slate-800">
        <div 
          onClick={() => onFocusField('input-vitals-bp')}
          className="p-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          title="Kliknij, aby edytować pomiar ciśnienia tętniczego"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="font-semibold uppercase text-[10px]">Ciśnienie (RR)</span>
            <Activity size={13} className="text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {vitals.bp || '120/80'}
            </span>
            <span className="text-[10px] text-slate-500">mmHg</span>
          </div>
        </div>

        <div 
          onClick={() => onFocusField('input-vitals-pulse')}
          className="p-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          title="Kliknij, aby edytować pomiar tętna"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="font-semibold uppercase text-[10px]">Tętno (HR)</span>
            <Heart size={13} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {vitals.pulse || '--'}
            </span>
            <span className="text-[10px] text-slate-500">BPM</span>
          </div>
        </div>

        <div 
          onClick={() => onFocusField('input-vitals-temp')}
          className="p-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          title="Kliknij, aby edytować pomiar temperatury"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="font-semibold uppercase text-[10px]">Temperatura</span>
            <Thermometer size={13} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {vitals.temp ? `${vitals.temp}°C` : '36.6°C'}
            </span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateToSection('section-bmi-chart')}
          className="p-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
          title="Kliknij, aby zobaczyć wykres BMI i wagi"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5">
            <span className="font-semibold uppercase text-[10px]">Wskaźnik BMI</span>
            <Scale size={13} className="text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {patientInfo.bmi || '--'}
            </span>
            <span className="text-[10px] text-slate-500">
              ({patientInfo.weight} kg)
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-6">

          {/* ========================================================================= */}
          {/* NOWOŚĆ: WIZUALNA OŚ CZASU OSTATNICH ALERTÓW I ODCHYLEŃ (ALERT TIMELINE) */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-inner space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">Wizualna Oś Czasu Ostatnich Alertów</h3>
                    <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Timeline
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Chronologiczny rozkład krytycznych odchyleń parametrów życiowych pacjenta w czasie
                  </p>
                </div>
              </div>

              {/* Filtry Osi Czasu */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTimelineFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    timelineFilter === 'ALL'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  Wszystkie punkty ({timelinePoints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineFilter('CRITICAL_ONLY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timelineFilter === 'CRITICAL_ONLY'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-red-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Tylko z odchyleniami ({timelinePoints.filter(p => p.deviations.length > 0).length})
                </button>
              </div>
            </div>

            {/* Pasek Wizualny Osi Czasu (Horizontal Track) */}
            <div className="relative pt-6 pb-2 px-3 overflow-x-auto scrollbar-thin">
              {/* Linia łącząca */}
              <div className="absolute top-10 left-6 right-6 h-1 bg-slate-800 -z-0 rounded-full" />

              <div className="flex items-center justify-between gap-4 min-w-[540px] relative z-10">
                {displayedTimelinePoints.map((point, index) => {
                  const isSelected = activePoint?.id === point.id;
                  const hasCritical = point.maxSeverity === 'CRITICAL';
                  const hasHigh = point.maxSeverity === 'HIGH';
                  const hasModerate = point.maxSeverity === 'MODERATE';
                  const hasDeviations = point.deviations.length > 0;

                  let pinBg = 'bg-slate-700 border-slate-600 text-slate-400';
                  let pulseColor = '';

                  if (hasCritical) {
                    pinBg = 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/50';
                    pulseColor = 'bg-red-500';
                  } else if (hasHigh) {
                    pinBg = 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/50';
                    pulseColor = 'bg-amber-500';
                  } else if (hasModerate) {
                    pinBg = 'bg-yellow-500 border-yellow-300 text-slate-950 shadow-md';
                  } else if (point.isCurrentVisit) {
                    pinBg = 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-900/50';
                  }

                  return (
                    <button
                      key={point.id}
                      type="button"
                      onClick={() => setSelectedTimelinePointId(point.id)}
                      className={`flex flex-col items-center gap-2 group transition-all cursor-pointer focus:outline-none ${
                        isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      {/* Etykieta daty u góry */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all whitespace-nowrap ${
                        isSelected 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : point.isCurrentVisit 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-300'
                      }`}>
                        {point.formattedDate}
                      </span>

                      {/* Okrągły węzeł osi czasu */}
                      <div className="relative">
                        {hasCritical && (
                          <span className={`absolute -inset-1 rounded-full ${pulseColor} animate-ping opacity-75`} />
                        )}
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-extrabold relative z-10 transition-transform ${pinBg} ${
                          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                        }`}>
                          {hasCritical ? '🔴' : hasHigh ? '⚠️' : hasModerate ? '⚡' : point.isCurrentVisit ? '🩺' : '✓'}
                        </div>
                      </div>

                      {/* Znaczniki odchyleń pod węzłem */}
                      <div className="flex flex-col items-center gap-1 mt-0.5">
                        {hasDeviations ? (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight text-center ${
                            hasCritical 
                              ? 'bg-red-950/80 text-red-300 border border-red-800' 
                              : hasHigh 
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800' 
                                : 'bg-yellow-950/80 text-yellow-300 border border-yellow-800'
                          }`}>
                            {point.deviations.length} {point.deviations.length === 1 ? 'alert' : 'alerty'}
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-medium">Norma</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Szczegółowy Panel Wybranego Punktu Osi Czasu */}
            {activePoint && (
              <div className="mt-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Calendar size={16} className="text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Raport z dnia: {activePoint.formattedDate}</span>
                        {activePoint.isCurrentVisit && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                            Aktualna Sesja
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {activePoint.deviations.length > 0
                          ? `Wykryto ${activePoint.deviations.length} istotnych odchyleń klinicznych w parametrach życiowych.`
                          : 'Wszystkie zarejestrowane parametry życiowe w granicach normy fizjologicznej.'}
                      </p>
                    </div>
                  </div>

                  {/* Przycisk przejścia do historii jeśli to wizyta historyczna */}
                  {activePoint.recordId && onNavigateToHistoryVisit && (
                    <button
                      type="button"
                      onClick={() => onNavigateToHistoryVisit(activePoint.recordId!)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 self-end sm:self-auto cursor-pointer shadow-sm"
                    >
                      <span>Otwórz pełną kartę wizyty</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                {/* Lista wykrytych odchyleń dla wybranego punktu */}
                {activePoint.deviations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {activePoint.deviations.map((dev, dIdx) => (
                      <div 
                        key={dIdx} 
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                          dev.severity === 'CRITICAL' 
                            ? 'bg-red-950/40 border-red-800 text-red-200' 
                            : dev.severity === 'HIGH' 
                              ? 'bg-amber-950/40 border-amber-800 text-amber-200' 
                              : 'bg-yellow-950/30 border-yellow-800 text-yellow-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/40">
                              {dev.label}
                            </span>
                            <span className="text-xs font-bold font-mono">
                              {dev.value}
                            </span>
                          </div>
                          <p className="text-xs leading-snug font-medium text-slate-100">
                            {dev.clinicalNote}
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-white/10">
                          <span>Wartość referencyjna: {dev.norm}</span>
                          <span className="font-semibold uppercase tracking-wider text-[9px] text-red-400">
                            {dev.severity === 'CRITICAL' ? '⚠️ KRYTYCZNE' : dev.severity === 'HIGH' ? '⚠️ WYSOKIE' : '⚡ UMIARKOWANE'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>Brak odchyleń parametrów życiowych podczas tej wizyty. Pacjent stabilny.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zakładki Filtrowania Bieżących Alertów */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Wszystkie ({activeAlerts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'CRITICAL'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-red-500'
                }`}
              >
                Krytyczne / Wysokie ({criticalCount + highCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('VITALS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'VITALS'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'
                }`}
              >
                Parametry życiowe ({activeAlerts.filter(a => a.category === 'VITALS' || a.category === 'BMI').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('MEDICATION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'MEDICATION'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500'
                }`}
              >
                Farmakoterapia ({activeAlerts.filter(a => a.category === 'MEDICATION' || a.category === 'ALLERGY').length})
              </button>
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={13} />
              <span>Ostatnia automatyczna weryfikacja: bieżąca wizyta</span>
            </div>
          </div>

          {/* Lista Zagregowanych Alertów */}
          {filteredAlerts.length === 0 ? (
            <div className="p-8 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={36} />
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Brak aktywnych alertów medycznych w wybranej kategorii
              </h3>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 max-w-md">
                Wszystkie aktualne parametry życiowe, ordynacja lekowa oraz dane pacjenta są w normie klinicznej lub zostały zweryfikowane przez lekarza.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => {
                const isCritical = alert.severity === 'CRITICAL';
                const isHigh = alert.severity === 'HIGH';

                const cardBorder = isCritical
                  ? 'border-red-300 dark:border-red-900/80 bg-red-50/40 dark:bg-red-950/20'
                  : isHigh
                    ? 'border-amber-300 dark:border-amber-900/80 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/30 dark:bg-yellow-950/10';

                const badgeStyle = isCritical
                  ? 'bg-red-600 text-white'
                  : isHigh
                    ? 'bg-amber-600 text-white'
                    : 'bg-yellow-500 text-slate-900';

                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-4 border ${cardBorder} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md`}
                  >
                    {/* Lewa Strona: Ikona, Tytuł, Szczegóły */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        {getIcon(alert.iconType, alert.severity)}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${badgeStyle}`}>
                            {alert.severity === 'CRITICAL' ? 'KRYTYCZNY' : alert.severity === 'HIGH' ? 'WYSOKI' : 'UMIARKOWANY'}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {alert.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Wartość zmierzona: <strong className={isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}>{alert.measuredValue}</strong>
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                            • {alert.clinicalThreshold}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          💡 <span className="font-medium text-slate-700 dark:text-slate-300">Zalecenie:</span> {alert.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Prawa Strona: Przyciski Szybkich Akcji (1-Click Action) */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto justify-end flex-wrap">
                      {alert.secondaryAction && (
                        <button
                          type="button"
                          onClick={alert.secondaryAction.onClick}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          {alert.secondaryAction.icon || <ArrowUpRight size={13} />}
                          <span>{alert.secondaryAction.label}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={alert.primaryAction.onClick}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-lg text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                          isCritical
                            ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                            : isHigh
                              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        }`}
                      >
                        {alert.primaryAction.icon || <Sparkles size={13} />}
                        <span>{alert.primaryAction.label}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Oznacz alert jako zweryfikowany / wycisz na czas wizyty"
                        aria-label="Wycisz alert"
                      >
                        <EyeOff size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* NOWOŚĆ: MONITOR WAŻNOŚCI LEKÓW PRZEWLEKŁYCH & e-RECEPT (ALERT 7 DNI)     */}
          {/* ========================================================================= */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-blue-50/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-blue-950/30 p-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  <Pill size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      Monitor Dat Ważności Leków Przewlekłych & e-Recept
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1">
                      <BellRing size={11} className={chronicStats.critical7 > 0 ? "animate-bounce text-red-500" : ""} />
                      Alert ≤ 7 dni POZ
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Automatyczne wykrywanie kończących się recept na leki stałe z generowaniem powiadomień i 1-kliknięciowym odnawianiem na 365 dni
                  </p>
                </div>
              </div>

              {/* Statystyki Ważności */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {chronicStats.critical7 > 0 && (
                  <div className="px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    <span>{chronicStats.critical7} lek(i) wygasa ≤ 7 dni!</span>
                  </div>
                )}
                {chronicStats.warning > 0 && (
                  <div className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>{chronicStats.warning} wkrótce (8-14 dni)</span>
                  </div>
                )}
                <div className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{chronicStats.active} aktywnych</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingChronicMed(!isAddingChronicMed)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-auto sm:ml-2"
                >
                  <Plus size={14} />
                  <span>Dodaj lek do monitora</span>
                </button>
              </div>
            </div>

            {/* Formularz Dodawania Leku Przewlekłego */}
            {isAddingChronicMed && (
              <form onSubmit={handleCreateChronicMed} className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Pill size={14} className="text-indigo-600" />
                    Nowy lek w stałym monitoringu dat ważności
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingChronicMed(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Anuluj
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nazwa handlowa i dawka *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="np. Metformax 1000 mg"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Substancja czynna (INN)
                    </label>
                    <input
                      type="text"
                      placeholder="np. Metformini hydrochloridum"
                      value={newMedInn}
                      onChange={(e) => setNewMedInn(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Rozpoznanie / Choroba przewlekła *
                    </label>
                    <input
                      type="text"
                      placeholder="np. Cukrzyca typu 2 (E11)"
                      value={newMedDisease}
                      onChange={(e) => setNewMedDisease(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Dawkowanie
                    </label>
                    <input
                      type="text"
                      placeholder="np. 1x1 tabl. rano po posiłku"
                      value={newMedDosage}
                      onChange={(e) => setNewMedDosage(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Opakowanie / Ilość
                    </label>
                    <input
                      type="text"
                      placeholder="np. 30 tabl. / 60 tabl."
                      value={newMedPackSize}
                      onChange={(e) => setNewMedPackSize(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Okres ważności e-recepty
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setNewMedValidityDays(30)}
                        className={`py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                          newMedValidityDays === 30
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        30 dni
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMedValidityDays(90)}
                        className={`py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                          newMedValidityDays === 90
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        90 dni
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMedValidityDays(365)}
                        className={`py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                          newMedValidityDays === 365
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        365 dni (Roczna)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingChronicMed(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Zapisz lek w monitoringu</span>
                  </button>
                </div>
              </form>
            )}

            {/* Zakładki Filtrowania Leków Przewlekłych */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setChronicFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chronicFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Wszystkie ({chronicMedications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setChronicFilter('CRITICAL_7_DAYS')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    chronicFilter === 'CRITICAL_7_DAYS'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-red-500'
                  }`}
                >
                  <AlertCircle size={12} />
                  <span>Wygasające ≤ 7 dni ({chronicStats.critical7 + chronicStats.expired})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChronicFilter('WARNING_SOON')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chronicFilter === 'WARNING_SOON'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'
                  }`}
                >
                  Wkrótce 8-14 dni ({chronicStats.warning})
                </button>
                <button
                  type="button"
                  onClick={() => setChronicFilter('ACTIVE')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chronicFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                  }`}
                >
                  Ważne ({chronicStats.active})
                </button>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck size={13} className="text-indigo-500" />
                <span>Synchronizacja z P1 & Elektroniczną Dokumentacją Medyczną</span>
              </div>
            </div>

            {/* Lista Kart Leków Przewlekłych */}
            {filteredChronicMeds.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-center text-xs text-slate-500">
                Brak leków przewlekłych w wybranej kategorii filtra.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {filteredChronicMeds.map(med => {
                  const isCritical = med.status === 'CRITICAL_7_DAYS';
                  const isExpired = med.status === 'EXPIRED';
                  const isWarning = med.status === 'WARNING_SOON';

                  const cardStyle = isExpired || isCritical
                    ? 'border-red-300 dark:border-red-900/80 bg-red-50/30 dark:bg-red-950/20 shadow-sm shadow-red-500/5'
                    : isWarning
                      ? 'border-amber-300 dark:border-amber-900/80 bg-amber-50/20 dark:bg-amber-950/15'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

                  const badgeBg = isExpired
                    ? 'bg-red-600 text-white'
                    : isCritical
                      ? 'bg-red-500 text-white animate-pulse'
                      : isWarning
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-emerald-600 text-white';

                  // Obliczenie postępu ważności recepty
                  const progressPct = Math.max(0, Math.min(100, Math.round(((med.validityDays - med.daysRemaining) / med.validityDays) * 100)));

                  return (
                    <div
                      key={med.id}
                      className={`p-4 rounded-2xl border ${cardStyle} transition-all hover:shadow-md flex flex-col justify-between gap-3`}
                    >
                      {/* Górna belka: Lek, Rozpoznanie, Status ważności */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {med.name}
                              </h4>
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                ({med.innName})
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                              <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 text-[11px]">
                                {med.dosage}
                              </span>
                              <span>• {med.packageSize}</span>
                              {med.refundationLevel && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  Odpłatność: {med.refundationLevel}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider ${badgeBg} shrink-0`}>
                            {isExpired
                              ? 'Przeterminowana'
                              : isCritical
                                ? `Wygasa za ${med.daysRemaining} dni!`
                                : isWarning
                                  ? `Wkrótce (${med.daysRemaining} dni)`
                                  : `Ważna (${med.daysRemaining} dni)`}
                          </span>
                        </div>

                        {/* Wskazanie kliniczne */}
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Stethoscope size={13} className="text-slate-400 shrink-0" />
                          <span>Wskazanie: <strong className="text-slate-700 dark:text-slate-300">{med.chronicDisease}</strong></span>
                        </div>

                        {/* Informacje o e-Recepcie P1 i pasku ważności */}
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Kod P1:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {med.p1AccessCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(med.p1AccessCode, med.id)}
                                className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5"
                                title="Kopiuj kod P1"
                              >
                                {copiedCodeId === med.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              </button>
                            </div>

                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Calendar size={12} />
                              <span>Ważność: <strong className={isCritical ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}>{med.validUntil}</strong></span>
                            </div>
                          </div>

                          {/* Pasek postępu terminu ważności */}
                          <div className="space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCritical || isExpired
                                    ? 'bg-red-500'
                                    : isWarning
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>Wystawiono: {med.issueDate} ({med.validityDays} dni)</span>
                              <span>
                                {isExpired ? 'Termin upłynął' : `Pozostało ${med.daysRemaining} dni`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dolna belka: Szybkie akcje (Przedłużenie o 365 dni / 30 dni / Wklejenie do zaleceń) */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRenewMed(med.id, 365)}
                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer flex items-center gap-1 transition-all"
                            title="Wystaw nową receptę roczną na 365 dni"
                          >
                            <Sparkles size={12} />
                            <span>Odnów na 365 dni</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRenewMed(med.id, 30)}
                            className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                            title="Odnów na 30 dni"
                          >
                            +30 dni
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onAppendRecommendation(`Zlecenie e-Recepty (kontynuacja): ${med.name} (${med.dosage}, op: ${med.packageSize}, odpłatność: ${med.refundationLevel || 'R'}) dla leczenia ${med.chronicDisease}. Kod P1: ${med.p1AccessCode}, ważna do: ${med.validUntil}.`);
                              NotificationService.addNotification('SUCCESS', 'Wpisano do zaleceń', `Dopisano ${med.name} do zaleceń wizyty`);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm transition-all"
                            title="Dopisz informację o recepcie do wywiadu/zaleceń wizyty"
                          >
                            Dopisz do zaleceń
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteMed(med.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Usuń z monitoringu leków stałych"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
