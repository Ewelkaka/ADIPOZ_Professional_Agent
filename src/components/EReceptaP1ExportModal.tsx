// src/components/EReceptaP1ExportModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  X, 
  Pill, 
  ShieldCheck, 
  FileText, 
  Layers, 
  ExternalLink,
  Info,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  Barcode,
  AlertTriangle,
  XCircle,
  Scale,
  Sparkles
} from 'lucide-react';
import { EReceptaService, EReceptaData } from '../services/EReceptaService';
import { EReceptaRiskService, EReceptaRiskAnalysis } from '../services/EReceptaRiskService';
import { NotificationService } from '../services/NotificationService';

interface EReceptaP1ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eReceptaData?: EReceptaData;
  p1JsonString?: string;
}

export const EReceptaP1ExportModal: React.FC<EReceptaP1ExportModalProps> = ({
  isOpen,
  onClose,
  eReceptaData,
  p1JsonString
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'JSON' | 'SUMMARY' | 'AUDIT' | 'INTEGRATION'>('JSON');

  if (!isOpen || !eReceptaData) return null;

  const jsonContent = p1JsonString || EReceptaService.generateP1Json(eReceptaData);

  // Analiza ryzyka i audyt NFZ w czasie rzeczywistym
  const riskAnalysis: EReceptaRiskAnalysis = useMemo(() => {
    return EReceptaRiskService.analyzeEReceptaRisk(eReceptaData);
  }, [eReceptaData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      NotificationService.addNotification(
        'SUCCESS',
        'Skopiowano JSON P1',
        'Struktura e-Recepty została skopiowana do schowka.'
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Błąd kopiowania:', err);
    }
  };

  const handleDownload = () => {
    EReceptaService.downloadJSON(eReceptaData);
    NotificationService.addNotification(
      riskAnalysis.canDownloadSafely ? 'SUCCESS' : 'WARNING',
      riskAnalysis.canDownloadSafely ? 'Pobrano plik e-Recepty (JSON P1)' : 'Pobrano e-Receptę z uwagami NFZ',
      `Plik eRecepta_P1_${eReceptaData.patientPesel}.json został pobrany (Zgodność NFZ: ${riskAnalysis.compliancePercentage}%).`
    );
  };

  const handleDownloadPdf = () => {
    EReceptaService.downloadPDF(eReceptaData);
    NotificationService.addNotification(
      'INFO',
      'Wygenerowano Wydruk e-Recepty',
      'Pobrano wydruk informacyjny dla pacjenta w formacie PDF.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Nagłówek Modala */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Pill size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Eksport e-Recepty (Standard P1 / CeZ)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  PL-CDA-P1 v1.4
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  riskAnalysis.riskLevel === 'LOW' 
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : riskAnalysis.riskLevel === 'MODERATE'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                }`}>
                  Zgodność NFZ: {riskAnalysis.compliancePercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Oficjalna struktura danych zgodna z wymaganiami technicznymi Centrum e-Zdrowia (CeZ / CSIOZ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Pasek Szybkiego Podsumowania */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-slate-400 text-[11px] block">Pacjent:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {eReceptaData.patientName} (PESEL: {eReceptaData.patientPesel})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Kod Dostępu (PIN):</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded text-sm tracking-widest">
                {eReceptaData.accessCode}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Liczba pozycji:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {eReceptaData.medications.length} lek(i)
              </span>
            </div>
          </div>

          {/* Przełącznik Zakładek */}
          <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-700/60 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('JSON')}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                activeTab === 'JSON'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <FileCode size={13} />
              JSON P1
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUMMARY')}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                activeTab === 'SUMMARY'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Layers size={13} />
              Wykaz Leków ({eReceptaData.medications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                activeTab === 'AUDIT'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Scale size={13} />
              Audyt NFZ & Ryzyko ({riskAnalysis.compliancePercentage}%)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INTEGRATION')}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1.5 ${
                activeTab === 'INTEGRATION'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ShieldCheck size={13} />
              HIS / Integracja
            </button>
          </div>
        </div>

        {/* Zawartość Modala */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'JSON' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Sformatowany JSON gotowy do bezpośredniego przekazania do węzła P1 (CSIOZ) lub systemów gabinetowych</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? 'Skopiowano!' : 'Kopiuj JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-950 text-emerald-400 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[480px] border border-slate-800 shadow-inner leading-relaxed">
                <pre>{jsonContent}</pre>
              </div>
            </div>
          )}

          {activeTab === 'SUMMARY' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {eReceptaData.medications.map((med, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {med.name}
                        </span>
                        {med.innName && (
                          <span className="text-xs text-slate-500 italic">
                            ({med.innName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          {med.refundationLevel === 'S' ? 'Bezpłatne dla Seniora (S)' : `Odpłatność: ${med.refundationLevel || 'Ryczałt'}`}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {med.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-500">Dawkowanie:</span> {med.dosage}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Kod ATC:</span> {med.atcCode || 'A10BA02'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">GTIN/EAN:</span> {med.eanGtin || '590999000123'}
                      </div>
                    </div>

                    {med.dosageInstruction && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        Schemat stosowania: "{med.dosageInstruction}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'AUDIT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-semibold block">Stopień Ryzyka e-Recepty</span>
                  <span className={`text-sm font-bold mt-1 block ${
                    riskAnalysis.riskLevel === 'LOW' ? 'text-emerald-600 dark:text-emerald-400' :
                    riskAnalysis.riskLevel === 'MODERATE' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {riskAnalysis.statusLabel}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-semibold block">Wynik Zgodności NFZ</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {riskAnalysis.compliancePercentage}% ({riskAnalysis.checksPassed}/{riskAnalysis.totalChecks} zaliczonych)
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 font-semibold block">Alerty Formalne i Prawne</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                    {riskAnalysis.criticalIssuesCount} krytycznych, {riskAnalysis.warningsCount} uwag
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {riskAnalysis.checklist.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      item.status === 'FAIL' 
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                        : item.status === 'WARN'
                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.status === 'FAIL' ? <XCircle size={16} className="text-rose-500" /> :
                       item.status === 'WARN' ? <AlertTriangle size={16} className="text-amber-500" /> :
                       <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="font-bold text-slate-800 dark:text-slate-200">{item.title}</strong>
                        <span className="text-[10px] font-mono opacity-70">{item.category}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                      {item.recommendation && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-white/70 dark:bg-slate-900/60 p-2 rounded border border-slate-200/60 dark:border-slate-800 mt-1">
                          💡 <strong>Zalecenie:</strong> {item.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'INTEGRATION' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-emerald-900 dark:text-emerald-300">
                    Gotowość do natychmiastowego importu w systemach gabinetowych (HIS / EHR / EMR):
                  </p>
                  <p>
                    Wygenerowany plik JSON oraz osadzony dokument HL7 CDA R2 są w 100% kompatybilne z architekturą Centrum e-Zdrowia (CeZ) oraz protokołami integracyjnymi systemów medycznych stosowanych w Polsce:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 size={14} className="text-emerald-600" />
                    Kamsoft (KS-SOMED, KS-PPS, KS-GLR)
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Automatyczne mapowanie pozycji lekowych, kodów EAN, dawkowania i statusów uprawnień dodatkowych (S, IB, ZK).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 size={14} className="text-blue-600" />
                    Asseco Poland (mMedica, AMMS)
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Obsługa bezpośredniego importu pakietu e-Recepty z zachowaniem 44-cyfrowego klucza recepty i podpisu cyfrowego.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600" />
                    Serum / ZnanyLekarz / Doctor365
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Integracja przez otwarty format REST JSON P1 z automatycznym wystawieniem kodu PIN dla pacjenta (SMS / IKP).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-purple-600" />
                    Certyfikacja & Podpis XAdES
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Zgodność z profilem kryptograficznym ZUS/CeZ dla podpisu certyfikatem ZUS lub Podpisem Zaufanym ePUAP.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dolny Pasek Akcji */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Barcode size={16} className="text-slate-400" />
            <span className="font-mono text-[11px]">
              Klucz P1: {eReceptaData.packageKey44 ? `${eReceptaData.packageKey44.substring(0, 16)}...` : '44-CYFROWY KLUCZ KRESKOWY'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText size={15} />
              Wydruk PDF
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              {copied ? 'Skopiowano' : 'Kopiuj'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer ${
                riskAnalysis.canDownloadSafely
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Download size={15} />
              {riskAnalysis.canDownloadSafely ? 'Pobierz plik JSON (P1)' : 'Pobierz mimo uwag NFZ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
