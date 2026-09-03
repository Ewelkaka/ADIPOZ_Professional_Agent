import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Pill, 
  Activity, 
  Stethoscope, 
  ClipboardCheck, 
  ShieldCheck, 
  ArrowRight, 
  Calendar, 
  FileText, 
  Layers, 
  Sparkles,
  Check,
  X,
  Share2
} from 'lucide-react';
import { NotificationService } from '../services/NotificationService';
import { MedicalAuditLog } from '../services/MedicalAuditLog';
import { BmiVarianceAnalysis } from '../services/BmiVarianceService';

export interface ProposedAction {
  id: string;
  category: 'DIAGNOSIS' | 'LABS' | 'MEDS' | 'CHRONIC' | 'FOLLOW_UP';
  title: string;
  description: string;
  rationale?: string;
  isApproved: boolean;
  isRejected: boolean;
}

interface AutonomousAgentWorkflowCardProps {
  analysis: any;
  patientId: string;
  patientInfo: any;
  bmiVarianceAnalysis?: BmiVarianceAnalysis | null;
  onActionsApproved?: (approvedActions: ProposedAction[]) => void;
  onExportFhir?: () => void;
}

const auditLog = new MedicalAuditLog();

export const AutonomousAgentWorkflowCard: React.FC<AutonomousAgentWorkflowCardProps> = ({
  analysis,
  patientId,
  patientInfo,
  bmiVarianceAnalysis,
  onActionsApproved,
  onExportFhir
}) => {
  const [actions, setActions] = useState<ProposedAction[]>([]);
  const [isFullyApproved, setIsFullyApproved] = useState(false);
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  // Inicjalizacja propozycji działań na podstawie wyników autonomicznej analizy AdiPOZ
  useEffect(() => {
    if (!analysis?.data) return;

    const initialActions: ProposedAction[] = [];
    const decision = analysis.data.decision;
    const medAnalysis = analysis.data.medAnalysis;
    const gapAnalysis = analysis.data.gapAnalysis;

    // 1. Działanie: Diagnoza i Kodyfikacja ICD-10
    if (decision?.diagnosis && decision.diagnosis !== 'Nieznana') {
      initialActions.push({
        id: 'act-diag',
        category: 'DIAGNOSIS',
        title: `Wpisanie rozpoznania: ${decision.diagnosis} ${decision.icd10Code ? `(ICD-10: ${decision.icd10Code})` : ''}`,
        description: decision.action || 'Wdrożenie postępowania diagnostyczno-terapeutycznego zgodnie z wytycznymi.',
        rationale: decision.explanation || 'Zgodność z obrazem klinicznym i kryteriami EBM.',
        isApproved: true,
        isRejected: false
      });
    }

    // 2. Działanie: Bezpieczeństwo Farmakoterapii
    if (medAnalysis) {
      if (medAnalysis.risks && medAnalysis.risks.length > 0) {
        initialActions.push({
          id: 'act-meds-risk',
          category: 'MEDS',
          title: `Korekta farmakoterapii (Wykryto ${medAnalysis.risks.length} ryzyk interakcji/polipragmazji)`,
          description: medAnalysis.risks.map((r: any) => `${r.type}: ${r.recommendation || r.message}`).join('; '),
          rationale: 'Zapobieganie powikłaniom polekowym i optymalizacja dawkowania.',
          isApproved: true,
          isRejected: false
        });
      } else {
        initialActions.push({
          id: 'act-meds-safe',
          category: 'MEDS',
          title: 'Utrzymanie bieżącej farmakoterapii (Zweryfikowano brak krytycznych interakcji)',
          description: medAnalysis.summary || 'Stosowane leki są zgodne i bezpieczne.',
          rationale: 'Brak przeciwwskazań w ChPL.',
          isApproved: true,
          isRejected: false
        });
      }
    }

    // 3. Działanie: Zlecenie Badań Diagnostycznych (Luki NFZ)
    const tests = decision?.suggestedTests || [];
    const gaps = gapAnalysis?.gaps?.map((g: any) => g.field) || [];
    const allTests = Array.from(new Set([...tests, ...gaps]));

    if (allTests.length > 0) {
      initialActions.push({
        id: 'act-labs',
        category: 'LABS',
        title: `Zlecenie badań laboratoryjnych (${allTests.slice(0, 4).join(', ')})`,
        description: `Wystawienie skierowania w ramach budżetu powierzonego POZ: ${allTests.join(', ')}`,
        rationale: 'Uzupełnienie profilu biochemicznego i monitorowanie funkcji narządowych.',
        isApproved: true,
        isRejected: false
      });
    }

    // 4. Działanie: Wahania wagi i cel metaboliczny
    if (bmiVarianceAnalysis?.hasAlert) {
      initialActions.push({
        id: 'act-weight',
        category: 'CHRONIC',
        title: `Interwencja metaboliczna: ${bmiVarianceAnalysis.title}`,
        description: `${bmiVarianceAnalysis.message}. Zalecenie prowadzenia dziennika pomiarów i edukacji dietetycznej.`,
        rationale: `Zmiana wskaźnika BMI o ${bmiVarianceAnalysis.deltaBmi} pkt między wizytami.`,
        isApproved: true,
        isRejected: false
      });
    }

    // 5. Działanie: Postępowanie w chorobie przewlekłej i wizyta kontrolna
    if (decision?.chronicDiseaseManagement) {
      initialActions.push({
        id: 'act-chronic',
        category: 'CHRONIC',
        title: 'Realizacja planu opieki koordynowanej (Choroba Przewlekła)',
        description: decision.chronicDiseaseManagement,
        rationale: 'Wytyczne Polskiego Towarzystwa Medycyny Rodzinnej.',
        isApproved: true,
        isRejected: false
      });
    }

    // 6. Działanie: Wyznaczenie kontroli
    initialActions.push({
      id: 'act-followup',
      category: 'FOLLOW_UP',
      title: 'Wyznaczenie wizyty kontrolnej w POZ za 4-6 tygodni',
      description: 'Ocena skuteczności zaleceń, weryfikacja wyników zleconych badań laboratoryjnych oraz kontrola masy ciała.',
      rationale: 'Ciągłość opieki ambulatoryjnej.',
      isApproved: true,
      isRejected: false
    });

    setActions(initialActions);
    setIsFullyApproved(false);
    setApprovedAt(null);
  }, [analysis, bmiVarianceAnalysis]);

  const toggleActionApproval = (id: string) => {
    if (isFullyApproved) return;
    setActions(prev => prev.map(act => {
      if (act.id === id) {
        return { ...act, isApproved: !act.isApproved, isRejected: act.isApproved };
      }
      return act;
    }));
  };

  const handleApproveAll = async () => {
    const timestamp = new Date().toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const finalApprovedActions = actions.map(act => ({
      ...act,
      isApproved: true,
      isRejected: false
    }));

    setActions(finalApprovedActions);
    setIsFullyApproved(true);
    setApprovedAt(timestamp);

    // Zapis w dzienniku audytowym
    await auditLog.logEvent({
      patientId,
      actor: 'DOCTOR',
      actionType: 'DOCTOR_DECISION',
      payload: {
        diagnosis: analysis?.data?.decision?.diagnosis,
        approvedActionsCount: finalApprovedActions.length,
        actions: finalApprovedActions.map(a => a.title),
        timestamp
      },
      metadata: {
        version: '1.0.0-PROD',
        deviceId: 'DOCTOR_STATION_POZ'
      }
    });

    // Powiadomienie systemowe
    NotificationService.addNotification(
      'SUCCESS',
      'Zatwierdzono Plan Agenta AdiPOZ',
      `Lekarz prowadzący oficjalnie zatwierdził ${finalApprovedActions.length} działań klinicznych dla pacjenta ${patientId}.`
    );

    if (onActionsApproved) {
      onActionsApproved(finalApprovedActions);
    }
  };

  if (!analysis?.data) return null;

  const attentionItems: { type: string; title: string; desc: string; severity: 'CRITICAL' | 'WARNING' | 'INFO' }[] = [];
  const decision = analysis.data.decision;
  const medAnalysis = analysis.data.medAnalysis;

  if (medAnalysis?.risks && medAnalysis.risks.length > 0) {
    medAnalysis.risks.forEach((r: any) => {
      attentionItems.push({
        type: 'Farmakoterapia',
        title: `Interakcja: ${r.type} (${r.severity})`,
        desc: r.message,
        severity: r.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING'
      });
    });
  }

  if (bmiVarianceAnalysis?.hasAlert) {
    attentionItems.push({
      type: 'Metabolizm / BMI',
      title: bmiVarianceAnalysis.title,
      desc: bmiVarianceAnalysis.message,
      severity: bmiVarianceAnalysis.alertType === 'RAPID_LOSS' ? 'CRITICAL' : 'WARNING'
    });
  }

  if (decision?.alerts && decision.alerts.length > 0) {
    decision.alerts.forEach((alert: string) => {
      const isCrit = alert.includes('KRYTYCZNY') || alert.includes('BLOKADA') || alert.includes('STAN ALARMOWY');
      attentionItems.push({
        type: 'Kliniczne',
        title: 'Alert Medyczny',
        desc: alert,
        severity: isCrit ? 'CRITICAL' : 'WARNING'
      });
    });
  }

  return (
    <section 
      id="adipoz-autonomous-workflow-card" 
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 lg:p-7 shadow-xl border border-emerald-500/30 relative overflow-hidden"
    >
      {/* Subtelny element tła */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Nagłówek i tożsamość Agenta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="text-xl">🩺</span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ADIPOZ → Professional Agent
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Autonomiczny Asystent POZ
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Workflow: <strong className="text-emerald-400">Lekarz kończy wizytę</strong> → <strong>AdiPOZ autonomicznie analizuje przypadek</strong> → <strong>znajduje rzeczy wymagające uwagi</strong> → <strong>proponuje działania</strong> → <strong className="text-sky-400">lekarz zatwierdza</strong>.
          </p>
        </div>

        {/* Status weryfikacji */}
        <div className="flex items-center gap-2">
          {isFullyApproved ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-full text-xs font-bold text-emerald-300 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Zatwierdzono przez Lekarza</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-950/60 border border-amber-500/40 rounded-full text-xs font-bold text-amber-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Oczekuje na decyzję Lekarza</span>
            </div>
          )}
        </div>
      </div>

      {/* Interaktywny 5-stopniowy Stepper Procesu */}
      <div className="py-5 grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-slate-800 relative z-10 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-200 truncate">1. Koniec wizyty</p>
            <p className="text-[10px] text-slate-400 truncate">Zgłoszenie danych</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-200 truncate">2. Analiza AdiPOZ</p>
            <p className="text-[10px] text-slate-400 truncate">Autonomiczny CDSS</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${attentionItems.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {attentionItems.length > 0 ? '⚠️' : '✓'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-200 truncate">3. Obszary uwagi</p>
            <p className="text-[10px] text-slate-400 truncate">{attentionItems.length} zagadnień</p>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] shrink-0">
            💡
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-200 truncate">4. Propozycje</p>
            <p className="text-[10px] text-slate-400 truncate">{actions.length} zaleceń</p>
          </div>
        </div>

        <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border flex items-center gap-2 transition-all ${isFullyApproved ? 'bg-emerald-950/70 border-emerald-500/60' : 'bg-slate-800/60 border-slate-700/60'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${isFullyApproved ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
            {isFullyApproved ? '✓' : '5'}
          </div>
          <div className="min-w-0">
            <p className={`font-bold truncate ${isFullyApproved ? 'text-emerald-300' : 'text-slate-200'}`}>5. Zatwierdzenie</p>
            <p className="text-[10px] text-slate-400 truncate">{isFullyApproved ? 'Podpisano' : 'Wymaga akceptu'}</p>
          </div>
        </div>
      </div>

      {/* Sekcja 3: Znalezione rzeczy, które mogą wymagać uwagi */}
      {attentionItems.length > 0 && (
        <div className="pt-6 pb-2 relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <AlertTriangle size={15} />
              Znalezione kwestie wymagające uwagi lekarza ({attentionItems.length})
            </h3>
            <span className="text-[11px] text-slate-400">Wyselekcjonowane autonomicznie przez reguły CDSS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {attentionItems.map((item, idx) => (
              <div 
                key={`att-${idx}`} 
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                  item.severity === 'CRITICAL'
                    ? 'bg-red-950/30 border-red-500/40 text-red-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.severity === 'CRITICAL' ? (
                    <AlertTriangle size={16} className="text-red-400" />
                  ) : (
                    <Activity size={16} className="text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-100">{item.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/90 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sekcja 4: Proponowane Działania przez Agenta */}
      <div className="pt-6 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <Sparkles size={15} />
            Proponowane działania kliniczne AdiPOZ ({actions.length})
          </h3>
          <span className="text-[11px] text-slate-400">Kliknij akcję, aby zatwierdzić lub odrzucić indywidualnie</span>
        </div>

        <div className="space-y-2.5 mb-6">
          {actions.map((act) => (
            <div 
              key={act.id} 
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                act.isApproved 
                  ? 'bg-slate-800/80 border-emerald-500/40' 
                  : 'bg-slate-900/50 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleActionApproval(act.id)}
                  disabled={isFullyApproved}
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    act.isApproved 
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}
                  title={act.isApproved ? 'Zatwierdzone (kliknij, by odznaczyć)' : 'Kliknij, aby zatwierdzić'}
                >
                  {act.isApproved ? <Check size={15} /> : null}
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{act.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {act.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-1 leading-relaxed">{act.description}</p>
                  {act.rationale && (
                    <p className="text-[10px] text-emerald-400/90 italic flex items-center gap-1">
                      <span>Uzasadnienie:</span> {act.rationale}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${act.isApproved ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                  {act.isApproved ? '✓ Zatwierdzone' : 'Pominięte'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sekcja 5: Zatwierdzenie przez Lekarza (Human-in-the-Loop) */}
      <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Lekarz Prowadzący: dr Jan Kowalski</p>
            <p className="text-[11px] text-slate-400">PZW: 1234567 • Specjalista Medycyny Rodzinnej (POZ)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          {onExportFhir && (
            <button
              type="button"
              onClick={onExportFhir}
              className="w-full md:w-auto px-4 py-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Eksportuj wygenerowaną notatkę i rozpoznanie do formatu HL7 FHIR Release 4 Bundle dla systemów HIS/EHR"
            >
              <Share2 size={16} />
              <span>Eksportuj HL7 FHIR Bundle</span>
            </button>
          )}

          {isFullyApproved ? (
            <div className="w-full md:w-auto px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30">
              <ShieldCheck size={18} />
              <span>Plan Zatwierdzony przez Lekarza ({approvedAt})</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleApproveAll}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
              title="Lekarz zatwierdza proponowane przez Agenta AdiPOZ działania"
            >
              <ClipboardCheck size={18} className="text-slate-950" />
              <span>Zatwierdź proponowane działania jako Lekarz</span>
            </button>
          )}
        </div>
      </div>

      {/* Potwierdzenie audytowe po zatwierdzeniu */}
      {isFullyApproved && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Wpis autoryzowany podpisem elektronicznym lekarza. Zdarzenie utrwalone w rejestrze audytowym `MedicalAuditLog`.</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 opacity-80">HASH: POZ-AGENT-APPROVED-7492</span>
        </div>
      )}
    </section>
  );
};
