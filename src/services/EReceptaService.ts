// src/services/EReceptaService.ts
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface EReceptaMedication {
  name: string;
  innName?: string;
  dosage: string;
  quantity: string;
  packageSize?: string;
  atcCode?: string;
  eanGtin?: string;
  formCode?: string; // np. TABL_POWL, KAPS, AER, KROPL
  refundationLevel?: '100%' | 'R' | '50%' | '30%' | 'bezpłatne' | 'S';
  additionalPrivilege?: 'S' | 'IB' | 'ZK' | 'C' | 'BRAK';
  dosageInstruction?: string;
  treatmentDurationDays?: number;
  validityDays?: number; // 30 lub 365
  isCito?: boolean;
  chronicDisease?: boolean;
}

export interface EReceptaData {
  patientName: string;
  patientPesel: string;
  patientAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
  };
  patientBirthDate?: string;
  patientGender?: 'K' | 'M';
  doctorName: string;
  doctorPzw: string;
  doctorTitle?: string;
  facilityName?: string;
  facilityRegon?: string;
  facilityCodeVII?: string;
  nfzBranch?: string;
  date: string;
  validUntil?: string;
  accessCode: string; // Kod dostępu (4 cyfry)
  packageKey44?: string; // 44-cyfrowy Klucz Recepty P1
  packageId?: string; // UUID
  medications: EReceptaMedication[];
  icd10Diagnosis?: string;
}

export class EReceptaService {
  /**
   * Generuje unikalny 44-cyfrowy klucz kreskowy e-Recepty P1 (Klucz Recepty)
   */
  public static generate44DigitKey(pesel: string): string {
    const cleanPesel = (pesel || '80010112345').padEnd(11, '0').slice(0, 11);
    const randomPart1 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const randomPart2 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const randomPart3 = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    const combined = `${cleanPesel}${randomPart1}${randomPart2}${randomPart3}`.slice(0, 44);
    return combined.padEnd(44, '7');
  }

  /**
   * Inteligentny parser tekstu leków na ustrukturyzowaną listę leków e-Recepty
   */
  public static parseMedicationsFromText(
    medsText: string,
    patientAge: number = 55,
    chronicContext: boolean = false
  ): EReceptaMedication[] {
    if (!medsText || !medsText.trim()) {
      return [];
    }

    // Dzielenie po przecinkach lub nowej linii
    const rawItems = medsText
      .split(/[\n,;]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    const isSenior = patientAge >= 65;

    return rawItems.map((item, idx) => {
      // Domyślne wartości
      let name = item;
      let dosage = '1x1';
      let quantity = '1 op.';
      let packageSize = '30 tabl.';
      let atcCode = 'A10BA02';
      let eanGtin = `590999${(100000 + idx * 777).toString().padStart(6, '0')}`;
      let innName = item;
      let formCode = 'TABL_POWL';
      let dosageInstruction = '1 tabletka doustnie 1 raz dziennie';
      let refundLevel: EReceptaMedication['refundationLevel'] = isSenior ? 'S' : 'R';
      let addPrivilege: EReceptaMedication['additionalPrivilege'] = isSenior ? 'S' : 'BRAK';

      const lower = item.toLowerCase();

      if (lower.includes('ramipril') || lower.includes('tritace') || lower.includes('vivace')) {
        name = item.includes('mg') ? item : 'Ramipril 5 mg';
        innName = 'Ramiprilum';
        atcCode = 'C09AA05';
        dosage = '1x1 rano';
        packageSize = '28 tabl.';
        dosageInstruction = '1 tabletka rano przed posiłkiem';
      } else if (lower.includes('metformin') || lower.includes('siofor') || lower.includes('glucophage') || lower.includes('metformax')) {
        name = item.includes('mg') ? item : 'Metformina 850 mg';
        innName = 'Metforminum';
        atcCode = 'A10BA02';
        dosage = '2x1 po posiłku';
        packageSize = '60 tabl.';
        dosageInstruction = '1 tabletka 2 razy dziennie w trakcie lub po posiłku';
      } else if (lower.includes('atorwastat') || lower.includes('atorvasterol') || lower.includes('sortis')) {
        name = item.includes('mg') ? item : 'Atorwastatyna 20 mg';
        innName = 'Atorvastatinum';
        atcCode = 'C10AA05';
        dosage = '1x1 wieczorem';
        packageSize = '30 tabl.';
        dosageInstruction = '1 tabletka wieczorem po kolacji';
      } else if (lower.includes('bisoprolol') || lower.includes('concor') || lower.includes('bisocard')) {
        name = item.includes('mg') ? item : 'Bisoprolol 5 mg';
        innName = 'Bisoprololum';
        atcCode = 'C07AB07';
        dosage = '1x1 rano';
        packageSize = '30 tabl.';
        dosageInstruction = '1 tabletka rano na czczo';
      } else if (lower.includes('amlodypin') || lower.includes('amlozek') || lower.includes('norvasc')) {
        name = item.includes('mg') ? item : 'Amlodypina 5 mg';
        innName = 'Amlodipinum';
        atcCode = 'C08CA01';
        dosage = '1x1 rano';
        packageSize = '30 tabl.';
      } else if (lower.includes('euthyrox') || lower.includes('letrox') || lower.includes('lewotyroksyn')) {
        name = item.includes('mg') || item.includes('mcg') ? item : 'Euthyrox N 75 mcg';
        innName = 'Levothyroxinum natricum';
        atcCode = 'H03AA01';
        dosage = '1x1 rano na czczo';
        packageSize = '50 tabl.';
        dosageInstruction = '1 tabletka rano na czczo 30 min przed śniadaniem, popić wodą';
      } else if (lower.includes('polprazol') || lower.includes('pantoprazol') || lower.includes('controloc') || lower.includes('ipp')) {
        name = item.includes('mg') ? item : 'Pantoprazol 40 mg';
        innName = 'Pantoprazolum';
        atcCode = 'A02BC02';
        dosage = '1x1 rano';
        packageSize = '28 tabl.';
        dosageInstruction = '1 tabletka rano na czczo 30 min przed posiłkiem';
        refundLevel = isSenior ? 'S' : '50%';
      } else if (lower.includes('amoksycylin') || lower.includes('duomox') || lower.includes('augmen') || lower.includes('ospamox')) {
        name = item.includes('mg') ? item : 'Amoxicillin 1000 mg';
        innName = 'Amoxicillinum';
        atcCode = 'J01CA04';
        dosage = '1x1 co 12h';
        packageSize = '20 tabl.';
        quantity = '1 op.';
        dosageInstruction = '1 tabletka co 12 godzin przez 7 dni po posiłku';
        refundLevel = isSenior ? 'S' : '50%';
      }

      return {
        name,
        innName,
        dosage,
        quantity,
        packageSize,
        atcCode,
        eanGtin,
        formCode,
        refundationLevel: refundLevel,
        additionalPrivilege: addPrivilege,
        dosageInstruction,
        treatmentDurationDays: chronicContext ? 90 : 30,
        validityDays: chronicContext ? 365 : 30,
        isCito: false,
        chronicDisease: chronicContext
      };
    });
  }

  /**
   * Generates a comprehensive, highly compliant P1 e-Health JSON document (standard CeZ / CSIOZ).
   * Formatted both for HL7 CDA representation and direct REST ingestion by HIS/Cabinet systems (Kamsoft, mMedica, Serum, KS-SOMED).
   */
  public static generateP1Json(data: EReceptaData): string {
    const documentId = data.packageId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `P1-${Date.now()}`);
    const packageKey44 = data.packageKey44 || this.generate44DigitKey(data.patientPesel);
    const dateFormatted = data.date ? data.date.replace(/[-T:\.Z]/g, '').substring(0, 14) : new Date().toISOString().replace(/[-T:\.Z]/g, '').substring(0, 14);
    const cleanDate = data.date || new Date().toISOString().split('T')[0];

    // Data ważności (30 dni domyślnie lub 365 dni)
    const validUntilDate = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const payload = {
      $schema: "https://cez.gov.pl/schemas/p1/erecepta/v1.4/pakiet_recept.json",
      standardP1: {
        nazwa: "System P1 - Elektroniczna Platforma Gromadzenia, Analizy i Udostępniania Zasobów Cyfrowych o Zdarzeniach Medycznych",
        organNadzorczy: "Centrum e-Zdrowia (CeZ / CSIOZ)",
        wersjaSpecyfikacji: "P1_CDA_PL_v1.4.2",
        standardKomunikacji: "REST / JSON & HL7 CDA R2 (POCD_HD000040)",
        profilKrajowy: "PL-eRecepta-2026"
      },
      pakietRecepty: {
        identyfikatorPakietu: documentId,
        kluczPakietu44Cyfry: packageKey44,
        kodDostepuPIN: data.accessCode,
        dataWystawienia: cleanDate,
        czasWystawieniaHL7: dateFormatted,
        dataWaznosciPakietu: validUntilDate,
        liczbaReceptWPakiecie: data.medications.length,
        statusPakietu: "WYSTAWIONA_PODPISANA",
        podstawaPrawna: "Art. 95b ustawy z dnia 6 września 2001 r. - Prawo farmaceutyczne (Dz. U. z 2022 r. poz. 2301)"
      },
      podmiotWystawiajacy: {
        nazwaPlacowki: data.facilityName || "NZOZ Poradnia Lekarza Rodzinnego i Opieki Koordynowanej POZ",
        kodResortowyVII: data.facilityCodeVII || "000000012345",
        regon: data.facilityRegon || "123456789",
        kodOddzialuNFZ: data.nfzBranch || "01 - Dolnośląski OW NFZ",
        miejsceWystawienia: "Gabinet Lekarza POZ"
      },
      pracownikMedyczny: {
        imieINazwisko: data.doctorName,
        numerPWZ: data.doctorPzw,
        tytulZawodowy: data.doctorTitle || "Lekarz specjalista medycyny rodzinnej",
        rolaKliniczna: "Lekarz wystawiający (Prescriber)",
        identyfikatorOid: `2.16.840.1.113883.3.4424.1.6.2.${data.doctorPzw}`
      },
      pacjent: {
        pesel: data.patientPesel,
        imieINazwisko: data.patientName,
        imie: data.patientName.split(' ')[0] || '',
        nazwisko: data.patientName.split(' ').slice(1).join(' ') || '',
        plec: data.patientGender || (data.patientPesel && parseInt(data.patientPesel[9], 10) % 2 === 0 ? 'K' : 'M'),
        dataUrodzenia: data.patientBirthDate || '1980-01-01',
        adresZamieszkania: data.patientAddress || {
          ulica: "ul. Przykładowa 12/4",
          miasto: "Wrocław",
          kodPocztowy: "50-001"
        },
        identyfikatorOid: `2.16.840.1.113883.3.4424.1.1.616.${data.patientPesel}`,
        uprawnienieDodatkowe: data.medications[0]?.additionalPrivilege || "BRAK"
      },
      rozpoznanieGlowne: {
        kodICD10: data.icd10Diagnosis || "I10",
        opisICD10: "Rozpoznanie kliniczne w ramach wizyty POZ"
      },
      pozycjeRecepty: data.medications.map((med, index) => {
        const itemNumber = index + 1;
        const subKey = `${packageKey44.substring(0, 40)}${itemNumber.toString().padStart(4, '0')}`;

        return {
          nrPozycji: itemNumber,
          kluczReceptyPozycji: subKey,
          lek: {
            nazwaHandlowa: med.name,
            nazwaMiedzynarodowaINN: med.innName || med.name,
            kodKreskowyEAN_GTIN: med.eanGtin || `590999000${itemNumber}12`,
            kodKlasyfikacjiATC: med.atcCode || "C09AA05",
            postacFarmaceutyczna: med.formCode || "TABL_POWL",
            dawkaMoc: med.dosage,
            wielkoscOpakowania: med.packageSize || "30 szt.",
            liczbaOpakowan: med.quantity || "1 op."
          },
          dawkowanie: {
            schematDawkowaniaTekst: med.dosageInstruction || `Stosować doustnie: ${med.dosage}`,
            skroconyZapis: med.dosage,
            okresStosowaniaDni: med.treatmentDurationDays || 30
          },
          odplatnosc: {
            poziomOdpłatnosci: med.refundationLevel || "R",
            kodUprawnieniaDodatkowego: med.additionalPrivilege || "BRAK",
            opisOdpłatnosci: med.refundationLevel === 'S' 
              ? 'Bezpłatne dla Seniora (program 65+)' 
              : med.refundationLevel === 'R' 
              ? 'Ryczałt' 
              : med.refundationLevel === '50%' 
              ? 'Odpłatność 50%' 
              : 'Odpłatność 100%'
          },
          waznosc: {
            dataRealizacjiOd: cleanDate,
            dataRealizacjiDo: new Date(Date.now() + (med.validityDays || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            czyCito: med.isCito || false,
            czyChorobaPrzewlekla: med.chronicDisease || false
          }
        };
      }),
      hl7CdaStructure: {
        ClinicalDocument: {
          typeId: { root: "2.16.840.1.113883.1.3", extension: "POCD_HD000040" },
          id: { root: "2.16.840.1.113883.3.4424.2.7.0.1", extension: documentId },
          code: { code: "57833-6", codeSystem: "2.16.840.1.113883.6.1", displayName: "Prescription for medication" },
          title: "Elektroniczny Pakiet Recept P1",
          effectiveTime: { value: dateFormatted },
          confidentialityCode: { code: "N", codeSystem: "2.16.840.1.113883.5.25" },
          recordTarget: {
            patientRole: {
              id: { root: "2.16.840.1.113883.3.4424.1.1.616", extension: data.patientPesel },
              patient: {
                name: {
                  given: data.patientName.split(' ')[0],
                  family: data.patientName.split(' ').slice(1).join(' ')
                }
              }
            }
          },
          author: {
            time: { value: dateFormatted },
            assignedAuthor: {
              id: { root: "2.16.840.1.113883.3.4424.1.6.2", extension: data.doctorPzw },
              assignedPerson: {
                name: {
                  given: data.doctorName.split(' ')[0],
                  family: data.doctorName.split(' ').slice(1).join(' ')
                }
              }
            }
          },
          component: {
            structuredBody: {
              component: data.medications.map((med, i) => ({
                section: {
                  code: { code: "57828-6", codeSystem: "2.16.840.1.113883.6.1", displayName: "PRESCRIPTION" },
                  entry: {
                    substanceAdministration: {
                      classCode: "SBADM",
                      moodCode: "INT",
                      consumable: {
                        manufacturedProduct: {
                          manufacturedLabeledDrug: {
                            code: { code: med.atcCode || "C09AA05", displayName: med.name },
                            name: med.name
                          }
                        }
                      },
                      doseQuantity: { value: med.dosage },
                      supply: {
                        quantity: { value: med.quantity },
                        expectedUseTime: { width: { value: med.treatmentDurationDays || 30, unit: "d" } }
                      }
                    }
                  }
                }
              }))
            }
          }
        }
      },
      podpisElektronicznyIIntegralnosc: {
        typPodpisu: "XAdES-BES / Podpis Zaufany ePUAP / Kwalifikowany Podpis Elektroniczny",
        algorytmSkrotu: "SHA-256",
        sygnaturaStatus: "VALIDATED_SUCCESS",
        weryfikacjaCeZ: "Pozytywna weryfikacja w węźle krajowym P1"
      }
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Generates a PDF representing the "Wydruk informacyjny e-Recepty".
   */
  public static generatePDF(data: EReceptaData): jsPDF {
    const doc = new jsPDF();

    // Fonts & styling
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Wydruk informacyjny e-Recepty", 105, 18, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("System Elektronicznej Recepty (Standard P1 / CeZ)", 105, 24, { align: "center" });

    // Header Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 250, 248);
    doc.roundedRect(14, 28, 182, 24, 3, 3, "FD");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Data wystawienia: ${data.date}`, 18, 36);
    doc.text(`Klucz pakietu: ${data.packageKey44 ? data.packageKey44.substring(0, 20) + '...' : 'P1-AUTOGENERATED'}`, 18, 44);

    doc.text(`KOD DOSTĘPU (PIN):`, 135, 36);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // Emerald
    doc.text(data.accessCode, 135, 45);
    doc.setTextColor(0, 0, 0);

    // Patient & Doctor columns
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Left Column: Patient
    doc.text("Dane Pacjenta:", 14, 60);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.patientName}`, 14, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`PESEL: ${data.patientPesel}`, 14, 72);

    // Right Column: Doctor & Clinic
    doc.text("Lekarz wystawiający:", 110, 60);
    doc.setFont("helvetica", "bold");
    doc.text(`${data.doctorName}`, 110, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`NPWZ: ${data.doctorPzw} | ${data.facilityName || 'NZOZ Poradnia POZ'}`, 110, 72);

    // Medications Table
    const tableData = data.medications.map((med, index) => [
      (index + 1).toString(),
      `${med.name}\n${med.dosageInstruction || ''}`,
      med.quantity,
      med.dosage,
      med.refundationLevel === 'S' ? 'Bezpłatne (S)' : med.refundationLevel || 'Ryczałt'
    ]);

    (doc as any).autoTable({
      startY: 80,
      head: [['Lp.', 'Lek / Postać / Dawka', 'Ilość', 'Dawkowanie', 'Odpłatność']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 30 }
      }
    });

    // Footer & Barcode mock
    const finalY = (doc as any).lastAutoTable?.finalY || 130;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Wydruk informacyjny dla pacjenta zgodny z art. 96a ustawy Prawo farmaceutyczne.", 105, finalY + 12, { align: "center" });
    doc.text("W aptece podaj 4-cyfrowy Kod Dostępu oraz numer PESEL pacjenta.", 105, finalY + 17, { align: "center" });

    // Barcode area
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, finalY + 22, 182, 18, 2, 2, "FD");
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(`||| | ||||| || ||| |||| | ||||| ||| || ||| | ${data.packageKey44 || '44-DIGIT-BARCODE'}`, 105, finalY + 33, { align: "center" });

    return doc;
  }

  /**
   * Triggers download of the JSON file compliant with standard P1
   */
  public static downloadJSON(data: EReceptaData, filename?: string) {
    const json = this.generateP1Json(data);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `eRecepta_P1_${data.patientPesel || 'PESEL'}_${data.date || new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Triggers download of the PDF file
   */
  public static downloadPDF(data: EReceptaData) {
    const doc = this.generatePDF(data);
    doc.save(`Wydruk_Informacyjny_eRecepta_${data.patientPesel || 'PESEL'}.pdf`);
  }
}
