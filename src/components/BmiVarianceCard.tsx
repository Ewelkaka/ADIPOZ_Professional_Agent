import React, { useState } from 'react';
import { 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  Stethoscope,
  Clock
} from 'lucide-react';
import { BmiVarianceAnalysis, BmiVarianceService } from '../services/BmiVarianceService';

interface BmiVarianceCardProps {
  varianceAnalysis: BmiVarianceAnalysis | null;
  onNavigateToVisit?: (recordId: string) => void;
  threshold?: number;
  onThresholdChange?: (threshold: number) => void;
}

export const BmiVarianceCard: React.FC<BmiVarianceCardProps> = ({
  varianceAnalysis,
  onNavigateToVisit,
  threshold = BmiVarianceService.DEFAULT_THRESHOLD,
  onThresholdChange
}) => {
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showThresholdSelector, setShowThresholdSelector] = useState(false);

  if (!varianceAnalysis) {
    return (
      <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-start gap-3 text-slate-600 dark:text-slate-400">
        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-500">
          <Activity size={18} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-0.5">
            Wariancja BMI między wizytami
          </p>
          <p className="text-xs leading-relaxed">
            Do wyliczenia wariancji i dynamiki BMI wymagane są co najmniej <strong>dwie zarejestrowane wizyty</strong> z pomiarem wagi i wzrostu. 
            Po zatwierdzeniu bieżącej analizy moduł automatycznie aktywuje detekcję zbyt szybkiej utraty lub przyrostu masy ciała.
          </p>
        </div>
      </div>
    );
  }

  const {
    latestVisit,
    previousVisit,
    currentBmi,
    previousBmi,
    deltaBmi,
    absDeltaBmi,
    variance,
    currentWeight,
    previousWeight,
    deltaWeight,
    percentWeightChange,
    daysBetween,
    paceKgPerWeek,
    hasAlert,
    alertType,
    severity,
    title,
    message,
    clinicalExplanation,
    redFlags,
    recommendations,
    differentialDiagnoses
  } = varianceAnalysis;

  const isLoss = deltaBmi < 0;
  const isCritical = severity === 'CRITICAL';

  return (
    <div className={`mb-6 rounded-2xl border transition-all shadow-sm overflow-hidden ${
      hasAlert 
        ? isLoss
          ? 'bg-red-50/70 dark:bg-red-950/25 border-red-200 dark:border-red-900/60 ring-1 ring-red-300 dark:ring-red-900/40'
          : 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60 ring-1 ring-amber-300 dark:ring-amber-900/40'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`}>
      {/* Nagłówek modułu */}
      <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
            hasAlert
              ? isLoss
                ? 'bg-red-600 text-white shadow-red-600/30'
                : 'bg-amber-600 text-white shadow-amber-600/30'
              : 'bg-purple-600 text-white shadow-purple-600/30'
          }`}>
            {hasAlert ? (
              isLoss ? <TrendingDown size={20} /> : <TrendingUp size={20} />
            ) : (
              <Activity size={20} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Wariancja BMI między wizytami
              </h3>
              {hasAlert ? (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isLoss
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-amber-600 text-white'
                }`}>
                  <AlertTriangle size={12} />
                  {isLoss ? `Spadek o ${absDeltaBmi} pkt BMI` : `Wzrost o +${absDeltaBmi} pkt BMI`}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  W normie klinicznej ({deltaBmi > 0 ? `+${deltaBmi}` : deltaBmi} pkt)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Porównanie dwóch ostatnich punktów konsultacyjnych (odstęp: <strong>{daysBetween} dni</strong>)
            </p>
          </div>
        </div>

        {/* Selektor progu alertu */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onThresholdChange && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThresholdSelector(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
                title="Dostosuj próg różnicy BMI wyzwalający alert ostrzegawczy"
              >
                <SlidersHorizontal size={12} className="text-slate-500" />
                <span>Próg: &gt; {threshold} pkt BMI</span>
                <ChevronDown size={12} />
              </button>

              {showThresholdSelector && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-20">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase">
                    Wybierz próg alertu:
                  </div>
                  {[1.5, 2.0, 2.5, 3.0].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        onThresholdChange(t);
                        setShowThresholdSelector(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        threshold === t 
                          ? 'font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>Różnica &gt; {t} pkt BMI</span>
                      {threshold === t && <CheckCircle2 size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Siatka porównawcza: Ostatnia vs Poprzednia wizyta oraz metryki różnicy */}
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Karta 1: Ostatnia Wizyta */}
          <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Clock size={11} />
              {latestVisit.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {currentBmi}
              </span>
              <span className="text-xs text-slate-500 font-medium">BMI</span>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
              {currentWeight} kg <span className="text-slate-400">({latestVisit.date})</span>
            </div>
          </div>

          {/* Karta 2: Poprzednia Wizyta */}
          <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                Poprzednia wizyta
              </span>
              {previousVisit.recordId && onNavigateToVisit && (
                <button
                  type="button"
                  onClick={() => onNavigateToVisit(previousVisit.recordId!)}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                  title="Zobacz dane tej wizyty w historii"
                >
                  Otwórz <ArrowRight size={10} />
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {previousBmi}
              </span>
              <span className="text-xs text-slate-500 font-medium">BMI</span>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
              {previousWeight} kg <span className="text-slate-400">({previousVisit.date})</span>
            </div>
          </div>

          {/* Karta 3: Różnica BMI i Wariancja */}
          <div className={`p-3.5 rounded-xl border shadow-xs ${
            hasAlert
              ? isLoss
                ? 'bg-red-100/50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50'
                : 'bg-amber-100/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50'
              : 'bg-white/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80'
          }`}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Różnica Δ BMI i Wariancja (σ²)
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold ${
                hasAlert 
                  ? isLoss ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {deltaBmi > 0 ? `+${deltaBmi}` : deltaBmi}
              </span>
              <span className="text-xs text-slate-500 font-medium">pkt BMI</span>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
              <span>Wariancja (Δ²): <strong>{variance}</strong></span>
            </div>
          </div>

          {/* Karta 4: Dynamika Wagi */}
          <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Dynamika Masy Ciała
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-extrabold ${
                deltaWeight < 0 ? 'text-blue-600 dark:text-blue-400' : deltaWeight > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700'
              }`}>
                {deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight} kg
              </span>
              <span className="text-xs text-slate-500 font-medium">({percentWeightChange > 0 ? `+${percentWeightChange}` : percentWeightChange}%)</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tempo: <strong>{paceKgPerWeek > 0 ? `+${paceKgPerWeek}` : paceKgPerWeek} kg/tydz.</strong>
            </div>
          </div>
        </div>

        {/* Automatyczny Alert Ostrzegawczy, gdy przekroczony próg */}
        {hasAlert && (
          <div className={`rounded-xl p-4 border mb-3 ${
            isLoss 
              ? 'bg-red-500/10 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              : 'bg-amber-500/10 dark:bg-amber-900/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                isLoss ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold tracking-tight">
                    {title}
                  </h4>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isCritical 
                      ? 'bg-red-600 text-white' 
                      : 'bg-amber-600 text-white'
                  }`}>
                    {severity === 'CRITICAL' ? 'STAN ALARMOWY' : 'OSTRZEŻENIE KLINICZNE'}
                  </span>
                </div>
                
                <p className="text-xs leading-relaxed mt-1 font-medium">
                  {message}
                </p>

                <p className="text-xs leading-relaxed mt-2 opacity-90 italic">
                  {clinicalExplanation}
                </p>

                {/* Czerwone Flagi (Red Flags) */}
                {redFlags.length > 0 && (
                  <div className="mt-3 p-2.5 bg-white/70 dark:bg-slate-900/50 rounded-lg border border-red-200/60 dark:border-red-900/40">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block mb-1">
                      Czerwone Flagi Kliniczne:
                    </span>
                    <ul className="text-xs space-y-1">
                      {redFlags.map((flag, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Toggle Rekomendacji i Diagnoz Różnicowych */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowRecommendations(prev => !prev)}
                    className="text-xs font-bold flex items-center gap-1.5 hover:underline focus:outline-hidden"
                  >
                    <Stethoscope size={14} />
                    <span>{showRecommendations ? 'Ukryj zalecany pakiet diagnostyczny' : 'Rozwiń zalecany pakiet diagnostyczny'}</span>
                    {showRecommendations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Wytyczne POZ / Medycyna Rodzinna
                  </span>
                </div>

                {/* Rozwinięty pakiet badań i diagnoz różnicowych */}
                {showRecommendations && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        Zalecane Badania i Działania:
                      </p>
                      <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                        {recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white/90 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Info size={13} className="text-blue-500" />
                        Diagnostyka Różnicowa (Potencjalne Przyczyny):
                      </p>
                      <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                        {differentialDiagnoses.map((dd, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-purple-600 font-bold shrink-0">•</span>
                            <span>{dd}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Informacja o stabilnym stanie gdy brak alertu */}
        {!hasAlert && (
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Prawidłowa dynamika:</strong> Wariancja BMI między ostatnimi wizytami wynosi <strong>{variance}</strong> (zmiana o {deltaBmi > 0 ? `+${deltaBmi}` : deltaBmi} pkt BMI), co nie przekracza progu ostrzegawczego {threshold} pkt. Brak sygnałów gwałtownej utraty lub przyrostu masy ciała.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
