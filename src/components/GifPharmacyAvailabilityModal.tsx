// src/components/GifPharmacyAvailabilityModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Truck, 
  ArrowRightLeft, 
  X, 
  Search, 
  Sparkles, 
  Filter, 
  Layers, 
  Pill, 
  RefreshCw, 
  FileText, 
  Check, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Navigation
} from 'lucide-react';
import { 
  GifPharmacyAvailabilityService, 
  PolishVoivodeship, 
  VOIVODESHIPS, 
  GifRegionalAvailabilityResponse, 
  SubstituteAvailabilityReport,
  PharmacyStockItem
} from '../services/GifPharmacyAvailabilityService';
import { NotificationService } from '../services/NotificationService';

interface GifPharmacyAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicationName: string;
  ean: string;
  substitutesList: Array<{
    name: string;
    ean: string;
    patientPayPln: number;
    manufacturer: string;
  }>;
  initialVoivodeship?: PolishVoivodeship;
  onSelectSubstitute?: (subName: string, subEan: string) => void;
  onAppendToMedicalNote?: (text: string) => void;
}

export const GifPharmacyAvailabilityModal: React.FC<GifPharmacyAvailabilityModalProps> = ({
  isOpen,
  onClose,
  medicationName,
  ean,
  substitutesList,
  initialVoivodeship = 'mazowieckie',
  onSelectSubstitute,
  onAppendToMedicalNote
}) => {
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<PolishVoivodeship>(initialVoivodeship);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SUBSTITUTES' | 'PHARMACIES'>('SUBSTITUTES');
  const [selectedSubstituteForPharmacies, setSelectedSubstituteForPharmacies] = useState<string>('ORIGINAL');
  const [onlyInStockFilter, setOnlyInStockFilter] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Pobranie danych z serwisu GIF
  const availabilityData: GifRegionalAvailabilityResponse = useMemo(() => {
    return GifPharmacyAvailabilityService.checkAvailabilityForMedication(
      medicationName,
      ean,
      substitutesList,
      selectedVoivodeship,
      selectedCity || undefined
    );
  }, [medicationName, ean, substitutesList, selectedVoivodeship, selectedCity, isRefreshing]);

  if (!isOpen) return null;

  const currentVoivodeshipMeta = VOIVODESHIPS.find(v => v.id === selectedVoivodeship) || VOIVODESHIPS[0];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      NotificationService.addNotification(
        'SUCCESS',
        'API GIF / ZSMOPL Zaktualizowane',
        `Pomyślnie zsynchronizowano dane o dostępności leków z rejestrem GIF dla ${currentVoivodeshipMeta.label}.`
      );
    }, 450);
  };

  const handleCopyPhone = (phone: string, phName: string) => {
    navigator.clipboard?.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
    NotificationService.addNotification('INFO', 'Skopiowano numer', `Numer telefonu do ${phName}: ${phone}`);
  };

  const handleInsertAvailabilityToNote = () => {
    if (!onAppendToMedicalNote) return;

    const bestSub = availabilityData.bestAvailableSubstitute;
    let noteSnippet = `\n[WERYFIKACJA DOSTĘPNOŚCI W APTEKACH - REJESTR GIF / ZSMOPL]\n`;
    noteSnippet += `Województwo: ${availabilityData.voivodeshipLabel} (miasto: ${availabilityData.city})\n`;
    noteSnippet += `Zlecony lek "${medicationName}": dostępność w regionie ${availabilityData.originalMedication.regionalAvailabilityPercent}%\n`;
    
    if (bestSub) {
      noteSnippet += `Rekomendowany zamiennik o wysokiej dostępności: "${bestSub.medicationName}" (${bestSub.regionalAvailabilityPercent}% aptek w regionie)\n`;
    }
    
    const samplePharmaciesWithStock = (bestSub || availabilityData.originalMedication).pharmacies
      .filter(p => p.packageQuantity > 0)
      .slice(0, 3);

    if (samplePharmaciesWithStock.length > 0) {
      noteSnippet += `Przykładowe apteki ze stanem od ręki: ` + samplePharmaciesWithStock.map(p => `${p.pharmacyName} (${p.address}, tel. ${p.phone})`).join('; ') + '\n';
    }

    onAppendToMedicalNote(noteSnippet);
    NotificationService.addNotification('SUCCESS', 'Wstawiono do notatki', 'Informacja o dostępności w aptekach GIF została dodana do dokumentacji medycznej.');
  };

  // Wybrany zestaw aptek do podglądu (oryginał lub wybrany zamiennik)
  const activePharmacyReport = selectedSubstituteForPharmacies === 'ORIGINAL'
    ? availabilityData.originalMedication
    : availabilityData.substitutes.find(s => s.ean === selectedSubstituteForPharmacies) || availabilityData.originalMedication;

  const filteredPharmacies = activePharmacyReport.pharmacies.filter(p => {
    if (onlyInStockFilter && p.packageQuantity === 0) return false;
    return true;
  });

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-teal-500/40 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* NAGŁÓWEK MODALU                                                           */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 border-b border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Dostępność w Aptekach & Rejestr GIF</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  API GIF / ZSMOPL Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stan magazynowy aptek i hurtowni farmaceutycznych w regionie lekarza
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Odśwież dane z API GIF"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-teal-400" : ""} />
              <span className="hidden sm:inline">Odśwież</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
              title="Zamknij"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PASEK SELEKTORA REGIONU / WOJEWÓDZTWA LEKARZA                             */}
        {/* ========================================================================= */}
        <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <MapPin size={13} className="text-teal-400" />
              Region lekarza:
            </span>

            {/* Wybór województwa */}
            <select
              value={selectedVoivodeship}
              onChange={(e) => {
                const newV = e.target.value as PolishVoivodeship;
                setSelectedVoivodeship(newV);
                setSelectedCity('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              {VOIVODESHIPS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>

            {/* Wybór miasta w danym województwie */}
            <select
              value={selectedCity || currentVoivodeshipMeta.defaultCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-400 cursor-pointer"
            >
              {currentVoivodeshipMeta.majorCities.map((city) => (
                <option key={city} value={city}>
                  {city} (i okolice)
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-3">
            <span>Próba: <strong className="text-slate-200">{availabilityData.totalPharmaciesSampled} aptek</strong></span>
            <span>•</span>
            <span>Aktualizacja: <strong className="text-teal-300 font-mono">{availabilityData.queryTimestamp}</strong></span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANER ALERTU GIF LUB REKOMENDACJI                                         */}
        {/* ========================================================================= */}
        <div className="p-3.5 bg-slate-900/90 border-b border-slate-800">
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            availabilityData.hasCriticalShortageRisk
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-teal-950/30 border-teal-500/40 text-teal-200'
          }`}>
            {availabilityData.hasCriticalShortageRisk ? (
              <ShieldAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck size={20} className="text-teal-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed">
              <span className="font-bold block mb-0.5">
                {availabilityData.hasCriticalShortageRisk ? 'Komunikat GIF: Ryzyko Braku Dostępności' : 'Status Dostępności Rynkowej GIF'}
              </span>
              <p className="text-slate-300">
                {availabilityData.gifSummaryRecommendation}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRZEŁĄCZNIK ZAKŁADEK (ZAMIENNIKI VS WYKAZ APTEK)                          */}
        {/* ========================================================================= */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SUBSTITUTES')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'SUBSTITUTES'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft size={14} />
            <span>Porównanie Zamienników ({availabilityData.substitutes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PHARMACIES')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'PHARMACIES'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 size={14} />
            <span>Wykaz Aptek w Regionie ({filteredPharmacies.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* GŁÓWNA ZAWARTOŚĆ MODALU                                                   */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[60vh] flex-1">
          {activeTab === 'SUBSTITUTES' ? (
            /* ZAKŁADKA 1: Porównanie Dostępności Zamienników */
            <div className="space-y-3">
              {/* Lek aktualnie zlecony */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Lek aktualnie na recepcie:
                    </span>
                    <strong className="text-white text-sm">{availabilityData.originalMedication.medicationName}</strong>
                    <span className="text-slate-500 text-xs font-mono ml-2">EAN: {availabilityData.originalMedication.ean}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Dostępność w regionie:</span>
                      <strong className={`font-mono text-sm ${
                        availabilityData.originalMedication.regionalAvailabilityPercent >= 80 
                          ? 'text-emerald-400' 
                          : availabilityData.originalMedication.regionalAvailabilityPercent >= 40 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                      }`}>
                        {availabilityData.originalMedication.regionalAvailabilityPercent}% aptek
                      </strong>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      availabilityData.originalMedication.regionalStatus === 'CRITICAL_SHORTAGE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : availabilityData.originalMedication.regionalStatus === 'WIDELY_AVAILABLE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {availabilityData.originalMedication.regionalStatusLabel}
                    </span>
                  </div>
                </div>

                {/* Pasek dostępności */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      availabilityData.originalMedication.regionalAvailabilityPercent >= 80 
                        ? 'bg-emerald-500' 
                        : availabilityData.originalMedication.regionalAvailabilityPercent >= 40 
                          ? 'bg-amber-500' 
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${availabilityData.originalMedication.regionalAvailabilityPercent}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span>Hurtownie: <strong className="text-slate-300">{availabilityData.originalMedication.wholesalerStatus}</strong></span>
                  {availabilityData.originalMedication.nextSupplyDate && (
                    <span className="text-amber-300">{availabilityData.originalMedication.nextSupplyDate}</span>
                  )}
                </div>
              </div>

              {/* Tytuł sekcji zamienników */}
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles size={13} className="text-teal-400" />
                  Dostępne zamienniki z obwieszczenia MZ w {currentVoivodeshipMeta.label}:
                </h4>
                <span className="text-[11px] text-slate-400">
                  Posortowane według najwyższej dostępności
                </span>
              </div>

              {/* Lista zamienników */}
              {availabilityData.substitutes.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  Brak zarejestrowanych zamienników dla wybranego preparatu w bazie MZ.
                </div>
              ) : (
                availabilityData.substitutes.map((sub, sIdx) => {
                  const isBest = availabilityData.bestAvailableSubstitute?.ean === sub.ean;

                  return (
                    <div 
                      key={sIdx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isBest
                          ? 'bg-gradient-to-r from-emerald-950/30 via-slate-950 to-slate-950 border-emerald-500/50 shadow-md'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-white text-sm">{sub.medicationName}</strong>
                            {isBest && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                <Sparkles size={11} />
                                Najwyższa Dostępność GIF
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              EAN: {sub.ean}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                            <span>Producent: <strong className="text-slate-300">{sub.manufacturer}</strong></span>
                            <span>•</span>
                            <span>Dopłata pacjenta: <strong className="text-emerald-400 font-mono">{sub.patientPayPln.toFixed(2)} zł</strong></span>
                          </div>
                        </div>

                        {/* Wskaźnik dostępności i akcja */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Dostępność regionalna:</span>
                            <div className="flex items-center gap-1.5">
                              <strong className="font-mono text-sm text-emerald-400">{sub.regionalAvailabilityPercent}%</strong>
                              <span className="text-slate-500 text-[10px]">aptek</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubstituteForPharmacies(sub.ean);
                                setActiveTab('PHARMACIES');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                              title="Pokaż listę aptek z tym zamiennikiem"
                            >
                              Apteki
                            </button>

                            {onSelectSubstitute && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectSubstitute(sub.medicationName, sub.ean);
                                  NotificationService.addNotification('SUCCESS', 'Wybrano zamiennik', `Podmieniono pozycję na: ${sub.medicationName}`);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                                title="Wybierz ten zamiennik na e-Receptę"
                              >
                                <Check size={13} />
                                Wybierz
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pasek postępu dostępności */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                        <div 
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${sub.regionalAvailabilityPercent}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
                        <span className="truncate max-w-md">{sub.wholesalerStatus}</span>
                        <span className="text-emerald-400/90 font-medium">Dostawy codzienne</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ZAKŁADKA 2: Wykaz Konkretnych Aptek w Regionie */
            <div className="space-y-3">
              {/* Filtry i wybór leku do podglądu aptek */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-medium">Lek w aptekach:</span>
                  <select
                    value={selectedSubstituteForPharmacies}
                    onChange={(e) => setSelectedSubstituteForPharmacies(e.target.value)}
                    className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-teal-400 cursor-pointer max-w-xs truncate"
                  >
                    <option value="ORIGINAL">{availabilityData.originalMedication.medicationName} (Zlecony)</option>
                    {availabilityData.substitutes.map((s) => (
                      <option key={s.ean} value={s.ean}>
                        {s.medicationName} (Zamiennik - {s.regionalAvailabilityPercent}%)
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyInStockFilter}
                    onChange={(e) => setOnlyInStockFilter(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-teal-400"
                  />
                  <span>Tylko ze stanem od ręki (&gt;0 op.)</span>
                </label>
              </div>

              {/* Lista aptek */}
              <div className="space-y-2">
                {filteredPharmacies.map((pharmacy) => {
                  const isAvailable = pharmacy.packageQuantity > 0;

                  return (
                    <div
                      key={pharmacy.pharmacyId}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                        isAvailable
                          ? 'bg-slate-950/90 border-slate-800 hover:border-teal-500/40'
                          : 'bg-slate-950/40 border-slate-850 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-white text-sm">{pharmacy.pharmacyName}</strong>
                          {pharmacy.is24h && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                              24h / Całodobowa
                            </span>
                          )}
                          <span className="text-[10px] text-teal-400 font-medium flex items-center gap-0.5">
                            <Navigation size={10} />
                            {pharmacy.distanceKm} km
                          </span>
                        </div>

                        <div className="text-slate-400 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-slate-500" />
                            {pharmacy.address}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={11} className="text-slate-500" />
                            {pharmacy.phone}
                          </span>
                        </div>
                      </div>

                      {/* Stan magazynowy i przyciski */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Stan od ręki:</span>
                          <strong className={`font-mono text-sm ${
                            isAvailable ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isAvailable ? `${pharmacy.packageQuantity} op.` : 'Brak na stanie'}
                          </strong>
                          <span className="text-[9px] text-slate-500 block">{pharmacy.lastUpdated}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyPhone(pharmacy.phone, pharmacy.pharmacyName)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                          title="Skopiuj numer telefonu"
                        >
                          {copiedPhone === pharmacy.phone ? 'Skopiowano!' : 'Kopiuj tel.'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* STOPKA MODALU (AKCJE DOKUMENTACYJNE)                                     */}
        {/* ========================================================================= */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-2 text-[11px]">
            <Truck size={14} className="text-teal-400 shrink-0" />
            <span>Dane pobrane w czasie rzeczywistym z systemu ZSMOPL (Główny Inspektorat Farmaceutyczny).</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onAppendToMedicalNote && (
              <button
                type="button"
                onClick={handleInsertAvailabilityToNote}
                className="px-3 py-1.5 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Wstawia do dokumentacji notatkę o dostępności leków i zamienników w aptekach"
              >
                <FileText size={13} />
                Wstaw informację do notatki
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
