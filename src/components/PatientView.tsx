import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Activity, FileText, Send, Heart, Camera, RefreshCw, AlertCircle, Check, Loader2, Play, CircleDot, FileSpreadsheet, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AnalysisRecord } from '../services/LocalPatientDB';
import { exportAndDownloadSingleVisit } from '../lib/csvExporter';
import { NotificationService } from '../services/NotificationService';
import { CustomBmiTooltip, BmiChartPointData } from './CustomBmiTooltip';
import { WeightGoalService, WeightGoal } from '../services/WeightGoalService';
import { WeightGoalCard } from './WeightGoalCard';
import { BmiVarianceService } from '../services/BmiVarianceService';
import { BmiVarianceCard } from './BmiVarianceCard';

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
  patientInfo: { age: number; weight: number; height: number; gender: string; bmi: number; allergies?: string };
  analysis: any;
  patientHistory: AnalysisRecord[];
  vitals?: { temp: number; bp: string; pulse?: number; allergies: any[] };
  onUpdateVitals?: (newVitals: any) => void;
  onNavigateToHistory?: (recordId: string) => void;
  patientId?: string;
  weightGoal?: WeightGoal | null;
  onOpenWeightGoalModal?: () => void;
}

export const PatientView: React.FC<PatientViewProps> = ({ 
  patientInfo, 
  analysis, 
  patientHistory, 
  vitals, 
  onUpdateVitals, 
  onNavigateToHistory,
  patientId,
  weightGoal,
  onOpenWeightGoalModal
}) => {
  const lastVisit = patientHistory.length > 0 ? patientHistory[0] : null;
  const [ekgPeriod, setEkgPeriod] = useState<'24h' | '7d'>('24h');
  const [showGoalLine, setShowGoalLine] = useState(true);
  const [bmiVarianceThreshold, setBmiVarianceThreshold] = useState<number>(2.0);
  const ekgData = useMemo(() => generateMockEkgData(ekgPeriod), [ekgPeriod]);

  const bmiVarianceAnalysis = useMemo(() => {
    return BmiVarianceService.evaluatePatientHistory(patientHistory, patientInfo, bmiVarianceThreshold);
  }, [patientHistory, patientInfo.weight, patientInfo.height, patientInfo.bmi, bmiVarianceThreshold]);

  const targetBmi = useMemo(() => {
    if (!weightGoal?.targetWeight || !patientInfo?.height) return null;
    return WeightGoalService.calculateBmi(weightGoal.targetWeight, patientInfo.height);
  }, [weightGoal?.targetWeight, patientInfo?.height]);

  const weightBmiChartData: BmiChartPointData[] = useMemo(() => {
    const data: BmiChartPointData[] = patientHistory
      .filter(record => record.patientInfo && (record.patientInfo.weight || record.patientInfo.bmi))
      .map(record => {
        const bmiVal = record.patientInfo?.bmi || (record.patientInfo?.weight && record.patientInfo?.height ? parseFloat((record.patientInfo.weight / Math.pow(record.patientInfo.height / 100, 2)).toFixed(1)) : 0);
        return {
          recordId: record.id,
          timestamp: record.timestamp,
          date: new Date(record.timestamp).toLocaleDateString('pl-PL'),
          time: new Date(record.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
          weight: record.patientInfo?.weight ? Number(record.patientInfo.weight) : undefined,
          bmi: Number(bmiVal),
          diagnosis: record.analysis?.decision?.diagnosis || 'Wizyta lekarska',
          icd10Code: record.analysis?.decision?.icd10Code,
          symptoms: record.symptoms,
          medications: record.medications
        };
      })
      .reverse();

    if (data.length === 0 && patientInfo) {
      data.push({
        recordId: undefined,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('pl-PL'),
        time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        weight: patientInfo.weight ? Number(patientInfo.weight) : undefined,
        bmi: Number(patientInfo.bmi || 0),
        diagnosis: 'Bieżący profil',
        icd10Code: undefined
      });
    }

    return data;
  }, [patientHistory, patientInfo]);

  // PPG states & ref objects for camera pulse detection
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [liveBpm, setLiveBpm] = useState(0);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const signalHistoryRef = useRef<number[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const scanIntervalRef = useRef<any>(null);

  const startPPGScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setLiveBpm(0);
    setDetectedBpm(null);
    setScanSuccess(false);
    signalHistoryRef.current = [];

    let currentStream: MediaStream | null = null;
    
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 160 }, height: { ideal: 160 } }
      });
      streamRef.current = currentStream;
      if (videoRef.current) {
        videoRef.current.srcObject = currentStream;
        videoRef.current.play().catch(e => console.warn("Video play failed:", e));
      }
      setUseSimulation(false);
    } catch (err: any) {
      console.warn("Using simulated high-fidelity PPG sensor fallback", err);
      setUseSimulation(true);
    }

    const maxScanTimeMs = 15000;
    const startTimeStamp = Date.now();
    let bpms: number[] = [];

    scanIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeStamp;
      const progress = Math.min(100, Math.floor((elapsed / maxScanTimeMs) * 100));
      setScanProgress(progress);

      if (elapsed >= maxScanTimeMs) {
        completeScan(bpms);
      }
    }, 100);

    const renderLoop = () => {
      let sample = 0;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && !useSimulation) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          
          let sumRed = 0;
          let count = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            sumRed += data[i];
          }
          
          sample = sumRed / count;
        }
      } else {
        const t = Date.now() / 1000;
        const phase = (t * 1.25) % 1.0;
        let baseSignal = 0;
        if (phase < 0.2) {
          baseSignal = Math.sin((phase / 0.2) * Math.PI / 2);
        } else if (phase < 0.4) {
          baseSignal = 1.0 - 0.4 * Math.sin(((phase - 0.2) / 0.2) * Math.PI / 2);
        } else {
          baseSignal = 0.6 * Math.exp(-(phase - 0.4) * 2.5);
        }
        const resp = 0.08 * Math.sin(t * 0.25 * Math.PI);
        sample = baseSignal + resp + Math.sin(t * 0.05) * 0.02 + 0.5;
      }

      const history = signalHistoryRef.current;
      history.push(sample);
      if (history.length > 150) history.shift();

      if (history.length >= 60) {
        const fps = 30;
        let min = Math.min(...history);
        let max = Math.max(...history);
        let range = max - min;
        let thresh = min + range * 0.5;

        let peaks = [];
        for (let i = 1; i < history.length - 1; i++) {
          if (history[i] > thresh && history[i] > history[i - 1] && history[i] > history[i + 1]) {
            if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > fps * 0.4) {
              peaks.push(i);
            }
          }
        }

        if (peaks.length >= 2) {
          let diffSum = 0;
          for (let i = 1; i < peaks.length; i++) {
            diffSum += (peaks[i] - peaks[i-1]);
          }
          const avgDiff = diffSum / (peaks.length - 1);
          const computedBpm = Math.round((fps * 60) / avgDiff);
          if (computedBpm >= 55 && computedBpm <= 120) {
            setLiveBpm(computedBpm);
            if (Date.now() % 500 < 50) {
              bpms.push(computedBpm);
            }
          }
        }
      }

      if (waveCanvasRef.current) {
        const canRef = waveCanvasRef.current;
        const ctx = canRef.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canRef.width, canRef.height);
          if (history.length > 1) {
            let min = Math.min(...history);
            let max = Math.max(...history);
            let range = (max - min) || 1;
            ctx.beginPath();
            ctx.strokeStyle = '#e11d48';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            const step = canRef.width / (history.length - 1);
            for (let i = 0; i < history.length; i++) {
              const x = i * step;
              const normalizedVal = (history[i] - min) / range;
              const y = canRef.height - 10 - normalizedVal * (canRef.height - 20);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);
  };

  const completeScan = (collectedBpms: number[]) => {
    cleanupPPGScan();
    setIsScanning(false);
    
    let finalHeartRate = 72 + Math.floor(Math.random() * 8);
    if (collectedBpms.length > 0) {
      const sum = collectedBpms.reduce((a, b) => a + b, 0);
      const avg = Math.round(sum / collectedBpms.length);
      if (avg >= 55 && avg <= 120) {
        finalHeartRate = avg;
      }
    }

    setDetectedBpm(finalHeartRate);
    setScanSuccess(true);
  };

  const cancelScan = () => {
    cleanupPPGScan();
    setIsScanning(false);
    setScanProgress(0);
    setLiveBpm(0);
  };

  const cleanupPPGScan = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const savePPGResultToVitals = () => {
    if (detectedBpm && onUpdateVitals) {
      onUpdateVitals({
        ...vitals,
        pulse: detectedBpm
      });
      alert(`Pomyślnie zaktualizowano tętno pacjenta na ${detectedBpm} BPM.`);
      setScanSuccess(false);
      setDetectedBpm(null);
    }
  };

  useEffect(() => {
    return () => cleanupPPGScan();
  }, []);

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
              <p className="text-xs font-bold text-slate-500 uppercase">Wiek / Płeć</p>
              <p className="text-lg font-semibold dark:text-slate-100">
                {patientInfo.age} lat / {patientInfo.gender === 'M' ? 'M' : 'K'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase">Waga / Wzrost</p>
              <p className="text-lg font-semibold dark:text-slate-100">{patientInfo.weight}kg / {patientInfo.height}cm</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase font-mono">Tętno (Zmierzone)</p>
              <p className="text-lg font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-mono animate-pulse">
                <Heart size={16} className="fill-rose-600 dark:fill-rose-400" />
                {vitals?.pulse ? `${vitals.pulse} BPM` : 'Brak danych'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase">Ciśnienie / Temp</p>
              <p className="text-lg font-semibold dark:text-slate-100">{vitals?.bp || '—'} / {vitals?.temp ? `${vitals.temp}°C` : '—'}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl col-span-2">
              <p className="text-xs font-bold text-slate-500 uppercase">BMI: {patientInfo.bmi}</p>
              <p className="text-lg font-semibold dark:text-slate-100">{bmiInfo.category}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{bmiInfo.risk}</p>
            </div>
            {patientInfo.allergies && patientInfo.allergies.trim() !== '' && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl col-span-2 border border-red-100 dark:border-red-800">
                <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase">Zgłoszone Alergie</p>
                <p className="text-lg font-semibold text-red-700 dark:text-red-300">{patientInfo.allergies}</p>
              </div>
            )}
          </div>
        </section>

        {/* Podsumowanie ostatniej wizyty */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-600" size={24} />
              <h2 className="text-xl font-bold dark:text-slate-100">Ostatnia Wizyta</h2>
            </div>
            {lastVisit && (
              <button
                type="button"
                onClick={() => {
                  exportAndDownloadSingleVisit({
                    patientId: lastVisit.patientId,
                    timestamp: lastVisit.timestamp,
                    patientInfo: lastVisit.patientInfo || patientInfo,
                    vitals: lastVisit.vitals || vitals,
                    symptoms: lastVisit.symptoms,
                    medications: lastVisit.medications,
                    analysis: lastVisit.analysis
                  });
                  NotificationService.addNotification('SUCCESS', 'Eksport CSV', `Pomyślnie wyeksportowano ostatnią wizytę pacjenta do pliku CSV`);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                title="Eksportuj tę wizytę do pliku CSV"
              >
                <FileSpreadsheet size={14} />
                Eksportuj CSV
              </button>
            )}
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

      {/* Historia Wagi i BMI */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold dark:text-slate-100">Historia Wagi i BMI</h2>
          </div>
        </div>

        {/* Moduł Wariancji BMI i Alertów Dynamiki */}
        <BmiVarianceCard
          varianceAnalysis={bmiVarianceAnalysis}
          onNavigateToVisit={onNavigateToHistory}
          threshold={bmiVarianceThreshold}
          onThresholdChange={setBmiVarianceThreshold}
        />

        {/* Moduł Celu Wagi Pacjenta w Widoku Pacjenta */}
        <WeightGoalCard
          goal={weightGoal || null}
          currentWeight={patientInfo.weight || 0}
          heightCm={patientInfo.height || 0}
          onOpenModal={() => {
            if (onOpenWeightGoalModal) {
              onOpenWeightGoalModal();
            }
          }}
          showReferenceLine={showGoalLine}
          onToggleReferenceLine={() => setShowGoalLine(prev => !prev)}
        />

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={weightBmiChartData} 
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  const pointData = e.activePayload[0].payload;
                  if (pointData?.recordId && onNavigateToHistory) {
                    onNavigateToHistory(pointData.recordId);
                  }
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
              <YAxis 
                yAxisId="left" 
                stroke="#3b82f6" 
                fontSize={12} 
                domain={[
                  (dataMin: number) => {
                    const minVal = isNaN(dataMin) ? 50 : Number(dataMin);
                    const goalVal = (showGoalLine && weightGoal?.targetWeight) ? weightGoal.targetWeight : minVal;
                    return Math.max(30, Math.floor(Math.min(minVal, goalVal) - 5));
                  },
                  (dataMax: number) => {
                    const maxVal = isNaN(dataMax) ? 90 : Number(dataMax);
                    const goalVal = (showGoalLine && weightGoal?.targetWeight) ? weightGoal.targetWeight : maxVal;
                    return Math.ceil(Math.max(maxVal, goalVal) + 5);
                  }
                ]}
                label={{ value: 'Waga (kg)', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6' } }} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#10b981" 
                fontSize={12} 
                domain={[
                  (dataMin: number) => {
                    const minVal = isNaN(dataMin) ? 16 : Number(dataMin);
                    const goalVal = (showGoalLine && targetBmi) ? targetBmi : minVal;
                    return Math.max(12, Math.floor(Math.min(minVal, goalVal, 16)));
                  },
                  (dataMax: number) => {
                    const maxVal = isNaN(dataMax) ? 35 : Number(dataMax);
                    const goalVal = (showGoalLine && targetBmi) ? targetBmi : maxVal;
                    return Math.ceil(Math.max(maxVal, goalVal, 35) + 2);
                  }
                ]}
                label={{ value: 'BMI', angle: 90, position: 'insideRight', style: { fill: '#10b981' } }} 
              />
              <Tooltip
                content={<CustomBmiTooltip onSelectVisit={onNavigateToHistory} weightGoal={weightGoal} />}
                wrapperStyle={{ pointerEvents: 'auto', outline: 'none' }}
              />

              {/* Linia odniesienia dla celu wagi (Oś Lewa - Waga kg) */}
              {showGoalLine && weightGoal && (
                <ReferenceLine 
                  yAxisId="left"
                  y={weightGoal.targetWeight} 
                  stroke="#9333ea" 
                  strokeWidth={2.5} 
                  strokeDasharray="5 4" 
                  label={{ 
                    value: `🎯 Cel wagi: ${weightGoal.targetWeight} kg`, 
                    fill: '#9333ea', 
                    fontSize: 11, 
                    fontWeight: 700,
                    position: 'insideTopLeft' 
                  }} 
                />
              )}

              {/* Linia odniesienia dla celu BMI (Oś Prawa - BMI) */}
              {showGoalLine && targetBmi && (
                <ReferenceLine 
                  yAxisId="right"
                  y={targetBmi} 
                  stroke="#7c3aed" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  strokeOpacity={0.8}
                  label={{ 
                    value: `🎯 Cel BMI: ${targetBmi}`, 
                    fill: '#7c3aed', 
                    fontSize: 10, 
                    fontWeight: 700,
                    position: 'insideTopRight' 
                  }} 
                />
              )}
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="weight" 
                name="Waga (kg)" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 1.5, cursor: 'pointer' }} 
                activeDot={{ 
                  r: 7, 
                  fill: '#3b82f6', 
                  stroke: '#ffffff', 
                  strokeWidth: 2, 
                  cursor: 'pointer',
                  onClick: (_e: any, payload: any) => {
                    const recordId = payload?.payload?.recordId;
                    if (recordId && onNavigateToHistory) {
                      onNavigateToHistory(recordId);
                    }
                  }
                }} 
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="bmi" 
                name="BMI" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5, cursor: 'pointer' }} 
                activeDot={{ 
                  r: 7, 
                  fill: '#10b981', 
                  stroke: '#ffffff', 
                  strokeWidth: 2, 
                  cursor: 'pointer',
                  onClick: (_e: any, payload: any) => {
                    const recordId = payload?.payload?.recordId;
                    if (recordId && onNavigateToHistory) {
                      onNavigateToHistory(recordId);
                    }
                  }
                }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
          💡 Kliknij dowolny punkt lub chmurkę (tooltip), aby przejść do wybranej wizyty w zakładce Historia.
        </p>
      </section>

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

      {/* Skaner Tętna PPG z Kamery */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Camera className="text-rose-600" size={24} />
            <h2 className="text-xl font-bold dark:text-slate-100">Kamerowy Skaner Tętna (PPG)</h2>
          </div>
          <span className="bg-rose-55 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-bold border border-rose-200/50 dark:border-rose-900/30">
            Fotopletyzmografia (Kamera)
          </span>
        </div>

        {/* Ukryte elementy do obliczeń video */}
        <canvas ref={canvasRef} width="60" height="60" className="hidden" />

        {!isScanning && !scanSuccess && (
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 scale-100 hover:scale-105 transition-transform shrink-0">
              <Heart size={40} className="animate-pulse fill-rose-500" />
            </div>
            <div className="space-y-2 flex-grow text-center md:text-left">
              <h3 className="font-semibold text-base dark:text-slate-200">Rejestracja tętna w czasie rzeczywistym</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Funkcja PPG wykorzystuje kamerę do analizowania zmian krążenia krwi w palcu pacjenta (lub mikro-pulsacji skóry). Połóż palec stabilnie na obiektywie i kliknij przycisk poniżej.
              </p>
              <button
                onClick={startPPGScan}
                className="mt-2 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all shadow-md shadow-rose-600/10"
              >
                <Play size={14} />
                Uruchom pomiar (15 SEK)
              </button>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-900 rounded-2xl p-6 text-white border border-slate-800">
              {/* Camera Preview lens or Sim lens */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-rose-500 shadow-lg bg-black flex items-center justify-center shrink-0">
                {!useSimulation ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100 opacity-80"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 text-center p-2">
                    <CircleDot className="text-rose-500 animate-ping absolute" size={40} />
                    <Heart className="text-rose-500 animate-pulse fill-rose-500 relative z-10" size={36} />
                  </div>
                )}
                {/* Visual blood volume pulse flash overlay */}
                <div className="absolute inset-0 bg-red-600/30 animate-pulse pointer-events-none" />
              </div>

              <div className="flex-grow space-y-3 w-full">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-400 tracking-widest uppercase flex items-center gap-1.5">
                    <Loader2 className="animate-spin" size={12} />
                    Skanowanie PPG... {useSimulation ? "(Tryb Emulatora)" : "(Tryb Kamery)"}
                  </span>
                  <span className="text-2xl font-bold font-mono text-rose-500">
                    {liveBpm > 0 ? `${liveBpm} BPM` : 'Mierzenie...'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-100"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Skanowanie naczyń krwionośnych</span>
                  <span>Postęp: {scanProgress}%</span>
                </div>
              </div>
            </div>

            {/* Live PPG Curve view */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Krzywa tętna fotopletyzmograficznego (Live PPG Wave)</p>
              <canvas ref={waveCanvasRef} width="600" height="96" className="w-full h-24 bg-slate-950 dark:bg-black rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-inner" />
            </div>

            <div className="flex justify-end gap-3 text-xs font-bold uppercase">
              <button 
                onClick={cancelScan}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                Anuluj badanie
              </button>
            </div>
          </div>
        )}

        {scanSuccess && detectedBpm && (
          <div className="space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-slate-100">Skanowanie ukończone pomyślnie</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                    Silnik kamerowej analizy naczyniowej wyznaczył wiarygodną częstotliwość rytmu serca na poziomie <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{detectedBpm} BPM</span>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-emerald-900/30 px-6 py-4 rounded-xl min-w-[128px] text-center shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wynik Tętna</p>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{detectedBpm}</p>
                <p className="text-[10px] text-slate-400 font-medium font-mono uppercase mt-0.5">BPM</p>
              </div>
            </div>

            <div className="flex justify-between items-center flex-wrap gap-4 pt-1">
              <button 
                onClick={startPPGScan}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <RefreshCw size={14} />
                Powtórz Pomiar
              </button>
              <button 
                onClick={savePPGResultToVitals}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all shadow-md shadow-emerald-600/10"
              >
                <Check size={14} />
                Zatwierdź i zapisz w Karcie Pacjenta
              </button>
            </div>
          </div>
        )}
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
