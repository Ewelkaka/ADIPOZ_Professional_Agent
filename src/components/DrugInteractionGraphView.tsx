// src/components/DrugInteractionGraphView.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Network, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Pill, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  Layers, 
  Info, 
  ArrowRightLeft, 
  Plus, 
  X, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  BadgeCheck,
  AlertOctagon,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  HeartHandshake
} from 'lucide-react';
import { 
  DrugInteractionGraphService, 
  DrugNode, 
  DrugInteractionLink, 
  DrugInteractionGraphData, 
  InteractionSeverity 
} from '../services/DrugInteractionGraphService';
import { EReceptaMedication } from '../services/EReceptaService';
import { NotificationService } from '../services/NotificationService';

interface DrugInteractionGraphViewProps {
  eReceptaMedications: EReceptaMedication[];
  chronicMedicationsInput?: string | string[];
  patientAge?: number;
  onAppendToMedicalNote?: (text: string) => void;
  className?: string;
}

export const DrugInteractionGraphView: React.FC<DrugInteractionGraphViewProps> = ({
  eReceptaMedications = [],
  chronicMedicationsInput = '',
  patientAge = 55,
  onAppendToMedicalNote,
  className = ''
}) => {
  const [layoutMode, setLayoutMode] = useState<'BIPARTITE' | 'RADIAL'>('BIPARTITE');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL_ONLY' | 'REFUNDED_ONLY' | 'CROSS_ONLY'>('ALL');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [isCopiedNote, setIsCopiedNote] = useState(false);
  const [customChronicMeds, setCustomChronicMeds] = useState<string[]>([]);
  const [newChronicInput, setNewChronicInput] = useState('');
  const [isAddingChronic, setIsAddingChronic] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // SVG ref do dynamicznych obliczeń wymiarów
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  useEffect(() => {
    const handleResize = () => {
      if (svgContainerRef.current) {
        setContainerWidth(svgContainerRef.current.clientWidth || 700);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Połączone leki stałe (z wejścia pacjenta + ewentualne dodane ad-hoc w UI grafu)
  const combinedChronicInput = useMemo(() => {
    const parsed = DrugInteractionGraphService.parseChronicMedications(chronicMedicationsInput);
    return [...parsed, ...customChronicMeds];
  }, [chronicMedicationsInput, customChronicMeds]);

  // Obliczenie danych grafu
  const graphData: DrugInteractionGraphData = useMemo(() => {
    return DrugInteractionGraphService.generateInteractionGraph(
      eReceptaMedications,
      combinedChronicInput,
      patientAge
    );
  }, [eReceptaMedications, combinedChronicInput, patientAge]);

  // Filtrowane węzły i krawędzie
  const filteredLinks = useMemo(() => {
    return graphData.links.filter(link => {
      if (filterSeverity === 'CRITICAL_ONLY') {
        return link.severity === 'CRITICAL' || link.severity === 'MAJOR';
      }
      if (filterSeverity === 'CROSS_ONLY') {
        return link.isCrossGroup;
      }
      if (filterSeverity === 'REFUNDED_ONLY') {
        const srcNode = graphData.nodes.find(n => n.id === link.sourceId);
        const tgtNode = graphData.nodes.find(n => n.id === link.targetId);
        return srcNode?.isRefunded || tgtNode?.isRefunded;
      }
      return true;
    });
  }, [graphData, filterSeverity]);

  // Aktywny wybrany link lub pierwszy z listy dla podglądu
  const activeLink = useMemo(() => {
    if (selectedLinkId) {
      return graphData.links.find(l => l.id === selectedLinkId) || null;
    }
    if (selectedNodeId) {
      return graphData.links.find(l => l.sourceId === selectedNodeId || l.targetId === selectedNodeId) || null;
    }
    return filteredLinks[0] || null;
  }, [graphData.links, selectedLinkId, selectedNodeId, filteredLinks]);

  // Aktywny wybrany węzeł
  const activeNode = useMemo(() => {
    if (selectedNodeId) {
      return graphData.nodes.find(n => n.id === selectedNodeId) || null;
    }
    return null;
  }, [graphData.nodes, selectedNodeId]);

  // Pozycjonowanie węzłów na canvasie SVG
  const positionedNodes = useMemo(() => {
    const width = Math.max(580, containerWidth);
    const height = layoutMode === 'BIPARTITE' 
      ? Math.max(380, Math.max(graphData.eReceptaCount, graphData.chronicCount) * 85 + 60)
      : 420;

    const eNodes = graphData.nodes.filter(n => n.type === 'E_RECEPTA');
    const cNodes = graphData.nodes.filter(n => n.type === 'CHRONIC');

    if (layoutMode === 'BIPARTITE') {
      const leftX = 140;
      const rightX = width - 140;

      const eSpacing = (height - 80) / Math.max(1, eNodes.length);
      const cSpacing = (height - 80) / Math.max(1, cNodes.length);

      const res: Record<string, { x: number; y: number }> = {};

      eNodes.forEach((node, idx) => {
        res[node.id] = {
          x: leftX,
          y: 50 + idx * eSpacing + eSpacing / 2
        };
      });

      cNodes.forEach((node, idx) => {
        res[node.id] = {
          x: rightX,
          y: 50 + idx * cSpacing + cSpacing / 2
        };
      });

      return { positions: res, width, height };
    } else {
      // Radial / Network layout
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX - 90, centerY - 60, 160);
      const total = graphData.nodes.length;
      const res: Record<string, { x: number; y: number }> = {};

      graphData.nodes.forEach((node, idx) => {
        const angle = (idx / Math.max(1, total)) * 2 * Math.PI - Math.PI / 2;
        res[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      return { positions: res, width, height };
    }
  }, [graphData, layoutMode, containerWidth]);

  // Dodawanie szybkiego leku stałego do symulacji
  const handleAddQuickMed = (medName: string) => {
    if (!customChronicMeds.includes(medName)) {
      setCustomChronicMeds(prev => [...prev, medName]);
      NotificationService.addNotification(
        'INFO',
        'Dodano Lek Przewlekły do Grafu',
        `Dodano ${medName} do weryfikacji interakcji z e-Receptą`
      );
    }
  };

  const handleAddNewChronicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChronicInput.trim()) {
      handleAddQuickMed(newChronicInput.trim());
      setNewChronicInput('');
      setIsAddingChronic(false);
    }
  };

  // Dodawanie notatki o interakcji do dokumentacji
  const handleAppendInteractionToNote = (link: DrugInteractionLink) => {
    const textToAppend = `\n[INTERAKCJA LEKOWA MZ: ${link.title.toUpperCase()}]\n` +
      `- Leki: ${link.sourceName} (${link.sourceType === 'E_RECEPTA' ? 'Nowa e-Recepta' : 'Lek stały'}) <-> ${link.targetName} (${link.targetType === 'E_RECEPTA' ? 'Nowa e-Recepta' : 'Lek stały'})\n` +
      `- Poziom istotności: ${link.severityLabel}\n` +
      `- Mechanizm kliniczny: ${link.mechanism}\n` +
      `- Skutek kliniczny: ${link.clinicalConsequence}\n` +
      `- Zalecenie dla pacjenta/POZ: ${link.recommendation}\n` +
      `- Postępowanie: ${link.managementAction}\n`;

    if (onAppendToMedicalNote) {
      onAppendToMedicalNote(textToAppend);
      setIsCopiedNote(true);
      setTimeout(() => setIsCopiedNote(false), 2000);
      NotificationService.addNotification(
        'SUCCESS',
        'Zapisano w Notatce Medycznej',
        `Dodano ostrzeżenie o interakcji ${link.sourceName} <-> ${link.targetName} do dokumentacji wizyty.`
      );
    } else {
      navigator.clipboard.writeText(textToAppend);
      setIsCopiedNote(true);
      setTimeout(() => setIsCopiedNote(false), 2000);
      NotificationService.addNotification(
        'INFO',
        'Skopiowano do Schowka',
        'Skopiowano treść ostrzeżenia o interakcji do schowka systemowego'
      );
    }
  };

  // Kolorystyka krawędzi według istotności
  const getLinkColor = (severity: InteractionSeverity, isHovered: boolean, isSelected: boolean) => {
    if (isSelected) return '#f43f5e';
    if (isHovered) return '#fbbf24';
    switch (severity) {
      case 'CRITICAL':
        return '#ef4444'; // Czerwony
      case 'MAJOR':
        return '#f97316'; // Pomarańczowy
      case 'MODERATE':
        return '#38bdf8'; // Jasny błękit
      case 'MINOR':
        return '#94a3b8'; // Szary
      case 'SYNERGISTIC':
        return '#10b981'; // Szmaragdowy
    }
  };

  return (
    <div 
      id="drug-interaction-graph-view-card"
      className={`rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-2xl transition-all space-y-4 ${
        isFullScreen ? 'fixed inset-4 z-50 overflow-y-auto bg-slate-950/98 border-teal-500/50 backdrop-blur-xl' : ''
      } ${className}`}
    >
      {/* 1. Nagłówek i Narzędzia Grafu */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-sky-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
            <Network size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Graf Interakcji: e-Recepta ↔ Leki Przewlekłe</span>
              </h3>
              {/* Badge wyróżnienia leków refundowanych w kolorze zielonym */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Leki Refundowane MZ w zieleni
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Wizualizacja zależności farmakologicznych pomiędzy nową e-Receptą a lekami przyjmowanymi na stałe przez pacjenta
            </p>
          </div>
        </div>

        {/* Przyciski filtrów i widoków */}
        <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
          {/* Przełącznik trybu układu grafu */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
            <button
              type="button"
              id="btn-graph-layout-bipartite"
              onClick={() => setLayoutMode('BIPARTITE')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                layoutMode === 'BIPARTITE'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Układ kolumnowy: e-Recepta po lewej, Leki stałe po prawej"
            >
              Kolumny
            </button>
            <button
              type="button"
              id="btn-graph-layout-radial"
              onClick={() => setLayoutMode('RADIAL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                layoutMode === 'RADIAL'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Układ orbitalny / radialny sieci relacji"
            >
              Orbitalny
            </button>
          </div>

          {/* Filtry istotności */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter size={12} className="text-slate-400 ml-1" />
            <select
              id="select-graph-filter-severity"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              aria-label="Filtruj interakcje lekowe"
              className="bg-transparent text-slate-200 text-[11px] font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="ALL" className="bg-slate-900 text-slate-200">Wszystkie interakcje ({graphData.totalInteractions})</option>
              <option value="CRITICAL_ONLY" className="bg-slate-900 text-rose-300">Tylko Krytyczne & Istotne ({graphData.criticalCount + graphData.majorCount})</option>
              <option value="CROSS_ONLY" className="bg-slate-900 text-amber-300">Tylko e-Recepta ↔ Przewlekłe ({graphData.crossGroupInteractionsCount})</option>
              <option value="REFUNDED_ONLY" className="bg-slate-900 text-emerald-300">Tylko z Lekami Refundowanymi ({graphData.refundedCount})</option>
            </select>
          </div>

          {/* Przełącznik pełnego ekranu */}
          <button
            type="button"
            onClick={() => setIsFullScreen(prev => !prev)}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title={isFullScreen ? "Zwiń pełny ekran" : "Rozwiń na pełny ekran"}
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Pasek KPI Bezpieczeństwa Farmakoterapii */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          graphData.criticalCount > 0 
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' 
            : graphData.majorCount > 0 
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' 
              : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}>
          <div>
            <span className="text-[9px] uppercase tracking-wider font-bold block text-slate-400">
              Wykryte Interakcje
            </span>
            <span className="font-mono text-base font-extrabold flex items-center gap-1.5 mt-0.5">
              {graphData.totalInteractions}
              {graphData.criticalCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {graphData.criticalCount} krytycznych
                </span>
              )}
            </span>
          </div>
          {graphData.criticalCount > 0 ? (
            <AlertOctagon size={20} className="text-rose-400 shrink-0" />
          ) : (
            <Activity size={20} className="text-teal-400 shrink-0" />
          )}
        </div>

        {/* Licznik leków refundowanych (w zieleni) */}
        <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-bold block text-emerald-400/80">
              Leki Refundowane MZ
            </span>
            <span className="font-mono text-base font-extrabold flex items-center gap-1.5 mt-0.5">
              {graphData.refundedCount} / {graphData.nodes.length}
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {Math.round((graphData.refundedCount / Math.max(1, graphData.nodes.length)) * 100)}%
              </span>
            </span>
          </div>
          <BadgeCheck size={20} className="text-emerald-400 shrink-0" />
        </div>

        {/* Leki z e-Recepty */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-bold block text-slate-400">
              Pozycje e-Recepty
            </span>
            <span className="font-mono text-base font-extrabold text-sky-300 mt-0.5 block">
              {graphData.eReceptaCount} leki
            </span>
          </div>
          <Pill size={20} className="text-sky-400 shrink-0" />
        </div>

        {/* Leki Stałe Pacjenta */}
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-bold block text-slate-400">
              Leki Przewlekłe (POZ)
            </span>
            <span className="font-mono text-base font-extrabold text-amber-300 mt-0.5 block">
              {graphData.chronicCount} leki
            </span>
          </div>
          <Layers size={20} className="text-amber-400 shrink-0" />
        </div>
      </div>

      {/* 3. Główny Obszar Wizualizacji Grafowej (SVG Interactive Canvas) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Lewa / Główna część: Interaktywne płótno grafu SVG */}
        <div 
          ref={svgContainerRef}
          className="xl:col-span-8 rounded-xl bg-slate-950/90 border border-slate-800/90 p-2 sm:p-3 relative overflow-hidden flex flex-col items-center justify-center min-h-[380px]"
        >
          {/* Etykiety kolumn w trybie Bipartite */}
          {layoutMode === 'BIPARTITE' && (
            <div className="w-full flex items-center justify-between px-6 pb-2 text-[11px] font-bold border-b border-slate-800/60 mb-2">
              <div className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Nowa e-Recepta (Bieżąca wizyta)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Leki Przyjmowane Przewlekle</span>
              </div>
            </div>
          )}

          {/* SVG Graph Canvas */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <svg 
              width={positionedNodes.width} 
              height={positionedNodes.height}
              className="select-none"
              style={{ minWidth: '540px' }}
            >
              <defs>
                {/* Glow filter dla zaznaczonych i refundowanych węzłów */}
                <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {/* Gradienty krawędzi */}
                <linearGradient id="grad-critical" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="grad-major" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="grad-synergy" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              {/* 1. KRAWĘDZIE INTERAKCJI (LINIE GRAFU) */}
              <g className="links-layer">
                {filteredLinks.map((link) => {
                  const sourcePos = positionedNodes.positions[link.sourceId];
                  const targetPos = positionedNodes.positions[link.targetId];
                  if (!sourcePos || !targetPos) return null;

                  const isHovered = hoveredLinkId === link.id || hoveredNodeId === link.sourceId || hoveredNodeId === link.targetId;
                  const isSelected = selectedLinkId === link.id || selectedNodeId === link.sourceId || selectedNodeId === link.targetId;
                  const strokeColor = getLinkColor(link.severity, isHovered, isSelected);

                  // Gładka krzywa Béziera dla trybu Bipartite
                  let pathD = '';
                  if (layoutMode === 'BIPARTITE') {
                    const dx = targetPos.x - sourcePos.x;
                    const cx1 = sourcePos.x + dx * 0.45;
                    const cy1 = sourcePos.y;
                    const cx2 = sourcePos.x + dx * 0.55;
                    const cy2 = targetPos.y;
                    pathD = `M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`;
                  } else {
                    pathD = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
                  }

                  const midX = (sourcePos.x + targetPos.x) / 2;
                  const midY = (sourcePos.y + targetPos.y) / 2;

                  return (
                    <g 
                      key={link.id}
                      className="cursor-pointer transition-all"
                      onClick={() => {
                        setSelectedLinkId(link.id);
                        setSelectedNodeId(null);
                      }}
                      onMouseEnter={() => setHoveredLinkId(link.id)}
                      onMouseLeave={() => setHoveredLinkId(null)}
                    >
                      {/* Niewidoczna szersza ścieżka dla łatwiejszego klikania */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={16}
                      />
                      {/* Widoczna linia relacji */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3.5 : isHovered ? 3 : link.severity === 'CRITICAL' ? 2.5 : 1.8}
                        strokeDasharray={link.severity === 'MODERATE' ? '4 3' : undefined}
                        opacity={
                          selectedLinkId && !isSelected
                            ? 0.25
                            : selectedNodeId && !isSelected
                              ? 0.25
                              : 0.9
                        }
                      />
                      {/* Punctator / Badge na środku krawędzi przy istotnych interakcjach */}
                      {(link.severity === 'CRITICAL' || link.severity === 'MAJOR' || isSelected || isHovered) && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <circle
                            r={isSelected ? 8 : 6}
                            fill={link.severity === 'CRITICAL' ? '#ef4444' : link.severity === 'MAJOR' ? '#f97316' : '#10b981'}
                            stroke="#0f172a"
                            strokeWidth={2}
                          />
                          {link.severity === 'CRITICAL' && (
                            <text
                              textAnchor="middle"
                              dy="3"
                              fontSize="8"
                              fill="#ffffff"
                              fontWeight="bold"
                            >
                              !
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* 2. WĘZŁY LEKÓW (NODES) */}
              <g className="nodes-layer">
                {graphData.nodes.map((node) => {
                  const pos = positionedNodes.positions[node.id];
                  if (!pos) return null;

                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isConnected = hoveredLinkId
                    ? (graphData.links.find(l => l.id === hoveredLinkId)?.sourceId === node.id || graphData.links.find(l => l.id === hoveredLinkId)?.targetId === node.id)
                    : false;

                  const nodeWidth = 135;
                  const nodeHeight = 44;
                  const rectX = pos.x - nodeWidth / 2;
                  const rectY = pos.y - nodeHeight / 2;

                  // WYRÓŻNIENIE LEKÓW REFUNDOWANYCH W KOLORZE ZIELONYM (EMERALD)
                  const isRefunded = node.isRefunded;

                  let borderColor = '#334155';
                  let bgColor = '#0f172a';
                  let textColor = '#f8fafc';

                  if (isRefunded) {
                    // WYRAŹNA ZIELEŃ DLA REFUNDOWANYCH
                    borderColor = isSelected ? '#34d399' : '#10b981';
                    bgColor = isSelected ? '#064e3b' : '#022c22';
                  } else {
                    // Leki nierefundowane (100%)
                    borderColor = isSelected ? '#38bdf8' : node.type === 'E_RECEPTA' ? '#0284c7' : '#d97706';
                    bgColor = isSelected ? '#082f49' : '#090d16';
                  }

                  if (node.interactionCount > 0 && graphData.links.some(l => (l.sourceId === node.id || l.targetId === node.id) && l.severity === 'CRITICAL')) {
                    // Węzeł z krytyczną interakcją
                    if (isSelected) borderColor = '#f43f5e';
                  }

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer transition-transform"
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setSelectedLinkId(null);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      filter={isRefunded && isSelected ? 'url(#glow-green)' : undefined}
                    >
                      {/* Tło prostokąta węzła leku */}
                      <rect
                        x={rectX}
                        y={rectY}
                        width={nodeWidth}
                        height={nodeHeight}
                        rx={10}
                        ry={10}
                        fill={bgColor}
                        stroke={borderColor}
                        strokeWidth={isSelected ? 2.5 : isRefunded ? 2 : 1.2}
                        opacity={
                          (selectedNodeId && !isSelected) || (hoveredLinkId && !isConnected)
                            ? 0.45
                            : 1
                        }
                      />

                      {/* ZIELONY ZNACZNIK REFUNDACJI MZ */}
                      {isRefunded && (
                        <g transform={`translate(${rectX + 6}, ${rectY + 6})`}>
                          <rect
                            x={0}
                            y={0}
                            width={14}
                            height={14}
                            rx={4}
                            fill="#10b981"
                          />
                          <text
                            x={7}
                            y={10.5}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#ffffff"
                            fontWeight="bold"
                          >
                            R
                          </text>
                        </g>
                      )}

                      {/* Typ leku (e-Recepta / Stały) */}
                      <text
                        x={isRefunded ? rectX + 24 : rectX + 8}
                        y={rectY + 14}
                        fontSize="9"
                        fontWeight="600"
                        fill={isRefunded ? '#34d399' : node.type === 'E_RECEPTA' ? '#38bdf8' : '#fbbf24'}
                      >
                        {isRefunded ? `MZ ${node.refundLevel || 'Refund.'}` : (node.type === 'E_RECEPTA' ? 'e-Recepta' : 'Lek stały')}
                      </text>

                      {/* Nazwa leku */}
                      <text
                        x={rectX + 8}
                        y={rectY + 28}
                        fontSize="11"
                        fontWeight="bold"
                        fill={textColor}
                        className="truncate"
                      >
                        {node.cleanName.length > 15 ? `${node.cleanName.slice(0, 14)}…` : node.cleanName}
                      </text>

                      {/* Klasa terapeutyczna / Dawka */}
                      <text
                        x={rectX + 8}
                        y={rectY + 39}
                        fontSize="8"
                        fill="#94a3b8"
                      >
                        {node.dosage || node.therapeuticClass.slice(0, 18)}
                      </text>

                      {/* Licznik interakcji (jeśli > 0) */}
                      {node.interactionCount > 0 && (
                        <g transform={`translate(${rectX + nodeWidth - 16}, ${rectY + 8})`}>
                          <circle
                            r={7}
                            fill={
                              graphData.links.some(l => (l.sourceId === node.id || l.targetId === node.id) && l.severity === 'CRITICAL')
                                ? '#ef4444'
                                : '#f59e0b'
                            }
                          />
                          <text
                            textAnchor="middle"
                            dy="3"
                            fontSize="8"
                            fontWeight="bold"
                            fill="#ffffff"
                          >
                            {node.interactionCount}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Legenda kolorystyczna pod grafem */}
          <div className="w-full pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-400 px-2">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Kluczowe wyróżnienie w zieleni */}
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <span className="w-3 h-3 rounded-md bg-emerald-600 border border-emerald-400 flex items-center justify-center text-[8px] text-white font-bold">R</span>
                Lek Refundowany MZ (Zielony)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-slate-900 border border-slate-600" />
                Lek Pełnopłatny (100%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-1 bg-rose-500 rounded-full" />
                Interakcja Krytyczna
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-1 bg-amber-500 rounded-full" />
                Interakcja Istotna
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-1 bg-emerald-400 rounded-full" />
                Synergia Terapeutyczna
              </span>
            </div>
            <span className="text-slate-400 text-[10px]">
              Kliknij lek lub linię, aby otworzyć szczegóły kliniczne
            </span>
          </div>
        </div>

        {/* Prawa kolumna: Szczegółowy Inspektor Interakcji & Leki Pacjenta */}
        <div className="xl:col-span-4 space-y-3">
          {/* Panel Aktywnej Interakcji lub Wybranego Leku */}
          {activeLink ? (
            <div className={`p-4 rounded-xl border space-y-3 shadow-lg ${
              activeLink.severity === 'CRITICAL' 
                ? 'bg-rose-950/20 border-rose-500/50' 
                : activeLink.severity === 'MAJOR' 
                  ? 'bg-amber-950/20 border-amber-500/50' 
                  : 'bg-slate-900/90 border-slate-800'
            }`}>
              {/* Nagłówek Interakcji */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    activeLink.severity === 'CRITICAL' 
                      ? 'bg-rose-500 animate-ping' 
                      : activeLink.severity === 'MAJOR' 
                        ? 'bg-amber-500' 
                        : 'bg-teal-400'
                  }`} />
                  <h4 className="text-xs font-bold text-white leading-snug">
                    {activeLink.title}
                  </h4>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                  activeLink.severity === 'CRITICAL' 
                    ? 'bg-rose-950 text-rose-300 border-rose-800' 
                    : activeLink.severity === 'MAJOR' 
                      ? 'bg-amber-950 text-amber-300 border-amber-800' 
                      : 'bg-teal-950 text-teal-300 border-teal-800'
                }`}>
                  {activeLink.severity}
                </span>
              </div>

              {/* Porównanie Leki A <-> Lek B */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[9px] uppercase font-bold text-sky-400 block">
                    {activeLink.sourceType === 'E_RECEPTA' ? 'Nowa e-Recepta' : 'Lek Przewlekły'}
                  </span>
                  <p className="font-bold text-white truncate mt-0.5" title={activeLink.sourceName}>
                    {activeLink.sourceName}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[9px] uppercase font-bold text-amber-400 block">
                    {activeLink.targetType === 'E_RECEPTA' ? 'Nowa e-Recepta' : 'Lek Przewlekły'}
                  </span>
                  <p className="font-bold text-white truncate mt-0.5" title={activeLink.targetName}>
                    {activeLink.targetName}
                  </p>
                </div>
              </div>

              {/* Mechanizm i Skutki */}
              <div className="space-y-2 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <div>
                  <strong className="text-slate-400 block text-[10px] uppercase">Mechanizm farmakologiczny:</strong>
                  <p className="mt-0.5 leading-relaxed">{activeLink.mechanism}</p>
                </div>
                <div>
                  <strong className="text-rose-400 block text-[10px] uppercase">Konsekwencja kliniczna:</strong>
                  <p className="mt-0.5 leading-relaxed font-medium text-slate-200">{activeLink.clinicalConsequence}</p>
                </div>
                <div>
                  <strong className="text-emerald-400 block text-[10px] uppercase">Zalecenie postępowania:</strong>
                  <p className="mt-0.5 leading-relaxed text-emerald-300">{activeLink.recommendation}</p>
                </div>
              </div>

              {/* Przycisk dodania ostrzeżenia do notatki */}
              <button
                type="button"
                id="btn-append-interaction-to-note"
                onClick={() => handleAppendInteractionToNote(activeLink)}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                {isCopiedNote ? <Check size={14} /> : <FileText size={14} />}
                <span>{isCopiedNote ? "Dodano do Notatki!" : "Wklej Ostrzeżenie do Notatki"}</span>
              </button>
            </div>
          ) : activeNode ? (
            /* Panel wybranego pojedynczego leku */
            <div className={`p-4 rounded-xl border space-y-3 shadow-lg ${
              activeNode.isRefunded 
                ? 'bg-emerald-950/20 border-emerald-500/40' 
                : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {activeNode.isRefunded && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {activeNode.type === 'E_RECEPTA' ? 'Pozycja z e-Recepty' : 'Lek Przewlekły'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    {activeNode.name}
                  </h4>
                  <p className="text-[11px] text-teal-300 font-mono">
                    INN: {activeNode.innName}
                  </p>
                </div>
                {activeNode.isRefunded ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    MZ {activeNode.refundLevel}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                    100% odpłatności
                  </span>
                )}
              </div>

              <div className="text-[11px] space-y-1.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Klasa:</span>
                  <span className="font-semibold text-slate-200">{activeNode.therapeuticClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Interakcje w zestawie:</span>
                  <span className={`font-bold font-mono ${activeNode.interactionCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {activeNode.interactionCount}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                  {activeNode.refundScopeLabel}
                </div>
              </div>
            </div>
          ) : (
            /* Stan domyślny przy braku interakcji */
            <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2 text-xs text-slate-400">
              <ShieldCheck size={28} className="text-emerald-400 mx-auto" />
              <p className="font-bold text-slate-200">Brak krytycznych kolizji lekowych</p>
              <p className="text-[11px]">
                Wybierz lek lub linię połączenia na grafie, aby przeanalizować mechanizmy farmakodynamiczne.
              </p>
            </div>
          )}

          {/* Szybkie dodawanie leków przewlekłych do testowania interakcji */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers size={13} className="text-amber-400" />
                <span>Symuluj Leki Przewlekłe Pacjenta:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingChronic(prev => !prev)}
                className="text-teal-400 hover:text-teal-300 text-[10px] font-bold cursor-pointer"
              >
                {isAddingChronic ? 'Anuluj' : '+ Dodaj własny'}
              </button>
            </div>

            {/* Formularz wpisu leku */}
            {isAddingChronic && (
              <form onSubmit={handleAddNewChronicSubmit} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="np. Warfin 5mg, Polprazol 20mg..."
                  value={newChronicInput}
                  onChange={(e) => setNewChronicInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Dodaj
                </button>
              </form>
            )}

            {/* Szybkie tagi popularnych leków stałych w POZ */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Spironol 25mg',
                'Ketonal 100mg',
                'Xarelto 20mg',
                'Warfin 5mg',
                'Polprazol 20mg',
                'Atoris 20mg',
                'Klacid 500mg',
                'Cipronex 500mg',
                'Euthyrox 75mcg',
                'Furosemid 40mg'
              ].map((quickMed) => {
                const isAdded = combinedChronicInput.some(m => m.toLowerCase().includes(quickMed.toLowerCase().split(' ')[0]));
                return (
                  <button
                    key={quickMed}
                    type="button"
                    onClick={() => handleAddQuickMed(quickMed)}
                    disabled={isAdded}
                    className={`px-2 py-0.8 rounded-md text-[10px] font-semibold transition-all border cursor-pointer ${
                      isAdded
                        ? 'bg-amber-950/40 text-amber-300/60 border-amber-800/40 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-amber-300'
                    }`}
                  >
                    {isAdded ? `✓ ${quickMed}` : `+ ${quickMed}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
