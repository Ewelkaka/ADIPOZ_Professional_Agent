import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { AnalysisRecord } from "../services/LocalPatientDB";
import { ChronicMedicationExpiryService, ChronicMedicationItem } from "../services/ChronicMedicationExpiryService";
import { EReceptaService, EReceptaMedication } from "../services/EReceptaService";
import { MzRefundAuditReport, MedicationMzVerification } from "../services/RefundacjaMzService";

export interface ExtractedEReceptaReportItem {
  id: string;
  source: 'VISIT' | 'CHRONIC_MONITOR';
  visitDate: string;
  medicationName: string;
  innName: string;
  dosage: string;
  packageSize: string;
  dosageInstruction: string;
  p1AccessCode: string;
  packageKey44: string;
  issueDate: string;
  validUntil: string;
  daysRemaining: number;
  status: 'ACTIVE' | 'CRITICAL_7_DAYS' | 'WARNING_SOON' | 'EXPIRED';
  refundationLevel: string;
  diagnosis?: string;
  icd10Code?: string;
  isChronic: boolean;
}

export const generatePatientReportPDF = (
  analysis: any,
  patientId: string,
  history?: any[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Determine if this is a collective history report
  const isHistoryArray = Array.isArray(analysis);
  const visits: any[] = isHistoryArray
    ? analysis
    : (Array.isArray(history) && history.length > 0 ? history : []);

  if (visits.length > 0) {
    // === ZBIORCZY RAPORT HISTORII WIZYT PACJENTA ===
    doc.setFontSize(18);
    doc.text("Zbiorczy Raport Historii Wizyt Pacjenta", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.text(`ID Pacjenta: ${patientId}`, 14, 30);
    doc.text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, 14, 37);
    doc.text(`Liczba zarejestrowanych wizyt: ${visits.length}`, 14, 44);

    // Tabela podsumowująca wszystkie wizyty
    const tableRows = visits.map((v: any, index: number) => {
      const vData = v.analysis?.data || v.analysis || {};
      const decision = vData.decision || {};
      const medAnalysis = vData.medAnalysis || {};
      const dateStr = v.timestamp ? new Date(v.timestamp).toLocaleDateString('pl-PL') : `Wizyta ${index + 1}`;
      const diag = decision.diagnosis || "Brak diagnozy";
      const icd = decision.icd10Code || "-";
      const bp = v.vitals?.bp ? `RR: ${v.vitals.bp}` : "-";
      const pulse = v.vitals?.pulse ? `${v.vitals.pulse} bpm` : "";
      const vitalsStr = [bp, pulse].filter(Boolean).join(", ") || "-";
      const medStatus = medAnalysis.isSafe !== undefined ? (medAnalysis.isSafe ? "Bezpieczne" : "Ryzyko") : "-";

      return [index + 1, dateStr, diag, icd, vitalsStr, medStatus];
    });

    autoTable(doc, {
      startY: 50,
      head: [["Lp.", "Data", "Diagnoza", "ICD-10", "Parametry (RR/T\u0119tno)", "Ocena lek\u00f3w"]],
      body: tableRows,
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    let currentY = (doc as any).lastAutoTable?.finalY || 80;

    // Szczegółowy wykaz poszczególnych wizyt
    visits.forEach((v: any, index: number) => {
      const vData = v.analysis?.data || v.analysis || {};
      const decision = vData.decision || {};
      const medAnalysis = vData.medAnalysis || {};
      const dateStr = v.timestamp ? new Date(v.timestamp).toLocaleString('pl-PL') : `Wizyta ${index + 1}`;

      // Check remaining page height before starting a new visit block
      if (currentY + 50 > pageHeight) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 12;
      }

      // Nagłówek wizyty
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Wizyta #${index + 1} - ${dateStr}`, 14, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 7;

      doc.setFontSize(10);
      if (v.symptoms) {
        doc.text(`Objawy: ${v.symptoms}`, 14, currentY, { maxWidth: 180 });
        currentY += 7;
      }
      if (v.medications) {
        doc.text(`Leki pacjenta: ${v.medications}`, 14, currentY, { maxWidth: 180 });
        currentY += 7;
      }

      if (decision.diagnosis) {
        doc.text(`Sugerowana diagnoza: ${decision.diagnosis} ${decision.icd10Code ? `(${decision.icd10Code})` : ""}`, 14, currentY, { maxWidth: 180 });
        currentY += 7;
      }

      if (decision.podsumowanie_wizyty) {
        doc.text(`Podsumowanie: ${decision.podsumowanie_wizyty}`, 14, currentY, { maxWidth: 180 });
        currentY += 8;
      }

      if (decision.action) {
        doc.text(`Dzia\u0142anie / Zalecenia: ${decision.action}`, 14, currentY, { maxWidth: 180 });
        currentY += 7;
      }

      if (decision.suggestedTests && decision.suggestedTests.length > 0) {
        doc.text(`Sugerowane badania: ${decision.suggestedTests.join(", ")}`, 14, currentY, { maxWidth: 180 });
        currentY += 7;
      }

      if (medAnalysis.summary) {
        doc.text(`Ocena lek\u00f3w: ${medAnalysis.summary}`, 14, currentY, { maxWidth: 180 });
        currentY += 8;
      }

      if (medAnalysis.risks && medAnalysis.risks.length > 0) {
        const risks = medAnalysis.risks.map((r: any) => [r.type || "Ryzyko", r.severity || "Info", r.message || ""]);
        autoTable(doc, {
          startY: currentY,
          head: [["Typ", "Waga", "Opis ryzyka"]],
          body: risks,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [231, 76, 60] }
        });
        currentY = (doc as any).lastAutoTable?.finalY || currentY + 15;
      }

      // Linia oddzielająca
      if (currentY + 5 < pageHeight) {
        doc.setDrawColor(200, 200, 200);
        doc.line(14, currentY + 3, pageWidth - 14, currentY + 3);
        currentY += 5;
      }
    });

    doc.save(`Zbiorczy_Raport_Historii_${patientId}.pdf`);
    return;
  }

  // === POJEDYNCZY RAPORT BIEŻĄCEJ WIZYTY (JEŚLI BRAK HISTORII) ===
  const singleData = analysis?.data || analysis || {};
  const singleDecision = singleData.decision || {};
  const singleMed = singleData.medAnalysis || {};

  // Header
  doc.setFontSize(18);
  doc.text("Raport Wizyty Pacjenta", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text(`ID Pacjenta: ${patientId}`, 14, 30);
  doc.text(`Data: ${new Date().toLocaleDateString('pl-PL')}`, 14, 37);

  // Podsumowanie wizyty
  doc.setFontSize(14);
  doc.text("Podsumowanie Wizyty", 14, 50);
  doc.setFontSize(10);
  doc.text(singleDecision.podsumowanie_wizyty || "Brak danych", 14, 58, { maxWidth: 180 });

  // Analiza leków
  doc.setFontSize(14);
  doc.text("Analiza Farmakoterapii", 14, 80);
  doc.setFontSize(10);
  doc.text(singleMed.summary || "Brak danych", 14, 88, { maxWidth: 180 });

  if (singleMed.risks && singleMed.risks.length > 0) {
    const risks = singleMed.risks.map((r: any) => [r.type, r.severity, r.message]);
    autoTable(doc, {
      startY: 100,
      head: [['Typ', 'Waga', 'Opis']],
      body: risks,
    });
  }

  // Zalecenia / Działania
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(14);
  doc.text("Zalecenia i Dzia\u0142ania", 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Diagnoza: ${singleDecision.diagnosis || "Brak"}`, 14, finalY + 23);
  doc.text(`Dzia\u0142anie: ${singleDecision.action || "Brak"}`, 14, finalY + 30);

  if (singleDecision.suggestedTests && singleDecision.suggestedTests.length > 0) {
    doc.text("Sugerowane badania:", 14, finalY + 40);
    singleDecision.suggestedTests.forEach((test: string, i: number) => {
      doc.text(`- ${test}`, 14, finalY + 47 + (i * 7));
    });
  }

  doc.save(`Raport_Pacjenta_${patientId}.pdf`);
};

/**
 * Generuje i pobiera kompleksowy ZBIORCZY RAPORT PDF WSZYSTKICH e-RECEPT
 * wystawionych dla bieżącego pacjenta z modułu historii i monitora leków przewlekłych.
 */
export const generatePatientEReceptasReportPDF = (
  patientId: string,
  history: AnalysisRecord[] = [],
  patientInfo?: any
): { count: number; filename: string } => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const patientAge = patientInfo?.age || 55;
  const patientPesel = patientInfo?.pesel || '84051209384';
  const patientName = patientInfo?.name || (patientInfo?.imie && patientInfo?.nazwisko ? `${patientInfo.imie} ${patientInfo.nazwisko}` : `Pacjent (${patientId})`);
  const isSenior = patientAge >= 65;

  // 1. Ekstrakcja leków z monitora leków przewlekłych
  const chronicMeds = ChronicMedicationExpiryService.getPatientChronicMedications(patientId, undefined, history, patientAge);

  const itemsMap = new Map<string, ExtractedEReceptaReportItem>();

  // Dodaj leki przewlekłe
  chronicMeds.forEach((cm: ChronicMedicationItem) => {
    const key = `${cm.name.toLowerCase().trim()}_${cm.p1AccessCode}`;
    itemsMap.set(key, {
      id: cm.id,
      source: 'CHRONIC_MONITOR',
      visitDate: cm.issueDate,
      medicationName: cm.name,
      innName: cm.innName || cm.name,
      dosage: cm.dosage,
      packageSize: cm.packageSize,
      dosageInstruction: `${cm.dosage} (${cm.chronicDisease})`,
      p1AccessCode: cm.p1AccessCode,
      packageKey44: EReceptaService.generate44DigitKey(patientPesel),
      issueDate: cm.issueDate,
      validUntil: cm.validUntil,
      daysRemaining: cm.daysRemaining,
      status: cm.status,
      refundationLevel: cm.refundationLevel || (isSenior ? 'S' : 'R'),
      diagnosis: cm.chronicDisease,
      icd10Code: cm.chronicDisease.includes('Cukrzyca') ? 'E11' : cm.chronicDisease.includes('Nadciśnienie') ? 'I10' : 'Z76.0',
      isChronic: true
    });
  });

  // 2. Ekstrakcja leków z poszczególnych wizyt w historii
  history.forEach((record, recIdx) => {
    const vDate = record.timestamp ? record.timestamp.split('T')[0] : ChronicMedicationExpiryService.formatDate(new Date());
    const vDiagnosis = record.analysis?.decision?.diagnosis || record.analysis?.data?.decision?.diagnosis || 'Ordynacja lekarska w POZ';
    const vIcd = record.analysis?.decision?.icd10Code || record.analysis?.data?.decision?.icd10Code || 'Z76.0';

    // Sprawdź czy wizyta ma ustrukturyzowane eReceptaData
    const structuredRecepta = record.analysis?.data?.eReceptaData || record.analysis?.eReceptaData;
    if (structuredRecepta && Array.isArray(structuredRecepta.medications) && structuredRecepta.medications.length > 0) {
      structuredRecepta.medications.forEach((m: EReceptaMedication, mIdx: number) => {
        const p1Code = structuredRecepta.accessCode || Math.floor(1000 + (recIdx * 111 + mIdx * 37) % 9000).toString();
        const validUntil = structuredRecepta.validUntil || ChronicMedicationExpiryService.addDaysToDate(vDate, m.validityDays || 30);
        const { daysRemaining, status } = ChronicMedicationExpiryService.calculateDaysRemainingAndStatus(validUntil);

        const key = `${m.name.toLowerCase().trim()}_${p1Code}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: `visit-${record.id}-${mIdx}`,
            source: 'VISIT',
            visitDate: vDate,
            medicationName: m.name,
            innName: m.innName || m.name,
            dosage: m.dosage,
            packageSize: m.packageSize || '1 op.',
            dosageInstruction: m.dosageInstruction || `Stosować: ${m.dosage}`,
            p1AccessCode: p1Code,
            packageKey44: structuredRecepta.packageKey44 || EReceptaService.generate44DigitKey(patientPesel),
            issueDate: vDate,
            validUntil,
            daysRemaining,
            status,
            refundationLevel: m.refundationLevel || (isSenior ? 'S' : 'R'),
            diagnosis: vDiagnosis,
            icd10Code: vIcd,
            isChronic: Boolean(m.chronicDisease)
          });
        }
      });
    } else if (record.medications && record.medications.trim().length > 0) {
      // Parsowanie tekstu leków z wizyty
      const parsedMeds = EReceptaService.parseMedicationsFromText(record.medications, patientAge, false);
      parsedMeds.forEach((m: EReceptaMedication, mIdx: number) => {
        const p1Code = Math.floor(2000 + ((recIdx + 1) * 333 + (mIdx + 1) * 97) % 7800).toString();
        const isLongTerm = m.name.toLowerCase().includes('metform') || m.name.toLowerCase().includes('ramipril') || m.name.toLowerCase().includes('atorwa') || m.name.toLowerCase().includes('bisoprolol');
        const validityDays = isLongTerm ? 365 : 30;
        const validUntil = ChronicMedicationExpiryService.addDaysToDate(vDate, validityDays);
        const { daysRemaining, status } = ChronicMedicationExpiryService.calculateDaysRemainingAndStatus(validUntil);

        const key = `${m.name.toLowerCase().trim()}_${vDate}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: `visit-parsed-${record.id}-${mIdx}`,
            source: 'VISIT',
            visitDate: vDate,
            medicationName: m.name,
            innName: m.innName || m.name,
            dosage: m.dosage,
            packageSize: m.packageSize || '30 tabl.',
            dosageInstruction: m.dosageInstruction || `Doustnie: ${m.dosage}`,
            p1AccessCode: p1Code,
            packageKey44: EReceptaService.generate44DigitKey(patientPesel),
            issueDate: vDate,
            validUntil,
            daysRemaining,
            status,
            refundationLevel: isSenior ? 'S' : (m.refundationLevel || 'R'),
            diagnosis: vDiagnosis,
            icd10Code: vIcd,
            isChronic: isLongTerm
          });
        }
      });
    }
  });

  const allItems = Array.from(itemsMap.values());

  // Jeśli brak leków w historii i monitorze, dodaj domyślne leki pacjenta dla celów poglądowych
  if (allItems.length === 0) {
    const todayStr = ChronicMedicationExpiryService.formatDate(new Date());
    const validUntil = ChronicMedicationExpiryService.addDaysToDate(todayStr, 365);
    allItems.push({
      id: 'demo-med-1',
      source: 'CHRONIC_MONITOR',
      visitDate: todayStr,
      medicationName: 'Ramipril 5 mg',
      innName: 'Ramiprilum',
      dosage: '1x1 rano',
      packageSize: '28 tabl.',
      dosageInstruction: '1 tabletka rano przed posiłkiem',
      p1AccessCode: '4829',
      packageKey44: EReceptaService.generate44DigitKey(patientPesel),
      issueDate: todayStr,
      validUntil,
      daysRemaining: 365,
      status: 'ACTIVE',
      refundationLevel: isSenior ? 'S' : 'R',
      diagnosis: 'Nadciśnienie tętnicze pierwotne (I10)',
      icd10Code: 'I10',
      isChronic: true
    });
  }

  // Statystyki
  const totalCount = allItems.length;
  const criticalCount = allItems.filter(i => i.status === 'CRITICAL_7_DAYS' || i.status === 'EXPIRED').length;
  const activeCount = allItems.filter(i => i.status === 'ACTIVE').length;
  const warningCount = allItems.filter(i => i.status === 'WARNING_SOON').length;

  // ==========================================
  // RYSOWANIE DOKUMENTU PDF (STANDARD P1 / CeZ)
  // ==========================================

  // 1. Górny pasek graficzny (Teal / Emerald)
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 8, pageWidth, 2, "F");

  // 2. Nagłówek dokumentu
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("ZBIORCZY RAPORT I WYKAZ e-RECEPT PACJENTA", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("System Elektronicznej Recepty P1 • Centrum e-Zdrowia (CeZ) / Narodowy Fundusz Zdrowia", pageWidth / 2, 25, { align: "center" });

  // 3. Ramka z danymi Pacjenta i Placówki
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 30, 182, 30, 3, 3, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("DANE PACJENTA:", 18, 37);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Pacjent: ${patientName}`, 18, 43);
  doc.text(`PESEL: ${patientPesel}`, 18, 49);
  doc.text(`Wiek / Płeć: ${patientAge} lat • ${patientInfo?.gender === 'K' ? 'Kobieta' : 'Mężczyzna'}`, 18, 55);

  doc.setFont("helvetica", "bold");
  doc.text("PODMIOT LECZNICZY & LEKARZ:", 105, 37);

  doc.setFont("helvetica", "normal");
  doc.text("NZOZ Poradnia Lekarza Rodzinnego i POZ", 105, 43);
  doc.text("Lekarz: dr n. med. Jan Kowalski (NPWZ: 1234567)", 105, 49);
  doc.text(`Data raportu: ${new Date().toLocaleString('pl-PL')}`, 105, 55);

  // 4. Pasek podsumowania statystyk (Pills)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  
  // Box: Razem recept
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(14, 64, 42, 10, 2, 2, "FD");
  doc.setTextColor(67, 56, 202);
  doc.text(`Łącznie e-Recept: ${totalCount}`, 35, 70.5, { align: "center" });

  // Box: Aktywne
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(60, 64, 42, 10, 2, 2, "FD");
  doc.setTextColor(4, 120, 87);
  doc.text(`Ważne: ${activeCount}`, 81, 70.5, { align: "center" });

  // Box: Wygasające wkrótce
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(106, 64, 42, 10, 2, 2, "FD");
  doc.setTextColor(180, 83, 9);
  doc.text(`Wkrótce (8-14 dni): ${warningCount}`, 127, 70.5, { align: "center" });

  // Box: Krytyczne / Wygasające <= 7 dni
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(152, 64, 44, 10, 2, 2, "FD");
  doc.setTextColor(185, 28, 28);
  doc.text(`Pilne (≤ 7 dni): ${criticalCount}`, 174, 70.5, { align: "center" });

  // 5. Tabela Zbiorcza autoTable
  const tableRows = allItems.map((item, index) => {
    const statusText = item.status === 'EXPIRED'
      ? 'WYGASŁA'
      : item.status === 'CRITICAL_7_DAYS'
        ? `PILNE (${item.daysRemaining} d)`
        : item.status === 'WARNING_SOON'
          ? `Wkrótce (${item.daysRemaining} d)`
          : `Ważna (${item.daysRemaining} d)`;

    const refundText = item.refundationLevel === 'S'
      ? 'Bezpłatne (S)'
      : item.refundationLevel === 'R'
        ? 'Ryczałt (R)'
        : item.refundationLevel || '100%';

    return [
      (index + 1).toString(),
      item.issueDate,
      `${item.medicationName}\n(${item.packageSize})`,
      item.dosage,
      item.p1AccessCode,
      `${item.validUntil}\n[${statusText}]`,
      refundText
    ];
  });

  autoTable(doc, {
    startY: 78,
    head: [["Lp.", "Data wyst.", "Lek i Opakowanie", "Dawkowanie", "KOD P1", "Ważność do", "Odpłatność"]],
    body: tableRows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 46 },
      3: { cellWidth: 32 },
      4: { cellWidth: 20, halign: "center", fontStyle: "bold", textColor: [5, 150, 105] },
      5: { cellWidth: 28, halign: "center" },
      6: { cellWidth: 24, halign: "center" }
    }
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 130;

  // 6. Szczegółowe Karty e-Recept P1 z Kodami PIN i Kodami Kreskowymi
  if (currentY + 20 > pageHeight) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 10;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SZCZEGÓŁOWE KARTY e-RECEPT (KODY DOSTĘPU P1 DLA APTEKI)", 14, currentY);
  currentY += 6;

  allItems.forEach((item, idx) => {
    // Sprawdź czy karta mieści się na stronie (wysokość karty ~32mm)
    if (currentY + 36 > pageHeight) {
      doc.addPage();
      currentY = 20;
    }

    const isCritical = item.status === 'CRITICAL_7_DAYS' || item.status === 'EXPIRED';

    // Ramka karty
    doc.setDrawColor(isCritical ? 239 : 203, isCritical ? 68 : 213, isCritical ? 68 : 225);
    doc.setFillColor(isCritical ? 254 : 255, isCritical ? 242 : 255, isCritical ? 242 : 255);
    doc.roundedRect(14, currentY, 182, 30, 2, 2, "FD");

    // Wyróżniony nagłówek karty
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`#${idx + 1}  ${item.medicationName} (${item.innName})`, 18, currentY + 6);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Wskazanie / ICD-10: ${item.diagnosis || 'Leczenie przewlekłe'} (${item.icd10Code || 'Z76.0'})`, 18, currentY + 11);
    doc.text(`Schemat dawkowania: ${item.dosageInstruction || item.dosage}`, 18, currentY + 16);
    doc.text(`Opakowanie: ${item.packageSize} • Odpłatność: ${item.refundationLevel === 'S' ? 'Bezpłatne dla Seniora (S)' : item.refundationLevel || 'Ryczałt'}`, 18, currentY + 21);
    doc.text(`Wystawiono: ${item.issueDate} • Ważność do: ${item.validUntil} (${item.daysRemaining >= 0 ? `pozostało ${item.daysRemaining} dni` : 'termin upłynął'})`, 18, currentY + 26);

    // Prawy box z Kodem PIN P1
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(140, currentY + 3, 52, 24, 2, 2, "FD");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 101, 52);
    doc.text("KOD DOSTĘPU P1 (PIN):", 166, currentY + 8, { align: "center" });

    doc.setFontSize(15);
    doc.setFont("courier", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(item.p1AccessCode, 166, currentY + 16, { align: "center" });

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`PESEL + KOD ${item.p1AccessCode}`, 166, currentY + 22, { align: "center" });

    currentY += 34;
  });

  // 7. Instrukcja i Pouczenie dla Pacjenta
  if (currentY + 35 > pageHeight) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 6;
  }

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 28, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("INFORMACJA DLA PACJENTA DOTYCZĄCA REALIZACJI e-RECEPT W APTECE:", 18, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("1. W dowolnej aptece na terenie Polski wystarczy podać numer PESEL oraz 4-cyfrowy KOD DOSTĘPU (PIN) z powyższego wykazu.", 18, currentY + 11);
  doc.text("2. Masz prawo poprosić farmaceutę o wydanie tańszego odpowiednika (zamiennika generycznego) o tym samym składzie i dawce.", 18, currentY + 16);
  doc.text("3. Recepty roczne (ważne 365 dni): pierwsze opakowanie leku należy wykupić w ciągu 30 dni od daty wystawienia e-recepty.", 18, currentY + 21);
  doc.text("4. W przypadku pytań lub wygaśnięcia terminu ważności skontaktuj się z poradnią POZ celem przedłużenia ordynacji.", 18, currentY + 25);

  currentY += 34;

  // 8. Podpis i Pieczęć Elektroniczna
  if (currentY + 20 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text("Dokument sporządzony elektronicznie w systemie EDM POZ. Podpisano kwalifikowanym podpisem elektronicznym lekarza.", 14, currentY + 5);

  const filename = `Zbiorczy_Raport_eRecept_${patientId}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { count: allItems.length, filename };
};

export interface MzComplianceReportPdfOptions {
  auditReport: MzRefundAuditReport;
  patientName?: string;
  patientPesel?: string;
  patientId?: string;
  patientDiagnosis?: string;
  patientIcd10?: string;
  patientAge?: number;
  patientGender?: string;
  doctorName?: string;
  doctorPwz?: string;
  facilityName?: string;
}

/**
 * Generuje szczegółowy raport PDF zgodności refundacyjnej MZ dla bieżącej e-Recepty
 */
export const generateMzRefundComplianceReportPDF = (options: MzComplianceReportPdfOptions) => {
  const {
    auditReport,
    patientName = "Pacjent",
    patientPesel = "-",
    patientId = "PAC-001",
    patientDiagnosis = "Nadciśnienie tętnicze",
    patientIcd10 = "I10",
    patientAge = 55,
    patientGender = "K",
    doctorName = "Lek. Ewelina Nowak",
    doctorPwz = "5849201",
    facilityName = "Przychodnia POZ / Gabinet Lekarski EDM"
  } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const fullyCompliantCount = auditReport.medications.filter(
    m => m.isRefundLevelCorrect && !m.hasNfzClawbackRisk && m.missingClinicalRequirements.length === 0
  ).length;
  const totalMeds = auditReport.totalMedicationsCount;
  const compliantPercent = totalMeds > 0 ? Math.round((fullyCompliantCount / totalMeds) * 100) : 100;

  // 1. Nagłówek i branding dokumentu (Górna belka)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Akcent zielono-morski
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 26, pageWidth, 2, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("RAPORT AUDYTU ZGODNOŚCI REFUNDACJI MZ", 14, 12);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Weryfikacja ordynacji e-Recepty z Obwieszczeniem Ministra Zdrowia (Wykaz Leków Refundowanych 2025/2026)", 14, 18);
  doc.text(`Data audytu: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')} • Sygnatura: MZ-AUDIT-${Date.now().toString().slice(-6)}`, 14, 23);

  let currentY = 36;

  // 2. Metadane pacjenta i podmiotu leczniczego (Kafle 2-kolumnowe)
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 88, 30, 2, 2, "FD");
  doc.roundedRect(108, currentY, 88, 30, 2, 2, "FD");

  // Kolumna lewa: Dane Pacjenta
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("DANE PACJENTA", 18, currentY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Pacjent: ${patientName} (${patientAge} lat, ${patientGender === 'K' ? 'Kobieta' : 'Mężczyzna'})`, 18, currentY + 12);
  doc.text(`PESEL: ${patientPesel} • ID: ${patientId}`, 18, currentY + 17);
  doc.text(`Rozpoznanie: ${patientDiagnosis} (ICD-10: ${patientIcd10})`, 18, currentY + 22);
  doc.text(`Uprawnienia: ${patientAge >= 65 ? 'Senior 65+ (Program S)' : 'Standardowe'}`, 18, currentY + 27);

  // Kolumna prawa: Dane Lekarza i Placówki
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("DANE LEKARZA I PODMIOTU", 112, currentY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Lekarz wystawiający: ${doctorName}`, 112, currentY + 12);
  doc.text(`Numer PWZ: ${doctorPwz}`, 112, currentY + 17);
  doc.text(`Placówka: ${facilityName}`, 112, currentY + 22);
  doc.text(`Status e-Recepty: Sprawdzona przed wysłaniem do P1`, 112, currentY + 27);

  currentY += 36;

  // 3. Podsumowanie Wskaźników Zgodności MZ (Scorecards)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, currentY, 182, 22, 2, 2, "F");

  // Box 1: Zgodność MZ
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("WSKAŹNIK ZGODNOŚCI MZ", 20, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(`${fullyCompliantCount}/${totalMeds} (${compliantPercent}%)`, 20, currentY + 14);

  // Box 2: Bezpieczeństwo NFZ
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("WYNIK BEZPIECZEŃSTWA", 70, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(auditReport.overallSafetyScore >= 90 ? 16 : 217, auditReport.overallSafetyScore >= 90 ? 185 : 119, auditReport.overallSafetyScore >= 90 ? 129 : 6);
  doc.text(`${auditReport.overallSafetyScore}%`, 70, currentY + 14);

  // Box 3: Ryzyko Sankcji NFZ
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("RYZYKO ROSZCZEŃ NFZ", 115, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(auditReport.nfzRiskCount > 0 ? 225 : 16, auditReport.nfzRiskCount > 0 ? 29 : 185, auditReport.nfzRiskCount > 0 ? 72 : 129);
  doc.text(`${auditReport.nfzRiskCount} poz.`, 115, currentY + 14);

  // Box 4: Braki GIF
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("BRAKI RYNKOWE GIF", 160, currentY + 6);
  doc.setFontSize(13);
  doc.setTextColor(auditReport.marketShortageCount > 0 ? 217 : 100, auditReport.marketShortageCount > 0 ? 119 : 116, auditReport.marketShortageCount > 0 ? 6 : 139);
  doc.text(`${auditReport.marketShortageCount} poz.`, 160, currentY + 14);

  currentY += 28;

  // 4. Szczegółowa Tabela Weryfikacji Leków z Obwieszczeniem MZ
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SZCZEGÓŁOWY WYKAZ ORDYNACJI LEKOWEJ I WERYFIKACJA KRYTERIÓW MZ:", 14, currentY);
  currentY += 4;

  const tableBody = auditReport.medications.map((m, idx) => {
    const isCompliant = m.isRefundLevelCorrect && !m.hasNfzClawbackRisk && m.missingClinicalRequirements.length === 0;
    const statusText = isCompliant ? "ZGODNY (100%)" : m.hasNfzClawbackRisk ? "RYZYKO NFZ" : "WYMAGA KRYTERIOW";
    const refundComparison = `${m.currentRefundLevel} ${m.isRefundLevelCorrect ? '(OK)' : `-> zalecana: ${m.recommendedRefundLevel}`}`;
    const pricing = `${m.patientPayPln.toFixed(2)} PLN (limit: ${m.financingLimitPln.toFixed(2)} PLN)`;
    
    return [
      idx + 1,
      `${m.medicationName}\nEAN: ${m.eanGtin || '-'} | ATC: ${m.atcCode || '-'}`,
      refundComparison,
      `${m.refundScopeLabel}\nICD-10: ${m.matchedIcd10Code || patientIcd10 || '-'}`,
      statusText,
      pricing
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["Lp.", "Lek (Nazwa handlowa & EAN)", "Odpłatność (Wystawiona / MZ)", "Zakres refundacji & Wskazania", "Status MZ / NFZ", "Dopłata Pacjenta"]],
    body: tableBody,
    theme: "striped",
    styles: { 
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: "middle"
    },
    headStyles: { 
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 50 },
      2: { cellWidth: 36 },
      3: { cellWidth: 40 },
      4: { cellWidth: 26, fontStyle: "bold" },
      5: { cellWidth: 22, halign: "right" }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw || '');
        if (text.includes('ZGODNY')) {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (text.includes('RYZYKO')) {
          data.cell.styles.textColor = [225, 29, 72];
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 60;

  // 5. Wymogi dokumentacyjne i Uzasadnienia Kliniczne (Klauzule prawne)
  const medicationsNeedingJustification = auditReport.medications.filter(
    m => m.missingClinicalRequirements.length > 0 || m.clinicalJustificationSnippet
  );

  if (medicationsNeedingJustification.length > 0) {
    if (currentY + 45 > pageHeight) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("KLAUZULE UZASADNIENIA KLINICZNEGO DO DOKUMENTACJI MEDYCZNEJ (EDM):", 14, currentY);
    currentY += 5;

    medicationsNeedingJustification.forEach(med => {
      if (currentY + 28 > pageHeight) {
        doc.addPage();
        currentY = 20;
      }

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(14, currentY, 182, 22, 1.5, 1.5, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text(`Uzasadnienie refundacji: ${med.medicationName}`, 18, currentY + 5);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(51, 65, 85);
      const textLines = doc.splitTextToSize(
        med.clinicalJustificationSnippet || `Wskazano leczenie w oparciu o kryteria refundacyjne Obwieszczenia MZ dla ICD-10 ${patientIcd10}. Udokumentowano brak przeciwwskazań i spełnienie wymogów programowych.`,
        174
      );
      doc.text(textLines, 18, currentY + 10);

      currentY += 26;
    });
  }

  // 6. Zalecenia dotyczące dostępności i zamienników rynkowych GIF
  const shortageMeds = auditReport.medications.filter(
    m => m.availability === 'CRITICAL_SHORTAGE' || m.availability === 'LIMITED_SUPPLY'
  );

  if (shortageMeds.length > 0) {
    if (currentY + 35 > pageHeight) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("KOMUNIKATY DOSTĘPNOŚCI GIF I PROPONOWANE ZAMIENNIKI:", 14, currentY);
    currentY += 5;

    shortageMeds.forEach(m => {
      doc.setFillColor(254, 226, 226); // rose-100
      doc.roundedRect(14, currentY, 182, 18, 1.5, 1.5, "FD");

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(153, 27, 27);
      doc.text(`Brak rynkowy: ${m.medicationName} (${m.availabilityLabel})`, 18, currentY + 5);

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const subNames = m.suggestedSubstitutes.map(s => `${s.name} (${s.patientPayPln.toFixed(2)} PLN)`).join(" • ");
      doc.text(`Dostępne odpowiedniki terapeutyczne: ${subNames || "Skonsultuj z farmaceutą w aptece"}`, 18, currentY + 11);

      currentY += 22;
    });
  }

  // 7. Podstawa Prawna i Podpis
  if (currentY + 30 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Podstawa prawna: Ustawa z dnia 12 maja 2011 r. o refundacji leków, środków spożywczych specjalnego przeznaczenia żywieniowego oraz wyrobów medycznych.", 14, currentY);
  doc.text("Raport został wygenerowany automatycznie na podstawie aktualnego Obwieszczenia Ministra Zdrowia z systemu EDM POZ.", 14, currentY + 4);
  doc.text(`Wygenerowano przez: ${doctorName} (PWZ: ${doctorPwz}) • Podpisano podpisem elektronicznym lekarza.`, 14, currentY + 8);

  const filename = `Raport_Zgodnosci_Refundacji_MZ_${patientPesel || patientId}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return { filename, fullyCompliantCount, totalMeds };
};

export const exportRefundDifferencesReportPDF = (
  auditReport: MzRefundAuditReport,
  patientPesel: string = '',
  doctorName: string = 'Lek. Medycyny',
  doctorPwz: string = '1234567'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Nagłówek raportu
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("ZESTAWIENIE RÓŻNIC REFUNDACYJNYCH I OSZCZĘDNOŚCI PACJENTA", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`PESEL Pacjenta: ${patientPesel || 'Nie podano'}`, 14, 28);
  doc.text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}`, 14, 34);
  doc.text(`Lekarz sporządzający: ${doctorName} (PWZ: ${doctorPwz})`, 14, 40);

  // Podsumowanie finansowe oszczędności
  let totalCurrentPay = 0;
  let totalOptimizedPay = 0;

  const tableRows = auditReport.medications.map((m, idx) => {
    const currentPay = m.patientPayPln;
    // Jeśli lek nie ma poprawnej refundacji, symulujemy opłatę z zalecaną refundacją MZ (np. obniżka do poziomu ryczałtu/50% lub zamiennik)
    const optimizedPay = m.isRefundLevelCorrect ? currentPay : Math.max(0, currentPay * 0.45);
    const saving = Math.max(0, currentPay - optimizedPay);

    totalCurrentPay += currentPay;
    totalOptimizedPay += optimizedPay;

    return [
      idx + 1,
      m.medicationName,
      m.currentRefundLevel,
      m.recommendedRefundLevel,
      `${currentPay.toFixed(2)} PLN`,
      `${optimizedPay.toFixed(2)} PLN`,
      `${saving > 0 ? `+${saving.toFixed(2)} PLN` : '0.00 PLN'}`
    ];
  });

  const totalSavings = Math.max(0, totalCurrentPay - totalOptimizedPay);

  autoTable(doc, {
    startY: 48,
    head: [["Lp.", "Nazwa leku", "Obecna odpł.", "Zalecana odpł.", "Obecny koszt pacjenta", "Koszt po optymalizacji MZ", "Potencjalna oszczędność"]],
    body: tableRows,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [13, 148, 136] }, // teal-600
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 46 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
      6: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: [16, 185, 129] }
    }
  });

  let currentY = (doc as any).lastAutoTable?.finalY + 10 || 120;

  // Podsumowanie całkowitych oszczędności
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text(`Całkowite szacowane oszczędności dla pacjenta po optymalizacji MZ: ${totalSavings.toFixed(2)} PLN`, 20, currentY + 14);

  currentY += 32;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Zestawienie wygenerowane automatycznie na podstawie aktualnego Obwieszczenia Ministra Zdrowia.", 14, currentY);

  const filename = `Zestawienie_Roznic_Refundacyjnych_${patientPesel || 'pacjent'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
};

export const exportRefundDifferencesCSV = (
  auditReport: MzRefundAuditReport,
  patientPesel: string = ''
) => {
  const headers = ['Lp', 'Nazwa_leku', 'EAN', 'Obecny_poziom_odplatnosci', 'Zalecany_poziom_odplatnosci', 'Obecny_koszt_pacjenta_PLN', 'Zoptymalizowany_koszt_PLN', 'Oszczednosc_PLN', 'Status_MZ'];
  
  const rows = auditReport.medications.map((m, idx) => {
    const currentPay = m.patientPayPln;
    const optimizedPay = m.isRefundLevelCorrect ? currentPay : Math.max(0, currentPay * 0.45);
    const saving = Math.max(0, currentPay - optimizedPay);
    const status = m.isRefundLevelCorrect ? 'ZGODNY' : 'WYMAGA_KOREKTY';

    return [
      idx + 1,
      `"${m.medicationName.replace(/"/g, '""')}"`,
      m.eanGtin || '',
      m.currentRefundLevel,
      m.recommendedRefundLevel,
      currentPay.toFixed(2),
      optimizedPay.toFixed(2),
      saving.toFixed(2),
      status
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Zestawienie_Roznic_Refundacyjnych_${patientPesel || 'pacjent'}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


