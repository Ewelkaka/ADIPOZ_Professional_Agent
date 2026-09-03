import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface EReceptaMedication {
  name: string;
  dosage: string;
  quantity: string;
}

export interface EReceptaData {
  patientName: string;
  patientPesel: string;
  doctorName: string;
  doctorPzw: string;
  date: string;
  medications: EReceptaMedication[];
  accessCode: string; // Kod dostępu (4 cyfry)
}

export class EReceptaService {
  /**
   * Generates a JSON payload mimicking the Polish P1 e-Health standard.
   * This is a simplified representation of an HL7 CDA document used in P1.
   */
  static generateP1Json(data: EReceptaData): string {
    const payload = {
      ClinicalDocument: {
        typeId: { root: "2.16.840.1.113883.1.3", extension: "POCD_HD000040" },
        id: { root: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) },
        code: { code: "57833-6", codeSystem: "2.16.840.1.113883.6.1", displayName: "Prescription for medication" },
        title: "Recepta elektroniczna",
        effectiveTime: { value: data.date.replace(/[-T:\.Z]/g, '').substring(0, 14) },
        recordTarget: {
          patientRole: {
            id: { root: "2.16.840.1.113883.3.4424.1.1.616", extension: data.patientPesel },
            patient: {
              name: { given: data.patientName.split(' ')[0], family: data.patientName.split(' ').slice(1).join(' ') }
            }
          }
        },
        author: {
          assignedAuthor: {
            id: { root: "2.16.840.1.113883.3.4424.1.6.2", extension: data.doctorPzw },
            assignedPerson: {
              name: { given: data.doctorName.split(' ')[0], family: data.doctorName.split(' ').slice(1).join(' ') }
            }
          }
        },
        component: {
          structuredBody: {
            component: data.medications.map(med => ({
              section: {
                entry: {
                  substanceAdministration: {
                    consumable: {
                      manufacturedProduct: {
                        manufacturedLabeledDrug: {
                          name: med.name
                        }
                      }
                    },
                    doseQuantity: { value: med.dosage },
                    supply: { quantity: { value: med.quantity } }
                  }
                }
              }
            }))
          }
        }
      }
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Generates a PDF representing the "Wydruk informacyjny e-Recepty".
   */
  static generatePDF(data: EReceptaData): jsPDF {
    const doc = new jsPDF();

    // Fonts & styling
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Wydruk informacyjny e-Recepty", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Header Info
    doc.text(`Data wystawienia: ${data.date}`, 14, 35);
    doc.text(`Kod dostepu:`, 150, 35);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(data.accessCode, 150, 42);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Patient
    doc.text("Pacjent:", 14, 50);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.patientName}, PESEL: ${data.patientPesel}`, 14, 55);

    // Doctor
    doc.setFont("helvetica", "normal");
    doc.text("Lekarz wystawiajacy:", 14, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.doctorName}, NPWZ: ${data.doctorPzw}`, 14, 70);

    // Medications Table
    const tableData = data.medications.map((med, index) => [
      (index + 1).toString(),
      med.name,
      med.quantity,
      med.dosage
    ]);

    (doc as any).autoTable({
      startY: 80,
      head: [['Lp.', 'Lek / Postac / Dawka', 'Ilosc', 'Dawkowanie']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // Emerald color
      styles: { fontSize: 10, cellPadding: 3 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Dokument generowany automatycznie (symulacja systemu P1).", 105, finalY + 15, { align: "center" });
    
    // Barcode mock (just a rectangle for visual representation)
    doc.rect(14, finalY + 25, 180, 15);
    doc.text("|| |||| | ||||| ||| || ||| || ||| |||| | ||||| |||", 105, finalY + 35, { align: "center" });

    return doc;
  }

  /**
   * Triggers download of the JSON file
   */
  static downloadJSON(data: EReceptaData) {
    const json = this.generateP1Json(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eRecepta_P1_${data.patientPesel}_${data.date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Triggers download of the PDF file
   */
  static downloadPDF(data: EReceptaData) {
    const doc = this.generatePDF(data);
    doc.save(`Wydruk_Informacyjny_eRecepta_${data.patientPesel}.pdf`);
  }
}
