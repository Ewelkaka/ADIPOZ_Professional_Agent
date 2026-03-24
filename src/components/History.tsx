import React, { memo } from 'react';
import { History as HistoryIcon, Calendar, Activity, Pill, ChevronRight, Trash2, FileText } from 'lucide-react';
import { AnalysisRecord } from '../services/LocalPatientDB';
import { cn } from '../lib/utils';

interface HistoryProps {
  history: AnalysisRecord[];
  onSelect: (record: AnalysisRecord) => void;
  onDelete: (id: string) => void;
}

const HistoryItem = memo(({ record, onSelect, onDelete }: { record: AnalysisRecord, onSelect: (record: AnalysisRecord) => void, onDelete: (id: string) => void }) => (
  <button
    type="button"
    className="w-full text-left bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500"
    onClick={() => onSelect(record)}
    aria-label={`Wizyta z dnia ${new Date(record.timestamp).toLocaleDateString()}: ${record.analysis.decision.diagnosis}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Calendar size={14} aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {new Date(record.timestamp).toLocaleString('pl-PL')}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(record.id);
        }}
        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Usuń historię wizyty"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>

    <div className="flex items-start gap-4">
      <div className="shrink-0 w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400" aria-hidden="true">
        <Activity size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 truncate">
          {record.analysis.decision.diagnosis}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
          {record.symptoms}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase">
            <Pill size={10} aria-hidden="true" />
            {record.analysis.medAnalysis.isSafe ? 'Leki OK' : 'Ryzyko Lekowe'}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase">
            <FileText size={10} aria-hidden="true" />
            {record.analysis.decision.icd10Code || 'Brak ICD-10'}
          </div>
        </div>
      </div>
      <ChevronRight size={20} className="text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" aria-hidden="true" />
    </div>
  </button>
));

HistoryItem.displayName = 'HistoryItem';

export function History({ history, onSelect, onDelete }: HistoryProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-500 text-center" role="status">
        <HistoryIcon size={48} className="mb-4 opacity-20" aria-hidden="true" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Brak historii dla tego pacjenta</p>
        <p className="text-sm max-w-xs text-slate-500 dark:text-slate-500">Przeprowadź pierwszą analizę, aby zapisać dane w lokalnej bazie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <HistoryIcon className="text-indigo-600 dark:text-indigo-400" size={20} aria-hidden="true" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Historia Analiz</h2>
      </div>

      <div className="grid gap-3" role="list">
        {history.map((record) => (
          <div key={record.id} role="listitem">
            <HistoryItem record={record} onSelect={onSelect} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}
