import React from 'react';
import { Calendar, History as HistoryIcon, Target, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { WeightGoal } from '../services/WeightGoalService';

export interface BmiChartPointData {
  recordId?: string;
  timestamp: string | number;
  date: string;
  time?: string;
  bmi: number;
  weight?: number;
  height?: number;
  diagnosis?: string;
  icd10Code?: string;
  symptoms?: string;
  medications?: string;
  isSafeMeds?: boolean;
}

interface CustomBmiTooltipProps {
  active?: boolean;
  payload?: any[];
  onSelectVisit?: (recordId: string) => void;
  weightGoal?: WeightGoal | null;
}

export const CustomBmiTooltip: React.FC<CustomBmiTooltipProps> = ({
  active,
  payload,
  onSelectVisit,
  weightGoal,
}) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload as BmiChartPointData | undefined;
  if (!data) return null;

  const numBmi = Number(data.bmi);
  let category = 'Norma';
  let categoryBadgeClass = 'text-emerald-400 bg-emerald-950/70 border-emerald-700/60';
  let categoryBg = 'bg-emerald-500';

  if (numBmi < 18.5) {
    category = 'Niedowaga (<18.5)';
    categoryBadgeClass = 'text-blue-400 bg-blue-950/70 border-blue-700/60';
    categoryBg = 'bg-blue-500';
  } else if (numBmi < 25) {
    category = 'Norma (18.5 - 24.9)';
    categoryBadgeClass = 'text-emerald-400 bg-emerald-950/70 border-emerald-700/60';
    categoryBg = 'bg-emerald-500';
  } else if (numBmi < 30) {
    category = 'Nadwaga (25.0 - 29.9)';
    categoryBadgeClass = 'text-amber-400 bg-amber-950/70 border-amber-700/60';
    categoryBg = 'bg-amber-500';
  } else {
    category = 'Otyłość (≥30.0)';
    categoryBadgeClass = 'text-rose-400 bg-rose-950/70 border-rose-700/60';
    categoryBg = 'bg-rose-500';
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.recordId && onSelectVisit) {
      onSelectVisit(data.recordId);
    }
  };

  return (
    <div
      className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl text-slate-100 text-xs min-w-[270px] max-w-xs space-y-2.5 pointer-events-auto select-none"
      onClick={handleActionClick}
    >
      {/* Nagłówek wizyty */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <Calendar size={13} className="text-emerald-400 shrink-0" />
          <span>{data.date}</span>
          {data.time && <span className="text-slate-400 font-normal">• {data.time}</span>}
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${categoryBadgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${categoryBg}`} />
          {category.split(' ')[0]}
        </span>
      </div>

      {/* Parametry BMI i Wagi */}
      <div className="grid grid-cols-2 gap-2 bg-slate-800/70 rounded-lg p-2.5 border border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Wskaźnik BMI</span>
          <span className="text-sm font-bold text-purple-300 font-mono flex items-baseline gap-1">
            {data.bmi}
            <span className="text-[10px] font-normal text-slate-400 font-sans">kg/m²</span>
          </span>
        </div>
        {data.weight !== undefined && (
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Masa Ciała</span>
            <span className="text-sm font-bold text-cyan-300 font-mono flex items-baseline gap-1">
              {data.weight}
              <span className="text-[10px] font-normal text-slate-400 font-sans">kg</span>
            </span>
          </div>
        )}
      </div>

      {/* Relacja z celem wagi pacjenta */}
      {weightGoal && data.weight !== undefined && (
        <div className="p-2 rounded-lg bg-purple-950/50 border border-purple-800/60 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-purple-300">
            <Target size={13} className="text-purple-400 shrink-0" />
            <span>Cel: <strong>{weightGoal.targetWeight} kg</strong></span>
          </div>
          <div className="font-mono font-bold">
            {data.weight <= weightGoal.targetWeight ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Cel osiągnięty
              </span>
            ) : (
              <span className="text-amber-300">
                +{(data.weight - weightGoal.targetWeight).toFixed(1)} kg do celu
              </span>
            )}
          </div>
        </div>
      )}

      {/* Diagnoza z wizyty */}
      {data.diagnosis && (
        <div className="pt-0.5 text-[11px] text-slate-300 leading-snug">
          <span className="text-slate-400 font-medium">Diagnoza: </span>
          <span className="font-semibold text-slate-100">{data.diagnosis}</span>
          {data.icd10Code && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded text-[10px] font-mono border border-slate-700">
              {data.icd10Code}
            </span>
          )}
        </div>
      )}

      {/* Przycisk przejścia do historii */}
      {data.recordId ? (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleActionClick}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/40 cursor-pointer group"
          >
            <HistoryIcon size={14} className="group-hover:rotate-12 transition-transform text-emerald-100" />
            <span>Zobacz tę wizytę w historii</span>
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            💡 Kliknij przycisk lub punkt na wykresie
          </p>
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 italic text-center pt-0.5">
          Pomiar z bieżących parametrów pacjenta
        </div>
      )}
    </div>
  );
};
