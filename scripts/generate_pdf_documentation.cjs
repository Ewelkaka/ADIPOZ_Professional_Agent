const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

function generateDocumentationPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Wczytanie czcionek z pełną obsługą polskich znaków (UTF-8)
  const fontRegularPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
  const fontBoldPath = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf';

  if (fs.existsSync(fontRegularPath)) {
    const regularBinary = fs.readFileSync(fontRegularPath).toString('binary');
    doc.addFileToVFS('LiberationSans-Regular.ttf', regularBinary);
    doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
  }

  if (fs.existsSync(fontBoldPath)) {
    const boldBinary = fs.readFileSync(fontBoldPath).toString('binary');
    doc.addFileToVFS('LiberationSans-Bold.ttf', boldBinary);
    doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
  }

  doc.setFont('LiberationSans', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const bottomMargin = 22;

  let currentY = 25;

  function checkPageBreak(requiredSpace = 15) {
    if (currentY + requiredSpace > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 25;
      return true;
    }
    return false;
  }

  // --- STRONA TYTUŁOWA ---
  // Pasek nagłówkowy
  doc.setFillColor(15, 118, 110); // Teal 700
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setFillColor(2, 132, 199); // Sky 600
  doc.rect(0, 45, pageWidth, 3, 'F');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('ADIPOZ -> Professional Agent', marginLeft, 23);

  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(220, 252, 231);
  doc.text('Autonomiczny System Wspomagania Decyzji Klinicznych POZ (CDSS)', marginLeft, 33);

  currentY = 56;

  // Karta metadanych dokumentu i praw własności
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, currentY, contentWidth, 44, 3, 3, 'FD');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text('METADANE PROJEKTU I PRAWA WŁASNOŚCI:', marginLeft + 6, currentY + 7.5);

  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text('• Projekt: ADIPOZ -> Professional Agent (Autonomiczny Asystent Medyczny POZ)', marginLeft + 6, currentY + 14);
  
  doc.setFont('LiberationSans', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('• Twórca i Wyłączny Właściciel: Ewelina Lesiak (ewelinalesiak7@gmail.com)', marginLeft + 6, currentY + 20);
  
  doc.setFont('LiberationSans', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('• Prawa Autorskie: Wszelkie Prawa Zastrzeżone (All Rights Reserved) © 2026 Ewelina Lesiak', marginLeft + 6, currentY + 26);
  doc.text('• Licencja: Oprogramowanie Zastrzeżone / Własnościowe (Proprietary Commercial License)', marginLeft + 6, currentY + 32);
  doc.text('• Wersja: 1.0.0-PROD | Data: 03.09.2026 r. | Środowisko: Cloud Run / Node.js + React 19', marginLeft + 6, currentY + 38);

  currentY += 52;

  // Spis treści
  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 118, 110);
  doc.text('SPIS TREŚCI DOKUMENTACJI:', marginLeft, currentY);
  currentY += 6.5;

  const tocItems = [
    '1. Wprowadzenie i Cel Projektu',
    '2. Architektura Systemu i Stos Technologiczny',
    '3. Architektura Agentyczna i Silniki AI (Core Engines)',
    '4. Specjalistyczne Moduły Kliniczne i Analityczne',
    '5. Bezpieczeństwo Danych, Zgodność Prawna i RODO (GDPR)',
    '6. Warstwa Prezentacji i Wizualizacji Danych (UX/UI)',
    '7. API, Przepływ Danych i Backend (Server-Sent Events)',
    '8. Zarządzanie Stanem i Persystencja Danych',
    '9. Instrukcja Uruchomienia, Wdrożenia i Wymagania Środowiskowe',
    '10. Podsumowanie Wartości Systemu',
    '11. Prawa Autorskie, Własność Intelektualna i Klauzula Licencyjna'
  ];

  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  tocItems.forEach((item, idx) => {
    if (idx === 10) {
      doc.setFont('LiberationSans', 'bold');
      doc.setTextColor(15, 118, 110);
    }
    doc.text(item, marginLeft + 4, currentY);
    currentY += 5.2;
  });

  currentY += 8;

  // Funkcje pomocnicze formatowania
  function addHeading1(title) {
    checkPageBreak(18);
    currentY += 4;
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 118, 110); // Teal
    doc.text(title, marginLeft, currentY);
    currentY += 2;
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
    currentY += 5.5;
  }

  function addHeading2(title) {
    checkPageBreak(14);
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(title, marginLeft, currentY);
    currentY += 5;
  }

  function addParagraph(text) {
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(51, 65, 85); // Slate 700
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach(line => {
      checkPageBreak(5);
      doc.text(line, marginLeft, currentY);
      currentY += 4.3;
    });
    currentY += 1.8;
  }

  function addBullet(title, desc) {
    doc.setFont('LiberationSans', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 41, 59);
    const prefix = '• ' + title + ': ';
    const fullText = prefix + desc;
    const lines = doc.splitTextToSize(fullText, contentWidth - 4);

    checkPageBreak(lines.length * 4.3 + 2);
    lines.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFont('LiberationSans', 'bold');
        doc.text(line, marginLeft + 4, currentY);
      } else {
        doc.setFont('LiberationSans', 'normal');
        doc.text(line, marginLeft + 4, currentY);
      }
      currentY += 4.1;
    });
    currentY += 1.2;
  }

  // ==================== ROZDZIAŁ 1 ====================
  addHeading1('1. Wprowadzenie i Cel Projektu');
  addParagraph('ADIPOZ -> Professional Agent to autorski, specjalistyczny system wspomagania decyzji klinicznych (CDSS - Clinical Decision Support System), stworzony przez Ewelinę Lesiak w ścisłym dopasowaniu do specyfiki pracy lekarza Podstawowej Opieki Zdrowotnej (POZ) w Polsce.');
  addParagraph('Główna zasada operacyjna autonomicznego agenta ADIPOZ definiuje precyzyjny, 5-etapowy cykl asysty klinicznej z zachowaniem nadrzędnej decyzyjności lekarza (Human-in-the-Loop):');
  addBullet('Złoty Cykl Pracy Agenta', '„Lekarz kończy wizytę → AdiPOZ autonomicznie analizuje przypadek → znajduje rzeczy, które mogą wymagać uwagi → proponuje działania → lekarz zatwierdza.”');
  addBullet('1. Lekarz kończy wizytę', 'Lekarz wprowadza wywiad, objawy, aktualną listę leków oraz parametry życiowe i zamyka wizytę, zlecając analizę agentowi.');
  addBullet('2. Autonomiczna analiza AdiPOZ', 'Wielomodułowy silnik CDSS (SystemOrchestrator, DecisionEngine, BmiVarianceService) analizuje przypadek w korelacji z całą historią pacjenta.');
  addBullet('3. Detekcja obszarów uwagi', 'Agent lokalizuje krytyczne interakcje lekowe, gwałtowne wahania BMI, luki w badaniach NFZ i objawy alarmowe (Red Flags).');
  addBullet('4. Propozycje działań', 'Formułowanie precyzyjnych zaleceń: modyfikacja leczenia, zlecenia laboratoryjne, wizyta kontrolna, szkic notatki SOAP i e-recepty.');
  addBullet('5. Zatwierdzenie przez Lekarza', 'Lekarz zachowuje pełną kontrolę decyzyjną – weryfikuje propozycje i zatwierdza je jednym kliknięciem z wpisem do rejestru audytu.');
  addBullet('Redukcja obciążenia biurokratycznego', 'Automatyzacja wpisów do dokumentacji medycznej w ustrukturyzowanym formacie SOAP (Subjective, Objective, Assessment, Plan).');
  addBullet('Weryfikacja bezpieczeństwa farmakoterapii', 'Ciągła analiza interakcji lekowych, potencjalnych powikłań polipragmazji, przeciwwskazań narządowych oraz zgodności dawkowania.');
  addBullet('Analityka trendów metabolicznych i BMI', 'Zaawansowane śledzenie dynamiki masy ciała, detekcja anomalii pomiarowych oraz bezpośrednia korelacja zmian wagowych z wdrożeniami leków (np. GLP-1, SGLT2, ACEI).');
  addBullet('Zgodność z koszykiem świadczeń NFZ', 'Silnik analizy luk diagnostycznych sugerujący badania laboratoryjne i obrazowe dostępne w budżecie powierzonym POZ.');
  addBullet('Prywatność i Suwerenność Danych', 'Architektura Privacy-First gwarantująca pełną pseudonimizację danych przed ewentualną komunikacją zewnętrzną oraz opcjonalny tryb autonomiczny (Sovereign Offline).');

  // ==================== ROZDZIAŁ 2 ====================
  addHeading1('2. Architektura Systemu i Stos Technologiczny');
  addParagraph('System został zaprojektowany w architekturze hybrydowej Full-Stack (Client-Side Heavy z bezpiecznym serwerem pośredniczącym Node.js/Express). Rozwiązanie to gwarantuje natychmiastowy czas odpowiedzi interfejsu przy zachowaniu ścisłej ochrony tajemnicy lekarskiej i kluczy dostępowych.');

  // Tabela komponentów
  checkPageBreak(45);
  autoTable(doc, {
    startY: currentY,
    head: [['Warstwa / Kategoria', 'Komponent / Biblioteka', 'Wersja', 'Rola w systemie']],
    body: [
      ['Frontend UI', 'React 19 + TypeScript', '19.0.0 / 5.8', 'Reaktywny interfejs lekarza i pacjenta'],
      ['Styling & Design', 'Tailwind CSS v4', '4.1.14', 'Architektura utility-first bez plików konfiguracyjnych'],
      ['Silnik Aplikacji', 'Vite', '6.2.0', 'Kompilacja i serwowanie zasobów w trybie SPA'],
      ['Backend & Proxy', 'Node.js + Express', '4.21.2', 'Ochrona kluczy API, streaming SSE (/api/chat/openai)'],
      ['Wizualizacja Danych', 'Recharts', '3.8.0', 'Krzywe BMI, punkty zdarzeń lekowych, linie odniesienia'],
      ['Animacje UI', 'Motion (motion/react)', '12.23.24', 'Płynne przejścia stanów i okien modalnych'],
      ['Ikonografia', 'Lucide React', '0.546.0', 'Spójne piktogramy medyczne i interfejsowe'],
      ['Generowanie PDF', 'jsPDF + AutoTable', '4.2.1 / 5.0.7', 'Eksport kart wizyt SOAP, e-recept i raportów'],
      ['Modele AI', 'OpenAI SDK & @google/genai', '6.32.0 / 1.29', 'Wnioskowanie diagnostyczne i asystent kliniczny']
    ],
    theme: 'grid',
    styles: {
      font: 'LiberationSans',
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: 255,
      fontStyle: 'bold'
    },
    margin: { left: marginLeft, right: marginRight }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // ==================== ROZDZIAŁ 3 ====================
  addHeading1('3. Architektura Agentyczna i Silniki AI (Core Engines)');
  addParagraph('Struktura serwerowa i kliencka opiera się na wyspecjalizowanych silnikach koordynowanych przez centralny orkiestrator:');
  addBullet('SystemOrchestrator.ts', 'Nadrzędny koordynator procesu. Przeprowadza walidację parametrów życiowych, wywołuje równolegle silniki diagnostyczne, agreguje wyniki i generuje ujednolicony rekord wizyty.');
  addBullet('DecisionEngine.ts', 'Odpowiada za propozycję rozpoznań klinicznych i kodów ICD-10. Działa w oparciu o reguły deterministyczne zintegrowane z modelami LLM (poprzez ustrukturyzowany format JSON).');
  addBullet('MedicationAnalysisEngine.ts', 'Kluczowy moduł bezpieczeństwa farmakologicznego. Weryfikuje interakcje lek-lek, lek-choroba oraz dawkowanie w odniesieniu do wydolności nerek i wątroby.');
  addBullet('SovereignEngine.ts & LocalAIEngine.ts', 'Gwarantuje pełną autonomię pracy gabinetu bez połączenia z siecią Internet. Opiera się na algorytmach medycyny opartej na faktach (EBM) i lokalnych drzewach decyzyjnych.');

  // ==================== ROZDZIAŁ 4 ====================
  addHeading1('4. Specjalistyczne Moduły Kliniczne i Analityczne');
  addHeading2('4.1. MedicationCorrelationService - Korelacja Leków ze Zmianą Masy Ciała i BMI');
  addParagraph('Autorski algorytm łączący historię farmakoterapii pacjenta z dynamiką parametrów antropometrycznych:');
  addBullet('Parser lekowy (parseMedicationsList)', 'Inteligentnie ekstrahuje nazwy poszczególnych substancji z wolnego tekstu wywiadu, odrzucając zbędne dawkowania oraz wyrażenia negatywne.');
  addBullet('Normalizacja rdzeni (extractDrugRoot)', 'Przekształca nazwy handlowe i międzynarodowe do uniwersalnego rdzenia (np. Ozempic, Semaglutyd, Metformina), co pozwala wykryć wdrożenie nowej cząsteczki.');
  addBullet('Kwantyfikacja dynamiki', 'Wylicza zmianę masy ciała (delta kg) oraz BMI od dnia startu leku do aktualnej wizyty oraz kategoryzuje trend (LOSS, GAIN, STABLE).');

  addHeading2('4.2. BmiVarianceService - Weryfikacja Wahań i Bezpieczeństwa BMI');
  addParagraph('Chroni przed błędami pomiarowymi i alertuje o nagłych dekompensacjach klinicznych (np. retencja płynów przy niewydolności krążenia vs nagły spadek masy przy procesach rozrostowych lub cukrzycy). Standardowy próg wariancji wynosi 2.0 pkt BMI w okresie krótszym niż 30 dni.');

  addHeading2('4.3. WeightGoalService & EReceptaService');
  addParagraph('WeightGoalService umożliwia definiowanie i monitorowanie spersonalizowanych celów terapeutycznych, rysując poziome linie referencyjne na wykresach. EReceptaService odpowiada za generowanie kodów dostępu e-recept, kodów kreskowych Code128 oraz automatyczne dobieranie poziomów refundacji NFZ.');

  // ==================== ROZDZIAŁ 5 ====================
  addHeading1('5. Bezpieczeństwo Danych, Zgodność Prawna i RODO (GDPR)');
  addParagraph('Przetwarzanie danych medycznych (art. 9 RODO) zrealizowano zgodnie z najwyższymi standardami cyberbezpieczeństwa:');
  addBullet('MedicalDataProtection.ts', 'Moduł lokalnej pseudonimizacji. Wykrywa i trwale usuwa numery PESEL (z walidacją sumy kontrolnej), nazwiska oraz adresy przed przesłaniem kontekstu do modeli chmurowych.');
  addBullet('Human-In-The-Loop (Nadrzędność Lekarza)', 'Sztuczna inteligencja pełni wyłącznie rolę opiniodawczą. Każda decyzja o kodzie ICD-10 czy wdrożeniu leku wymaga świadomego zatwierdzenia przez lekarza prowadzącego.');
  addBullet('MedicalAuditLog.ts', 'Niemutowalny dziennik audytowy rejestrujący czas wygenerowania rekomendacji, wprowadzone modyfikacje oraz statusy alertów bezpieczeństwa.');

  // ==================== ROZDZIAŁ 6 ====================
  addHeading1('6. Warstwa Prezentacji i Wizualizacji Danych (UX/UI)');
  addParagraph('Interfejs użytkownika zoptymalizowano pod kątem minimalizacji zmęczenia wzrokowego i optymalnej ergonomii pracy:');
  addBullet('CustomBmiChartDot.tsx', 'Niestandardowe renderowanie punktów wykresu Recharts. Wizyty ze startem nowego leku zyskują pulsujący pierścień z ikoną pigułki oraz kapsułkę z nazwą leku.');
  addBullet('CustomBmiXAxisTick.tsx', 'Oś X czasu wizyt wzbogacona o etykiety farmakoterapii bezpośrednio pod datami konsultacji.');
  addBullet('CustomBmiTooltip.tsx', 'Bogata chmurka pomiaru wyświetlająca szczegóły objawów, ciśnienia oraz wyliczony wpływ wdrożonych leków na dynamikę wagi.');
  addBullet('Widok Pacjenta i Moduł PPG', 'Dedykowany ekran dla pacjenta wyposażony w fotopletyzmografię kamerową (szacowanie tętna w czasie rzeczywistym z opuszki palca).');

  // ==================== ROZDZIAŁ 7 ====================
  addHeading1('7. API, Przepływ Danych i Backend');
  addParagraph('Backend aplikacji stanowi serwer Express (server.ts) zintegrowany z middleware Vite:');
  addBullet('POST /api/chat/openai', 'Bezpieczne proxy ze strumieniowaniem odpowiedzi Server-Sent Events (SSE). Klucz OPENAI_API_KEY nigdy nie wycieka do przeglądarki klienta.');
  addBullet('Obsługa błędów i limitów', 'Dedykowana warstwa przechwytywania kodów 429 (Rate Limit / Billing) z natychmiastowym, czytelnym komunikatem w języku polskim.');
  addBullet('Obsługa SPA', 'Zintegrowany routing fallback kierujący zapytania statyczne na skompilowany pakiet produkcyjny dist/index.html.');

  // ==================== ROZDZIAŁ 8 ====================
  addHeading1('8. Zarządzanie Stanem i Persystencja Danych');
  addParagraph('Za przechowywanie danych odpowiada serwis LocalPatientDB.ts wykorzystujący kombinację IndexedDB oraz localStorage. W przypadku nowego wdrożenia, system automatycznie ładuje wzorcowy profil PAC-12345 zawierający realistyczną, wielomiesięczną historię wizyt (Ramipril, Metformina, Ozempic), co pozwala na natychmiastowe testowanie modułu korelacji.');

  // ==================== ROZDZIAŁ 9 ====================
  addHeading1('9. Instrukcja Uruchomienia, Wdrożenia i Wymagania');
  addParagraph('Aplikacja przystosowana jest do wdrożenia kontenerowego Docker / Cloud Run oraz środowisk lokalnych:');
  addBullet('Wymagania', 'Node.js w wersji LTS (v20.x lub v22.x), NPM 10+, port 3000.');
  addBullet('npm run dev', 'Uruchomienie w trybie deweloperskim z serwerem TSX i middleware Vite.');
  addBullet('npm run build', 'Jednoczesna kompilacja frontendu Vite do dist/ oraz backendu server.ts za pomocą esbuild do pojedynczego pliku dist/server.cjs.');
  addBullet('npm run start', 'Uruchomienie skompilowanego serwera produkcyjnego (node dist/server.cjs).');

  // ==================== ROZDZIAŁ 10 ====================
  addHeading1('10. Podsumowanie Wartości Systemu');
  addParagraph('System AdiPOZ stanowi nowoczesną platformę wsparcia polskiego lekarza rodzinnego. Dzięki połączeniu modeli językowych z rygorystycznymi algorytmami medycznymi, system gwarantuje wysoki poziom bezpieczeństwa klinicznego, czytelną prezentację długofalowych trendów terapeutycznych oraz oszczędność cennego czasu podczas każdej wizyty.');

  // ==================== ROZDZIAŁ 11 ====================
  addHeading1('11. Prawa Autorskie, Własność Intelektualna i Klauzula Licencyjna');
  
  checkPageBreak(30);
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.6);
  doc.roundedRect(marginLeft, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('LiberationSans', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110);
  doc.text('KLAUZULA PRAWNA WŁASNOŚCI I PRAWA AUTORSKIEGO', marginLeft + 5, currentY + 6);

  doc.setFont('LiberationSans', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Niniejsza aplikacja oraz wszelkie jej składowe stanowią wyłączną własność autorską:', marginLeft + 5, currentY + 12);
  doc.setFont('LiberationSans', 'bold');
  doc.text('EWELINA LESIAK (kontakt: ewelinalesiak7@gmail.com) - TWÓRCA I JEDYNY WŁAŚCICIEL', marginLeft + 5, currentY + 18);
  
  currentY += 29;

  addParagraph('Wszelkie autorskie prawa osobiste i majątkowe, a także prawa własności przemysłowej i intelektualnej do systemu ADIPOZ -> Professional Agent (w tym kodu źródłowego, architektury oprogramowania, algorytmów analitycznych, wzorców interfejsu graficznego UX/UI oraz dokumentacji technicznej) są zastrzeżone na rzecz Eweliny Lesiak (All Rights Reserved).');

  addBullet('Status Prawny Licencji', 'Oprogramowanie Własnościowe (Proprietary / Closed Source). Żadna część systemu nie może być traktowana jako otwartoźródłowa (Open Source) ani domena publiczna bez wyraźnej, pisemnej umowy licencyjnej.');
  addBullet('Zakaz Nieautoryzowanego Użycia', 'Zabrania się kopiowania, powielania, dekompilacji, inżynierii wstecznej (reverse engineering), modyfikacji, sublicencjonowania oraz udostępniania osobom trzecim bez uprzedniej pisemnej zgody Właścicielki.');
  addBullet('Wykorzystanie Komercyjne i Wdrożeniowe', 'Każdorazowe komercyjne zastosowanie, wdrożenie w placówkach medycznych, dystrybucja w modelu SaaS lub integracja z zewnętrznymi systemami HIS/Gabinetowymi wymaga zawarcia odpłatnej umowy licencyjnej z Właścicielką.');
  addBullet('Ochrona Prawna', 'Wszelkie naruszenia praw wyłącznych podlegają odpowiedzialności cywilnej i karnej na podstawie ustawy z dnia 4 lutego 1994 r. o prawie autorskim i prawach pokrewnych, dyrektyw Parlamentu Europejskiego oraz międzynarodowych konwencji WIPO.');

  // --- STOPKA DOKUMENTU NA KAŻDEJ STRONIE ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('LiberationSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400

    // Linia nad stopką
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 12, marginLeft + contentWidth, pageHeight - 12);

    doc.setFont('LiberationSans', 'bold');
    doc.text('ADIPOZ -> Professional Agent © 2026 Ewelina Lesiak | Wszelkie Prawa Zastrzeżone', marginLeft, pageHeight - 7);
    
    doc.setFont('LiberationSans', 'normal');
    const pageNumText = `Strona ${i} z ${totalPages}`;
    doc.text(pageNumText, marginLeft + contentWidth - doc.getTextWidth(pageNumText), pageHeight - 7);
  }

  // Zapis do katalogu public
  const outputDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath1 = path.join(outputDir, 'dokumentacja_technologiczna_adipoz.pdf');
  const outputPath2 = path.join(outputDir, 'Dokumentacja_Technologiczna_AdiPOZ.pdf');
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  fs.writeFileSync(outputPath1, pdfBuffer);
  fs.writeFileSync(outputPath2, pdfBuffer);

  // Kopia także do dist, jeśli katalog istnieje
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'dokumentacja_technologiczna_adipoz.pdf'), pdfBuffer);
    fs.writeFileSync(path.join(distDir, 'Dokumentacja_Technologiczna_AdiPOZ.pdf'), pdfBuffer);
  }

  console.log(`PDF successfully created! File size: ${pdfBuffer.length} bytes.`);
  console.log(`Saved to: ${outputPath1}`);
}

generateDocumentationPdf();
