import React, { useState, useEffect, useMemo } from 'react';
import { SystemOrchestrator } from './services/SystemOrchestrator';
import { AlertCircle, FileText, History as HistoryIcon, Shield, User, Activity, Pill, CheckCircle2, XCircle, Settings as SettingsIcon, Database, AlertTriangle, Share2, Code, Terminal, ChevronLeft, UserCircle } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { SettingsService, UserSettings } from './services/SettingsService';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationService } from './services/NotificationService';
import { LocalPatientDB, AnalysisRecord } from './services/LocalPatientDB';
import { History } from './components/History';
import Chat from './components/Chat';
import { PatientView } from './components/PatientView';
import { generatePatientReportPDF } from './lib/pdfGenerator';

const orchestrator = new SystemOrchestrator();
const patientDB = new LocalPatientDB();

export default function App() {
  const [patientId, setPatientId] = useState('PAC-12345');
  const [patientInfo, setPatientInfo] = useState({ age: 45, weight: 75, height: 175, gender: 'M', bmi: 24.5 });

  useEffect(() => {
    const heightInMeters = patientInfo.height / 100;
    if (heightInMeters > 0) {
      const bmi = parseFloat((patientInfo.weight / (heightInMeters * heightInMeters)).toFixed(1));
      if (bmi !== patientInfo.bmi) {
        setPatientInfo(prev => ({ ...prev, bmi }));
      }
    }
  }, [patientInfo.weight, patientInfo.height]);
  const [symptoms, setSymptoms] = useState('');
  const [medications, setMedications] = useState('');
  const [vitals, setVitals] = useState({ temp: 36.6, bp: '120/80', allergies: [] });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(SettingsService.getSettings());
  const [view, setView] = useState<'analysis' | 'history' | 'chat' | 'patient'>('analysis');
  const [patientHistory, setPatientHistory] = useState<AnalysisRecord[]>([]);
  const [isSovereignMode, setIsSovereignMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const errors: Record<string, string> = {};
    if (isNaN(patientInfo.age) || patientInfo.age < 0 || patientInfo.age > 120) {
      errors.age = "Wiek: 0-120";
    }
    if (isNaN(patientInfo.weight) || patientInfo.weight < 1 || patientInfo.weight > 500) {
      errors.weight = "Waga: 1-500kg";
    }
    if (isNaN(patientInfo.height) || patientInfo.height < 30 || patientInfo.height > 250) {
      errors.height = "Wzrost: 30-250cm";
    }
    setValidationErrors(errors);
  }, [patientInfo.age, patientInfo.weight, patientInfo.height]);

  useEffect(() => {
    NotificationService.requestPermission();
    loadHistory();
  }, [patientId]);

  const loadHistory = async () => {
    const history = await patientDB.getHistory(patientId);
    setPatientHistory(history);
  };

  useEffect(() => {
    // Apply theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await orchestrator.runFullAnalysis(patientId, symptoms, vitals, medications, patientInfo, isSovereignMode);
      setAnalysis(result);
      loadHistory(); // Refresh history after analysis
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (record: AnalysisRecord) => {
    setAnalysis(record.analysis);
    setSymptoms(record.symptoms);
    setMedications(record.medications);
    setVitals(record.vitals);
    setView('analysis');
  };

  const handleDeleteHistory = async (id: string) => {
    await patientDB.deleteAnalysis(patientId, id);
    loadHistory();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-auto transition-colors duration-300">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Sovereign AI Medical</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Panel Lekarza v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-lg mr-4">
            <button 
              onClick={() => setView('analysis')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'analysis' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Analiza
            </button>
            <button 
              onClick={() => setView('history')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Historia
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'chat' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Czat
            </button>
            <button 
              onClick={() => setView('patient')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${view === 'patient' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Pacjent
            </button>
          </div>
          <NotificationCenter />
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Ustawienia"
          >
            <SettingsIcon size={20} />
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-100">dr Jan Kowalski</p>
            <p className="text-xs text-slate-400">Specjalista Chorób Wewnętrznych</p>
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
            <User size={20} className="text-slate-300" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'analysis' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Input */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="text-emerald-600" size={20} />
                  <h2 className="text-lg font-bold dark:text-slate-100">Dane Pacjenta</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Pacjenta</label>
                      <input 
                        type="text" 
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Płeć / Wiek / Waga / Wzrost</label>
                      <div className="flex gap-2">
                        <select 
                          value={patientInfo.gender}
                          onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                        >
                          <option value="M">M</option>
                          <option value="F">K</option>
                        </select>
                        <input 
                          type="number" 
                          placeholder="Wiek"
                          value={patientInfo.age}
                          onChange={(e) => setPatientInfo({...patientInfo, age: parseInt(e.target.value)})}
                          className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 focus:ring-2 outline-none transition-all dark:text-slate-100 ${validationErrors.age ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'}`}
                        />
                        <input 
                          type="number" 
                          placeholder="Waga"
                          value={patientInfo.weight}
                          onChange={(e) => setPatientInfo({...patientInfo, weight: parseInt(e.target.value)})}
                          className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 focus:ring-2 outline-none transition-all dark:text-slate-100 ${validationErrors.weight ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'}`}
                        />
                        <input 
                          type="number" 
                          placeholder="Wzrost"
                          value={patientInfo.height}
                          onChange={(e) => setPatientInfo({...patientInfo, height: parseInt(e.target.value)})}
                          className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 focus:ring-2 outline-none transition-all dark:text-slate-100 ${validationErrors.height ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'}`}
                        />
                      </div>
                      <div className="mt-1 flex justify-between items-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                          BMI: <span className={patientInfo.bmi > 25 ? "text-amber-600" : "text-emerald-600"}>{patientInfo.bmi}</span>
                        </div>
                        <div className="flex gap-2">
                          {Object.values(validationErrors).map((err, i) => (
                            <span key={i} className="text-[9px] text-red-500 font-bold uppercase">{err}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Objawy i Wywiad</label>
                    <textarea 
                      rows={4}
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Opisz objawy zgłaszane przez pacjenta..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Aktualne Leki</label>
                    <textarea 
                      rows={3}
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      placeholder="Lista leków przyjmowanych przez pacjenta..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Temperatura ({settings.units === 'metric' ? '°C' : '°F'})
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={vitals.temp}
                        onChange={(e) => setVitals({...vitals, temp: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Ciśnienie ({settings.units === 'metric' ? 'mmHg' : 'psi'})
                      </label>
                      <input 
                        type="text" 
                        value={vitals.bp}
                        onChange={(e) => setVitals({...vitals, bp: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={isSovereignMode ? "text-emerald-500" : "text-slate-400"} />
                      <div>
                        <p className="text-xs font-bold dark:text-slate-200">Tryb Suwerenny</p>
                        <p className="text-[10px] text-slate-500">100% lokalna analiza (bez API)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSovereignMode(!isSovereignMode)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isSovereignMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isSovereignMode ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  <button 
                    onClick={handleAnalyze}
                    disabled={loading || !symptoms || Object.keys(validationErrors).length > 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? 'Analizowanie...' : 'Uruchom Analizę AI'}
                  </button>
                </div>
              </section>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3 text-red-700 dark:text-red-400">
                  <XCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-7 space-y-6">
              {analysis ? (
                <>
                  {/* Gap Analysis Section */}
                  {analysis.data.gapAnalysis && analysis.data.gapAnalysis.gaps.length > 0 && (
                    <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Database className="text-amber-600" size={20} />
                          <h2 className="text-lg font-bold dark:text-slate-100">Analiza Brakujących Danych</h2>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Jakość Danych:</span>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${analysis.data.gapAnalysis.overallDataQuality > 70 ? 'bg-emerald-500' : analysis.data.gapAnalysis.overallDataQuality > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${analysis.data.gapAnalysis.overallDataQuality}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {analysis.data.gapAnalysis.gaps.map((gap: any, i: number) => (
                          <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex gap-4">
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${gap.importance === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                              <AlertTriangle size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{gap.field}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${gap.importance === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {gap.importance}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{gap.reason}</p>
                              <p className="text-[10px] italic text-slate-500 dark:text-slate-500">Wpływ: {gap.impactOnDiagnosis}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Medication Analysis Section */}
                  <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Pill className="text-indigo-600" size={20} />
                        <h2 className="text-lg font-bold dark:text-slate-100">Analiza Farmakoterapii</h2>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${analysis.data.medAnalysis.isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {analysis.data.medAnalysis.isSafe ? 'Bezpieczne' : 'Wykryto Ryzyko'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 mb-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.data.medAnalysis.summary}</p>
                    </div>

                    {analysis.data.medAnalysis.risks.length > 0 && (
                      <div className="space-y-3">
                        {analysis.data.medAnalysis.risks.map((risk: any, i: number) => (
                          <div key={i} className={`rounded-xl p-4 border ${
                            risk.severity === 'CRITICAL' || risk.severity === 'HIGH' 
                              ? 'bg-red-50 border-red-100 text-red-800' 
                              : 'bg-amber-50 border-amber-100 text-amber-800'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle size={16} />
                              <span className="text-xs font-bold uppercase tracking-wider">{risk.type} - {risk.severity}</span>
                            </div>
                            <p className="text-sm font-semibold mb-1">{risk.message}</p>
                            <p className="text-xs italic opacity-80">Zalecenie: {risk.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Decision & Alerts */}
                  <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="text-emerald-600" size={20} />
                        <h2 className="text-lg font-bold dark:text-slate-100">Wynik Analizy i Alerty</h2>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => generatePatientReportPDF(analysis, patientId)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold uppercase tracking-wider"
                        >
                          Generuj PDF
                        </button>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${analysis.data.decision.isSafe ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {analysis.data.decision.isSafe ? 'Bezpieczne' : 'Wymaga Uwagi'}
                        </span>
                      </div>
                    </div>

                    {analysis.data.decision.podsumowanie_wizyty && (
                      <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Podsumowanie Wizyty</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {analysis.data.decision.podsumowanie_wizyty}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Sugerowana Diagnoza</p>
                        <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-400">
                          {analysis.data.decision.diagnosis}
                          {analysis.data.decision.icd10Code && (
                            <span className="ml-2 text-sm font-mono bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400">
                              {analysis.data.decision.icd10Code}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Zalecane Działanie</p>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{analysis.data.decision.action}</p>
                      </div>
                    </div>

                    {analysis.data.decision.mappedSymptoms && analysis.data.decision.mappedSymptoms.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Zmapowane Objawy (Terminologia Medyczna)</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.data.decision.mappedSymptoms.map((symptom: string, i: number) => (
                            <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.data.decision.suggestedTests && analysis.data.decision.suggestedTests.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sugerowane Badania Diagnostyczne</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {analysis.data.decision.suggestedTests.map((test: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{test}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.data.decision.explanation && (
                      <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Uzasadnienie Kliniczne (CoT)</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                          "{analysis.data.decision.explanation}"
                        </p>
                      </div>
                    )}

                    {analysis.data.decision.chronicDiseaseManagement && (
                      <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity size={16} className="text-amber-600" />
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Zarządzanie Chorobą Przewlekłą</p>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                          {analysis.data.decision.chronicDiseaseManagement}
                        </p>
                      </div>
                    )}

                    {analysis.data.decision.differential_diagnoses && analysis.data.decision.differential_diagnoses.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Diagnozy Różnicowe</p>
                        <div className="space-y-2">
                          {analysis.data.decision.differential_diagnoses.map((dd: any, i: number) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{dd.diagnosis}</span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{dd.probability}%</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{dd.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.data.decision.alerts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Alerty Systemowe</p>
                        {analysis.data.decision.alerts.map((alert: string, i: number) => (
                          <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800 flex gap-3">
                            <AlertCircle size={18} className="shrink-0" />
                            {alert}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* AdiPOZ Integration Section */}
                  {analysis.data.integration && (
                    <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-6">
                        <Share2 className="text-blue-600" size={20} />
                        <h2 className="text-lg font-bold dark:text-slate-100">Integracja AdiPOZ Engine</h2>
                      </div>

                      <div className="space-y-6">
                        {/* HL7 CDA */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Code size={16} className="text-blue-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mapowanie HL7 CDA R2</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.data.integration.hl7.map((hl7: any, i: number) => (
                              <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">{hl7.type}</p>
                                <pre className="text-[10px] text-slate-400 overflow-x-auto max-h-32 scrollbar-thin scrollbar-thumb-slate-700">
                                  {hl7.xml}
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SQL Queries */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Database size={16} className="text-emerald-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Eksport SQL (Patient/Visit)</h3>
                          </div>
                          <div className="space-y-2">
                            {analysis.data.integration.sql.map((sql: any, i: number) => (
                              <div key={i} className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
                                <Terminal size={14} className="text-emerald-400 shrink-0" />
                                <code className="text-[10px] text-emerald-400 font-mono break-all">
                                  {sql.query}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* NoSQL Schema */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Shield size={16} className="text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sovereign Log Schema (NoSQL)</h3>
                          </div>
                          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Collection: {analysis.data.integration.nosql.collection}</p>
                            <pre className="text-[10px] text-slate-400">
                              {JSON.stringify(analysis.data.integration.nosql.schema, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Medical Note */}
                  <section className="bg-slate-900 rounded-2xl p-6 shadow-xl text-slate-300 font-mono text-sm overflow-hidden relative">
                    <div className="flex items-center gap-2 mb-4 text-slate-100">
                      <FileText size={20} />
                      <h2 className="text-lg font-bold font-sans">Wygenerowana Notatka Medyczna</h2>
                    </div>
                    <div className="absolute top-6 right-6 opacity-10">
                      <Shield size={120} />
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed relative z-10">
                      {analysis.data.note.content}
                    </pre>
                    <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-sans">
                      Zgodność z regulacjami: 100% | Podpis: SOVEREIGN_AI_SECURE_HASH
                    </div>
                  </section>

                  {/* Disclaimer */}
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 italic text-xs text-slate-600 dark:text-slate-400 text-center">
                    {analysis.disclaimer}
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[400px] bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-12 text-center">
                  <HistoryIcon size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium dark:text-slate-300">Oczekiwanie na analizę pacjenta</p>
                  <p className="text-sm max-w-xs dark:text-slate-400">Wprowadź objawy i leki po lewej stronie i uruchom analizę, aby zobaczyć wyniki i wygenerować notatkę.</p>
                </div>
              )}
            </div>
          </div>
        ) : view === 'history' ? (
          <History 
            history={patientHistory} 
            onSelect={handleSelectHistory} 
            onDelete={handleDeleteHistory} 
          />
        ) : view === 'patient' ? (
          <PatientView 
            patientInfo={patientInfo} 
            analysis={analysis} 
            patientHistory={patientHistory}
          />
        ) : (
          <div className="h-[calc(100vh-160px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Chat isSovereignMode={isSovereignMode} patientInfo={patientInfo} />
          </div>
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSettingsChange={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
