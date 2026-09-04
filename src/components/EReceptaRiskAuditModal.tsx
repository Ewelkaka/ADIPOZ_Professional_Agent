// src/components/EReceptaRiskAuditModal.tsx
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  X, 
  Download, 
  HelpCircle, 
  Scale, 
  FileText, 
  ArrowRight,
  Sparkles,
  Info,
  Building2,
  FileCode
} from 'lucide-react';
import { EReceptaRiskAnalysis, NFZCheckItem } from '../services/EReceptaRiskService';
import { EReceptaData, EReceptaService } from '../services/EReceptaService';
import { NotificationService } from '../services/NotificationService';

interface EReceptaRiskAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: EReceptaRiskAnalysis;
  eReceptaData: EReceptaData;
  onDownloadConfirmed?: () => void;
}

export const EReceptaRiskAuditModal: React.FC<EReceptaRiskAuditModalProps> = ({
  isOpen,
  onClose,
  analysis,
  eReceptaData,
  onDownloadConfirmed
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FAIL' | 'WARN' | 'PASS'>('ALL');

  if (!isOpen) return null;

  const filteredItems = analysis.checklist.filter(item => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'FAIL') return item.status === 'FAIL';
    if (selectedCategory === 'WARN') return item.status === 'WARN';
    if (selectedCategory === 'PASS') return item.status === 'PASS';
    return true;
  });

  const handleDownload = () => {
    if (onDownloadConfirmed) {
      onDownloadConfirmed();
    } else {
      EReceptaService.downloadJSON(eReceptaData);
      NotificationService.addNotification(
        analysis.canDownloadSafely ? 'SUCCESS' : 'WARNING',
        analysis.canDownloadSafely ? 'Pobrano zweryfikowaną e-Receptę' : 'Pobrano plik e-Recepty z ostrzeżeniem NFZ',
        `Plik eRecepta_P1_${eReceptaData.patientPesel}.json został pobrany (Zgodność NFZ: ${analysis.compliancePercentage}%).`
      );
    }
    onClose();
  };

  const getRiskBadge = () => {
    switch (analysis.riskLevel) {
      case 'LOW':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-950/80',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-300 dark:border-emerald-800',
          icon: <ShieldCheck className="text-emerald-500" size={20} />,
          title: 'Niski stopień ryzyka (Pełna zgodność z NFZ/CeZ)'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-100 dark:bg-amber-950/80',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-300 dark:border-amber-800',
          icon: <AlertTriangle className="text-amber-500" size={20} />,
          title: 'Umiarkowany stopień ryzyka (Wymaga weryfikacji)'
        };
      case 'HIGH':
      case 'CRITICAL':
      default:
        return {
          bg: 'bg-rose-100 dark:bg-rose-950/80',
          text: 'text-rose-700 dark:text-rose-400',
          border: 'border-rose-300 dark:border-rose-800',
          icon: <XCircle className="text-rose-500" size={20} />,
          title: 'Wysoki stopień ryzyka (Krytyczne niezgodności NFZ)'
        };
    }
  };

  const badge = getRiskBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Nagłówek Modala */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${badge.bg} ${badge.text} border ${badge.border}`}>
              {badge.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Audyt NFZ & Stopień Ryzyka e-Recepty P1
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text} border ${badge.border}`}>
                  Zgodność: {analysis.compliancePercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatyczna analiza poprawności formalno-prawnej, refundacji i kodyfikacji wg wytycznych NFZ oraz CeZ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel Podsumowania Wskaźnika Ryzyka */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Poziom Ryzyka NFZ
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-bold text-sm ${badge.text}`}>
                  {analysis.riskLevel === 'LOW' ? '🟢 NISKIE' : analysis.riskLevel === 'MODERATE' ? '🟡 ŚREDNIE' : '🔴 WYSOKIE'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">
                Wskaźnik błędu: {analysis.riskScore}/100 pkt
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Zgodność Formalna
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                  {analysis.compliancePercentage}%
                </span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${analysis.compliancePercentage >= 90 ? 'bg-emerald-500' : analysis.compliancePercentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${analysis.compliancePercentage}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">
                {analysis.checksPassed} z {analysis.totalChecks} kryteriów spełnionych
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Wykryte Alerty
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <XCircle size={14} /> {analysis.criticalIssuesCount} kryt.
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={14} /> {analysis.warningsCount} uwag
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1">
                Sprawdzone reguły CSIOZ & NFZ
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Status Gotowości P1
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {analysis.canDownloadSafely ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={15} /> Gotowy do wysyłki
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <XCircle size={15} /> Wymaga poprawy
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 font-mono">
                PIN: {eReceptaData.accessCode} | {eReceptaData.medications.length} poz.
              </span>
            </div>
          </div>

          {/* Podsumowanie audytu tekstowe */}
          <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${badge.bg} ${badge.border} ${badge.text}`}>
            <Info size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block mb-0.5">Ocena Silnika Walidacji NFZ:</strong>
              <span>{analysis.summary}</span>
            </div>
          </div>

          {/* Filtry zakładek reguł */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Wszystkie testy ({analysis.totalChecks})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('FAIL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'FAIL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50'
              }`}
            >
              <XCircle size={13} />
              Błędy krytyczne ({analysis.criticalIssuesCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('WARN')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'WARN'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle size={13} />
              Ostrzeżenia ({analysis.warningsCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('PASS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'PASS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={13} />
              Zgodne ({analysis.checksPassed})
            </button>
          </div>
        </div>

        {/* Lista Zweryfikowanych Reguł NFZ */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Brak pozycji w wybranej kategorii filtrów.
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.status === 'FAIL'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : item.status === 'WARN'
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {item.status === 'FAIL' ? (
                        <XCircle size={18} className="text-rose-500" />
                      ) : item.status === 'WARN' ? (
                        <AlertTriangle size={18} className="text-amber-500" />
                      ) : (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.2 text-[10px] font-mono rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>

                      {item.recommendation && (
                        <div className="mt-2 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <Sparkles size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold text-emerald-700 dark:text-emerald-400">Wskazówka naprawcza: </strong>
                            <span>{item.recommendation}</span>
                          </div>
                        </div>
                      )}

                      {item.legalReference && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                          <Scale size={11} className="shrink-0" />
                          <span>Podstawa prawna: {item.legalReference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                    item.status === 'FAIL' 
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                      : item.status === 'WARN'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  }`}>
                    {item.status === 'FAIL' ? 'Błąd NFZ' : item.status === 'WARN' ? 'Uwaga' : 'Zgodne'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dolny Pasek Akcji */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Weryfikacja w czasie rzeczywistym przed eksportem do P1</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Zamknij
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer ${
                analysis.canDownloadSafely 
                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Download size={15} />
              {analysis.canDownloadSafely ? 'Pobierz bezpieczny JSON P1' : 'Pobierz mimo ostrzeżeń NFZ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
