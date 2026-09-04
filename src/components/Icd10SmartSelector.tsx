// src/components/Icd10SmartSelector.tsx
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Tag, 
  ChevronRight, 
  ChevronDown, 
  Info, 
  Check, 
  Layers, 
  ListFilter, 
  ShieldCheck, 
  BookOpen, 
  Stethoscope,
  HelpCircle,
  Plus
} from 'lucide-react';
import { Icd10Service, Icd10Entry, Icd10Suggestion, ICD10_DATABASE } from '../services/Icd10Service';
import { NotificationService } from '../services/NotificationService';

interface Icd10SmartSelectorProps {
  currentDiagnosis?: string;
  currentIcd10Code?: string;
  symptoms?: string;
  medications?: string;
  vitals?: { bp?: string; pulse?: number; temp?: number };
  patientInfo?: { bmi?: number; weight?: number; age?: number };
  onApplyDiagnosis: (refinedDiagnosis: string, icd10Code: string, note?: string) => void;
  onAddCoDiagnosis?: (coDiagnosis: string, icd10Code: string) => void;
}

export const Icd10SmartSelector: React.FC<Icd10SmartSelectorProps> = ({
  currentDiagnosis = '',
  currentIcd10Code = '',
  symptoms = '',
  medications = '',
  vitals,
  patientInfo,
  onApplyDiagnosis,
  onAddCoDiagnosis
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'SUGGESTIONS' | 'SEARCH'>('SUGGESTIONS');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Icd10Entry | null>(null);

  const categories = useMemo(() => Icd10Service.getCategories(), []);

  // Inteligentne podpowiedzi dopasowane do kontekstu wizyty
  const smartSuggestions = useMemo(() => {
    return Icd10Service.getSmartSuggestions(
      currentDiagnosis,
      symptoms,
      medications,
      vitals,
      patientInfo
    );
  }, [currentDiagnosis, symptoms, medications, vitals, patientInfo]);

  // Wyniki wyszukiwania w katalogu
  const searchResults = useMemo(() => {
    return Icd10Service.search(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const handleSelectCode = (code: string, name: string, entry?: Icd10Entry) => {
    onApplyDiagnosis(name, code, entry?.description);
    NotificationService.addNotification(
      'SUCCESS',
      'Zaktualizowano Diagnozę ICD-10',
      `Przypisano kod ${code} - ${name}`
    );
  };

  const handleAddCoDiagnosis = (code: string, name: string) => {
    if (onAddCoDiagnosis) {
      onAddCoDiagnosis(name, code);
      NotificationService.addNotification(
        'INFO',
        'Dodano Rozpoznanie Współistniejące',
        `Dodano ${code} (${name}) do planu postępowania`
      );
    }
  };

  const isCurrentActive = (code: string) => {
    return currentIcd10Code?.toUpperCase() === code.toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
      {/* Nagłówek Komponentu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
            <Tag size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Inteligentny Podpowiadacz i Kodyfikator ICD-10
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                AI + EBM
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automatyczne dopasowanie i doprecyzowanie jednostek chorobowych wg oficjalnej klasyfikacji WHO / NFZ
            </p>
          </div>
        </div>

        {/* Bieżące Rozpoznanie */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Aktualna Diagnoza
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[200px]" title={currentDiagnosis}>
                {currentDiagnosis || 'Nie wybrano'}
              </span>
              {currentIcd10Code && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-600 text-white rounded">
                  {currentIcd10Code}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Przełącznik Widoków: Sugestie AI vs Katalog / Wyszukiwarka */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('SUGGESTIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SUGGESTIONS'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'SUGGESTIONS' ? 'text-emerald-500' : ''} />
            <span>Sugerowane Doprecyzowania ({smartSuggestions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SEARCH')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SEARCH'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Search size={14} />
            <span>Wyszukiwarka i Baza Kodów</span>
          </button>
        </div>

        {/* Wyszukiwarka na żywo (zawsze widoczna dla szybkiego wpisywania) */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Szukaj po kodzie (np. I10, E11), objawie lub nazwie..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value && activeTab !== 'SEARCH') {
                setActiveTab('SEARCH');
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Wyczyść
            </button>
          )}
        </div>
      </div>

      {/* WIDOK 1: INTELIGENTNE SUGESTIE AGENTA */}
      {activeTab === 'SUGGESTIONS' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-3">
            <Info size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">
                Wskazówka Kliniczna:
              </span>{' '}
              Agent przeanalizował opis choroby, wywiad i leki pacjenta. Kliknij <strong>„Zastosuj Diagnozę”</strong> lub wybierz szczegółowy podkod (np. postać z powikłaniami), aby precyzyjnie zarejestrować rozpoznanie w dokumentacji medycznej.
            </div>
          </div>

          {smartSuggestions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {smartSuggestions.map((sug, idx) => {
                const isActive = isCurrentActive(sug.entry.code);
                const isExpanded = expandedCode === sug.entry.code;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 border transition-all ${
                      isActive
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-bold px-2.5 py-0.5 bg-slate-900 dark:bg-slate-700 text-emerald-400 rounded-md">
                            {sug.entry.code}
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {sug.entry.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {sug.entry.category}
                          </span>
                          {/* Dopasowanie % */}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <Sparkles size={11} />
                            Trafność: {sug.score}%
                          </span>
                        </div>

                        {/* Uzasadnienie dopasowania */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{sug.matchReason}</span>
                        </p>

                        {/* Opis kliniczny / Postępowanie */}
                        {sug.entry.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1">
                            {sug.entry.description}
                          </p>
                        )}
                      </div>

                      {/* Przyciski Akcji */}
                      <div className="flex items-center gap-2 self-start shrink-0 flex-wrap">
                        {sug.entry.subCodes && sug.entry.subCodes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedCode(isExpanded ? null : sug.entry.code)}
                            className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Rozwiń podkody i precyzyjne postacie kliniczne"
                          >
                            <span>Doprecyzuj ({sug.entry.subCodes.length})</span>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}

                        {onAddCoDiagnosis && (
                          <button
                            type="button"
                            onClick={() => handleAddCoDiagnosis(sug.entry.code, sug.entry.name)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                            title="Dodaj jako rozpoznanie współistniejące"
                          >
                            <Plus size={13} />
                            Współistniejąca
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSelectCode(sug.entry.code, sug.entry.name, sug.entry)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            isActive
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check size={14} />
                              Aktywna Diagnoza
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} />
                              Zastosuj Diagnozę
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Rozwinięcie podkodów 4-znakowych (Refinements) */}
                    {isExpanded && sug.entry.subCodes && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          Wybierz oficjalny podkod NFZ dla pełnej specyfikacji:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sug.entry.subCodes.map((sub, sIdx) => {
                            const isSubActive = isCurrentActive(sub.code);
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleSelectCode(sub.code, sub.label, sug.entry)}
                                className={`text-left p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                                  isSubActive
                                    ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {sub.code}
                                  </div>
                                  <div className="text-[11px]">{sub.label}</div>
                                </div>
                                {isSubActive && <Check size={14} className="text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <BookOpen size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Brak bezpośrednich sugestii dla bieżącego opisu
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Użyj wyszukiwarki lub wpisz dokładniejszy opis objawów w formularzu wywiadu.
              </p>
            </div>
          )}
        </div>
      )}

      {/* WIDOK 2: PEŁNA WYSZUKIWARKA I BAZA ICD-10 */}
      {activeTab === 'SEARCH' && (
        <div className="space-y-4">
          {/* Filtr Kategorii */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Wszystkie Rozdziały
            </button>
            {categories.map((cat, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Lista Wyników */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {searchResults.length > 0 ? (
              searchResults.map((entry, i) => {
                const isActive = isCurrentActive(entry.code);
                const isExpanded = expandedCode === entry.code;

                return (
                  <div
                    key={i}
                    className={`rounded-xl p-3.5 border transition-all ${
                      isActive
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-900 dark:bg-slate-700 text-emerald-400 rounded">
                            {entry.code}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {entry.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700">
                            Rozdział {entry.chapter}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {entry.description}
                          </p>
                        )}
                        {entry.suggestedTests && entry.suggestedTests.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Badania POZ:</span>
                            {entry.suggestedTests.slice(0, 3).map((t, tidx) => (
                              <span key={tidx} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {entry.subCodes && (
                          <button
                            type="button"
                            onClick={() => setExpandedCode(isExpanded ? null : entry.code)}
                            className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                          >
                            <span>Podkody ({entry.subCodes.length})</span>
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSelectCode(entry.code, entry.name, entry)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isActive ? <Check size={14} /> : <CheckCircle2 size={14} />}
                          {isActive ? 'Wybrana' : 'Wybierz'}
                        </button>
                      </div>
                    </div>

                    {/* Podkody */}
                    {isExpanded && entry.subCodes && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {entry.subCodes.map((sub, sIdx) => {
                          const isSubActive = isCurrentActive(sub.code);
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleSelectCode(sub.code, sub.label, entry)}
                              className={`text-left p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                isSubActive
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-500 font-bold text-emerald-900 dark:text-emerald-200'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                              }`}
                            >
                              <div>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mr-2">
                                  {sub.code}
                                </span>
                                <span>{sub.label}</span>
                              </div>
                              {isSubActive && <Check size={12} className="text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Nie znaleziono kodów ICD-10 dla frazy "{searchQuery}". Spróbuj wpisać inną nazwę jednostki lub kod główny (np. I10, E11, J06, M54).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
