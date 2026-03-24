import { ICD10_CODES } from "../constants";

export interface SovereignAnalysis {
  podsumowanie_wizyty: string;
  diagnosis: string;
  mappedSymptoms: string[];
  mapped_symptoms: string[];
  icd10Code: string;
  kody_rozliczeniowe: {
    "ICD-10": string[];
    "ICD-9": string[];
    "Uzasadnienie": string;
  };
  action: string;
  proponowane_kroki: string[];
  suggestedTests: string[];
  alerts: string[];
  confidence: number;
  explanation: string;
  chronicDiseaseManagement?: string;
  differential_diagnoses?: { diagnosis: string; explanation: string; probability: number }[];
  podsumowanie_leczenia: string;
  gotowe_teksty: {
    do_eWUS: string;
    do_e_recepty: string;
    skierowanie: string;
    dla_pacjenta: string;
  };
  podsumowanie_dla_pacjenta: {
    wyjasnienie: string;
    pilnosc_badan: string;
    zalecenia: string[];
  };
  opieka_koordynowana: {
    sciezka: string;
    uzasadnienie: string;
    badania_powierzone: string[];
    ipom: string;
  };
  legal_compliance: {
    czerwone_flagi: string[];
    zgoda_i_pouczenie: string;
    ryzyko_bledu: number;
  };
  care_gaps: string[];
  disclaimer: string;
}

export class SovereignEngine {
  async analyze(symptoms: string, medications: string, patientInfo: any = {}): Promise<SovereignAnalysis> {
    const lowerSymptoms = symptoms.toLowerCase();
    const lowerMeds = medications.toLowerCase();
    const age = patientInfo.age ? parseInt(patientInfo.age) : null;
    const weight = patientInfo.weight ? parseFloat(patientInfo.weight) : null;
    const bmi = patientInfo.bmi ? parseFloat(patientInfo.bmi) : null;

    // Default response
    let analysis: SovereignAnalysis = {
      podsumowanie_wizyty: `Przeprowadzono analizę lokalną w trybie suwerennym dla pacjenta (${patientInfo.gender || 'płeć nieznana'}, ${patientInfo.age || '?'} lat). System zidentyfikował ogólne objawy wymagające dalszej obserwacji.`,
      diagnosis: "Diagnostyka w toku (Tryb Suwerenny)",
      mappedSymptoms: this.extractSymptoms(lowerSymptoms),
      mapped_symptoms: this.extractSymptoms(lowerSymptoms),
      icd10Code: "R69",
      kody_rozliczeniowe: {
        "ICD-10": ["R69"],
        "ICD-9": ["89.00"],
        "Uzasadnienie": "Porada lekarska w trybie suwerennym."
      },
      action: "Obserwacja i ewentualna konsultacja specjalistyczna",
      proponowane_kroki: ["Obserwacja stanu zdrowia", "Pomiary temperatury"],
      suggestedTests: ["Morfologia krwi", "Badanie ogólne moczu"],
      alerts: [],
      confidence: 0.7,
      explanation: `Analiza wykonana przez lokalny silnik regułowy AdiPOZ. Profil pacjenta: ${patientInfo.age || '?'} lat, ${patientInfo.weight || '?'} kg. Brak połączenia z chmurą obliczeniową zapewnia 100% prywatności danych.`,
      differential_diagnoses: [
        { diagnosis: "Diagnostyka w toku", explanation: "Analiza lokalna w toku.", probability: 100 }
      ],
      podsumowanie_leczenia: "Leczenie objawowe zgodnie z aktualnym stanem wiedzy.",
      gotowe_teksty: {
        do_eWUS: "Pacjent uprawniony (weryfikacja lokalna)",
        do_e_recepty: "Leki objawowe",
        skierowanie: "Brak (tryb lokalny)",
        dla_pacjenta: "Proszę odpoczywać i pić dużo płynów."
      },
      podsumowanie_dla_pacjenta: {
        wyjasnienie: "Twoje objawy wymagają obserwacji. System AdiPOZ działa w trybie lokalnym dla Twojej prywatności.",
        pilnosc_badan: "Standardowa",
        zalecenia: ["Odpoczynek", "Nawadnianie"]
      },
      opieka_koordynowana: {
        sciezka: "brak",
        uzasadnienie: "Brak wskazań do opieki koordynowanej w analizie wstępnej.",
        badania_powierzone: [],
        ipom: ""
      },
      legal_compliance: {
        czerwone_flagi: [],
        zgoda_i_pouczenie: "Pacjent poinformowany o charakterze porady AI.",
        ryzyko_bledu: 2
      },
      care_gaps: ["Brak dostępu do pełnej historii badań w trybie offline."],
      disclaimer: "To wyłącznie sugestia lokalnego silnika AdiPOZ. Ostateczna decyzja należy do lekarza."
    };

    // Rule: Elderly patient
    if (age && age >= 65) {
      analysis.podsumowanie_wizyty += " Uwaga: Pacjent geriatryczny, wymagana ostrożność przy dawkowaniu leków.";
      analysis.proponowane_kroki.push("Weryfikacja leków pod kątem kryteriów Beersa");
      analysis.care_gaps.push("Ocena ryzyka upadków u pacjenta geriatrycznego.");
      analysis.alerts.push("PACJENT GERIATRYCZNY: Zwiększone ryzyko interakcji lekowych.");
    }

    // Rule: High BMI / Obesity
    if (bmi && bmi > 30) {
      analysis.podsumowanie_wizyty += " Pacjent z otyłością, zalecana redukcja masy ciała.";
      analysis.proponowane_kroki.push("Konsultacja dietetyczna");
      analysis.suggestedTests.push("Profil lipidowy", "Glikemia na czczo");
      analysis.care_gaps.push("Brak aktualnego profilu lipidowego u pacjenta z otyłością.");
    }

    // Rule: Gender-specific screenings
    const gender = patientInfo.gender;
    if (gender === 'F' && age && age >= 50 && age <= 69) {
      analysis.care_gaps.push("Brak aktualnej mammografii (program profilaktyczny 50-69 lat).");
    }
    if (gender === 'M' && age && age >= 50) {
      analysis.proponowane_kroki.push("Badanie PSA (profilaktyka raka prostaty u mężczyzn 50+).");
    }

    // Rule: Hypertension
    if (lowerSymptoms.includes("ciśnienie") || lowerSymptoms.includes("nadciśnienie") || lowerSymptoms.includes("bp")) {
      analysis.podsumowanie_wizyty = "Pacjent zgłasza problemy z ciśnieniem tętniczym. Wymagana regularna kontrola i weryfikacja schematu leczenia.";
      analysis.diagnosis = "Nadciśnienie tętnicze samoistne";
      analysis.icd10Code = "I10";
      analysis.kody_rozliczeniowe["ICD-10"] = ["I10"];
      analysis.mappedSymptoms.push("Hypertensio arterialis");
      analysis.mapped_symptoms.push("Hypertensio arterialis");
      analysis.action = "Pomiary ciśnienia 2x dziennie, ograniczenie soli";
      analysis.proponowane_kroki = ["Pomiary ciśnienia 2x dziennie", "Ograniczenie soli"];
      analysis.suggestedTests = ["EKG spoczynkowe", "Kreatynina", "Potas"];
      analysis.chronicDiseaseManagement = "Zalecany dzienniczek samokontroli ciśnienia. Cel terapeutyczny < 140/90 mmHg.";
      analysis.opieka_koordynowana = {
        sciezka: "Kardiologiczna",
        uzasadnienie: "Rozpoznane nadciśnienie tętnicze.",
        badania_powierzone: ["EKG", "Kreatynina", "Potas"],
        ipom: "Kontrola za 4 tygodnie z dzienniczkiem."
      };
    }

    // Rule: Diabetes
    if (lowerSymptoms.includes("cukier") || lowerSymptoms.includes("glikemia") || lowerSymptoms.includes("pragnienie")) {
      analysis.podsumowanie_wizyty = "Podejrzenie zaburzeń gospodarki węglowodanowej. Konieczna diagnostyka w kierunku cukrzycy lub stanu przedcukrzycowego.";
      analysis.diagnosis = "Cukrzyca typu 2";
      analysis.icd10Code = "E11";
      analysis.kody_rozliczeniowe["ICD-10"] = ["E11"];
      analysis.mappedSymptoms.push("Hyperglycaemia");
      analysis.mapped_symptoms.push("Hyperglycaemia");
      analysis.action = "Badanie poziomu glukozy na czczo";
      analysis.proponowane_kroki = ["Badanie poziomu glukozy na czczo", "HbA1c"];
      analysis.suggestedTests = ["HbA1c", "Profil lipidowy"];
      analysis.chronicDiseaseManagement = "Edukacja dietetyczna, kontrola masy ciała.";
      analysis.opieka_koordynowana = {
        sciezka: "Diabetologiczna",
        uzasadnienie: "Podejrzenie cukrzycy typu 2.",
        badania_powierzone: ["HbA1c", "Profil lipidowy", "Albuminuria"],
        ipom: "Konsultacja dietetyczna, włączenie Metforminy po potwierdzeniu."
      };
    }

    // Rule: Infection
    if (lowerSymptoms.includes("gorączka") || lowerSymptoms.includes("kaszel") || lowerSymptoms.includes("katar")) {
      analysis.podsumowanie_wizyty = "Objawy wskazują na infekcję górnych dróg oddechowych. Zalecane leczenie objawowe i odpoczynek.";
      analysis.diagnosis = "Ostre zakażenie górnych dróg oddechowych";
      analysis.icd10Code = "J06.9";
      analysis.kody_rozliczeniowe["ICD-10"] = ["J06.9"];
      analysis.mappedSymptoms.push("Infectio tractus respiratorii superioris");
      analysis.mapped_symptoms.push("Infectio tractus respiratorii superioris");
      analysis.action = "Leki przeciwgorączkowe, nawadnianie";
      analysis.proponowane_kroki = ["Leki przeciwgorączkowe", "Nawadnianie", "Odpoczynek"];
    }

    // Red Flags
    if (lowerSymptoms.includes("ból w klatce") || lowerSymptoms.includes("duszność")) {
      analysis.alerts.push("PILNE: Podejrzenie ostrego zespołu wieńcowego lub zatorowości płucnej.");
      analysis.legal_compliance.czerwone_flagi.push("PILNE: Podejrzenie ostrego zespołu wieńcowego lub zatorowości płucnej.");
      analysis.action = "Natychmiastowe skierowanie na SOR / Wezwanie ZRM";
      analysis.proponowane_kroki.push("Natychmiastowe skierowanie na SOR / Wezwanie ZRM");
      analysis.legal_compliance.ryzyko_bledu = 8;
    }

    return analysis;
  }

  private extractSymptoms(text: string): string[] {
    const symptoms: string[] = [];
    for (const category in ICD10_CODES) {
      for (const code in ICD10_CODES[category]) {
        const description = ICD10_CODES[category][code].toLowerCase();
        if (text.includes(description) || text.includes(code.toLowerCase())) {
          symptoms.push(`${description} (${code})`);
        }
      }
    }
    
    // Fallback to common keywords if no ICD-10 match
    if (symptoms.length === 0) {
      const common = ["ból", "gorączka", "kaszel", "duszność", "osłabienie", "zawroty głowy", "kołatanie serca"];
      return common.filter(s => text.includes(s));
    }
    
    return [...new Set(symptoms)]; // Unique values
  }
}
