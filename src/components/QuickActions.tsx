import React from 'react';
import { Copy, Search, Pill, FilePlus, User, Check, FileText } from "lucide-react";
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
  hasMessages 
}: { 
  gotoweTeksty: any, 
  onSummarize: () => void,
  hasMessages: boolean
}) {
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

      <div className="flex items-center gap-2">
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
