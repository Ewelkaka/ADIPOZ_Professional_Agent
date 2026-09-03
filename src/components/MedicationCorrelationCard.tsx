import React from 'react';
import { Pill, TrendingDown, TrendingUp, Minus, Calendar, ArrowRight, Sparkles, CheckCircle2, Info, Eye, EyeOff } from 'lucide-react';
import { MedicationEvent } from '../services/MedicationCorrelationService';

interface MedicationCorrelationCardProps {
  events: MedicationEvent[];
  onNavigateToVisit?: (recordId: string) => void;
  showMedicationLines: boolean;
  onToggleMedicationLines: () => void;
  showMedicationBadges: boolean;
  onToggleMedicationBadges: () => void;
}

export const MedicationCorrelationCard: React.FC<MedicationCorrelationCardProps> = ({
  events,
  onNavigateToVisit,
  showMedicationLines,
  onToggleMedicationLines,
  showMedicationBadges,
  onToggleMedicationBadges,
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/50 flex items-center justify-center text-pink-500 shrink-0">
          <Pill size={18} />
        </div>
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-200">Brak zarejestrowanych zmian w farmakoterapii</p>
          <p className="text-[11px]">W miarę wprowadzania nowych leków w kolejnych wizytach, system automatycznie oznaczy momenty wdrożeń na osi czasu wykresu BMI.</p>
        </div>
      </div>
    );
  }

  // Obliczenie łącznego wpływu od pierwszego wdrożonego leku
  const firstEvent = events[0];
  const latestEvent = events[events.length - 1];
  const totalWeightDelta = (latestEvent?.latestWeight !== undefined && firstEvent?.weightAtEvent !== undefined)
    ? parseFloat((latestEvent.latestWeight - firstEvent.weightAtEvent).toFixed(1))
    : undefined;

  return (
    <div className="bg-gradient-to-br from-pink-50/50 via-white to-purple-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-pink-950/20 border border-pink-200/80 dark:border-pink-900/40 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Nagłówek i kontrolki widoczności znaczników */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800/60 flex items-center justify-center text-pink-600 dark:text-pink-400 shadow-sm shrink-0">
            <Pill size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Korelacja Farmakoterapii ze Zmianą Wagi i BMI
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                {events.length} {events.length === 1 ? 'wdrożenie' : events.length < 5 ? 'wdrożenia' : 'wdrożeń'} leków
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Punkty startowe leków oznaczone na wykresie ikoną 💊 i znacznikami na osi X
            </p>
          </div>
        </div>

        {/* Przyciski przełączania znaczników na wykresie */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={onToggleMedicationLines}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showMedicationLines
                ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            title="Włącz lub wyłącz pionowe linie odniesienia w dniach rozpoczęcia leków"
          >
            {showMedicationLines ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Linie wdrożeń (💊)</span>
          </button>

          <button
            type="button"
            onClick={onToggleMedicationBadges}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showMedicationBadges
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            title="Pokaż lub ukryj etykiety z nazwami leków bezpośrednio nad punktami"
          >
            {showMedicationBadges ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Etykiety nazw leków</span>
          </button>
        </div>
      </div>

      {/* Podsumowanie dynamiki od pierwszego wdrożenia leków */}
      {totalWeightDelta !== undefined && (
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 border border-pink-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-pink-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Łączna zmiana masy ciała w toku farmakoterapii (od {firstEvent.date}):
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              totalWeightDelta < 0
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : totalWeightDelta > 0
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {totalWeightDelta < 0 ? <TrendingDown size={15} /> : totalWeightDelta > 0 ? <TrendingUp size={15} /> : <Minus size={15} />}
              {totalWeightDelta > 0 ? `+${totalWeightDelta}` : totalWeightDelta} kg
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              (początek: {firstEvent.weightAtEvent} kg → obecnie: {latestEvent.latestWeight} kg)
            </span>
          </div>
        </div>
      )}

      {/* Oś Czasu zdarzeń rozpoczęcia leków */}
      <div className="space-y-3">
        {events.map((evt, idx) => {
          const isWeightLoss = evt.weightDeltaAfterMed !== undefined && evt.weightDeltaAfterMed < -0.5;
          const isWeightGain = evt.weightDeltaAfterMed !== undefined && evt.weightDeltaAfterMed > 0.5;

          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-pink-300 dark:hover:border-pink-800 transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {/* Data i nowe leki */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar size={13} className="text-pink-500" />
                      {evt.date}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60">
                      Nowe wdrożenie
                    </span>
                  </div>
                  
                  {/* Lista leków wprowadzonych na tej wizycie */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Wdrożono:</span>
                    {evt.newMedications.map((med, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1"
                      >
                        <Pill size={11} className="text-purple-500" />
                        {med}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Statystyki wagi i korelacji */}
                <div className="flex items-center gap-3 sm:text-right">
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Waga / BMI w dniu startu</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {evt.weightAtEvent ? `${evt.weightAtEvent} kg` : '—'} 
                      {evt.bmiAtEvent && <span className="text-slate-400 font-normal ml-1">({evt.bmiAtEvent} BMI)</span>}
                    </div>
                  </div>

                  {evt.weightDeltaAfterMed !== undefined && (
                    <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Dynamika po leku</div>
                      <div className={`text-xs font-bold font-mono flex items-center gap-1 ${
                        isWeightLoss ? 'text-emerald-600 dark:text-emerald-400' : isWeightGain ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'
                      }`}>
                        {isWeightLoss ? <TrendingDown size={14} /> : isWeightGain ? <TrendingUp size={14} /> : <Minus size={14} />}
                        {evt.weightDeltaAfterMed > 0 ? `+${evt.weightDeltaAfterMed}` : evt.weightDeltaAfterMed} kg
                        {evt.bmiDeltaAfterMed !== undefined && (
                          <span className="text-[10px] font-normal opacity-80">
                            ({evt.bmiDeltaAfterMed > 0 ? `+${evt.bmiDeltaAfterMed}` : evt.bmiDeltaAfterMed} BMI)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Przycisk przejścia do wybranej wizyty */}
                  {evt.recordId && onNavigateToVisit && (
                    <button
                      type="button"
                      onClick={() => onNavigateToVisit(evt.recordId!)}
                      className="ml-2 p-2 rounded-lg bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 transition-colors border border-pink-200 dark:border-pink-800/40 cursor-pointer shrink-0"
                      title="Otwórz tę wizytę w zakładce Historia"
                    >
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Komentarz kliniczny korelacji */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Info size={12} className="text-pink-500 shrink-0" />
                  <span>{evt.clinicalNote}</span>
                </span>
                {evt.daysObservedAfterMed !== undefined && evt.daysObservedAfterMed > 0 && (
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 italic">
                    Czas obserwacji: {evt.daysObservedAfterMed} dni
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
