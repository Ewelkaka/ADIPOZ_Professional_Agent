import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePatientReportPDF = (analysis: any, patientId: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
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
  doc.text(analysis.data.decision.podsumowanie_wizyty || "Brak danych", 14, 58, { maxWidth: 180 });

  // Analiza leków
  doc.setFontSize(14);
  doc.text("Analiza Farmakoterapii", 14, 80);
  doc.setFontSize(10);
  doc.text(analysis.data.medAnalysis.summary || "Brak danych", 14, 88, { maxWidth: 180 });

  if (analysis.data.medAnalysis.risks.length > 0) {
    const risks = analysis.data.medAnalysis.risks.map((r: any) => [r.type, r.severity, r.message]);
    autoTable(doc, {
      startY: 100,
      head: [['Typ', 'Waga', 'Opis']],
      body: risks,
    });
  }

  // Zalecenia / Działania
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(14);
  doc.text("Zalecenia i Działania", 14, finalY + 15);
  doc.setFontSize(10);
  doc.text(`Diagnoza: ${analysis.data.decision.diagnosis}`, 14, finalY + 23);
  doc.text(`Działanie: ${analysis.data.decision.action}`, 14, finalY + 30);

  if (analysis.data.decision.suggestedTests.length > 0) {
    doc.text("Sugerowane badania:", 14, finalY + 40);
    analysis.data.decision.suggestedTests.forEach((test: string, i: number) => {
      doc.text(`- ${test}`, 14, finalY + 47 + (i * 7));
    });
  }

  doc.save(`Raport_Pacjenta_${patientId}.pdf`);
};
