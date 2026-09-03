import React from 'react';
import { Target, TrendingDown, TrendingUp, Scale, CheckCircle2, Calendar, Edit3, Plus, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { WeightGoal, WeightGoalProgress, WeightGoalService } from '../services/WeightGoalService';

interface WeightGoalCardProps {
  goal: WeightGoal | null;
  currentWeight: number;
  heightCm: number;
  onOpenModal: () => void;
  showReferenceLine: boolean;
  onToggleReferenceLine: () => void;
}

export const WeightGoalCard: React.FC<WeightGoalCardProps> = ({
  goal,
  currentWeight,
  heightCm,
  onOpenModal,
  showReferenceLine,
  onToggleReferenceLine,
}) => {
  if (!goal) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 mb-4 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-dashed border-purple-300 dark:border-purple-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Target size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Ustal cel wagi dla pacjenta 🎯
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Wyznacz docelową wagę, aby na wykresie BMI pojawiła się dynamiczna linia odniesienia oraz pasek postępu.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-800/50 rounded-lg border border-purple-300 dark:border-purple-700/60 transition-all shadow-sm shrink-0"
        >
          <Plus size={14} />
          <span>Ustaw cel wagi</span>
        </button>
      </div>
    );
  }

  const progress: WeightGoalProgress = WeightGoalService.calculateProgress(
    currentWeight,
    goal.startWeight,
    goal.targetWeight,
    heightCm
  );

  return (
    <div className="mb-5 p-4 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-cyan-50/50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-cyan-950/20 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-3">
      {/* Górny wiersz: Tytuł, cel, przycisk edycji i toggle linii */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0">
            <Target size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Cel Wagi Pacjenta
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white flex items-center gap-1">
                🎯 {goal.targetWeight} kg (BMI {progress.targetBmi})
              </span>
              {progress.isAchieved && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                  <CheckCircle2 size={12} /> Cel osiągnięty!
                </span>
              )}
            </div>
            {goal.notes && (
              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                "{goal.notes}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Przełącznik widoczności linii odniesienia na wykresie */}
          <button
            type="button"
            onClick={onToggleReferenceLine}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
              showReferenceLine
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700'
            }`}
            title={showReferenceLine ? 'Ukryj linię celu na wykresie' : 'Pokaż linię celu na wykresie'}
          >
            {showReferenceLine ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showReferenceLine ? 'Linia celu widoczna' : 'Pokaż na wykresie'}</span>
          </button>

          {/* Przycisk edycji */}
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Edit3 size={12} />
            <span>Edytuj cel</span>
          </button>
        </div>
      </div>

      {/* Pasek postępu i wskaźniki */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Start: {goal.startWeight} kg</span>
            <ArrowRight size={12} className="text-slate-400" />
            <span className="font-bold text-slate-900 dark:text-slate-100">Bieżąca: {currentWeight} kg</span>
            <ArrowRight size={12} className="text-purple-400" />
            <span className="font-bold text-purple-600 dark:text-purple-400">Cel: {goal.targetWeight} kg</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Progres:</span>
            <span className="font-bold font-mono text-purple-700 dark:text-purple-300">
              {progress.percent}%
            </span>
          </div>
        </div>

        {/* Graficzny progress bar */}
        <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress.isAchieved
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-purple-500 to-indigo-500'
            }`}
            style={{ width: `${Math.max(4, Math.min(100, progress.percent))}%` }}
          />
        </div>

        {/* Szczegóły progresu: ile pozostało, kierunek i data docelowa */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-3">
            {progress.isAchieved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Osiągnięto założoną wagę docelową!
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {progress.direction === 'loss' ? (
                  <>
                    <TrendingDown size={13} className="text-emerald-500" />
                    <span>Zredukowano: <strong className="text-slate-800 dark:text-slate-200 font-mono">{progress.changedKg} kg</strong></span>
                    <span className="text-slate-400">•</span>
                    <span>Do celu pozostało: <strong className="text-purple-600 dark:text-purple-400 font-mono">{progress.remainingKg} kg</strong></span>
                  </>
                ) : progress.direction === 'gain' ? (
                  <>
                    <TrendingUp size={13} className="text-blue-500" />
                    <span>Przyrost: <strong className="text-slate-800 dark:text-slate-200 font-mono">{progress.changedKg} kg</strong></span>
                    <span className="text-slate-400">•</span>
                    <span>Do celu pozostało: <strong className="text-purple-600 dark:text-purple-400 font-mono">{progress.remainingKg} kg</strong></span>
                  </>
                ) : (
                  <>
                    <Scale size={13} className="text-amber-500" />
                    <span>Utrzymanie wagi. Różnica: <strong className="font-mono">{progress.remainingKg} kg</strong></span>
                  </>
                )}
              </span>
            )}
          </div>

          {goal.targetDate && (
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Calendar size={12} className="text-purple-500" />
              <span>Termin realizacji: <strong className="text-slate-700 dark:text-slate-300 font-mono">{goal.targetDate}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
