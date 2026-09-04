import React from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Target, 
  Sparkles, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  HelpCircle
} from 'lucide-react';
import { WeightTrendAnalysis } from '../services/LinearRegressionService';
import { WeightGoal } from '../services/WeightGoalService';

interface BmiTrendRegressionCardProps {
  trendAnalysis: WeightTrendAnalysis;
  weightGoal: WeightGoal | null;
  showTrendLine: boolean;
  onToggleTrendLine: () => void;
  showTrendForecast: boolean;
  onToggleTrendForecast: () => void;
  onOpenWeightGoalModal: () => void;
}

export const BmiTrendRegressionCard: React.FC<BmiTrendRegressionCardProps> = ({
  trendAnalysis,
  weightGoal,
  showTrendLine,
  onToggleTrendLine,
  showTrendForecast,
  onToggleTrendForecast,
  onOpenWeightGoalModal,
}) => {
  const { hasEnoughData, metrics, trendDirection, prediction } = trendAnalysis;

  if (!hasEnoughData || !metrics) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              📈
            </div>
            <div>
              <h3 className="text-sm font-bold dark:text-slate-100 flex items-center gap-2">
                <span>Linia Trendu & Regresja Liniowa Wagi</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                  Wymaga min. 2 wizyt
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatyczna ekstrapolacja tempa zmian masy ciała i predykcja daty osiągnięcia celu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWeightGoalModal}
            className="text-xs px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Target size={13} />
            <span>{weightGoal ? 'Edytuj cel wagowy' : 'Ustaw cel wagowy'}</span>
          </button>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Clock size={15} className="text-amber-500 shrink-0" />
          <span>{prediction.clinicalSummary}</span>
        </div>
      </div>
    );
  }

  const isLoss = metrics.slopeKgPerMonth < -0.3;
  const isGain = metrics.slopeKgPerMonth > 0.3;

  // Status badge
  let statusBadgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
  let statusBadgeLabel = 'Stabilizacja';
  let statusIcon = <Minus size={14} className="text-slate-500" />;

  if (prediction.status === 'ACHIEVED') {
    statusBadgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    statusBadgeLabel = '🎯 Cel osiągnięty!';
    statusIcon = <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />;
  } else if (prediction.status === 'AHEAD_OF_SCHEDULE') {
    statusBadgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    statusBadgeLabel = '🚀 Wyprzedza plan';
    statusIcon = <TrendingDown size={14} className="text-emerald-600 dark:text-emerald-400" />;
  } else if (prediction.status === 'ON_TRACK') {
    statusBadgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    statusBadgeLabel = '⏱️ Zgodnie z planem';
    statusIcon = <TrendingDown size={14} className="text-blue-600 dark:text-blue-400" />;
  } else if (prediction.status === 'BEHIND_SCHEDULE') {
    statusBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    statusBadgeLabel = '⚠️ Spowolnienie tempa';
    statusIcon = <Clock size={14} className="text-amber-600 dark:text-amber-400" />;
  } else if (prediction.status === 'DIVERGING') {
    statusBadgeColor = 'bg-rose-100 text-rose-800 dark:bg-red-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    statusBadgeLabel = '⚠️ Oddalanie od celu';
    statusIcon = <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />;
  } else if (prediction.status === 'PLATEAU') {
    statusBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    statusBadgeLabel = '⚖️ Zjawisko Plateau';
    statusIcon = <Minus size={14} className="text-amber-600 dark:text-amber-400" />;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm mb-4 space-y-4">
      {/* Nagłówek i przełączniki */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-sm">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold dark:text-slate-100">
                Regresja Liniowa i Trend Wagi Pacjenta
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${statusBadgeColor}`}>
                {statusIcon}
                <span>{statusBadgeLabel}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Model najmniejszych kwadratów (OLS) z analizą {metrics.pointsCount} punktów pomiarowych na przestrzeni {metrics.totalDaysSpan} dni
            </p>
          </div>
        </div>

        {/* Kontrolki przełączania na wykresie */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onToggleTrendLine}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showTrendLine
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Pokaż lub ukryj linię regresji liniowej na wykresie"
          >
            <span>📈</span>
            <span>{showTrendLine ? 'Linia trendu: WŁ' : 'Pokaż linię trendu'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTrendForecast}
            disabled={!showTrendLine}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              showTrendForecast && showTrendLine
                ? 'bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Ekstrapoluj linię trendu w przyszłość do założonego celu wagowego"
          >
            <Sparkles size={13} />
            <span>{showTrendForecast ? 'Prognoza celu: WŁ' : 'Prognoza celu'}</span>
          </button>
        </div>
      </div>

      {/* Siatka wskaźników analitycznych modelu */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Miesięczne tempo zmian */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Tempo Zmian (M-c)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold font-mono flex items-center gap-1 ${
              isLoss ? 'text-emerald-600 dark:text-emerald-400' : isGain ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'
            }`}>
              {isLoss ? <TrendingDown size={16} /> : isGain ? <TrendingUp size={16} /> : <Minus size={16} />}
              {metrics.slopeKgPerMonth > 0 ? `+${metrics.slopeKgPerMonth}` : metrics.slopeKgPerMonth}
            </span>
            <span className="text-xs text-slate-500 font-sans">kg/m-c</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            ({metrics.slopeKgPerWeek > 0 ? `+${metrics.slopeKgPerWeek}` : metrics.slopeKgPerWeek} kg/tydz.)
          </span>
        </div>

        {/* 2. Zmiana całkowita */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Dynamika Całkowita
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-bold font-mono ${
              metrics.totalWeightDelta < 0 ? 'text-emerald-600 dark:text-emerald-400' : metrics.totalWeightDelta > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'
            }`}>
              {metrics.totalWeightDelta > 0 ? `+${metrics.totalWeightDelta}` : metrics.totalWeightDelta}
            </span>
            <span className="text-xs text-slate-500 font-sans">kg</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            od {metrics.startWeight} do {metrics.latestWeight} kg
          </span>
        </div>

        {/* 3. Dopasowanie R² */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Dopasowanie R²
            </span>
            <span 
              className="text-slate-400 hover:text-slate-600 cursor-help" 
              title="Współczynnik determinacji R² (od 0 do 1) określa jak precyzyjnie prosta regresji opisuje rzeczywiste wahania wagi."
            >
              <HelpCircle size={11} />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-purple-600 dark:text-purple-400">
              {metrics.rSquared}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              metrics.rSquared >= 0.75 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
              metrics.rSquared >= 0.45 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
              'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {metrics.rSquared >= 0.75 ? 'Wysokie' : metrics.rSquared >= 0.45 ? 'Średnie' : 'Niskie'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate font-mono" title={metrics.formulaString}>
            {metrics.formulaString}
          </span>
        </div>

        {/* 4. Prognoza Osiągnięcia Celu */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/60">
          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block mb-1">
            Prognoza Celu Wagowego
          </span>
          {prediction.predictedDate ? (
            <div>
              <span className="text-sm font-bold text-purple-900 dark:text-purple-100 block truncate">
                {prediction.predictedDate}
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium block mt-0.5">
                za ok. {prediction.predictedDaysRemaining} dni ({prediction.remainingKg} kg do celu)
              </span>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <span className="text-xs font-semibold text-purple-800 dark:text-purple-200">
                {weightGoal ? 'Wymaga weryfikacji' : 'Brak zdefiniowanego celu'}
              </span>
              <button
                type="button"
                onClick={onOpenWeightGoalModal}
                className="text-[10px] text-purple-700 dark:text-purple-300 font-bold underline text-left mt-1"
              >
                {weightGoal ? 'Dostosuj cel' : 'Ustaw cel +'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Komunikat predykcyjny i kliniczna interpretacja */}
      <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
        prediction.status === 'ACHIEVED' 
          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
          : prediction.status === 'DIVERGING'
          ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-red-950/40 dark:text-rose-200 dark:border-red-900'
          : prediction.status === 'AHEAD_OF_SCHEDULE'
          ? 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900'
          : 'bg-purple-50 text-purple-950 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800'
      }`}>
        <div className="flex items-center gap-1.5 font-bold">
          <Activity size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
          <span>Wnioski predykcyjne dla lekarza prowadzącego:</span>
        </div>
        <p className="pl-5">
          {prediction.clinicalSummary}
        </p>
        <p className="pl-5 text-[11px] opacity-90 italic">
          💡 <strong>Zalecenie:</strong> {prediction.recommendation}
        </p>
      </div>
    </div>
  );
};
