import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { EReceptaService, EReceptaData, EReceptaMedication } from '../services/EReceptaService';
import { Pill, FileCode, FileText, X, Plus, Trash2 } from 'lucide-react';

interface EReceptaModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisData: any;
  patientInfo?: any;
}

export default function EReceptaModal({ isOpen, onClose, analysisData, patientInfo }: EReceptaModalProps) {
  const [data, setData] = useState<EReceptaData>({
    patientName: 'Jan Kowalski',
    patientPesel: '80010112345',
    doctorName: 'Lek. Anna Nowak',
    doctorPzw: '1234567',
    date: new Date().toISOString().split('T')[0],
    accessCode: Math.floor(1000 + Math.random() * 9000).toString(),
    medications: []
  });

  useEffect(() => {
    if (isOpen) {
      // Pre-fill from patientInfo if available
      let newName = data.patientName;
      let newPesel = data.patientPesel;
      if (patientInfo) {
        if (patientInfo.imie && patientInfo.nazwisko) {
          newName = `${patientInfo.imie} ${patientInfo.nazwisko}`;
        } else if (patientInfo.name) {
          newName = patientInfo.name;
        }
        if (patientInfo.pesel) {
          newPesel = patientInfo.pesel;
        }
      }

      // Try to extract medications from analysis
      let newMeds: EReceptaMedication[] = [];
      if (analysisData?.bezpieczenstwo_lekowe?.leki && Array.isArray(analysisData.bezpieczenstwo_lekowe.leki) && analysisData.bezpieczenstwo_lekowe.leki.length > 0) {
        newMeds = analysisData.bezpieczenstwo_lekowe.leki.map((lek: any) => ({
          name: lek.nazwa || '',
          dosage: lek.dawka || '1x1',
          quantity: lek.ilosc || '1 op.'
        }));
      } else if (analysisData?.bezpieczenstwo_lekowe) {
        newMeds = [{
          name: 'Sugerowane: ' + (analysisData.bezpieczenstwo_lekowe.interakcje?.substring(0, 30) || 'Lek z analizy'),
          dosage: analysisData.bezpieczenstwo_lekowe.dawkowanie?.substring(0, 50) || '1x1',
          quantity: '1 op.'
        }];
      } else {
        newMeds = [{ name: '', dosage: '', quantity: '' }];
      }

      setData({
        ...data,
        patientName: newName,
        patientPesel: newPesel,
        medications: newMeds,
        accessCode: Math.floor(1000 + Math.random() * 9000).toString()
      });
    }
  }, [isOpen, analysisData, patientInfo]);

  if (!isOpen) return null;

  const handleMedChange = (index: number, field: keyof EReceptaMedication, value: string) => {
    const updated = [...data.medications];
    updated[index][field] = value;
    setData({ ...data, medications: updated });
  };

  const addMed = () => {
    setData({ ...data, medications: [...data.medications, { name: '', dosage: '', quantity: '' }] });
  };

  const removeMed = (index: number) => {
    const updated = data.medications.filter((_, i) => i !== index);
    setData({ ...data, medications: updated });
  };

  const exportJSON = () => {
    EReceptaService.downloadJSON(data);
  };

  const exportPDF = () => {
    EReceptaService.downloadPDF(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/30">
          <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <Pill size={20} />
            Kreator e-Recepty (Standard P1)
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-md">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Pacjent</label>
              <input 
                type="text" 
                value={data.patientName} 
                onChange={e => setData({...data, patientName: e.target.value})}
                className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">PESEL</label>
              <input 
                type="text" 
                value={data.patientPesel} 
                onChange={e => setData({...data, patientPesel: e.target.value})}
                className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">Lekarz Wystawiający</label>
              <input 
                type="text" 
                value={data.doctorName} 
                onChange={e => setData({...data, doctorName: e.target.value})}
                className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">NPWZ</label>
              <input 
                type="text" 
                value={data.doctorPzw} 
                onChange={e => setData({...data, doctorPzw: e.target.value})}
                className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-800 dark:text-slate-200">Leki na recepcie</label>
              <Button size="sm" variant="outline" onClick={addMed} className="h-7 text-xs">
                <Plus size={14} className="mr-1" /> Dodaj lek
              </Button>
            </div>
            <div className="space-y-3">
              {data.medications.map((med, index) => (
                <div key={index} className="flex gap-2 items-start bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      placeholder="Nazwa leku (np. Amoxicillin 500mg)" 
                      value={med.name} 
                      onChange={e => handleMedChange(index, 'name', e.target.value)}
                      className="w-full text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ilość (np. 1 op.)" 
                        value={med.quantity} 
                        onChange={e => handleMedChange(index, 'quantity', e.target.value)}
                        className="w-1/3 text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      />
                      <input 
                        type="text" 
                        placeholder="Dawkowanie (np. 1x1 co 12h)" 
                        value={med.dosage} 
                        onChange={e => handleMedChange(index, 'dosage', e.target.value)}
                        className="w-2/3 text-sm p-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => removeMed(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md mt-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {data.medications.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">Brak leków na recepcie.</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Kod dostępu PIN:</span>
            <span className="bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded tracking-wider font-mono font-bold">{data.accessCode}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportJSON} variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30">
              <FileCode size={16} className="mr-2" />
              Eksportuj P1 JSON
            </Button>
            <Button onClick={exportPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <FileText size={16} className="mr-2" />
              Wydruk PDF e-Recepty
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
