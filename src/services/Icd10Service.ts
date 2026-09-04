// src/services/Icd10Service.ts
// Inteligentny serwis wyszukiwania i dopasowywania kodów ICD-10 dla lekarza POZ

export interface Icd10Entry {
  code: string;
  name: string;
  category: string;
  chapter: string;
  description?: string;
  keywords: string[];
  commonInPoz: boolean;
  suggestedAction?: string;
  suggestedTests?: string[];
  subCodes?: { code: string; label: string; description?: string }[];
}

export interface Icd10Suggestion {
  entry: Icd10Entry;
  score: number; // 0 - 100%
  matchReason: string;
  matchType: 'EXACT' | 'HIGH_RELEVANCE' | 'SYMPTOM_CORRELATION' | 'MEDICATION_CORRELATION' | 'PARAMETRIC_MATCH';
  isCurrentMatch: boolean;
}

export const ICD10_DATABASE: Icd10Entry[] = [
  // ==========================================
  // ROZDZIAŁ IX: UKŁAD KRĄŻENIA (I00-I99)
  // ==========================================
  {
    code: 'I10',
    name: 'Nadciśnienie tętnicze pierwotne (samoistne)',
    category: 'Choroby układu krążenia (I00-I99)',
    chapter: 'IX',
    description: 'Najczęstsza postać nadciśnienia w POZ. Wymaga regularnej kontroli ABPM/domowej oraz oceny narządowej (nerki, dno oka, serce).',
    keywords: ['nadciśnienie', 'ciśnienie', 'wysokie ciśnienie', 'rr', 'skurczowe', 'rozkurczowe', 'hipotensja', 'ramipryl', 'amlodypina', 'perindopril', 'bisoprolol', 'hypertension'],
    commonInPoz: true,
    suggestedAction: 'Wdrożenie leczenia 2-lekowego (np. ACEI + antagonistę wapnia lub diuretyk tiazydopodobny), 7-dniowy dzienniczek pomiarów.',
    suggestedTests: ['Kreatynina + eGFR', 'Elektrolity (Na, K)', 'Badanie ogólne moczu (albuminuria)', 'EKG 12-odprowadzeniowe', 'Lipidogram'],
    subCodes: [
      { code: 'I10', label: 'Nadciśnienie pierwotne niepowikłane' },
      { code: 'I11.0', label: 'Choroba nadciśnieniowa z zajęciem serca z niewydolnością serca' },
      { code: 'I11.9', label: 'Choroba nadciśnieniowa z zajęciem serca bez niewydolności serca' },
      { code: 'I12.0', label: 'Choroba nadciśnieniowa z zajęciem nerek z niewydolnością nerek' },
      { code: 'I13.2', label: 'Choroba nadciśnieniowa z zajęciem serca i nerek' },
      { code: 'I15.0', label: 'Nadciśnienie naczyniowo-nerkowe (wtórne)' }
    ]
  },
  {
    code: 'I20.0',
    name: 'Niestabilna dławica piersiowa (angina pectoris)',
    category: 'Choroby układu krążenia (I00-I99)',
    chapter: 'IX',
    description: 'Ból zamostkowy o narastającym charakterze lub spoczynkowy. Stan bezpośredniego zagrożenia OZW - pilny transport do hemodynamicznego OIT/Kardiologii.',
    keywords: ['dławica', 'zawał', 'ból w klatce', 'ból zamostkowy', 'angina', 'ucisk w klatce', 'koronarografia', 'troponina', 'azotany'],
    commonInPoz: true,
    suggestedAction: 'Pilne EKG, podanie ASA 300mg + azotany s.l., wezwanie ZRM (zespół ratownictwa medycznego).',
    suggestedTests: ['EKG 12-odprowadzeniowe', 'Troponiny sercowe', 'Morfologia', 'D-dimery']
  },
  {
    code: 'I20.9',
    name: 'Dławica piersiowa, nieokreślona (stabilna choroba wieńcowa)',
    category: 'Choroby układu krążenia (I00-I99)',
    chapter: 'IX',
    description: 'Bóle dławicowe wywoływane wysiłkiem fizycznym, ustępujące w spoczynku lub po nitroglicerynie.',
    keywords: ['wieńcowa', 'choroba wieńcowa', 'dławica stabilna', 'chsn', 'chdr', 'duszność wysiłkowa', 'stenokardia'],
    commonInPoz: true,
    suggestedAction: 'Optymalizacja leczenia przeciwniedokrwiennego (beta-bloker, statyna, ASA), próba wysiłkowa EKG.',
    suggestedTests: ['Próba wysiłkowa EKG', 'Echokardiografia (Echo serca)', 'Lipidogram pełny', 'Kreatynina']
  },
  {
    code: 'I50.9',
    name: 'Niewydolność serca, nieokreślona (HF)',
    category: 'Choroby układu krążenia (I00-I99)',
    chapter: 'IX',
    description: 'Zespół objawów klinicznych (duszność, obrzęki podudzi, nykturia, męczliwość) wywołany dysfunkcją komór serca.',
    keywords: ['niewydolność serca', 'obrzęki', 'duszność', 'nykturia', 'orhtopnoe', 'bnp', 'nt-probnp', 'furosemid', 'spironol', 'serce'],
    commonInPoz: true,
    suggestedAction: 'Terapia 4 filarami HF (ACEI/ARNI + Beta-bloker + MRA + SGLT2i), kontrola bilansu płynów i masy ciała.',
    suggestedTests: ['NT-proBNP / BNP', 'Echokardiografia serca', 'Elektrolity (K, Na)', 'Kreatynina, eGFR', 'RTG klatki piersiowej']
  },
  {
    code: 'I48.0',
    name: 'Napadowe migotanie przedsionków (AF)',
    category: 'Choroby układu krążenia (I00-I99)',
    chapter: 'IX',
    description: 'Najczęstsza tachyarytmia nadkomorowa. Wymaga oceny skali CHA2DS2-VASc i wdrożenia NOAC/VKA.',
    keywords: ['migotanie przedsionków', 'arytmia', 'kołatanie serca', 'nierówne bicie', 'tachyarytmia', 'af', 'antyoagulacja', 'eliquis', 'xarelto'],
    commonInPoz: true,
    suggestedAction: 'Ocena ryzyka zatorowo-zakrzepowego (CHA2DS2-VASc), wdrożenie leczenia przeciwkrzepliwego (NOAC), kontrola rytmu/częstości.',
    suggestedTests: ['EKG spoczynkowe 12-odprowadzeniowe', 'Holter EKG 24h/48h', 'TSH', 'Elektrolity (K, Mg)', 'Echo serca']
  },

  // ==========================================
  // ROZDZIAŁ IV: METABOLIZM I ENDOKRYNOLOGIA (E00-E90)
  // ==========================================
  {
    code: 'E11.9',
    name: 'Cukrzyca typu 2 bez powikłań',
    category: 'Choroby metaboliczne i endokrynologiczne (E00-E90)',
    chapter: 'IV',
    description: 'Cukrzyca dorosłych regulowana dietą i/lub doustnymi lekami przeciwcukrzycowymi (Metformina, SGLT2i, GLP-1).',
    keywords: ['cukrzyca', 'cukrzyca typu 2', 't2d', 'glikemia', 'hiperglikemia', 'cukier', 'metformina', 'hba1c', 'glukoza', 'insulina', 'glikokontrola'],
    commonInPoz: true,
    suggestedAction: 'Ocena HbA1c, wdrożenie leczenia nefro- i kardioprotekcyjnego (SGLT2i/GLP-1 RA), konsultacja edukacyjna i dietetyczna.',
    suggestedTests: ['HbA1c (hemoglobina glikowana)', 'Glukoza na czczo', 'Lipidogram', 'Wskaźnik ACR (albumina/kreatynina w moczu)', 'Dno oka'],
    subCodes: [
      { code: 'E11.0', label: 'Cukrzyca typu 2 ze śpiączką' },
      { code: 'E11.2', label: 'Cukrzyca typu 2 z powikłaniami nerkowymi (nefropatia cukrzycowa)' },
      { code: 'E11.3', label: 'Cukrzyca typu 2 z powikłaniami ocznymi (retinopatia)' },
      { code: 'E11.4', label: 'Cukrzyca typu 2 z powikłaniami neurologicznymi (polineuropatia)' },
      { code: 'E11.5', label: 'Cukrzyca typu 2 z powikłaniami krążenia obwodowego (stopa cukrzycowa)' },
      { code: 'E11.9', label: 'Cukrzyca typu 2 bez powikłań' }
    ]
  },
  {
    code: 'E10.9',
    name: 'Cukrzyca typu 1 (insulinozależna) bez powikłań',
    category: 'Choroby metaboliczne i endokrynologiczne (E00-E90)',
    chapter: 'IV',
    description: 'Autoimmunologiczne zniszczenie komórek beta trzustki. Wymaga stałej intensywnej insulinoterapii lub pompy insulinowej.',
    keywords: ['cukrzyca typu 1', 't1d', 'insulina', 'młodzieńcza', 'pompa', 'c-peptyd', 'ketoza', 'kwasica ketonowa'],
    commonInPoz: true,
    suggestedAction: 'Prowadzenie we współpracy z poradnią diabetologiczną, monitorowanie CGM/FGM.',
    suggestedTests: ['HbA1c', 'Profil glikemii', 'Ketoza w moczu', 'Lipidogram', 'TSH (autoimmunologia)']
  },
  {
    code: 'E66.0',
    name: 'Otyłość spowodowana nadmierną podażą energii',
    category: 'Choroby metaboliczne i endokrynologiczne (E00-E90)',
    chapter: 'IV',
    description: 'BMI ≥ 30 kg/m². Stanowiąca przewlekłą chorobę metaboliczną ze skłonnością do nawrotów i wielonarządowych powikłań.',
    keywords: ['otyłość', 'nadwaga', 'bmi', 'waga', 'otyłość olbrzymia', 'bariatria', 'otłuszczenie', 'redukcja wagi', 'odchudzanie', 'glp-1', 'saxenda', 'wegovy', 'ozempic'],
    commonInPoz: true,
    suggestedAction: 'Ustalenie deficytu kalorycznego, farmakoterapia analogami GLP-1/GIP, w BMI ≥ 35 kwalifikacja do chirurgii bariatrycznej.',
    suggestedTests: ['Lipidogram', 'Glukoza + Insulina na czczo (HOMA-IR)', 'Próby wątrobowe (ALT, AST, GGTP - MASLD)', 'TSH', 'Kwas moczowy'],
    subCodes: [
      { code: 'E66.0', label: 'Otyłość prosta (spowodowana nadmierną podażą energii)' },
      { code: 'E66.2', label: 'Skrajna otyłość z hipowentylacją pęcherzykową (zespół Pickwicka)' },
      { code: 'E66.8', label: 'Inna otyłość (otyłość polekowa / wtórna)' },
      { code: 'E66.9', label: 'Otyłość, nieokreślona' }
    ]
  },
  {
    code: 'E03.9',
    name: 'Niedoczynność tarczycy, nieokreślona (Hypothyreoidismus)',
    category: 'Choroby metaboliczne i endokrynologiczne (E00-E90)',
    chapter: 'IV',
    description: 'Niedobór hormonów tarczycy (najczęściej w przebiegu przewlekłego zapalenia tarczycy Hashimoto).',
    keywords: ['tarczyca', 'niedoczynność tarczycy', 'tsh', 'ft4', 'ft3', 'hashimoto', 'euthyrox', 'letrox', 'senność', 'sucha skóra', 'przyrost masy'],
    commonInPoz: true,
    suggestedAction: 'Suplementacja L-tyroksyny (Euthyrox/Letrox) rano na czczo, kontrola TSH za 6-8 tygodni po modyfikacji dawki.',
    suggestedTests: ['TSH', 'FT4', 'anty-TPO, anty-TG', 'USG tarczycy']
  },
  {
    code: 'E78.0',
    name: 'Czysta hipercholesterolemia (Zaburzenia lipidowe)',
    category: 'Choroby metaboliczne i endokrynologiczne (E00-E90)',
    chapter: 'IV',
    description: 'Izolowane podwyższenie stężenia cholesterolu całkowitego i LDL. Istotny czynnik ryzyka miażdżycy i powikłań sercowo-naczyniowych.',
    keywords: ['cholesterol', 'lipidy', 'ldl', 'hdl', 'trójglicerydy', 'hipercholesterolemia', 'statyna', 'atorwastatyna', 'rozuwastatyna', 'miażdżyca'],
    commonInPoz: true,
    suggestedAction: 'Wdrożenie leczenia statyną o wysokiej intensywności (np. Atorwastatyna 20-40mg lub Rozuwastatyna 10-20mg), dieta ubogotłuszczowa.',
    suggestedTests: ['Lipidogram pełny (CHOL, LDL, HDL, TG, non-HDL)', 'ALT, AST', 'CK (kinaza kreatynowa)', 'Glukoza']
  },
  {
    code: 'E78.2',
    name: 'Hiperlipidemia mieszana',
    category: 'Choroby metaboliczne i endokrynologiczne (E00-E90)',
    chapter: 'IV',
    description: 'Jednoczesne podwyższenie poziomu cholesterolu LDL oraz triglicerydów (TG). Wymaga leczenia statyną + ew. fenofibratem.',
    keywords: ['hiperlipidemia', 'triglicerydy', 'trójglicerydy wysokie', 'lipidy mieszane', 'stłuszczenie wątroby'],
    commonInPoz: true,
    suggestedAction: 'Statyna + redukcja spożycia węglowodanów prostych i alkoholu, kontrola enzymów wątrobowych.',
    suggestedTests: ['Lipidogram', 'Próby wątrobowe', 'Glukoza na czczo', 'Kwas moczowy']
  },

  // ==========================================
  // ROZDZIAŁ X: UKŁAD ODDECHOWY (J00-J99)
  // ==========================================
  {
    code: 'J00',
    name: 'Ostre zapalenie nosa i gardła (Przeziębienie zwykłe)',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Wirusowa infekcja górnych dróg oddechowych. Samoograniczająca się, leczenie wyłącznie objawowe.',
    keywords: ['katar', 'przeziębienie', 'nos', 'kichanie', 'gardło', 'infekcja wirusowa', 'stan podgorączkowy', 'zatkany nos'],
    commonInPoz: true,
    suggestedAction: 'Leczenie objawowe: płukanie nosa solą hipertoniczną, doraźnie NLPZ/Paracetamol, witamina C i D3, nawodnienie.',
    suggestedTests: ['Test Combo antygenowy (Grypa A/B, COVID-19, RSV) w razie podejrzenia']
  },
  {
    code: 'J01.9',
    name: 'Ostre zapalenie zatok przynosowych, nieokreślone',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Zapalenie błony śluzowej nosa i zatok. Ból i ucisk w rzucie zatok czołowych/szczękowych nasilający się przy pochylaniu.',
    keywords: ['zatoki', 'ból zatok', 'zapalenie zatok', 'ból głowy przy schylaniu', 'ropny katar', 'steryd donosowy', 'mometazon'],
    commonInPoz: true,
    suggestedAction: 'GKS donosowy (Mometazon 2x2 dawki), płukanie zatok solą fizjologiczną, w razie objawów bakteryjnych > 10 dni Amoksycylina.',
    suggestedTests: ['Badanie laryngologiczne rynoskopowe', 'CRP w razie przedłużających się objawów']
  },
  {
    code: 'J02.9',
    name: 'Ostre zapalenie gardła, nieokreślone (Pharyngitis acuta)',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Zaczerwienienie i ból gardła przy połykaniu. W 85% etiologia wirusowa, ocena skali Centora/McIsaaca.',
    keywords: ['gardło', 'ból gardła', 'zapalenie gardła', 'pieczenie gardła', 'odynofagia', 'angina', 'centor', 'streptest'],
    commonInPoz: true,
    suggestedAction: 'Ocena w skali Centora: jeśli < 3 punkty - leczenie objawowe (NLPZ, tabletki do ssania, płukanki); jeśli ≥ 3 punkty - Strep A test.',
    suggestedTests: ['Strep A test (szybki test wymazowy na paciorkowca)', 'CRP z krwi włośniczkowej']
  },
  {
    code: 'J03.0',
    name: 'Paciorkowcowe zapalenie migdałków (Angina paciorkowcowa)',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Ostre zapalenie migdałków podniebiennych wywołane przez Streptococcus pyogenes. Naloty włóknikowe, wysoka gorączka, brak kaszlu.',
    keywords: ['angina', 'migdałki', 'ropne migdałki', 'paciorkowiec', 'gorączka wysoka', 'powiększone węzły chłonne', 'fenoksymetylopenicylina', 'ospamox', 'duomox'],
    commonInPoz: true,
    suggestedAction: 'Antybiotykoterapii I rzutu: Fenoksymetylopenicylina (Ospen) 1 mln j.m. co 8h przez 10 dni (w alergii: makrolid).',
    suggestedTests: ['Szybki test Strep-A', 'Morfologia krwi z rozmazem', 'CRP']
  },
  {
    code: 'J06.9',
    name: 'Ostre zakażenie górnych dróg oddechowych o umiejscowieniu mnogim i nieokreślonym',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Najczęstsze rozpoznanie w sezonie infekcyjnym w POZ. Obejmuje zespół objawów nieżytu nosa, gardła i krtani.',
    keywords: ['infekcja', 'wirusówka', 'przeziębienie', 'górne drogi oddechowe', 'ogólne rozbicie', 'stan podgorączkowy', 'kaszel'],
    commonInPoz: true,
    suggestedAction: 'Leczenie objawowe, odpoczynek, izolacja domowa, obfita podaż płynów.',
    suggestedTests: ['Test wielopatogenowy Combo (Grypa/COVID/RSV)']
  },
  {
    code: 'J18.9',
    name: 'Zapalenie płuc, nieokreślone (Pneumonia)',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Zakażenie miąższu płucnego z trzeszczeniami osłuchowymi, gorączką, dusznością i produktywnym kaszlem. Ocena w skali CRB-65.',
    keywords: ['zapalenie płuc', 'trzeszczenia', 'duszność', 'kaszel z plwociną', 'crb-65', 'rtg płuc', 'amoksycylina', 'gorączka z dreszczami'],
    commonInPoz: true,
    suggestedAction: 'W ambulatoryjnym zapaleniu płuc: Amoksycylina 1000mg co 8h p.o. przez 7 dni. Ocena skali CRB-65 (jeśli ≥ 1 rozwazyć hospitalizację).',
    suggestedTests: ['RTG klatki piersiowej PA + bok', 'Morfologia krwi', 'CRP / Prokalcytonina', 'Pulsoksymetria (SpO2)']
  },
  {
    code: 'J20.9',
    name: 'Ostre zapalenie oskrzeli, nieokreślone',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Infekcja dolnych dróg oddechowych z dominującym kaszlem trwającym do 3 tygodni. W >90% etiologia wirusowa.',
    keywords: ['oskrzela', 'zapalenie oskrzeli', 'kaszel mokry', 'kaszel suchy', 'furczenia', 'świsty', 'wykrztuśne'],
    commonInPoz: true,
    suggestedAction: 'Leki mukolityczne (Erdosteina, ACC) w dzień, inhalacje solą fizjologiczną, antybiotyk niezalecany rutynowo.',
    suggestedTests: ['Osłuchiwanie klatki piersiowej', 'CRP (jeśli wątpliwość kliniczna vs zapalenie płuc)']
  },
  {
    code: 'J45.0',
    name: 'Astma oskrzelowa z przewagą komponentu alergicznego',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Przewlekła zapalna choroba dróg oddechowych ze świstami wydechowymi, dusznością napadową i nadreaktywnością oskrzeli.',
    keywords: ['astma', 'duszność napadowa', 'świsty', 'inhalator', 'steryd wziewny', 'budesonid', 'formoterol', 'salbutamol', 'spiro', 'alergia'],
    commonInPoz: true,
    suggestedAction: 'Terapia SMART (wG GINA: mała dawka wGKS + Formoterol doraźnie i regularnie), instruktaż inhalatora.',
    suggestedTests: ['Spirometria z próbą rozkurczową', 'Pikflometria (PEF)', 'IgE całkowite i swoiste', 'Testy skórne']
  },
  {
    code: 'J44.9',
    name: 'Przewlekła obturacyjna choroba płuc (POChP), nieokreślona',
    category: 'Choroby układu oddechowego (J00-J99)',
    chapter: 'X',
    description: 'Trwałe ograniczenie przepływu powietrza przez drogi oddechowe u palaczy tytoniu lub osób narażonych na pyły.',
    keywords: ['pochp', 'copd', 'palenie tytoniu', 'duszność przewlekła', 'kaszel palacza', 'laba', 'lama', 'tiotropium'],
    commonInPoz: true,
    suggestedAction: 'Bezwzględne zaprzestanie palenia tytoniu, leki rozszerzające oskrzela (LAMA + LABA), rehabilitacja oddechowa, szczepienia (grypa, pneumokoki).',
    suggestedTests: ['Spirometria (wskaźnik Tiffeneau FEV1/FVC < 0.70 po leku rozkurczającym)', 'Pulsoksymetria', 'RTG klatki piersiowej']
  },

  // ==========================================
  // ROZDZIAŁ XI: UKŁAD TRAWIENNY (K00-K93)
  // ==========================================
  {
    code: 'K21.0',
    name: 'Choroba refluksowa żołądkowo-przełykowa z zapaleniem przełyku (GERD)',
    category: 'Choroby układu trawiennego (K00-K93)',
    chapter: 'XI',
    description: 'Zarastanie treści żołądkowej do przełyku, wywołujące zgagę, pieczenie za mostkiem, puste odbijania i kaszel refluksowy.',
    keywords: ['refluks', 'gerd', 'zgaga', 'pieczenie w przełyku', 'kwaśne odbijanie', 'ipp', 'pantoprazol', 'omeprazol', 'polprazol', 'gastroskopia'],
    commonInPoz: true,
    suggestedAction: 'Inhibitor pompy protonowej (IPP) np. Pantoprazol 40mg 1x rano na czczo przez 4-8 tygodni, modyfikacja diety i pozycji snu.',
    suggestedTests: ['Gastroskopia (wskazana w objawach alarmowych: dysfagia, utrata masy ciała, anemia)', 'Test na Helicobacter pylori']
  },
  {
    code: 'K29.7',
    name: 'Zapalenie żołądka (Gastritis), nieokreślone',
    category: 'Choroby układu trawiennego (K00-K93)',
    chapter: 'XI',
    description: 'Stan zapalny błony śluzowej żołądka z bólami w nadbrzuszu, nudnościami, uczuciem pełności poposiłkowej.',
    keywords: ['żołądek', 'ból żołądka', 'gastritis', 'zapalenie żołądka', 'niestrawność', 'dyspepsja', 'nudności', 'wzdęcia'],
    commonInPoz: true,
    suggestedAction: 'Leczenie IPP, dieta lekkostrawna, wykluczenie NLPZ, diagnostyka H. pylori.',
    suggestedTests: ['Antygen Helicobacter pylori w kale lub test oddechowy', 'Gastroskopia']
  },
  {
    code: 'K58.0',
    name: 'Zespół jelita drażliwego (IBS) z biegunką',
    category: 'Choroby układu trawiennego (K00-K93)',
    chapter: 'XI',
    description: 'Czynnościowe zaburzenie jelitowe spełniające Kryteria Rzymskie IV (ból brzucha związany z wypróżnieniem, zmiana rytmu wypróżnień).',
    keywords: ['ibs', 'jelito drażliwe', 'biegunka', 'skurcze brzucha', 'wzdęcia', 'maślan sodu', 'probiotyk', 'stres jelitowy'],
    commonInPoz: true,
    suggestedAction: 'Dieta Low FODMAP, leki rozkurczowe (Drotaweryna, Mebeveryna), probiotykoterapia, maślan sodu.',
    suggestedTests: ['Kalprotektyna w kale (wykluczenie IBD)', 'Morfologia, CRP, elektrolity', 'Przeciwciała przeciw transglutaminazie tkankowej (tTG IgA - celiakia)']
  },
  {
    code: 'K76.0',
    name: 'Stłuszczenie wątroby (MASLD / NAFLD), niesklasyfikowane gdzie indziej',
    category: 'Choroby układu trawiennego (K00-K93)',
    chapter: 'XI',
    description: 'Akumulacja lipidów w hepatocytach związana z zespołem metabolicznym, insulinoopornością i otyłością.',
    keywords: ['stłuszczenie wątroby', 'masld', 'nafld', 'wątroba', 'podwyższone transaminazy', 'alt', 'ast', 'ggtp', 'usg brzucha'],
    commonInPoz: true,
    suggestedAction: 'Redukcja masy ciała o 7-10%, dieta śródziemnomorska, eliminacja fruktozy i alkoholu, kontrola parametrów wątrobowych.',
    suggestedTests: ['USG jamy brzusznej', 'Panel wątrobowy (ALT, AST, GGTP, Bilirubina, ALP)', 'Wskaźnik FIB-4', 'Lipidogram']
  },

  // ==========================================
  // ROZDZIAŁ XIII: UKŁAD MIĘŚNIOWO-SZKIELETOWY (M00-M99)
  // ==========================================
  {
    code: 'M54.5',
    name: 'Ból dolnego odcinka kręgosłupa (Lumbago / L-S)',
    category: 'Choroby układu mięśniowo-szkieletowego (M00-M99)',
    chapter: 'XIII',
    description: 'Najczęstszy ból kręgosłupa w medycynie rodzinnej. Wymaga wykluczenia czerwonych flag (zespół ogona końskiego, deficyty neurologiczne).',
    keywords: ['ból pleców', 'kręgosłup', 'lumbago', 'l-s', 'odcinek lędźwiowy', 'rwa kulszowa', 'dyskopatia', 'blokada', 'nlpz', 'ketonal', 'diklofenak'],
    commonInPoz: true,
    suggestedAction: 'Krótkotrwałe leczenie NLPZ (np. Deks不大ketoprofen, Meloksykam) + lek miorelaksacyjny (Tolperyzon/Baklofen), wczesne uruchomienie i fizjoterapia.',
    suggestedTests: ['Badanie neurologiczne (objaw Lasegue’a, odruchy ścięgniste, czucie)', 'RTG/MRI kręgosłupa L-S w razie objawów korzeniowych > 4-6 tyg.']
  },
  {
    code: 'M54.2',
    name: 'Ból szyi (Cervicalgia)',
    category: 'Choroby układu mięśniowo-szkieletowego (M00-M99)',
    chapter: 'XIII',
    description: 'Dolegliwości bólowe i wzmożone napięcie mięśni przykręgosłupowych szyi, często związane z pracą biurową i przeciążeniem.',
    keywords: ['ból szyi', 'kręcz szyi', 'odcinek szyjny', 'napięcie karku', 'rwa ramienna', 'cervicalgia'],
    commonInPoz: true,
    suggestedAction: 'Leki przeciwbólowe/NLPZ, ciepłe okłady, rehabilitacja i ergonomia stanowiska pracy.',
    suggestedTests: ['Badanie ruchomości kręgosłupa szyjnego', 'RTG kręgosłupa szyjnego']
  },
  {
    code: 'M17.9',
    name: 'Choroba zwyrodnieniowa stawu kolanowego (Gonartroza), nieokreślona',
    category: 'Choroby układu mięśniowo-szkieletowego (M00-M99)',
    chapter: 'XIII',
    description: 'Postępujące niszczenie chrząstki stawowej z bólem startowym, trzeszczeniami i ograniczeniem ruchomości stawu kolanowego.',
    keywords: ['kolano', 'staw kolanowy', 'zwyrodnienie stawów', 'gonartroza', 'ból kolana', 'chrzęstka', 'kwas hialuronowy'],
    commonInPoz: true,
    suggestedAction: 'Redukcja masy ciała (odciążenie stawu), Paracetamol/NLPZ miejscowo i doustnie, ćwiczenia wzmacniające m. czworogłowy uda.',
    suggestedTests: ['RTG stawów kolanowych w pozycji stojącej (obciążenie)', 'USG stawu kolanowego']
  },
  {
    code: 'M10.0',
    name: 'Dna moczanowa idiopatyczna (Podagra)',
    category: 'Choroby układu mięśniowo-szkieletowego (M00-M99)',
    chapter: 'XIII',
    description: 'Zapalenie stawu (najczęściej śródstopno-paliczkowego I - podagra) wywołane odkładaniem kryształów moczanu sodu.',
    keywords: ['dna moczanowa', 'podagra', 'kwas moczowy', 'artretyzm', 'obrzęk palucha', 'kolchicyna', 'allopurinol', 'milurit'],
    commonInPoz: true,
    suggestedAction: 'W napadzie dny: Kolchicyna lub NLPZ; w przewlekłej hiperurykemii: Allopurinol (Milurit) po wygaszeniu napadu ostrego.',
    suggestedTests: ['Kwas moczowy w surowicy', 'CRP', 'Kreatynina i eGFR', 'USG stawu (objaw podwójnego konturu)']
  },

  // ==========================================
  // ROZDZIAŁ XIV: UKŁAD MOCZOWY (N00-N99)
  // ==========================================
  {
    code: 'N39.0',
    name: 'Zakażenie dróg moczowych o nieokreślonym umiejscowieniu (ZUM)',
    category: 'Choroby układu moczowo-płciowego (N00-N99)',
    chapter: 'XIV',
    description: 'Zapalenie pęcherza lub cewki moczowej z dyzurią, parciem na mocz, częstomoczem i pieczeniem przy mikcji.',
    keywords: ['pęcherz', 'zapalenie pęcherza', 'zum', 'pieczenie przy oddawaniu moczu', 'parcie na mocz', 'częstomocz', 'furagina', 'furazydyna', 'fosfomycyna', 'monural'],
    commonInPoz: true,
    suggestedAction: 'Furazydyna (Furagina) 100mg 4x1 d. I dzień, potem 3x1 d. przez 7-8 dni lub jednorazowo Fosfomycyna (Monural 3g). Obfite nawadnianie.',
    suggestedTests: ['Badanie ogólne moczu z osadem', 'Posiew moczu (w zakażeniach nawrotowych lub powikłanych)']
  },
  {
    code: 'N18.3',
    name: 'Przewlekła choroba nerek, stadium 3 (PChN / eGFR 30-59 ml/min/1.73m²)',
    category: 'Choroby układu moczowo-płciowego (N00-N99)',
    chapter: 'XIV',
    description: 'Umiarkowane upośledzenie funkcji filtracyjnej nerek. Kluczowa nefroprotekcja (SGLT2i, blokery RAA, unikanie NLPZ i nefrotoksyn).',
    keywords: ['pchn', 'nerki', 'niewydolność nerek', 'egfr', 'kreatynina', 'mocznik', 'albuminuria', 'nefroprotekcja', 'forxiga', 'jardiance'],
    commonInPoz: true,
    suggestedAction: 'Nefroprotekcja: SGLT2i (Dapagliflozyna/Empagliflozyna), optymalizacja ciśnienia (<130/80), bezwzględne unikanie NLPZ, kontrola eGFR i potasu.',
    suggestedTests: ['Kreatynina w surowicy + eGFR (wg CKD-EPI)', 'Wskaźnik ACR (albumina/kreatynina w moczu)', 'Elektrolity (K, Na)', 'Morfologia (anemia nerkowa)', 'USG nerek']
  },
  {
    code: 'N20.1',
    name: 'Kamica moczowodu (Kolka nerkowa)',
    category: 'Choroby układu moczowo-płciowego (N00-N99)',
    chapter: 'XIV',
    description: 'Ostry ból w okolicy lędźwiowej promieniujący do pachwiny i narządów płciowych z dodatnim objawem Goldflama i krwiomoczem.',
    keywords: ['kolka nerkowa', 'kamica', 'kamień w nerce', 'złóg', 'ból nerki', 'goldflam', 'krwiomocz', 'no-spa', 'spazmolityk'],
    commonInPoz: true,
    suggestedAction: 'Leczenie przeciwbólowe i rozkurczowe: NLPZ i.m./p.o. + Drotaweryna (No-Spa Forte) 80mg + obfite nawodnienie, w gorączce pilna hospitalizacja.',
    suggestedTests: ['USG układu moczowego', 'Badanie ogólne moczu (erytrocyty)', 'Kreatynina, mocznik, elektrolity', 'CRP']
  },

  // ==========================================
  // ROZDZIAŁ V: ZDROWIE PSYCHICZNE I EMOCJONALNE (F00-F99)
  // ==========================================
  {
    code: 'F32.1',
    name: 'Epizod depresyjny umiarkowany',
    category: 'Zaburzenia psychiczne i zachowania (F00-F99)',
    chapter: 'V',
    description: 'Obniżenie nastroju, anhedonia, spadek energii, zaburzenia snu i łaknienia, poczucie winy, trwające powyżej 2 tygodni.',
    keywords: ['depresja', 'obniżony nastrój', 'smutek', 'anhedonia', 'brak chęci do życia', 'bezsenność', 'ssri', 'sertralina', 'escitalopram', 'phq-9'],
    commonInPoz: true,
    suggestedAction: 'Wdrożenie leczenia przeciwdepresyjnego SSRI (np. Sertralina 50mg lub Escitalopram 10mg), psychoterapia, ocena ryzyka samobójczego.',
    suggestedTests: ['Skala depresji PHQ-9 lub BDI', 'TSH (wykluczenie niedoczynności tarczycy)', 'Morfologia, witamina B12, elektrolity']
  },
  {
    code: 'F41.1',
    name: 'Zaburzenia lękowe uogólnione (GAD)',
    category: 'Zaburzenia psychiczne i zachowania (F00-F99)',
    chapter: 'V',
    description: 'Uporczywy, nadmierny lęk i zamartwianie się dotyczące codziennych spraw, z objawami somatycznymi (napięcie mięśniowe, drżenie, tachykardia).',
    keywords: ['lęk', 'nerwica', 'niepokój', 'zamartwianie', 'gad', 'napady paniki', 'stres', 'kołatanie serca nerwicowe', 'pregabalina', 'ssri'],
    commonInPoz: true,
    suggestedAction: 'Leczenie I rzutu: SSRI/SNRI lub Pregabalina, techniki relaksacyjne, psychoterapia poznawczo-behawioralna (CBT).',
    suggestedTests: ['Kwestionariusz GAD-7', 'EKG (wykluczenie arytmii organicznej)', 'TSH, elektrolity']
  },
  {
    code: 'G43.9',
    name: 'Migrena, nieokreślona',
    category: 'Choroby układu nerwowego (G00-G99)',
    chapter: 'VI',
    description: 'Napadowy, tętniący ból głowy, zazwyczaj jednostronny, z towarzyszącymi nudnościami, foto- i fonofobią.',
    keywords: ['migrena', 'ból głowy jednostronny', 'nudności', 'światłowstręt', 'fotofobia', 'tryptany', 'sumatryptan', 'aura'],
    commonInPoz: true,
    suggestedAction: 'Leczenie doraźne: Tryptan (np. Sumatryptan 50-100mg lub Zolmitryptan) przyjęty na początku napadu + NLPZ, dzienniczek bólów głowy.',
    suggestedTests: ['Konsultacja neurologiczna', 'Dzienniczek bólów głowy', 'MRI głowy w bólach atypowych']
  },

  // ==========================================
  // ROZDZIAŁ XVIII: OBJAWY I SYMPTOMY (R00-R99)
  // ==========================================
  {
    code: 'R05',
    name: 'Kaszel',
    category: 'Objawy i cechy chorobowe (R00-R99)',
    chapter: 'XVIII',
    description: 'Objaw odruchowy dróg oddechowych. Wymaga różnicowania ostrego vs przewlekłego (>8 tygodni) oraz przyczyn (infekcja, GERD, astma, polekowy ACEI).',
    keywords: ['kaszel', 'odkrztuszanie', 'suchy kaszel', 'mokry kaszel', 'pokasływanie', 'kaszel po lekach'],
    commonInPoz: true,
    suggestedAction: 'Identyfikacja przyczyny (weryfikacja czy pacjent nie przyjmuje inhibitora ACE np. Ramiprilu), osłuchanie płuc.',
    suggestedTests: ['RTG klatki piersiowej (w kaszlu przewlekłym)', 'Spirometria']
  },
  {
    code: 'R50.9',
    name: 'Gorączka, nieokreślona',
    category: 'Objawy i cechy chorobowe (R00-R99)',
    chapter: 'XVIII',
    description: 'Ciepłota ciała powyżej 38.0°C. Objaw reakcji ostrej fazy w odpowiedzi na pirogeny bakteryjne, wirusowe lub procesy zapalne.',
    keywords: ['gorączka', 'wysoka temperatura', 'dreszcze', 'poty', 'temperatura', 'paracetamol', 'ibuprofen'],
    commonInPoz: true,
    suggestedAction: 'Leki przeciwgorączkowe (Paracetamol 10-15mg/kg lub Ibuprofen 200-400mg), poszukiwanie ogniska zapalnego.',
    suggestedTests: ['Morfologia z rozmazem', 'CRP', 'Badanie ogólne moczu']
  },
  {
    code: 'R51',
    name: 'Ból głowy',
    category: 'Objawy i cechy chorobowe (R00-R99)',
    chapter: 'XVIII',
    description: 'Dolegliwości bólowe w obrębie głowy. Wymaga wykluczenia przyczyn wtórnych (skok ciśnienia tętniczego, zapalenie zatok, krwawienie podpajęczynówkowe).',
    keywords: ['ból głowy', 'napięciowy ból głowy', 'ucisk w głowie', 'tępy ból głowy', 'skok ciśnienia'],
    commonInPoz: true,
    suggestedAction: 'Pomiar ciśnienia tętniczego, ocena objawów oponowych i czerwonych flag bólów głowy (SNOOP).',
    suggestedTests: ['Pomiar RR', 'Badanie dna oka', 'Konsultacja neurologiczna w razie nagłego bólu "piorunującego"']
  },
  {
    code: 'R10.4',
    name: 'Inne i nieokreślone bóle brzucha',
    category: 'Objawy i cechy chorobowe (R00-R99)',
    chapter: 'XVIII',
    description: 'Dolegliwości bólowe jamy brzusznej. Wymaga pilnego wykluczenia ostrego brzucha (zapalenie wyrostka, niedrożność, perforacja).',
    keywords: ['ból brzucha', 'brzuch', 'skurcze brzucha', 'dyskomfort w jamie brzusznej', 'wzdęcia', 'ostry brzuch'],
    commonInPoz: true,
    suggestedAction: 'Badanie palpacyjne brzucha (objawy otrzewnowe: Blumberg, Jaworski, Chełmoński, Rovsing), leki rozkurczowe w bólach czynnościowych.',
    suggestedTests: ['Morfologia, CRP, elektrolity', 'Amylaza / Lipaza', 'Badanie ogólne moczu', 'USG jamy brzusznej']
  },

  // ==========================================
  // ROZDZIAŁ XXI: PROFILAKTYKA I BADANIA (Z00-Z99)
  // ==========================================
  {
    code: 'Z00.0',
    name: 'Ogólne badanie lekarskie (Badanie okresowe i profilaktyczne)',
    category: 'Czynniki wpływające na stan zdrowia (Z00-Z99)',
    chapter: 'XXI',
    description: 'Wizyta profilaktyczna w POZ (np. Bilans Zdrowia, Program CHUK - profilaktyka chorób układu krążenia, program Profilaktyka 40+).',
    keywords: ['bilans', 'profilaktyka', 'badania kontrolne', 'przegląd zdrowia', 'program chuk', 'ocena ryzyka sercowo-naczyniowego', 'score2'],
    commonInPoz: true,
    suggestedAction: 'Ocena ryzyka sercowo-naczyniowego SCORE-2, kalkulacja ryzyka cukrzycy FINDRISC, edukacja prozdrowotna.',
    suggestedTests: ['Lipidogram', 'Glukoza', 'Pomiar ciśnienia tętniczego (RR)', 'Masa ciała i obwód talii', 'Badanie moczu']
  }
];

export class Icd10Service {
  /**
   * Inteligentnie generuje podpowiedzi kodów ICD-10 na podstawie:
   * - diagnozy postawionej przez agenta,
   * - zgłaszanych objawów i wywiadu,
   * - przyjmowanych leków,
   * - parametrów życiowych i BMI.
   */
  public static getSmartSuggestions(
    agentDiagnosis: string = '',
    symptomsText: string = '',
    medicationsText: string = '',
    vitals?: { bp?: string; pulse?: number; temp?: number },
    patientInfo?: { bmi?: number; weight?: number; age?: number }
  ): Icd10Suggestion[] {
    const suggestions: Icd10Suggestion[] = [];
    const normalizedDiag = (agentDiagnosis || '').toLowerCase().trim();
    const normalizedSymptoms = (symptomsText || '').toLowerCase().trim();
    const normalizedMeds = (medicationsText || '').toLowerCase().trim();

    // Wyciągamy wartości numeryczne dla analizy parametrycznej
    let systolic = 0;
    let diastolic = 0;
    if (vitals?.bp) {
      const parts = vitals.bp.split('/');
      systolic = parseInt(parts[0], 10) || 0;
      diastolic = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
    }
    const temp = vitals?.temp || 0;
    const bmi = patientInfo?.bmi || 0;

    ICD10_DATABASE.forEach(entry => {
      let score = 0;
      let reason = '';
      let matchType: Icd10Suggestion['matchType'] = 'HIGH_RELEVANCE';

      const entryCodeNorm = entry.code.toLowerCase();
      const entryNameNorm = entry.name.toLowerCase();

      // 1. DOKŁADNE DOPASOWANIE KODU LUB NAZWY DO DIAGNOZY AGENTA
      if (normalizedDiag.includes(entryCodeNorm) || normalizedDiag === entryNameNorm) {
        score = 98;
        reason = `Diagnoza agenta zawiera dokładny kod lub nazwę jednostki: ${entry.code}`;
        matchType = 'EXACT';
      } else if (entryNameNorm.split(' ').some(w => w.length > 4 && normalizedDiag.includes(w))) {
        score = Math.max(score, 85);
        reason = `Wysoka zgodność słów kluczowych z proponowaną diagnozą agenta (${entry.name})`;
        matchType = 'HIGH_RELEVANCE';
      }

      // 2. SPRAWDZANIE SŁÓW KLUCZOWYCH W DIAGNOZIE I WYWIADZIE
      entry.keywords.forEach(kw => {
        const kwLower = kw.toLowerCase();
        if (normalizedDiag.includes(kwLower)) {
          score += 25;
          if (!reason) reason = `Wykryto powiązanie w diagnozie: "${kw}"`;
        }
        if (normalizedSymptoms.includes(kwLower)) {
          score += 15;
          if (!reason) {
            reason = `Objawy pacjenta wskazują na: "${kw}"`;
            matchType = 'SYMPTOM_CORRELATION';
          }
        }
        if (normalizedMeds.includes(kwLower)) {
          score += 20;
          if (!reason) {
            reason = `Korelacja ze stosowaną farmakoterapią: "${kw}"`;
            matchType = 'MEDICATION_CORRELATION';
          }
        }
      });

      // 3. DOPASOWANIE PARAMETRYCZNE (Vitals & BMI)
      if (entry.code.startsWith('I10') && (systolic >= 140 || diastolic >= 90)) {
        score += 35;
        reason = `Pomiar ciśnienia tętniczego (${vitals?.bp} mmHg) spełnia kryteria diagnostyczne nadciśnienia (PTNT/ESC)`;
        matchType = 'PARAMETRIC_MATCH';
      }
      if (entry.code.startsWith('E66') && bmi >= 30) {
        score += 40;
        reason = `Wskaźnik BMI (${bmi} kg/m²) kwalifikuje pacjenta do rozpoznania otyłości`;
        matchType = 'PARAMETRIC_MATCH';
      }
      if (entry.code.startsWith('R50') && temp >= 38.0) {
        score += 30;
        reason = `Zanotowano podwyższoną temperaturę ciała (${temp}°C)`;
        matchType = 'PARAMETRIC_MATCH';
      }
      if (entry.code.startsWith('I48') && (vitals?.pulse || 0) >= 110) {
        score += 15;
      }

      // Jeśli jednostka jest szczególnie częsta w POZ, dodajemy drobny bonus trafności
      if (entry.commonInPoz && score > 20) {
        score += 5;
      }

      // Normalizacja do 100 max
      const finalScore = Math.min(100, score);

      if (finalScore >= 25) {
        suggestions.push({
          entry,
          score: finalScore,
          matchReason: reason || `Sugerowane doprecyzowanie dla kategorii ${entry.category}`,
          matchType,
          isCurrentMatch: normalizedDiag.includes(entry.code.toLowerCase())
        });
      }
    });

    // Sortowanie malejąco po punktacji trafności
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Pełnotekstowe wyszukiwanie w bazie kodów ICD-10 (po kodzie, nazwie, synonimach i kategorii)
   */
  public static search(query: string, categoryFilter: string = 'ALL'): Icd10Entry[] {
    const q = (query || '').toLowerCase().trim();

    return ICD10_DATABASE.filter(entry => {
      // Filtr kategorii
      if (categoryFilter !== 'ALL' && entry.category !== categoryFilter) {
        return false;
      }

      if (!q) return true;

      // Sprawdzenie kodu
      if (entry.code.toLowerCase().includes(q)) return true;

      // Sprawdzenie nazwy
      if (entry.name.toLowerCase().includes(q)) return true;

      // Sprawdzenie podkodów
      if (entry.subCodes?.some(sub => sub.code.toLowerCase().includes(q) || sub.label.toLowerCase().includes(q))) {
        return true;
      }

      // Sprawdzenie słów kluczowych
      if (entry.keywords.some(kw => kw.toLowerCase().includes(q))) return true;

      // Sprawdzenie opisu
      if (entry.description?.toLowerCase().includes(q)) return true;

      return false;
    });
  }

  /**
   * Zwraca listę unikalnych kategorii / rozdziałów
   */
  public static getCategories(): string[] {
    const set = new Set<string>();
    ICD10_DATABASE.forEach(item => set.add(item.category));
    return Array.from(set);
  }

  /**
   * Pobiera pojedynczy wpis po kodzie
   */
  public static getByCode(code: string): Icd10Entry | undefined {
    const clean = (code || '').toUpperCase().trim();
    return ICD10_DATABASE.find(item => item.code.toUpperCase() === clean || item.subCodes?.some(s => s.code.toUpperCase() === clean));
  }
}
