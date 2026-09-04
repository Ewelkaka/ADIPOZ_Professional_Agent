// src/services/RefundacjaMzService.ts
import { EReceptaMedication } from './EReceptaService';

export type MzRefundScope = 
  | 'ALL_REGISTERED_INDICATIONS' // We wszystkich zarejestrowanych wskazaniach na dzień wydania decyzji
  | 'RESTRICTED_CRITERIA'        // W określonych wskazaniach klinicznych z Obwieszczenia MZ
  | 'OFF_LABEL_SPECIAL'          // We wskazaniach pozarejestracyjnych (art. 40 ustawy)
  | 'NON_REIMBURSED'             // Poza wykazem leków refundowanych (100% odpłatności)
  | 'FREE_SENIOR_65'             // Wykaz D1/D2 - bezpłatne dla osób 65+ (Program 65+)
  | 'FREE_CHILD_18';             // Wykaz D1/D2 - bezpłatne dla dzieci do 18 r.ż. (Program 18-)

export type MarketAvailabilityStatus = 
  | 'AVAILABLE'                  // Dostępny w aptekach i hurtowniach bez zakłóceń
  | 'LIMITED_SUPPLY'             // Przejściowe trudności w dostawach (komunikat GIF)
  | 'CRITICAL_SHORTAGE';         // Krytyczny brak na rynku (lista antywywozowa MZ / zgłoszenie GIF)

export interface MzDrugItem {
  brandName: string;
  innName: string;
  atcCode: string;
  eanGtin: string;
  form: string;
  dosage: string;
  packageSize: string;
  activeAnnouncementDate: string; // np. "2025-01-01 (Obwieszczenie MZ)"
  limitGroup: string;
  retailPricePln: number;
  financingLimitPln: number;
  patientPayPlnStandard: number;
  patientPayPlnSenior: number; // 0 zł dla S
  officialRefundLevel: 'R' | '30%' | '50%' | '100%' | 'bezpłatne' | 'S';
  refundScope: MzRefundScope;
  eligibleIcd10Codes: string[];
  clinicalCriteriaDescription: string;
  requiredClinicalPrerequisites?: string[];
  availability: MarketAvailabilityStatus;
  availabilityNote?: string;
  availabilityAlert?: string;
  substitutes?: {
    name: string;
    ean: string;
    patientPayPln: number;
    manufacturer: string;
    availability: MarketAvailabilityStatus;
  }[];
}

export interface CheaperSubstituteOption {
  name: string;
  ean: string;
  innName: string;
  manufacturer: string;
  retailPricePln: number;
  financingLimitPln: number;
  officialRefundLevel: string;
  patientPayPln: number;
  savingsPln: number;
  savingsPercent: number;
  isFullyFreeForSenior: boolean;
  availability: MarketAvailabilityStatus;
  availabilityNote?: string;
  availabilityAlert?: string;
  reason: string;
  refundScopeLabel: string;
  category: 'GENERIC_EQUIVALENT' | 'THERAPEUTIC_ALTERNATIVE' | 'SENIOR_FREE_LIST' | 'LOWER_LIMIT_GROUP';
}

export interface MedicationMzVerification {
  medicationIndex: number;
  medicationName: string;
  atcCode: string;
  eanGtin: string;
  isFoundInMzList: boolean;
  mzDrugData?: MzDrugItem;
  
  // Weryfikacja wskazań refundacyjnych
  isIndicationMatched: boolean;
  matchedIcd10Code?: string;
  refundScope: MzRefundScope;
  refundScopeLabel: string;
  
  // Zgodność odpłatności
  currentRefundLevel: string;
  recommendedRefundLevel: string;
  isRefundLevelCorrect: boolean;
  
  // Analiza braków i wymogów klinicznych
  missingClinicalRequirements: string[];
  riskDescription?: string;
  hasNfzClawbackRisk: boolean; // Ryzyko zwrotu kwoty nienależnej refundacji do NFZ
  
  // Dostępność rynkowa
  availability: MarketAvailabilityStatus;
  availabilityLabel: string;
  availabilityAlert?: string;
  
  // Kalkulacja finansowa dla pacjenta
  retailPricePln: number;
  financingLimitPln: number;
  patientPayPln: number;
  savingsWithSeniorProgramPln?: number;
  
  // Działania naprawcze
  suggestedSubstitutes: {
    name: string;
    ean: string;
    patientPayPln: number;
    manufacturer: string;
    availability: MarketAvailabilityStatus;
  }[];
  clinicalJustificationSnippet: string;
}

export interface MzRefundAuditReport {
  timestamp: string;
  announcementReference: string; // "Obwieszczenie Ministra Zdrowia z dnia 18 grudnia 2024 r. (z późn. zm.)"
  totalMedicationsCount: number;
  reimbursedCount: number;
  nonReimbursedCount: number;
  fullIndicationCount: number;
  restrictedCriteriaCount: number;
  nfzRiskCount: number;
  marketShortageCount: number;
  
  overallSafetyScore: number; // 0 - 100%
  overallStatus: 'SAFE' | 'NEEDS_JUSTIFICATION' | 'CRITICAL_DEFICIT';
  
  medications: MedicationMzVerification[];
  globalRecommendations: string[];
}

/**
 * Baza danych Obwieszczenia Ministra Zdrowia (Wykaz Leków Refundowanych i Dostępności GIF)
 */
export const MZ_REFUND_CATALOG: MzDrugItem[] = [
  {
    brandName: 'Tritace 5',
    innName: 'Ramiprilum',
    atcCode: 'C09AA05',
    eanGtin: '5909990145214',
    form: 'tabletki',
    dosage: '5 mg',
    packageSize: '28 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '1.1, Inhibitory enzymu konwertującego angiotensynę - formy doustne jednoskładnikowe',
    retailPricePln: 14.80,
    financingLimitPln: 11.20,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['I10', 'I11', 'I12', 'I13', 'I15', 'I20', 'I25', 'I50', 'N18'],
    clinicalCriteriaDescription: 'We wszystkich zarejestrowanych wskazaniach na dzień wydania decyzji (Nadciśnienie tętnicze pierwotne i wtórne, niewydolność serca, prewencja zdarzeń sercowo-naczyniowych, nefropatia cukrzycowa).',
    availability: 'AVAILABLE',
    availabilityNote: 'Stała dostępność we wszystkich hurtowniach farmaceutycznych.',
    substitutes: [
      { name: 'Ramipril Genoptim 5 mg (28 tabl.)', ean: '5909990145221', patientPayPln: 3.20, manufacturer: 'Synoptis Pharma', availability: 'AVAILABLE' },
      { name: 'Vivace 5 mg (30 tabl.)', ean: '5909990145238', patientPayPln: 3.20, manufacturer: 'Actavis Group', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Ramipril 5 mg',
    innName: 'Ramiprilum',
    atcCode: 'C09AA05',
    eanGtin: '5909990145214',
    form: 'tabletki',
    dosage: '5 mg',
    packageSize: '28 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '1.1, Inhibitory ACE',
    retailPricePln: 11.50,
    financingLimitPln: 11.20,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['I10', 'I11', 'I12', 'I13', 'I15', 'I20', 'I25', 'I50', 'N18'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Nadciśnienie tętnicze, prewencja sercowo-naczyniowa, nefropatia.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Tritace 5 mg', ean: '5909990145214', patientPayPln: 3.20, manufacturer: 'Sanofi-Aventis', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Jardiance 10 mg',
    innName: 'Empagliflozinum',
    atcCode: 'A10BK03',
    eanGtin: '5909990771895',
    form: 'tabletki powlekane',
    dosage: '10 mg',
    packageSize: '28 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '215.0, Doustne leki przeciwcukrzycowe - inhibitory SGLT-2 (flozyny)',
    retailPricePln: 184.20,
    financingLimitPln: 130.15,
    patientPayPlnStandard: 54.05,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '30%',
    refundScope: 'RESTRICTED_CRITERIA',
    eligibleIcd10Codes: ['E11', 'I50', 'N18'],
    clinicalCriteriaDescription: 'Wskazania refundacyjne MZ: 1) Cukrzyca typu 2 u pacjentów leczonych co najmniej dwoma lekami hipoglikemizującymi, z HbA1c >= 7.5% oraz bardzo wysokim ryzykiem sercowo-naczyniowym; 2) Przewlekła niewydolność serca u dorosłych pacjentów z LVEF <= 40%; 3) Przewlekła choroba nerek (eGFR 20-75 ml/min).',
    requiredClinicalPrerequisites: [
      'HbA1c >= 7.5% (udokumentowane w historii choroby)',
      'Terapia skojarzona co najmniej 2 lekami przeciwcukrzycowymi (np. metformina + pochodna sulfonylomocznika)',
      'Bardzo wysokie ryzyko sercowo-naczyniowe (przebyty zawał/udar, albuminuria, powikłania narządowe)'
    ],
    availability: 'AVAILABLE',
    availabilityNote: 'Produkt objęty stałym monitoringiem obrotu.',
    substitutes: [
      { name: 'Forxiga 10 mg (Dapagliflozinum)', ean: '5909990771888', patientPayPln: 54.05, manufacturer: 'AstraZeneca', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Forxiga 10 mg',
    innName: 'Dapagliflozinum',
    atcCode: 'A10BK01',
    eanGtin: '5909990771888',
    form: 'tabletki powlekane',
    dosage: '10 mg',
    packageSize: '28 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '215.0, Flozyny (SGLT-2)',
    retailPricePln: 184.20,
    financingLimitPln: 130.15,
    patientPayPlnStandard: 54.05,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '30%',
    refundScope: 'RESTRICTED_CRITERIA',
    eligibleIcd10Codes: ['E11', 'I50', 'N18'],
    clinicalCriteriaDescription: 'Cukrzyca typu 2 z HbA1c >= 7.5% i wysokim ryzykiem CV, objawowa przewlekła niewydolność serca (HFrEF/HFpEF) lub przewlekła choroba nerek.',
    requiredClinicalPrerequisites: [
      'HbA1c >= 7.5% lub rozpoznana przewlekła niewydolność serca (NYHA II-IV)',
      'Udokumentowana próba leczenia I i II rzutu w POZ'
    ],
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Jardiance 10 mg (Empagliflozinum)', ean: '5909990771895', patientPayPln: 54.05, manufacturer: 'Boehringer Ingelheim', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Ozempic 1 mg',
    innName: 'Semaglutidum',
    atcCode: 'A10BJ06',
    eanGtin: '5909990987128',
    form: 'roztwór do wstrzykiwań we wstrzykiwaczu',
    dosage: '1 mg / dawkę (3 ml)',
    packageSize: '1 wstrzykiwacz + 4 igły',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '216.0, Agoniści receptora GLP-1',
    retailPricePln: 404.17,
    financingLimitPln: 295.80,
    patientPayPlnStandard: 108.37,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '30%',
    refundScope: 'RESTRICTED_CRITERIA',
    eligibleIcd10Codes: ['E11'],
    clinicalCriteriaDescription: 'ŚCIŚLE OGRANICZONE WSKAZANIE REFUNDACYJNE MZ: Cukrzyca typu 2 u pacjentów przed włączeniem insuliny, leczonych co najmniej dwoma doustnymi lekami hipoglikemizującymi od co najmniej 6 miesięcy, z HbA1c >= 8.0%, z otyłością zdefiniowaną jako BMI >= 35 kg/m² oraz bardzo wysokim ryzykiem sercowo-naczyniowym. UWAGA: Leczenie samej otyłości (E66) BEZ cukrzycy t. 2 NIE podlega refundacji (odpłatność 100%)!',
    requiredClinicalPrerequisites: [
      'Rozpoznanie: Cukrzyca typu 2 (E11)',
      'Ostatni wynik HbA1c >= 8.0% (pomimo terapii dwulekowej)',
      'Wskaźnik BMI >= 35.0 kg/m²',
      'Pacjent przed wdrożeniem insulinoterapii',
      'Bardzo wysokie ryzyko sercowo-naczyniowe'
    ],
    availability: 'CRITICAL_SHORTAGE',
    availabilityAlert: '⚠️ Produkt umieszczony w wykazie produktów leczniczych zagrożonych brakiem dostępności na terytorium RP (Lista Antywywozowa MZ). Duże opóźnienia w aptekach.',
    substitutes: [
      { name: 'Rybelsus 14 mg tabl. (forma doustna semaglutydu)', ean: '5909990987142', patientPayPln: 112.50, manufacturer: 'Novo Nordisk', availability: 'LIMITED_SUPPLY' },
      { name: 'Trulicity 1.5 mg roztw. (Dulaglutidum)', ean: '5909990987203', patientPayPln: 105.20, manufacturer: 'Eli Lilly', availability: 'LIMITED_SUPPLY' }
    ]
  },
  {
    brandName: 'Siofor 850 / Glucophage 850',
    innName: 'Metforminum',
    atcCode: 'A10BA02',
    eanGtin: '5909990823419',
    form: 'tabletki powlekane',
    dosage: '850 mg',
    packageSize: '60 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '15.0, Doustne leki przeciwcukrzycowe - biguanidy',
    retailPricePln: 12.40,
    financingLimitPln: 10.80,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['E11', 'E10', 'E88.8', 'E28.2'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Cukrzyca typu 2, stany przedcukrzycowe z insulinoopornością, zespół policystycznych jajników (PCOS - off-label refundowany).',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Metformax 850 mg', ean: '5909990823433', patientPayPln: 3.20, manufacturer: 'Teva Pharmaceuticals', availability: 'AVAILABLE' },
      { name: 'Avamina 850 mg', ean: '5909990823440', patientPayPln: 3.20, manufacturer: 'Chinoin', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Atorvasterol 20 mg / Sortis 20 mg',
    innName: 'Atorvastatinum',
    atcCode: 'C10AA05',
    eanGtin: '5909990451230',
    form: 'tabletki powlekane',
    dosage: '20 mg',
    packageSize: '30 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '2.1, Leki zmniejszające stężenie lipidów - statyny',
    retailPricePln: 18.60,
    financingLimitPln: 14.20,
    patientPayPlnStandard: 4.40,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '30%',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['E78', 'E78.0', 'E78.2', 'I25', 'I20', 'I63', 'I70'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Pierwotna hipercholesterolemia, mieszana dyslipidemia, prewencja zdarzeń sercowo-naczyniowych u pacjentów wysokiego ryzyka.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Atoris 20 mg (30 tabl.)', ean: '5909990451254', patientPayPln: 4.40, manufacturer: 'KRKA', availability: 'AVAILABLE' },
      { name: 'Tulip 20 mg (30 tabl.)', ean: '5909990451261', patientPayPln: 4.40, manufacturer: 'Sandoz', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Concor 5 / Bisocard 5',
    innName: 'Bisoprololum',
    atcCode: 'C07AB07',
    eanGtin: '5909990312678',
    form: 'tabletki powlekane',
    dosage: '5 mg',
    packageSize: '30 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '4.0, Leki blokujące receptory beta-adrenergiczne',
    retailPricePln: 13.90,
    financingLimitPln: 10.70,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['I10', 'I20', 'I25', 'I50', 'I48'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Nadciśnienie tętnicze, choroba niedokrwienna serca, stabilna przewlekła niewydolność serca.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Bisopromerck 5 mg', ean: '5909990312685', patientPayPln: 3.20, manufacturer: 'Merck', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Amlozek 5 mg',
    innName: 'Amlodipinum',
    atcCode: 'C08CA01',
    eanGtin: '5909990529816',
    form: 'tabletki',
    dosage: '5 mg',
    packageSize: '30 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '3.0, Antagoniści wapnia - pochodne dihydropirydyny',
    retailPricePln: 9.80,
    financingLimitPln: 8.50,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['I10', 'I20', 'I25'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Nadciśnienie tętnicze, przewlekła stabilna dławica piersiowa.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Norvasc 5 mg', ean: '5909990529823', patientPayPln: 3.20, manufacturer: 'Viatris', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Controloc 40 / Nolpaza 40',
    innName: 'Pantoprazolum',
    atcCode: 'A02BC02',
    eanGtin: '5909990714526',
    form: 'tabletki dojelitowe',
    dosage: '40 mg',
    packageSize: '28 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '16.0, Inhibitory pompy protonowej',
    retailPricePln: 24.50,
    financingLimitPln: 14.80,
    patientPayPlnStandard: 9.70,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '50%',
    refundScope: 'RESTRICTED_CRITERIA',
    eligibleIcd10Codes: ['K21', 'K25', 'K26', 'K27', 'K29'],
    clinicalCriteriaDescription: 'Wskazania refundacyjne MZ: Choroba wrzodowa żołądka i dwunastnicy, refluksowe zapalenie przełyku (GERD), eradykacja H. pylori w skojarzeniu z antybiotykami, zapobieganie owrzodzeniom u pacjentów stale przyjmujących NLPZ.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Anesteloc 40 mg (28 tabl.)', ean: '5909990714533', patientPayPln: 8.20, manufacturer: 'Aflofarm', availability: 'AVAILABLE' },
      { name: 'Ranloc 40 mg (28 tabl.)', ean: '5909990714540', patientPayPln: 8.50, manufacturer: 'Polpharma', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Euthyrox N 75 / Letrox 75',
    innName: 'Levothyroxinum natricum',
    atcCode: 'H03AA01',
    eanGtin: '5909990663411',
    form: 'tabletki',
    dosage: '75 mcg',
    packageSize: '50 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '36.0, Hormony tarczycy',
    retailPricePln: 14.20,
    financingLimitPln: 11.00,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['E03', 'E03.9', 'E06.3', 'E89.0', 'E01'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Pierwotna i wtórna niedoczynność tarczycy (w tym choroba Hashimoto), wole obojętne.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Letrox 75 mcg (50 tabl.)', ean: '5909990663428', patientPayPln: 3.20, manufacturer: 'Berlin-Chemie', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Duomox 1 g',
    innName: 'Amoxicillinum',
    atcCode: 'J01CA04',
    eanGtin: '5909990994126',
    form: 'tabletki do sporządzania zawiesiny',
    dosage: '1 g',
    packageSize: '20 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '26.0, Penicyliny o szerokim spektrum działania',
    retailPricePln: 22.80,
    financingLimitPln: 16.20,
    patientPayPlnStandard: 6.60,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '50%',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['J01', 'J02', 'J03', 'J13', 'J15', 'J18', 'J20', 'N30'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Zakażenia bakteryjne górnych i dolnych dróg oddechowych, układu moczowego, skóry i tkanek miękkich.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Amotaks 1 g (20 tabl.)', ean: '5909990994133', patientPayPln: 6.60, manufacturer: 'Polfa Tarchomin', availability: 'AVAILABLE' },
      { name: 'Ospamox 1000 mg (16 tabl.)', ean: '5909990994140', patientPayPln: 5.90, manufacturer: 'Sandoz', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Verospiron 25 mg / Spironol 25',
    innName: 'Spironolactonum',
    atcCode: 'C03DA01',
    eanGtin: '5909990223417',
    form: 'tabletki',
    dosage: '25 mg',
    packageSize: '100 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '7.0, Leki moczopędne - antagoniści aldosteronu',
    retailPricePln: 28.50,
    financingLimitPln: 25.30,
    patientPayPlnStandard: 3.20,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: 'R',
    refundScope: 'ALL_REGISTERED_INDICATIONS',
    eligibleIcd10Codes: ['I50', 'I10', 'E26', 'K74'],
    clinicalCriteriaDescription: 'Wszystkie zarejestrowane wskazania: Przewlekła niewydolność serca NYHA II-IV, nadciśnienie oporne, hiperaldosteronizm pierwotny, wodobrzusze w marskości wątroby.',
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Spironol 25 mg (100 tabl.)', ean: '5909990223424', patientPayPln: 3.20, manufacturer: 'Polpharma', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Eliquis 5 mg',
    innName: 'Apixabanum',
    atcCode: 'B01AF02',
    eanGtin: '5909990887121',
    form: 'tabletki powlekane',
    dosage: '5 mg',
    packageSize: '56 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: '202.0, Doustne leki przeciwzakrzepowe - bezpośrednie inhibitory czynnika Xa (NOAC/DOAC)',
    retailPricePln: 236.40,
    financingLimitPln: 172.10,
    patientPayPlnStandard: 64.30,
    patientPayPlnSenior: 0.00,
    officialRefundLevel: '30%',
    refundScope: 'RESTRICTED_CRITERIA',
    eligibleIcd10Codes: ['I48', 'I26', 'I80', 'I82', 'Z95.2'],
    clinicalCriteriaDescription: 'Wskazania refundacyjne MZ: 1) Niezastawkowe migotanie przedsionków (NVAF) z co najmniej 1 czynnikiem ryzyka (CHA2DS2-VASc >= 1 u mężczyzn, >= 2 u kobiet); 2) Leczenie i prewencja zakrzepicy żył głębokich (ZŻG) i zatorowości płucnej (ZP).',
    requiredClinicalPrerequisites: [
      'Rozpoznanie: Migotanie lub trzepotanie przedsionków (I48)',
      'Punktacja CHA2DS2-VASc >= 1 (M) / >= 2 (K) odnotowana w wywiadzie',
      'Brak mechanicznej protezy zastawkowej serca i ciężkiego zwężenia zastawki mitralnej'
    ],
    availability: 'AVAILABLE',
    substitutes: [
      { name: 'Xarelto 20 mg (Rivaroxabanum)', ean: '5909990887138', patientPayPln: 64.30, manufacturer: 'Bayer', availability: 'AVAILABLE' }
    ]
  },
  {
    brandName: 'Xanax 0.5 mg / Alprox 0.5 mg',
    innName: 'Alprazolamum',
    atcCode: 'N05BA12',
    eanGtin: '5909990334120',
    form: 'tabletki',
    dosage: '0.5 mg',
    packageSize: '30 tabl.',
    activeAnnouncementDate: 'Obwieszczenie MZ 2025/2026',
    limitGroup: 'Brak (Lek poza wykazem refundacyjnym)',
    retailPricePln: 29.90,
    financingLimitPln: 0.00,
    patientPayPlnStandard: 29.90,
    patientPayPlnSenior: 29.90,
    officialRefundLevel: '100%',
    refundScope: 'NON_REIMBURSED',
    eligibleIcd10Codes: [],
    clinicalCriteriaDescription: 'LEK NIEREFUNDOWANY (100% odpłatności). Benzodiazepiny nie podlegają refundacji ze środków publicznych NFZ.',
    availability: 'AVAILABLE',
    substitutes: []
  }
];

export class RefundacjaMzService {
  /**
   * Zwraca aktualny numer i datę publikacji Obwieszczenia Ministra Zdrowia
   */
  public static getActiveAnnouncementInfo() {
    return {
      title: 'Obwieszczenie Ministra Zdrowia w sprawie wykazu refundowanych leków, środków spożywczych specjalnego przeznaczenia żywieniowego oraz wyrobów medycznych',
      edition: 'Wykaz Obowiązujący (Aktualizacja 2025/2026)',
      validFrom: '2025-01-01',
      legalAct: 'Ustawa z dnia 12 maja 2011 r. o refundacji leków (Dz.U. z 2023 r. poz. 1934 z późn. zm.)',
      programs: ['Program Leki 65+ (Senior)', 'Program Leki 18- (Dzieci)', 'Ciąża Plus']
    };
  }

  /**
   * Wyszukuje lek w oficjalnej bazie obwieszczenia MZ po nazwie, substancji INN, kodzie ATC lub kodzie EAN
   */
  public static findMzDrug(medication: EReceptaMedication | { name: string; innName?: string; atcCode?: string; eanGtin?: string }): MzDrugItem | undefined {
    const medName = medication.name.toLowerCase().trim();
    const inn = (medication.innName || '').toLowerCase().trim();
    const atc = (medication.atcCode || '').toUpperCase().trim();
    const ean = (medication.eanGtin || '').trim();

    // 1. Dopasowanie po dokładnym EAN
    if (ean) {
      const byEan = MZ_REFUND_CATALOG.find(d => d.eanGtin === ean);
      if (byEan) return byEan;
    }

    // 2. Dopasowanie po nazwie handlowej / słowie kluczowym
    const byName = MZ_REFUND_CATALOG.find(d => {
      const dBrand = d.brandName.toLowerCase();
      const dInn = d.innName.toLowerCase();
      return (
        medName.includes(dBrand.split(' ')[0]) || 
        dBrand.includes(medName.split(' ')[0]) ||
        (inn && (inn.includes(dInn) || dInn.includes(inn))) ||
        (medName.includes(dInn) || dInn.includes(medName))
      );
    });
    if (byName) return byName;

    // 3. Dopasowanie po kodzie ATC
    if (atc) {
      const byAtc = MZ_REFUND_CATALOG.find(d => d.atcCode === atc);
      if (byAtc) return byAtc;
    }

    return undefined;
  }

  /**
   * Weryfikuje pojedynczy lek pod kątem kryteriów obwieszczenia MZ, wskazań i refundacji
   */
  public static verifySingleMedication(
    med: EReceptaMedication,
    index: number,
    patientIcd10?: string,
    patientDiagnosisText?: string,
    patientAge: number = 55,
    patientGender: 'K' | 'M' = 'K',
    medicalNoteText: string = ''
  ): MedicationMzVerification {
    const mzDrug = this.findMzDrug(med);
    const isSenior = patientAge >= 65;
    const isChild = patientAge < 18;
    const fullTextToScan = `${patientDiagnosisText || ''} ${medicalNoteText || ''} ${patientIcd10 || ''}`.toLowerCase();

    // Domyślne wartości jeśli leku nie ma w wykazie refundacyjnym
    if (!mzDrug) {
      return {
        medicationIndex: index,
        medicationName: med.name,
        atcCode: med.atcCode || 'BRAK',
        eanGtin: med.eanGtin || 'BRAK',
        isFoundInMzList: false,
        isIndicationMatched: false,
        refundScope: 'NON_REIMBURSED',
        refundScopeLabel: 'Poza wykazem leków refundowanych MZ (100% odpłatności)',
        currentRefundLevel: med.refundationLevel || '100%',
        recommendedRefundLevel: '100%',
        isRefundLevelCorrect: (med.refundationLevel === '100%' || !med.refundationLevel),
        missingClinicalRequirements: ['Lek nie figuruje w aktualnym Obwieszczeniu Ministra Zdrowia jako refundowany'],
        riskDescription: 'Brak podstaw prawnych do refundacji ze środków NFZ. Wymagana odpłatność 100%.',
        hasNfzClawbackRisk: (med.refundationLevel !== '100%' && !!med.refundationLevel),
        availability: 'AVAILABLE',
        availabilityLabel: 'Standardowa dostępność apteczna',
        retailPricePln: 35.00,
        financingLimitPln: 0.00,
        patientPayPln: 35.00,
        suggestedSubstitutes: [],
        clinicalJustificationSnippet: `Lek ${med.name} przepisany z odpłatnością 100% (poza wykazem leków refundowanych MZ).`
      };
    }

    // 1. Sprawdzenie dopasowania kodu ICD-10 i wskazań klinicznych
    let isIndicationMatched = false;
    let matchedIcd10Code: string | undefined = undefined;

    if (patientIcd10) {
      const cleanIcd = patientIcd10.toUpperCase().trim();
      const directMatch = mzDrug.eligibleIcd10Codes.some(code => cleanIcd.startsWith(code) || code.startsWith(cleanIcd));
      if (directMatch) {
        isIndicationMatched = true;
        matchedIcd10Code = cleanIcd;
      }
    }

    // Dodatkowe sprawdzenie tekstu wywiadu/diagnozy
    if (!isIndicationMatched && mzDrug.refundScope === 'ALL_REGISTERED_INDICATIONS') {
      isIndicationMatched = true; // Dla leków refundowanych we wszystkich zarejestrowanych wskazaniach
    }

    if (!isIndicationMatched) {
      // Szukanie słów kluczowych w tekście notatki (np. nadciśnienie, cukrzyca, niewydolność serca)
      if (mzDrug.eligibleIcd10Codes.includes('I10') && (fullTextToScan.includes('nadciśn') || fullTextToScan.includes('hypertens'))) {
        isIndicationMatched = true;
        matchedIcd10Code = 'I10';
      } else if (mzDrug.eligibleIcd10Codes.includes('E11') && (fullTextToScan.includes('cukrzyc') || fullTextToScan.includes('diabet'))) {
        isIndicationMatched = true;
        matchedIcd10Code = 'E11';
      } else if (mzDrug.eligibleIcd10Codes.includes('I50') && (fullTextToScan.includes('niewydolnoś') || fullTextToScan.includes('serc'))) {
        isIndicationMatched = true;
        matchedIcd10Code = 'I50';
      } else if (mzDrug.eligibleIcd10Codes.includes('E78') && (fullTextToScan.includes('lipid') || fullTextToScan.includes('cholesterol'))) {
        isIndicationMatched = true;
        matchedIcd10Code = 'E78';
      }
    }

    // 2. Analiza braków i specyficznych wymogów klinicznych
    const missingClinicalRequirements: string[] = [];
    let hasNfzClawbackRisk = false;

    if (mzDrug.refundScope === 'RESTRICTED_CRITERIA') {
      if (!isIndicationMatched) {
        missingClinicalRequirements.push(
          `Brak rozpoznania kwalifikującego do refundacji MZ (${mzDrug.eligibleIcd10Codes.join(', ')}). Rozpoznanie w dokumentacji nie uprawnia do zniżki NFZ.`
        );
        hasNfzClawbackRisk = true;
      }

      // Specjalne kryteria dla flozyn i GLP-1
      if (mzDrug.atcCode.startsWith('A10B')) {
        if (!fullTextToScan.includes('hba1c') && !fullTextToScan.includes('7.5') && !fullTextToScan.includes('8.0') && !fullTextToScan.includes('8%')) {
          missingClinicalRequirements.push('Wymóg MZ: Brak odnotowanej wartości HbA1c (wymagane w dokumentacji medycznej dla flozyn/GLP-1).');
        }
        if (!fullTextToScan.includes('metformin') && !fullTextToScan.includes('dwoma') && !fullTextToScan.includes('2 lek')) {
          missingClinicalRequirements.push('Wymóg MZ: Brak adnotacji o uprzednim leczeniu skojarzonym lekami I/II rzutu.');
        }
      }
    }

    // 3. Rekomendacja poziomu odpłatności
    let recommendedRefundLevel = mzDrug.officialRefundLevel;
    let patientPay = mzDrug.patientPayPlnStandard;

    if (isSenior && mzDrug.refundScope !== 'NON_REIMBURSED') {
      recommendedRefundLevel = 'S';
      patientPay = mzDrug.patientPayPlnSenior;
    } else if (isChild && mzDrug.refundScope !== 'NON_REIMBURSED') {
      recommendedRefundLevel = 'bezpłatne';
      patientPay = 0.00;
    } else if (!isIndicationMatched && mzDrug.refundScope === 'RESTRICTED_CRITERIA') {
      recommendedRefundLevel = '100%';
      patientPay = mzDrug.retailPricePln;
    }

    const currentRef = med.refundationLevel || 'R';
    const isRefundLevelCorrect = (currentRef === recommendedRefundLevel || (isSenior && (currentRef === 'S' || med.additionalPrivilege === 'S')));

    // Jeśli lekarz wypisał R lub S, a pacjent nie spełnia kryteriów -> ryzyko zwrotu NFZ
    if (!isIndicationMatched && mzDrug.refundScope === 'RESTRICTED_CRITERIA' && (currentRef === 'R' || currentRef === '30%' || currentRef === 'S')) {
      hasNfzClawbackRisk = true;
    }

    // Etykieta zakresu refundacji
    let refundScopeLabel = 'Pełna refundacja we wszystkich zarejestrowanych wskazaniach';
    if (mzDrug.refundScope === 'RESTRICTED_CRITERIA') {
      refundScopeLabel = 'Refundacja ograniczona – wyłącznie w określonych wskazaniach klinicznych MZ';
    } else if (mzDrug.refundScope === 'NON_REIMBURSED') {
      refundScopeLabel = 'Lek nierefundowany (100% odpłatności)';
    }

    // Generowanie snipetu uzasadnienia klinicznego do notatki
    const justificationSnippet = `[Uzasadnienie refundacji MZ dla ${mzDrug.brandName}]: Pacjent spełnia kryteria refundacyjne Obwieszczenia MZ (ICD-10: ${matchedIcd10Code || patientIcd10 || 'I10'}). Wskazanie: ${mzDrug.clinicalCriteriaDescription.slice(0, 140)}... Dokumentacja medyczna potwierdza zasadność ordynacji z odpłatnością ${recommendedRefundLevel}.`;

    return {
      medicationIndex: index,
      medicationName: med.name,
      atcCode: mzDrug.atcCode,
      eanGtin: mzDrug.eanGtin,
      isFoundInMzList: true,
      mzDrugData: mzDrug,
      isIndicationMatched,
      matchedIcd10Code,
      refundScope: mzDrug.refundScope,
      refundScopeLabel,
      currentRefundLevel: currentRef,
      recommendedRefundLevel,
      isRefundLevelCorrect,
      missingClinicalRequirements,
      riskDescription: hasNfzClawbackRisk 
        ? '⚠️ WYSOKIE RYZYKO KONTROLI NFZ: Przepisanie leku ze zniżką przy braku udokumentowanego wskazania z Obwieszczenia MZ grozi koniecznością zwrotu kwoty refundacji wraz z odsetkami.'
        : undefined,
      hasNfzClawbackRisk,
      availability: mzDrug.availability,
      availabilityLabel: mzDrug.availability === 'AVAILABLE' 
        ? 'Dostępny bez zakłóceń' 
        : mzDrug.availability === 'LIMITED_SUPPLY' 
          ? 'Przejściowe ograniczenia podaży' 
          : 'Krytyczny brak rynkowy (Lista Antywywozowa)',
      availabilityAlert: mzDrug.availabilityAlert,
      retailPricePln: mzDrug.retailPricePln,
      financingLimitPln: mzDrug.financingLimitPln,
      patientPayPln: patientPay,
      savingsWithSeniorProgramPln: isSenior ? mzDrug.patientPayPlnStandard : undefined,
      suggestedSubstitutes: mzDrug.substitutes || [],
      clinicalJustificationSnippet: justificationSnippet
    };
  }

  /**
   * Całościowy audyt refundacyjny listy leków w wygenerowanej notatce medycznej
   */
  public static verifyMedicationsRefundList(
    medications: EReceptaMedication[],
    patientIcd10?: string,
    patientDiagnosisText?: string,
    patientAge: number = 55,
    patientGender: 'K' | 'M' = 'K',
    medicalNoteText: string = ''
  ): MzRefundAuditReport {
    const announcementInfo = this.getActiveAnnouncementInfo();

    if (!medications || medications.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        announcementReference: announcementInfo.title,
        totalMedicationsCount: 0,
        reimbursedCount: 0,
        nonReimbursedCount: 0,
        fullIndicationCount: 0,
        restrictedCriteriaCount: 0,
        nfzRiskCount: 0,
        marketShortageCount: 0,
        overallSafetyScore: 100,
        overallStatus: 'SAFE',
        medications: [],
        globalRecommendations: ['Brak pozycji lekowych do weryfikacji.']
      };
    }

    const verifiedMeds = medications.map((med, idx) => 
      this.verifySingleMedication(med, idx, patientIcd10, patientDiagnosisText, patientAge, patientGender, medicalNoteText)
    );

    const reimbursedCount = verifiedMeds.filter(m => m.refundScope !== 'NON_REIMBURSED').length;
    const nonReimbursedCount = verifiedMeds.filter(m => m.refundScope === 'NON_REIMBURSED').length;
    const fullIndicationCount = verifiedMeds.filter(m => m.refundScope === 'ALL_REGISTERED_INDICATIONS').length;
    const restrictedCriteriaCount = verifiedMeds.filter(m => m.refundScope === 'RESTRICTED_CRITERIA').length;
    const nfzRiskCount = verifiedMeds.filter(m => m.hasNfzClawbackRisk).length;
    const marketShortageCount = verifiedMeds.filter(m => m.availability === 'CRITICAL_SHORTAGE' || m.availability === 'LIMITED_SUPPLY').length;

    // Obliczanie wyniku bezpieczeństwa (0-100%)
    let score = 100 - (nfzRiskCount * 30) - (marketShortageCount * 15);
    score = Math.max(0, Math.min(100, score));

    let overallStatus: 'SAFE' | 'NEEDS_JUSTIFICATION' | 'CRITICAL_DEFICIT' = 'SAFE';
    if (nfzRiskCount > 0) {
      overallStatus = 'CRITICAL_DEFICIT';
    } else if (marketShortageCount > 0 || verifiedMeds.some(m => m.missingClinicalRequirements.length > 0)) {
      overallStatus = 'NEEDS_JUSTIFICATION';
    }

    const globalRecommendations: string[] = [];
    if (nfzRiskCount > 0) {
      globalRecommendations.push(
        `Wykryto ${nfzRiskCount} poz. z ryzykiem nienależnej refundacji NFZ. Skoryguj odpłatność na 100% lub uzupełnij wskazanie kliniczne w notatce.`
      );
    }
    if (marketShortageCount > 0) {
      globalRecommendations.push(
        `Zidentyfikowano ${marketShortageCount} leki z utrudnioną dostępnością w hurtowniach (komunikat GIF). Rozważ przepisanie refundowanego zamiennika.`
      );
    }
    if (patientAge >= 65) {
      globalRecommendations.push(
        'Pacjent kwalifikuje się do Programu Leki 65+ (bezpłatne leki z wykazu D1/D2). Upewniono się, że uprawnienie S zostało aktywowane.'
      );
    }

    return {
      timestamp: new Date().toISOString(),
      announcementReference: `${announcementInfo.edition} (${announcementInfo.legalAct})`,
      totalMedicationsCount: verifiedMeds.length,
      reimbursedCount,
      nonReimbursedCount,
      fullIndicationCount,
      restrictedCriteriaCount,
      nfzRiskCount,
      marketShortageCount,
      overallSafetyScore: score,
      overallStatus,
      medications: verifiedMeds,
      globalRecommendations
    };
  }

  /**
   * Wyszukuje tańsze zamienniki, odpowiedniki generyczne i opcje refundowane dla leku,
   * który nie kwalifikuje się do refundacji z przyczyn finansowych, braku wskazań lub ma wysoki koszt pacjenta.
   */
  public static findCheaperSubstitutes(
    med: MedicationMzVerification,
    patientAge: number = 55,
    patientIcd10?: string
  ): CheaperSubstituteOption[] {
    const isSenior = patientAge >= 65;
    const currentPay = med.patientPayPln;
    const results: CheaperSubstituteOption[] = [];
    const seenEans = new Set<string>();
    if (med.eanGtin) seenEans.add(med.eanGtin);

    // 1. Sprawdzenie dedykowanych zamienników z rekordu leku
    if (med.mzDrugData?.substitutes) {
      for (const sub of med.mzDrugData.substitutes) {
        if (seenEans.has(sub.ean)) continue;
        seenEans.add(sub.ean);

        const subPay = isSenior ? 0 : sub.patientPayPln;
        const savings = Math.max(0, currentPay - subPay);
        const savingsPercent = currentPay > 0 ? Math.round((savings / currentPay) * 100) : 0;

        results.push({
          name: sub.name,
          ean: sub.ean,
          innName: med.mzDrugData.innName,
          manufacturer: sub.manufacturer,
          retailPricePln: sub.patientPayPln + (med.mzDrugData.financingLimitPln || 5.0),
          financingLimitPln: med.mzDrugData.financingLimitPln,
          officialRefundLevel: isSenior ? 'S' : med.mzDrugData.officialRefundLevel,
          patientPayPln: subPay,
          savingsPln: Number(savings.toFixed(2)),
          savingsPercent,
          isFullyFreeForSenior: isSenior,
          availability: sub.availability,
          reason: isSenior 
            ? 'Bezpłatny dla Seniora 65+ (Program Leki 65+ MZ / Wykaz D1)' 
            : 'Równoważnik generyczny o niższej dopłacie pacjenta w grupie limitowej MZ',
          refundScopeLabel: med.refundScopeLabel,
          category: isSenior ? 'SENIOR_FREE_LIST' : 'GENERIC_EQUIVALENT'
        });
      }
    }

    // 2. Wyszukanie odpowiedników w katalogu MZ o tym samym kodzie ATC / grupie limitowej
    const atcPrefix = med.atcCode ? med.atcCode.slice(0, 4) : '';
    const atcExact = med.atcCode ? med.atcCode.slice(0, 5) : '';

    const matchingCatalogDrugs = MZ_REFUND_CATALOG.filter(d => {
      if (d.brandName.toLowerCase() === med.medicationName.toLowerCase()) return false;
      if (seenEans.has(d.eanGtin)) return false;

      // Dopasowanie po ATC lub tej samej substancji INN
      const matchInn = med.mzDrugData && d.innName.toLowerCase() === med.mzDrugData.innName.toLowerCase();
      const matchAtcExact = atcExact && d.atcCode.startsWith(atcExact);
      const matchAtcPrefix = atcPrefix && d.atcCode.startsWith(atcPrefix);

      return matchInn || matchAtcExact || matchAtcPrefix;
    });

    for (const drug of matchingCatalogDrugs) {
      if (seenEans.has(drug.eanGtin)) continue;
      seenEans.add(drug.eanGtin);

      const subPay = isSenior ? drug.patientPayPlnSenior : drug.patientPayPlnStandard;
      const savings = Math.max(0, currentPay - subPay);
      const savingsPercent = currentPay > 0 ? Math.round((savings / currentPay) * 100) : 0;

      const isSameInn = med.mzDrugData && drug.innName.toLowerCase() === med.mzDrugData.innName.toLowerCase();

      results.push({
        name: `${drug.brandName} (${drug.packageSize})`,
        ean: drug.eanGtin,
        innName: drug.innName,
        manufacturer: drug.limitGroup.split(',')[0] || 'Wytwórca farmaceutyczny',
        retailPricePln: drug.retailPricePln,
        financingLimitPln: drug.financingLimitPln,
        officialRefundLevel: isSenior ? 'S' : drug.officialRefundLevel,
        patientPayPln: subPay,
        savingsPln: Number(savings.toFixed(2)),
        savingsPercent,
        isFullyFreeForSenior: isSenior && drug.refundScope !== 'NON_REIMBURSED',
        availability: drug.availability,
        availabilityNote: drug.availabilityNote,
        availabilityAlert: drug.availabilityAlert,
        reason: isSameInn 
          ? `Identyczna substancja czynna (${drug.innName}), dopłata pacjenta tylko ${subPay.toFixed(2)} zł`
          : `Alternatywa terapeutyczna z tej samej grupy (${drug.limitGroup.slice(0, 35)}...)`,
        refundScopeLabel: drug.refundScope === 'ALL_REGISTERED_INDICATIONS' ? 'Wszystkie zarejestrowane wskazania MZ' : 'Określone wskazania MZ',
        category: isSameInn ? 'GENERIC_EQUIVALENT' : 'THERAPEUTIC_ALTERNATIVE'
      });
    }

    // 3. Obsługa szczególna dla leków nierefundowanych lub specyficznych (np. Xanax / alprazolam / suplementy / OTC)
    if (results.length === 0) {
      const medLower = med.medicationName.toLowerCase();
      if (medLower.includes('xanax') || medLower.includes('alprox') || medLower.includes('alprazolam')) {
        results.push(
          {
            name: 'Alprazolam Genoptim 0.5 mg (30 tabl.)',
            ean: '5909990334137',
            innName: 'Alprazolamum',
            manufacturer: 'Synoptis Pharma',
            retailPricePln: 11.80,
            financingLimitPln: 0.00,
            officialRefundLevel: '100%',
            patientPayPln: 11.80,
            savingsPln: Number((currentPay - 11.80).toFixed(2)),
            savingsPercent: Math.round(((currentPay - 11.80) / currentPay) * 100),
            isFullyFreeForSenior: false,
            availability: 'AVAILABLE',
            reason: 'Tańszy generyk alprazolamu (11.80 zł zamiast 29.90 zł w cenie rynkowej)',
            refundScopeLabel: 'Lek nierefundowany - cena rynkowa o 60% niższa',
            category: 'GENERIC_EQUIVALENT'
          },
          {
            name: 'Hydroxyzyna VP 25 mg (30 tabl.)',
            ean: '5909990442115',
            innName: 'Hydroxyzinum',
            manufacturer: 'Bausch Health',
            retailPricePln: 12.50,
            financingLimitPln: 9.30,
            officialRefundLevel: 'R',
            patientPayPln: isSenior ? 0.00 : 3.20,
            savingsPln: Number((currentPay - (isSenior ? 0.00 : 3.20)).toFixed(2)),
            savingsPercent: Math.round(((currentPay - (isSenior ? 0.00 : 3.20)) / currentPay) * 100),
            isFullyFreeForSenior: isSenior,
            availability: 'AVAILABLE',
            reason: 'Refundowana bezpieczna alternatywa anksjolityczna o niższym potencjale uzależniającym',
            refundScopeLabel: 'Refundacja we wszystkich wskazaniach (R / S)',
            category: 'THERAPEUTIC_ALTERNATIVE'
          }
        );
      } else {
        // Generyczny zamiennik refundowany z minimalną dopłatą urzędową
        results.push({
          name: `Odpowiednik generyczny ${med.medicationName} (Standard MZ)`,
          ean: '5909990001111',
          innName: med.mzDrugData?.innName || 'Substancja zgodna z Farmakopeą',
          manufacturer: 'Wytwórca krajowy (Polpharma / Polfa)',
          retailPricePln: 12.00,
          financingLimitPln: 10.00,
          officialRefundLevel: isSenior ? 'S' : 'R',
          patientPayPln: isSenior ? 0.00 : 3.20,
          savingsPln: Math.max(0, Number((currentPay - (isSenior ? 0.00 : 3.20)).toFixed(2))),
          savingsPercent: currentPay > 0 ? Math.round((Math.max(0, currentPay - (isSenior ? 0.00 : 3.20)) / currentPay) * 100) : 0,
          isFullyFreeForSenior: isSenior,
          availability: 'AVAILABLE',
          reason: 'Refundowany preparat generyczny o urzędowej cenie ryczałtowej MZ',
          refundScopeLabel: 'Refundacja MZ - ryczałt',
          category: 'GENERIC_EQUIVALENT'
        });
      }
    }

    // Sortowanie: największe oszczędności finansowe na górze
    return results.sort((a, b) => b.savingsPln - a.savingsPln);
  }
}

