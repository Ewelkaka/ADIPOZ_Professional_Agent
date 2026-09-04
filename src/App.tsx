import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SystemOrchestrator } from './services/SystemOrchestrator';
import { AlertCircle, FileText, History as HistoryIcon, Shield, User, Activity, Pill, CheckCircle2, XCircle, Settings as SettingsIcon, Database, AlertTriangle, Share2, Code, Terminal, ChevronLeft, UserCircle, FileCode, FileSpreadsheet, Calendar, Target, QrCode, Tag, Download, Copy, Layers } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { SettingsService, UserSettings } from './services/SettingsService';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationService } from './services/NotificationService';
import { LocalPatientDB, AnalysisRecord } from './services/LocalPatientDB';
import { History } from './components/History';
import Chat from './components/Chat';
import { PatientView } from './components/PatientView';
import { generatePatientReportPDF, generatePatientEReceptasReportPDF } from './lib/pdfGenerator';
import { exportAndDownloadSingleVisit } from './lib/csvExporter';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea } from 'recharts';
import { CustomBmiTooltip, BmiChartPointData } from './components/CustomBmiTooltip';
import { WeightGoalService, WeightGoal } from './services/WeightGoalService';
import { WeightGoalCard } from './components/WeightGoalCard';
import { WeightGoalModal } from './components/WeightGoalModal';
import { BmiVarianceService, BmiVarianceAnalysis } from './services/BmiVarianceService';
import { BmiVarianceCard } from './components/BmiVarianceCard';
import { MedicationCorrelationService, MedicationEvent } from './services/MedicationCorrelationService';
import { CustomBmiChartDot, CustomBmiXAxisTick } from './components/CustomBmiChartDot';
import { MedicationCorrelationCard } from './components/MedicationCorrelationCard';
import { AutonomousAgentWorkflowCard } from './components/AutonomousAgentWorkflowCard';
import { FhirExportModal } from './components/FhirExportModal';
import { FhirExportParams } from './services/FhirExportService';
import { PatientMonitorCard } from './components/PatientMonitorCard';
import { PatientIntakeModal } from './components/PatientIntakeModal';
import { PatientIntakeSurvey } from './components/PatientIntakeSurvey';
import { PatientIntakeService, PatientIntakeForm } from './services/PatientIntakeService';
import { DrugInteractionGraph } from './components/DrugInteractionGraph';
import { Icd10SmartSelector } from './components/Icd10SmartSelector';
import { EReceptaP1ExportModal } from './components/EReceptaP1ExportModal';
import { EReceptaRiskIndicator } from './components/EReceptaRiskIndicator';
import { EReceptaRiskAuditModal } from './components/EReceptaRiskAuditModal';
import { EReceptaService, EReceptaData } from './services/EReceptaService';
import { EReceptaRiskService } from './services/EReceptaRiskService';
import { LinearRegressionService, WeightTrendAnalysis, ProjectedPointData } from './services/LinearRegressionService';
import { BmiTrendRegressionCard } from './components/BmiTrendRegressionCard';
import { P1MedsExportModal } from './components/P1MedsExportModal';
import { P1CeZValidationService } from './services/P1CeZValidationService';
import { RefundacjaMzCheckCard } from './components/RefundacjaMzCheckCard';
import { RefundacjaMzService } from './services/RefundacjaMzService';

const orchestrator = new SystemOrchestrator();
const patientDB = new LocalPatientDB();

export default function App() {
  const [patientId, setPatientId] = useState('PAC-12345');
  const [patientInfo, setPatientInfo] = useState<{ age: number; weight: number; height: number; gender: string; bmi: number; allergies: string; imie?: string; nazwisko?: string; name?: string; pesel?: string }>({ age: 45, weight: 75, height: 175, gender: 'M', bmi: 24.5, allergies: '' });

  useEffect(() => {
    const heightInMeters = patientInfo.height / 100;
    if (heightInMeters > 0) {
      const bmi = parseFloat((patientInfo.weight / (heightInMeters * heightInMeters)).toFixed(1));
      if (bmi !== patientInfo.bmi) {
        setPatientInfo(prev => ({ ...prev, bmi }));
      }
    }
  }, [patientInfo.weight, patientInfo.height]);
  const [symptoms, setSymptoms] = useState('');
  const [medications, setMedications] = useState('');
  const [vitals, setVitals] = useState<{ temp: number; bp: string; pulse?: number; allergies: any[] }>({ temp: 36.6, bp: '120/80', pulse: 72, allergies: [] });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(SettingsService.getSettings());
  const [view, setView] = useState<'analysis' | 'history' | 'chat' | 'patient'>('analysis');
  const [patientHistory, setPatientHistory] = useState<AnalysisRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [isSovereignMode, setIsSovereignMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Stan Celów Wagi Pacjenta
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [isWeightGoalModalOpen, setIsWeightGoalModalOpen] = useState(false);
  const [showGoalReferenceLine, setShowGoalReferenceLine] = useState(true);

  // Stan Wariancji i Dynamiki BMI między ostatnimi wizytami
  const [bmiVarianceThreshold, setBmiVarianceThreshold] = useState<number>(2.0);

  // Stan Modala Eksportu HL7 FHIR Bundle
  const [isFhirModalOpen, setIsFhirModalOpen] = useState<boolean>(false);

  // Stan Modala Eksportu e-Recepty (Standard P1)
  const [isEReceptaP1ModalOpen, setIsEReceptaP1ModalOpen] = useState<boolean>(false);

  // Stan Modala Eksportu Leków do JSON P1 CeZ z Weryfikacją EAN/ATC/Uprawnień
  const [isP1MedsExportModalOpen, setIsP1MedsExportModalOpen] = useState<boolean>(false);

  // Stan Modala Audytu Ryzyka e-Recepty (NFZ / CeZ)
  const [isRiskAuditModalOpen, setIsRiskAuditModalOpen] = useState<boolean>(false);

  // Stan Modala Ankiety Przedwizytowej Pacjenta (QR / Link)
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState<boolean>(false);

  // Stan Znaczników i Korelacji Farmakoterapii na Wykresie BMI
  const [showMedicationLines, setShowMedicationLines] = useState<boolean>(true);
  const [showMedicationBadges, setShowMedicationBadges] = useState<boolean>(true);

  // Stan Linii Regresji Liniowej (Trendu) i Ekstrapolacji Celu na Wykresie BMI
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [showTrendForecast, setShowTrendForecast] = useState<boolean>(true);

  // Funkcja aplikowania danych z ankiety pacjenta do stanu aplikacji
  const handleApplyToIntakeSymptoms = useCallback((formattedSymptoms: string, intakeData?: PatientIntakeForm) => {
    setSymptoms(prev => {
      if (!prev || !prev.trim()) {
        return formattedSymptoms;
      }
      return `${prev.trim()}\n\n--- Dane z Ankiety Pacjenta (Poczekalnia) ---\n${formattedSymptoms}`;
    });

    if (intakeData?.medicationsTaken && intakeData.medicationsTaken.trim()) {
      setMedications(prev => {
        if (!prev || !prev.trim()) {
          return intakeData.medicationsTaken!;
        }
        return `${prev.trim()}, ${intakeData.medicationsTaken!.trim()}`;
      });
    }

    NotificationService.addNotification(
      'SUCCESS',
      'Zaktualizowano Wywiad',
      'Pomyślnie zaktualizowano pole wywiadu i objawów na podstawie ankiety pacjenta'
    );
  }, []);

  const bmiVarianceAnalysis = useMemo(() => {
    return BmiVarianceService.evaluatePatientHistory(patientHistory, patientInfo, bmiVarianceThreshold);
  }, [patientHistory, patientInfo.weight, patientInfo.height, patientInfo.bmi, bmiVarianceThreshold]);

  // Parametry eksportu HL7 FHIR Bundle dla bieżącej wizyty
  const currentFhirParams = useMemo<FhirExportParams>(() => {
    const bpParts = (vitals.bp || '120/80').split('/');
    return {
      patientId,
      patientInfo,
      doctorInfo: {
        name: 'Lek. Jan Kowalski',
        pwz: '1234567',
        specialization: 'Specjalista Medycyny Rodzinnej (POZ)',
        facility: 'NZOZ Przychodnia Lekarza Rodzinnego POZ'
      },
      vitals: {
        cisnienieSkurczowe: parseInt(bpParts[0], 10) || 120,
        cisnienieRozkurczowe: parseInt(bpParts[1], 10) || 80,
        tetno: vitals.pulse || 72,
        temperatura: vitals.temp || 36.6,
        waga: patientInfo.weight,
        wzrost: patientInfo.height,
        bmi: patientInfo.bmi
      },
      symptoms,
      medications,
      analysis,
      visitDate: new Date().toISOString()
    };
  }, [patientId, patientInfo, vitals, symptoms, medications, analysis]);

  // Dane e-Recepty P1 wygenerowane lub zmapowane z bieżącej analizy
  const currentEReceptaData = useMemo<EReceptaData>(() => {
    if (analysis?.data?.note?.eReceptaP1?.data) {
      return analysis.data.note.eReceptaP1.data;
    }
    const patientAge = patientInfo.age || 55;
    const parsedMeds = EReceptaService.parseMedicationsFromText(
      medications,
      patientAge,
      !!analysis?.data?.decision?.chronicDiseaseManagement
    );
    const patientName = patientInfo.imie && patientInfo.nazwisko 
      ? `${patientInfo.imie} ${patientInfo.nazwisko}`
      : patientInfo.name || 'Jan Kowalski';
    const patientPesel = patientInfo.pesel || '80010112345';
    const accessCode = Math.floor(1000 + Math.random() * 9000).toString();
    const packageKey44 = EReceptaService.generate44DigitKey(patientPesel);

    return {
      patientName,
      patientPesel,
      doctorName: 'Lek. Anna Nowak',
      doctorPzw: '1234567',
      doctorTitle: 'Lekarz specjalista medycyny rodzinnej',
      facilityName: 'NZOZ Poradnia Lekarza Rodzinnego i Opieki Koordynowanej POZ',
      facilityCodeVII: '000000012345',
      facilityRegon: '123456789',
      nfzBranch: '01 - Dolnośląski OW NFZ',
      date: new Date().toISOString().split('T')[0],
      accessCode,
      packageKey44,
      packageId: `P1-REC-${Date.now()}`,
      medications: parsedMeds.length > 0 ? parsedMeds : [
        {
          name: analysis?.data?.decision?.diagnosis?.includes('Nadciśnienie') ? 'Ramipril 5 mg' : 'Lek zalecony w wywiadzie',
          innName: analysis?.data?.decision?.diagnosis?.includes('Nadciśnienie') ? 'Ramiprilum' : 'Lek zalecony w wywiadzie',
          dosage: '1x1 rano',
          quantity: '1 op.',
          packageSize: '28 tabl.',
          atcCode: 'C09AA05',
          eanGtin: '5909990012345',
          formCode: 'TABL_POWL',
          refundationLevel: patientAge >= 65 ? 'S' : 'R',
          additionalPrivilege: patientAge >= 65 ? 'S' : 'BRAK',
          dosageInstruction: '1 tabletka doustnie 1 raz dziennie rano',
          treatmentDurationDays: 30,
          validityDays: 30
        }
      ],
      icd10Diagnosis: analysis?.data?.decision?.icd10Code || 'I10'
    };
  }, [analysis, medications, patientInfo]);

  // Bezpośredni 1-kliknięciowy eksport pliku JSON P1 do zewnętrznych systemów z automatyczną analizą NFZ
  const handleDownloadEReceptaJson = useCallback(() => {
    if (!currentEReceptaData) return;

    // Automatyczna analiza poprawności i weryfikacja wymogów NFZ przed pobraniem
    const riskAnalysis = EReceptaRiskService.analyzeEReceptaRisk(currentEReceptaData);
    
    // Weryfikacja z Obwieszczeniem MZ (Wykaz Leków Refundowanych)
    const mzAudit = RefundacjaMzService.verifyMedicationsRefundList(
      currentEReceptaData.medications,
      currentEReceptaData.icd10Diagnosis,
      analysis?.data?.decision?.diagnosis,
      patientInfo.age,
      patientInfo.gender as any,
      typeof analysis?.data?.note === 'object' ? analysis.data.note.medicalNoteText : analysis?.data?.note
    );

    if (riskAnalysis.riskLevel === 'HIGH' || riskAnalysis.riskLevel === 'CRITICAL') {
      setIsRiskAuditModalOpen(true);
      NotificationService.addNotification(
        'WARNING',
        'Wysokie Ryzyko e-Recepty (NFZ)',
        `Wykryto ${riskAnalysis.criticalIssuesCount} krytycznych niezgodności formalnych NFZ. Otwarto szczegółowy raport audytu przed finalnym pobraniem pliku.`
      );
      return;
    }

    if (mzAudit.nfzRiskCount > 0) {
      NotificationService.addNotification(
        'WARNING',
        'Niezgodność z Obwieszczeniem MZ',
        `Uwaga: Wykryto ${mzAudit.nfzRiskCount} pozycje z ryzykiem nienależnej refundacji. Zweryfikuj wskazania w module obwieszczenia MZ.`
      );
    }

    EReceptaService.downloadJSON(currentEReceptaData);
    NotificationService.addNotification(
      riskAnalysis.riskLevel === 'LOW' && mzAudit.nfzRiskCount === 0 ? 'SUCCESS' : 'WARNING',
      riskAnalysis.riskLevel === 'LOW' && mzAudit.nfzRiskCount === 0 ? 'Pobrano zweryfikowaną e-Receptę (JSON P1)' : 'Pobrano e-Receptę z uwagami MZ/NFZ',
      `Plik eRecepta_P1_${currentEReceptaData.patientPesel}.json został pobrany. Zgodność z wymogami NFZ: ${riskAnalysis.compliancePercentage}%, zgodność z MZ: ${mzAudit.overallSafetyScore}%.`
    );
  }, [currentEReceptaData, analysis, patientInfo]);

  // Obsługa akcji z sekcji Monitor Pacjenta
  const handleFocusField = useCallback((fieldId: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      el.classList.add('ring-2', 'ring-emerald-500');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-emerald-500');
      }, 2000);
    }
  }, []);

  const handleAppendRecommendation = useCallback((text: string) => {
    setSymptoms(prev => {
      if (!prev || !prev.trim()) return text;
      return `${prev}\n\n[Zalecenie Monitora]: ${text}`;
    });
  }, []);

  const handleNavigateToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Obsługa doprecyzowania diagnozy i przypisania kodu ICD-10
  const handleApplyIcd10Diagnosis = useCallback((refinedDiagnosis: string, icd10Code: string, note?: string) => {
    setAnalysis((prev: any) => {
      if (!prev || !prev.data) return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          decision: {
            ...prev.data.decision,
            diagnosis: refinedDiagnosis,
            icd10Code: icd10Code,
            ...(note ? { explanation: `${prev.data.decision.explanation ? prev.data.decision.explanation + ' ' : ''}[Doprecyzowanie ICD-10 ${icd10Code}]: ${note}` } : {})
          }
        }
      };
    });
  }, []);

  // Obsługa dodania diagnozy współistniejącej z kodu ICD-10
  const handleAddCoDiagnosis = useCallback((coDiagnosis: string, icd10Code: string) => {
    setAnalysis((prev: any) => {
      if (!prev || !prev.data) return prev;
      const currentChronic = prev.data.decision.chronicDiseaseManagement || '';
      const newEntry = `• Rozpoznanie współistniejące: ${coDiagnosis} (ICD-10: ${icd10Code})`;
      return {
        ...prev,
        data: {
          ...prev.data,
          decision: {
            ...prev.data.decision,
            chronicDiseaseManagement: currentChronic ? `${currentChronic}\n${newEntry}` : newEntry
          }
        }
      };
    });
  }, []);

  // Obsługa wstawiania uzasadnienia spełnienia kryteriów obwieszczenia MZ do notatki medycznej
  const handleAppendRefundJustificationToNote = useCallback((justificationText: string) => {
    setAnalysis((prev: any) => {
      if (!prev || !prev.data) return prev;
      const currentNote = prev.data.note?.medicalNoteText || (typeof prev.data.note === 'string' ? prev.data.note : '');
      const separator = currentNote ? '\n\n' : '';
      const updatedNoteText = `${currentNote}${separator}${justificationText}`;
      
      return {
        ...prev,
        data: {
          ...prev.data,
          note: typeof prev.data.note === 'object' 
            ? { ...prev.data.note, medicalNoteText: updatedNoteText }
            : updatedNoteText,
          decision: {
            ...prev.data.decision,
            explanation: prev.data.decision?.explanation 
              ? `${prev.data.decision.explanation}\n\n${justificationText}` 
              : justificationText
          }
        }
      };
    });

    NotificationService.addNotification(
      'SUCCESS',
      'Dodano Uzasadnienie Refundacyjne MZ',
      'Wstawiono klauzulę spełnienia kryteriów obwieszczenia MZ do dokumentacji medycznej.'
    );
  }, []);

  // Obsługa aktualizacji odpłatności leku wg zaleceń MZ
  const handleUpdateMedicationRefund = useCallback((
    medIndex: number, 
    newRefundLevel: '100%' | 'R' | '50%' | '30%' | 'bezpłatne' | 'S', 
    privilege?: 'S' | 'IB' | 'ZK' | 'C' | 'BRAK'
  ) => {
    setAnalysis((prev: any) => {
      if (!prev || !prev.data) return prev;
      const note = prev.data.note;
      if (note?.eReceptaP1?.data?.medications) {
        const updatedMeds = [...note.eReceptaP1.data.medications];
        if (updatedMeds[medIndex]) {
          updatedMeds[medIndex] = {
            ...updatedMeds[medIndex],
            refundationLevel: newRefundLevel,
            additionalPrivilege: privilege || updatedMeds[medIndex].additionalPrivilege || 'BRAK'
          };
        }
        return {
          ...prev,
          data: {
            ...prev.data,
            note: {
              ...note,
              eReceptaP1: {
                ...note.eReceptaP1,
                data: {
                  ...note.eReceptaP1.data,
                  medications: updatedMeds
                }
              }
            }
          }
        };
      }
      return prev;
    });

    NotificationService.addNotification(
      'SUCCESS',
      'Zaktualizowano Poziom Odpłatności',
      `Ustawiono poziom odpłatności ${newRefundLevel} zgodnie z wykazem leków refundowanych MZ.`
    );
  }, []);

  // Obsługa zamiany leku na refundowany odpowiednik z obwieszczenia MZ
  const handleReplaceMedication = useCallback((medIndex: number, newMedName: string, newEan: string) => {
    setAnalysis((prev: any) => {
      if (!prev || !prev.data) return prev;
      const note = prev.data.note;
      if (note?.eReceptaP1?.data?.medications) {
        const updatedMeds = [...note.eReceptaP1.data.medications];
        if (updatedMeds[medIndex]) {
          updatedMeds[medIndex] = {
            ...updatedMeds[medIndex],
            name: newMedName,
            eanGtin: newEan
          };
        }
        return {
          ...prev,
          data: {
            ...prev.data,
            note: {
              ...note,
              eReceptaP1: {
                ...note.eReceptaP1,
                data: {
                  ...note.eReceptaP1.data,
                  medications: updatedMeds
                }
              }
            }
          }
        };
      }
      return prev;
    });

    setMedications(prev => {
      if (!prev || !prev.trim()) return newMedName;
      return `${prev}, ${newMedName}`;
    });

    NotificationService.addNotification(
      'SUCCESS',
      'Podmieniono na Refundowany Zamiennik',
      `Zastosowano odpowiednik z listy refundacyjnej MZ: ${newMedName}.`
    );
  }, []);

  useEffect(() => {
    const errors: Record<string, string> = {};
    if (isNaN(patientInfo.age) || patientInfo.age < 0 || patientInfo.age > 120) {
      errors.age = "Wiek: 0-120";
    }
    if (isNaN(patientInfo.weight) || patientInfo.weight < 1 || patientInfo.weight > 500) {
      errors.weight = "Waga: 1-500kg";
    }
    if (isNaN(patientInfo.height) || patientInfo.height < 30 || patientInfo.height > 250) {
      errors.height = "Wzrost: 30-250cm";
    }
    setValidationErrors(errors);
  }, [patientInfo.age, patientInfo.weight, patientInfo.height]);

  useEffect(() => {
    NotificationService.requestPermission();
    loadHistory();
    loadWeightGoal();

    const handleGoalEvent = () => {
      loadWeightGoal();
    };
    window.addEventListener('weight-goal-changed', handleGoalEvent);
    return () => {
      window.removeEventListener('weight-goal-changed', handleGoalEvent);
    };
  }, [patientId]);

  const loadWeightGoal = () => {
    const goal = WeightGoalService.getGoal(patientId);
    setWeightGoal(goal);
  };

  const loadHistory = async () => {
    const history = await patientDB.getHistory(patientId);
    setPatientHistory(history);
  };

  useEffect(() => {
    // Apply theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await orchestrator.runFullAnalysis(patientId, symptoms, vitals, medications, patientInfo, isSovereignMode);
      setAnalysis(result);
      loadHistory(); // Refresh history after analysis
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (record: AnalysisRecord) => {
    setAnalysis(record.analysis);
    setSymptoms(record.symptoms);
    setMedications(record.medications);
    setVitals(record.vitals);
    setSelectedHistoryId(record.id);
    setView('analysis');
  };

  const handleNavigateToHistoryVisit = (recordId: string) => {
    setSelectedHistoryId(recordId);
    setView('history');
    const matchedRecord = patientHistory.find(r => r.id === recordId);
    const dateStr = matchedRecord ? new Date(matchedRecord.timestamp).toLocaleDateString('pl-PL') : '';
    NotificationService.addNotification(
      'INFO',
      'Przejście do historii wizyty',
      `Zaznaczono wizytę z dnia ${dateStr || 'wybranego pomiaru'} z wykresu BMI.`
    );
  };

  const bpChartData = useMemo(() => {
    return patientHistory
      .filter(record => record.vitals && ((typeof record.vitals.bp === 'string' && record.vitals.bp.includes('/')) || record.vitals.pulse))
      .map(record => {
        let sys: number | null = null;
        let dia: number | null = null;
        if (record.vitals && typeof record.vitals.bp === 'string' && record.vitals.bp.includes('/')) {
          const parts = record.vitals.bp.split('/').map(Number);
          sys = !isNaN(parts[0]) ? parts[0] : null;
          dia = !isNaN(parts[1]) ? parts[1] : null;
        }
        const pulse = record.vitals?.pulse !== undefined && record.vitals?.pulse !== null && !isNaN(Number(record.vitals.pulse))
          ? Number(record.vitals.pulse)
          : null;
        return {
          date: new Date(record.timestamp).toLocaleDateString(),
          systolic: sys,
          diastolic: dia,
          pulse: pulse
        };
      })
      .reverse();
  }, [patientHistory]);

  const bmiChartData: BmiChartPointData[] = useMemo(() => {
    const data: BmiChartPointData[] = patientHistory
      .filter(record => {
        if (!record.patientInfo) return false;
        const bmi = record.patientInfo.bmi || (record.patientInfo.weight && record.patientInfo.height ? parseFloat((record.patientInfo.weight / Math.pow(record.patientInfo.height / 100, 2)).toFixed(1)) : null);
        return bmi !== null && !isNaN(Number(bmi));
      })
      .map(record => {
        const bmi = record.patientInfo.bmi || (record.patientInfo.weight && record.patientInfo.height ? parseFloat((record.patientInfo.weight / Math.pow(record.patientInfo.height / 100, 2)).toFixed(1)) : null);
        return {
          recordId: record.id,
          timestamp: record.timestamp,
          date: new Date(record.timestamp).toLocaleDateString('pl-PL'),
          time: new Date(record.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          bmi: Number(bmi),
          weight: record.patientInfo?.weight ? Number(record.patientInfo.weight) : undefined,
          height: record.patientInfo?.height ? Number(record.patientInfo.height) : undefined,
          diagnosis: record.analysis?.decision?.diagnosis || 'Wizyta lekarska',
          icd10Code: record.analysis?.decision?.icd10Code,
          symptoms: record.symptoms,
          medications: record.medications,
          isSafeMeds: record.analysis?.medAnalysis?.isSafe
        };
      })
      .reverse();

    if (data.length === 0 && patientInfo && patientInfo.bmi) {
      data.push({
        recordId: undefined,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('pl-PL'),
        time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        bmi: Number(patientInfo.bmi),
        weight: patientInfo.weight ? Number(patientInfo.weight) : undefined,
        height: patientInfo.height ? Number(patientInfo.height) : undefined,
        diagnosis: 'Bieżący profil pacjenta',
        icd10Code: undefined,
        symptoms: symptoms,
        medications: medications,
        isSafeMeds: true
      });
    }

    return MedicationCorrelationService.enrichChartDataWithMedicationEvents(data);
  }, [patientHistory, patientInfo, symptoms, medications]);

  const medicationEvents: MedicationEvent[] = useMemo(() => {
    return MedicationCorrelationService.extractMedicationEvents(bmiChartData);
  }, [bmiChartData]);

  // Analiza regresji liniowej (trendu) i predykcja osiągnięcia celu wagowego
  const weightTrendAnalysis: WeightTrendAnalysis = useMemo(() => {
    return LinearRegressionService.analyzeTrendAndGoal(bmiChartData, weightGoal, patientInfo?.height);
  }, [bmiChartData, weightGoal, patientInfo?.height]);

  // Wzbogacone punkty wykresu z wartościami linii trendu i punktami ekstrapolacji
  const enrichedBmiChartData: ProjectedPointData[] = useMemo(() => {
    return LinearRegressionService.enrichChartDataWithRegression(
      bmiChartData,
      weightTrendAnalysis.metrics,
      showTrendLine && showTrendForecast,
      weightTrendAnalysis.prediction,
      patientInfo?.height
    );
  }, [bmiChartData, weightTrendAnalysis.metrics, weightTrendAnalysis.prediction, showTrendLine, showTrendForecast, patientInfo?.height]);

  const targetBmi = useMemo(() => {
    if (!weightGoal?.targetWeight || !patientInfo?.height) return null;
    return WeightGoalService.calculateBmi(weightGoal.targetWeight, patientInfo.height);
  }, [weightGoal?.targetWeight, patientInfo?.height]);

  const handleDeleteHistory = async (id: string) => {
    await patientDB.deleteAnalysis(patientId, id);
    loadHistory();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-auto transition-colors duration-300">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
            <span className="text-xl">🩺</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">ADIPOZ → Professional Agent</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hidden md:inline-block">
                POZ CDSS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Panel Lekarza • Twórca i Właściciel: Ewelina Lesiak</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-lg mr-4">
            <button 
              onClick={() => setView('analysis')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'analysis' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Analiza
            </button>
            <button 
              onClick={() => setView('history')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Historia
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'chat' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Czat
            </button>
            <button 
              onClick={() => setView('patient')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'patient' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Pacjent
            </button>
          </div>
          <NotificationCenter />
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Ustawienia"
          >
            <SettingsIcon size={20} />
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-100">dr Jan Kowalski</p>
            <p className="text-xs text-slate-400">Specjalista Chorób Wewnętrznych</p>
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
            <User size={20} className="text-slate-300" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'analysis' ? (
          <div className="space-y-6">
            {/* Dedykowana Sekcja: Monitor Pacjenta (Agregacja Alertów Medycznych i Oś Czasu) */}
            <PatientMonitorCard
              patientId={patientId}
              patientInfo={patientInfo}
              vitals={vitals}
              medications={medications}
              symptoms={symptoms}
              analysis={analysis}
              patientHistory={patientHistory}
              bmiVarianceAnalysis={bmiVarianceAnalysis}
              onFocusField={handleFocusField}
              onAppendRecommendation={handleAppendRecommendation}
              onOpenWeightGoalModal={() => setIsWeightGoalModalOpen(true)}
              onOpenFhirExportModal={() => setIsFhirModalOpen(true)}
              onNavigateToSection={handleNavigateToSection}
              onOpenIntakeModal={() => setIsIntakeModalOpen(true)}
              onNavigateToHistoryVisit={handleNavigateToHistoryVisit}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Input */}
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="text-emerald-600" size={20} />
                    <h2 className="text-lg font-bold dark:text-slate-100">Dane Pacjenta</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Pacjenta</label>
                        <input 
                          type="text" 
                          value={patientId}
                          onChange={(e) => setPatientId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Płeć / Wiek / Waga / Wzrost</label>
                        <div className="flex gap-2">
                          <select 
                            value={patientInfo.gender}
                            onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                          >
                            <option value="M">M</option>
                            <option value="F">K</option>
                          </select>
                          <input 
                            type="number" 
                            placeholder="Wiek"
                            value={patientInfo.age}
                            onChange={(e) => setPatientInfo({...patientInfo, age: parseInt(e.target.value)})}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 focus:ring-2 outline-none transition-all dark:text-slate-100 ${validationErrors.age ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'}`}
                          />
                          <input 
                            type="number" 
                            placeholder="Waga"
                            value={patientInfo.weight}
                            onChange={(e) => setPatientInfo({...patientInfo, weight: parseInt(e.target.value)})}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 focus:ring-2 outline-none transition-all dark:text-slate-100 ${validationErrors.weight ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'}`}
                          />
                          <input 
                            type="number" 
                            placeholder="Wzrost"
                            value={patientInfo.height}
                            onChange={(e) => setPatientInfo({...patientInfo, height: parseInt(e.target.value)})}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 focus:ring-2 outline-none transition-all dark:text-slate-100 ${validationErrors.height ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'}`}
                          />
                        </div>
                        <div className="mt-1 flex justify-between items-center">
                          <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1.5">
                            <span>BMI: <span className={patientInfo.bmi > 25 ? "text-amber-600" : "text-emerald-600"}>{patientInfo.bmi}</span></span>
                            {bmiVarianceAnalysis && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                bmiVarianceAnalysis.hasAlert 
                                  ? bmiVarianceAnalysis.alertType === 'RAPID_LOSS' 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                Δ {bmiVarianceAnalysis.deltaBmi > 0 ? `+${bmiVarianceAnalysis.deltaBmi}` : bmiVarianceAnalysis.deltaBmi} pkt
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {Object.values(validationErrors).map((err, i) => (
                              <span key={i} className="text-[9px] text-red-500 font-bold uppercase">{err}</span>
                            ))}
                          </div>
                        </div>
                        {bmiVarianceAnalysis?.hasAlert && (
                          <div className={`mt-2 p-2 rounded-lg border text-xs flex items-center gap-2 ${
                            bmiVarianceAnalysis.alertType === 'RAPID_LOSS'
                              ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60'
                              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60'
                          }`}>
                            <AlertTriangle size={14} className={`shrink-0 ${bmiVarianceAnalysis.alertType === 'RAPID_LOSS' ? 'text-red-600' : 'text-amber-600'}`} />
                            <span className="font-semibold text-[11px] leading-tight">
                              {bmiVarianceAnalysis.alertType === 'RAPID_LOSS' 
                                ? `⚠️ Alert: Zbyt szybka utrata masy ciała (${bmiVarianceAnalysis.deltaBmi} pkt BMI)` 
                                : `⚠️ Alert: Zbyt szybki przyrost masy ciała (+${bmiVarianceAnalysis.deltaBmi} pkt BMI)`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alergie</label>
                        <input 
                          id="input-patient-allergies"
                          type="text" 
                          placeholder="Wpisz znane alergie (np. Penicylina, orzeszki) lub pozostaw puste"
                          value={patientInfo.allergies || ''}
                          onChange={(e) => setPatientInfo({...patientInfo, allergies: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-slate-100"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Objawy i Wywiad</label>
                        <button
                          type="button"
                          onClick={() => setIsIntakeModalOpen(true)}
                          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
                          title="Generuj kod QR / link do ankiety dla pacjenta w poczekalni"
                        >
                          <QrCode size={12} />
                          <span>Ankieta Pacjenta (QR)</span>
                        </button>
                      </div>
                      <textarea 
                        id="input-patient-symptoms"
                        rows={4}
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Opisz objawy zgłaszane przez pacjenta lub zaimportuj je z ankiety przedwizytowej..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aktualne Leki</label>
                      <textarea 
                        id="input-patient-medications"
                        rows={3}
                        value={medications}
                        onChange={(e) => setMedications(e.target.value)}
                        placeholder="Lista leków przyjmowanych przez pacjenta..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none dark:text-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Temperatura ({settings.units === 'metric' ? '°C' : '°F'})
                        </label>
                        <input 
                          id="input-vitals-temp"
                          type="number" 
                          step="0.1"
                          value={vitals.temp}
                          onChange={(e) => setVitals({...vitals, temp: parseFloat(e.target.value) || 36.6})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Ciśnienie (mmHg)
                        </label>
                        <input 
                          id="input-vitals-bp"
                          type="text" 
                          value={vitals.bp}
                          onChange={(e) => setVitals({...vitals, bp: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Tętno (BPM)
                        </label>
                        <input 
                          id="input-vitals-pulse"
                          type="number" 
                          value={vitals.pulse || ''}
                          onChange={(e) => setVitals({...vitals, pulse: parseInt(e.target.value) || undefined})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                        />
                      </div>
                    </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={isSovereignMode ? "text-emerald-500" : "text-slate-400"} />
                      <div>
                        <p className="text-xs font-bold dark:text-slate-200">Tryb Suwerenny</p>
                        <p className="text-[10px] text-slate-500">100% lokalna analiza (bez API)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSovereignMode(!isSovereignMode)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isSovereignMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isSovereignMode ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  <button 
                    onClick={handleAnalyze}
                    disabled={loading || !symptoms || Object.keys(validationErrors).length > 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    title="Zakończ wizytę i przekaż dane do autonomicznej analizy agenta AdiPOZ"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span>🏁</span>
                      <span>{loading ? 'AdiPOZ autonomicznie analizuje przypadek...' : 'Zakończ wizytę i przekaż do AdiPOZ'}</span>
                    </div>
                    <span className="text-[10px] font-normal text-emerald-100 opacity-90">
                      Autonomiczna analiza → Wskazanie uwag → Propozycje działań do zatwierdzenia
                    </span>
                  </button>
                </div>
              </section>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
                  <XCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-7 space-y-6">
              {analysis ? (
                <>
                  {/* Panel Autonomicznego Agenta AdiPOZ: Workflow i Decyzja Lekarza */}
                  <AutonomousAgentWorkflowCard
                    analysis={analysis}
                    patientId={patientId}
                    patientInfo={patientInfo}
                    bmiVarianceAnalysis={bmiVarianceAnalysis}
                    onExportFhir={() => setIsFhirModalOpen(true)}
                  />

                  {/* Gap Analysis Section */}
                  {analysis.data.gapAnalysis && analysis.data.gapAnalysis.gaps.length > 0 && (
                    <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Database className="text-amber-600" size={20} />
                          <h2 className="text-lg font-bold dark:text-slate-100">Analiza Brakujących Danych</h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Jakość Danych:</span>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${analysis.data.gapAnalysis.overallDataQuality > 70 ? 'bg-emerald-500' : analysis.data.gapAnalysis.overallDataQuality > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${analysis.data.gapAnalysis.overallDataQuality}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {analysis.data.gapAnalysis.gaps.map((gap: any, i: number) => (
                          <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex gap-4">
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${gap.importance === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                              <AlertTriangle size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{gap.field}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${gap.importance === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {gap.importance}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{gap.reason}</p>
                              <p className="text-[10px] italic text-slate-500 dark:text-slate-500">Wpływ: {gap.impactOnDiagnosis}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Medication Analysis Section */}
                  <section id="section-med-analysis" className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Pill className="text-indigo-600" size={20} />
                        <h2 className="text-lg font-bold dark:text-slate-100">Analiza Farmakoterapii</h2>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${analysis.data.medAnalysis.isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {analysis.data.medAnalysis.isSafe ? 'Bezpieczne' : 'Wykryto Ryzyko'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 mb-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.data.medAnalysis.summary}</p>
                    </div>

                    {analysis.data.medAnalysis.risks.length > 0 && (
                      <div className="space-y-3">
                        {analysis.data.medAnalysis.risks.map((risk: any, i: number) => (
                          <div key={i} className={`rounded-xl p-4 border ${
                            risk.severity === 'CRITICAL' || risk.severity === 'HIGH' 
                              ? 'bg-red-50 border-red-100 text-red-800' 
                              : 'bg-amber-50 border-amber-100 text-amber-800'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle size={16} />
                              <span className="text-xs font-bold uppercase tracking-wider">{risk.type} - {risk.severity}</span>
                            </div>
                            <p className="text-sm font-semibold mb-1">{risk.message}</p>
                            <p className="text-xs italic opacity-80">Zalecenie: {risk.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Wizualna Mapa Ryzyk (Graf Połączeń i Interakcji Lekowych) */}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <DrugInteractionGraph
                        medications={medications}
                        risks={analysis.data.medAnalysis.risks}
                        onFocusMedicationField={() => handleFocusField('input-patient-medications')}
                      />
                    </div>
                  </section>

                  {/* BP & BMI History Charts */}
                  {(bpChartData.length > 0 || bmiChartData.length > 0) && (
                    <section id="section-bmi-chart" className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
                      {/* Wykres 1: Ciśnienie i Tętno */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                          <div className="flex items-center gap-2">
                            <Activity className="text-blue-600" size={20} />
                            <h2 className="text-lg font-bold dark:text-slate-100">Historia Ciśnienia Tętniczego i Tętna</h2>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50" title="Kliniczny próg rozpoznania nadciśnienia tętniczego wg wytycznych PTNT/ESC">
                              <AlertTriangle size={13} className="text-red-600 dark:text-red-400" />
                              Strefa nadciśnienia: &ge; 140 / 90 mmHg
                            </span>
                          </div>
                        </div>
                        {bpChartData.length > 0 ? (
                          <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={bpChartData} margin={{ top: 15, right: 30, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
                                <YAxis 
                                  stroke="#64748b" 
                                  fontSize={12} 
                                  domain={[40, (dataMax: number) => Math.max(160, isNaN(dataMax) ? 160 : Number(dataMax) + 10)]}
                                  unit=" mmHg"
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                  itemStyle={{ color: '#e2e8f0' }}
                                  formatter={(value: any, name: any) => {
                                    if (value === null || value === undefined) return ['Brak danych', name];
                                    if (name === 'Skurczowe (mmHg)') {
                                      const isHigh = Number(value) >= 140;
                                      return [`${value} mmHg ${isHigh ? '⚠️ (Nadciśnienie ≥140)' : '✓ (W normie)'}`, name];
                                    }
                                    if (name === 'Rozkurczowe (mmHg)') {
                                      const isHigh = Number(value) >= 90;
                                      return [`${value} mmHg ${isHigh ? '⚠️ (Nadciśnienie ≥90)' : '✓ (W normie)'}`, name];
                                    }
                                    if (name === 'Tętno (BPM)') {
                                      return [`${value} BPM`, name];
                                    }
                                    return [value, name];
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                
                                {/* Wizualne wskaźniki i strefy progowe (Threshold Alerts) */}
                                <ReferenceArea 
                                  y1={140} 
                                  fill="#ef4444" 
                                  fillOpacity={0.08} 
                                  stroke="#ef4444" 
                                  strokeOpacity={0.2} 
                                  strokeDasharray="3 3" 
                                />
                                <ReferenceLine 
                                  y={140} 
                                  stroke="#ef4444" 
                                  strokeWidth={1.5} 
                                  strokeDasharray="4 4" 
                                  label={{ 
                                    value: 'Próg skurczowy: 140 mmHg', 
                                    fill: '#ef4444', 
                                    fontSize: 11, 
                                    fontWeight: 600,
                                    position: 'insideTopRight' 
                                  }} 
                                />
                                <ReferenceLine 
                                  y={90} 
                                  stroke="#f59e0b" 
                                  strokeWidth={1.5} 
                                  strokeDasharray="4 4" 
                                  label={{ 
                                    value: 'Próg rozkurczowy: 90 mmHg', 
                                    fill: '#d97706', 
                                    fontSize: 11, 
                                    fontWeight: 600,
                                    position: 'insideTopRight' 
                                  }} 
                                />

                                <Line type="monotone" dataKey="systolic" name="Skurczowe (mmHg)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} connectNulls />
                                <Line type="monotone" dataKey="diastolic" name="Rozkurczowe (mmHg)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} connectNulls />
                                <Line type="monotone" dataKey="pulse" name="Tętno (BPM)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} connectNulls />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">Brak zarejestrowanych pomiarów ciśnienia lub tętna w historii.</p>
                        )}
                      </div>

                      {/* Wykres 2: Historia BMI i Wagi */}
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <Activity className="text-purple-600 dark:text-purple-400" size={20} />
                            <h2 className="text-lg font-bold dark:text-slate-100">Historia Wskaźnika BMI i Wagi Pacjenta</h2>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {patientInfo?.weight && (
                              <span className="text-xs font-semibold px-3 py-1 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 rounded-full border border-cyan-200 dark:border-cyan-800/50 self-start sm:self-auto">
                                Aktualna waga: <strong>{patientInfo.weight} kg</strong>
                              </span>
                            )}
                            {patientInfo?.bmi && (
                              <span className="text-xs font-semibold px-3 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800/50 self-start sm:self-auto">
                                Aktualne BMI: <strong>{patientInfo.bmi}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Legenda kategorii BMI */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mb-5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Kategorie BMI:</span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 font-medium" title="BMI poniżej 18.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Niedowaga (&lt; 18.5)
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 font-medium" title="BMI w przedziale 18.5 - 24.9">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Norma (18.5 - 24.9)
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 font-medium" title="BMI w przedziale 25.0 - 29.9">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Nadwaga (25.0 - 29.9)
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 font-medium" title="BMI 30.0 i więcej">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span> Otyłość (&ge; 30.0)
                          </span>
                        </div>

                        {/* Karta Wariancji BMI i Alertów Dynamiki między ostatnimi wizytami */}
                        <div id="section-bmi-variance">
                          <BmiVarianceCard
                            varianceAnalysis={bmiVarianceAnalysis}
                            onNavigateToVisit={handleNavigateToHistoryVisit}
                            threshold={bmiVarianceThreshold}
                            onThresholdChange={setBmiVarianceThreshold}
                          />
                        </div>

                        {/* Karta i moduł Celów Wagi Pacjenta */}
                        <WeightGoalCard
                          goal={weightGoal}
                          currentWeight={patientInfo?.weight || 0}
                          heightCm={patientInfo?.height || 0}
                          onOpenModal={() => setIsWeightGoalModalOpen(true)}
                          showReferenceLine={showGoalReferenceLine}
                          onToggleReferenceLine={() => setShowGoalReferenceLine(prev => !prev)}
                        />

                        {/* Karta Korelacji Farmakoterapii ze Zmianą Wagi i BMI */}
                        <MedicationCorrelationCard
                          events={medicationEvents}
                          onNavigateToVisit={handleNavigateToHistoryVisit}
                          showMedicationLines={showMedicationLines}
                          onToggleMedicationLines={() => setShowMedicationLines(prev => !prev)}
                          showMedicationBadges={showMedicationBadges}
                          onToggleMedicationBadges={() => setShowMedicationBadges(prev => !prev)}
                        />

                        {/* Karta Regresji Liniowej i Predykcji Celu Wagowego */}
                        <div id="section-bmi-trend">
                          <BmiTrendRegressionCard
                            trendAnalysis={weightTrendAnalysis}
                            weightGoal={weightGoal}
                            showTrendLine={showTrendLine}
                            onToggleTrendLine={() => setShowTrendLine(prev => !prev)}
                            showTrendForecast={showTrendForecast}
                            onToggleTrendForecast={() => setShowTrendForecast(prev => !prev)}
                            onOpenWeightGoalModal={() => setIsWeightGoalModalOpen(true)}
                          />
                        </div>

                        {enrichedBmiChartData.length > 0 ? (
                          <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart 
                                data={enrichedBmiChartData} 
                                margin={{ top: 15, right: 35, bottom: 8, left: 10 }}
                                onClick={(e: any) => {
                                  if (e && e.activePayload && e.activePayload.length) {
                                    const pointData = e.activePayload[0].payload;
                                    if (pointData?.recordId) {
                                      handleNavigateToHistoryVisit(pointData.recordId);
                                    }
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#64748b" 
                                  fontSize={11} 
                                  tickMargin={6} 
                                  height={46}
                                  tick={(tickProps: any) => (
                                    <CustomBmiXAxisTick 
                                      {...tickProps} 
                                      data={enrichedBmiChartData} 
                                      onSelectVisit={handleNavigateToHistoryVisit} 
                                    />
                                  )}
                                />
                                <YAxis 
                                  yAxisId="left" 
                                  stroke="#8b5cf6" 
                                  fontSize={12} 
                                  domain={[
                                    (dataMin: number) => {
                                      const minVal = isNaN(dataMin) ? 14 : Number(dataMin);
                                      const goalVal = (showGoalReferenceLine && targetBmi) ? targetBmi : minVal;
                                      return Math.max(12, Math.floor(Math.min(minVal, goalVal, 14)));
                                    },
                                    (dataMax: number) => {
                                      const maxVal = isNaN(dataMax) ? 35 : Number(dataMax);
                                      const goalVal = (showGoalReferenceLine && targetBmi) ? targetBmi : maxVal;
                                      return Math.ceil(Math.max(maxVal, goalVal, 35) + 2);
                                    }
                                  ]}
                                  unit=" kg/m²"
                                />
                                <YAxis 
                                  yAxisId="right" 
                                  orientation="right" 
                                  stroke="#06b6d4" 
                                  fontSize={12} 
                                  domain={[
                                    (dataMin: number) => {
                                      const minVal = isNaN(dataMin) ? 60 : Number(dataMin);
                                      const goalVal = (showGoalReferenceLine && weightGoal?.targetWeight) ? weightGoal.targetWeight : minVal;
                                      return Math.max(30, Math.floor(Math.min(minVal, goalVal) - 5));
                                    },
                                    (dataMax: number) => {
                                      const maxVal = isNaN(dataMax) ? 90 : Number(dataMax);
                                      const goalVal = (showGoalReferenceLine && weightGoal?.targetWeight) ? weightGoal.targetWeight : maxVal;
                                      return Math.ceil(Math.max(maxVal, goalVal) + 5);
                                    }
                                  ]}
                                  unit=" kg"
                                />
                                <Tooltip
                                  content={<CustomBmiTooltip onSelectVisit={handleNavigateToHistoryVisit} weightGoal={weightGoal} />}
                                  wrapperStyle={{ pointerEvents: 'auto', outline: 'none' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                                {/* Strefy tła dla kategorii BMI (ReferenceArea) powiązane z lewą osią BMI */}
                                <ReferenceArea 
                                  yAxisId="left"
                                  y1={14} 
                                  y2={18.5} 
                                  fill="#3b82f6" 
                                  fillOpacity={0.08} 
                                  stroke="#3b82f6" 
                                  strokeOpacity={0.2} 
                                  strokeDasharray="2 2"
                                />
                                <ReferenceArea 
                                  yAxisId="left"
                                  y1={18.5} 
                                  y2={25} 
                                  fill="#10b981" 
                                  fillOpacity={0.08} 
                                  stroke="#10b981" 
                                  strokeOpacity={0.2} 
                                  strokeDasharray="2 2"
                                />
                                <ReferenceArea 
                                  yAxisId="left"
                                  y1={25} 
                                  y2={30} 
                                  fill="#f59e0b" 
                                  fillOpacity={0.08} 
                                  stroke="#f59e0b" 
                                  strokeOpacity={0.2} 
                                  strokeDasharray="2 2"
                                />
                                <ReferenceArea 
                                  yAxisId="left"
                                  y1={30} 
                                  y2={45} 
                                  fill="#ef4444" 
                                  fillOpacity={0.08} 
                                  stroke="#ef4444" 
                                  strokeOpacity={0.2} 
                                  strokeDasharray="2 2"
                                />

                                {/* Linie referencyjne progów BMI powiązane z lewą osią BMI */}
                                <ReferenceLine 
                                  yAxisId="left"
                                  y={18.5} 
                                  stroke="#3b82f6" 
                                  strokeWidth={1} 
                                  strokeDasharray="3 3" 
                                  label={{ 
                                    value: '18.5 (Niedowaga)', 
                                    fill: '#2563eb', 
                                    fontSize: 10, 
                                    fontWeight: 600,
                                    position: 'insideTopRight' 
                                  }} 
                                />
                                <ReferenceLine 
                                  yAxisId="left"
                                  y={25} 
                                  stroke="#10b981" 
                                  strokeWidth={1} 
                                  strokeDasharray="3 3" 
                                  label={{ 
                                    value: '25.0 (Nadwaga)', 
                                    fill: '#059669', 
                                    fontSize: 10, 
                                    fontWeight: 600,
                                    position: 'insideTopRight' 
                                  }} 
                                />
                                <ReferenceLine 
                                  yAxisId="left"
                                  y={30} 
                                  stroke="#ef4444" 
                                  strokeWidth={1} 
                                  strokeDasharray="3 3" 
                                  label={{ 
                                    value: '30.0 (Otyłość)', 
                                    fill: '#dc2626', 
                                    fontSize: 10, 
                                    fontWeight: 600,
                                    position: 'insideTopRight' 
                                  }} 
                                />

                                {/* Dynamiczna Linia Celu Wagi (Oś Prawa - Waga kg) */}
                                {showGoalReferenceLine && weightGoal && (
                                  <ReferenceLine 
                                    yAxisId="right"
                                    y={weightGoal.targetWeight} 
                                    stroke="#9333ea" 
                                    strokeWidth={2.5} 
                                    strokeDasharray="5 4" 
                                    label={{ 
                                      value: `🎯 Cel wagi: ${weightGoal.targetWeight} kg`, 
                                      fill: '#9333ea', 
                                      fontSize: 11, 
                                      fontWeight: 700,
                                      position: 'insideTopRight' 
                                    }} 
                                  />
                                )}

                                {/* Dynamiczna Linia Celu BMI (Oś Lewa - BMI kg/m²) */}
                                {showGoalReferenceLine && targetBmi && (
                                  <ReferenceLine 
                                    yAxisId="left"
                                    y={targetBmi} 
                                    stroke="#7c3aed" 
                                    strokeWidth={2} 
                                    strokeDasharray="4 4" 
                                    strokeOpacity={0.8}
                                    label={{ 
                                      value: `🎯 Cel BMI: ${targetBmi}`, 
                                      fill: '#7c3aed', 
                                      fontSize: 10, 
                                      fontWeight: 700,
                                      position: 'insideTopLeft' 
                                    }} 
                                  />
                                )}

                                {/* Pionowe linie wdrożeń farmakoterapii (zdarzenia rozpoczęcia nowych leków) */}
                                {showMedicationLines && medicationEvents.map((evt, idx) => (
                                  <ReferenceLine
                                    key={`med-ref-${idx}`}
                                    x={evt.date}
                                    stroke="#ec4899"
                                    strokeWidth={1.5}
                                    strokeDasharray="4 3"
                                    strokeOpacity={0.85}
                                    label={{
                                      value: `💊 ${evt.newMedications[0] || 'Lek'}`,
                                      fill: '#db2777',
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                      position: 'insideTopLeft'
                                    }}
                                  />
                                ))}

                                <Line 
                                  yAxisId="left" 
                                  type="monotone" 
                                  dataKey="bmi" 
                                  name="BMI (kg/m²)" 
                                  stroke="#8b5cf6" 
                                  strokeWidth={3} 
                                  dot={(dotProps: any) => (
                                    <CustomBmiChartDot 
                                      {...dotProps} 
                                      onSelectVisit={handleNavigateToHistoryVisit} 
                                      showMedicationBadges={showMedicationBadges} 
                                    />
                                  )}
                                  activeDot={{ 
                                    r: 8, 
                                    fill: '#8b5cf6', 
                                    stroke: '#ffffff', 
                                    strokeWidth: 2, 
                                    cursor: 'pointer',
                                    onClick: (_e: any, payload: any) => {
                                      const recordId = payload?.payload?.recordId;
                                      if (recordId) {
                                        handleNavigateToHistoryVisit(recordId);
                                      }
                                    }
                                  }} 
                                  connectNulls 
                                />
                                <Line 
                                  yAxisId="right" 
                                  type="monotone" 
                                  dataKey="weight" 
                                  name="Waga (kg)" 
                                  stroke="#06b6d4" 
                                  strokeWidth={2.5} 
                                  dot={{ r: 5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 1.5, cursor: 'pointer' }} 
                                  activeDot={{ 
                                    r: 7, 
                                    fill: '#06b6d4', 
                                    stroke: '#ffffff', 
                                    strokeWidth: 2, 
                                    cursor: 'pointer',
                                    onClick: (_e: any, payload: any) => {
                                      const recordId = payload?.payload?.recordId;
                                      if (recordId) {
                                        handleNavigateToHistoryVisit(recordId);
                                      }
                                    }
                                  }} 
                                  connectNulls 
                                />

                                {/* Linia Regresji Liniowej Wagi (Oś Prawa - Waga kg) */}
                                {showTrendLine && weightTrendAnalysis.hasEnoughData && (
                                  <Line 
                                    yAxisId="right" 
                                    type="linear" 
                                    dataKey="weightTrend" 
                                    name="Trend wagi (regresja)" 
                                    stroke="#f59e0b" 
                                    strokeWidth={2.5} 
                                    strokeDasharray="6 4"
                                    dot={(dotProps: any) => {
                                      if (dotProps?.payload?.isProjected) {
                                        return (
                                          <g key={`proj-dot-${dotProps.index || 0}`}>
                                            <circle
                                              cx={dotProps.cx}
                                              cy={dotProps.cy}
                                              r={6}
                                              fill="#9333ea"
                                              stroke="#ffffff"
                                              strokeWidth={2}
                                            />
                                            <text
                                              x={dotProps.cx}
                                              y={dotProps.cy - 8}
                                              textAnchor="middle"
                                              fontSize={10}
                                            >
                                              🔮
                                            </text>
                                          </g>
                                        );
                                      }
                                      return null;
                                    }}
                                    activeDot={{ 
                                      r: 6, 
                                      fill: '#f59e0b', 
                                      stroke: '#ffffff', 
                                      strokeWidth: 2 
                                    }} 
                                    connectNulls 
                                  />
                                )}

                                {/* Linia Regresji Liniowej BMI (Oś Lewa - BMI kg/m²) */}
                                {showTrendLine && weightTrendAnalysis.hasEnoughData && (
                                  <Line 
                                    yAxisId="left" 
                                    type="linear" 
                                    dataKey="bmiTrend" 
                                    name="Trend BMI (regresja)" 
                                    stroke="#d946ef" 
                                    strokeWidth={1.5} 
                                    strokeDasharray="3 3" 
                                    dot={false}
                                    activeDot={{ 
                                      r: 5, 
                                      fill: '#d946ef', 
                                      stroke: '#ffffff', 
                                      strokeWidth: 1.5 
                                    }} 
                                    connectNulls 
                                  />
                                )}
                              </LineChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1 gap-1">
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span>💡 Kliknij dowolny punkt lub znacznik 💊, aby przejść do wizyty w historii.</span>
                                <span className="text-pink-600 dark:text-pink-400 font-medium">Znaczniki 💊 oznaczają start nowych leków.</span>
                              </span>
                              {selectedHistoryId && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryId(null)}
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                >
                                  Wyczyść zaznaczenie wizyty
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">Brak zarejestrowanych pomiarów wagi i wzrostu pacjenta.</p>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Decision & Alerts */}
                  <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="text-emerald-600" size={20} />
                        <h2 className="text-lg font-bold dark:text-slate-100">Wynik Analizy i Alerty</h2>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <button 
                          onClick={() => {
                            exportAndDownloadSingleVisit({
                              patientId,
                              patientInfo,
                              vitals,
                              symptoms,
                              medications,
                              analysis
                            });
                            NotificationService.addNotification('SUCCESS', 'Eksport CSV', `Pomyślnie wyeksportowano dane wizyty pacjenta ${patientId} do formatu CSV`);
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Eksportuj dane wizyty do pliku CSV (zgodnego z Excel i systemami zewnętrznymi EHR)"
                        >
                          <FileSpreadsheet size={13} />
                          Eksportuj CSV
                        </button>
                        <button 
                          onClick={() => generatePatientReportPDF(analysis, patientId)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
                          title="Generuj raport PDF dla bieżącej wizyty"
                        >
                          <FileText size={13} />
                          Generuj PDF
                        </button>
                        <button 
                          onClick={() => {
                            const recordsToExport = patientHistory && patientHistory.length > 0
                              ? patientHistory
                              : [{
                                  id: 'current',
                                  patientId,
                                  timestamp: new Date().toISOString(),
                                  symptoms,
                                  medications,
                                  vitals,
                                  analysis,
                                  patientInfo
                                }];
                            const result = generatePatientEReceptasReportPDF(patientId, recordsToExport, patientInfo);
                            NotificationService.addNotification('SUCCESS', 'Raport e-Recept PDF', `Pomyślnie wygenerowano zbiorczy raport PDF dla ${result.count} e-Recept pacjenta ${patientId}`);
                          }}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          title="Generuj i pobierz zbiorczy raport PDF wszystkich e-Recept wystawionych dla bieżącego pacjenta"
                        >
                          <Pill size={13} />
                          e-Recepty PDF
                        </button>
                        <button 
                          onClick={() => {
                            const recordsToExport = patientHistory && patientHistory.length > 0
                              ? patientHistory
                              : [{
                                  id: 'current',
                                  patientId,
                                  timestamp: new Date().toISOString(),
                                  symptoms,
                                  medications,
                                  vitals,
                                  analysis,
                                  patientInfo
                                }];
                            generatePatientReportPDF(analysis, patientId, recordsToExport);
                            NotificationService.addNotification('SUCCESS', 'Zbiorczy Raport PDF', `Wygenerowano zbiorczy raport PDF dla ${recordsToExport.length} wizyt pacjenta ${patientId}`);
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors"
                          title="Generuj zbiorczy raport PDF dla wszystkich zarejestrowanych historycznych wizyt pacjenta"
                        >
                          <FileText size={13} />
                          Zbiorczy Raport PDF
                        </button>
                        <button 
                          onClick={() => setIsFhirModalOpen(true)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          title="Eksportuj notatkę medyczną i dane kliniczne do standardu HL7 FHIR R4 Bundle (interoperacyjność z HIS/EHR)"
                        >
                          <Share2 size={13} />
                          Eksportuj HL7 FHIR
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${analysis.data.decision.isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {analysis.data.decision.isSafe ? 'Bezpieczne' : 'Wymaga Uwagi'}
                        </span>
                      </div>
                    </div>

                    {analysis.data.decision.podsumowanie_wizyty && (
                      <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Podsumowanie Wizyty</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {analysis.data.decision.podsumowanie_wizyty}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-slate-500 uppercase">Sugerowana Diagnoza</p>
                            <button
                              type="button"
                              onClick={() => handleNavigateToSection('section-icd10-refiner')}
                              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
                              title="Przejdź do inteligentnego podpowiadacza kodów ICD-10"
                            >
                              <Tag size={12} />
                              Doprecyzuj ICD-10
                            </button>
                          </div>
                          <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-400">
                            {analysis.data.decision.diagnosis}
                            {analysis.data.decision.icd10Code && (
                              <span className="ml-2 text-sm font-mono bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400">
                                {analysis.data.decision.icd10Code}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Zalecane Działanie</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{analysis.data.decision.action}</p>
                      </div>
                    </div>

                    {analysis.data.decision.mappedSymptoms && analysis.data.decision.mappedSymptoms.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Zmapowane Objawy (Terminologia Medyczna)</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.data.decision.mappedSymptoms.map((symptom: string, i: number) => (
                            <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.data.decision.suggestedTests && analysis.data.decision.suggestedTests.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sugerowane Badania Diagnostyczne</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {analysis.data.decision.suggestedTests.map((test: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{test}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.data.decision.explanation && (
                      <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Uzasadnienie Kliniczne (CoT)</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                          "{analysis.data.decision.explanation}"
                        </p>
                      </div>
                    )}

                    {analysis.data.decision.chronicDiseaseManagement && (
                      <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity size={16} className="text-amber-600" />
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Zarządzanie Chorobą Przewlekłą</p>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                          {analysis.data.decision.chronicDiseaseManagement}
                        </p>
                      </div>
                    )}

                    {analysis.data.decision.differential_diagnoses && analysis.data.decision.differential_diagnoses.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Diagnozy Różnicowe</p>
                        <div className="space-y-2">
                          {analysis.data.decision.differential_diagnoses.map((dd: any, i: number) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{dd.diagnosis}</span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{dd.probability}%</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{dd.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.data.decision.alerts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Alerty Systemowe i Ostrzeżenia</p>
                        {analysis.data.decision.alerts.map((alert: string, i: number) => {
                          const isWarningOrCritical = alert.includes('ALERT') || alert.includes('utrata') || alert.includes('przyrost') || alert.includes('KRYTYCZNY') || alert.includes('BLOKADA');
                          return (
                            <div 
                              key={i} 
                              className={`rounded-xl px-4 py-3 text-sm flex gap-3 items-start border ${
                                isWarningOrCritical 
                                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200' 
                                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
                              }`}
                            >
                              {isWarningOrCritical ? (
                                <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              )}
                              <div className="leading-relaxed">
                                {alert}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Inteligentna Wyszukiwarka i Podpowiadacz Kodów ICD-10 */}
                  <section id="section-icd10-refiner">
                    <Icd10SmartSelector
                      currentDiagnosis={analysis.data.decision.diagnosis}
                      currentIcd10Code={analysis.data.decision.icd10Code}
                      symptoms={symptoms}
                      medications={medications}
                      vitals={{
                        bp: vitals.bp,
                        pulse: vitals.pulse,
                        temp: vitals.temp
                      }}
                      patientInfo={{
                        bmi: patientInfo.bmi,
                        weight: patientInfo.weight,
                        age: patientInfo.age
                      }}
                      onApplyDiagnosis={handleApplyIcd10Diagnosis}
                      onAddCoDiagnosis={handleAddCoDiagnosis}
                    />
                  </section>

                  {/* AdiPOZ Integration Section */}
                  {analysis.data.integration && (
                    <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-6">
                        <Share2 className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold dark:text-slate-100">Integracja AdiPOZ Engine</h2>
                      </div>

                      <div className="space-y-6">
                        {/* HL7 CDA */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Code size={16} className="text-blue-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mapowanie HL7 CDA R2</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.data.integration.hl7.map((hl7: any, i: number) => (
                              <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">{hl7.type}</p>
                                <pre className="text-[10px] text-slate-400 overflow-x-auto max-h-32 scrollbar-thin scrollbar-thumb-slate-700">
                                  {hl7.xml}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SQL Queries */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Database size={16} className="text-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Eksport SQL (Patient/Visit)</h3>
                          </div>
                          <div className="space-y-2">
                            {analysis.data.integration.sql.map((sql: any, i: number) => (
                              <div key={i} className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
                                <Terminal size={14} className="text-emerald-400 shrink-0" />
                                <code className="text-[10px] text-emerald-400 font-mono break-all">
                                  {sql.query}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* NoSQL Schema */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Shield size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sovereign Log Schema (NoSQL)</h3>
                          </div>
                          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Collection: {analysis.data.integration.nosql.collection}</p>
                            <pre className="text-[10px] text-slate-400">
                              {JSON.stringify(analysis.data.integration.nosql.schema, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {/* HL7 FHIR Release 4 Bundle */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Share2 size={16} className="text-sky-400" />
                              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">HL7 FHIR R4 Bundle (Interoperacyjność HIS / EHR)</h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsFhirModalOpen(true)}
                              className="text-xs font-semibold px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 rounded-lg transition-colors cursor-pointer"
                            >
                              Otwórz eksporter FHIR
                            </button>
                          </div>
                          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-sky-300 font-semibold mb-1">Standard FHIR Bundle (type: document)</p>
                              <p className="text-[11px] text-slate-400">
                                Zawiera zasoby: <code className="text-sky-400">Composition</code>, <code className="text-emerald-400">Patient</code>, <code className="text-indigo-400">Practitioner</code>, <code className="text-amber-400">Encounter</code>, <code className="text-rose-400">Condition</code> oraz <code className="text-cyan-400">Observations</code> (Vitals).
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsFhirModalOpen(true)}
                              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                            >
                              Podgląd i Pobranie JSON
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Sekcja Weryfikacji z Obwieszczeniem MZ (Lista Leków Refundowanych & Dostępność GIF) */}
                  <section id="section-mz-refund-check">
                    <RefundacjaMzCheckCard
                      eReceptaData={currentEReceptaData}
                      medicalNoteText={typeof analysis?.data?.note === 'object' ? analysis.data.note.medicalNoteText : analysis?.data?.note}
                      patientDiagnosis={analysis?.data?.decision?.diagnosis}
                      patientIcd10={analysis?.data?.decision?.icd10Code}
                      patientAge={patientInfo.age}
                      patientGender={patientInfo.gender as any}
                      chronicMedications={medications}
                      patientHistory={patientHistory}
                      onAppendToMedicalNote={handleAppendRefundJustificationToNote}
                      onUpdateMedicationRefund={handleUpdateMedicationRefund}
                      onReplaceMedication={handleReplaceMedication}
                    />
                  </section>

                  {/* Medical Note */}
                  <section className="bg-slate-900 rounded-2xl p-6 shadow-xl text-slate-300 font-mono text-sm overflow-hidden relative">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 text-slate-100 z-20 relative">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold font-sans flex items-center gap-2">
                            Wygenerowana Notatka Medyczna
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              HL7 CDA / P1 CeZ
                            </span>
                          </h2>
                          <p className="text-xs text-slate-400 font-sans">
                            Dokumentacja wizyty POZ zintegrowana z pakietem e-Recepty
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Dedykowany Eksport Listy Leków z Weryfikacją EAN/ATC/Uprawnień S, IB */}
                        <button 
                          type="button"
                          onClick={() => setIsP1MedsExportModalOpen(true)}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-sans font-bold py-1.5 px-3 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-xs"
                          title="Eksportuj listę leków do formatu JSON zgodnego ze specyfikacją P1 CeZ wraz z techniczną weryfikacją EAN-13, ATC oraz uprawnień (S, IB)"
                        >
                          <Pill size={14} className="text-purple-200" />
                          <span>Eksport Leków (P1 CeZ JSON)</span>
                          <span className="px-1.5 py-0.2 bg-black/30 rounded text-[10px] font-mono text-purple-200">
                            EAN/ATC/S
                          </span>
                        </button>

                        {/* 1-Kliknięciowy Eksport do JSON P1 */}
                        <button 
                          type="button"
                          onClick={handleDownloadEReceptaJson}
                          className="flex items-center gap-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-sans font-bold py-1.5 px-3 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer text-xs"
                          title="Pobierz gotowy plik e-Recepty w standardzie P1 CeZ (JSON) do zaimportowania w Kamsoft / mMedica / Serum"
                        >
                          <Download size={14} />
                          Pobierz P1 JSON
                        </button>

                        {/* Podgląd JSON P1 i Zarządzanie */}
                        <button 
                          type="button"
                          onClick={() => setIsEReceptaP1ModalOpen(true)}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-bold py-1.5 px-3 rounded-xl border border-slate-700 transition-colors cursor-pointer text-xs"
                          title="Podgląd struktury technicznej JSON P1, kopiowanie do schowka i weryfikacja integracji HIS"
                        >
                          <FileCode size={14} />
                          Podgląd
                        </button>

                        {/* Eksport HL7 FHIR */}
                        <button 
                          type="button"
                          onClick={() => setIsFhirModalOpen(true)}
                          className="flex items-center gap-1.5 bg-sky-600/25 hover:bg-sky-600/45 text-sky-300 font-sans font-bold py-1.5 px-3 rounded-xl border border-sky-500/40 transition-colors cursor-pointer text-xs"
                          title="Eksportuj wygenerowaną notatkę medyczną do formatu HL7 FHIR Bundle zgodnego z HIS/EHR"
                        >
                          <Share2 size={14} />
                          HL7 FHIR
                        </button>
                      </div>
                    </div>

                    {/* Wskaźnik Stopnia Ryzyka e-Recepty & Audyt NFZ */}
                    {currentEReceptaData && (
                      <div className="mb-4">
                        <EReceptaRiskIndicator 
                          eReceptaData={currentEReceptaData}
                          onDownloadConfirmed={() => {
                            EReceptaService.downloadJSON(currentEReceptaData);
                            NotificationService.addNotification(
                              'SUCCESS',
                              'Pobrano plik e-Recepty (JSON P1)',
                              `Plik eRecepta_P1_${currentEReceptaData.patientPesel}.json został pomyślnie pobrany.`
                            );
                          }}
                        />
                      </div>
                    )}

                    {/* Pasek Szybkiego Statusu e-Recepty P1 */}
                    {currentEReceptaData && (
                      <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-sans relative z-10">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 size={14} />
                            <span className="font-semibold">Pakiet P1 Gotowy</span>
                          </div>
                          <div className="text-slate-400">
                            PIN: <span className="font-mono font-bold text-emerald-300 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/60">{currentEReceptaData.accessCode}</span>
                          </div>
                          <div className="text-slate-400">
                            Leki: <strong className="text-slate-200">{currentEReceptaData.medications.length} poz.</strong>
                          </div>
                          <div className="text-slate-400 hidden sm:block">
                            Standard: <span className="font-mono text-slate-300">CeZ PL-CDA-P1 v1.4</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              EReceptaService.downloadPDF(currentEReceptaData);
                              NotificationService.addNotification('INFO', 'Wydruk e-Recepty', 'Pobrano wydruk informacyjny e-Recepty (PDF)');
                            }}
                            className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileText size={12} />
                            Wydruk PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEReceptaP1ModalOpen(true)}
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800/60 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Layers size={12} />
                            Wykaz & JSON
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-6 right-6 opacity-10">
                      <Shield size={120} />
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed relative z-10 text-xs sm:text-sm bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                      {analysis.data.note.content}
                    </pre>
                    <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-sans flex flex-col sm:flex-row items-center justify-between gap-2">
                      <span>Zgodność z regulacjami: 100% | Standard: PL-CDA-P1 / HL7 FHIR R4</span>
                      <span className="font-mono text-emerald-500/80">PODPIS: SOVEREIGN_AI_SECURE_HASH</span>
                    </div>
                  </section>

                  {/* Disclaimer */}
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 italic text-xs text-slate-600 dark:text-slate-400 text-center">
                    {analysis.disclaimer}
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[400px] bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-12 text-center">
                  <HistoryIcon size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium dark:text-slate-300">Oczekiwanie na analizę pacjenta</p>
                  <p className="text-sm max-w-xs dark:text-slate-400">Wprowadź objawy i leki po lewej stronie i uruchom analizę, aby zobaczyć wyniki i wygenerować notatkę.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : view === 'history' ? (
          <History 
            history={patientHistory} 
            onSelect={handleSelectHistory} 
            onDelete={handleDeleteHistory} 
            patientId={patientId}
            patientInfo={patientInfo}
            selectedRecordId={selectedHistoryId}
            onClearSelection={() => setSelectedHistoryId(null)}
          />
        ) : view === 'patient' ? (
          <PatientView 
            patientInfo={patientInfo} 
            analysis={analysis} 
            patientHistory={patientHistory}
            vitals={vitals}
            onUpdateVitals={setVitals}
            onNavigateToHistory={handleNavigateToHistoryVisit}
            patientId={patientId}
            weightGoal={weightGoal}
            onOpenWeightGoalModal={() => setIsWeightGoalModalOpen(true)}
          />
        ) : (
          <div className="h-[calc(100vh-160px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Chat isSovereignMode={isSovereignMode} patientInfo={patientInfo} />
          </div>
        )}

        <footer id="app-footer" className="mt-8 pt-4 pb-6 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">🩺 ADIPOZ → Professional Agent</span> &copy; 2026 <strong className="text-slate-800 dark:text-slate-200">Ewelina Lesiak</strong>. Wszelkie prawa zastrzeżone.
          </div>
          <div className="flex items-center gap-3">
            <a 
              id="download-docs-pdf-link"
              href="/dokumentacja_technologiczna_adipoz.pdf" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium inline-flex items-center gap-1 hover:underline"
            >
              📄 Dokumentacja Technologiczna (PDF)
            </a>
            <span>•</span>
            <span className="text-slate-400 dark:text-slate-500">Licencja Własnościowa (Proprietary)</span>
          </div>
        </footer>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSettingsChange={(newSettings) => setSettings(newSettings)}
      />

      {/* Modal Zarządzania Celami Wagi Pacjenta */}
      <WeightGoalModal
        isOpen={isWeightGoalModalOpen}
        onClose={() => setIsWeightGoalModalOpen(false)}
        patientId={patientId}
        currentWeight={patientInfo.weight}
        heightCm={patientInfo.height}
        existingGoal={weightGoal}
        onGoalUpdated={(updatedGoal) => setWeightGoal(updatedGoal)}
      />

      {/* Modal Eksportu do HL7 FHIR Bundle (HIS / EHR) */}
      <FhirExportModal
        isOpen={isFhirModalOpen}
        onClose={() => setIsFhirModalOpen(false)}
        params={currentFhirParams}
      />

      {/* Modal Eksportu e-Recepty (Standard P1 / CeZ) */}
      <EReceptaP1ExportModal
        isOpen={isEReceptaP1ModalOpen}
        onClose={() => setIsEReceptaP1ModalOpen(false)}
        eReceptaData={currentEReceptaData}
        p1JsonString={analysis?.data?.note?.eReceptaP1?.p1Json}
      />

      {/* Dedykowany Modal Eksportu Leków do JSON P1 CeZ z Weryfikacją EAN/ATC/Uprawnień */}
      <P1MedsExportModal
        isOpen={isP1MedsExportModalOpen}
        onClose={() => setIsP1MedsExportModalOpen(false)}
        eReceptaData={currentEReceptaData}
        onSaveAndDownload={(updatedData) => {
          EReceptaService.downloadJSON(updatedData);
          NotificationService.addNotification(
            'SUCCESS',
            'Zapisano i pobrano JSON P1 CeZ',
            `Pakiet e-Recepty dla pacjenta PESEL: ${updatedData.patientPesel} został pomyślnie zwalidowany i pobrany.`
          );
        }}
      />

      {/* Modal Audytu Ryzyka e-Recepty i Wymogów NFZ */}
      {currentEReceptaData && (
        <EReceptaRiskAuditModal
          isOpen={isRiskAuditModalOpen}
          onClose={() => setIsRiskAuditModalOpen(false)}
          analysis={EReceptaRiskService.analyzeEReceptaRisk(currentEReceptaData)}
          eReceptaData={currentEReceptaData}
          onDownloadConfirmed={() => {
            EReceptaService.downloadJSON(currentEReceptaData);
            NotificationService.addNotification(
              'SUCCESS',
              'Pobrano plik e-Recepty (JSON P1)',
              `Plik eRecepta_P1_${currentEReceptaData.patientPesel}.json został pobrany po weryfikacji audytu NFZ.`
            );
          }}
        />
      )}

      {/* Modal Ankiety Przedwizytowej Pacjenta (QR / Link / Synchronizacja) */}
      <PatientIntakeModal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        patientId={patientId}
        onApplyToIntakeSymptoms={handleApplyToIntakeSymptoms}
      />
    </div>
  );
}
