// src/components/RefundHistoryModal.tsx
import React from 'react';
import { History, X, ShieldCheck, UserCheck, Calendar, Clock, ArrowRight } from 'lucide-react';

export interface RefundChangeLogItem {
  id: string;
  timestamp: string;
  medicationName: string;
  ean: string;
  oldLevel: string;
  newLevel: string;
  doctorName: string;
  reason?: string;
}

interface RefundHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyLogs: RefundChangeLogItem[];
  patientPesel?: string;
}

export const RefundHistoryModal: React.FC<RefundHistoryModalProps> = ({
  isOpen,
  onClose,
  historyLogs,
  patientPesel
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <History size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Historia Zmian Refundacji</span>
              </h3>
              <p className="text-xs text-slate-400">
                Chronologiczny rejestr modyfikacji poziomu odpłatności dokonanych ręcznie dla bieżącej recepty {patientPesel ? `(PESEL: ${patientPesel})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        {/* Zawartość */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 max-h-[60vh] flex-1">
          {historyLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-dashed border-slate-800 space-y-2">
              <History size={28} className="mx-auto text-slate-600 mb-1" />
              <p className="font-medium text-slate-300">Brak zarejestrowanych zmian poziomu odpłatności w bieżącej sesji.</p>
              <p className="text-slate-500 text-[11px]">Wszystkie poziomy odpłatności są zgodne z automatycznym audytem Obwieszczenia MZ lub nie były jeszcze modyfikowane ręcznie przez lekarza.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {historyLogs.map((log, idx) => (
                <div key={log.id || idx} className="relative group">
                  {/* Kropka na osi czasu */}
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-slate-900 shadow-sm" />

                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <strong className="text-white text-sm">{log.medicationName}</strong>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        {log.timestamp}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-slate-400">Zmiana odpłatności:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-semibold">
                        {log.oldLevel}
                      </span>
                      <ArrowRight size={13} className="text-amber-400" />
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono font-bold">
                        {log.newLevel}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                      <span className="flex items-center gap-1 text-slate-300">
                        <UserCheck size={12} className="text-teal-400" />
                        Lekarz: {log.doctorName}
                      </span>
                      {log.reason && (
                        <span className="text-slate-400 italic">
                          Uzasadnienie: "{log.reason}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stopka */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Wpisy w historii są zabezpieczone w audycie EDM.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer border border-slate-700"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
