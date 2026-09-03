import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
