import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Printer, 
  Smartphone, 
  CheckCircle2, 
  Sparkles, 
  X, 
  RefreshCw, 
  Radio, 
  FileText, 
  Clock, 
  UserCheck, 
  FlaskConical,
  Eye
} from 'lucide-react';
import QRCode from 'qrcode';
import { PatientIntakeForm, PatientIntakeService } from '../services/PatientIntakeService';
import { PatientIntakeSurvey } from './PatientIntakeSurvey';

interface PatientIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName?: string;
  onApplyToIntakeSymptoms: (formattedSymptoms: string, intake: PatientIntakeForm) => void;
}

export const PatientIntakeModal: React.FC<PatientIntakeModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onApplyToIntakeSymptoms
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'simulate' | 'history'>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [latestReceived, setLatestReceived] = useState<PatientIntakeForm | null>(null);
  const [intakeHistory, setIntakeHistory] = useState<PatientIntakeForm[]>([]);
  const [isListening, setIsListening] = useState<boolean>(true);
  const printRef = useRef<HTMLDivElement>(null);

  const surveyUrl = typeof window !== 'undefined' 
    ? PatientIntakeService.generateSurveyUrl(patientId, patientName) 
    : '';

  // Generowanie kodu QR
  useEffect(() => {
    if (!isOpen || !surveyUrl) return;

    QRCode.toDataURL(surveyUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#065f46', // Dark emerald
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Błąd generowania QR:', err));

    // Załaduj historię ankiet pacjenta
    const history = PatientIntakeService.getIntakeHistory(patientId);
    setIntakeHistory(history);
    if (history.length > 0) {
      setLatestReceived(history[0]);
    }
  }, [isOpen, surveyUrl, patientId, patientName]);

  // Nasłuchiwanie na nowe ankiety z BroadcastChannel i Storage
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = PatientIntakeService.listenForSubmissions((intake) => {
      if (intake.patientId === patientId || !intake.patientId) {
        setLatestReceived(intake);
        setIntakeHistory(prev => [intake, ...prev.filter(i => i.id !== intake.id)]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Ankieta_QR_${patientId}.png`;
    a.click();
  };

  const handlePrintDeskStand = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ankieta Przedwizytowa - Pacjent ${patientId}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; color: #1e293b; }
            .card { max-width: 480px; margin: 0 auto; border: 2px solid #059669; border-radius: 24px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
            h1 { color: #065f46; font-size: 24px; margin-bottom: 8px; }
            p { color: #475569; font-size: 14px; line-height: 1.5; margin: 8px 0; }
            .qr-box { margin: 24px auto; }
            .qr-box img { width: 240px; height: 240px; border-radius: 12px; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: bold; padding: 6px 14px; border-radius: 9999px; font-size: 13px; margin-bottom: 16px; border: 1px solid #a7f3d0; }
            .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; pt: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">🩺 Przychodnia POZ - Rejestracja</span>
            <h1>Zeskanuj kod przed wizytą</h1>
            <p>Skieruj aparat telefonu na poniższy kod QR, aby wypełnić krótką ankietę dolegliwości i objawów.</p>
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="Kod QR Ankiety" />
            </div>
            <p><strong>Twoje ID Pacjenta:</strong> ${patientId} ${patientName ? `(${patientName})` : ''}</p>
            <p style="font-size: 12px; color: #64748b;">Twoje odpowiedzi natychmiast zaktualizują kartę wizyty w gabinecie lekarskim.</p>
            <div class="footer">
              ADIPOZ Professional Agent &bull; Bezpieczny system wsparcia decyzji klinicznych
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSimulatedSubmit = (intake: PatientIntakeForm) => {
    setLatestReceived(intake);
    const formatted = PatientIntakeService.formatIntakeAsSymptoms(intake);
    onApplyToIntakeSymptoms(formatted, intake);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <QrCode size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Ankieta Przedwizytowa Pacjenta
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  QR &bull; Link
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pacjent wypełnia ankietę na telefonie, a zebrane dane automatycznie zasilają pole <strong>'Objawy'</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Zamknij okno"
          >
            <X size={20} />
          </button>
        </div>

        {/* Zakładki Nawigacji */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <QrCode size={15} />
            Kod QR i Link dla Pacjenta
          </button>

          <button
            onClick={() => setActiveTab('simulate')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'simulate'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <FlaskConical size={15} />
            Symulator Pacjenta (Wypełnij w oknie)
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Clock size={15} />
            Historia Ankiet ({intakeHistory.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'qr' ? (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Kolumna 1: Kod QR */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200/80 mb-3 relative group">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt={`QR Code dla pacjenta ${patientId}`}
                        className="w-56 h-56 object-contain rounded-xl" 
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5">
                      <Smartphone size={14} className="text-emerald-600" /> Zeskanuj aparatem telefonu
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ID Pacjenta w ankiecie: <span className="font-mono font-bold text-emerald-600">{patientId}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 w-full">
                    <button
                      onClick={handleDownloadQr}
                      className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Download size={14} />
                      Pobierz PNG
                    </button>
                    <button
                      onClick={handlePrintDeskStand}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Printer size={14} />
                      Drukuj ulotkę
                    </button>
                  </div>
                </div>

                {/* Kolumna 2: Bezpośredni link i instrukcje */}
                <div className="md:col-span-7 space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Bezpośredni Link do Ankiety
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        readOnly
                        value={surveyUrl}
                        className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-slate-700 dark:text-slate-300 outline-none select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check size={14} />
                            Skopiowano!
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Kopiuj Link
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={surveyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
                    >
                      <ExternalLink size={14} />
                      Otwórz ankietę w nowej karcie (Test dla pacjenta)
                    </a>
                  </div>

                  {/* Wskaźnik nasłuchiwania w czasie rzeczywistym */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        Automatyczna synchronizacja aktywna
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                        BroadcastChannel &bull; Storage
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Gdy pacjent kliknie <strong>"Przekaż odpowiedzi do lekarza"</strong> na swoim smartfonie, pole <strong>'Objawy i Wywiad'</strong> w Twojej aplikacji natychmiast zaktualizuje się o sformatowane dane, a system wywoła powiadomienie.
                    </p>
                  </div>

                  {/* Karta ostatnio odebranej ankiety */}
                  {latestReceived && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          Ostatnio odebrana ankieta ({new Date(latestReceived.submittedAt).toLocaleTimeString('pl-PL')})
                        </span>
                        <button
                          onClick={() => {
                            const formatted = PatientIntakeService.formatIntakeAsSymptoms(latestReceived);
                            onApplyToIntakeSymptoms(formatted, latestReceived);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Zastosuj do pola Objawy
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Powód:</strong> {latestReceived.primaryReason} | <strong>Ból:</strong> {latestReceived.painSeverity}/10 | <strong>Objawy:</strong> {latestReceived.associatedSymptoms.join(', ') || 'Brak'}
                      </p>
                    </div>
                  )}

                </div>
              </div>

            </div>
          ) : activeTab === 'simulate' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical size={18} className="text-amber-600" />
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    Tryb symulacji: Wypełnij ankietę jako pacjent poniżej, aby natychmiast przetestować przepływ danych do wywiadu lekarskiego.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-inner">
                <PatientIntakeSurvey 
                  patientId={patientId}
                  patientName={patientName}
                  isStandalone={false}
                  onSubmitted={handleSimulatedSubmit}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Zarejestrowane ankiety dla pacjenta {patientId}
                </h3>
                <span className="text-xs text-slate-400">
                  Łącznie: {intakeHistory.length}
                </span>
              </div>

              {intakeHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <FileText size={36} className="mx-auto opacity-30" />
                  <p className="text-sm font-medium">Brak wcześniejszych ankiet tego pacjenta</p>
                  <p className="text-xs">Udostępnij kod QR pacjentowi, aby zebrać pierwszy wywiad.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {intakeHistory.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {item.primaryReason}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                            {new Date(item.submittedAt).toLocaleString('pl-PL')}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                            VAS: {item.painSeverity}/10
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          <strong>Objawy:</strong> {item.associatedSymptoms.join(', ') || 'Brak'} &bull; <strong>Czas trwania:</strong> {item.duration}
                        </p>
                        {item.medicationsTaken && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-500 italic">
                            Leki doraźne: {item.medicationsTaken}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const formatted = PatientIntakeService.formatIntakeAsSymptoms(item);
                          onApplyToIntakeSymptoms(formatted, item);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <UserCheck size={14} />
                        Wstaw do Wywiadu
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Radio size={14} className="text-emerald-600 animate-pulse" />
            <span>Gotowy do odbioru danych z poczekalni</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
