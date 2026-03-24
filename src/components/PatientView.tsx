import React, { useState, useMemo } from 'react';
import { User, Activity, FileText, Send, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalysisRecord } from '../services/LocalPatientDB';

// Mock data generator
const generateMockEkgData = (period: '24h' | '7d') => {
  const data = [];
  const points = period === '24h' ? 24 : 7;
  for (let i = 0; i < points; i++) {
    data.push({
      time: period === '24h' ? `${i}:00` : `Dzień ${i + 1}`,
      heartRate: 60 + Math.floor(Math.random() * 40),
      hrv: 40 + Math.floor(Math.random() * 30),
    });
  }
  return data;
};

interface PatientViewProps {
  patientInfo: { age: number; weight: number; height: number; gender: string; bmi: number };
  analysis: any;
  patientHistory: AnalysisRecord[];
}

export const PatientView: React.FC<PatientViewProps> = ({ patientInfo, analysis, patientHistory }) => {
  const lastVisit = patientHistory.length > 0 ? patientHistory[0] : null;
  const [ekgPeriod, setEkgPeriod] = useState<'24h' | '7d'>('24h');
  const ekgData = useMemo(() => generateMockEkgData(ekgPeriod), [ekgPeriod]);

  const getBmiInterpretation = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Niedowaga', risk: 'Ryzyko niedożywienia, osłabienie odporności' };
    if (bmi < 25) return { category: 'Norma', risk: 'Prawidłowa masa ciała, niskie ryzyko chorób' };
    if (bmi < 30) return { category: 'Nadwaga', risk: 'Podwyższone ryzyko nadciśnienia, cukrzycy typu 2' };
    return { category: 'Otyłość', risk: 'Wysokie ryzyko chorób sercowo-naczyniowych, cukrzycy, stawów' };
  };

  const bmiInfo = getBmiInterpretation(patientInfo.bmi);

  const sendToPatient = () => {
    alert('Podsumowanie zostało wysłane do pacjenta.');
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kluczowe informacje */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <User className="text-emerald-600" size={24} />
            <h2 className="text-xl font-bold dark:text-slate-100">Informacje o Pacjencie</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase">Wiek</p>
              <p className="text-lg font-semibold dark:text-slate-100">{patientInfo.age} lat</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase">Waga / Wzrost</p>
              <p className="text-lg font-semibold dark:text-slate-100">{patientInfo.weight}kg / {patientInfo.height}cm</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase">BMI: {patientInfo.bmi}</p>
              <p className="text-lg font-semibold dark:text-slate-100">{bmiInfo.category}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{bmiInfo.risk}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase">Płeć</p>
              <p className="text-lg font-semibold dark:text-slate-100">{patientInfo.gender === 'M' ? 'Mężczyzna' : 'Kobieta'}</p>
            </div>
          </div>
        </section>

        {/* Podsumowanie ostatniej wizyty */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-emerald-600" size={24} />
            <h2 className="text-xl font-bold dark:text-slate-100">Ostatnia Wizyta</h2>
          </div>
          {lastVisit ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold">Data:</span> {new Date(lastVisit.timestamp).toLocaleDateString()}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold">Diagnoza:</span> {lastVisit.analysis?.data?.decision?.diagnosis || 'Brak danych'}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Podsumowanie AI</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {lastVisit.analysis?.data?.decision?.podsumowanie_wizyty || 'Brak danych'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Brak historii wizyt.</p>
          )}
        </section>
      </div>

      {/* Wizualizacja EKG */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Heart className="text-rose-600" size={24} />
            <h2 className="text-xl font-bold dark:text-slate-100">Analiza EKG (Rytm Serca)</h2>
          </div>
          <div className="flex gap-2">
            {(['24h', '7d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setEkgPeriod(period)}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${ekgPeriod === period ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
              >
                {period === '24h' ? 'Ostatnie 24h' : 'Ostatni tydzień'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ekgData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="heartRate" name="Tętno (BPM)" stroke="#e11d48" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hrv" name="HRV (ms)" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Podsumowanie dla pacjenta */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-600" size={24} />
            <h2 className="text-xl font-bold dark:text-slate-100">Podsumowanie dla pacjenta</h2>
          </div>
          <button 
            onClick={sendToPatient}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-colors"
          >
            <Send size={16} />
            Wyślij do pacjenta
          </button>
        </div>
        {analysis?.data?.decision?.podsumowanie_dla_pacjenta ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <p className="text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                {analysis.data.decision.podsumowanie_dla_pacjenta}
              </p>
            </div>
            {analysis?.data?.decision?.zalecenia && (
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Zalecenia</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  {analysis.data.decision.zalecenia.map((zalecenie: string, i: number) => (
                    <li key={i}>{zalecenie}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500">Brak danych do wygenerowania podsumowania dla pacjenta. Uruchom analizę.</p>
        )}
      </section>
    </div>
  );
};
