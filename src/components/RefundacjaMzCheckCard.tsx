// src/components/RefundacjaMzCheckCard.tsx
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Pill, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ChevronsDown,
  ChevronsUp,
  ChevronsUpDown,
  DollarSign, 
  Layers, 
  Sparkles, 
  Info, 
  Truck, 
  ArrowRightLeft, 
  Plus, 
  Check, 
  Scale, 
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Award,
  Zap,
  Eye,
  EyeOff,
  CheckCheck,
  Download,
  FileDown,
  Printer,
  Coins,
  TrendingDown,
  Tag,
  ArrowRight,
  BarChart3,
  PieChart,
  HelpCircle,
  Network,
  Building2,
  X,
  History,
  ShieldAlert,
  Copy
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  RefundacjaMzService, 
  MzRefundAuditReport, 
  MedicationMzVerification,
  MarketAvailabilityStatus,
  CheaperSubstituteOption,
  MZ_REFUND_CATALOG,
  MzDrugItem
} from '../services/RefundacjaMzService';
import { EReceptaData, EReceptaMedication } from '../services/EReceptaService';
import { DrugInteractionGraphService } from '../services/DrugInteractionGraphService';
import { NotificationService } from '../services/NotificationService';
import { generateMzRefundComplianceReportPDF, exportRefundDifferencesReportPDF, exportRefundDifferencesCSV } from '../lib/pdfGenerator';
import { DrugInteractionGraphView } from './DrugInteractionGraphView';
import { GifPharmacyAvailabilityModal } from './GifPharmacyAvailabilityModal';
import { RefundHistoryModal, RefundChangeLogItem } from './RefundHistoryModal';

interface RefundacjaMzCheckCardProps {
  eReceptaData?: EReceptaData;
  medicalNoteText?: string;
  patientDiagnosis?: string;
  patientIcd10?: string;
  patientAge?: number;
  patientGender?: 'K' | 'M';
  chronicMedications?: string | string[];
  patientHistory?: any[];
  onAppendToMedicalNote?: (text: string) => void;
  onUpdateMedicationRefund?: (medIndex: number, newRefundLevel: '100%' | 'R' | '50%' | '30%' | 'bezpłatne' | 'S', privilege?: 'S' | 'IB' | 'ZK' | 'C' | 'BRAK') => void;
  onReplaceMedication?: (medIndex: number, newMedName: string, newEan: string) => void;
  className?: string;
}

export const RefundacjaMzCheckCard: React.FC<RefundacjaMzCheckCardProps> = ({
  eReceptaData,
  medicalNoteText = '',
  patientDiagnosis = '',
  patientIcd10 = '',
  patientAge = 55,
  patientGender = 'K',
  chronicMedications = '',
  patientHistory = [],
  onAppendToMedicalNote,
  onUpdateMedicationRefund,
  onReplaceMedication,
  className = ''
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'NON_COMPLIANT' | 'COMPLIANT' | 'SHORTAGES' | 'ANNUAL_PROJECTION' | 'COMPARISON_TABLE'>('ALL');
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [isMedListCollapsed, setIsMedListCollapsed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [appliedJustifications, setAppliedJustifications] = useState<Record<number, boolean>>({});
  const [isCheckingStatuses, setIsCheckingStatuses] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<string | null>(null);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [showQuickBreakdown, setShowQuickBreakdown] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [activeSubstituteFinderMed, setActiveSubstituteFinderMed] = useState<MedicationMzVerification | null>(null);
  const [substituteSearchQuery, setSubstituteSearchQuery] = useState('');
  const [substituteFilterType, setSubstituteFilterType] = useState<'ALL' | 'GENERIC_ONLY' | 'SENIOR_FREE' | 'AVAILABLE_ONLY'>('ALL');
  const [comparisonPopoverMedIndex, setComparisonPopoverMedIndex] = useState<number | null>(null);
  const [selectedSubstituteInPopover, setSelectedSubstituteInPopover] = useState<Record<number, number>>({});
  const [chartMode, setChartMode] = useState<'COMPARISON' | 'STACKED'>('COMPARISON');
  const [highlightedMedIndex, setHighlightedMedIndex] = useState<number | null>(null);
  const [showChartCard, setShowChartCard] = useState<boolean>(true);
  const [showGraphView, setShowGraphView] = useState<boolean>(true);
  const [isGifModalOpen, setIsGifModalOpen] = useState<boolean>(false);
  const [gifModalMedication, setGifModalMedication] = useState<{ name: string; ean: string; substitutes: any[] } | null>(null);
  const [refundHistoryLogs, setRefundHistoryLogs] = useState<RefundChangeLogItem[]>([]);
  const [isRefundHistoryModalOpen, setIsRefundHistoryModalOpen] = useState<boolean>(false);
  const [autoAppliedSavings, setAutoAppliedSavings] = useState<number>(0);
  const [manualSubstituteSearch, setManualSubstituteSearch] = useState<Record<number, string>>({});
  const [highlightChangesEnabled, setHighlightChangesEnabled] = useState<boolean>(false);

  const recordRefundChange = (medName: string, ean: string, oldLvl: string, newLvl: string, reason?: string) => {
    const newLog: RefundChangeLogItem = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      medicationName: medName,
      ean: ean || '-',
      oldLevel: oldLvl,
      newLevel: newLvl,
      doctorName: 'Lek. Ewelina Lesiak (PWZ: 9876543)',
      reason: reason || 'Ręczna korekta poziomu odpłatności przez lekarza'
    };
    setRefundHistoryLogs(prev => [newLog, ...prev]);
  };

  const handleExportDifferencesPDF = () => {
    try {
      exportRefundDifferencesReportPDF(auditReport, eReceptaData?.patientPesel || '12345678901');
      NotificationService.addNotification('SUCCESS', 'Wygenerowano PDF', 'Zestawienie różnic refundacyjnych i oszczędności pacjenta zostało pobrane jako PDF.');
    } catch (err) {
      NotificationService.addNotification('ERROR', 'Błąd eksportu PDF', 'Nie udało się wygenerować raportu PDF.');
    }
  };

  const handleExportDifferencesCSV = () => {
    try {
      exportRefundDifferencesCSV(auditReport, eReceptaData?.patientPesel || '12345678901');
      NotificationService.addNotification('SUCCESS', 'Wygenerowano CSV', 'Zestawienie różnic refundacyjnych zostało wyeksportowane do pliku CSV.');
    } catch (err) {
      NotificationService.addNotification('ERROR', 'Błąd eksportu CSV', 'Nie udało się wyeksportować danych do pliku CSV.');
    }
  };

  const handleAutoApplyBestRefund = () => {
    setIsCheckingStatuses(true);
    setTimeout(() => {
      setIsCheckingStatuses(false);
      let updatedCount = 0;
      let totalSavings = 0;
      auditReport.medications.forEach(med => {
        const oldPay = med.patientPayPln || 0;
        const bestLevel = (patientAge >= 65 && (med.refundScope === 'FREE_SENIOR_65' || med.mzDrugData?.officialRefundLevel === 'S' || med.mzDrugData?.patientPayPlnSenior === 0))
          ? 'S'
          : (med.recommendedRefundLevel || med.mzDrugData?.officialRefundLevel || med.currentRefundLevel);

        if (bestLevel && bestLevel !== med.currentRefundLevel) {
          let newPay = oldPay;
          if (bestLevel === 'S' || bestLevel === 'bezpłatne') {
            newPay = 0;
          } else if (bestLevel === 'R') {
            newPay = oldPay * 0.5;
          } else if (bestLevel === '30%') {
            newPay = (med.retailPricePln || 0) * 0.3;
          }
          const diff = Math.max(0, oldPay - newPay);
          totalSavings += diff;

          const privilege = patientAge >= 65 && (bestLevel === 'S' || bestLevel === 'bezpłatne') ? 'S' : 'BRAK';
          if (onUpdateMedicationRefund) {
            onUpdateMedicationRefund(med.medicationIndex, bestLevel as any, privilege as any);
          }
          recordRefundChange(
            med.medicationName,
            med.eanGtin,
            med.currentRefundLevel,
            bestLevel,
            `Automatyczna optymalizacja MZ: oszczędność ${diff.toFixed(2)} zł (nowa odpłatność: ${bestLevel})`
          );
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        setAutoAppliedSavings(Number(totalSavings.toFixed(2)));
        NotificationService.addNotification(
          'SUCCESS',
          'Zastosowano najlepszą refundację MZ',
          `Przeskanowano pozycje i automatycznie przypisano najkorzystniejszy poziom odpłatności dla ${updatedCount} leków. Szacowana oszczędność pacjenta: ${totalSavings.toFixed(2)} zł.`
        );
      } else {
        NotificationService.addNotification(
          'INFO',
          'Brak zmian do wykonania',
          'Wszystkie leki mają już optymalne poziomy odpłatności zgodne z przesłankami w notatce medycznej.'
        );
      }
    }, 650);
  };

  const medications = eReceptaData?.medications || [];

  const handleOpenGifPharmacyModal = (med?: MedicationMzVerification) => {
    if (med) {
      setGifModalMedication({
        name: med.medicationName,
        ean: med.eanGtin,
        substitutes: med.suggestedSubstitutes || []
      });
    } else if (filteredMedications.length > 0) {
      const target = filteredMedications.find(m => doesNotQualifyForFinancialRefund(m) || (m.suggestedSubstitutes && m.suggestedSubstitutes.length > 0)) || filteredMedications[0];
      setGifModalMedication({
        name: target.medicationName,
        ean: target.eanGtin,
        substitutes: target.suggestedSubstitutes || []
      });
    } else {
      setGifModalMedication({
        name: 'Lek z e-Recepty',
        ean: '5909990000000',
        substitutes: []
      });
    }
    setIsGifModalOpen(true);
  };

  // Audyt z aktualnym obwieszczeniem MZ
  const auditReport: MzRefundAuditReport = useMemo(() => {
    return RefundacjaMzService.verifyMedicationsRefundList(
      medications,
      patientIcd10 || eReceptaData?.icd10Diagnosis,
      patientDiagnosis,
      patientAge,
      patientGender,
      medicalNoteText
    );
  }, [medications, patientIcd10, eReceptaData?.icd10Diagnosis, patientDiagnosis, patientAge, patientGender, medicalNoteText]);

  // Obliczenie leków w 100% zgodnych z listą refundacyjną MZ
  const fullyCompliantMedications = useMemo(() => {
    return auditReport.medications.filter(
      m => m.isRefundLevelCorrect && !m.hasNfzClawbackRisk && m.missingClinicalRequirements.length === 0 && (m.isIndicationMatched || m.currentRefundLevel === '100%')
    );
  }, [auditReport.medications]);

  // Obliczenie leków, które NIE spełniają aktualnych kryteriów refundacji MZ
  const nonCompliantMedications = useMemo(() => {
    return auditReport.medications.filter(
      m => !m.isRefundLevelCorrect || m.hasNfzClawbackRisk || m.missingClinicalRequirements.length > 0 || (!m.isIndicationMatched && m.currentRefundLevel !== '100%')
    );
  }, [auditReport.medications]);

  const fullyCompliantCount = fullyCompliantMedications.length;
  const nonCompliantCount = nonCompliantMedications.length;
  const totalMedsCount = auditReport.totalMedicationsCount;
  const compliantPercentage = totalMedsCount > 0 ? Math.round((fullyCompliantCount / totalMedsCount) * 100) : 100;
  const isAllFullyCompliant = totalMedsCount > 0 && fullyCompliantCount === totalMedsCount;

  // Potencjalna oszczędność pacjenta (suma różnicy między obecnym przypisaniem a optymalnym)
  const totalPotentialSavings = useMemo(() => {
    if (!auditReport || !auditReport.medications) return 0;
    let sum = 0;
    auditReport.medications.forEach(med => {
      const currentPay = med.patientPayPln || 0;
      let bestPay = currentPay;

      const bestLevel = (patientAge >= 65 && (med.refundScope === 'FREE_SENIOR_65' || med.mzDrugData?.officialRefundLevel === 'S' || med.mzDrugData?.patientPayPlnSenior === 0))
        ? 'S'
        : (med.recommendedRefundLevel || med.mzDrugData?.officialRefundLevel || med.currentRefundLevel);

      if (bestLevel === 'S' || bestLevel === 'bezpłatne') {
        bestPay = 0;
      } else if (bestLevel === 'R') {
        bestPay = med.mzDrugData?.patientPayPlnStandard ?? (currentPay * 0.5);
      } else if (bestLevel === '30%') {
        bestPay = (med.retailPricePln || 0) * 0.3;
      } else {
        bestPay = currentPay;
      }

      if (med.suggestedSubstitutes && med.suggestedSubstitutes.length > 0) {
        const minSubPay = Math.min(...med.suggestedSubstitutes.map(s => s.patientPayPln ?? currentPay));
        if (minSubPay < bestPay) {
          bestPay = minSubPay;
        }
      }

      const diff = Math.max(0, currentPay - bestPay);
      sum += diff;
    });
    return Number(sum.toFixed(2));
  }, [auditReport, patientAge]);

  // Projekcja kosztów rocznych (12 miesięcy)
  const annualProjectionData = useMemo(() => {
    if (!auditReport || !auditReport.medications) return { items: [], totalCurrentAnnual: 0, totalOptimizedAnnual: 0, totalAnnualSavings: 0 };
    let totalCurrent = 0;
    let totalOptimized = 0;

    const items = auditReport.medications.map(med => {
      const currentPay = med.patientPayPln || 0;
      let bestPay = currentPay;

      const bestLevel = (patientAge >= 65 && (med.refundScope === 'FREE_SENIOR_65' || med.mzDrugData?.officialRefundLevel === 'S' || med.mzDrugData?.patientPayPlnSenior === 0))
        ? 'S'
        : (med.recommendedRefundLevel || med.mzDrugData?.officialRefundLevel || med.currentRefundLevel);

      if (bestLevel === 'S' || bestLevel === 'bezpłatne') {
        bestPay = 0;
      } else if (bestLevel === 'R') {
        bestPay = med.mzDrugData?.patientPayPlnStandard ?? (currentPay * 0.5);
      } else if (bestLevel === '30%') {
        bestPay = (med.retailPricePln || 0) * 0.3;
      } else {
        bestPay = currentPay;
      }

      if (med.suggestedSubstitutes && med.suggestedSubstitutes.length > 0) {
        const minSubPay = Math.min(...med.suggestedSubstitutes.map(s => s.patientPayPln ?? currentPay));
        if (minSubPay < bestPay) {
          bestPay = minSubPay;
        }
      }

      const annualPackages = 12;
      const currentAnnual = currentPay * annualPackages;
      const optimizedAnnual = bestPay * annualPackages;
      const annualSaving = Math.max(0, currentAnnual - optimizedAnnual);

      totalCurrent += currentAnnual;
      totalOptimized += optimizedAnnual;

      return {
        name: med.medicationName,
        dosage: med.mzDrugData?.dosage || 'Standard',
        ean: med.eanGtin,
        currentPayPerPackage: currentPay,
        bestPayPerPackage: bestPay,
        currentAnnual,
        optimizedAnnual,
        annualSaving,
        currentLevel: med.currentRefundLevel,
        bestLevel,
        isFullyCompliant: med.isRefundLevelCorrect
      };
    });

    const totalAnnualSavings = Math.max(0, totalCurrent - totalOptimized);
    return {
      items,
      totalCurrentAnnual: Number(totalCurrent.toFixed(2)),
      totalOptimizedAnnual: Number(totalOptimized.toFixed(2)),
      totalAnnualSavings: Number(totalAnnualSavings.toFixed(2))
    };
  }, [auditReport.medications, patientAge]);

  // Dane do wykresu słupkowego: porównanie całkowitej ceny (100%) ze szacunkową dopłatą pacjenta po refundacji
  const priceComparisonChartData = useMemo(() => {
    return (auditReport?.medications || []).map((med, idx) => {
      const total = Number((med.retailPricePln || 0).toFixed(2));
      const patientPay = Number((med.patientPayPln || 0).toFixed(2));
      const nfzCoverage = Number(Math.max(0, total - patientPay).toFixed(2));
      const savingsPercent = total > 0 ? Math.round((nfzCoverage / total) * 100) : 0;
      
      // Skrócona nazwa leku dla przejrzystości na osi X
      const cleanName = med.medicationName.replace(/\s+(tabl\.|kaps\.|roztw\.|iniek\.|aerozol|maść|krople).*/i, '').split(' ')[0] || `Lek #${idx + 1}`;
      const shortLabel = cleanName.length > 10 ? `${cleanName.slice(0, 9)}…` : cleanName;

      return {
        index: idx,
        medicationIndex: med.medicationIndex,
        fullName: med.medicationName,
        shortName: shortLabel,
        totalPrice: total,
        patientPay: patientPay,
        nfzCoverage: nfzCoverage,
        savingsPercent,
        refundLevel: med.currentRefundLevel,
        recommendedRefundLevel: med.recommendedRefundLevel,
        hasRisk: med.hasNfzClawbackRisk,
        is100Percent: med.currentRefundLevel === '100%',
        isFree: med.currentRefundLevel === 'S' || med.currentRefundLevel === 'bezpłatne' || patientPay === 0,
        availability: med.availability,
        innName: med.mzDrugData?.innName || '',
      };
    });
  }, [auditReport?.medications]);

  // Finansowe sumy zagregowane dla wykresu słupkowego
  const priceComparisonTotals = useMemo(() => {
    const totalRetail = priceComparisonChartData.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalPatient = priceComparisonChartData.reduce((sum, item) => sum + item.patientPay, 0);
    const totalNfz = priceComparisonChartData.reduce((sum, item) => sum + item.nfzCoverage, 0);
    const totalSavingsPercent = totalRetail > 0 ? Math.round((totalNfz / totalRetail) * 100) : 0;

    return {
      totalRetail: totalRetail.toFixed(2),
      totalPatient: totalPatient.toFixed(2),
      totalNfz: totalNfz.toFixed(2),
      totalSavingsPercent,
    };
  }, [priceComparisonChartData]);

  // Interakcje lekowe specyficznie dla leków zmodyfikowanych / zamienników
  const modifiedSubstitutesInteractions = useMemo(() => {
    const modifiedNames = new Set(refundHistoryLogs.map(log => log.medicationName.toLowerCase()));
    if (modifiedNames.size === 0) return [];

    const chronicList = DrugInteractionGraphService.parseChronicMedications(chronicMedications);
    const fullGraph = DrugInteractionGraphService.generateInteractionGraph(
      medications,
      chronicList,
      patientAge
    );

    return fullGraph.links.filter(link => {
      const srcName = link.sourceName.toLowerCase();
      const tgtName = link.targetName.toLowerCase();
      return Array.from(modifiedNames).some(modName => 
        srcName.includes(modName) || modName.includes(srcName) || 
        tgtName.includes(modName) || modName.includes(srcName)
      );
    });
  }, [refundHistoryLogs, medications, chronicMedications, patientAge]);

  const handleFocusMedicationFromChart = (medIndex: number) => {
    setHighlightedMedIndex(medIndex);
    setExpandedIndices(prev => new Set(prev).add(medIndex));
    const el = document.getElementById(`med-audit-card-${medIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDownloadComplianceReport = () => {
    if (totalMedsCount === 0) {
      NotificationService.addNotification(
        'WARNING',
        'Raport Zgodności MZ',
        'Brak leków na e-Recepcie do wygenerowania raportu.'
      );
      return;
    }

    setIsDownloadingReport(true);
    try {
      const result = generateMzRefundComplianceReportPDF({
        auditReport,
        patientName: eReceptaData?.patientName || 'Pacjent POZ',
        patientPesel: eReceptaData?.patientPesel || '-',
        patientId: eReceptaData?.patientPesel ? `PAC-${eReceptaData.patientPesel.slice(0, 6)}` : 'PAC-001',
        patientDiagnosis: patientDiagnosis || eReceptaData?.icd10Diagnosis || 'Nadciśnienie tętnicze',
        patientIcd10: patientIcd10 || eReceptaData?.icd10Diagnosis || 'I10',
        patientAge: patientAge || 55,
        patientGender: patientGender || eReceptaData?.patientGender || 'K',
        doctorName: eReceptaData?.doctorName || 'Lek. Ewelina Nowak',
        doctorPwz: eReceptaData?.doctorPzw || '5849201',
        facilityName: eReceptaData?.facilityName || 'Przychodnia POZ / Gabinet Lekarski EDM'
      });

      NotificationService.addNotification(
        'SUCCESS',
        'Raport Zgodności MZ (PDF)',
        `Pomyślnie wygenerowano i pobrano oficjalny raport: ${result.filename} (${result.fullyCompliantCount}/${result.totalMeds} leków w 100% zgodnych z MZ).`
      );
    } catch (err) {
      console.error('Błąd generowania raportu PDF:', err);
      NotificationService.addNotification(
        'ERROR',
        'Błąd generowania raportu',
        'Nie udało się wygenerować raportu PDF zgodności MZ.'
      );
    } finally {
      setTimeout(() => setIsDownloadingReport(false), 600);
    }
  };

  const handleCheckAllStatuses = () => {
    setIsCheckingStatuses(true);
    setTimeout(() => {
      setIsCheckingStatuses(false);
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1400);

      const timeStr = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastCheckTimestamp(timeStr);
      if (isAllFullyCompliant) {
        NotificationService.addNotification(
          'SUCCESS',
          'Weryfikacja Statusów MZ',
          `Sprawdzono wszystkie statusy: Wszystkie pozycje e-Recepty (${fullyCompliantCount}/${totalMedsCount}) są w 100% zgodne z Obwieszczeniem MZ!`
        );
      } else {
        NotificationService.addNotification(
          'WARNING',
          'Weryfikacja Statusów MZ',
          `Sprawdzono ${totalMedsCount} leków: ${fullyCompliantCount} w 100% zgodnych z MZ, ${nonCompliantCount} NIE spełnia kryteriów refundacji MZ.`
        );
      }
    }, 450);
  };

  const handlePrintMedicationList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      NotificationService.addNotification('ERROR', 'Błąd drukowania', 'Zablokowano okno wyskakujące. Zezwól na wyskakujące okienka dla tej strony.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <title>Zestawienie Leków i Weryfikacja Refundacji MZ</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 20px; font-size: 14px; line-height: 1.5; }
          h1 { font-size: 20px; border-bottom: 2px solid #047857; padding-bottom: 8px; color: #065f46; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #4b5563; margin-bottom: 20px; }
          .meta-box { background: #f3f4f6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }
          th { background-color: #047857; color: #ffffff; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-green { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
          .badge-yellow { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
          .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #ef4444; }
          .footer { margin-top: 30px; font-size: 11px; color: #6b7280; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Zestawienie Leków e-Recepty i Weryfikacja Obwieszczenia MZ</h1>
        <div class="subtitle">Wygenerowano w systemie e-Gabinet • Data: ${new Date().toLocaleString('pl-PL')}</div>
        
        <div class="meta-box">
          <strong>Pacjent:</strong> Wiek: ${patientAge} lat • ICD-10: ${patientIcd10 || eReceptaData?.icd10Diagnosis || 'Brak'} • Ogólny wskaźnik zgodności MZ: <strong>${auditReport.overallSafetyScore}%</strong><br/>
          <strong>Łączna liczba pozycji:</strong> ${totalMedsCount} • Potencjalna oszczędność pacjenta: <strong>${totalPotentialSavings.toFixed(2)} zł</strong>
        </div>

        <table>
          <thead>
            <tr>
              <th>Lp.</th>
              <th>Nazwa leku i dawka</th>
              <th>EAN / GTIN</th>
              <th>Odpłatność (obecna / MZ)</th>
              <th>Cena / Dopłata</th>
              <th>Status MZ i Uwagi</th>
            </tr>
          </thead>
          <tbody>
            ${auditReport.medications.map((m, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  <strong>${m.medicationName}</strong><br/>
                  <span style="font-size: 11px; color: #4b5563;">${m.mzDrugData?.dosage || ''}</span>
                </td>
                <td style="font-family: monospace; font-size: 11px;">${m.eanGtin}</td>
                <td>
                  Obecna: <strong>${m.currentRefundLevel}</strong><br/>
                  MZ: <span style="color: #047857; font-weight: bold;">${m.recommendedRefundLevel || m.mzDrugData?.officialRefundLevel || '100%'}</span>
                </td>
                <td style="white-space: nowrap;">
                  Cena detaliczna: ${(m.retailPricePln || 0).toFixed(2)} zł<br/>
                  Dopłata pacjenta: <strong>${(m.patientPayPln || 0).toFixed(2)} zł</strong>
                </td>
                <td>
                  ${m.isFoundInMzList ? '<span class="badge badge-green">W wykazie MZ</span>' : '<span class="badge badge-yellow">Poza wykazem MZ</span>'}
                  ${m.hasNfzClawbackRisk ? '<br/><span class="badge badge-red">Ryzyko clawback NFZ</span>' : ''}
                  ${m.missingClinicalRequirements.length > 0 ? `<br/><span style="font-size: 11px; color: #b45309;">⚠️ ${m.missingClinicalRequirements.join(', ')}</span>` : ''}
                  ${m.riskDescription ? `<br/><span style="font-size: 11px; color: #1e3a8a;">ℹ️ ${m.riskDescription}</span>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Dokument wygenerowany elektronicznie w systemie asystenta gabinetowego • Zgodny z Obwieszczeniem Ministra Zdrowia
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopyReportToClipboard = () => {
    let reportText = `RAPORT WERYFIKACJI REFUNDACJI MZ I ZGODNOŚCI NFZ\n`;
    reportText += `Data / Czas: ${new Date().toLocaleString('pl-PL')}\n`;
    reportText += `Wskaźnik zgodności: ${auditReport.overallSafetyScore}%\n`;
    reportText += `Łączna oszczędność / redukcja dopłat: ${totalPotentialSavings.toFixed(2)} zł\n`;
    reportText += `--------------------------------------------------\n\n`;

    auditReport.medications.forEach((med, idx) => {
      reportText += `${idx + 1}. ${med.medicationName} (EAN: ${med.eanGtin})\n`;
      reportText += `   - Obecna odpłatność: ${med.currentRefundLevel} | Cena detaliczna: ${(med.retailPricePln || 0).toFixed(2)} zł | Dopłata pacjenta: ${(med.patientPayPln || 0).toFixed(2)} zł\n`;
      reportText += `   - Rekomendacja MZ: ${med.recommendedRefundLevel || med.mzDrugData?.officialRefundLevel || '100%'}\n`;
      reportText += `   - Status MZ: ${med.isFoundInMzList ? 'W wykazie MZ' : 'Poza wykazem MZ'}\n`;
      if (med.hasNfzClawbackRisk) reportText += `   - ⚠️ Ryzyko clawback NFZ\n`;
      if (med.missingClinicalRequirements.length > 0) {
        reportText += `   - Wymagania kliniczne: ${med.missingClinicalRequirements.join(', ')}\n`;
      }
      if (med.riskDescription) {
        reportText += `   - Uwagi MZ: ${med.riskDescription}\n`;
      }
      reportText += `\n`;
    });

    reportText += `--------------------------------------------------\n`;
    reportText += `Wygenerowano w systemie gabinetowym (Zgodność z obwieszczeniem MZ)`;

    navigator.clipboard.writeText(reportText).then(() => {
      NotificationService.addNotification(
        'SUCCESS',
        'Skopiowano do schowka',
        'Zestawienie refundacji i statusy zgodności MZ zostały skopiowane do schowka i są gotowe do wklejenia w dokumentacji medycznej.'
      );
    }).catch(err => {
      NotificationService.addNotification(
        'ERROR',
        'Błąd schowka',
        'Nie udało się skopiować danych do schowka.'
      );
    });
  };

  const handleBatchSyncRefunds = () => {
    setIsBatchSyncing(true);
    setTimeout(() => {
      setIsBatchSyncing(false);
      let syncedCount = 0;
      let totalSyncSavings = 0;

      auditReport.medications.forEach(med => {
        const oldPay = med.patientPayPln || 0;
        const correctLevel = (patientAge >= 65 && (med.refundScope === 'FREE_SENIOR_65' || med.mzDrugData?.officialRefundLevel === 'S' || med.mzDrugData?.patientPayPlnSenior === 0))
          ? 'S'
          : (med.recommendedRefundLevel || med.mzDrugData?.officialRefundLevel || med.currentRefundLevel);

        if (correctLevel && correctLevel !== med.currentRefundLevel) {
          let newPay = oldPay;
          if (correctLevel === 'S' || correctLevel === 'bezpłatne') {
            newPay = 0;
          } else if (correctLevel === 'R') {
            newPay = med.mzDrugData?.patientPayPlnStandard ?? (oldPay * 0.5);
          } else if (correctLevel === '30%') {
            newPay = (med.retailPricePln || 0) * 0.3;
          }
          const diff = Math.max(0, oldPay - newPay);
          totalSyncSavings += diff;

          const privilege = patientAge >= 65 && (correctLevel === 'S' || correctLevel === 'bezpłatne') ? 'S' : 'BRAK';
          if (onUpdateMedicationRefund) {
            onUpdateMedicationRefund(med.medicationIndex, correctLevel as any, privilege as any);
          }
          syncedCount++;
        }
      });

      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1400);

      NotificationService.addNotification(
        'SUCCESS',
        'Batch Sync Refunds (MZ)',
        `Pomyślnie zsynchronizowano statusy refundacji dla ${syncedCount} pozycji e-Recepty w oparciu o reguły uprawnień pacjenta (wiek ${patientAge} lat, ICD-10). Szacowana oszczędność: ${totalSyncSavings.toFixed(2)} zł.`
      );
    }, 500);
  };

  const filteredMedications = useMemo(() => {
    if (filterMode === 'NON_COMPLIANT') {
      return nonCompliantMedications;
    }
    if (filterMode === 'COMPLIANT') {
      return fullyCompliantMedications;
    }
    if (filterMode === 'SHORTAGES') {
      return auditReport.medications.filter(m => m.availability === 'CRITICAL_SHORTAGE' || m.availability === 'LIMITED_SUPPLY');
    }
    return auditReport.medications;
  }, [auditReport.medications, filterMode, nonCompliantMedications, fullyCompliantMedications]);

  const toggleExpand = (idx: number) => {
    setExpandedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const expandAllMedications = () => {
    setExpandedIndices(new Set(filteredMedications.map(m => m.medicationIndex)));
    setIsMedListCollapsed(false);
  };

  const collapseAllMedications = () => {
    setExpandedIndices(new Set());
  };

  const areAllExpanded = filteredMedications.length > 0 && filteredMedications.every(m => expandedIndices.has(m.medicationIndex));
  const expandedCount = filteredMedications.filter(m => expandedIndices.has(m.medicationIndex)).length;

  const handleApplyJustification = (med: MedicationMzVerification) => {
    if (onAppendToMedicalNote && med.clinicalJustificationSnippet) {
      onAppendToMedicalNote(med.clinicalJustificationSnippet);
      setAppliedJustifications(prev => ({ ...prev, [med.medicationIndex]: true }));
    }
  };

  // Kryterium: pozycja aktualnie nie kwalifikuje się do refundacji z powodów finansowych/wskazań lub generuje wysokie koszty
  const doesNotQualifyForFinancialRefund = (med: MedicationMzVerification) => {
    return (
      med.currentRefundLevel === '100%' ||
      med.refundScope === 'NON_REIMBURSED' ||
      !med.isIndicationMatched ||
      med.hasNfzClawbackRisk ||
      !med.isRefundLevelCorrect ||
      med.patientPayPln >= 12 ||
      (med.suggestedSubstitutes && med.suggestedSubstitutes.some(s => s.patientPayPln < med.patientPayPln))
    );
  };

  const handleOpenSubstituteFinder = (med: MedicationMzVerification) => {
    setComparisonPopoverMedIndex(null);
    setActiveSubstituteFinderMed(med);
    setSubstituteSearchQuery('');
    setSubstituteFilterType('ALL');
  };

  const handleCloseSubstituteFinder = () => {
    setActiveSubstituteFinderMed(null);
    setSubstituteSearchQuery('');
  };

  const toggleComparisonPopover = (medIndex: number) => {
    setComparisonPopoverMedIndex(prev => (prev === medIndex ? null : medIndex));
  };

  const handleCloseComparisonPopover = () => {
    setComparisonPopoverMedIndex(null);
  };

  const handleSelectSubstituteFromPopover = (medIndex: number, sub: CheaperSubstituteOption) => {
    handleSelectSubstitute(medIndex, sub);
    setComparisonPopoverMedIndex(null);
  };

  // Wyszukanie tańszych zamienników dla wybranego leku
  const currentSubstituteOptions = useMemo(() => {
    if (!activeSubstituteFinderMed) return [];
    const allOptions = RefundacjaMzService.findCheaperSubstitutes(
      activeSubstituteFinderMed,
      patientAge,
      patientIcd10 || eReceptaData?.icd10Diagnosis
    );

    return allOptions.filter(opt => {
      // Filtr tekstu
      if (substituteSearchQuery.trim()) {
        const q = substituteSearchQuery.toLowerCase().trim();
        const matchName = opt.name.toLowerCase().includes(q);
        const matchInn = opt.innName.toLowerCase().includes(q);
        const matchMan = opt.manufacturer.toLowerCase().includes(q);
        const matchEan = opt.ean.includes(q);
        if (!matchName && !matchInn && !matchMan && !matchEan) return false;
      }

      // Filtr kategorii
      if (substituteFilterType === 'GENERIC_ONLY') {
        return opt.category === 'GENERIC_EQUIVALENT';
      }
      if (substituteFilterType === 'SENIOR_FREE') {
        return opt.isFullyFreeForSenior || opt.patientPayPln === 0;
      }
      if (substituteFilterType === 'AVAILABLE_ONLY') {
        return opt.availability === 'AVAILABLE';
      }

      return true;
    });
  }, [activeSubstituteFinderMed, patientAge, patientIcd10, eReceptaData?.icd10Diagnosis, substituteSearchQuery, substituteFilterType]);

  const handleSelectSubstitute = (medIndex: number, sub: CheaperSubstituteOption) => {
    if (onReplaceMedication) {
      onReplaceMedication(medIndex, sub.name, sub.ean);
    }
    const targetMed = auditReport.medications.find(m => m.medicationIndex === medIndex);
    if (onUpdateMedicationRefund && sub.officialRefundLevel) {
      const refundLvl = (sub.officialRefundLevel === 'S' || patientAge >= 65) 
        ? 'S' 
        : (sub.officialRefundLevel as any);
      onUpdateMedicationRefund(medIndex, refundLvl, patientAge >= 65 ? 'S' : 'BRAK');
    }
    recordRefundChange(
      targetMed?.medicationName || 'Lek',
      targetMed?.eanGtin || '',
      targetMed?.currentRefundLevel || '-',
      sub.officialRefundLevel || 'R',
      `Zamiana na tańszy zamiennik MZ: ${sub.name} (EAN: ${sub.ean})`
    );

    NotificationService.addNotification(
      'SUCCESS',
      'Zastosowano Tańszy Zamiennik MZ',
      `Zamieniono pozycję na ${sub.name}. Szacowana oszczędność pacjenta: ${sub.savingsPln.toFixed(2)} zł / opakowanie.`
    );

    handleCloseSubstituteFinder();
  };

  const handleInsertSubstituteJustification = (sub: CheaperSubstituteOption, originalMedName: string) => {
    if (onAppendToMedicalNote) {
      const text = `[Zastosowanie tańszego zamiennika MZ]: Zamieniono ${originalMedName} na refundowany odpowiednik ${sub.name} (EAN: ${sub.ean}, odpłatność: ${sub.officialRefundLevel}, dopłata pacjenta: ${sub.patientPayPln.toFixed(2)} zł). Uzasadnienie: ${sub.reason}.`;
      onAppendToMedicalNote(text);
      NotificationService.addNotification(
        'SUCCESS',
        'Wstawiono do Notatki',
        'Adnotacja o ordynacji tańszego zamiennika została dopisana do dokumentacji medycznej.'
      );
    }
  };

  const getAvailabilityBadge = (status: MarketAvailabilityStatus, note?: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 size={12} />
            Dostępny w hurtowniach
          </span>
        );
      case 'LIMITED_SUPPLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800" title={note}>
            <Truck size={12} />
            Ograniczona podaż
          </span>
        );
      case 'CRITICAL_SHORTAGE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-950/90 text-rose-300 border border-rose-800 font-bold animate-pulse" title={note}>
            <AlertTriangle size={12} />
            Brak rynkowy (Lista Antywywozowa)
          </span>
        );
    }
  };

  return (
    <div id="section-mz-refund-check" className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl font-sans relative overflow-hidden ${className}`}>
      {/* Wizualny efekt skanowania bazy MZ i weryfikacji */}
      {isCheckingStatuses && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-2xl bg-teal-950/25 backdrop-blur-[1px] flex flex-col items-center justify-center transition-all duration-300">
          <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse shadow-[0_0_25px_rgba(20,184,166,0.9)]" style={{ top: '40%' }} />
          <div className="bg-slate-900/95 border border-teal-500/80 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-teal-200 text-xs font-bold animate-bounce">
            <RefreshCw size={18} className="animate-spin text-teal-400" />
            <span>Skanowanie Obwieszczenia MZ i weryfikacja przesłanek klinicznych...</span>
          </div>
        </div>
      )}

      {/* Nagłówek modułu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shrink-0 mt-0.5">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Weryfikacja z Obwieszczeniem MZ
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  Lista Leków Refundowanych 2025/2026
                </span>
              </h3>
              {totalPotentialSavings > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm" title="Potencjalna oszczędność pacjenta: suma różnic między obecnym przypisaniem refundacji a optymalnym, sugerowanym przez system">
                  <span>💡 Potencjalna oszczędność pacjenta:</span>
                  <span className="text-white font-black">{totalPotentialSavings.toFixed(2)} zł</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatyczna weryfikacja wskazań refundacyjnych NFZ, poziomów odpłatności oraz dostępności rynkowej GIF przed wygenerowaniem pliku P1
            </p>
          </div>
        </div>

        {/* Wskaźnik Zgodności MZ & Akcje */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-auto-apply-best-refund"
              onClick={handleAutoApplyBestRefund}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md border border-teal-500 active:scale-95"
              title="Przeskanuj wszystkie pozycje i automatycznie przypisz najkorzystniejszy poziom odpłatności, dla którego spełnione są przesłanki wskazane w notatce medycznej"
            >
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>Automatycznie zastosuj najlepszą refundację</span>
            </button>

            <button
              type="button"
              id="btn-batch-sync-refunds"
              onClick={handleBatchSyncRefunds}
              disabled={isBatchSyncing || totalMedsCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md border border-indigo-500 active:scale-95 disabled:opacity-50"
              title="Zsynchronizuj statusy refundacji wszystkich leków w 1 kliknięciu w oparciu o aktualne reguły uprawnień pacjenta"
            >
              <CheckCheck size={14} className={isBatchSyncing ? 'animate-spin text-white' : 'text-indigo-200'} />
              <span>{isBatchSyncing ? 'Synchronizacja...' : 'Batch Sync Refunds'}</span>
            </button>

            {autoAppliedSavings > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-xs font-bold font-mono animate-bounce flex items-center gap-1 shadow-sm" title="Szacowana oszczędność pacjenta dzięki automatycznej optymalizacji refundacji MZ">
                <span>💰 Oszczędność:</span>
                <span className="text-white">{autoAppliedSavings.toFixed(2)} zł</span>
              </span>
            )}
          </div>

          <button
            type="button"
            id="btn-download-mz-compliance-report-header"
            onClick={handleDownloadComplianceReport}
            disabled={isDownloadingReport || totalMedsCount === 0}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Pobierz oficjalny raport PDF weryfikacji refundacji MZ dla tej e-Recepty"
          >
            <FileDown size={14} className={isDownloadingReport ? 'animate-bounce text-emerald-400' : 'text-emerald-400'} />
            <span>{isDownloadingReport ? 'Generowanie PDF...' : 'Raport PDF'}</span>
          </button>

          <button
            type="button"
            id="btn-print-mz-medication-list"
            onClick={handlePrintMedicationList}
            disabled={totalMedsCount === 0}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Wydrukuj zestawienie wszystkich leków z e-Recepty z uwzględnieniem statusów refundacji i uwag MZ"
          >
            <Printer size={14} className="text-teal-400" />
            <span>Drukuj zestawienie leków</span>
          </button>

          <button
            type="button"
            id="btn-copy-mz-report-clipboard"
            onClick={handleCopyReportToClipboard}
            disabled={totalMedsCount === 0}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Skopiuj całe zestawienie statusów refundacji i uwag MZ do schowka"
          >
            <Copy size={14} className="text-indigo-400" />
            <span>Kopiuj do schowka</span>
          </button>

          <button
            type="button"
            id="btn-toggle-highlight-changes"
            onClick={() => setHighlightChangesEnabled(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border active:scale-95 ${
              highlightChangesEnabled 
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-amber-950/50 ring-2 ring-amber-400/50' 
                : 'bg-slate-800/90 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
            title="Wyróżnij wizualnie leki, których status refundacji lub dane zostały zmodyfikowane w bieżącej sesji"
          >
            <Sparkles size={14} className={highlightChangesEnabled ? 'text-amber-200 animate-pulse' : 'text-slate-400'} />
            <span>Highlight Changes {highlightChangesEnabled ? '(Wł.)' : '(Wył.)'}</span>
          </button>

          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Zgodność z MZ / NFZ</p>
            <p className={`text-lg font-mono font-extrabold ${
              auditReport.overallSafetyScore >= 90 ? 'text-emerald-400' :
              auditReport.overallSafetyScore >= 70 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {auditReport.overallSafetyScore}%
            </p>
          </div>
          <div className={`w-3 h-10 rounded-full ${
            auditReport.overallSafetyScore >= 90 ? 'bg-emerald-500' :
            auditReport.overallSafetyScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
          }`} />
        </div>
      </div>

      {/* 'Check All Statuses' Summary Indicator Banner */}
      <div 
        id="mz-check-all-statuses-indicator"
        className={`my-4 p-4 rounded-xl border transition-all duration-700 ease-out relative overflow-hidden ${
          justRefreshed
            ? 'ring-2 ring-teal-400/70 shadow-2xl shadow-teal-500/25 scale-[1.012] bg-gradient-to-r from-teal-950/80 via-emerald-950/70 to-slate-900 border-teal-400'
            : isCheckingStatuses
              ? 'opacity-90 ring-1 ring-teal-500/50 bg-slate-950/90 border-teal-500/60 shadow-inner'
              : isAllFullyCompliant
                ? 'bg-emerald-950/40 border-emerald-500/40 shadow-sm hover:border-emerald-500/60'
                : totalMedsCount === 0
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-teal-500/40 shadow-inner hover:border-teal-400/60'
        }`}
      >
        {/* Subtle animated verification shimmer overlay when refreshing or just refreshed */}
        {(isCheckingStatuses || justRefreshed) && (
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-400/15 to-transparent pointer-events-none transition-opacity duration-700 animate-pulse"
            style={{ animationDuration: '1.2s' }}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform duration-500 ${
              justRefreshed 
                ? 'scale-110 bg-teal-500 text-slate-950 shadow-teal-500/40' 
                : isAllFullyCompliant 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
            }`}>
              {justRefreshed ? (
                <Check className="stroke-[3] text-slate-950 animate-bounce" size={20} />
              ) : isAllFullyCompliant ? (
                <CheckCircle2 size={22} />
              ) : (
                <ShieldCheck size={22} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Award size={14} className="text-teal-400" />
                  Wskaźnik Zgodności Statusów (Check All Statuses)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border transition-all duration-500 ${
                  justRefreshed
                    ? 'bg-teal-400 text-slate-950 border-teal-300 font-extrabold shadow-sm'
                    : isAllFullyCompliant 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                      : 'bg-teal-950 text-teal-300 border-teal-700'
                }`}>
                  {fullyCompliantCount} / {totalMedsCount} ZGODNYCH ({compliantPercentage}%)
                </span>
                {justRefreshed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-fadeIn">
                    <Check size={11} className="stroke-[2.5]" />
                    Statusy zaktualizowane z MZ
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {isAllFullyCompliant ? (
                  <span className="text-emerald-300 flex items-center gap-1">
                    <Check size={14} className="text-emerald-400 inline" />
                    Wszystkie leki w bieżącej e-Recepty są w 100% zgodne z najnowszym wykazem refundacyjnym MZ!
                  </span>
                ) : (
                  <span>
                    <strong className="text-emerald-400 font-bold">{fullyCompliantCount} z {totalMedsCount}</strong> leków w bieżącej e-Recepty jest w pełni zgodnych z Obwieszczeniem MZ (pozostałe: <strong className="text-amber-300">{totalMedsCount - fullyCompliantCount}</strong> wymagają uzasadnienia lub korekty).
                  </span>
                )}
              </p>
              {lastCheckTimestamp && (
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"></span>
                  Ostatnia pełna weryfikacja z Obwieszczeniem MZ: <span className="text-slate-200 font-semibold">{lastCheckTimestamp}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center flex-wrap">
            <button
              type="button"
              onClick={() => setShowQuickBreakdown(prev => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 underline underline-offset-4 decoration-teal-500/40 hover:decoration-teal-300 transition-all cursor-pointer py-1.5 px-2 rounded-lg hover:bg-teal-950/40"
              title="Pokaż szybki rozkład statusów zgodności leków"
              aria-label="Pokaż szczegółowy rozkład statusów leków"
            >
              {showQuickBreakdown ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showQuickBreakdown ? 'Ukryj szczegóły' : 'Pokaż szczegóły (View Details)'}</span>
            </button>

            <button
              type="button"
              id="btn-refund-history"
              onClick={() => setIsRefundHistoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/25 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Wyświetla chronologiczny log zmian poziomu odpłatności dokonanych przez lekarza"
            >
              <History size={14} />
              <span>Historia zmian refundacji</span>
              {refundHistoryLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                  {refundHistoryLogs.length}
                </span>
              )}
            </button>

            {/* Eksport różnic refundacyjnych (PDF / CSV) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="btn-export-differences-pdf"
                onClick={handleExportDifferencesPDF}
                className="flex items-center gap-1 px-2.5 py-2 rounded-l-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all cursor-pointer border border-teal-600"
                title="Eksportuj zestawienie różnic refundacyjnych i oszczędności pacjenta do pliku PDF"
              >
                <Download size={13} />
                <span>Różnice (PDF)</span>
              </button>
              <button
                type="button"
                id="btn-export-differences-csv"
                onClick={handleExportDifferencesCSV}
                className="flex items-center gap-1 px-2.5 py-2 rounded-r-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
                title="Eksportuj zestawienie różnic do pliku CSV"
              >
                <span>CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCheckAllStatuses}
              disabled={isCheckingStatuses}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md cursor-pointer border active:scale-95 ${
                justRefreshed
                  ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-teal-500/30'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 border-teal-400/30'
              }`}
              title="Sprawdź i zweryfikuj wszystkie statusy leków z aktualną listą refundacyjną MZ"
              aria-label="Sprawdź wszystkie statusy e-Recepty"
            >
              <RefreshCw size={14} className={isCheckingStatuses ? 'animate-spin text-white' : justRefreshed ? 'text-slate-950' : 'text-teal-100'} />
              <span>{isCheckingStatuses ? 'Sprawdzanie...' : justRefreshed ? 'Zweryfikowano ✓' : 'Sprawdź wszystkie statusy'}</span>
            </button>
          </div>
        </div>

        {/* Pasek postępu zgodności */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Poziom pełnej zgodności z Obwieszczeniem MZ:</span>
            <span className="font-mono font-bold text-slate-200">{compliantPercentage}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                compliantPercentage === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                compliantPercentage >= 50 ? 'bg-gradient-to-r from-amber-500 to-emerald-500' : 'bg-rose-500'
              }`}
              style={{ width: `${compliantPercentage}%` }}
            />
          </div>
        </div>

        {/* Szybki rozkład pozycji e-Recepty (Quick Breakdown Details) */}
        {showQuickBreakdown && (
          <div id="mz-quick-breakdown-details" className="mt-4 pt-3 border-t border-slate-800/90 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <CheckCheck size={14} className="text-teal-400" />
                Szybki rozkład statusów zgodności z Obwieszczeniem MZ (Wykaz 2025/2026):
              </span>
              <span className="text-[11px] text-slate-400">
                Łącznie pozycji: <strong className="text-white font-mono">{totalMedsCount}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Kolumna 1: Leki w 100% zgodne */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    W 100% Zgodne z MZ ({fullyCompliantCount})
                  </span>
                  <span className="text-[10px] text-slate-500">Bez ryzyka NFZ</span>
                </div>

                {fullyCompliantMedications.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-2">Brak pozycji spełniających wszystkie kryteria MZ.</p>
                ) : (
                  <div className="space-y-1.5">
                    {fullyCompliantMedications.map(med => (
                      <div key={med.medicationIndex} className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-800/30 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-200 text-[11px]">{med.medicationName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Odpłatność: <span className="text-emerald-400 font-semibold">{med.currentRefundLevel}</span> • ICD-10: {patientIcd10 || 'I10'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            {med.patientPayPln.toFixed(2)} zł
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kolumna 2: Leki z uwagami / do weryfikacji */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/50 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={13} />
                    Niespełniające kryteriów MZ ({nonCompliantCount})
                  </span>
                  {nonCompliantCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('NON_COMPLIANT')}
                      className="text-[10px] text-rose-300 hover:text-white font-semibold underline cursor-pointer"
                      title="Pokaż tylko te pozycje na liście poniżej"
                    >
                      Filtruj te pozycje
                    </button>
                  )}
                </div>

                {nonCompliantCount === 0 ? (
                  <div className="p-3 text-center text-[11px] text-emerald-400 flex flex-col items-center justify-center gap-1 py-4">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <span>Świetnie! Brak leków z uwagami lub ryzykiem NFZ.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {nonCompliantMedications.map(med => (
                      <div key={med.medicationIndex} className="p-2 rounded-lg bg-rose-950/20 border border-rose-800/30 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-rose-200 text-[11px]">{med.medicationName}</p>
                          <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800">
                            {med.hasNfzClawbackRisk ? 'Ryzyko NFZ' : 'Wymaga kryteriów'}
                          </span>
                        </div>
                        {med.missingClinicalRequirements.length > 0 && (
                          <p className="text-[10px] text-slate-400 leading-tight">
                            Brak w wywiadzie: <span className="text-rose-300">{med.missingClinicalRequirements[0]}</span>
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 text-[10px]">
                          <span className="text-slate-500">Zalecana odpłatność: <strong className="text-sky-300">{med.recommendedRefundLevel}</strong></span>
                          {onAppendToMedicalNote && med.clinicalJustificationSnippet && (
                            <button
                              type="button"
                              onClick={() => handleApplyJustification(med)}
                              disabled={appliedJustifications[med.medicationIndex]}
                              className="text-[10px] text-teal-400 hover:text-teal-300 font-bold underline cursor-pointer"
                            >
                              {appliedJustifications[med.medicationIndex] ? 'Wstawiono' : '+ Wstaw uzasadnienie'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* WIZUALNA LISTA OSTRZEŻEN O INTERAKCJACH DLA ZMODYFIKOWANYCH ZAMIENNIKÓW    */}
      {/* ========================================================================= */}
      <div className="my-4 p-4 rounded-xl bg-slate-950/90 border border-teal-500/30 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Weryfikacja interakcji lekowych dla zmodyfikowanych zamienników</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-mono">
                  {modifiedSubstitutesInteractions.length} wykrytych
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Weryfikacja leków zmienionych na refundowane zamienniki w relacji z lekami stałymi przyjmowanymi przez pacjenta
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
            Historia zmian: {refundHistoryLogs.length} wpisów
          </span>
        </div>

        {refundHistoryLogs.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Brak zarejestrowanych modyfikacji lub zamienników w bieżącej sesji e-Recepty.</p>
            <p className="text-[11px] text-slate-500">Po zaakceptowaniu zamiennika refundowanego lub korekcie odpłatności, system automatycznie sprawdzi interakcje z lekami stałymi pacjenta.</p>
          </div>
        ) : modifiedSubstitutesInteractions.length === 0 ? (
          <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white font-semibold">Pełne bezpieczeństwo farmakoterapii:</strong> Wszystkie zmodyfikowane zamienniki zostały zweryfikowane z lekami stałymi pacjenta. Nie wykryto istotnych interakcji klinicznych.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {modifiedSubstitutesInteractions.map((link, idx) => {
              const isCritical = link.severity === 'CRITICAL';
              const isMajor = link.severity === 'MAJOR';
              return (
                <div 
                  key={link.id || idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCritical 
                      ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-500' 
                      : isMajor
                        ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-500'
                        : 'bg-slate-900 border-slate-800 hover:border-teal-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        isCritical ? 'bg-rose-900 text-rose-200 border border-rose-700' :
                        isMajor ? 'bg-amber-900 text-amber-200 border border-amber-700' :
                        'bg-teal-900 text-teal-200 border border-teal-700'
                      }`}>
                        {link.severityLabel || link.severity}
                      </span>
                      <strong className="text-white text-xs sm:text-sm">{link.title}</strong>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Para: <strong className="text-teal-300">{link.sourceName}</strong> ⇄ <strong className="text-teal-300">{link.targetName}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 text-xs">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                        <Info size={12} className="text-teal-400" />
                        Mechanizm i Konsekwencja:
                      </p>
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        {link.mechanism} {link.clinicalConsequence}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-400" />
                        Zalecenie kliniczne:
                      </p>
                      <p className="text-slate-200 font-medium text-[11px] bg-slate-950/60 p-2 rounded border border-slate-800">
                        {link.recommendation}
                      </p>
                    </div>
                  </div>

                  {onAppendToMedicalNote && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const text = `[Ostrzeżenie o interakcji zamiennika] ${link.title} (${link.sourceName} + ${link.targetName}): ${link.recommendation}`;
                          onAppendToMedicalNote(text);
                          NotificationService.addNotification('SUCCESS', 'Dodano do notatki', 'Ostrzeżenie o interakcji zostało dopisane do notatki klinicznej.');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer border border-slate-700"
                      >
                        <span>Dopisz ostrzeżenie do notatki klinicznej</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pasek podsumowania statystyk */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-0.5">Leki refundowane</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-emerald-400">{auditReport.reimbursedCount}</span>
            <span className="text-xs text-slate-500">/ {auditReport.totalMedicationsCount} poz.</span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-0.5">Wskazania ograniczone</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-sky-400">{auditReport.restrictedCriteriaCount}</span>
            <span className="text-xs text-slate-500">wymaga kryteriów</span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-0.5">Ryzyko zwrotu NFZ</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${auditReport.nfzRiskCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {auditReport.nfzRiskCount}
            </span>
            <span className="text-xs text-slate-500">{auditReport.nfzRiskCount > 0 ? 'niezgodności' : 'brak ryzyka'}</span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-0.5">Braki rynkowe (GIF)</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold ${auditReport.marketShortageCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {auditReport.marketShortageCount}
            </span>
            <span className="text-xs text-slate-500">{auditReport.marketShortageCount > 0 ? 'utrudnienia' : 'pełna dostępność'}</span>
          </div>
        </div>
      </div>

      {/* Globalne ostrzeżenia i rekomendacje NFZ */}
      {auditReport.globalRecommendations.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 mb-1.5 text-slate-300 font-bold">
            <Info size={14} className="text-emerald-400" />
            <span>Kluczowe uwagi formalne obwieszczenia MZ:</span>
          </div>
          <ul className="space-y-1 pl-5 list-disc text-slate-400">
            {auditReport.globalRecommendations.map((rec, idx) => (
              <li key={idx} className={rec.includes('ryzykiem') ? 'text-rose-300 font-medium' : rec.includes('Senior') ? 'text-emerald-300' : ''}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pasek filtrów z dedykowanym filtrem leków niespełniających kryteriów MZ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pt-2">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'ALL' ? 'bg-slate-700 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Wszystkie</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 font-mono">{auditReport.medications.length}</span>
          </button>

          <button
            type="button"
            id="btn-filter-mz-non-compliant"
            onClick={() => setFilterMode('NON_COMPLIANT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'NON_COMPLIANT' 
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 font-bold ring-2 ring-rose-400/50' 
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/30'
            }`}
            title="Błyskawicznie wyświetl tylko pozycje niespełniające kryteriów refundacji MZ"
          >
            <AlertTriangle size={13} className={filterMode === 'NON_COMPLIANT' ? 'text-white' : 'text-rose-400'} />
            <span>Niespełniające kryteriów MZ</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              filterMode === 'NON_COMPLIANT' ? 'bg-rose-900 text-rose-100' : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {nonCompliantCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('COMPLIANT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'COMPLIANT' 
                ? 'bg-emerald-600 text-white shadow-sm font-bold' 
                : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/20'
            }`}
          >
            <CheckCircle2 size={13} className={filterMode === 'COMPLIANT' ? 'text-white' : 'text-emerald-400'} />
            <span>W 100% Zgodne</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterMode === 'COMPLIANT' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {fullyCompliantCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('SHORTAGES')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'SHORTAGES' ? 'bg-amber-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck size={13} className={filterMode === 'SHORTAGES' ? 'text-white' : 'text-amber-400'} />
            <span>Braki rynkowe GIF</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 font-mono">{auditReport.marketShortageCount}</span>
          </button>

          <button
            type="button"
            id="btn-filter-annual-projection"
            onClick={() => setFilterMode('ANNUAL_PROJECTION')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'ANNUAL_PROJECTION' 
                ? 'bg-teal-600 text-white shadow-md shadow-teal-950/60 font-bold ring-2 ring-teal-400/50' 
                : 'text-teal-400 hover:text-teal-300 hover:bg-teal-950/30'
            }`}
            title="Widok projekcji kosztów rocznych i szacowanych oszczędności przy stosowaniu zrefundowanych zamienników"
          >
            <Coins size={13} className={filterMode === 'ANNUAL_PROJECTION' ? 'text-white' : 'text-teal-400'} />
            <span>Projekcja roczna 📅</span>
          </button>

          <button
            type="button"
            id="btn-filter-comparison-matrix"
            onClick={() => setFilterMode('COMPARISON_TABLE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'COMPARISON_TABLE' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60 font-bold ring-2 ring-indigo-400/50' 
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30'
            }`}
            title="Porównaj dopłatę pacjenta we wszystkich wariantach odpłatności (100%, Ryczałt, Zniżka, Senior)"
          >
            <Scale size={13} className={filterMode === 'COMPARISON_TABLE' ? 'text-white' : 'text-indigo-400'} />
            <span>Matryca wariantów ⚖️</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {filterMode !== 'ALL' && (
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className="text-xs text-teal-400 hover:text-teal-300 underline cursor-pointer py-1 px-2 font-medium"
            >
              Wyczyść filtr (Pokaż wszystkie)
            </button>
          )}
          <span className="text-[11px] text-slate-500 hidden md:inline-block">
            Rozpoznanie pacjenta: <strong className="text-slate-300">{patientIcd10 || 'I10'} - {patientDiagnosis || 'Nadciśnienie tętnicze'}</strong>
          </span>
        </div>
      </div>

      {/* Aktywny alert informacyjny o filtrze niespełniających kryteriów MZ */}
      {filterMode === 'NON_COMPLIANT' && (
        <div className="mb-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/70 text-xs flex items-center justify-between gap-3 text-rose-200 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-900/60 border border-rose-700 flex items-center justify-center shrink-0 text-rose-300">
              <AlertTriangle size={14} />
            </div>
            <span>
              Wyświetlasz <strong>{nonCompliantCount} z {totalMedsCount} leków</strong> niespełniających kryteriów refundacji MZ (ryzyko zwrotu NFZ, brakujące kryteria kliniczne w dokumentacji lub nieprawidłowa odpłatność).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className="text-[11px] font-bold text-rose-300 hover:text-white underline shrink-0 cursor-pointer bg-rose-900/40 px-2.5 py-1 rounded-lg border border-rose-800 hover:bg-rose-900/70 transition-colors"
          >
            Pokaż wszystkie ({totalMedsCount})
          </button>
        </div>
      )}

      {/* Projekcja kosztów rocznych */}
      {filterMode === 'ANNUAL_PROJECTION' && (
        <div className="space-y-4 animate-fadeIn my-4">
          <div className="bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 p-5 rounded-2xl border border-teal-500/40 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-600/30 border border-teal-500 flex items-center justify-center text-teal-300 shadow-inner">
                  <Coins size={26} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Projekcja kosztów rocznych i optymalizacji refundacji</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Szacunkowe wydatki pacjenta w skali roku (zakładając 12 cykli comiesięcznych dla leków przewlekłych) przy obecnym przypisaniu vs. przy optymalnych zamiennikach MZ.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 shrink-0">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Łączna oszczędność roczna:</div>
                  <div className="text-xl font-mono font-black text-emerald-400">+{annualProjectionData.totalAnnualSavings.toFixed(2)} zł</div>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Budżet roczny po optymalizacji:</div>
                  <div className="text-sm font-mono font-bold text-white">{annualProjectionData.totalOptimizedAnnual.toFixed(2)} zł</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Szczegółowa projekcja roczna pozycji z e-Recepty</span>
              <span className="text-[11px] text-slate-400">Cykl obliczeniowy: 12 miesięcy / 365 dni</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Pozycja e-Recepty / Dawka</th>
                    <th className="p-3 text-center">EAN</th>
                    <th className="p-3 text-center">Odpłatność</th>
                    <th className="p-3 text-right">Obecny koszt roczny (12 mies.)</th>
                    <th className="p-3 text-right">Zoptymalizowany koszt roczny</th>
                    <th className="p-3 text-right text-emerald-400">Szacowana oszczędność roczna</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {annualProjectionData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.dosage}</div>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-slate-400">{item.ean}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300">
                          {item.currentLevel} → <strong className="text-teal-400">{item.bestLevel}</strong>
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">{item.currentAnnual.toFixed(2)} zł</td>
                      <td className="p-3 text-right font-mono text-emerald-300 font-bold">{item.optimizedAnnual.toFixed(2)} zł</td>
                      <td className="p-3 text-right font-mono font-extrabold text-emerald-400">
                        {item.annualSaving > 0 ? `+${item.annualSaving.toFixed(2)} zł` : '0.00 zł'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 font-mono font-bold text-xs border-t border-slate-800">
                  <tr>
                    <td colSpan={3} className="p-3 text-right uppercase text-slate-400">Razem w skali roku:</td>
                    <td className="p-3 text-right text-slate-200">{annualProjectionData.totalCurrentAnnual.toFixed(2)} zł</td>
                    <td className="p-3 text-right text-emerald-300">{annualProjectionData.totalOptimizedAnnual.toFixed(2)} zł</td>
                    <td className="p-3 text-right text-emerald-400 text-sm">+{annualProjectionData.totalAnnualSavings.toFixed(2)} zł</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Matryca porównawcza wariantów odpłatności */}
      {filterMode === 'COMPARISON_TABLE' && (
        <div className="space-y-4 animate-fadeIn my-4">
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 p-5 rounded-2xl border border-indigo-500/40 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500 flex items-center justify-center text-indigo-300 shadow-inner">
                  <Scale size={26} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Matryca porównawcza wariantów odpłatności MZ</h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Porównaj dopłatę pacjenta dla każdego leku w różnych wariantach (100%, ryczałt R, zniżka 30%, senior S). Kliknij dowolną komórkę z wariantem, aby natychmiast przypisać ten poziom odpłatności do e-Recepty.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 shrink-0 text-xs text-slate-300">
                <div>Wiek pacjenta: <strong className="text-white">{patientAge} lat</strong></div>
                <div>Status Senior 65+: <strong className={patientAge >= 65 ? 'text-emerald-400' : 'text-slate-400'}>{patientAge >= 65 ? 'Kwalifikuje się (S)' : 'Nie dotyczy'}</strong></div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Tabela porównawcza dopłaty pacjenta (zł)</span>
              <span className="text-[11px] text-slate-400">Interaktywne przypisanie poziomu jednym kliknięciem</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Pozycja e-Recepty</th>
                    <th className="p-3 text-center">Cena 100%</th>
                    <th className="p-3 text-center">Wariant 100%</th>
                    <th className="p-3 text-center">Wariant Ryczałt (R)</th>
                    <th className="p-3 text-center">Wariant 30%</th>
                    <th className="p-3 text-center">Wariant Senior (S)</th>
                    <th className="p-3 text-right">Aktywny / Optymalny</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {auditReport.medications.map((med, idx) => {
                    const retail = med.retailPricePln || 0;
                    const price100 = retail;
                    const priceR = med.mzDrugData?.patientPayPlnStandard ?? Number((retail * 0.5).toFixed(2));
                    const price30 = Number((retail * 0.3).toFixed(2));
                    const priceS = (patientAge >= 65 && (med.mzDrugData?.officialRefundLevel === 'S' || med.refundScope === 'FREE_SENIOR_65' || med.mzDrugData?.patientPayPlnSenior === 0)) ? 0 : (med.mzDrugData?.patientPayPlnSenior ?? priceR);

                    const currentLevel = med.currentRefundLevel;

                    return (
                      <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{med.medicationName}</div>
                          <div className="text-[11px] text-slate-400">{med.mzDrugData?.dosage || ''} • EAN: {med.eanGtin}</div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-200">{retail.toFixed(2)} zł</td>
                        
                        {/* 100% cell */}
                        <td 
                          onClick={() => {
                            if (onUpdateMedicationRefund) onUpdateMedicationRefund(med.medicationIndex, '100%', 'BRAK');
                            NotificationService.addNotification('SUCCESS', 'Zmieniono odpłatność', `Ustawiono 100% dla ${med.medicationName}`);
                          }}
                          className={`p-3 text-center font-mono cursor-pointer transition-all hover:bg-slate-800 ${currentLevel === '100%' ? 'bg-indigo-950/60 font-bold text-indigo-300 border-x border-indigo-500/40' : 'text-slate-300'}`}
                          title="Kliknij, aby przypisać odpłatność 100%"
                        >
                          {price100.toFixed(2)} zł {currentLevel === '100%' && '✓'}
                        </td>

                        {/* Ryczałt (R) cell */}
                        <td 
                          onClick={() => {
                            if (onUpdateMedicationRefund) onUpdateMedicationRefund(med.medicationIndex, 'R', 'BRAK');
                            NotificationService.addNotification('SUCCESS', 'Zmieniono odpłatność', `Ustawiono Ryczałt (R) dla ${med.medicationName}`);
                          }}
                          className={`p-3 text-center font-mono cursor-pointer transition-all hover:bg-slate-800 ${currentLevel === 'R' ? 'bg-indigo-950/60 font-bold text-indigo-300 border-x border-indigo-500/40' : 'text-slate-300'}`}
                          title="Kliknij, aby przypisać ryczałt R"
                        >
                          {priceR.toFixed(2)} zł {currentLevel === 'R' && '✓'}
                        </td>

                        {/* 30% cell */}
                        <td 
                          onClick={() => {
                            if (onUpdateMedicationRefund) onUpdateMedicationRefund(med.medicationIndex, '30%', 'BRAK');
                            NotificationService.addNotification('SUCCESS', 'Zmieniono odpłatność', `Ustawiono 30% dla ${med.medicationName}`);
                          }}
                          className={`p-3 text-center font-mono cursor-pointer transition-all hover:bg-slate-800 ${currentLevel === '30%' ? 'bg-indigo-950/60 font-bold text-indigo-300 border-x border-indigo-500/40' : 'text-slate-300'}`}
                          title="Kliknij, aby przypisać odpłatność 30%"
                        >
                          {price30.toFixed(2)} zł {currentLevel === '30%' && '✓'}
                        </td>

                        {/* Senior (S) cell */}
                        <td 
                          onClick={() => {
                            if (onUpdateMedicationRefund) onUpdateMedicationRefund(med.medicationIndex, 'S', 'S');
                            NotificationService.addNotification('SUCCESS', 'Zmieniono odpłatność', `Ustawiono Senior (S) dla ${med.medicationName}`);
                          }}
                          className={`p-3 text-center font-mono cursor-pointer transition-all hover:bg-slate-800 ${currentLevel === 'S' || currentLevel === 'bezpłatne' ? 'bg-emerald-950/60 font-bold text-emerald-300 border-x border-emerald-500/40' : 'text-slate-300'}`}
                          title="Kliknij, aby przypisać bezpłatne dla seniora (S)"
                        >
                          {priceS.toFixed(2)} zł {(currentLevel === 'S' || currentLevel === 'bezpłatne') && '✓'}
                        </td>

                        <td className="p-3 text-right">
                          <span className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-950 text-teal-400 border border-slate-800">
                            Obecna: {currentLevel} ({med.patientPayPln.toFixed(2)} zł)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Nagłówek i kontrolki sekcji z lekami (Rozwijanie / Zwijanie listy i pozycji) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-toggle-mz-medications-section"
            onClick={() => setIsMedListCollapsed(prev => !prev)}
            className="flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer group"
            title={isMedListCollapsed ? "Rozwiń sekcję z lekami" : "Zwiń sekcję z lekami"}
            aria-label="Przełącz widoczność sekcji leków refundacyjnych"
          >
            <div className="w-5 h-5 rounded-md bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center text-teal-400">
              {isMedListCollapsed ? (
                <ChevronDown size={14} className="transition-transform group-hover:scale-110" />
              ) : (
                <ChevronUp size={14} className="transition-transform group-hover:scale-110" />
              )}
            </div>
            <span className="text-sm font-bold text-slate-100">Wykaz leków na e-Recepcie z audytem MZ</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-teal-300 border border-slate-700">
              {filteredMedications.length} {filteredMedications.length === 1 ? 'pozycja' : filteredMedications.length < 5 ? 'pozycje' : 'pozycji'}
            </span>
          </button>
          
          {expandedCount > 0 && !isMedListCollapsed && (
            <span className="text-[10px] font-medium text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60">
              Rozwinięte szczegóły: <strong>{expandedCount}/{filteredMedications.length}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Przycisk Sprawdź dostępność w aptekach (API GIF / ZSMOPL) */}
          <button
            type="button"
            id="btn-check-pharmacy-availability-gif"
            onClick={() => handleOpenGifPharmacyModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 bg-teal-600/25 hover:bg-teal-600/35 text-teal-300 border-teal-500/50 shadow-sm shadow-teal-950/40"
            title="Sprawdź aktualną dostępność zamienników i leków w aptekach w regionie lekarza (API GIF / ZSMOPL)"
          >
            <Building2 size={13} className="text-teal-400" />
            <span>Sprawdź dostępność w aptekach</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-950 text-teal-300 rounded border border-teal-800 font-bold">
              GIF
            </span>
          </button>

          {/* Przełącznik widoku grafu interakcji e-Recepta ↔ Leki Stałe */}
          <button
            type="button"
            id="btn-toggle-mz-interaction-graph"
            onClick={() => setShowGraphView(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
              showGraphView
                ? 'bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
            title={showGraphView ? "Ukryj graf interakcji leków" : "Pokaż graf interakcji leków z e-Recepty i leków przewlekłych"}
          >
            <Network size={13} className={showGraphView ? "text-emerald-400" : "text-slate-400"} />
            <span>{showGraphView ? "Graf interakcji" : "Pokaż graf interakcji"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Wyróżnienie leków refundowanych na zielono" />
          </button>

          {/* Przełącznik widoczności wykresu słupkowego porównania cenowego */}
          {!isMedListCollapsed && priceComparisonChartData.length > 0 && (
            <button
              type="button"
              id="btn-toggle-mz-refund-chart"
              onClick={() => setShowChartCard(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
                showChartCard
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
              title={showChartCard ? "Ukryj wykres porównania cenowego" : "Pokaż wykres porównania cenowego leków"}
            >
              <BarChart3 size={13} className={showChartCard ? "text-amber-400" : "text-slate-400"} />
              <span>{showChartCard ? "Wykres cenowy" : "Pokaż wykres"}</span>
            </button>
          )}

          {/* Przycisk rozwiń/zwiń wszystkie szczegóły leków */}
          {!isMedListCollapsed && filteredMedications.length > 0 && (
            <button
              type="button"
              id="btn-expand-all-medications"
              onClick={areAllExpanded ? collapseAllMedications : expandAllMedications}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
                areAllExpanded
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 shadow-sm'
                  : 'bg-teal-950/70 hover:bg-teal-900/80 text-teal-300 hover:text-teal-200 border-teal-800/80 shadow-sm shadow-teal-950/40'
              }`}
              title={areAllExpanded ? "Zwiń szczegóły wszystkich leków" : "Rozwiń pełne szczegóły, kryteria kliniczne i zamienniki wszystkich pozycji lekowych"}
            >
              {areAllExpanded ? (
                <>
                  <ChevronsUp size={13} className="text-slate-400" />
                  <span>Zwiń wszystkie szczegóły</span>
                </>
              ) : (
                <>
                  <ChevronsDown size={13} className="text-teal-400" />
                  <span>Rozwiń wszystkie szczegóły ({filteredMedications.length})</span>
                </>
              )}
            </button>
          )}

          {/* Szybki przełącznik zwinięcia sekcji */}
          <button
            type="button"
            onClick={() => setIsMedListCollapsed(prev => !prev)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            title={isMedListCollapsed ? "Pokaż listę leków" : "Zwiń sekcję leków"}
          >
            {isMedListCollapsed ? "Pokaż listę" : "Zwiń sekcję"}
          </button>
        </div>
      </div>

      {/* Podgląd gdy sekcja leków jest zwinięta */}
      {isMedListCollapsed ? (
        <div 
          onClick={() => setIsMedListCollapsed(false)}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 cursor-pointer flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-teal-950/50 border border-teal-800/40 flex items-center justify-center text-teal-400 shrink-0">
              <Pill size={14} />
            </div>
            <span className="font-semibold text-slate-200">Sekcja leków zwinięta ({filteredMedications.length} pozycji)</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-medium">{fullyCompliantCount} w 100% zgodnych z MZ</span>
            {nonCompliantCount > 0 && (
              <span className="text-rose-400 font-medium">• {nonCompliantCount} do weryfikacji</span>
            )}
          </div>
          <span className="text-teal-400 text-xs font-bold group-hover:underline flex items-center gap-1.5 shrink-0">
            Kliknij, aby rozwinąć wykaz <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
          </span>
        </div>
      ) : (
        /* Główny kontener: Lista leków obok wykresu słupkowego */
        <div className={`grid grid-cols-1 ${showChartCard && priceComparisonChartData.length > 0 ? 'xl:grid-cols-12 gap-5' : ''} items-start`}>
          {/* Lewa kolumna: Lista leków z audytem MZ */}
          <div className={`${showChartCard && priceComparisonChartData.length > 0 ? 'xl:col-span-7' : 'w-full'} space-y-3`}>
            {filteredMedications.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-xs">
                {filterMode === 'NON_COMPLIANT' ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-emerald-400">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                    <p className="font-bold text-slate-200 text-sm">Wszystkie leki spełniają kryteria refundacji MZ!</p>
                    <p className="text-slate-400 max-w-md">
                      Brak leków z ryzykiem finansowym NFZ, błędną odpłatnością czy brakującymi kryteriami klinicznymi w dokumentacji.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilterMode('ALL')}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Pokaż całą e-Receptę
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <p className="font-medium text-slate-300">Brak leków spełniających wybrane kryteria filtra.</p>
                    <button
                      type="button"
                      onClick={() => setFilterMode('ALL')}
                      className="mt-2 text-teal-400 hover:text-teal-300 underline cursor-pointer"
                    >
                      Pokaż wszystkie pozycje
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredMedications.map((med) => {
                const isExpanded = expandedIndices.has(med.medicationIndex);
                const isJustificationApplied = appliedJustifications[med.medicationIndex];
                const isPopoverOpen = comparisonPopoverMedIndex === med.medicationIndex;
                const medSubstitutes = doesNotQualifyForFinancialRefund(med)
                  ? RefundacjaMzService.findCheaperSubstitutes(med, patientAge, patientIcd10 || eReceptaData?.icd10Diagnosis)
                  : [];
                const selectedSubIdx = selectedSubstituteInPopover[med.medicationIndex] || 0;
                const activeSub = medSubstitutes[selectedSubIdx] || medSubstitutes[0];
                const isHighlighted = highlightedMedIndex === med.medicationIndex;
                const isRefundAvailableButMarked100 = med.isFoundInMzList && med.refundScope !== 'NON_REIMBURSED' && med.currentRefundLevel === '100%';
                const isNotInMzList = !med.isFoundInMzList;
                const isModifiedInSession = refundHistoryLogs.some(log => 
                  log.medicationName.toLowerCase() === med.medicationName.toLowerCase() || 
                  (log.ean && log.ean === med.eanGtin)
                );

                return (
                  <div 
                    key={med.medicationIndex}
                    id={`med-audit-card-${med.medicationIndex}`}
                    className={`rounded-xl border transition-all relative ${
                      highlightChangesEnabled && isModifiedInSession
                        ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/40 shadow-xl shadow-amber-950/50'
                        : isHighlighted
                          ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-950/25 shadow-lg shadow-amber-950/40'
                          : isNotInMzList
                            ? 'bg-slate-900/90 border-slate-700/60 shadow-sm opacity-90'
                            : isRefundAvailableButMarked100
                              ? 'bg-amber-950/20 border-amber-500/80 ring-1 ring-amber-500/50 shadow-md shadow-amber-950/30'
                              : med.hasNfzClawbackRisk 
                                ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60' 
                                : med.availability === 'CRITICAL_SHORTAGE'
                                  ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                  {/* Główny pasek pozycji leku */}
                  <div 
                    onClick={() => toggleExpand(med.medicationIndex)}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                        med.hasNfzClawbackRisk 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                          : med.refundScope === 'ALL_REGISTERED_INDICATIONS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : med.refundScope === 'RESTRICTED_CRITERIA'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <Pill size={16} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors">
                            {med.medicationName}
                          </span>
                          {highlightChangesEnabled && isModifiedInSession && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-sm">
                              <span>✨ Zmieniono w sesji</span>
                            </span>
                          )}
                          {med.atcCode && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              ATC: {med.atcCode}
                            </span>
                          )}
                          {med.eanGtin && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hidden sm:inline-block">
                              EAN: {med.eanGtin}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                          {/* Zakres refundacji */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            med.refundScope === 'ALL_REGISTERED_INDICATIONS' 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : med.refundScope === 'RESTRICTED_CRITERIA'
                                ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                : 'bg-slate-800 text-slate-400'
                          }`}>
                            {med.refundScopeLabel}
                          </span>

                          {/* Status dostępności */}
                          {getAvailabilityBadge(med.availability, med.availabilityAlert)}

                          {/* Ostrzeżenie o dostępnej refundacji MZ przy odpłatności 100% */}
                          {isRefundAvailableButMarked100 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/60 flex items-center gap-1 shadow-sm">
                              <span>⚠️ Dostępna refundacja MZ (oznaczony jako 100% odpłatności)</span>
                            </span>
                          )}

                          {/* Informacja o braku w wykazie MZ */}
                          {isNotInMzList && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1 shadow-sm font-mono">
                              <span>⚪ Poza wykazem</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Finanse i przycisk rozwijania */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex-wrap">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">
                          Odpłatność: <strong className="text-emerald-400 font-mono">{med.currentRefundLevel}</strong>
                        </div>
                        <div className="text-xs font-bold text-slate-200">
                          Dopłata pacjenta: <span className="font-mono text-emerald-300">{med.patientPayPln.toFixed(2)} zł</span>
                        </div>
                      </div>

                      {/* Interaktywny przycisk 'Znajdź tańszy zamiennik' */}
                      {doesNotQualifyForFinancialRefund(med) && (
                        <button
                          type="button"
                          id={`btn-find-substitute-${med.medicationIndex}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComparisonPopover(med.medicationIndex);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 shrink-0 ${
                            isPopoverOpen 
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-extrabold shadow-amber-950/50'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40'
                          }`}
                          title={`Kliknij, aby otworzyć krótkie porównanie cenowe zamiennika MZ dla ${med.medicationName}`}
                        >
                          <Coins size={14} className={isPopoverOpen ? 'text-slate-950' : 'text-amber-400'} />
                          <span>{isPopoverOpen ? 'Ukryj porównanie' : 'Znajdź tańszy zamiennik'}</span>
                        </button>
                      )}

                      {/* Przycisk Szybka zamiana (Quick Swap) na najkorzystniejszy zamiennik MZ */}
                      {med.suggestedSubstitutes && med.suggestedSubstitutes.length > 0 && onReplaceMedication && (
                        <button
                          type="button"
                          id={`btn-quick-swap-${med.medicationIndex}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const bestSub = med.suggestedSubstitutes![0];
                            if (bestSub && onReplaceMedication) {
                              onReplaceMedication(med.medicationIndex, bestSub.name, bestSub.ean);
                              if (onUpdateMedicationRefund) {
                                onUpdateMedicationRefund(med.medicationIndex, 'R', patientAge >= 65 ? 'S' : 'BRAK');
                              }
                              recordRefundChange(
                                med.medicationName,
                                med.eanGtin,
                                med.currentRefundLevel,
                                'R',
                                `Szybka zamiana na najtańszy zamiennik MZ: ${bestSub.name}`
                              );
                              NotificationService.addNotification(
                                'SUCCESS',
                                'Szybka zamiana',
                                `Zamieniono ${med.medicationName} na ${bestSub.name} (${bestSub.patientPayPln.toFixed(2)} zł)`
                              );
                            }
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-emerald-950/50"
                          title={`Błyskawicznie zamień na najkorzystniejszy wariant: ${med.suggestedSubstitutes[0].name} (${med.suggestedSubstitutes[0].patientPayPln.toFixed(2)} zł)`}
                        >
                          <Zap size={14} className="text-amber-300 animate-pulse" />
                          <span>Szybka zamiana</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(med.medicationIndex);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                        title={isExpanded ? "Zwiń szczegóły pozycji" : "Rozwiń szczegóły kryteriów obwieszczenia MZ i zamienniki"}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* DYMEK INFORMACYJNY: Krótkie porównanie cenowe i dopłata pacjenta          */}
                  {/* ========================================================================= */}
                  {isPopoverOpen && (
                    <div 
                      id={`popover-price-comparison-${med.medicationIndex}`}
                      className="mx-3.5 mb-3.5 p-4 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-2xl shadow-amber-950/40 text-slate-200 animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Nagłówek dymka */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20 gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Coins size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-white">
                                Krótkie Porównanie Cenowe MZ
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Szacunkowa dopłata pacjenta
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Kalkulacja odpłatności na podstawie Obwieszczenia MZ i bazy limitów NFZ
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCloseComparisonPopover}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700 shrink-0"
                          title="Zamknij dymek porównania"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {activeSub ? (
                        <div className="space-y-3">
                          {/* Karty Porównawcze: Obecny lek vs Rekomendowany zamiennik */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Pozycja obecna */}
                            <div className="p-3 rounded-xl bg-slate-950/90 border border-rose-900/40 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-semibold uppercase tracking-wider text-rose-400/90">
                                  Obecnie na e-Recepcie
                                </span>
                                <span className="font-mono font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded">
                                  Odpł.: {med.currentRefundLevel}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-white truncate" title={med.medicationName}>
                                {med.medicationName}
                              </div>
                              <div className="pt-1.5 flex items-baseline justify-between border-t border-slate-800/80">
                                <span className="text-[11px] text-slate-400">Dopłata pacjenta:</span>
                                <span className="font-mono text-sm font-bold text-rose-300">
                                  {med.patientPayPln.toFixed(2)} zł
                                </span>
                              </div>
                            </div>

                            {/* Rekomendowany zamiennik */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-950/90 border border-emerald-500/50 space-y-1.5 shadow-inner">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                  <Sparkles size={11} className="text-emerald-400" />
                                  Rekomendowany zamiennik
                                </span>
                                <span className="font-mono font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                                  Odpł.: {activeSub.officialRefundLevel}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-white truncate group-hover:text-amber-300" title={activeSub.name}>
                                {activeSub.name}
                              </div>
                              <div className="pt-1.5 flex items-baseline justify-between border-t border-slate-800/80">
                                <span className="text-[11px] text-slate-400">Szacunkowa dopłata:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-base font-bold text-emerald-400">
                                    {activeSub.patientPayPln.toFixed(2)} zł
                                  </span>
                                  {(activeSub.isFullyFreeForSenior || activeSub.patientPayPln === 0) && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      65+ BEZPŁATNY
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Pasek Oszczędności Pacjenta */}
                          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                <TrendingDown size={14} />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-emerald-300">
                                  Szacowana oszczędność pacjenta: -{activeSub.savingsPln.toFixed(2)} zł (-{activeSub.savingsPercent}%)
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Substancja czynna (INN): <strong className="text-slate-300">{activeSub.innName}</strong> ({activeSub.manufacturer})
                                </div>
                              </div>
                            </div>
                            {getAvailabilityBadge(activeSub.availability)}
                          </div>

                          {/* Uzasadnienie refundacyjne */}
                          <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                            💡 <strong className="text-amber-300">Dlaczego warto zamienić:</strong> {activeSub.reason}
                          </p>

                          {/* Przełącznik innych opcji zamiennika (jeśli dostępnych > 1) */}
                          {medSubstitutes.length > 1 && (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Inne dostępne zamienniki w grupie MZ ({medSubstitutes.length}):
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {medSubstitutes.map((s, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedSubstituteInPopover(prev => ({ ...prev, [med.medicationIndex]: idx }))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border ${
                                      (selectedSubstituteInPopover[med.medicationIndex] ?? 0) === idx
                                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 shadow-sm'
                                        : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                                    }`}
                                  >
                                    {s.name.split(' ')[0]} {s.name.split(' ')[1] || ''} ({s.patientPayPln.toFixed(2)} zł)
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Przyciski Akcji w Dymku */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                id={`btn-open-full-finder-from-popover-${med.medicationIndex}`}
                                onClick={() => handleOpenSubstituteFinder(med)}
                                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer flex items-center gap-1"
                              >
                                <Search size={12} />
                                <span>Pełna baza ({medSubstitutes.length})</span>
                              </button>

                              <button
                                type="button"
                                id={`btn-open-gif-from-popover-${med.medicationIndex}`}
                                onClick={() => handleOpenGifPharmacyModal(med)}
                                className="px-2 py-1 rounded bg-teal-600/25 hover:bg-teal-600/40 text-teal-300 border border-teal-500/40 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="Sprawdź dostępność tego leku i zamienników w aptekach w Twoim regionie (API GIF)"
                              >
                                <Building2 size={11} />
                                <span>Apteki GIF</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {onAppendToMedicalNote && (
                                <button
                                  type="button"
                                  onClick={() => handleInsertSubstituteJustification(activeSub, med.medicationName)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                                  title="Wstawia notatkę o ordynacji zamiennika do dokumentacji"
                                >
                                  + Notatka
                                </button>
                              )}

                              <button
                                type="button"
                                id={`btn-apply-substitute-from-popover-${med.medicationIndex}`}
                                onClick={() => handleSelectSubstituteFromPopover(med.medicationIndex, activeSub)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                              >
                                <Check size={14} />
                                <span>Zastosuj na e-Recepcie ({activeSub.patientPayPln.toFixed(2)} zł)</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Brak bezpośrednich tańszych zamienników w bieżącej grupie limitowej MZ.
                        </div>
                      )}
                    </div>
                  )}

                {/* Rozwinięty panel szczegółów i szybkich akcji */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 text-xs space-y-3">
                    {/* Baner optymalizacji kosztowej i wyszukiwania tańszego zamiennika */}
                    {doesNotQualifyForFinancialRefund(med) && (
                      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-3 rounded-xl border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                            <Coins size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-amber-200">Optymalizacja Finansowa Pacjenta (MZ / NFZ)</span>
                              {med.currentRefundLevel === '100%' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700">
                                  Odpłatność 100% (Brak refundacji)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              {med.currentRefundLevel === '100%' || !med.isIndicationMatched
                                ? `Lek nie kwalifikuje się do refundacji ze względów finansowo-wskazaniowych (dopłata pacjenta: ${med.patientPayPln.toFixed(2)} zł). Dostępne są tańsze odpowiedniki generyczne i refundowane.`
                                : `Dostępne są tańsze odpowiedniki w grupie limitowej MZ. Możliwa redukcja dopłaty pacjenta nawet do 0 zł (Program 65+).`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          id={`btn-find-substitute-expanded-${med.medicationIndex}`}
                          onClick={() => toggleComparisonPopover(med.medicationIndex)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/50 transition-all cursor-pointer shrink-0 active:scale-95"
                        >
                          <Coins size={14} className="text-slate-950" />
                          <span>{isPopoverOpen ? 'Ukryj porównanie cenowe' : 'Porównaj zamienniki cenowo'}</span>
                        </button>
                      </div>
                    )}
                    {/* Ostrzeżenie o ryzyku nienależnej refundacji NFZ */}
                    {med.riskDescription && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex gap-2.5 items-start">
                        <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-300 mb-0.5">Ryzyko Nienależnej Refundacji (Kontrola NFZ):</p>
                          <p className="text-[11px] leading-relaxed">{med.riskDescription}</p>
                        </div>
                      </div>
                    )}

                    {/* Wymagane kryteria kliniczne z obwieszczenia MZ */}
                    {med.mzDrugData?.clinicalCriteriaDescription && (
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                          <FileText size={14} className="text-sky-400" />
                          <span>Oficjalne wskazanie refundacyjne MZ:</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed mb-2">
                          {med.mzDrugData.clinicalCriteriaDescription}
                        </p>

                        {med.mzDrugData.requiredClinicalPrerequisites && (
                          <div className="mt-2 pt-2 border-t border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                              Wymagane warunki kliniczne w dokumentacji medycznej:
                            </span>
                            <div className="space-y-1">
                              {med.mzDrugData.requiredClinicalPrerequisites.map((req, rIdx) => (
                                <div key={rIdx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                  <Check size={12} className="text-emerald-400 shrink-0" />
                                  <span>{req}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Braki w dokumentacji */}
                    {med.missingClinicalRequirements.length > 0 && (
                      <div className="bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/60 text-[11px] text-amber-200">
                        <strong className="block text-amber-300 mb-1">Brakujące elementy w notatce/wywiadzie:</strong>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {med.missingClinicalRequirements.map((mis, mIdx) => (
                            <li key={mIdx}>{mis}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alert o braku rynkowym GIF */}
                    {med.availabilityAlert && (
                      <div className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/60 text-[11px] text-rose-200 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{med.availabilityAlert}</span>
                      </div>
                    )}

                    {/* Kalkulacja cenowa MZ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Cena detaliczna:</span>
                        <span className="font-mono text-slate-200 font-semibold">{med.retailPricePln.toFixed(2)} zł</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Limit finansowania:</span>
                        <span className="font-mono text-slate-200 font-semibold">{med.financingLimitPln.toFixed(2)} zł</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Rekomendowana odpłatność:</span>
                        <span className="font-mono text-emerald-400 font-bold">{med.recommendedRefundLevel}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Oszczędność (Program 65+):</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {patientAge >= 65 ? `-${med.retailPricePln.toFixed(2)} zł (0 zł)` : 'Nie dotyczy (<65 l.)'}
                        </span>
                      </div>
                    </div>

                    {/* Ręczne wyszukiwanie leku zamiennego z bazy MZ */}
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 relative">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <Search size={14} className="text-amber-400" />
                        <span>Ręczne wyszukiwanie zamiennika z bazy leków refundowanych MZ:</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Wpisz nazwę leku, substancję czynną (INN) lub kod EAN..."
                          value={manualSubstituteSearch[med.medicationIndex] || ''}
                          onChange={(e) => setManualSubstituteSearch(prev => ({ ...prev, [med.medicationIndex]: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        {(manualSubstituteSearch[med.medicationIndex] || '').trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setManualSubstituteSearch(prev => ({ ...prev, [med.medicationIndex]: '' }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Autouzupełnianie z bazy MZ */}
                      {(manualSubstituteSearch[med.medicationIndex] || '').trim().length > 0 && (
                        <div className="absolute left-3 right-3 top-full mt-1 z-30 bg-slate-900 border border-amber-500/50 rounded-xl shadow-2xl max-h-60 overflow-y-auto space-y-1 p-1.5">
                          {MZ_REFUND_CATALOG
                            .filter(drug => {
                              const q = (manualSubstituteSearch[med.medicationIndex] || '').toLowerCase().trim();
                              return drug.brandName.toLowerCase().includes(q) ||
                                     drug.innName.toLowerCase().includes(q) ||
                                     drug.eanGtin.includes(q) ||
                                     drug.atcCode.toLowerCase().includes(q);
                            })
                            .slice(0, 10)
                            .map((drug, dIdx) => (
                              <div
                                key={dIdx}
                                onClick={() => {
                                  const newLevel = drug.officialRefundLevel || 'R';
                                  const privilege = patientAge >= 65 && (newLevel === 'S' || newLevel === 'bezpłatne') ? 'S' : 'BRAK';
                                  if (onUpdateMedicationRefund) {
                                    onUpdateMedicationRefund(med.medicationIndex, newLevel as any, privilege as any);
                                  }
                                  recordRefundChange(
                                    med.medicationName,
                                    med.eanGtin,
                                    med.currentRefundLevel,
                                    newLevel,
                                    `Ręczna zamiana na lek z bazy MZ: ${drug.brandName} (${drug.dosage}, EAN: ${drug.eanGtin}, odpł: ${newLevel})`
                                  );
                                  if (onReplaceMedication) {
                                    onReplaceMedication(med.medicationIndex, drug.brandName, drug.eanGtin);
                                  }
                                  setManualSubstituteSearch(prev => ({ ...prev, [med.medicationIndex]: '' }));
                                  NotificationService.addNotification(
                                    'SUCCESS',
                                    'Wybrano zamiennik z bazy MZ',
                                    `Zastosowano "${drug.brandName}" (EAN: ${drug.eanGtin}) dla pozycji ${med.medicationName}.`
                                  );
                                }}
                                className="p-2 rounded-lg bg-slate-950/80 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{drug.brandName}</span>
                                    <span className="text-[10px] font-normal text-slate-400">({drug.dosage}, {drug.form})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    INN: <span className="text-slate-300">{drug.innName}</span> • EAN: <span className="font-mono">{drug.eanGtin}</span> • Odpł.: <strong className="text-emerald-400">{drug.officialRefundLevel}</strong>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-emerald-300 font-bold">{drug.retailPricePln.toFixed(2)} zł</div>
                                  <div className="text-[9px] text-amber-400">Wybierz zamiennik →</div>
                                </div>
                              </div>
                            ))}
                          {MZ_REFUND_CATALOG.filter(drug => {
                            const q = (manualSubstituteSearch[med.medicationIndex] || '').toLowerCase().trim();
                            return drug.brandName.toLowerCase().includes(q) ||
                                   drug.innName.toLowerCase().includes(q) ||
                                   drug.eanGtin.includes(q) ||
                                   drug.atcCode.toLowerCase().includes(q);
                          }).length === 0 && (
                            <div className="p-3 text-center text-xs text-slate-400">
                              Brak pasujących leków w bazie Obwieszczenia MZ.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Refundowane zamienniki / generyki o niższej cenie lub lepszej dostępności */}
                    {med.suggestedSubstitutes && med.suggestedSubstitutes.length > 0 && (
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <ArrowRightLeft size={13} className="text-emerald-400" />
                            Dostępne refundowane zamienniki z obwieszczenia MZ:
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {med.suggestedSubstitutes.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                              <div>
                                <span className="font-semibold text-slate-200 block">{sub.name}</span>
                                <span className="text-slate-500 text-[10px]">Producent: {sub.manufacturer} | EAN: {sub.ean}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono text-emerald-400 font-bold">{sub.patientPayPln.toFixed(2)} zł</span>
                                {onReplaceMedication && (
                                  <button
                                    type="button"
                                    onClick={() => onReplaceMedication(med.medicationIndex, sub.name, sub.ean)}
                                    className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    Wybierz zamiennik
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Przyciski szybkich akcji naprawczych */}
                    <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                      {/* Sprawdzenie dostępności leku i zamienników w aptekach przez GIF */}
                      <button
                        type="button"
                        id={`btn-check-gif-pharmacy-${med.medicationIndex}`}
                        onClick={() => handleOpenGifPharmacyModal(med)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/25 hover:bg-teal-600/40 text-teal-300 border border-teal-500/40 text-xs font-bold transition-all cursor-pointer"
                        title="Sprawdź stan magazynowy leku i zamienników w aptekach w Twoim regionie (API GIF / ZSMOPL)"
                      >
                        <Building2 size={13} />
                        <span>Dostępność w aptekach (GIF)</span>
                      </button>

                      {/* Wstawienie uzasadnienia klinicznego do notatki */}
                      {onAppendToMedicalNote && (
                        <button
                          type="button"
                          onClick={() => handleApplyJustification(med)}
                          disabled={isJustificationApplied}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isJustificationApplied
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                          }`}
                          title="Wstawia do notatki lekarskiej klauzulę spełnienia kryteriów refundacyjnych MZ"
                        >
                          {isJustificationApplied ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                          <span>{isJustificationApplied ? 'Wstawiono do notatki' : 'Wstaw uzasadnienie do notatki'}</span>
                        </button>
                      )}

                      {/* Dopasowanie odpłatności */}
                      {onUpdateMedicationRefund && !med.isRefundLevelCorrect && (
                        <button
                          type="button"
                          onClick={() => onUpdateMedicationRefund(
                            med.medicationIndex, 
                            med.recommendedRefundLevel as any,
                            patientAge >= 65 ? 'S' : 'BRAK'
                          )}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                          title="Koryguje poziom odpłatności e-Recepty na zgodny z Obwieszczeniem MZ"
                        >
                          <Sparkles size={13} />
                          <span>Ustaw odpłatność: {med.recommendedRefundLevel}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Prawa kolumna: Wizualny Wykres Słupkowy Porównania Cenowego */}
      {showChartCard && priceComparisonChartData.length > 0 && (
        <div 
          id="mz-refund-price-comparison-chart-card"
          className="xl:col-span-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all p-4 shadow-xl space-y-4 xl:sticky xl:top-4"
        >
          {/* Nagłówek Wykresu */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <BarChart3 size={16} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>Wykres Cenowy i Refundacja MZ</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-semibold">
                    Wycena
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Porównanie ceny całkowitej (100%) ze szacunkową dopłatą pacjenta
                </p>
              </div>
            </div>

            {/* Przełącznik trybu wykresu: Porównanie / Skumulowany */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setChartMode('COMPARISON')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                  chartMode === 'COMPARISON'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Słupki obok siebie: Pełna cena 100% vs Dopłata pacjenta"
              >
                Słupki
              </button>
              <button
                type="button"
                onClick={() => setChartMode('STACKED')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                  chartMode === 'STACKED'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Wykres skumulowany: Dopłata pacjenta + Pokrycie NFZ"
              >
                Skumulowany
              </button>
            </div>
          </div>

          {/* Zagregowane KPI Finansowe */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                Wartość 100%
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-slate-200 block">
                {priceComparisonTotals.totalRetail} zł
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-0.5 text-center">
              <span className="text-[9px] uppercase font-bold text-amber-400/90 block tracking-wider">
                Dopłata Pacjenta
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 block">
                {priceComparisonTotals.totalPatient} zł
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-0.5 text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-400/90 block tracking-wider">
                Refundacja NFZ
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300 block">
                -{priceComparisonTotals.totalNfz} zł
              </span>
            </div>
          </div>

          {/* Pasek wskaźnika całościowego pokrycia NFZ */}
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-teal-400 shrink-0" />
              <span className="text-slate-300">Wskaźnik dofinansowania leków:</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-emerald-400 font-mono text-xs">{priceComparisonTotals.totalSavingsPercent}%</span>
              <span className="text-slate-500 font-normal">pokryte przez NFZ</span>
            </div>
          </div>

          {/* Wizualny Wykres Słupkowy Recharts */}
          <div className="w-full h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={priceComparisonChartData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const clickedMedIndex = state.activePayload[0].payload.medicationIndex;
                    handleFocusMedicationFromChart(clickedMedIndex);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} vertical={false} />
                <XAxis 
                  dataKey="shortName" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#475569', opacity: 0.5 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={{ stroke: '#475569', opacity: 0.5 }}
                  tickFormatter={(val: number) => `${val} zł`}
                />
                <RechartsTooltip 
                  content={({ active, payload }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    if (!data) return null;

                    return (
                      <div className="p-3 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-[260px] text-slate-200 pointer-events-none">
                        <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-800">
                          <div>
                            <p className="font-bold text-white text-xs leading-snug">{data.fullName}</p>
                            <span className="text-[10px] text-slate-400">Pozycja #{data.index + 1} na e-Recepcie</span>
                          </div>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700 shrink-0">
                            {data.refundLevel}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                              Cena 100% (całkowita):
                            </span>
                            <span className="font-mono font-bold text-slate-200">{data.totalPrice.toFixed(2)} zł</span>
                          </div>

                          <div className="flex items-center justify-between text-amber-300 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                              Dopłata pacjenta:
                            </span>
                            <span className="font-mono font-bold text-amber-300">{data.patientPay.toFixed(2)} zł</span>
                          </div>

                          <div className="flex items-center justify-between text-emerald-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              Dofinansowanie NFZ:
                            </span>
                            <span className="font-mono font-bold text-emerald-300">-{data.nfzCoverage.toFixed(2)} zł</span>
                          </div>

                          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Poziom refundacji:</span>
                            <span className="font-bold text-sky-300">
                              {data.savingsPercent > 0 ? `${data.savingsPercent}% pokryte przez NFZ` : 'Odpłatność 100%'}
                            </span>
                          </div>
                        </div>

                        {data.isFree && (
                          <div className="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                            <Sparkles size={11} className="text-emerald-400 shrink-0" />
                            <span>0 zł dla pacjenta (Program 65+ / S)</span>
                          </div>
                        )}

                        {data.hasRisk && (
                          <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                            <AlertTriangle size={11} className="text-rose-400 shrink-0" />
                            <span>Niezgodność kryteriów refundacji MZ</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                
                {chartMode === 'COMPARISON' ? (
                  <>
                    <Bar 
                      dataKey="totalPrice" 
                      name="Cena 100% (całkowita)" 
                      fill="#64748b" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={32}
                    />
                    <Bar 
                      dataKey="patientPay" 
                      name="Dopłata pacjenta" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={32}
                    >
                      {priceComparisonChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-pay-${index}`} 
                          fill={
                            entry.isFree 
                              ? '#10b981' 
                              : entry.is100Percent 
                                ? '#f43f5e' 
                                : '#f59e0b'
                          }
                          opacity={highlightedMedIndex !== null && highlightedMedIndex !== entry.medicationIndex ? 0.45 : 1}
                        />
                      ))}
                    </Bar>
                  </>
                ) : (
                  <>
                    <Bar 
                      dataKey="patientPay" 
                      stackId="stackRefund" 
                      name="Dopłata pacjenta" 
                      fill="#f59e0b" 
                      radius={[0, 0, 4, 4]} 
                      maxBarSize={36}
                    >
                      {priceComparisonChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-stack-pay-${index}`} 
                          fill={
                            entry.isFree 
                              ? '#10b981' 
                              : entry.is100Percent 
                                ? '#f43f5e' 
                                : '#f59e0b'
                          }
                          opacity={highlightedMedIndex !== null && highlightedMedIndex !== entry.medicationIndex ? 0.45 : 1}
                        />
                      ))}
                    </Bar>
                    <Bar 
                      dataKey="nfzCoverage" 
                      stackId="stackRefund" 
                      name="Pokrycie przez NFZ" 
                      fill="#0ea5e9" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={36}
                    >
                      {priceComparisonChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-stack-nfz-${index}`} 
                          fill="#0ea5e9"
                          opacity={highlightedMedIndex !== null && highlightedMedIndex !== entry.medicationIndex ? 0.45 : 1}
                        />
                      ))}
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda kolorystyczna wykresu */}
          <div className="flex items-center justify-center gap-3 pt-1 text-[10px] flex-wrap border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500" />
              Cena 100%
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              Dopłata pacjenta (częściowa)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              0 zł (Senior 65+)
            </span>
            {chartMode === 'STACKED' && (
              <span className="flex items-center gap-1.5 text-sky-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                Pokrycie NFZ
              </span>
            )}
          </div>

          {/* Interaktywny wykaz pozycji w panelu wykresu */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="font-semibold uppercase tracking-wider">Struktura kosztowa pozycji:</span>
              <span>Kliknij lek, aby podświetlić</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {priceComparisonChartData.map((item) => {
                const isSelected = highlightedMedIndex === item.medicationIndex;
                const patientPercent = item.totalPrice > 0 ? Math.round((item.patientPay / item.totalPrice) * 100) : 100;
                const nfzPercent = 100 - patientPercent;

                return (
                  <div
                    key={item.medicationIndex}
                    onClick={() => handleFocusMedicationFromChart(item.medicationIndex)}
                    className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                        <span className="font-bold text-white text-[11px] truncate" title={item.fullName}>
                          {item.fullName}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 border border-slate-700 shrink-0">
                        {item.refundLevel}
                      </span>
                    </div>

                    {/* Pasek podziału kosztu */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex mb-1">
                      <div 
                        className={item.isFree ? 'bg-emerald-500' : item.is100Percent ? 'bg-rose-500' : 'bg-amber-500'} 
                        style={{ width: `${patientPercent}%` }} 
                        title={`Dopłata pacjenta: ${patientPercent}%`}
                      />
                      <div 
                        className="bg-sky-500" 
                        style={{ width: `${nfzPercent}%` }} 
                        title={`Refundacja NFZ: ${nfzPercent}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        Cena: <strong className="text-slate-300 font-mono">{item.totalPrice.toFixed(2)} zł</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <span className="text-slate-400">Pacjent:</span>
                        <strong className={item.isFree ? 'text-emerald-300' : item.is100Percent ? 'text-rose-300' : 'text-amber-300'}>
                          {item.patientPay.toFixed(2)} zł
                        </strong>
                        {item.savingsPercent > 0 && (
                          <span className="text-emerald-400 text-[9px]">(-{item.savingsPercent}%)</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )}

    {/* ========================================================================= */}
    {/* WIDOK GRAFOWY: Interakcje między lekami z e-Recepty a lekami stałymi       */}
    {/* ========================================================================= */}
    {showGraphView && (
      <div className="mt-5">
        <DrugInteractionGraphView
          eReceptaMedications={medications}
          chronicMedicationsInput={chronicMedications}
          patientAge={patientAge}
          onAppendToMedicalNote={onAppendToMedicalNote}
        />
      </div>
    )}

    {/* ========================================================================= */}
    {/* MODAL: Wyszukiwarka Tańszych i Refundowanych Zamienników MZ               */}
    {/* ========================================================================= */}
    {activeSubstituteFinderMed && (
      <div 
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        onClick={handleCloseSubstituteFinder}
      >
        <div 
          className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Nagłówek modalu */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-b border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Coins size={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Asystent Tańszych Zamienników MZ</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Wykaz MZ 2024 / 2025
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Optymalizacja wydatków pacjenta i dobór refundowanych generyków
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseSubstituteFinder}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Zamknij wyszukiwarkę"
            >
              <X size={18} />
            </button>
          </div>

          {/* Podgląd leku źródłowego (obecnego na recepcie) */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                  Lek aktualnie przepisany na e-Recepcie:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-white text-sm">{activeSubstituteFinderMed.medicationName}</strong>
                  {activeSubstituteFinderMed.atcCode && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      ATC: {activeSubstituteFinderMed.atcCode}
                    </span>
                  )}
                  {activeSubstituteFinderMed.currentRefundLevel === '100%' && (
                    <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[10px]">
                      Odpłatność 100% (Brak refundacji)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 shrink-0">
                <div>
                  <span className="text-[10px] text-slate-400 block">Koszt obecny:</span>
                  <span className="font-mono text-sm font-bold text-rose-300">
                    {activeSubstituteFinderMed.patientPayPln.toFixed(2)} zł
                  </span>
                </div>
                <div className="border-l border-slate-800 pl-3">
                  <span className="text-[10px] text-slate-400 block">Limit MZ:</span>
                  <span className="font-mono text-sm text-slate-300">
                    {activeSubstituteFinderMed.financingLimitPln > 0 ? `${activeSubstituteFinderMed.financingLimitPln.toFixed(2)} zł` : 'Brak'}
                  </span>
                </div>
              </div>
            </div>

            {(!activeSubstituteFinderMed.isIndicationMatched || activeSubstituteFinderMed.currentRefundLevel === '100%') && (
              <div className="mt-2.5 p-2 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200 text-[11px] flex items-center gap-2">
                <Info size={14} className="text-amber-400 shrink-0" />
                <span>
                  Pozycja nie kwalifikuje się do refundacji z przyczyn formalno-finansowych. Zamiana na odpowiednik z grupy limitowej MZ pozwala zmniejszyć odpłatność pacjenta.
                </span>
              </div>
            )}
          </div>

          {/* Pasek wyszukiwania i filtry */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Szukaj po nazwie leku, substancji czynnej (INN), producencie lub kodzie EAN..."
                value={substituteSearchQuery}
                onChange={(e) => setSubstituteSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
              {substituteSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSubstituteSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  Wyczyść
                </button>
              )}
            </div>

            {/* Pigułki filtrów */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Filter size={12} />
                Filtr:
              </span>

              <button
                type="button"
                onClick={() => setSubstituteFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] ${
                  substituteFilterType === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                }`}
              >
                Wszystkie zamienniki
              </button>

              <button
                type="button"
                onClick={() => setSubstituteFilterType('GENERIC_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] ${
                  substituteFilterType === 'GENERIC_ONLY'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                }`}
              >
                Tylko generyki (100% skład)
              </button>

              {patientAge >= 65 && (
                <button
                  type="button"
                  onClick={() => setSubstituteFilterType('SENIOR_FREE')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] ${
                    substituteFilterType === 'SENIOR_FREE'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-emerald-950/60 hover:bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  ✨ Bezpłatne dla Seniora (0 zł)
                </button>
              )}

              <button
                type="button"
                onClick={() => setSubstituteFilterType('AVAILABLE_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] ${
                  substituteFilterType === 'AVAILABLE_ONLY'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                }`}
              >
                Tylko dostępne w hurtowniach
              </button>
            </div>
          </div>

          {/* Lista dopasowanych zamienników */}
          <div className="p-4 overflow-y-auto space-y-3 max-h-[50vh]">
            {currentSubstituteOptions.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search size={20} />
                </div>
                <h4 className="font-bold text-sm text-slate-300">Brak zamienników spełniających kryteria</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Dla wybranej frazy lub filtru nie odnaleziono bezpośrednich propozycji. Spróbuj zmienić filtr lub wyczyścić pole wyszukiwania.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubstituteSearchQuery('');
                    setSubstituteFilterType('ALL');
                  }}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Wyczyść filtry
                </button>
              </div>
            ) : (
              currentSubstituteOptions.map((sub, sIdx) => {
                const isFree = sub.isFullyFreeForSenior || sub.patientPayPln === 0;

                return (
                  <div
                    key={sIdx}
                    className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Lewa strona: Dane leku i kwalifikacja */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {sub.name}
                        </span>
                        
                        {/* Kategoria zamiennika */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.category === 'GENERIC_EQUIVALENT'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}>
                          {sub.category === 'GENERIC_EQUIVALENT' ? 'Generyk (100% bioekwiwalent)' : 'Alternatywa terapeutyczna'}
                        </span>

                        {/* Status dostępności */}
                        {getAvailabilityBadge(sub.availability)}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Substancja: <strong className="text-slate-300">{sub.innName}</strong></span>
                        <span>Producent: <strong className="text-slate-300">{sub.manufacturer}</strong></span>
                        <span className="font-mono text-slate-500">EAN: {sub.ean}</span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                        {sub.reason}
                      </p>
                    </div>

                    {/* Prawa strona: Finanse, oszczędność i akcje */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-end justify-between gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[11px] text-slate-400">Dopłata pacjenta:</span>
                          <span className={`font-mono text-base font-bold ${isFree ? 'text-emerald-400' : 'text-emerald-300'}`}>
                            {sub.patientPayPln.toFixed(2)} zł
                          </span>
                        </div>

                        {/* Pigułka oszczędności */}
                        {sub.savingsPln > 0 && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold mt-0.5">
                            <TrendingDown size={12} />
                            <span>Oszczędność: -{sub.savingsPln.toFixed(2)} zł (-{sub.savingsPercent}%)</span>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Odpłatność MZ: <strong className="text-slate-300">{sub.officialRefundLevel}</strong>
                        </div>
                      </div>

                      {/* Przyciski wyboru */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {onAppendToMedicalNote && (
                          <button
                            type="button"
                            onClick={() => handleInsertSubstituteJustification(sub, activeSubstituteFinderMed.medicationName)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer border border-slate-700"
                            title="Wstawia informację o tańszym zamienniku do treści dokumentacji lekarskiej"
                          >
                            + Notatka
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSelectSubstitute(activeSubstituteFinderMed.medicationIndex, sub)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                          title="Zastępuje pozycję na e-Recepcie tym zamiennikiem i aktualizuje poziom odpłatności"
                        >
                          <Check size={14} />
                          <span>Wybierz na e-Recepcie</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Stopka modalu */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Scale size={14} className="text-slate-500 shrink-0" />
              <span className="text-[11px] leading-tight text-slate-500">
                Podstawa prawna: Art. 44 Ustawy o refundacji leków z dnia 12 maja 2011 r. (prawo farmaceuty i lekarza do ordynacji tańszego odpowiednika).
              </span>
            </div>

            <button
              type="button"
              onClick={handleCloseSubstituteFinder}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer shrink-0"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ========================================================================= */}
    {/* MODAL MONITORINGU DOSTĘPNOŚCI W APTEKACH I REJESTRU GIF (ZSMOPL)         */}
    {/* ========================================================================= */}
    {isGifModalOpen && (
      <GifPharmacyAvailabilityModal
        isOpen={isGifModalOpen}
        onClose={() => setIsGifModalOpen(false)}
        medicationName={gifModalMedication?.name || 'Lek z e-Recepty'}
        ean={gifModalMedication?.ean || '5909990000000'}
        substitutesList={gifModalMedication?.substitutes || []}
        onSelectSubstitute={(subName, subEan) => {
          if (onReplaceMedication && filteredMedications.length > 0) {
            const targetMed = filteredMedications.find(m => m.medicationName === gifModalMedication?.name) || filteredMedications[0];
            onReplaceMedication(targetMed.medicationIndex, subName, subEan);
          }
        }}
        onAppendToMedicalNote={onAppendToMedicalNote}
      />
    )}

    {/* ========================================================================= */}
    {/* MODAL HISTORII ZMIAN REFUNDACJI                                         */}
    {/* ========================================================================= */}
    {isRefundHistoryModalOpen && (
      <RefundHistoryModal
        isOpen={isRefundHistoryModalOpen}
        onClose={() => setIsRefundHistoryModalOpen(false)}
        historyLogs={refundHistoryLogs}
        patientPesel={eReceptaData?.patientPesel}
      />
    )}
  </div>
);
};
