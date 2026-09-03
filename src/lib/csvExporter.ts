import { AnalysisRecord } from "../services/LocalPatientDB";

export interface ExportVisitParams {
  patientId: string;
  timestamp?: string;
  patientInfo?: any;
  vitals?: any;
  symptoms?: string;
  medications?: string;
  analysis: any;
}

const CSV_HEADERS = [
  "Data i godzina wizyty",
  "ID Pacjenta",
  "Pacjent (Imię i Nazwisko)",
  "PESEL",
  "Wiek",
  "Płeć",
  "Waga (kg)",
  "Wzrost (cm)",
  "BMI",
  "Alergie",
  "Ciśnienie tętnicze (RR)",
  "Tętno (BPM)",
  "Temperatura (°C)",
  "Zgłoszone objawy",
  "Przyjmowane leki",
  "Diagnoza kliniczna",
  "Kod ICD-10",
  "Podsumowanie wizyty",
  "Zalecenia i Działania",
  "Sugerowane badania",
  "Ocena farmakoterapii (Status)",
  "Podsumowanie farmakoterapii",
  "Wykryte ryzyka lekowe",
  "Treść wygenerowanej notatki medycznej"
];

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mapRecordToRow(params: ExportVisitParams): string[] {
  const analysisData = params.analysis?.data || params.analysis || {};
  const decision = analysisData.decision || {};
  const medAnalysis = analysisData.medAnalysis || {};
  const note = analysisData.note || {};

  const patientName = params.patientInfo?.imie && params.patientInfo?.nazwisko
    ? `${params.patientInfo.imie} ${params.patientInfo.nazwisko}`
    : (params.patientInfo?.name || "Brak danych");

  const allergies = params.patientInfo?.allergies ||
    (Array.isArray(params.vitals?.allergies) ? params.vitals.allergies.join(", ") : "");

  const suggestedTests = Array.isArray(decision.suggestedTests)
    ? decision.suggestedTests.join(", ")
    : "";

  const medSafety = medAnalysis.isSafe !== undefined
    ? (medAnalysis.isSafe ? "Bezpieczne" : "Wykryto ryzyko")
    : "";

  const medRisks = Array.isArray(medAnalysis.risks) && medAnalysis.risks.length > 0
    ? medAnalysis.risks.map((r: any) => `[${r.type || "RYZYKO"} / ${r.severity || "INFO"}]: ${r.message || ""}`).join(" | ")
    : "Brak wykrytych ryzyk";

  return [
    params.timestamp ? new Date(params.timestamp).toLocaleString("pl-PL") : new Date().toLocaleString("pl-PL"),
    params.patientId || "",
    patientName,
    params.patientInfo?.pesel || "",
    params.patientInfo?.age ?? "",
    params.patientInfo?.gender ?? "",
    params.patientInfo?.weight ?? "",
    params.patientInfo?.height ?? "",
    params.patientInfo?.bmi ?? "",
    allergies,
    params.vitals?.bp || "",
    params.vitals?.pulse !== undefined && params.vitals?.pulse !== null ? String(params.vitals.pulse) : "",
    params.vitals?.temp !== undefined && params.vitals?.temp !== null ? String(params.vitals.temp) : "",
    params.symptoms || "",
    params.medications || "",
    decision.diagnosis || "",
    decision.icd10Code || "",
    decision.podsumowanie_wizyty || "",
    decision.action || "",
    suggestedTests,
    medSafety,
    medAnalysis.summary || "",
    medRisks,
    note.content || ""
  ];
}

/**
 * Generates CSV string for a single patient visit.
 */
export function generateSingleVisitCSV(params: ExportVisitParams): string {
  const headerLine = CSV_HEADERS.map(escapeCSV).join(";");
  const rowLine = mapRecordToRow(params).map(escapeCSV).join(";");
  return `${headerLine}\r\n${rowLine}\r\n`;
}

/**
 * Generates CSV string for full patient visits history.
 */
export function generateHistoryCSV(history: AnalysisRecord[], patientId: string): string {
  const headerLine = CSV_HEADERS.map(escapeCSV).join(";");
  const rows = history.map(record => {
    return mapRecordToRow({
      patientId: record.patientId || patientId,
      timestamp: record.timestamp,
      patientInfo: record.patientInfo,
      vitals: record.vitals,
      symptoms: record.symptoms,
      medications: record.medications,
      analysis: record.analysis
    }).map(escapeCSV).join(";");
  });

  return `${headerLine}\r\n${rows.join("\r\n")}\r\n`;
}

/**
 * Downloads a CSV file in browser using UTF-8 with BOM for Excel/external EHR compatibility.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // UTF-8 BOM (\uFEFF) ensures Polish characters (ą, ć, ę, etc.) display correctly in MS Excel and external systems
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Direct export and download of a single visit.
 */
export function exportAndDownloadSingleVisit(params: ExportVisitParams): void {
  const csv = generateSingleVisitCSV(params);
  const dateStr = (params.timestamp ? new Date(params.timestamp) : new Date())
    .toISOString()
    .split("T")[0];
  const filename = `Wizyta_${params.patientId}_${dateStr}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Direct export and download of patient visit history.
 */
export function exportAndDownloadHistory(history: AnalysisRecord[], patientId: string): void {
  const csv = generateHistoryCSV(history, patientId);
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Historia_Wizyt_${patientId}_${dateStr}.csv`;
  downloadCSV(csv, filename);
}
