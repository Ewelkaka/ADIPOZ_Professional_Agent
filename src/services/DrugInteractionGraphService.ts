// src/services/DrugInteractionGraphService.ts
import { EReceptaMedication } from './EReceptaService';
import { RefundacjaMzService, MzDrugItem, MarketAvailabilityStatus } from './RefundacjaMzService';

export type InteractionSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR' | 'SYNERGISTIC';

export interface DrugNode {
  id: string;
  name: string;
  cleanName: string;
  innName: string;
  dosage?: string;
  type: 'E_RECEPTA' | 'CHRONIC';
  isRefunded: boolean;
  refundLevel: string; // 'R' | '30%' | '50%' | '100%' | 'S' | 'bezpłatne'
  refundScopeLabel?: string;
  atcCode?: string;
  eanGtin?: string;
  retailPricePln?: number;
  patientPayPln?: number;
  availability?: MarketAvailabilityStatus;
  therapeuticClass: string;
  interactionCount: number;
  // Współrzędne dla układów grafu
  x?: number;
  y?: number;
}

export interface DrugInteractionLink {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  sourceType: 'E_RECEPTA' | 'CHRONIC';
  targetType: 'E_RECEPTA' | 'CHRONIC';
  isCrossGroup: boolean; // Interakcja między e-Receptą a lekiem stałym pacjenta
  severity: InteractionSeverity;
  severityLabel: string;
  title: string;
  mechanism: string;
  clinicalConsequence: string;
  recommendation: string;
  managementAction: 'AVOID' | 'MONITOR' | 'DOSE_ADJUST' | 'SAFE_COMBINATION';
  evidenceLevel: 'A' | 'B' | 'C';
}

export interface DrugInteractionGraphData {
  nodes: DrugNode[];
  links: DrugInteractionLink[];
  totalInteractions: number;
  criticalCount: number;
  majorCount: number;
  moderateCount: number;
  refundedCount: number;
  eReceptaCount: number;
  chronicCount: number;
  crossGroupInteractionsCount: number;
  safetyScore: number; // 0 - 100%
  overallStatus: 'SAFE' | 'WARNING' | 'CRITICAL';
}

interface InteractionRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  title: string;
  severity: InteractionSeverity;
  mechanism: string;
  clinicalConsequence: string;
  recommendation: string;
  managementAction: 'AVOID' | 'MONITOR' | 'DOSE_ADJUST' | 'SAFE_COMBINATION';
  evidenceLevel: 'A' | 'B' | 'C';
}

export class DrugInteractionGraphService {
  /**
   * Baza reguł klinicznych interakcji lekowych w praktyce POZ i ambulatoryjnej
   */
  private static INTERACTION_RULES: InteractionRule[] = [
    // 1. ACE-I / ARB + Spironolakton / Eplerenon
    {
      drugAKeywords: ['ramipril', 'prestarium', 'perindopril', 'vivace', 'polpril', 'enalapril', 'lisinopril', 'losartan', 'valsartan', 'kandensartan', 'telmisartan', 'ace-i', 'arb'],
      drugBKeywords: ['spironol', 'spironolakton', 'eplerenon', 'inspra', 'finrenon'],
      title: 'Podwójna blokada RAA – Ryzyko ciężkiej hiperkaliemii',
      severity: 'CRITICAL',
      mechanism: 'Jednoczesne hamowanie układu renina-angiotensyna-aldosteron (RAA) drastycznie zmniejsza nerkowe wydalanie potasu.',
      clinicalConsequence: 'Zwiększone ryzyko groźnej dla życia hiperkaliemii (>5.5-6.0 mmol/l), zaburzeń przewodnictwa i zatrzymania krążenia.',
      recommendation: 'Skontroluj poziom K+ oraz kreatyniny/eGFR przed wdrożeniem i po 7-14 dniach. Unikaj suplementacji potasu.',
      managementAction: 'MONITOR',
      evidenceLevel: 'A'
    },
    // 2. ACE-I / ARB + NLPZ (np. Ketoprofen, Ibuprofen, Diklofenak)
    {
      drugAKeywords: ['ramipril', 'prestarium', 'perindopril', 'vivace', 'polpril', 'enalapril', 'losartan', 'valsartan', 'telmisartan'],
      drugBKeywords: ['ketonal', 'ketoprofen', 'ibuprofen', 'ibuprom', 'diklofenak', 'diclofenac', 'volteren', 'naproksen', 'meloksykam', 'nlpz', 'dexak', 'dexketoprofen'],
      title: 'ACE-I / ARB + NLPZ – Ryzyko ostrego uszkodzenia nerek (AKI)',
      severity: 'MAJOR',
      mechanism: 'NLPZ hamują syntezę prostaglandyn (zwężenie tętniczki doprowadzającej), a ACE-I rozszerzają tętniczkę odprowadzającą kłębuszka, co drastycznie obniża ciśnienie filtracji kłębuszkowej.',
      clinicalConsequence: 'Osłabienie działania hipotensyjnego leku przeciwnadciśnieniowego oraz ryzyko ostrej niewydolności nerek i retencji sodu.',
      recommendation: 'Ogranicz NLPZ do najkrótszego możliwego czasu lub zamień na paracetamol. Monitoruj ciśnienie tętnicze i diurezę.',
      managementAction: 'DOSE_ADJUST',
      evidenceLevel: 'A'
    },
    // 3. Antykoagulanty (VKA / NOAC) + NLPZ / ASA
    {
      drugAKeywords: ['warfarin', 'warfin', 'acenokumarol', 'aceno', 'xarelto', 'rywaroksaban', 'eliquis', 'apiksaban', 'pradaxa', 'dabigatran', 'lixiana'],
      drugBKeywords: ['ketonal', 'ketoprofen', 'ibuprofen', 'ibuprom', 'diklofenak', 'naproksen', 'aspirin', 'polocard', 'acard', 'kwas acetylosalicylowy', 'meloksykam'],
      title: 'Antykoagulant + NLPZ / ASA – Wysokie ryzyko krwawienia z przewodu pokarmowego',
      severity: 'CRITICAL',
      mechanism: 'Synergistyczne hamowanie hemostazy pierwotnej (agregacja płytek przez NLPZ) i wtórnej (kaskada krzepnięcia przez antykoagulant) z uszkodzeniem śluzówki żołądka.',
      clinicalConsequence: 'Wielokrotny wzrost ryzyka masywnego krwawienia z górnego i dolnego odcinka przewodu pokarmowego oraz udaru krwotocznego.',
      recommendation: 'Bezwzględnie unikaj łączenia bez wskazań kardiochirurgicznych. Jeśli NLPZ konieczny, zastosuj osłonę IPP i paracetamol przeciwbólowo.',
      managementAction: 'AVOID',
      evidenceLevel: 'A'
    },
    // 4. Metformina + Środki kontrastowe / NLPZ / ACE-I przy spadku eGFR
    {
      drugAKeywords: ['metformina', 'metformax', 'siofor', 'glucophage', 'avamina', 'formetic'],
      drugBKeywords: ['ketonal', 'ketoprofen', 'ibuprofen', 'diklofenak', 'furosemid', 'toramid'],
      title: 'Metformina + NLPZ / Diuretyk pętlowy – Ryzyko kumulacji i kwasicy mleczanowej',
      severity: 'MAJOR',
      mechanism: 'NLPZ lub diuretyk mogą wywołać odwodnienie lub przejściowe pogorszenie funkcji nerek, prowadząc do kumulacji metforminy eliminowanej nerkowo.',
      clinicalConsequence: 'Ryzyko rzadkiej, lecz zagrażającej życiu kwasicy mleczanowej u pacjentów ze spadkiem eGFR < 45 ml/min.',
      recommendation: 'Nawadniaj pacjenta, monitoruj eGFR. W razie ostrych infekcji z odwodnieniem zaleć czasowe odstawienie metforminy.',
      managementAction: 'MONITOR',
      evidenceLevel: 'B'
    },
    // 5. Statyny (Atorwastatyna, Simwastatyna) + Makrolidy (Klarytromycyna, Erytromycyna)
    {
      drugAKeywords: ['atoris', 'atorwastatyna', 'sortis', 'tulip', 'simwastatyna', 'zocor', 'simvasterol'],
      drugBKeywords: ['klacid', 'klarytromycyna', 'erytromycyna', 'fromilid', 'klabax'],
      title: 'Statyna + Klarytromycyna (CYP3A4) – Ryzyko rabdomiolizy i miopatii',
      severity: 'CRITICAL',
      mechanism: 'Silne hamowanie izoenzymu CYP3A4 przez klarytromycynę powoduje 4-10-krotny wzrost stężenia statyny we krwi.',
      clinicalConsequence: 'Zwiększone ryzyko toksycznego uszkodzenia mięśni (miopatia), rabdomiolizy z mioglobinurią i ostrej martwicy cewek nerkowych.',
      recommendation: 'Czasowo odstaw atorwastatynę/simwastatynę na czas 7-10 dniowej antybiotykoterapii klarytromycyną lub zamień na azytromycynę/rozuwastatynę.',
      managementAction: 'AVOID',
      evidenceLevel: 'A'
    },
    // 6. Beta-bloker (Bisoprolol, Metoprolol) + Pochodne sulfonylomocznika / Insulina
    {
      drugAKeywords: ['bisocard', 'bisoprolol', 'concor', 'metoprolol', 'betaloc', 'nebilet', 'nebiwolol', 'carvedilol', 'athenolol'],
      drugBKeywords: ['diaprel', 'gliklazyd', 'glimepiryd', 'amaryl', 'symglic', 'insulina', 'lantus', 'novorapid', 'humalog', 'tresiba', 'toujeo'],
      title: 'Beta-bloker + Lek hipoglikemizujący – Maskowanie objawów hipoglikemii',
      severity: 'MODERATE',
      mechanism: 'Beta-blokery tłumią wegetatywne objawy hipoglikemii (tachykardię, drżenie rąk, lęk) za wyjątkiem potliwości.',
      clinicalConsequence: 'Ryzyko nierozpoznanej, przedłużającej się hipoglikemii i utraty przytomności u pacjenta leczonego przeciwcukrzycowo.',
      recommendation: 'Poinformuj pacjenta, że głównym objawem spadku glikemii będzie wzmożone pocenie się. Preferuj kardioselektywne beta-1 blokery.',
      managementAction: 'MONITOR',
      evidenceLevel: 'B'
    },
    // 7. IPP (Omeprazol, Esomeprazol) + Klopidogrel
    {
      drugAKeywords: ['polprazol', 'omeprazol', 'controloc', 'pantoprazol', 'ipp', 'nexium', 'esomeprazol', 'ortanol', 'helides', 'emanera'],
      drugBKeywords: ['klopidogrel', 'plavix', 'areplex', 'zopirag', 'clopidogrel'],
      title: 'IPP (Omeprazol/Esomeprazol) + Klopidogrel – Zmniejszenie aktywności przeciwpłytkowej',
      severity: 'MAJOR',
      mechanism: 'Omeprazol i esomeprazol hamują CYP2C19, enzym niezbędny do bioaktywacji proleku klopidogrelu do aktywnego metabolitu.',
      clinicalConsequence: 'Zmniejszenie skuteczności przeciwpłytkowej klopidogrelu i podwyższone ryzyko incydentów zakrzepowo-zatorowych i zakrzepicy w stencie.',
      recommendation: 'Jeśli konieczna jest osłona żołądka u pacjenta na klopidogrelu, zastosuj pantoprazol (najsłabszy wpływ na CYP2C19).',
      managementAction: 'DOSE_ADJUST',
      evidenceLevel: 'A'
    },
    // 8. Leki wydłużające QT: Fluorochinolony (Cipronex) + Makrolidy / SSRI
    {
      drugAKeywords: ['cipronex', 'cyprofloksacyna', 'levoxa', 'lewofloksacyna', 'nolicin', 'moksyfloksacyna', 'avelox'],
      drugBKeywords: ['klacid', 'klarytromycyna', 'azitrolek', 'azytromycyna', 'sumamed', 'escitalopram', 'citalopram', 'sertralina', 'amiodaron', 'cordarone'],
      title: 'Leki wydłużające odstęp QTc – Ryzyko arytmii komorowych (Torsade de Pointes)',
      severity: 'CRITICAL',
      mechanism: 'Addytywne hamowanie potasowych kanałów IKr w kardiomiocytach i wydłużenie repolaryzacji komór.',
      clinicalConsequence: 'Ryzyko groźnego dla życia wielokształtnego częstoskurczu komorowego (TdP) i nagłego zgonu sercowego.',
      recommendation: 'Unikaj jednoczesnego stosowania dwóch leków wydłużających QT. Wykonaj wyjściowe EKG lub dobierz antybiotyk z grupy beta-laktamów (np. amoksycylinę).',
      managementAction: 'AVOID',
      evidenceLevel: 'A'
    },
    // 9. SSRI / SNRI + Tramadol
    {
      drugAKeywords: ['escitalopram', 'sertralina', 'paroksetyna', 'fluoksetyna', 'wenlafaksyna', 'duloksetyna', 'asentra', 'seronil', 'pram', 'dulsevia', 'alventa'],
      drugBKeywords: ['tramadol', 'doreta', 'skudexa', 'poltram', 'tramal', 'zalviso'],
      title: 'SSRI/SNRI + Tramadol – Ryzyko Zespołu Serotoninowego i obniżenia progu drgawkowego',
      severity: 'CRITICAL',
      mechanism: 'Tramadol hamuje wychwyt zwrotny serotoniny i noradrenaliny, potęgując działanie leków przeciwdepresyjnych SSRI/SNRI.',
      clinicalConsequence: 'Ryzyko zespołu serotoninowego (hipertermia, klonusy, sztywność mięśniowa, pobudzenie) oraz drgawek.',
      recommendation: 'Unikaj tramadolu u pacjentów leczonych SSRI/SNRI. Zastosuj paracetamol, leki rozkurczowe lub nienarkotyczne leki przeciwbólowe.',
      managementAction: 'AVOID',
      evidenceLevel: 'A'
    },
    // 10. Lewotyroksyna (Euthyrox, Letrox) + Preparaty wapnia / żelaza / IPP
    {
      drugAKeywords: ['euthyrox', 'letrox', 'lewotyroksyna', 't4', 'tirozint'],
      drugBKeywords: ['polprazol', 'pantoprazol', 'controloc', 'zelazo', 'tardyferon', 'sorbifer', 'calperos', 'wapn', 'calcium', 'magnez'],
      title: 'Lewotyroksyna + Minerały/IPP – Upośledzenie wchłaniania hormonów tarczycy',
      severity: 'MODERATE',
      mechanism: 'Związki wielowartościowych metali (Fe, Ca, Mg) tworzą nierozpuszczalne chelaty z T4, a leki IPP obniżają kwaśność soku żołądkowego niezbędną do dysolucji.',
      clinicalConsequence: 'Nieskuteczność terapii niedoczynności tarczycy, wzrost stężenia TSH mimo deklarowanego przyjmowania leku.',
      recommendation: 'Zachowaj co najmniej 4-godzinny odstęp między Euthyroxem (na czczo 30-60 min przed śniadaniem) a preparatami Ca/Fe/IPP.',
      managementAction: 'DOSE_ADJUST',
      evidenceLevel: 'B'
    },
    // 11. Allopurynol + Amoksycylina / Ampicylina
    {
      drugAKeywords: ['allopurynol', 'milurit', 'allupol'],
      drugBKeywords: ['amoksycylina', 'amoxicillin', 'duomox', 'augmentin', 'amoksiklav', 'taromentin', 'ampicylina'],
      title: 'Allopurynol + Amoksycylina – Zwiększona częstość wysypek skórnych',
      severity: 'MODERATE',
      mechanism: 'Skojarzenie allopurynolu z aminopenicylinami znacząco zwiększa uwalnianie mediatorów skórnych reakcji nadwrażliwości.',
      clinicalConsequence: 'Wysoki odsetek plamisto-grudkowych osutek skórnych (do 20%), utrudniający diagnostykę alergii na penicyliny.',
      recommendation: 'Uprzedź pacjenta o możliwości wystąpienia wysypki. W razie konieczności antybiotykoterapii rozważ cefalosporynę lub makrolid.',
      managementAction: 'MONITOR',
      evidenceLevel: 'B'
    },
    // 12. Digoksyna + Furosemid / Hydrochlorotiazyd
    {
      drugAKeywords: ['digoksyna', 'digoxin', 'bemecor'],
      drugBKeywords: ['furosemid', 'furosemidum', 'toramid', 'hydrochlorotiazyd', 'indapamid', 'tertensif'],
      title: 'Digoksyna + Diuretyk pętlowy/tiazydowy – Nasilenie kardiotoksyczności przez hipokaliemię',
      severity: 'MAJOR',
      mechanism: 'Diuretyki powodują utratę potasu i magnezu. Hipokaliemia uwrażliwia pompę Na+/K+-ATPazę w sercu na działanie digoksyny.',
      clinicalConsequence: 'Wzrost ryzyka ciężkiego zatrucia glikozydami naparstnicy: bloki p-k, częstoskurcz komorowy, nudności, widzenie w żółtych barwach.',
      recommendation: 'Kontroluj stężenie K+ i Mg2+ w surowicy. Rozważ dodanie spironolaktonu w małej dawce lub suplementację potasu.',
      managementAction: 'MONITOR',
      evidenceLevel: 'A'
    },
    // 13. SGLT-2 (Flozyny) + Diuretyk pętlowy (Furosemid)
    {
      drugAKeywords: ['forxiga', 'jardiance', 'dapagliflozyna', 'empagliflozyna', 'canagliflozin', 'invokana'],
      drugBKeywords: ['furosemid', 'toramid', 'diuver', 'hydrochlorotiazyd'],
      title: 'Flozyna (SGLT-2) + Diuretyk – Synergistyczne odwodnienie i hipotonia ortostatyczna',
      severity: 'MODERATE',
      mechanism: 'SGLT-2 wywołują diurezę osmotyczną i natriurezę, która sumuje się z efektem moczopędnym diuretyków.',
      clinicalConsequence: 'Ryzyko hipowolemii, zawrotów głowy, upadków (zwłaszcza u osób 65+) oraz przejściowego wzrostu stężenia kreatyniny.',
      recommendation: 'Oceń stan nawodnienia. U pacjentów w podeszłym wieku rozważ redukcję dawki diuretyku pętlowego przy włączaniu flozyny.',
      managementAction: 'DOSE_ADJUST',
      evidenceLevel: 'B'
    },
    // 14. Dobre połączenie synergistyczne: Metformina + SGLT-2 (Flozyna)
    {
      drugAKeywords: ['metformina', 'metformax', 'siofor', 'glucophage', 'avamina'],
      drugBKeywords: ['forxiga', 'jardiance', 'dapagliflozyna', 'empagliflozyna'],
      title: 'Metformina + Flozyna (SGLT-2) – Komplementarna nefro- i kardioprotekcja',
      severity: 'SYNERGISTIC',
      mechanism: 'Różne mechanizmy działania: metformina redukuje insulinooporność wątrobową, flozyna indukuje glukozurię i odciąża nerki oraz serce.',
      clinicalConsequence: 'Optymalna kontrola glikemii bez ryzyka hipoglikemii, redukcja masy ciała i istotne obniżenie ryzyka hospitalizacji z powodu niewydolności serca.',
      recommendation: 'Terapia skojarzona w pełni rekomendowana przez wytyczne PTD i refundowana przez NFZ/MZ.',
      managementAction: 'SAFE_COMBINATION',
      evidenceLevel: 'A'
    }
  ];

  /**
   * Zwraca uproszczoną nazwę leku
   */
  public static cleanDrugName(name: string): string {
    if (!name) return '';
    return name
      .replace(/\s+(tabl\.|kaps\.|roztw\.|iniek\.|aerozol|maść|krople|inj\.|powl\.).*/i, '')
      .replace(/\d+(\.\d+)?\s*(mg|g|mcg|µg|ml|j\.m\.|jm|iu|tabl|tab|kaps|s\.c\.|dawk|x\d+)/gi, '')
      .replace(/\b\d+x\d+\b/gi, '')
      .trim();
  }

  /**
   * Określa klasę terapeutyczną leku na podstawie nazwy lub kodu ATC
   */
  public static detectTherapeuticClass(name: string, atcCode?: string): string {
    const lower = name.toLowerCase();
    
    if (lower.includes('ramipril') || lower.includes('prestarium') || lower.includes('perindopril') || lower.includes('polpril') || lower.includes('vivace') || lower.includes('enalapril')) {
      return 'ACE-I (Inhibitor konwertazy)';
    }
    if (lower.includes('forxiga') || lower.includes('jardiance') || lower.includes('dapaglifloz') || lower.includes('empaglifloz') || lower.includes('sglt')) {
      return 'Inhibitor SGLT-2 (Flozyna)';
    }
    if (lower.includes('ozempic') || lower.includes('semaglutyd') || lower.includes('rybelsus') || lower.includes('dulaglutyd') || lower.includes('trulicity')) {
      return 'Agonista GLP-1 (Inkretynomimetyk)';
    }
    if (lower.includes('metformin') || lower.includes('siofor') || lower.includes('glucophage') || lower.includes('metformax') || lower.includes('avamina')) {
      return 'Pochodna biguanidu (Przeciwcukrzycowy)';
    }
    if (lower.includes('bisocard') || lower.includes('bisoprolol') || lower.includes('concor') || lower.includes('metoprolol') || lower.includes('betaloc') || lower.includes('nebilet')) {
      return 'Beta-adrenolityk (Beta-bloker)';
    }
    if (lower.includes('atoris') || lower.includes('atorwastat') || lower.includes('sortis') || lower.includes('roswera') || lower.includes('rozuwastat') || lower.includes('simwastat')) {
      return 'Inhibitor reduktazy HMG-CoA (Statyna)';
    }
    if (lower.includes('spironol') || lower.includes('spironolakton') || lower.includes('eplerenon') || lower.includes('inspra')) {
      return 'Antagonista aldosteronu (MRA)';
    }
    if (lower.includes('furosemid') || lower.includes('toramid') || lower.includes('diuver') || lower.includes('hydrochlorotiazyd')) {
      return 'Diuretyk moczopędny';
    }
    if (lower.includes('xarelto') || lower.includes('eliquis') || lower.includes('pradaxa') || lower.includes('warfarin') || lower.includes('acenokumarol')) {
      return 'Doustny antykoagulant (NOAC / VKA)';
    }
    if (lower.includes('ketonal') || lower.includes('ibuprofen') || lower.includes('diklofenak') || lower.includes('naproksen') || lower.includes('dexak')) {
      return 'NLPZ (Przeciwzapalny/Przeciwbólowy)';
    }
    if (lower.includes('polprazol') || lower.includes('controloc') || lower.includes('pantoprazol') || lower.includes('omeprazol') || lower.includes('esomeprazol')) {
      return 'Inhibitor pompy protonowej (IPP)';
    }
    if (lower.includes('klacid') || lower.includes('cipronex') || lower.includes('duomox') || lower.includes('augmentin') || lower.includes('amoksiklav')) {
      return 'Antybiotyk przeciwbakteryjny';
    }
    if (lower.includes('euthyrox') || lower.includes('letrox') || lower.includes('lewotyroksyna')) {
      return 'Hormon tarczycy (Lewotyroksyna)';
    }
    if (lower.includes('milurit') || lower.includes('allopurynol')) {
      return 'Inhibitor oksydazy ksantynowej (Dna moczanowa)';
    }
    if (lower.includes('escitalopram') || lower.includes('sertralina') || lower.includes('seronil') || lower.includes('dulsevia')) {
      return 'Lek przeciwdepresyjny (SSRI / SNRI)';
    }
    
    if (atcCode) {
      if (atcCode.startsWith('A10')) return 'Lek przeciwcukrzycowy';
      if (atcCode.startsWith('C09')) return 'Lek na układ RAA';
      if (atcCode.startsWith('C07')) return 'Beta-adrenolityk';
      if (atcCode.startsWith('C10')) return 'Lek hipolipemizujący';
      if (atcCode.startsWith('B01')) return 'Lek przeciwzakrzepowy';
      if (atcCode.startsWith('M01')) return 'Lek przeciwzapalny';
      if (atcCode.startsWith('J01')) return 'Lek przeciwbakteryjny';
    }

    return 'Farmakoterapia POZ';
  }

  /**
   * Sprawdza czy lek jest lekiem refundowanym na podstawie bazy MZ
   */
  public static checkIsRefunded(medName: string, refundationLevel?: string): { isRefunded: boolean; officialRefundLevel: string; refundScopeLabel: string } {
    const verified = RefundacjaMzService.findMzDrug({ name: medName, refundationLevel: refundationLevel as any });
    
    if (verified) {
      const isOfficialRefunded = verified.officialRefundLevel !== '100%';
      const isLevelRefunded = refundationLevel ? (refundationLevel !== '100%') : isOfficialRefunded;
      return {
        isRefunded: isLevelRefunded || isOfficialRefunded,
        officialRefundLevel: refundationLevel || verified.officialRefundLevel,
        refundScopeLabel: verified.clinicalCriteriaDescription || 'Pozycja na Liście Leków Refundowanych MZ'
      };
    }

    const hasRefundLevel = refundationLevel && refundationLevel !== '100%';
    return {
      isRefunded: !!hasRefundLevel,
      officialRefundLevel: refundationLevel || '100%',
      refundScopeLabel: hasRefundLevel ? 'Refundacja wg preskrypcji' : 'Lek pełnopłatny (100% odpłatności)'
    };
  }

  /**
   * Wyciąga listę leków przyjmowanych przewlekle z tekstu lub tablicy
   */
  public static parseChronicMedications(chronicInput?: string | string[]): string[] {
    if (!chronicInput) return [];
    if (Array.isArray(chronicInput)) {
      return chronicInput.map(m => m.trim()).filter(m => m.length > 1);
    }
    
    return chronicInput
      .replace(/\r\n/g, '\n')
      .replace(/[\n;+•]/g, ',')
      .replace(/\band\b/gi, ',')
      .replace(/\boraz\b/gi, ',')
      .split(',')
      .map(item => item.trim())
      .filter(item => {
        if (!item || item.length < 2) return false;
        const lower = item.toLowerCase();
        return !['brak', 'brak leków', 'none', 'nie dotyczy', 'nd', '-', 'brak stałych leków'].includes(lower);
      });
  }

  /**
   * Główna metoda generująca kompletny graf interakcji i statusów refundacyjnych MZ
   */
  public static generateInteractionGraph(
    eReceptaMeds: EReceptaMedication[] = [],
    chronicMedsInput: string | string[] = [],
    patientAge: number = 55
  ): DrugInteractionGraphData {
    const nodes: DrugNode[] = [];
    const links: DrugInteractionLink[] = [];
    const parsedChronic = this.parseChronicMedications(chronicMedsInput);

    // Domyślne leki stałe dla celów POZ jeśli pacjent nie ma jeszcze wprowadzonych
    const effectiveChronic = parsedChronic.length > 0 ? parsedChronic : [
      'Metformina 850mg 1x1',
      'Ramipril 5mg 1x1',
      'Bisocard (Bisoprolol) 5mg 1x1'
    ];

    // 1. Tworzenie węzłów leków z e-Recepty
    eReceptaMeds.forEach((med, idx) => {
      const id = `erecepta-med-${idx}`;
      const cleanName = this.cleanDrugName(med.name);
      const mzDrug = RefundacjaMzService.findMzDrug(med);
      const refundInfo = this.checkIsRefunded(med.name, med.refundationLevel);
      const isSenior = patientAge >= 65;
      const effectiveRefundLevel = (isSenior && (refundInfo.officialRefundLevel === 'S' || refundInfo.officialRefundLevel === '30%' || refundInfo.officialRefundLevel === 'R'))
        ? 'S'
        : refundInfo.officialRefundLevel;

      nodes.push({
        id,
        name: med.name,
        cleanName,
        innName: mzDrug?.innName || cleanName,
        dosage: med.dosage,
        type: 'E_RECEPTA',
        isRefunded: refundInfo.isRefunded,
        refundLevel: effectiveRefundLevel,
        refundScopeLabel: refundInfo.refundScopeLabel,
        atcCode: med.atcCode || mzDrug?.atcCode,
        eanGtin: med.eanGtin || mzDrug?.eanGtin,
        retailPricePln: mzDrug?.retailPricePln || 45.0,
        patientPayPln: isSenior ? 0.0 : (mzDrug?.patientPayPlnStandard || 15.0),
        availability: mzDrug?.availability || 'AVAILABLE',
        therapeuticClass: this.detectTherapeuticClass(med.name, med.atcCode || mzDrug?.atcCode),
        interactionCount: 0
      });
    });

    // 2. Tworzenie węzłów leków przyjmowanych przewlekle
    effectiveChronic.forEach((medStr, idx) => {
      const id = `chronic-med-${idx}`;
      const cleanName = this.cleanDrugName(medStr);
      const mzDrug = RefundacjaMzService.findMzDrug({ name: medStr });
      const refundInfo = this.checkIsRefunded(medStr, mzDrug?.officialRefundLevel);

      nodes.push({
        id,
        name: medStr,
        cleanName,
        innName: mzDrug?.innName || cleanName,
        type: 'CHRONIC',
        isRefunded: refundInfo.isRefunded,
        refundLevel: refundInfo.officialRefundLevel,
        refundScopeLabel: refundInfo.refundScopeLabel,
        atcCode: mzDrug?.atcCode,
        eanGtin: mzDrug?.eanGtin,
        retailPricePln: mzDrug?.retailPricePln,
        patientPayPln: mzDrug?.patientPayPlnStandard,
        availability: mzDrug?.availability || 'AVAILABLE',
        therapeuticClass: this.detectTherapeuticClass(medStr, mzDrug?.atcCode),
        interactionCount: 0
      });
    });

    // 3. Sprawdzanie interakcji między każdą parą węzłów (w szczególności e-Recepta ↔ Leki Przewlekłe)
    const checkedPairs = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const pairKey = `${nodeA.id}-${nodeB.id}`;

        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const interaction = this.evaluateInteractionBetweenTwoDrugs(nodeA, nodeB);
        if (interaction) {
          const isCross = (nodeA.type === 'E_RECEPTA' && nodeB.type === 'CHRONIC') || (nodeA.type === 'CHRONIC' && nodeB.type === 'E_RECEPTA');

          links.push({
            id: `link-${nodeA.id}-${nodeB.id}`,
            sourceId: nodeA.id,
            targetId: nodeB.id,
            sourceName: nodeA.name,
            targetName: nodeB.name,
            sourceType: nodeA.type,
            targetType: nodeB.type,
            isCrossGroup: isCross,
            severity: interaction.severity,
            severityLabel: this.getSeverityLabel(interaction.severity),
            title: interaction.title,
            mechanism: interaction.mechanism,
            clinicalConsequence: interaction.clinicalConsequence,
            recommendation: interaction.recommendation,
            managementAction: interaction.managementAction,
            evidenceLevel: interaction.evidenceLevel
          });

          nodeA.interactionCount++;
          nodeB.interactionCount++;
        }
      }
    }

    // Obliczanie statystyk
    const criticalCount = links.filter(l => l.severity === 'CRITICAL').length;
    const majorCount = links.filter(l => l.severity === 'MAJOR').length;
    const moderateCount = links.filter(l => l.severity === 'MODERATE').length;
    const refundedCount = nodes.filter(n => n.isRefunded).length;
    const eReceptaCount = nodes.filter(n => n.type === 'E_RECEPTA').length;
    const chronicCount = nodes.filter(n => n.type === 'CHRONIC').length;
    const crossGroupInteractionsCount = links.filter(l => l.isCrossGroup).length;

    let safetyScore = 100;
    if (criticalCount > 0) safetyScore -= criticalCount * 35;
    if (majorCount > 0) safetyScore -= majorCount * 15;
    if (moderateCount > 0) safetyScore -= moderateCount * 5;
    safetyScore = Math.max(15, Math.min(100, safetyScore));

    const overallStatus: 'SAFE' | 'WARNING' | 'CRITICAL' = 
      criticalCount > 0 ? 'CRITICAL' : (majorCount > 0 ? 'WARNING' : 'SAFE');

    return {
      nodes,
      links,
      totalInteractions: links.length,
      criticalCount,
      majorCount,
      moderateCount,
      refundedCount,
      eReceptaCount,
      chronicCount,
      crossGroupInteractionsCount,
      safetyScore,
      overallStatus
    };
  }

  /**
   * Ewaluacja potencjalnej interakcji między dwoma lekami
   */
  private static evaluateInteractionBetweenTwoDrugs(nodeA: DrugNode, nodeB: DrugNode): InteractionRule | null {
    const textA = `${nodeA.name} ${nodeA.cleanName} ${nodeA.innName} ${nodeA.therapeuticClass}`.toLowerCase();
    const textB = `${nodeB.name} ${nodeB.cleanName} ${nodeB.innName} ${nodeB.therapeuticClass}`.toLowerCase();

    for (const rule of this.INTERACTION_RULES) {
      const matchAInRuleA = rule.drugAKeywords.some(kw => textA.includes(kw.toLowerCase()));
      const matchBInRuleB = rule.drugBKeywords.some(kw => textB.includes(kw.toLowerCase()));

      if (matchAInRuleA && matchBInRuleB) {
        return rule;
      }

      const matchBInRuleA = rule.drugAKeywords.some(kw => textB.includes(kw.toLowerCase()));
      const matchAInRuleB = rule.drugBKeywords.some(kw => textA.includes(kw.toLowerCase()));

      if (matchBInRuleA && matchAInRuleB) {
        return rule;
      }
    }

    return null;
  }

  private static getSeverityLabel(severity: InteractionSeverity): string {
    switch (severity) {
      case 'CRITICAL':
        return 'Krytyczna (Bezwzględne przeciwwskazanie / Duże ryzyko zgonu)';
      case 'MAJOR':
        return 'Istotna klinicznie (Wymaga modyfikacji dawki / Ścisły nadzór)';
      case 'MODERATE':
        return 'Umiarkowana (Wymaga ostrożności i edukacji pacjenta)';
      case 'MINOR':
        return 'Niewielka (Małe znaczenie hemodynamiczne)';
      case 'SYNERGISTIC':
        return 'Synergizm pożądany (Rekomendowane skojarzenie wytycznych)';
    }
  }
}
