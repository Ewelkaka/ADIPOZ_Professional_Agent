// src/components/EReceptaRiskIndicator.tsx
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Info, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  ExternalLink,
  Scale
} from 'lucide-react';
import { EReceptaRiskService, EReceptaRiskAnalysis } from '../services/EReceptaRiskService';
import { EReceptaData } from '../services/EReceptaService';
import { EReceptaRiskAuditModal } from './EReceptaRiskAuditModal';

interface EReceptaRiskIndicatorProps {
  eReceptaData: EReceptaData;
  onDownloadConfirmed?: () => void;
  className?: string;
  variant?: 'compact' | 'detailed' | 'banner';
}

export const EReceptaRiskIndicator: React.FC<EReceptaRiskIndicatorProps> = ({
  eReceptaData,
  onDownloadConfirmed,
  className = '',
  variant = 'detailed'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Analiza ryzyka w czasie rzeczywistym
  const riskAnalysis: EReceptaRiskAnalysis = React.useMemo(() => {
    return EReceptaRiskService.analyzeEReceptaRisk(eReceptaData);
  }, [eReceptaData]);

  const getStyleProps = () => {
    switch (riskAnalysis.riskLevel) {
      case 'LOW':
        return {
          containerBg: 'bg-emerald-950/60 hover:bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
          barColor: 'bg-emerald-400',
          icon: <ShieldCheck size={16} className="text-emerald-400 shrink-0" />,
          label: 'Niskie Ryzyko NFZ',
          tag: 'Pełna zgodność CeZ/NFZ'
        };
      case 'MODERATE':
        return {
          containerBg: 'bg-amber-950/60 hover:bg-amber-950/80 border-amber-500/40 text-amber-300',
          badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
          barColor: 'bg-amber-400',
          icon: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
          label: 'Średnie Ryzyko NFZ',
          tag: `${riskAnalysis.warningsCount} uwag do weryfikacji`
        };
      case 'HIGH':
      case 'CRITICAL':
      default:
        return {
          containerBg: 'bg-rose-950/70 hover:bg-rose-950/90 border-rose-500/50 text-rose-300',
          badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
          barColor: 'bg-rose-400',
          icon: <XCircle size={16} className="text-rose-400 shrink-0" />,
          label: 'Wysokie Ryzyko NFZ',
          tag: `${riskAnalysis.criticalIssuesCount} błędów krytycznych`
        };
    }
  };

  const style = getStyleProps();

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${style.containerBg} ${className}`}
          title="Kliknij, aby otworzyć szczegółowy audyt NFZ dla e-Recepty"
        >
          {style.icon}
          <span className="font-bold">{style.label}</span>
          <span className="text-[10px] opacity-80">({riskAnalysis.compliancePercentage}%)</span>
        </button>

        <EReceptaRiskAuditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          analysis={riskAnalysis}
          eReceptaData={eReceptaData}
          onDownloadConfirmed={onDownloadConfirmed}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`p-3 rounded-xl border transition-all cursor-pointer select-none group relative overflow-hidden ${style.containerBg} ${className}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-black/20 shrink-0 mt-0.5 sm:mt-0">
              {style.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs tracking-wide">
                  Stopień ryzyka e-Recepty:
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${style.badgeBg}`}>
                  {style.label} ({riskAnalysis.compliancePercentage}% zgodności NFZ)
                </span>
                {riskAnalysis.criticalIssuesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-500/30 text-rose-300 border border-rose-400/40">
                    ❌ {riskAnalysis.criticalIssuesCount} błąd(y)
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90 line-clamp-1 mt-0.5">
                {riskAnalysis.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <div className="hidden md:flex flex-col items-end text-[10px] opacity-75">
              <span>{riskAnalysis.checksPassed}/{riskAnalysis.totalChecks} reguł zaliczonych</span>
              <span>CeZ P1 v1.4 & NFZ</span>
            </div>
            <span className="text-xs font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Raport audytu <ChevronRight size={14} />
            </span>
          </div>
        </div>

        {/* Wskaźnik postępu zgodności */}
        <div className="mt-2.5 w-full bg-black/30 h-1.5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${style.barColor}`}
            style={{ width: `${riskAnalysis.compliancePercentage}%` }}
          />
        </div>
      </div>

      <EReceptaRiskAuditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        analysis={riskAnalysis}
        eReceptaData={eReceptaData}
        onDownloadConfirmed={onDownloadConfirmed}
      />
    </>
  );
};
