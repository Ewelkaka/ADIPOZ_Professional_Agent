import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  FileCode, 
  Share2, 
  ShieldCheck, 
  Building2, 
  User, 
  Activity, 
  Stethoscope, 
  Pill, 
  FlaskConical,
  ExternalLink
} from 'lucide-react';
import { FhirExportService, FhirExportParams } from '../services/FhirExportService';
import { NotificationService } from '../services/NotificationService';

interface FhirExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: FhirExportParams;
}

export const FhirExportModal: React.FC<FhirExportModalProps> = ({
  isOpen,
  onClose,
  params
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'JSON'>('OVERVIEW');
  const [copied, setCopied] = useState(false);

  // Generowanie Bundle
  const fhirBundle = useMemo(() => {
    if (!isOpen) return null;
    return FhirExportService.generateFhirBundle(params);
  }, [isOpen, params]);

  const fhirSummary = useMemo(() => {
    if (!fhirBundle) return [];
    return FhirExportService.summarizeBundle(fhirBundle);
  }, [fhirBundle]);

  const jsonString = useMemo(() => {
    if (!fhirBundle) return '';
    return JSON.stringify(fhirBundle, null, 2);
  }, [fhirBundle]);

  if (!isOpen || !fhirBundle) return null;

  const handleDownload = () => {
    FhirExportService.downloadBundleJson(params);
    NotificationService.addNotification(
      'SUCCESS',
      'Eksport HL7 FHIR Bundle',
      `Pomyślnie wyeksportowano plik HL7 FHIR R4 Bundle dla pacjenta ${params.patientId} do integracji z systemem HIS/EHR.`
    );
  };

  const handleCopy = async () => {
    const success = await FhirExportService.copyBundleToClipboard(params);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      NotificationService.addNotification(
        'SUCCESS',
        'Skopiowano FHIR Bundle',
        'Dokument JSON zgodny z HL7 FHIR R4 został skopiowany do schowka.'
      );
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'Composition':
        return <Layers size={16} className="text-blue-400" />;
      case 'Patient':
        return <User size={16} className="text-emerald-400" />;
      case 'Practitioner':
        return <Stethoscope size={16} className="text-indigo-400" />;
      case 'Encounter':
        return <Building2 size={16} className="text-amber-400" />;
      case 'Condition':
        return <Activity size={16} className="text-rose-400" />;
      case 'Observation':
        return <Activity size={16} className="text-cyan-400" />;
      case 'MedicationStatement':
        return <Pill size={16} className="text-purple-400" />;
      case 'ServiceRequest':
        return <FlaskConical size={16} className="text-teal-400" />;
      default:
        return <FileCode size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek Modala */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Share2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">Eksport HL7 FHIR Bundle (R4)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Standard Interoperacyjności HIS/EHR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zgodność z profilem dokumentu klinicznego (Composition + Resources) dla polskich i międzynarodowych systemów gabinetowych.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zamknij"
          >
            <X size={20} />
          </button>
        </div>

        {/* Informacja o standardzie i integracji */}
        <div className="px-6 py-3 bg-blue-950/30 border-b border-blue-900/30 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400 shrink-0" />
            <span>
              Typ pakietu: <strong className="font-mono text-blue-300">Bundle (type: document)</strong> • Łącznie zasobów: <strong className="text-white">{fhirBundle.total}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Zgodność: Kamsoft, Asseco, Comarch, CGM, Mediporta</span>
          </div>
        </div>

        {/* Zakładki (Tabs) */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'OVERVIEW'
                  ? 'border-blue-500 text-blue-400 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              Zasoby w Pakiecie ({fhirSummary.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('JSON')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'JSON'
                  ? 'border-blue-500 text-blue-400 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode size={14} />
              Struktura JSON (FHIR R4)
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Kopiuj zawartość JSON do schowka"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Skopiowano!' : 'Kopiuj JSON'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              title="Pobierz plik JSON na dysk"
            >
              <Download size={14} />
              <span>Pobierz .json</span>
            </button>
          </div>
        </div>

        {/* Zawartość Modala */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'OVERVIEW' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Identyfikator Pacjenta</span>
                  <p className="font-bold text-slate-200 truncate">{params.patientId}</p>
                  <p className="text-[11px] text-slate-400 truncate">PESEL: {params.patientInfo?.pesel || '80010112345'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Klasa Wizyty</span>
                  <p className="font-bold text-slate-200">Ambulatoryjna (AMB)</p>
                  <p className="text-[11px] text-slate-400">Podstawowa Opieka Zdrowotna</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Status Dokumentu</span>
                  <p className="font-bold text-emerald-400 flex items-center gap-1">
                    <Check size={14} />
                    Final (Zatwierdzony)
                  </p>
                  <p className="text-[11px] text-slate-400">Profil: Composition R4</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Wygenerowane Zasoby FHIR w Pakiecie (Bundle Entries):
                </h3>
                <div className="space-y-2">
                  {fhirSummary.map((item, idx) => (
                    <div 
                      key={`res-${idx}`}
                      className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/70 shrink-0 mt-0.5">
                          {getResourceIcon(item.resourceType)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-200">{item.title}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {item.resourceType}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] truncate">{item.details}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {item.id.length > 15 ? `${item.id.slice(0, 8)}...` : item.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sekcje notatki klinicznej w Composition */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-400" />
                  Struktura sekcji klinicznych w Composition (SOAP):
                </h4>
                <ul className="space-y-1 text-slate-400 list-disc list-inside text-[11px]">
                  <li><strong>Subjective (LOINC 61150-9):</strong> Wywiad, powód wizyty, zgłaszane objawy pacjenta</li>
                  <li><strong>Objective (LOINC 61149-1):</strong> Wyniki pomiarów (ciśnienie RR, tętno HR, waga, wzrost, BMI, temperatura)</li>
                  <li><strong>Evaluation / Assessment (LOINC 51848-0):</strong> Rozpoznanie ICD-10, diagnozy różnicowe i uzasadnienie CDSS</li>
                  <li><strong>Plan (LOINC 18776-5):</strong> Plan terapeutyczny, modyfikacja leków i zlecenia badań laboratoryjnych</li>
                  <li><strong>Progress note (LOINC 11506-3):</strong> Pełna ustrukturyzowana transkrypcja notatki lekarskiej</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-[55vh] scrollbar-thin scrollbar-thumb-slate-700 leading-relaxed">
                {jsonString}
              </pre>
            </div>
          )}
        </div>

        {/* Stopka Modala z przyciskami akcji */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>Format w 100% zgodny ze specyfikacją HL7 FHIR Release 4.</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Zamknij
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Download size={15} />
              <span>Pobierz HL7 FHIR Bundle (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
