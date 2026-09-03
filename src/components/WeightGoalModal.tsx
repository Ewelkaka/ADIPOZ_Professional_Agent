import React, { useState, useEffect } from 'react';
import { Target, X, Calendar, Check, Trash2, ArrowRight, Info, Sparkles, TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { WeightGoal, WeightGoalService } from '../services/WeightGoalService';
import { NotificationService } from '../services/NotificationService';

interface WeightGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  currentWeight: number;
  heightCm: number;
  existingGoal: WeightGoal | null;
  onGoalUpdated: (goal: WeightGoal | null) => void;
}

export const WeightGoalModal: React.FC<WeightGoalModalProps> = ({
  isOpen,
  onClose,
  patientId,
  currentWeight,
  heightCm,
  existingGoal,
  onGoalUpdated,
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(currentWeight || 70);
  const [startWeight, setStartWeight] = useState<number>(currentWeight || 70);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (existingGoal) {
      setTargetWeight(existingGoal.targetWeight);
      setStartWeight(existingGoal.startWeight || currentWeight);
      setStartDate(existingGoal.startDate || new Date().toISOString().split('T')[0]);
      setTargetDate(existingGoal.targetDate || '');
      setNotes(existingGoal.notes || '');
    } else {
      setTargetWeight(currentWeight ? Math.max(30, currentWeight - 5) : 70);
      setStartWeight(currentWeight || 70);
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetDate('');
      setNotes('');
    }
  }, [existingGoal, currentWeight, isOpen]);

  if (!isOpen) return null;

  const currentBmi = WeightGoalService.calculateBmi(currentWeight, heightCm);
  const targetBmi = WeightGoalService.calculateBmi(targetWeight, heightCm);
  const diffKg = parseFloat((targetWeight - currentWeight).toFixed(1));

  // Obliczenie wagi dla normy BMI (24.9 oraz 22.0)
  const heightM = heightCm > 0 ? heightCm / 100 : 1.75;
  const normalMaxWeight = parseFloat((24.9 * heightM * heightM).toFixed(1));
  const normalIdealWeight = parseFloat((22.0 * heightM * heightM).toFixed(1));
  const minus5Percent = currentWeight ? parseFloat((currentWeight * 0.95).toFixed(1)) : 0;
  const minus10Percent = currentWeight ? parseFloat((currentWeight * 0.9).toFixed(1)) : 0;

  // Szacowany czas przy bezpiecznym tempie 0.5 kg / tydzień
  const kgToChange = Math.abs(diffKg);
  const estimatedWeeks = Math.ceil(kgToChange / 0.5);

  const handleSave = () => {
    if (!targetWeight || targetWeight < 25 || targetWeight > 300) {
      NotificationService.addNotification('ERROR', 'Błąd celu', 'Wprowadź prawidłową wagę docelową (25 - 300 kg).');
      return;
    }

    const newGoal: WeightGoal = {
      patientId,
      targetWeight,
      startWeight: startWeight || currentWeight,
      startDate: startDate || new Date().toISOString().split('T')[0],
      targetDate: targetDate || undefined,
      notes: notes.trim() || undefined,
      createdAt: existingGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    WeightGoalService.saveGoal(newGoal);
    onGoalUpdated(newGoal);
    NotificationService.addNotification('SUCCESS', 'Cel wagi zapisany', `Ustawiono cel wagi: ${targetWeight} kg (BMI: ${targetBmi}).`);
    onClose();
  };

  const handleDelete = () => {
    WeightGoalService.deleteGoal(patientId);
    onGoalUpdated(null);
    NotificationService.addNotification('INFO', 'Usunięto cel wagi', 'Cel wagi dla pacjenta został pomyślnie usunięty.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weight-goal-title"
      >
        {/* Nagłówek modala */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Target size={20} />
            </div>
            <div>
              <h3 id="weight-goal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {existingGoal ? 'Edycja Celu Wagi Pacjenta' : 'Nowy Cel Wagi Pacjenta'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wyznacz docelową masę ciała i śledź postępy na wykresie BMI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Zamknij"
          >
            <X size={18} />
          </button>
        </div>

        {/* Zawartość formularza */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Podsumowanie parametrów bieżących */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">Aktualna Waga</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                {currentWeight} <span className="text-xs font-sans text-slate-500">kg</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">Aktualne BMI</span>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono">
                {currentBmi} <span className="text-xs font-sans text-slate-500">kg/m²</span>
              </div>
            </div>
          </div>

          {/* Główny input: Waga docelowa */}
          <div className="space-y-2">
            <label htmlFor="target-weight-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Docelowa Masa Ciała (kg) *
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTargetWeight(prev => Math.max(30, parseFloat((prev - 1).toFixed(1))))}
                className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                title="Odejmij 1 kg"
              >
                -1
              </button>
              <div className="relative flex-1">
                <input
                  id="target-weight-input"
                  type="number"
                  step="0.1"
                  min="25"
                  max="300"
                  value={targetWeight || ''}
                  onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                  className="w-full text-center text-2xl font-bold font-mono py-2.5 px-4 bg-white dark:bg-slate-900 border-2 border-purple-500 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="np. 68.0"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  kg
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTargetWeight(prev => Math.min(300, parseFloat((prev + 1).toFixed(1))))}
                className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                title="Dodaj 1 kg"
              >
                +1
              </button>
            </div>

            {/* Szybkie sugestie kliniczne oparte o wzrost pacjenta */}
            {heightCm > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center gap-1">
                  <Sparkles size={12} className="text-purple-500" /> Szybkie cele kliniczne dla wzrostu {heightCm} cm:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetWeight(normalMaxWeight)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    Norma BMI 24.9 ({normalMaxWeight} kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetWeight(normalIdealWeight)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    Idealne BMI 22.0 ({normalIdealWeight} kg)
                  </button>
                  {minus5Percent > 0 && currentWeight > normalMaxWeight && (
                    <button
                      type="button"
                      onClick={() => setTargetWeight(minus5Percent)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Redukcja -5% ({minus5Percent} kg)
                    </button>
                  )}
                  {minus10Percent > 0 && currentWeight > normalMaxWeight && (
                    <button
                      type="button"
                      onClick={() => setTargetWeight(minus10Percent)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Redukcja -10% ({minus10Percent} kg)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Karta z podglądem wyliczonego celu i tempa */}
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Wyliczone docelowe BMI:</span>
              <span className="font-bold text-sm text-purple-700 dark:text-purple-300 font-mono">
                {targetBmi} kg/m²
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Wymagana zmiana:</span>
              <span className={`font-bold text-sm font-mono flex items-center gap-1 ${
                diffKg < 0 ? 'text-emerald-600 dark:text-emerald-400' : diffKg > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
              }`}>
                {diffKg < 0 ? <TrendingDown size={15} /> : diffKg > 0 ? <TrendingUp size={15} /> : <Scale size={15} />}
                {diffKg > 0 ? `+${diffKg}` : diffKg} kg
              </span>
            </div>
            {kgToChange > 0 && (
              <div className="pt-2 border-t border-purple-200/80 dark:border-purple-900/40 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                <Info size={14} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Bezpieczne tempo medyczne (0.5 kg/tydz.): szacunkowy czas to ok. <strong>{estimatedWeeks} tyg.</strong> ({Math.ceil(estimatedWeeks / 4.3)} mies.).
                </span>
              </div>
            )}
          </div>

          {/* Dodatkowe parametry celu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="start-weight-input" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Waga początkowa (kg)
              </label>
              <input
                id="start-weight-input"
                type="number"
                step="0.1"
                value={startWeight || ''}
                onChange={(e) => setStartWeight(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label htmlFor="target-date-input" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Planowana data (opcjonalnie)
              </label>
              <input
                id="target-date-input"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs font-mono py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Notatki kliniczne */}
          <div>
            <label htmlFor="notes-input" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Zalecenia i wytyczne (opcjonalnie)
            </label>
            <textarea
              id="notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Dieta z deficytem 400 kcal, aktywność fizyczna 150 min/tydz., kontrola za 2 miesiące"
              className="w-full text-xs py-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>
        </div>

        {/* Przyciski akcji */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div>
            {existingGoal && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Usuń cel
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-lg transition-colors shadow-md shadow-purple-600/20"
            >
              <Check size={14} />
              Zapisz cel wagi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
