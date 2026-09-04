// src/components/P1MedsExportModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  X, 
  Pill, 
  ShieldCheck, 
  Layers, 
  Info,
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Scale, 
  Sparkles, 
  Barcode, 
  FileCheck, 
  User, 
  RefreshCw,
  Edit3,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { EReceptaService, EReceptaData, EReceptaMedication } from '../services/EReceptaService';
import { 
  P1CeZValidationService, 
  P1TechnicalAuditReport, 
  ADDITIONAL_PRIVILEGES_INFO,
  ATC_ANATOMICAL_GROUPS,
  KNOWN_DRUGS_CATALOG 
} from '../services/P1CeZValidationService';
import { EReceptaRiskService } from '../services/EReceptaRiskService';
import { NotificationService } from '../services/NotificationService';
import { RefundacjaMzService, MzRefundAuditReport } from '../services/RefundacjaMzService';

interface P1MedsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eReceptaData?: EReceptaData;
  onSaveAndDownload?: (updatedData: EReceptaData) => void;
}

export const P1MedsExportModal: React.FC<P1MedsExportModalProps> = ({
  isOpen,
  onClose,
  eReceptaData,
  onSaveAndDownload
}) => {
  const [activeTab, setActiveTab] = useState<'VERIFY_EDIT' | 'JSON' | 'REPORT'>('VERIFY_EDIT');
  const [copied, setCopied] = useState(false);
  const [medications, setMedications] = useState<EReceptaMedication[]>([]);
  const [selectedPrivilegeFilter, setSelectedPrivilegeFilter] = useState<string>('ALL');

  // Synchronizacja początkowego stanu leków
  useEffect(() => {
    if (eReceptaData && eReceptaData.medications) {
      setMedications(JSON.parse(JSON.stringify(eReceptaData.medications)));
    }
  }, [eReceptaData, isOpen]);

  // Wyliczenie informacji o pacjencie z PESEL
  const peselInfo = useMemo(() => {
    if (!eReceptaData?.patientPesel) return { isValid: false, age: 55, gender: 'K' as const };
    return EReceptaRiskService.validatePesel(eReceptaData.patientPesel);
  }, [eReceptaData?.patientPesel]);

  const patientAge = peselInfo.age !== undefined ? peselInfo.age : 55;
  const patientGender = peselInfo.gender || 'K';

  // Dynamiczny audyt techniczny w czasie rzeczywistym
  const auditReport: P1TechnicalAuditReport = useMemo(() => {
    return P1CeZValidationService.auditMedicationsList(
      medications,
      eReceptaData?.patientPesel || '',
      patientGender,
      patientAge
    );
  }, [medications, eReceptaData?.patientPesel, patientGender, patientAge]);

  // Dynamiczny audyt z Obwieszczeniem MZ (Wykaz Leków Refundowanych)
  const mzAuditReport: MzRefundAuditReport = useMemo(() => {
    return RefundacjaMzService.verifyMedicationsRefundList(
      medications,
      eReceptaData?.icd10Diagnosis,
      undefined,
      patientAge,
      patientGender
    );
  }, [medications, eReceptaData?.icd10Diagnosis, patientAge, patientGender]);

  // Obiekt eReceptaData z aktualnymi, zedytowanymi danymi leków
  const currentUpdatedData: EReceptaData | undefined = useMemo(() => {
    if (!eReceptaData) return undefined;
    return {
      ...eReceptaData,
      medications
    };
  }, [eReceptaData, medications]);

  // Wygenerowany string JSON zgodny z P1 CeZ
  const generatedJsonString = useMemo(() => {
    if (!currentUpdatedData) return '';
    return EReceptaService.generateP1Json(currentUpdatedData);
  }, [currentUpdatedData]);

  if (!isOpen || !eReceptaData) return null;

  // Obsługa edycji poszczególnych pól leku
  const handleMedChange = (index: number, field: keyof EReceptaMedication, value: any) => {
    setMedications(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Automatyczne generowanie poprawnego EAN-13 dla danego leku
  const handleGenerateEanForMed = (index: number) => {
    const validEan = P1CeZValidationService.generateValidEan13(index + 1);
    handleMedChange(index, 'eanGtin', validEan);
    NotificationService.addNotification(
      'INFO',
      'Wygenerowano EAN-13',
      `Przypisano poprawny kod kreskowy GTIN-13: ${validEan}`
    );
  };

  // Automatyczna autokorekta wszystkich pozycji lekowych
  const handleAutoRepairAll = () => {
    const repaired = P1CeZValidationService.autoRepairMedications(
      medications,
      eReceptaData.patientPesel,
      patientAge,
      patientGender
    );
    setMedications(repaired);
    NotificationService.addNotification(
      'SUCCESS',
      '✨ Autokorekta P1 Zakończona',
      'Wszystkie kody EAN-13, ATC oraz uprawnienia dodatkowe zostały zweryfikowane i uzupełnione.'
    );
  };

  // Kopiowanie JSON do schowka
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(generatedJsonString);
      setCopied(true);
      NotificationService.addNotification(
        'SUCCESS',
        'Skopiowano JSON P1',
        'Struktura JSON zgodna ze specyfikacją CeZ P1 została skopiowana do schowka.'
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Błąd kopiowania:', err);
    }
  };

  // Finalny zapis i pobranie JSON
  const handleFinalSaveAndDownload = () => {
    if (!currentUpdatedData) return;

    if (auditReport.hasBlockingErrors) {
      const confirmed = window.confirm(
        `Uwaga: Wykryto ${auditReport.failedMedicationsCount} pozycji z błędami technicznymi EAN/ATC/Uprawnień. Czy na pewno chcesz wyeksportować plik mimo ryzyka odrzucenia przez węzeł P1?`
      );
      if (!confirmed) return;
    }

    if (onSaveAndDownload) {
      onSaveAndDownload(currentUpdatedData);
    } else {
      EReceptaService.downloadJSON(currentUpdatedData);
    }

    NotificationService.addNotification(
      auditReport.canExportSafely ? 'SUCCESS' : 'WARNING',
      'Eksport e-Recepty (P1 CeZ JSON)',
      `Plik eRecepta_P1_${currentUpdatedData.patientPesel}.json został pomyślnie wyeksportowany (Wynik zgodności: ${auditReport.overallScore}%).`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        
        {/* NAGŁÓWEK MODALA */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-purple-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <FileCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Eksport Leków do JSON (Specyfikacja P1 CeZ)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  CeZ PL-CDA-P1 v1.4.2
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  auditReport.canExportSafely
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                }`}>
                  {auditReport.canExportSafely ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                  <span>Zgodność Techniczna: {auditReport.overallScore}%</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  mzAuditReport.nfzRiskCount === 0
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}>
                  <ShieldCheck size={12} />
                  <span>Obwieszczenie MZ: {mzAuditReport.overallSafetyScore}%</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Weryfikacja algorytmiczna kodów EAN-13, klasyfikacji ATC oraz uprawnień pacjenta (S, IB, ZK, C) przed finalnym zapisem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* PASEK PACJENTA I UPRAWNIEŃ */}
        <div className="bg-slate-50 dark:bg-slate-800/70 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-purple-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {eReceptaData.patientName}
              </span>
              <span className="font-mono text-slate-500">
                (PESEL: {eReceptaData.patientPesel || 'brak'})
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span>Wiek z PESEL:</span>
              <strong className="text-slate-800 dark:text-slate-200">{patientAge} lat</strong>
              <span>({patientGender === 'K' ? 'Kobieta' : 'Mężczyzna'})</span>
            </div>

            {patientAge >= 65 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                ⭐ Uprawniony do darmowych leków Senior 65+ (S)
              </span>
            )}
            {patientAge < 18 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                🧒 Dzieci do 18 r.ż. (DZ)
              </span>
            )}
          </div>

          {/* Przycisk Autokorekty */}
          <button
            type="button"
            onClick={handleAutoRepairAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Automatycznie wygeneruj brakujące kody EAN-13, przypisz kody ATC i dopasuj uprawnienia na podstawie PESEL"
          >
            <Sparkles size={13} />
            <span>Autonaprawa kodów i uprawnień</span>
          </button>
        </div>

        {/* PRZEŁĄCZNIK ZAKŁADEK */}
        <div className="px-5 pt-3 pb-0 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('VERIFY_EDIT')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
                activeTab === 'VERIFY_EDIT'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border-transparent'
              }`}
            >
              <Edit3 size={14} />
              <span>Weryfikacja Techniczna i Edycja ({medications.length} poz.)</span>
              {auditReport.failedMedicationsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {auditReport.failedMedicationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('JSON')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
                activeTab === 'JSON'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border-transparent'
              }`}
            >
              <FileCode size={14} />
              <span>Podgląd JSON P1 CeZ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REPORT')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 ${
                activeTab === 'REPORT'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border-transparent'
              }`}
            >
              <Scale size={14} />
              <span>Szczegółowy Raport Zgodności ({auditReport.overallScore}%)</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 pb-2">
            PIN e-Recepty: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{eReceptaData.accessCode}</strong>
          </div>
        </div>

        {/* TREŚĆ MODALA */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* ZAKŁADKA 1: WERYFIKACJA TECHNICZNA I EDYCJA */}
          {activeTab === 'VERIFY_EDIT' && (
            <div className="space-y-4">
              
              {/* Komunikat zbiorczy statusu */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                auditReport.canExportSafely
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}>
                <div className="mt-0.5">
                  {auditReport.canExportSafely ? (
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>{auditReport.summaryText}</span>
                    <span className="font-mono text-[11px] opacity-80">
                      Poprawne: {auditReport.validMedicationsCount}/{auditReport.totalMedications}
                    </span>
                  </div>
                  {!auditReport.canExportSafely && (
                    <p className="mt-1 text-[11px] opacity-90">
                      Użyj przycisku <strong>"Autonaprawa kodów i uprawnień"</strong> lub ręcznie popraw zaznaczone na czerwono pola przed finalnym zapisem pliku.
                    </p>
                  )}
                </div>
              </div>

              {/* Lista pozycji lekowych do edycji i weryfikacji */}
              <div className="space-y-3">
                {medications.map((med, idx) => {
                  const audit = auditReport.medicationAudits[idx] || P1CeZValidationService.validateMedication(
                    med, idx, eReceptaData.patientPesel, patientGender, patientAge
                  );

                  return (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        audit.overallStatus === 'FAIL'
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 shadow-sm'
                          : audit.overallStatus === 'WARN'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Nagłówek leku */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                            audit.overallStatus === 'FAIL' ? 'bg-rose-600' :
                            audit.overallStatus === 'WARN' ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <input 
                            type="text"
                            value={med.name}
                            onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                            className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none px-1 py-0.5 rounded"
                            placeholder="Nazwa handlowa leku"
                          />
                          {med.innName && (
                            <span className="text-xs text-slate-400 italic hidden sm:inline">
                              ({med.innName})
                            </span>
                          )}
                        </div>

                        {/* Status Walidacji Pozycji */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                            audit.overallStatus === 'PASS' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : audit.overallStatus === 'WARN'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}>
                            {audit.overallStatus === 'PASS' ? '🟢 Zgodne z P1' : audit.overallStatus === 'WARN' ? '🟡 Ostrzeżenie' : '🔴 Błąd Techniczny'}
                          </span>

                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {med.quantity || '1 op.'}
                          </span>
                        </div>
                      </div>

                      {/* SIATKA PÓL TECHNICZNYCH: EAN, ATC, UPRAWNIENIE, ODPŁATNOŚĆ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        
                        {/* 1. POLE EAN / GTIN-13 */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Barcode size={13} className="text-slate-400" />
                              <span>Kod EAN/GTIN-13</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleGenerateEanForMed(idx)}
                              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                              title="Generuj prawidłowy 13-cyfrowy kod kreskowy"
                            >
                              Generuj EAN
                            </button>
                          </div>

                          <div className="relative">
                            <input 
                              type="text"
                              maxLength={14}
                              value={med.eanGtin || ''}
                              onChange={(e) => handleMedChange(idx, 'eanGtin', e.target.value)}
                              className={`w-full font-mono text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                                audit.ean.isValid
                                  ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-emerald-500'
                                  : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 focus:border-rose-600'
                              }`}
                              placeholder="590999000123"
                            />
                            <div className="absolute right-2 top-2">
                              {audit.ean.isValid ? (
                                <CheckCircle2 size={13} className="text-emerald-500" />
                              ) : (
                                <XCircle size={13} className="text-rose-500" />
                              )}
                            </div>
                          </div>

                          <div className="text-[10px]">
                            {audit.ean.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                ✓ Suma poprawna ({audit.ean.countryOrOrigin})
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-medium block truncate" title={audit.ean.errorMessage}>
                                ⚠️ {audit.ean.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. POLE KODU ATC (WHO) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Pill size={13} className="text-slate-400" />
                              <span>Kod Klasyfikacji ATC</span>
                            </label>
                            <span className="text-[10px] text-slate-400">7 znaków</span>
                          </div>

                          <div className="relative">
                            <input 
                              type="text"
                              maxLength={7}
                              value={med.atcCode || ''}
                              onChange={(e) => handleMedChange(idx, 'atcCode', e.target.value.toUpperCase())}
                              className={`w-full font-mono text-xs uppercase px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                                audit.atc.isValid
                                  ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-purple-500'
                                  : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 focus:border-rose-600'
                              }`}
                              placeholder="C09AA05"
                            />
                            <div className="absolute right-2 top-2">
                              {audit.atc.isValid ? (
                                <CheckCircle2 size={13} className="text-emerald-500" />
                              ) : (
                                <XCircle size={13} className="text-rose-500" />
                              )}
                            </div>
                          </div>

                          <div className="text-[10px]">
                            {audit.atc.isValid ? (
                              <span className="text-purple-600 dark:text-purple-400 block truncate font-medium" title={audit.atc.anatomicalGroupName}>
                                ✓ Grupa: {audit.atc.anatomicalGroupCode} ({audit.atc.anatomicalGroupName?.split('(')[0]})
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-medium block truncate" title={audit.atc.errorMessage}>
                                ⚠️ {audit.atc.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3. POLE UPRAWNIEŃ DODATKOWYCH PACJENTA (S, IB, ZK, C, DZ, BRAK) */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <ShieldCheck size={13} className="text-slate-400" />
                            <span>Uprawnienie Dodatkowe</span>
                          </label>

                          <select
                            value={med.additionalPrivilege || 'BRAK'}
                            onChange={(e) => {
                              const newPriv = e.target.value as EReceptaMedication['additionalPrivilege'];
                              handleMedChange(idx, 'additionalPrivilege', newPriv);
                              if (newPriv === 'S' || newPriv === 'IB') {
                                handleMedChange(idx, 'refundationLevel', newPriv === 'S' ? 'S' : 'bezpłatne');
                              }
                            }}
                            className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none transition-colors ${
                              audit.privilege.status === 'INVALID'
                                ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                                : audit.privilege.status === 'VALID' && med.additionalPrivilege && med.additionalPrivilege !== 'BRAK'
                                ? 'border-purple-400 bg-purple-50/30 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            <option value="BRAK">BRAK - Standardowe NFZ</option>
                            <option value="S">S - Senior 65+ (Bezpłatne leki)</option>
                            <option value="IB">IB - Inwalida Wojenny i Wojskowy</option>
                            <option value="ZK">ZK - Zasłużony Honorowy Dawca Krwi</option>
                            <option value="C">C - Kobieta w Ciąży (Ciąża Plus)</option>
                            <option value="DZ">DZ - Dziecko do 18 r.ż.</option>
                            <option value="WE">WE - Weteran Poszkodowany</option>
                            <option value="PO">PO - Osoby Represjonowane</option>
                          </select>

                          <div className="text-[10px]">
                            {audit.privilege.status === 'INVALID' ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold block truncate" title={audit.privilege.description}>
                                ⚠️ Niezgodność z PESEL!
                              </span>
                            ) : med.additionalPrivilege && med.additionalPrivilege !== 'BRAK' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium block truncate">
                                ✓ {audit.privilege.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">Standardowa odpłatność</span>
                            )}
                          </div>
                        </div>

                        {/* 4. POZIOM ODPŁATNOŚCI & DAWKA */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 dark:text-slate-300">
                            Odpłatność NFZ
                          </label>

                          <select
                            value={med.refundationLevel || 'R'}
                            onChange={(e) => handleMedChange(idx, 'refundationLevel', e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none"
                          >
                            <option value="R">Ryczałt (R)</option>
                            <option value="S">Bezpłatne dla Seniora (S)</option>
                            <option value="bezpłatne">Bezpłatne (IB/ZK/C)</option>
                            <option value="50%">Odpłatność 50%</option>
                            <option value="30%">Odpłatność 30%</option>
                            <option value="100%">Odpłatność 100% (Pełnopłatne)</option>
                          </select>

                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-[10px]">Dawka:</span>
                            <input 
                              type="text"
                              value={med.dosage}
                              onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent w-20"
                              placeholder="1x1"
                            />
                          </div>
                        </div>

                      </div>

                      {/* Komunikat o szczegółowych błędach pozycji */}
                      {audit.issues.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-rose-100/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-300 space-y-0.5">
                          {audit.issues.map((iss, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span>•</span>
                              <span>{iss}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ZAKŁADKA 2: PODGLĄD JSON P1 CEZ */}
          {activeTab === 'JSON' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Struktura JSON zgodna ze specyfikacją Centrum e-Zdrowia (CeZ / CSIOZ) PL-CDA-P1 v1.4.2</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? 'Skopiowano JSON!' : 'Kopiuj JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-950 text-emerald-400 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[460px] border border-slate-800 shadow-inner leading-relaxed select-all">
                <pre>{generatedJsonString}</pre>
              </div>
            </div>
          )}

          {/* ZAKŁADKA 3: SZCZEGÓŁOWY RAPORT ZGODNOŚCI */}
          {activeTab === 'REPORT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-semibold block">Wskaźnik Zgodności P1</span>
                  <span className={`text-xl font-bold mt-1 block ${
                    auditReport.overallScore >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                    auditReport.overallScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {auditReport.overallScore}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {auditReport.canExportSafely ? 'Gotowy do bezpiecznego wysłania' : 'Wymaga poprawek przed eksportem'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-semibold block">Zwalidowane Pozycje Lekowe</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                    {auditReport.validMedicationsCount} / {auditReport.totalMedications}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {auditReport.failedMedicationsCount} błędów blokujących, {auditReport.warningMedicationsCount} ostrzeżeń
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-semibold block">Weryfikacja Tożsamości i Uprawnień</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-1 block">
                    PESEL: {peselInfo.isValid ? '✓ Poprawny' : '⚠️ Błędny'} ({patientAge} lat)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Senior 65+: {patientAge >= 65 ? 'Tak (S przysługuje)' : 'Nie'}
                  </span>
                </div>
              </div>

              {/* Informator o kodach uprawnień */}
              <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-2">
                <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Info size={14} />
                  <span>Słownik Uprawnień Dodatkowych Pacjenta (NFZ / CeZ P1)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(ADDITIONAL_PRIVILEGES_INFO).slice(0, 6).map(([code, info]) => (
                    <div key={code} className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-purple-100 dark:border-purple-900/40">
                      <div className="font-bold text-purple-800 dark:text-purple-300">
                        {info.name}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {info.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* STOPKA MODALA Z PRZYCISKAMI AKCJI */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={`w-2 h-2 rounded-full ${auditReport.canExportSafely ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            <span>
              {auditReport.canExportSafely 
                ? 'Wszystkie pozycje zweryfikowane pod kątem EAN, ATC i uprawnień' 
                : `Uwaga: Wykryto ${auditReport.failedMedicationsCount} błędów technicznych w lekach`}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3.5 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>Kopiuj JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentUpdatedData) {
                  EReceptaService.downloadPDF(currentUpdatedData);
                  NotificationService.addNotification('INFO', 'Wydruk e-Recepty', 'Pobrano wydruk informacyjny dla pacjenta w formacie PDF');
                }
              }}
              className="px-3.5 py-2 text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Wydruk PDF</span>
            </button>

            <button
              type="button"
              onClick={handleFinalSaveAndDownload}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                auditReport.canExportSafely
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              }`}
            >
              <Download size={15} />
              <span>Zapisz i Pobierz JSON (P1 CeZ)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
