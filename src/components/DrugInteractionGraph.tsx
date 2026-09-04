import React, { useState, useMemo } from 'react';
import { 
  Pill, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Info, 
  Sparkles, 
  Layers, 
  ZoomIn, 
  RotateCcw,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { MedicationRisk } from '../services/MedicationAnalysisEngine';

export interface DrugNode {
  id: string;
  name: string;
  raw: string;
  x: number;
  y: number;
  hasCriticalInteraction: boolean;
  hasModerateInteraction: boolean;
  interactionCount: number;
}

export interface DrugEdge {
  id: string;
  source: string;
  target: string;
  sourceNode: DrugNode;
  targetNode: DrugNode;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  recommendation: string;
  sourceName: string;
  targetName: string;
}

interface DrugInteractionGraphProps {
  medications: string;
  risks?: MedicationRisk[];
  onFocusMedicationField?: () => void;
}

// Baza wiedzy powszechnych interakcji farmakologicznych w POZ (reguły kliniczne)
interface ClinicalRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  recommendation: string;
}

const CLINICAL_INTERACTION_RULES: ClinicalRule[] = [
  {
    drugAKeywords: ['ramipril', 'enalapril', 'lisinopril', 'perindopril', 'kaptopril', 'losartan', 'walsartan', 'telmisartan', 'kandhesartan', 'acei', 'sartan'],
    drugBKeywords: ['spironolakton', 'spironol', 'eplerenon', 'inspra', 'kalipoz', 'kaldyum', 'potas', 'potassium'],
    severity: 'CRITICAL',
    title: 'Ryzyko Ciężkiej Hiperkaliemii',
    description: 'Równoczesne stosowanie inhibitora ACE/sartanu z lekiem oszczędzającym potas lub suplementem potasu drastycznie zwiększa ryzyko zagrażającej życiu hiperkaliemii i zaburzeń przewodnictwa sercowego.',
    recommendation: 'Monitorować stężenie potasu i kreatyniny w surowicy po 1-2 tyg. Unikać rutynowej suplementacji potasu przy spironolaktonie.'
  },
  {
    drugAKeywords: ['ramipril', 'enalapril', 'lisinopril', 'perindopril', 'losartan', 'walsartan', 'telmisartan'],
    drugBKeywords: ['ibuprofen', 'ketonal', 'ketoprofen', 'diklofenak', 'naproksen', 'meloksykam', 'nlpz', 'nimesil', 'dexak'],
    severity: 'HIGH',
    title: 'Nefrotoksyczność i Spadek Efektu Hipotensyjnego (Triple Whammy risk)',
    description: 'NLPZ hamują syntezę prostaglandyn nerkowych, co znosi rozkurcz tętniczki doprowadzającej i w połączeniu z blokadą RAA może wywołać ostrą niewydolność nerek (AKI) oraz skok ciśnienia tętniczego.',
    recommendation: 'Zastąpić NLPZ paracetamolem. W razie konieczności stosować najniższą dawkę NLPZ przez max 3-5 dni i kontrolować diurezę oraz eGFR.'
  },
  {
    drugAKeywords: ['kwas acetylosalicylowy', 'aspiryna', 'acard', 'polocard', 'asa'],
    drugBKeywords: ['ibuprofen', 'ketonal', 'ketoprofen', 'diklofenak', 'naproksen', 'meloksykam', 'nimesil', 'dexak'],
    severity: 'HIGH',
    title: 'Wzrost Ryzyka Krwawień z Przewodu Pokarmowego i Blokada ASA',
    description: 'Ibuprofen kompetycyjnie blokuje dostęp ASA do COX-1 w płytkach, znosząc kardioprotekcję przeciwpłytkową. Równoczesne stosowanie podwaja ryzyko owrzodzeń żołądka i krwotoków.',
    recommendation: 'Przyjmować ASA co najmniej 2 godziny przed NLPZ lub zamienić NLPZ na paracetamol / tramadol. Rozważyć osłonę IPP (np. pantoprazol).'
  },
  {
    drugAKeywords: ['metformina', 'metformax', 'siofor', 'glucophage', 'avamina'],
    drugBKeywords: ['alkohol', 'furosemid', 'kontrast', 'hydrochlorotiazyd'],
    severity: 'HIGH',
    title: 'Ryzyko Kwasicy Mleczanowej i Odwodnienia',
    description: 'Ryzyko kumulacji metforminy i rzadkiej, lecz śmiertelnej kwasicy mleczanowej przy odwodnieniu, spadku eGFR lub interakcji.',
    recommendation: 'Odstawić metforminę 48h przed badaniami z kontrastem jodowym. Monitorować funkcję nerek (eGFR) regularnie.'
  },
  {
    drugAKeywords: ['atorwastatyna', 'simwastatyna', 'rozuwastatyna', 'statyna', 'atorvasterol', 'sortis', 'zahron', 'roswera'],
    drugBKeywords: ['klarytromycyna', 'erytromycyna', 'klacid', 'fromilid', 'itrakonazol', 'flukonazol'],
    severity: 'CRITICAL',
    title: 'Ryzyko Rabdomiolizy i Miopatii (Inhibicja CYP3A4)',
    description: 'Makrolidy silnie hamują CYP3A4, powodując wielokrotny wzrost stężenia statyny we krwi, co może prowadzić do rozpadu mięśni poprzecznie prążkowanych (rabdomiolizy) i ostrej martwicy cewek nerkowych.',
    recommendation: 'Czasowo zawiesić przyjmowanie statyny na czas kuracji antybiotykiem makrolidowym lub zastosować azytromycynę/amoksycylinę.'
  },
  {
    drugAKeywords: ['sertralina', 'escitalopram', 'citalopram', 'fluoksetyna', 'paroksetyna', 'wenlafaksyna', 'duloksetyna', 'ssri', 'snri'],
    drugBKeywords: ['tramadol', 'tramal', 'poltram', 'doreta', 'zaldiar', 'linezolid'],
    severity: 'CRITICAL',
    title: 'Ryzyko Zespołu Serotoninowego',
    description: 'Podwójny mechanizm serotoninergiczny może wywołać potencjalnie zagrażający życiu zespół serotoninowy (drżenia, hipertermia, pobudzenie, klonusy, niestabilność wegetatywna).',
    recommendation: 'Unikać łączenia tramadolu z lekami przeciwdepresyjnymi SSRI/SNRI. Zastosować alternatywny analgetyk (np. paracetamol, metamizol).'
  },
  {
    drugAKeywords: ['bisoprolol', 'metoprolol', 'nebivolol', 'karwedilol', 'betaloc', 'concor', 'nebilet'],
    drugBKeywords: ['werapamil', 'diltiazem', 'isoptin', 'dilzem'],
    severity: 'CRITICAL',
    title: 'Ciężka Bradykardia, Blok Przedsionkowo-Komorowy i Zapaść',
    description: 'Skojarzenie beta-blokera z niedihydropirydynowym antagonistą wapnia (werapamil/diltiazem) wywołuje silny synergizm kardiodepresyjny, grożący asystolią lub blokiem AV III stopnia.',
    recommendation: 'Przeciwwskazane bezwzględnie w warunkach ambulatoryjnych bez stałego monitorowania EKG.'
  },
  {
    drugAKeywords: ['gliklazyd', 'glimepiryd', 'diaprel', 'amaryl', 'sufonylomocznik'],
    drugBKeywords: ['ibuprofen', 'ketonal', 'diklofenak', 'aspiryna', 'biseptol'],
    severity: 'HIGH',
    title: 'Ryzyko Ciężkiej Hipoglikemii',
    description: 'Wypieranie pochodnych sulfonylomocznika z połączeń z białkami osocza przez NLPZ/salicylany nasila działanie hipoglikemizujące, stwarzając ryzyko śpiączki cukrzycowej.',
    recommendation: 'Ścisła samokontrola glikemii. Preferować paracetamol jako bezpieczny lek przeciwbólowy.'
  },
  {
    drugAKeywords: ['klopidogrel', 'plavix', 'areplex', 'clopidogrel'],
    drugBKeywords: ['omeprazol', 'esomeprazol', 'polprazol', 'ortanol', 'helcid'],
    severity: 'HIGH',
    title: 'Spadek Skuteczności Przeciwpłytkowej Klopidogrelu',
    description: 'Omeprazol hamuje CYP2C19, enzym niezbędny do biotransformacji klopidogrelu do aktywnego metabolitu, zwiększając ryzyko zakrzepicy w stencie i zawału serca.',
    recommendation: 'Zamienić omeprazol na pantoprazol (Controloc, Nolpaza) lub famotydynę, które nie wykazują istotnej inhibicji CYP2C19.'
  },
  {
    drugAKeywords: ['warfaryna', 'acenokumarol', 'sintrom', 'warfin'],
    drugBKeywords: ['ibuprofen', 'ketonal', 'diklofenak', 'cipronex', 'klarytromycyna'],
    severity: 'CRITICAL',
    title: 'Ekstremalny Wzrost INR i Ryzyko Krwotoków',
    description: 'Silna interakcja farmakokinetyczna i farmakodynamiczna z antykoagulantami VKA. Wzrost wskaźnika INR > 5.0 i ryzyko krwawień wewnątrzczaszkowych.',
    recommendation: 'Unikać NLPZ. Przy konieczności antybiotykoterapii kontrolować INR co 48-72h i redukować dawkę VKA.'
  }
];

export const DrugInteractionGraph: React.FC<DrugInteractionGraphProps> = ({
  medications,
  risks = [],
  onFocusMedicationField
}) => {
  const [selectedEdge, setSelectedEdge] = useState<DrugEdge | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<DrugEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<DrugNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<DrugNode | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL_HIGH'>('ALL');

  // 1. Parsowanie wprowadzonych leków na listę węzłów
  const parsedMedNames = useMemo(() => {
    if (!medications || !medications.trim()) return [];
    
    // Rozbicie po liniach, przecinkach, średnikach
    const rawTokens = medications
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 1);

    // Oczyszczenie nazwy głównej leku
    const uniqueMap = new Map<string, string>();
    rawTokens.forEach(tok => {
      // Usunięcie dawek (np. 5mg, 100 mg, 1x1, 500)
      const cleanName = tok.replace(/(\d+([\.,]\d+)?\s*(mg|g|ug|ml|tabl|kaps)?|\d+x\d+)/gi, '').trim();
      const key = (cleanName || tok).toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, tok);
      }
    });

    return Array.from(uniqueMap.entries()).map(([cleanKey, raw]) => ({
      key: cleanKey,
      raw: raw,
      displayName: raw.split(/\s+/)[0] || raw
    }));
  }, [medications]);

  // 2. Generowanie powiązań (Edges) na podstawie bazy wiedzy oraz AI Risks
  const { nodes, edges } = useMemo(() => {
    if (parsedMedNames.length === 0) {
      return { nodes: [], edges: [] };
    }

    const n = parsedMedNames.length;
    const width = 500;
    const height = 360;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.36;

    // Pozycjonowanie węzłów na okręgu
    const tempNodes: DrugNode[] = parsedMedNames.map((med, index) => {
      const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        id: `node-${index}-${med.key}`,
        name: med.displayName,
        raw: med.raw,
        x,
        y,
        hasCriticalInteraction: false,
        hasModerateInteraction: false,
        interactionCount: 0
      };
    });

    const detectedEdges: DrugEdge[] = [];
    const edgeKeySet = new Set<string>();

    // Sprawdzenie par leków wg reguł klinicznych
    for (let i = 0; i < tempNodes.length; i++) {
      for (let j = i + 1; j < tempNodes.length; j++) {
        const nodeA = tempNodes[i];
        const nodeB = tempNodes[j];
        const strA = nodeA.raw.toLowerCase();
        const strB = nodeB.raw.toLowerCase();

        for (const rule of CLINICAL_INTERACTION_RULES) {
          const matchA_to_RuleA = rule.drugAKeywords.some(k => strA.includes(k));
          const matchB_to_RuleB = rule.drugBKeywords.some(k => strB.includes(k));
          const matchA_to_RuleB = rule.drugBKeywords.some(k => strA.includes(k));
          const matchB_to_RuleA = rule.drugAKeywords.some(k => strB.includes(k));

          if ((matchA_to_RuleA && matchB_to_RuleB) || (matchA_to_RuleB && matchB_to_RuleA)) {
            const edgeKey = [nodeA.id, nodeB.id].sort().join('--');
            if (!edgeKeySet.has(edgeKey)) {
              edgeKeySet.add(edgeKey);
              
              const edge: DrugEdge = {
                id: `edge-${edgeKey}`,
                source: nodeA.id,
                target: nodeB.id,
                sourceNode: nodeA,
                targetNode: nodeB,
                severity: rule.severity,
                title: rule.title,
                description: rule.description,
                recommendation: rule.recommendation,
                sourceName: nodeA.name,
                targetName: nodeB.name
              };

              detectedEdges.push(edge);

              // Zaktualizuj stan węzłów
              nodeA.interactionCount++;
              nodeB.interactionCount++;
              if (rule.severity === 'CRITICAL' || rule.severity === 'HIGH') {
                nodeA.hasCriticalInteraction = true;
                nodeB.hasCriticalInteraction = true;
              } else {
                nodeA.hasModerateInteraction = true;
                nodeB.hasModerateInteraction = true;
              }
            }
          }
        }
      }
    }

    // Dodatkowo: Sprawdzenie AI risks, jeśli znalazły interakcję
    if (risks && risks.length > 0) {
      risks.forEach((risk, rIdx) => {
        if (risk.type === 'INTERACTION' || risk.message.toLowerCase().includes('interakcj') || risk.message.toLowerCase().includes('łączeni')) {
          // Spróbuj dopasować dwa węzły
          const matchedNodes = tempNodes.filter(nd => risk.message.toLowerCase().includes(nd.name.toLowerCase()));
          if (matchedNodes.length >= 2) {
            const edgeKey = [matchedNodes[0].id, matchedNodes[1].id].sort().join('--');
            if (!edgeKeySet.has(edgeKey)) {
              edgeKeySet.add(edgeKey);
              const edge: DrugEdge = {
                id: `edge-ai-${rIdx}-${edgeKey}`,
                source: matchedNodes[0].id,
                target: matchedNodes[1].id,
                sourceNode: matchedNodes[0],
                targetNode: matchedNodes[1],
                severity: risk.severity === 'CRITICAL' ? 'CRITICAL' : risk.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
                title: 'Interakcja Zidentyfikowana przez CDSS',
                description: risk.message,
                recommendation: risk.recommendation,
                sourceName: matchedNodes[0].name,
                targetName: matchedNodes[1].name
              };
              detectedEdges.push(edge);
              matchedNodes[0].interactionCount++;
              matchedNodes[1].interactionCount++;
              if (edge.severity === 'CRITICAL' || edge.severity === 'HIGH') {
                matchedNodes[0].hasCriticalInteraction = true;
                matchedNodes[1].hasCriticalInteraction = true;
              }
            }
          }
        }
      });
    }

    return { nodes: tempNodes, edges: detectedEdges };
  }, [parsedMedNames, risks]);

  // Filtrowane krawędzie
  const displayedEdges = useMemo(() => {
    if (filterSeverity === 'CRITICAL_HIGH') {
      return edges.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH');
    }
    return edges;
  }, [edges, filterSeverity]);

  // Aktywna krawędź do podglądu (hover lub kliknięcie)
  const activeInspection = hoveredEdge || selectedEdge;

  // Statystyki
  const criticalEdgesCount = edges.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;
  const moderateEdgesCount = edges.filter(e => e.severity === 'MEDIUM' || e.severity === 'LOW').length;

  if (nodes.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center space-y-2">
        <Pill className="mx-auto text-slate-400" size={32} />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Brak wprowadzonych leków do analizy grafu</p>
        <p className="text-[11px] text-slate-400">Wprowadź leki w formularzu pacjenta, aby automatycznie wygenerować wizualną mapę połączeń i interakcji.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nagłówek Mapy Ryzyk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight text-white">Wizualna Mapa Ryzyk i Graf Interakcji Lekowych</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Network CDSS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interaktywny graf połączeń farmakologicznych • Najedź na linię lub węzeł, aby wyświetlić mechanizm i zalecenia
            </p>
          </div>
        </div>

        {/* Przyciski filtrów */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setFilterSeverity('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterSeverity === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Wszystkie ({edges.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('CRITICAL_HIGH')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterSeverity === 'CRITICAL_HIGH'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-800 text-red-300 hover:bg-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Tylko wysokie ryzyko ({criticalEdgesCount})
          </button>
        </div>
      </div>

      {/* Kontener Grafu SVG + Panel Inspekcji */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Kolumna 1: Płótno Grafu SVG */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          
          {/* Płótno Grafu */}
          <div className="relative w-full aspect-[5/4] max-h-[380px] flex items-center justify-center">
            <svg 
              viewBox="0 0 500 360" 
              className="w-full h-full select-none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Filtry cienia i świecenia dla krawędzi */}
                <filter id="glow-critical" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.6" />
                </filter>
                <filter id="glow-moderate" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f59e0b" floodOpacity="0.5" />
                </filter>
                <filter id="node-shadow" x="-10%" y="-10%" width="130%" height="130%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Tło siatki radarowej */}
              <circle cx="250" cy="180" r="130" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" className="text-slate-200 dark:text-slate-800" />
              <circle cx="250" cy="180" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" className="text-slate-200 dark:text-slate-800" />

              {/* 1. KRAWĘDZIE INTERAKCJI (LINIE) */}
              {displayedEdges.map((edge) => {
                const isCritical = edge.severity === 'CRITICAL' || edge.severity === 'HIGH';
                const isHovered = hoveredEdge?.id === edge.id || selectedEdge?.id === edge.id;
                const strokeColor = isCritical ? '#ef4444' : '#f59e0b';
                const strokeWidth = isHovered ? (isCritical ? 5 : 4) : (isCritical ? 3.5 : 2.5);

                // Współrzędne
                const x1 = edge.sourceNode.x;
                const y1 = edge.sourceNode.y;
                const x2 = edge.targetNode.x;
                const y2 = edge.targetNode.y;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g 
                    key={edge.id}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={() => setSelectedEdge(prev => prev?.id === edge.id ? null : edge)}
                  >
                    {/* Niewidoczna szersza strefa do łatwego najechania myszą */}
                    <line 
                      x1={x1} 
                      y1={y1} 
                      x2={x2} 
                      y2={y2} 
                      stroke="transparent" 
                      strokeWidth={20} 
                    />

                    {/* Główna linia interakcji */}
                    <line 
                      x1={x1} 
                      y1={y1} 
                      x2={x2} 
                      y2={y2} 
                      stroke={strokeColor} 
                      strokeWidth={strokeWidth}
                      strokeDasharray={isCritical ? undefined : '5 4'}
                      strokeLinecap="round"
                      filter={isCritical ? 'url(#glow-critical)' : 'url(#glow-moderate)'}
                      opacity={isHovered ? 1 : 0.85}
                    />

                    {/* Znacznik ostrzegawczy na środku linii */}
                    <circle 
                      cx={midX} 
                      cy={midY} 
                      r={isHovered ? 9 : 7} 
                      fill={strokeColor} 
                      stroke="#ffffff" 
                      strokeWidth={1.5}
                      className="transition-all"
                    />
                    <text 
                      x={midX} 
                      y={midY + 3.5} 
                      textAnchor="middle" 
                      fill="#ffffff" 
                      fontSize={isHovered ? 9 : 8} 
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      ⚡
                    </text>
                  </g>
                );
              })}

              {/* 2. WĘZŁY LEKÓW (NODES) */}
              {nodes.map((node) => {
                const isHovered = hoveredNode?.id === node.id || selectedNode?.id === node.id;
                const isConnectedToActiveEdge = activeInspection && (activeInspection.source === node.id || activeInspection.target === node.id);

                let badgeBg = '#10b981'; // green safe
                let ringColor = '#34d399';
                let statusLabel = 'Bezpieczny';

                if (node.hasCriticalInteraction) {
                  badgeBg = '#ef4444'; // red
                  ringColor = '#f87171';
                  statusLabel = 'Wysokie Ryzyko';
                } else if (node.hasModerateInteraction) {
                  badgeBg = '#f59e0b'; // amber
                  ringColor = '#fbbf24';
                  statusLabel = 'Umiarkowane';
                }

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(prev => prev?.id === node.id ? null : node)}
                  >
                    {/* Zewnętrzny pierścień pulsujący / halo */}
                    {(isConnectedToActiveEdge || isHovered || node.hasCriticalInteraction) && (
                      <circle 
                        r={isHovered || isConnectedToActiveEdge ? 24 : 19} 
                        fill={ringColor} 
                        opacity={isHovered || isConnectedToActiveEdge ? 0.35 : 0.2}
                        className={node.hasCriticalInteraction ? 'animate-pulse' : ''}
                      />
                    )}

                    {/* Główny okrąg węzła */}
                    <circle 
                      r={isHovered || isConnectedToActiveEdge ? 16 : 13} 
                      fill={badgeBg} 
                      stroke="#ffffff" 
                      strokeWidth={2}
                      filter="url(#node-shadow)"
                      className="transition-all"
                    />

                    {/* Ikona leku */}
                    <text 
                      x="0" 
                      y="4" 
                      textAnchor="middle" 
                      fill="#ffffff" 
                      fontSize={isHovered ? 12 : 10} 
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      💊
                    </text>

                    {/* Etykieta tekstowa leku */}
                    <g transform={`translate(0, ${node.y > 240 ? 26 : -18})`}>
                      <rect 
                        x={-(node.name.length * 4.2 + 8)} 
                        y="-10" 
                        width={node.name.length * 8.4 + 16} 
                        height="18" 
                        rx="9" 
                        fill="#1e293b" 
                        opacity={isHovered || isConnectedToActiveEdge ? 1 : 0.9} 
                        stroke={isConnectedToActiveEdge ? ringColor : '#475569'}
                        strokeWidth={isConnectedToActiveEdge ? 1.5 : 1}
                      />
                      <text 
                        x="0" 
                        y="2.5" 
                        textAnchor="middle" 
                        fill="#ffffff" 
                        fontSize="10" 
                        fontWeight={isHovered || isConnectedToActiveEdge ? "bold" : "600"}
                        className="pointer-events-none"
                      >
                        {node.name}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legenda na dole grafu */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-1 bg-red-500 rounded-full" />
                <span className="text-red-700 dark:text-red-400 font-bold">Czerwona linia:</span> Wysokie / Krytyczne
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-3 h-1 bg-amber-500 rounded-full border-b border-dashed" />
                <span className="text-amber-700 dark:text-amber-400 font-bold">Żółta linia:</span> Umiarkowane
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400">Węzeł zielony:</span> Bez interakcji
              </span>
            </div>

            <span className="text-[10px] text-slate-400 italic">
              Liczba węzłów: {nodes.length} &bull; Interakcji: {edges.length}
            </span>
          </div>
        </div>

        {/* Kolumna 2: Panel Inspekcji i Szczegółów Interakcji */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {activeInspection ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-red-500/50 dark:border-red-500/40 shadow-lg space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    activeInspection.severity === 'CRITICAL' || activeInspection.severity === 'HIGH'
                      ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  }`}>
                    {activeInspection.severity === 'CRITICAL' ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      activeInspection.severity === 'CRITICAL' || activeInspection.severity === 'HIGH'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {activeInspection.severity === 'CRITICAL' ? '⚠️ KRYTYCZNA INTERAKCJA' : activeInspection.severity === 'HIGH' ? '⚠️ WYSOKIE RYZYKO' : '⚡ UMIARKOWANE RYZYKO'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">
                      {activeInspection.title}
                    </h4>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => { setSelectedEdge(null); setHoveredEdge(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Para leków */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Pill size={14} /> {activeInspection.sourceName}
                </span>
                <span className="text-red-500 text-sm font-bold">⚡ Interakcja ⚡</span>
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Pill size={14} /> {activeInspection.targetName}
                </span>
              </div>

              {/* Opis mechanizmu */}
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Mechanizm i Konsekwencje Kliniczne:
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  {activeInspection.description}
                </p>
              </div>

              {/* Zalecenie dla lekarza */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                <p className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Zalecenie postępowania:
                </p>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                  {activeInspection.recommendation}
                </p>
              </div>
            </div>
          ) : hoveredNode || selectedNode ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Pill size={20} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Węzeł Leku</span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {(hoveredNode || selectedNode)?.raw}
                  </h4>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Wykryte interakcje z innymi lekami:</span>
                  <strong className={(hoveredNode || selectedNode)?.interactionCount ? 'text-red-500' : 'text-emerald-500'}>
                    {(hoveredNode || selectedNode)?.interactionCount || 0}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Status bezpieczeństwa:</span>
                  <strong className={(hoveredNode || selectedNode)?.hasCriticalInteraction ? 'text-red-500' : 'text-emerald-500'}>
                    {(hoveredNode || selectedNode)?.hasCriticalInteraction ? 'Wysokie ryzyko interakcji' : 'Brak krytycznych interakcji'}
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                Wskazówka: Najedź na czerwoną lub żółtą linię połączenia, aby przeczytać dokładny mechanizm interakcji z drugim lekiem.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-xs">
                <Info size={16} className="text-indigo-500" />
                <span>Instrukcja Mapy Ryzyk Farmakoterapii</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Graf przedstawia sieć interakcji pomiędzy lekami aktualnie przyjmowanymi przez pacjenta.
              </p>
              <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Czerwone linie (grube, świecące):</strong> Interakcje o wysokim/krytycznym ryzyku klinicznym (np. hiperkaliemia, krwawienia, rabdomioliza, nefrotoksyczność).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span><strong>Żółte linie (przerywane):</strong> Interakcje o umiarkowanym znaczeniu klinicznym wymagające ostrożności lub modyfikacji dawek.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span><strong>Zielone węzły:</strong> Leki niewchodzące w wykryte kolizje z pozostałymi substancjami.</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  👉 Najedź kursorem na dowolną linię połączenia na grafie, aby wyświetlić szczegółowy panel analizy.
                </p>
              </div>
            </div>
          )}

          {/* Szybka lista wszystkich wykrytych interakcji */}
          {edges.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Zidentyfikowane pary interakcji ({edges.length})</span>
                <span className="text-[10px] text-slate-400">Kliknij parę</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                {edges.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedEdge(e)}
                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer border ${
                      selectedEdge?.id === e.id
                        ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${e.severity === 'CRITICAL' || e.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="font-semibold truncate">{e.sourceName} + {e.targetName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate ml-2">{e.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
