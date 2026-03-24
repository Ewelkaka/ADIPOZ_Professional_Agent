import { GoogleGenAI, Content, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const SYSTEM_PROMPT = `Jesteś AdiPOZ – zaawansowanym agentycznym asystentem AI dla lekarzy POZ w polskim systemie NFZ (2026). Działasz jako wspomagający copilot: analizujesz, sugerujesz, nigdy nie decydujesz samodzielnie.

Kluczowe zasady (zawsze przestrzegaj – to core safety layer):
- Jesteś TYLKO wsparciem – nigdy nie stawiasz diagnozy, nie przepisujesz leków, nie podajesz dawek bez frazy „propozycja do weryfikacji przez lekarza”.
- Mów naturalnym polskim językiem medycznym, unikaj niepotrzebnych anglicyzmów.
- Jeśli brakuje danych → jasno mów: „Brak kluczowych informacji – proszę uzupełnić wywiad / wyniki / kontekst.”
- Używaj adaptive chain-of-thought: myśl krok po kroku, zanim odpowiesz.

Główne zadania (wykonuj w tej kolejności):
0. Mapowanie synonimów i analiza języka naturalnego: Zidentyfikuj objawy podane przez użytkownika w języku potocznym (np. "pieczenie w klatce", "brak tchu", "kłucie w boku") i zmapuj je na profesjonalną terminologię medyczną (np. "angina pectoris", "dyspnoea", "pleuritic chest pain"). Uwzględnij wiele wariantów synonimów i warianty językowe. Analizuj objawy w kontekście medycznym w jednym kroku.
1. Analizuj podany tekst wizyty / transkrypcję / opis przypadku.
2. Podsumuj kluczowe elementy (dolegliwości, wywiad, badanie, rozpoznanie, plan).
3. Wykrywaj care gaps / ryzyka przeoczenia (np. brak kontroli HbA1c >12 mies., brak kolonoskopii 50+, brak szczepień zalecanych).
4. Proponuj dalsze kroki: badania diagnostyczne (EKG, morfologia, obrazowe), konsultacje, skierowania – zawsze z uzasadnieniem opartym na polskich wytycznych 2025–2026.
5. Moduł Automatycznego Kodowania (Finanse i NFZ): Na podstawie notatki z wizyty wygeneruj sekcję "kody_rozliczeniowe" (ICD-10, ICD-9, Uzasadnienie). Przypisz kody ICD-10 precyzyjnie.
6. Moduł Bezpieczeństwa (Interakcje Lekowe): Działaj jako farmakolog kliniczny. Przeanalizuj listę leków pacjenta.
   - interakcje: Sprawdź synergię lub ryzyko (np. bradykardia, niedociśnienie).
   - dawkowanie: Oceń zgodność dawek z wytycznymi przy podanym ciśnieniu.
   - ostrzezenia: Kluczowe zalecenia i alerty bezpieczeństwa dla pacjenta na tę wizytę.
8. Moduł Opieki Koordynowanej (Pieniądze dla Przychodni):
   - Sprawdź kwalifikację pacjenta do ścieżki Kardiologicznej, Diabetologicznej lub Pulmonologicznej.
   - Wypisz badania z listy badań powierzonych (np. NT-proBNP, albuminuria), które należy zlecić.
   - Wygeneruj szkielet Indywidualnego Planu Opieki Medycznej (IPOM) na 6 miesięcy.
10. Moduł "Legal & Compliance" (Ochrona Lekarza):
   - Czerwone Flagi: Wskaż, czy lekarz pominął badanie krytyczne dla bezpieczeństwa (np. przy duszności brak EKG).
   - Zgoda i Pouczenie: Wygeneruj tekst prawny do podpisu przy zmianie leczenia (np. Warfaryna -> NOAC).
   - Ryzyko: Oceń ryzyko błędu medycznego w skali 1-10.
11. Moduł "Predictive Health" (Przyszłość):
   - Ryzyko SCORE2: Oblicz szacowane ryzyko incydentu sercowo-naczyniowego w ciągu 10 lat.
   - Prognoza: Jak zmieni się ryzyko po unormowaniu INR i obniżeniu HbA1c do 7.0%?
   - Koszty: Oszacuj oszczędności dla systemu zdrowia dzięki uniknięciu udaru.
12. Moduł "AdiPOZ Integration Engine" (Backend & P1/P2):
   - SQL (PostgreSQL): Przygotuj zapytania INSERT/UPDATE dla danych pacjenta, wizyty i kodów ICD.
   - NoSQL (MongoDB/Elasticsearch): Przygotuj schemat dokumentu dla "Sovereign Log" (ślad audytowy).
   - API Rządowe P1/P2 (CSIOZ): Wygeneruj logikę mapowania danych na HL7 CDA (e-Recepta/e-Skierowanie).
   - Security: Uwzględnij szyfrowanie AES-256 (PESEL) i OAuth2.
13. Moduł "AdiPOZ Sovereign Engine" (Local-First / No-API):
   - Local Reasoning: Analizuj dane pacjenta wyłącznie w oparciu o wbudowaną bazę wiedzy (ESC/PTK/PTD).
   - Sovereign Log Creation: Wygeneruj strukturę dla lokalnego zapisu blokowego (Local Immutable Ledger).
   - Data Decentralization: Przygotuj dane do synchronizacji P2P (Peer-to-Peer).
   - Hardware Acceleration: Optymalizuj wyjście pod lokalne jednostki NPU/GPU (ONNX/TensorRT).
14. Moduł "Patient Language" (Dla Pacjenta): Przygotuj krótkie podsumowanie dla pacjenta na podstawie analizy wizyty.
15. Moduł Diagnostyki Różnicowej: Zaproponuj listę diagnoz różnicowych (differential diagnoses) na podstawie objawów. Dla każdej podaj uzasadnienie i prawdopodobieństwo (0-100%).
   - Nie używaj żargonu (zamiast "niedokrwienie" napisz "słabsze ukrwienie serca").
   - Wyjaśnij pilność badań, jeśli występują.
   - Wypunktuj zalecenia w 3 prostych krokach.
9. Generuj gotowe frazy do systemów: e-recepta draft, skierowanie, informacja dla pacjenta.

WAŻNE: MUSISZ ZWRACAĆ ODPOWIEDZI WYŁĄCZNIE W FORMACIE JSON.
Nie dodawaj żadnego tekstu przed ani po strukturze JSON. Absolutnie nie używaj znaczników markdown (takich jak \`\`\`json ani \`\`\`). Twoja odpowiedź musi zaczynać się bezpośrednio od znaku '{' i kończyć znakiem '}'. Zwróć tylko i wyłącznie poprawny, parsowalny obiekt JSON o następującej strukturze. Pola "do_eWUS" oraz "do_e_recepty" muszą być ciągami znaków, a jeśli brak danych, zwróć pusty ciąg znaków ("") lub null:

{
  "podsumowanie_wizyty": "Krótki opis 3–6 zdań",
  "mapped_symptoms": ["objaw medyczny 1", "objaw medyczny 2"],
  "care_gaps": ["punkt 1 z uzasadnieniem", "punkt 2 z uzasadnieniem"],
  "proponowane_kroki": ["Krok 1 – co i dlaczego", "Krok 2 – co i dlaczego"],
  "podsumowanie_leczenia": "Zwięzłe podsumowanie leczenia",
  "kody_rozliczeniowe": {
    "ICD-10": ["kod1", "kod2"],
    "ICD-9": ["kod1", "kod2"],
    "Uzasadnienie": "Krótkie info"
  },
  "gotowe_teksty": {
    "do_eWUS": "...",
    "do_e_recepty": "...",
    "skierowanie": "...",
    "dla_pacjenta": "Prosty język, empatyczny"
  },
  "podsumowanie_dla_pacjenta": {
    "wyjasnienie": "Prosty język",
    "pilnosc_badan": "Dlaczego EKG/inne są pilne",
    "zalecenia": ["Krok 1", "Krok 2", "Krok 3"]
  },
  "opieka_koordynowana": {
    "sciezka": "Kardiologiczna / Diabetologiczna / Pulmonologiczna / brak",
    "uzasadnienie": "Dlaczego kwalifikuje się",
    "badania_powierzone": ["badanie 1", "badanie 2"],
    "ipom": "Szkielet planu na 6 miesięcy"
  },
  "legal_compliance": {
    "czerwone_flagi": ["flaga 1", "flaga 2"],
    "zgoda_i_pouczenie": "Tekst prawny do podpisu",
    "ryzyko_bledu": 1
  },
  "predictive_health": {
    "score2": "10-letnie ryzyko w %",
    "prognoza": "Zmiana ryzyka po poprawie parametrów",
    "oszczednosci": "Szacowane oszczędności w PLN"
  },
  "integration_engine": {
    "sql_queries": "INSERT/UPDATE queries",
    "nosql_document": "MongoDB/Elasticsearch schema",
    "p1_p2_mapping_logic": "HL7 CDA mapping logic"
  },
  "sovereign_engine": {
    "local_clinical_analysis": "Lokalna analiza kliniczna",
    "immutable_ledger_entry": "Struktura zapisu blokowego",
    "p2p_sync_payload": "Dane do synchronizacji P2P"
  },
  "uwagi_dodatkowe": "opcjonalnie – jeśli coś nietypowego",
  "disclaimer": "To wyłącznie sugestia AI wspomagająca pracę lekarza. Ostateczna decyzja, odpowiedzialność i zgodność z aktualnymi wytycznymi PT/GP/NFZ należy do lekarza prowadzącego."
}

Jeśli to test / ogólne pytanie – odpowiadaj informacyjnie i krótko, umieszczając odpowiedź w polu "uwagi_dodatkowe" i zostawiając resztę pól pustych, ale ZAWSZE zachowaj format JSON.`;

export type ChatMode = "analysis" | "search" | "maps";

export async function* streamChatResponse(
  message: string,
  mode: ChatMode,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = [],
  latLng?: { latitude: number; longitude: number },
  patientInfo: any = {}
) {
  try {
    if (mode === "analysis") {
      const patientContext = patientInfo ? `
DANE PACJENTA (KONTEKST):
- Wiek: ${patientInfo.age || 'Nie podano'} lat
- Płeć: ${patientInfo.gender || 'Nie podano'}
- Waga: ${patientInfo.weight || 'Nie podano'} kg
- BMI: ${patientInfo.bmi || 'Nie podano'}
- Inne dane: ${patientInfo.other || 'Brak'}
` : "";

      const contents: Content[] = [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: "user", parts: [{ text: `${patientContext}\n\nZAPYTANIE UŻYTKOWNIKA: ${message}` }] }
      ];

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              podsumowanie_wizyty: { type: Type.STRING },
              mapped_symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
              care_gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
              proponowane_kroki: { type: Type.ARRAY, items: { type: Type.STRING } },
              podsumowanie_leczenia: { type: Type.STRING },
              kody_rozliczeniowe: {
                type: Type.OBJECT,
                properties: {
                  "ICD-10": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "ICD-9": { type: Type.ARRAY, items: { type: Type.STRING } },
                  Uzasadnienie: { type: Type.STRING }
                }
              },
              bezpieczenstwo_lekowe: {
                type: Type.OBJECT,
                properties: {
                  interakcje: { type: Type.STRING },
                  dawkowanie: { type: Type.STRING },
                  ostrzezenia: { type: Type.STRING }
                }
              },
              gotowe_teksty: {
                type: Type.OBJECT,
                nullable: true,
                description: "Obiekt zawierający gotowe teksty. Zawsze obiekt, może być pusty w przypadku braku danych.",
                properties: {
                  do_eWUS: { 
                    type: Type.STRING,
                    nullable: true,
                    description: "Tekst do systemu eWUŚ. Zawsze ciąg znaków, może być pusty lub null w przypadku braku danych."
                  },
                  do_e_recepty: { 
                    type: Type.STRING,
                    nullable: true,
                    description: "Tekst do systemu e-recepty. Zawsze ciąg znaków, może być pusty lub null w przypadku braku danych."
                  },
                  skierowanie: { 
                    type: Type.STRING, 
                    nullable: true,
                    description: "Tekst skierowania. Zawsze ciąg znaków, może być pusty lub null w przypadku braku danych."
                  },
                  dla_pacjenta: { type: Type.STRING, nullable: true }
                }
              },
              podsumowanie_dla_pacjenta: {
                type: Type.OBJECT,
                properties: {
                  wyjasnienie: { type: Type.STRING },
                  pilnosc_badan: { type: Type.STRING },
                  zalecenia: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              opieka_koordynowana: {
                type: Type.OBJECT,
                properties: {
                  sciezka: { type: Type.STRING },
                  uzasadnienie: { type: Type.STRING },
                  badania_powierzone: { type: Type.ARRAY, items: { type: Type.STRING } },
                  ipom: { type: Type.STRING }
                }
              },
              legal_compliance: {
                type: Type.OBJECT,
                properties: {
                  czerwone_flagi: { type: Type.ARRAY, items: { type: Type.STRING } },
                  zgoda_i_pouczenie: { type: Type.STRING },
                  ryzyko_bledu: { type: Type.NUMBER }
                }
              },
              predictive_health: {
                type: Type.OBJECT,
                properties: {
                  score2: { type: Type.STRING },
                  prognoza: { type: Type.STRING },
                  oszczednosci: { type: Type.STRING }
                }
              },
              integration_engine: {
                type: Type.OBJECT,
                properties: {
                  sql_queries: { type: Type.STRING },
                  nosql_document: { type: Type.STRING },
                  p1_p2_mapping_logic: { type: Type.STRING }
                }
              },
              sovereign_engine: {
                type: Type.OBJECT,
                properties: {
                  local_clinical_analysis: { type: Type.STRING },
                  immutable_ledger_entry: { type: Type.STRING },
                  p2p_sync_payload: { type: Type.STRING }
                }
              },
              uwagi_dodatkowe: { type: Type.STRING },
              dane_do_wizualizacji: {
                type: Type.ARRAY,
                nullable: true,
                description: "Dane do wykresu. Tablica obiektów, gdzie każdy obiekt ma klucz 'name' (etykieta osi X, np. data lub kategoria) i 'value' (wartość liczbowa).",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.NUMBER }
                  }
                }
              },
              differential_diagnoses: {
                type: Type.ARRAY,
                description: "Lista diagnoz różnicowych.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    diagnosis: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    probability: { type: Type.NUMBER }
                  }
                }
              },
              disclaimer: { type: Type.STRING }
            }
          }
        }
      });

      let fullText = "";
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
        }
      }

      try {
        const parsed = JSON.parse(fullText);
        
        // Walidacja dla pola 'gotowe_teksty' - zapewnienie, że jest to obiekt
        if (
          !parsed.gotowe_teksty || 
          typeof parsed.gotowe_teksty !== 'object' || 
          Array.isArray(parsed.gotowe_teksty)
        ) {
          parsed.gotowe_teksty = {};
        }
        
        const fieldsToValidate = ['skierowanie', 'do_e_recepty', 'do_eWUS', 'dla_pacjenta'];
        fieldsToValidate.forEach(field => {
          if (parsed.gotowe_teksty[field] === null || parsed.gotowe_teksty[field] === undefined) {
            parsed.gotowe_teksty[field] = "";
          } else if (typeof parsed.gotowe_teksty[field] !== 'string') {
            parsed.gotowe_teksty[field] = String(parsed.gotowe_teksty[field]);
          }
        });

        // Walidacja dla pola 'dane_do_wizualizacji'
        if (parsed.dane_do_wizualizacji && Array.isArray(parsed.dane_do_wizualizacji)) {
          parsed.dane_do_wizualizacji = parsed.dane_do_wizualizacji.filter((item: any) => 
            item && 
            typeof item === 'object' && 
            'name' in item && 
            'value' in item && 
            typeof item.name === 'string' && 
            typeof item.value === 'number'
          );
        } else {
          parsed.dane_do_wizualizacji = [];
        }

        yield JSON.stringify(parsed, null, 2);
      } catch (e) {
        console.warn("Failed to parse JSON response (partial response):", e);
        yield fullText;
      }
    } else if (mode === "search") {
      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: message,
        config: {
          systemInstruction: "Jesteś asystentem medycznym wyszukującym aktualne wytyczne i informacje dla lekarzy POZ w Polsce. Zawsze podawaj źródła i linki do znalezionych informacji. Odpowiadaj zwięźle i profesjonalnie.",
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } else if (mode === "maps") {
      const config: any = {
        systemInstruction: "Jesteś asystentem medycznym pomagającym znaleźć placówki medyczne, apteki lub specjalistów w okolicy pacjenta lub lekarza. Zawsze podawaj adresy i linki do map.",
        tools: [{ googleMaps: {} }],
        temperature: 0.1,
      };

      if (latLng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng
          }
        };
      }

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: message,
        config
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    }
  } catch (error: any) {
    console.error("[Gemini] Error calling Gemini API:", error);
    const errorMessage = error.message || "Wystąpił nieoczekiwany błąd podczas komunikacji z AI.";
    const errorCode = error.status || "UNKNOWN_ERROR";
    
    throw new Error(JSON.stringify({
      error: errorMessage,
      code: errorCode,
      service: "Gemini"
    }));
  }
}
