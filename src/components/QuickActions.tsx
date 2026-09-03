import React from 'react';
import { Copy, Search, Pill, FilePlus, User, Check, FileText, Share2 } from "lucide-react";
import { cn } from "../lib/utils";

export function CopyButton({ label, text, icon }: { label: string, text: string | null | undefined, icon: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false);
  const isDisabled = !text || text.trim() === "";

  const handleCopy = () => {
    if (isDisabled || !text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      disabled={isDisabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors",
        isDisabled 
          ? "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed" 
          : "bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
      )}
      title={isDisabled ? `Brak danych: ${label}` : `Kopiuj: ${label}`}
    >
      {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : icon}
      {label}
    </button>
  );
}

export default function QuickActions({ 
  gotoweTeksty, 
  onSummarize,
  hasMessages,
  lastParsedJson,
  patientInfo
}: { 
  gotoweTeksty: any, 
  onSummarize: () => void,
  hasMessages: boolean,
  lastParsedJson?: any,
  patientInfo?: any
}) {
  const handleDownloadERecepta = () => {
    if (!lastParsedJson?.bezpieczenstwo_lekowe?.leki) return;
    
    let newName = 'Jan Kowalski';
    let newPesel = '80010112345';
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

    const newMeds = lastParsedJson.bezpieczenstwo_lekowe.leki.map((lek: any) => ({
      name: lek.nazwa || '',
      dosage: lek.dawka || '1x1',
      quantity: lek.ilosc || '1 op.'
    }));

    const data = {
      patientName: newName,
      patientPesel: newPesel,
      doctorName: 'Lek. Anna Nowak',
      doctorPzw: '1234567',
      date: new Date().toISOString().split('T')[0],
      accessCode: Math.floor(1000 + Math.random() * 9000).toString(),
      medications: newMeds
    };

    import('../services/EReceptaService').then(({ EReceptaService }) => {
      EReceptaService.downloadJSON(data);
    });
  };

  const handleDownloadFhirBundle = () => {
    if (!lastParsedJson) return;

    import('../services/FhirExportService').then(({ FhirExportService }) => {
      const patientId = patientInfo?.pesel ? `PAC-${patientInfo.pesel.slice(0, 6)}` : 'PAC-12345';
      const meds = lastParsedJson.bezpieczenstwo_lekowe?.leki?.map((l: any) => `${l.nazwa} ${l.dawka}`).join(', ') || '';
      const symptoms = lastParsedJson.dolegliwosci || lastParsedJson.wywiad || lastParsedJson.gotowe_teksty?.dla_pacjenta || 'Konsultacja lekarska';
      
      FhirExportService.downloadBundleJson({
        patientId,
        patientInfo,
        doctorInfo: {
          name: 'Lek. Anna Nowak',
          pwz: '1234567',
          specialization: 'Specjalista Medycyny Rodzinnej (POZ)',
          facility: 'NZOZ Przychodnia Lekarza Rodzinnego POZ'
        },
        symptoms,
        medications: meds,
        analysis: {
          data: {
            decision: {
              diagnosis: lastParsedJson.diagnoza || lastParsedJson.rozpoznanie || (Array.isArray(lastParsedJson.kody_rozliczeniowe?.["ICD-10"]) ? lastParsedJson.kody_rozliczeniowe?.["ICD-10"][0] : lastParsedJson.kody_rozliczeniowe?.["ICD-10"]),
              icd10Code: Array.isArray(lastParsedJson.kody_rozliczeniowe?.["ICD-10"]) ? lastParsedJson.kody_rozliczeniowe?.["ICD-10"][0] : lastParsedJson.kody_rozliczeniowe?.["ICD-10"] || 'Z00.0',
              explanation: lastParsedJson.kody_rozliczeniowe?.Uzasadnienie,
              action: lastParsedJson.zalecenia || lastParsedJson.gotowe_teksty?.dla_pacjenta
            },
            note: {
              content: typeof lastParsedJson === 'string' ? lastParsedJson : JSON.stringify(lastParsedJson, null, 2)
            }
          }
        }
      });
    });
  };

  const hasLeki = !!lastParsedJson?.bezpieczenstwo_lekowe?.leki;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-800 shadow-sm sticky top-0 z-10 flex items-center justify-between transition-colors duration-300">
      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2 text-sm">
          <Copy size={16}/> Szybkie akcje
        </h4>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="eWUŚ" text={gotoweTeksty?.do_eWUS} icon={<Search size={14}/>} />
          <CopyButton label="e-Recepta" text={gotoweTeksty?.do_e_recepty} icon={<Pill size={14}/>} />
          <CopyButton label="Skierowanie" text={gotoweTeksty?.skierowanie} icon={<FilePlus size={14}/>} />
          <CopyButton label="Dla pacjenta" text={gotoweTeksty?.dla_pacjenta} icon={<User size={14}/>} />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {hasLeki && (
          <button
            onClick={handleDownloadERecepta}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
          >
            <FileText size={18} />
            Pobierz JSON (P1)
          </button>
        )}
        {lastParsedJson && (
          <button
            onClick={handleDownloadFhirBundle}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800"
            title="Eksportuj wygenerowaną notatkę i dane do formatu HL7 FHIR Release 4 Bundle dla systemów HIS/EHR"
          >
            <Share2 size={16} />
            Eksport FHIR (HIS/EHR)
          </button>
        )}
        <button
          onClick={onSummarize}
          disabled={!hasMessages}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border",
            hasMessages
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 dark:border-emerald-600"
              : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed"
          )}
        >
          <FileText size={18} />
          Podsumuj wizytę
        </button>
      </div>
    </div>
  );
}
