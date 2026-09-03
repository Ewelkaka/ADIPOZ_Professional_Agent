import React, { memo, useEffect, useRef } from 'react';
import { History as HistoryIcon, Calendar, Activity, Pill, ChevronRight, Trash2, FileText, FileSpreadsheet, Target, X, CheckCircle2 } from 'lucide-react';
import { AnalysisRecord } from '../services/LocalPatientDB';
import { cn } from '../lib/utils';
import { exportAndDownloadHistory, exportAndDownloadSingleVisit } from '../lib/csvExporter';
import { generatePatientReportPDF } from '../lib/pdfGenerator';
import { NotificationService } from '../services/NotificationService';

interface HistoryProps {
  history: AnalysisRecord[];
  onSelect: (record: AnalysisRecord) => void;
  onDelete: (id: string) => void;
  patientId?: string;
  selectedRecordId?: string | null;
  onClearSelection?: () => void;
}

const HistoryItem = memo(({ 
  record, 
  onSelect, 
  onDelete, 
  isSelected,
  itemRef 
}: { 
  record: AnalysisRecord; 
  onSelect: (record: AnalysisRecord) => void; 
  onDelete: (id: string) => void;
  isSelected?: boolean;
  itemRef?: React.RefObject<HTMLDivElement>;
}) => {
  const bmiVal = record.patientInfo?.bmi || (record.patientInfo?.weight && record.patientInfo?.height ? parseFloat((record.patientInfo.weight / Math.pow(record.patientInfo.height / 100, 2)).toFixed(1)) : null);

  return (
    <div 
      ref={itemRef} 
      className={cn(
        "transition-all duration-300 rounded-xl",
        isSelected && "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.01]"
      )}
    >
      <button
        type="button"
        className={cn(
          "w-full text-left rounded-xl p-4 border transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500",
          isSelected 
            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600" 
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500"
        )}
        onClick={() => onSelect(record)}
        aria-label={`Wizyta z dnia ${new Date(record.timestamp).toLocaleDateString()}: ${record.analysis?.decision?.diagnosis || 'Wizyta'}`}
      >
        {isSelected && (
          <div className="mb-3 flex items-center justify-between bg-emerald-600/15 dark:bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Target size={14} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>Zaznaczona wizyta z wykresu BMI</span>
            </div>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-medium">
              Kliknij, aby wczytać do panelu analizy
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Calendar size={14} aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {new Date(record.timestamp).toLocaleString('pl-PL')}
            </span>
            {bmiVal && (
              <span className="ml-2 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono text-xs font-semibold border border-purple-200 dark:border-purple-800">
                BMI: {bmiVal}
              </span>
            )}
            {record.patientInfo?.weight && (
              <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-mono text-xs font-semibold border border-cyan-200 dark:border-cyan-800">
                {record.patientInfo.weight} kg
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                generatePatientReportPDF(record.analysis, record.patientId);
                NotificationService.addNotification('SUCCESS', 'Raport PDF', `Wygenerowano raport PDF dla wizyty z dnia ${new Date(record.timestamp).toLocaleDateString()}`);
              }}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              title="Pobierz raport PDF dla tej wizyty"
              aria-label="Pobierz raport PDF dla tej wizyty"
            >
              <FileText size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                exportAndDownloadSingleVisit({
                  patientId: record.patientId,
                  timestamp: record.timestamp,
                  patientInfo: record.patientInfo,
                  vitals: record.vitals,
                  symptoms: record.symptoms,
                  medications: record.medications,
                  analysis: record.analysis
                });
                NotificationService.addNotification('SUCCESS', 'Eksport CSV', `Pomyślnie wyeksportowano wizytę z dnia ${new Date(record.timestamp).toLocaleDateString()} do pliku CSV`);
              }}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
              title="Eksportuj tę wizytę do pliku CSV"
              aria-label="Eksportuj tę wizytę do pliku CSV"
            >
              <FileSpreadsheet size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(record.id);
              }}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              aria-label="Usuń historię wizyty"
              title="Usuń historię wizyty"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className={cn(
            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            isSelected
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
          )} aria-hidden="true">
            <Activity size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 truncate">
              {record.analysis?.decision?.diagnosis || 'Brak wpisanej diagnozy'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
              {record.symptoms || 'Brak wpisanych objawów'}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase">
                <Pill size={10} aria-hidden="true" />
                {record.analysis?.medAnalysis?.isSafe ? 'Leki OK' : 'Ryzyko Lekowe'}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase">
                <FileText size={10} aria-hidden="true" />
                {record.analysis?.decision?.icd10Code || 'Brak ICD-10'}
              </div>
            </div>
          </div>
          <ChevronRight size={20} className={cn(
            "transition-colors",
            isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
          )} aria-hidden="true" />
        </div>
      </button>
    </div>
  );
});

HistoryItem.displayName = 'HistoryItem';

export function History({ history, onSelect, onDelete, patientId, selectedRecordId, onClearSelection }: HistoryProps) {
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedRecordId && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedRecordId]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 text-center" role="status">
        <HistoryIcon size={48} className="mb-4 opacity-20" aria-hidden="true" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Brak historii dla tego pacjenta</p>
        <p className="text-sm max-w-xs text-slate-500 dark:text-slate-500">Przeprowadź pierwszą analizę, aby zapisać dane w lokalnej bazie.</p>
      </div>
    );
  }

  const hasSelection = Boolean(selectedRecordId && history.some(r => r.id === selectedRecordId));

  return (
    <div className="space-y-4">
      {hasSelection && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <Target className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                Wyróżniono wizytę wybraną z wykresu BMI
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Karta została automatycznie podświetlona. Kliknij ją, aby załadować pełną analizę do panelu głównego.
              </p>
            </div>
          </div>
          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <X size={12} />
              Wyczyść zaznaczenie
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="text-indigo-600 dark:text-indigo-400" size={20} aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Historia Analiz</h2>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">
            {history.length} {history.length === 1 ? 'wizyta' : history.length < 5 ? 'wizyty' : 'wizyt'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              const pid = patientId || history[0]?.patientId || 'pacjent';
              exportAndDownloadHistory(history, pid);
              NotificationService.addNotification('SUCCESS', 'Eksport CSV', `Pomyślnie wyeksportowano historię ${history.length} wizyt pacjenta ${pid} do pliku CSV`);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all"
            title="Eksportuj całą historię wizyt pacjenta do pliku CSV"
          >
            <FileSpreadsheet size={14} />
            Eksportuj CSV
          </button>
          <button
            type="button"
            onClick={() => {
              const pid = patientId || history[0]?.patientId || 'pacjent';
              generatePatientReportPDF(null, pid, history);
              NotificationService.addNotification('SUCCESS', 'Zbiorczy Raport PDF', `Wygenerowano zbiorczy raport PDF dla ${history.length} wizyt pacjenta ${pid}`);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all"
            title="Generuj zbiorczy raport PDF ze wszystkich wizyt pacjenta"
          >
            <FileText size={14} />
            Zbiorczy Raport PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3" role="list">
        {history.map((record) => {
          const isSelected = record.id === selectedRecordId;
          return (
            <div key={record.id} role="listitem">
              <HistoryItem 
                record={record} 
                onSelect={onSelect} 
                onDelete={onDelete}
                isSelected={isSelected}
                itemRef={isSelected ? selectedItemRef : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
