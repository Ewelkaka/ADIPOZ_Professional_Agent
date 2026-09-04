import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Pill, 
  Heart, 
  Thermometer, 
  FileText, 
  Send, 
  UserCheck, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { PatientIntakeForm, PatientIntakeService } from '../services/PatientIntakeService';

interface PatientIntakeSurveyProps {
  patientId: string;
  patientName?: string;
  isStandalone?: boolean;
  onSubmitted?: (intake: PatientIntakeForm) => void;
  onClose?: () => void;
}

const PRIMARY_REASONS = [
  { id: 'infekcja', label: 'Infekcja / Przeziębienie / Gardło', icon: '🤒', desc: 'Ból gardła, gorączka, katar' },
  { id: 'oddechowe', label: 'Kaszel / Duszność', icon: '🫁', desc: 'Problemy z oddychaniem, kaszel' },
  { id: 'brzuch', label: 'Dolegliwości brzuszne / Żołądek', icon: '🍽️', desc: 'Ból brzucha, nudności, niestrawność' },
  { id: 'krazenie', label: 'Bóle głowy / Ciśnienie / Kołatania', icon: '💓', desc: 'Zawroty, skoki ciśnienia' },
  { id: 'waga', label: 'Kontrola wagi / Otyłość / Dieta', icon: '⚖️', desc: 'Konsultacja metaboliczna, redukcja' },
  { id: 'stawy', label: 'Bóle pleców / Stawów / Mięśni', icon: '🦴', desc: 'Ból kręgosłupa, ograniczenie ruchomości' },
  { id: 'przewlekle', label: 'Kontrola przewlekła / Recepty', icon: '💊', desc: 'Okresowe badania, kontynuacja leczenia' },
  { id: 'inne', label: 'Inny problem zdrowotny', icon: '🩺', desc: 'Inne dolegliwości niewymienione wyżej' }
];

const DURATION_OPTIONS = [
  'Od dzisiaj (nagły początek)',
  'Od 2-3 dni',
  'Około tygodnia (5-7 dni)',
  'Około 2-3 tygodni',
  'Przewlekle (ponad miesiąc)'
];

const COMMON_SYMPTOMS = [
  'Gorączka (>38°C)',
  'Stany podgorączkowe',
  'Dreszcze',
  'Suchy kaszel',
  'Mokry kaszel z flegmą',
  'Duszność / brak tchu',
  'Katar i zatkany nos',
  'Ból głowy',
  'Bóle mięśni i kości',
  'Ogólne osłabienie',
  'Nudności / wymioty',
  'Biegunka',
  'Zawroty głowy',
  'Kołatanie serca',
  'Spadek apetytu',
  'Niezamierzony spadek masy ciała',
  'Ból przy przełykaniu'
];

export const PatientIntakeSurvey: React.FC<PatientIntakeSurveyProps> = ({
  patientId,
  patientName,
  isStandalone = false,
  onSubmitted,
  onClose
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRIMARY_REASONS[0].label);
  const [customReason, setCustomReason] = useState<string>('');
  const [duration, setDuration] = useState<string>(DURATION_OPTIONS[1]);
  const [painSeverity, setPainSeverity] = useState<number>(4);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Ból głowy', 'Ogólne osłabienie']);
  const [medicationsTaken, setMedicationsTaken] = useState<string>('');
  const [measuredTemp, setMeasuredTemp] = useState<string>('');
  const [measuredBp, setMeasuredBp] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<PatientIntakeForm | null>(null);

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const intake: PatientIntakeForm = {
      id: `INTAKE-${Date.now()}`,
      patientId: patientId || 'PAC-12345',
      patientName: patientName || 'Pacjent POZ',
      submittedAt: new Date().toISOString(),
      primaryReason: selectedReason,
      reasonDetails: customReason.trim() ? customReason.trim() : undefined,
      duration,
      painSeverity,
      associatedSymptoms: selectedSymptoms,
      medicationsTaken: medicationsTaken.trim() ? medicationsTaken.trim() : undefined,
      measuredTemp: measuredTemp ? parseFloat(measuredTemp) : undefined,
      measuredBp: measuredBp.trim() ? measuredBp.trim() : undefined,
      additionalNotes: additionalNotes.trim() ? additionalNotes.trim() : undefined
    };

    // Symulacja krótkiego opóźnienia wysyłki sieciowej
    setTimeout(() => {
      PatientIntakeService.submitIntake(intake);
      setSubmittedData(intake);
      setIsSubmitting(false);
      setIsSubmitted(true);
      if (onSubmitted) {
        onSubmitted(intake);
      }
    }, 450);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSubmittedData(null);
    setSelectedSymptoms([]);
    setCustomReason('');
    setMedicationsTaken('');
    setAdditionalNotes('');
  };

  const getVasColor = (val: number) => {
    if (val === 0) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    if (val <= 3) return 'text-lime-600 bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800';
    if (val <= 6) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    if (val <= 8) return 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800';
    return 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
  };

  return (
    <div className={`w-full ${isStandalone ? 'min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 flex justify-center items-start' : 'p-1'}`}>
      <div className={`w-full ${isStandalone ? 'max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden' : ''}`}>
        
        {/* Nagłówek Ankiety Pacjenta */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-sm">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-100 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Rejestracja Przedwizytowa POZ
                </span>
                <h1 className="text-xl font-bold tracking-tight">Krótka Ankieta dla Pacjenta</h1>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-mono font-bold">
                ID: {patientId}
              </span>
              {patientName && (
                <p className="text-xs text-emerald-100 font-medium mt-0.5">{patientName}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-emerald-100 mt-3 max-w-xl leading-relaxed">
            Wypełnij poniższe pytania przed wejściem do gabinetu. Twoje odpowiedzi natychmiast trafią do lekarza i pozwolą na sprawniejszą wizytę.
          </p>
        </div>

        {isSubmitted ? (
          /* Ekran Sukcesu */
          <div className="p-8 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-lg">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Dziękujemy! Ankieta została przesłana 🎉
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Twoje dane zostały bezpiecznie przekazane do systemu gabinetowego lekarza POZ. Pole wywiadu w dokumentacji zostało automatycznie zaktualizowane.
              </p>
            </div>

            {submittedData && (
              <div className="max-w-lg mx-auto bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-sans">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Zarejestrowany wywiad:</span>
                  <span className="text-[11px] text-slate-500">{new Date(submittedData.submittedAt).toLocaleTimeString('pl-PL')}</span>
                </div>
                <p><strong>Główny powód:</strong> {submittedData.primaryReason} {submittedData.reasonDetails ? `(${submittedData.reasonDetails})` : ''}</p>
                <p><strong>Czas trwania:</strong> {submittedData.duration}</p>
                <p><strong>Nasilenie dolegliwości:</strong> {submittedData.painSeverity}/10</p>
                <p><strong>Zgłoszone objawy:</strong> {submittedData.associatedSymptoms.join(', ') || 'Brak'}</p>
                {submittedData.medicationsTaken && (
                  <p><strong>Przyjęte leki:</strong> {submittedData.medicationsTaken}</p>
                )}
                {submittedData.additionalNotes && (
                  <p><strong>Uwagi:</strong> {submittedData.additionalNotes}</p>
                )}
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                Wypełnij ponownie
              </button>

              {isStandalone ? (
                <a
                  href={`${window.location.origin}${window.location.pathname}`}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <UserCheck size={16} />
                  Przejdź do aplikacji lekarza
                </a>
              ) : onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  Zamknij okno
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          /* Formularz Ankiety */
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Krok 1: Główny powód wizyty */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">1</span>
                Jaki jest główny powód Twojej dzisiejszej wizyty?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRIMARY_REASONS.map((item) => {
                  const isSelected = selectedReason === item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedReason(item.label)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20' 
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <input 
                  type="text"
                  placeholder="Doprecyzuj powód wizyty (opcjonalnie, np. ból ucha od rana, podejrzenie anginy)..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Krok 2: Czas trwania i Nasilenie (VAS) */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">2</span>
                Od kiedy trwają objawy i jak bardzo są uciążliwe?
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-emerald-600" /> Czas trwania
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDuration(opt)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                        duration === opt 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suwak Skali Bólu VAS 0-10 */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Activity size={15} className="text-emerald-600" /> Nasilenie dolegliwości / bólu (Skala 0-10)
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${getVasColor(painSeverity)}`}>
                    {painSeverity === 0 ? '0 - Bez bólu' : `${painSeverity} / 10`}
                  </span>
                </div>

                <input 
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={painSeverity}
                  onChange={(e) => setPainSeverity(parseInt(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                  <span>0 (Brak)</span>
                  <span>3 (Łagodny)</span>
                  <span>5 (Umiarkowany)</span>
                  <span>8 (Silny)</span>
                  <span>10 (Nieznośny)</span>
                </div>
              </div>
            </div>

            {/* Krok 3: Objawy Towarzyszące */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">3</span>
                Zaznacz wszystkie objawy, które obecnie odczuwasz:
              </label>

              <div className="flex flex-wrap gap-2">
                {COMMON_SYMPTOMS.map((sym) => {
                  const isChecked = selectedSymptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {isChecked ? <CheckCircle2 size={13} className="text-white" /> : <span className="w-3 h-3 rounded-full border border-slate-400 shrink-0" />}
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Krok 4: Leki doraźne i pomiary domowe */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">4</span>
                Leki doraźne i pomiary domowe (opcjonalnie)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Pill size={14} className="text-indigo-500" /> Czy brałeś leki na te dolegliwości?
                  </label>
                  <input 
                    type="text"
                    placeholder="Np. Paracetamol 500mg rano, Gripex, Ibuprofen..."
                    value={medicationsTaken}
                    onChange={(e) => setMedicationsTaken(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Thermometer size={14} className="text-amber-500" /> Temp. (°C)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="37.5"
                      value={measuredTemp}
                      onChange={(e) => setMeasuredTemp(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Heart size={14} className="text-rose-500" /> Ciśnienie
                    </label>
                    <input 
                      type="text"
                      placeholder="130/80"
                      value={measuredBp}
                      onChange={(e) => setMeasuredBp(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-500" /> Co jeszcze lekarz powinien wiedzieć przed wizytą?
                </label>
                <textarea 
                  rows={2}
                  placeholder="Np. Za 2 dni wyjeżdżam, zależy mi na zwolnieniu lekarskim, dolegliwości nasilają się w nocy..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            {/* Przycisk Wysyłki */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wysyłanie do gabinetu...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Przekaż odpowiedzi do lekarza
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                <ShieldCheck size={13} /> Dane szyfrowane lokalnie i przesyłane bezpośrednio do stacji roboczej lekarza.
              </p>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
