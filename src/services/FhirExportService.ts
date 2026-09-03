/**
 * Usługa Eksportu Dokumentacji Medycznej do formatu HL7 FHIR Release 4 (R4) Bundle.
 * Umożliwia pełną interoperacyjność z zewnętrznymi szpitalnymi i przychodnianymi systemami HIS/EHR
 * (np. Kamsoft, Asseco, Comarch, CGM, Mediporta, a także platformą P1 e-Zdrowie).
 * 
 * Standard: HL7 FHIR R4 (http://hl7.org/fhir/R4/)
 * Bundle Type: 'document' (Kliniczny dokument medyczny / Notatka konsultacyjna POZ)
 * 
 * Autor: Ewelina Lesiak (system 🩺 ADIPOZ → Professional Agent)
 * Wszelkie Prawa Zastrzeżone © 2026 Ewelina Lesiak
 */

export interface FhirExportParams {
  patientId: string;
  patientInfo?: {
    imie?: string;
    nazwisko?: string;
    name?: string;
    pesel?: string;
    wiek?: number | string;
    plec?: string;
    grupaKrwi?: string;
    alergie?: string[];
    chorobyPrzewlekle?: string[];
  };
  doctorInfo?: {
    name?: string;
    pwz?: string;
    specialization?: string;
    facility?: string;
  };
  vitals?: {
    cisnienieSkurczowe?: number;
    cisnienieRozkurczowe?: number;
    tetno?: number;
    temperatura?: number;
    waga?: number;
    wzrost?: number;
    bmi?: number;
    saturacja?: number;
  };
  symptoms?: string;
  medications?: string;
  analysis?: any;
  visitDate?: string;
}

export interface FhirResourceSummary {
  resourceType: string;
  id: string;
  title: string;
  details?: string;
}

export class FhirExportService {
  /**
   * Generuje kompletny obiekt HL7 FHIR R4 Bundle typu 'document'
   */
  static generateFhirBundle(params: FhirExportParams): Record<string, any> {
    const timestamp = params.visitDate ? new Date(params.visitDate).toISOString() : new Date().toISOString();
    const bundleUuid = this.generateUuid();
    const compositionUuid = `urn:uuid:${this.generateUuid()}`;
    const patientUuid = `urn:uuid:${this.generateUuid()}`;
    const practitionerUuid = `urn:uuid:${this.generateUuid()}`;
    const encounterUuid = `urn:uuid:${this.generateUuid()}`;

    // Dane pacjenta
    let givenName = 'Jan';
    let familyName = 'Kowalski';
    if (params.patientInfo) {
      if (params.patientInfo.imie && params.patientInfo.nazwisko) {
        givenName = params.patientInfo.imie;
        familyName = params.patientInfo.nazwisko;
      } else if (params.patientInfo.name) {
        const parts = params.patientInfo.name.split(' ');
        givenName = parts[0] || 'Jan';
        familyName = parts.slice(1).join(' ') || 'Kowalski';
      }
    }
    const pesel = params.patientInfo?.pesel || '80010112345';
    const fullName = `${givenName} ${familyName}`;

    // Dane lekarza
    const doctorName = params.doctorInfo?.name || 'Lek. Jan Kowalski';
    const doctorPwz = params.doctorInfo?.pwz || '1234567';
    const doctorSpec = params.doctorInfo?.specialization || 'Specjalista Medycyny Rodzinnej (POZ)';
    const doctorFacility = params.doctorInfo?.facility || 'NZOZ Przychodnia Lekarza Rodzinnego POZ';

    // Dane kliniczne z analizy
    const decision = params.analysis?.data?.decision || {};
    const noteContent = params.analysis?.data?.note?.content || '';
    const diagnosis = decision.diagnosis || 'Wizyta kontrolna / konsultacja ogólna';
    const icd10Code = decision.icd10Code || 'Z00.0';
    const suggestedTests: string[] = decision.suggestedTests || [];

    // Parsowanie leków
    const medsList: string[] = params.medications
      ? params.medications.split(',').map(m => m.trim()).filter(m => m.length > 0)
      : [];

    const entries: any[] = [];

    // 1. ZASÓB: Composition (Główny dokument kliniczny - notatka POZ)
    const compositionResource = {
      resourceType: 'Composition',
      id: compositionUuid.replace('urn:uuid:', ''),
      meta: {
        lastUpdated: timestamp,
        profile: ['http://hl7.org/fhir/StructureDefinition/Composition']
      },
      status: 'final',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note'
          },
          {
            system: 'http://snomed.info/sct',
            code: '371530004',
            display: 'Clinical consultation report'
          }
        ],
        text: 'Notatka z wizyty ambulatoryjnej w POZ'
      },
      category: [
        {
          coding: [
            {
              system: 'http://loinc.org',
              code: 'LP173421-1',
              display: 'Report'
            }
          ]
        }
      ],
      subject: {
        reference: patientUuid,
        display: `${fullName} (PESEL: ${pesel})`
      },
      encounter: {
        reference: encounterUuid,
        display: 'Konsultacja lekarska w Podstawowej Opiece Zdrowotnej'
      },
      date: timestamp,
      author: [
        {
          reference: practitionerUuid,
          display: `${doctorName}, PWZ: ${doctorPwz}`
        }
      ],
      title: 'Notatka Medyczna Wizyty POZ - System 🩺 ADIPOZ → Professional Agent',
      custodian: {
        display: doctorFacility
      },
      section: [
        {
          title: 'Subiektywne (Wywiad lekarski / Anamneza)',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '61150-9',
                display: 'Subjective narrative'
              }
            ]
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><strong>Zgłaszane objawy i dolegliwości:</strong> ${this.escapeXml(params.symptoms || 'Brak zgłoszonych objawów ostrych')}</p></div>`
          }
        },
        {
          title: 'Obiektywne (Badanie fizykalne i parametry życiowe)',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '61149-1',
                display: 'Objective narrative'
              }
            ]
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>RR: ${params.vitals?.cisnienieSkurczowe || '--'}/${params.vitals?.cisnienieRozkurczowe || '--'} mmHg, HR: ${params.vitals?.tetno || '--'} bpm, Temp: ${params.vitals?.temperatura || '--'} °C, Waga: ${params.vitals?.waga || '--'} kg, Wzrost: ${params.vitals?.wzrost || '--'} cm, BMI: ${params.vitals?.bmi || '--'} kg/m²</p></div>`
          }
        },
        {
          title: 'Ocena (Rozpoznanie i Diagnozy Różnicowe)',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '51848-0',
                display: 'Evaluation'
              }
            ]
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><strong>Rozpoznanie główne:</strong> ${this.escapeXml(diagnosis)} (${this.escapeXml(icd10Code)})</p><p><em>Uzasadnienie CDSS:</em> ${this.escapeXml(decision.explanation || 'Zgodność z wytycznymi medycznymi')}</p></div>`
          }
        },
        {
          title: 'Plan (Postępowanie, Farmakoterapia, Zlecenia)',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '18776-5',
                display: 'Plan of care note'
              }
            ]
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><strong>Zalecenie:</strong> ${this.escapeXml(decision.action || 'Wdrożono plan terapeutyczny')}</p>${medsList.length > 0 ? `<p><strong>Leki:</strong> ${this.escapeXml(medsList.join(', '))}</p>` : ''}${suggestedTests.length > 0 ? `<p><strong>Zlecone badania:</strong> ${this.escapeXml(suggestedTests.join(', '))}</p>` : ''}</div>`
          }
        },
        {
          title: 'Pełna Notatka SOAP (Transkrypcja Dokumentacji)',
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '11506-3',
                display: 'Progress note'
              }
            ]
          },
          text: {
            status: 'additional',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><pre>${this.escapeXml(noteContent)}</pre></div>`
          }
        }
      ]
    };

    entries.push({
      fullUrl: compositionUuid,
      resource: compositionResource
    });

    // 2. ZASÓB: Patient (Pacjent)
    const patientResource = {
      resourceType: 'Patient',
      id: patientUuid.replace('urn:uuid:', ''),
      identifier: [
        {
          use: 'official',
          system: 'http://standardy.ezdrowie.gov.pl/identyfikator/pesel',
          value: pesel
        },
        {
          use: 'secondary',
          system: 'http://adipoz.ai/patient-id',
          value: params.patientId
        }
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: familyName,
          given: [givenName]
        }
      ],
      gender: this.detectGender(pesel, params.patientInfo?.plec)
    };

    entries.push({
      fullUrl: patientUuid,
      resource: patientResource
    });

    // 3. ZASÓB: Practitioner (Lekarz POZ)
    const practitionerResource = {
      resourceType: 'Practitioner',
      id: practitionerUuid.replace('urn:uuid:', ''),
      identifier: [
        {
          use: 'official',
          system: 'http://standardy.ezdrowie.gov.pl/identyfikator/pwz',
          value: doctorPwz
        }
      ],
      active: true,
      name: [
        {
          text: doctorName,
          family: doctorName.replace('Lek. ', '').replace('dr ', '').split(' ').slice(1).join(' ') || 'Kowalski',
          given: [doctorName.replace('Lek. ', '').replace('dr ', '').split(' ')[0] || 'Jan'],
          prefix: ['lek.']
        }
      ],
      qualification: [
        {
          code: {
            text: doctorSpec
          }
        }
      ]
    };

    entries.push({
      fullUrl: practitionerUuid,
      resource: practitionerResource
    });

    // 4. ZASÓB: Encounter (Wizyta ambulatoryjna POZ)
    const encounterResource = {
      resourceType: 'Encounter',
      id: encounterUuid.replace('urn:uuid:', ''),
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory'
      },
      type: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '394761003',
              display: 'General practice'
            }
          ],
          text: 'Konsultacja lekarska w Podstawowej Opiece Zdrowotnej (POZ)'
        }
      ],
      subject: {
        reference: patientUuid,
        display: fullName
      },
      participant: [
        {
          individual: {
            reference: practitionerUuid,
            display: doctorName
          }
        }
      ],
      period: {
        start: timestamp,
        end: timestamp
      },
      reasonCode: [
        {
          text: params.symptoms || 'Konsultacja lekarska POZ'
        }
      ]
    };

    entries.push({
      fullUrl: encounterUuid,
      resource: encounterResource
    });

    // 5. ZASÓB: Condition (Główne rozpoznanie kliniczne ICD-10)
    const conditionUuid = `urn:uuid:${this.generateUuid()}`;
    const conditionResource = {
      resourceType: 'Condition',
      id: conditionUuid.replace('urn:uuid:', ''),
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
            display: 'Active'
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed',
            display: 'Confirmed'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'encounter-diagnosis',
              display: 'Encounter Diagnosis'
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: icd10Code,
            display: diagnosis
          }
        ],
        text: `${diagnosis} (${icd10Code})`
      },
      subject: {
        reference: patientUuid,
        display: fullName
      },
      encounter: {
        reference: encounterUuid
      },
      recordedDate: timestamp,
      recorder: {
        reference: practitionerUuid,
        display: doctorName
      }
    };

    entries.push({
      fullUrl: conditionUuid,
      resource: conditionResource
    });

    // 6. ZASOBY: Observations (Parametry życiowe i wskaźniki biometryczne)
    const vitals = params.vitals;
    if (vitals) {
      // 6a. Ciśnienie Tętnicze (Panel LOINC 85354-9)
      if (vitals.cisnienieSkurczowe || vitals.cisnienieRozkurczowe) {
        const bpUuid = `urn:uuid:${this.generateUuid()}`;
        entries.push({
          fullUrl: bpUuid,
          resource: {
            resourceType: 'Observation',
            id: bpUuid.replace('urn:uuid:', ''),
            status: 'final',
            category: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'vital-signs',
                    display: 'Vital Signs'
                  }
                ]
              }
            ],
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '85354-9',
                  display: 'Blood pressure panel with all children optional'
                }
              ],
              text: 'Ciśnienie tętnicze'
            },
            subject: { reference: patientUuid, display: fullName },
            encounter: { reference: encounterUuid },
            effectiveDateTime: timestamp,
            component: [
              ...(vitals.cisnienieSkurczowe ? [{
                code: {
                  coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }],
                  text: 'Ciśnienie skurczowe'
                },
                valueQuantity: {
                  value: vitals.cisnienieSkurczowe,
                  unit: 'mmHg',
                  system: 'http://unitsofmeasure.org',
                  code: 'mm[Hg]'
                }
              }] : []),
              ...(vitals.cisnienieRozkurczowe ? [{
                code: {
                  coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }],
                  text: 'Ciśnienie rozkurczowe'
                },
                valueQuantity: {
                  value: vitals.cisnienieRozkurczowe,
                  unit: 'mmHg',
                  system: 'http://unitsofmeasure.org',
                  code: 'mm[Hg]'
                }
              }] : [])
            ]
          }
        });
      }

      // 6b. Tętno (LOINC 8867-4)
      if (vitals.tetno) {
        const hrUuid = `urn:uuid:${this.generateUuid()}`;
        entries.push({
          fullUrl: hrUuid,
          resource: {
            resourceType: 'Observation',
            id: hrUuid.replace('urn:uuid:', ''),
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: {
              coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }],
              text: 'Częstość akcji serca / Tętno'
            },
            subject: { reference: patientUuid, display: fullName },
            encounter: { reference: encounterUuid },
            effectiveDateTime: timestamp,
            valueQuantity: {
              value: vitals.tetno,
              unit: '/min',
              system: 'http://unitsofmeasure.org',
              code: '/min'
            }
          }
        });
      }

      // 6c. Masa ciała (LOINC 29463-7)
      if (vitals.waga) {
        const wtUuid = `urn:uuid:${this.generateUuid()}`;
        entries.push({
          fullUrl: wtUuid,
          resource: {
            resourceType: 'Observation',
            id: wtUuid.replace('urn:uuid:', ''),
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: {
              coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
              text: 'Masa ciała'
            },
            subject: { reference: patientUuid, display: fullName },
            encounter: { reference: encounterUuid },
            effectiveDateTime: timestamp,
            valueQuantity: {
              value: vitals.waga,
              unit: 'kg',
              system: 'http://unitsofmeasure.org',
              code: 'kg'
            }
          }
        });
      }

      // 6d. Wzrost (LOINC 8302-2)
      if (vitals.wzrost) {
        const htUuid = `urn:uuid:${this.generateUuid()}`;
        entries.push({
          fullUrl: htUuid,
          resource: {
            resourceType: 'Observation',
            id: htUuid.replace('urn:uuid:', ''),
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: {
              coding: [{ system: 'http://loinc.org', code: '8302-2', display: 'Body height' }],
              text: 'Wzrost'
            },
            subject: { reference: patientUuid, display: fullName },
            encounter: { reference: encounterUuid },
            effectiveDateTime: timestamp,
            valueQuantity: {
              value: vitals.wzrost,
              unit: 'cm',
              system: 'http://unitsofmeasure.org',
              code: 'cm'
            }
          }
        });
      }

      // 6e. Wskaźnik masy ciała BMI (LOINC 39156-5)
      if (vitals.bmi) {
        const bmiUuid = `urn:uuid:${this.generateUuid()}`;
        entries.push({
          fullUrl: bmiUuid,
          resource: {
            resourceType: 'Observation',
            id: bmiUuid.replace('urn:uuid:', ''),
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: {
              coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI) [Ratio]' }],
              text: 'Wskaźnik Masy Ciała (BMI)'
            },
            subject: { reference: patientUuid, display: fullName },
            encounter: { reference: encounterUuid },
            effectiveDateTime: timestamp,
            valueQuantity: {
              value: vitals.bmi,
              unit: 'kg/m2',
              system: 'http://unitsofmeasure.org',
              code: 'kg/m2'
            }
          }
        });
      }

      // 6f. Temperatura (LOINC 8310-5)
      if (vitals.temperatura) {
        const tempUuid = `urn:uuid:${this.generateUuid()}`;
        entries.push({
          fullUrl: tempUuid,
          resource: {
            resourceType: 'Observation',
            id: tempUuid.replace('urn:uuid:', ''),
            status: 'final',
            category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
            code: {
              coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }],
              text: 'Temperatura ciała'
            },
            subject: { reference: patientUuid, display: fullName },
            encounter: { reference: encounterUuid },
            effectiveDateTime: timestamp,
            valueQuantity: {
              value: vitals.temperatura,
              unit: 'Cel',
              system: 'http://unitsofmeasure.org',
              code: 'Cel'
            }
          }
        });
      }
    }

    // 7. ZASOBY: MedicationStatement (Stosowane / Zalecone leki)
    medsList.forEach((med, idx) => {
      const medUuid = `urn:uuid:${this.generateUuid()}`;
      entries.push({
        fullUrl: medUuid,
        resource: {
          resourceType: 'MedicationStatement',
          id: medUuid.replace('urn:uuid:', ''),
          status: 'active',
          medicationCodeableConcept: {
            text: med
          },
          subject: {
            reference: patientUuid,
            display: fullName
          },
          context: {
            reference: encounterUuid
          },
          effectiveDateTime: timestamp,
          dosage: [
            {
              text: 'Według wskazań lekarskich'
            }
          ]
        }
      });
    });

    // 8. ZASOBY: ServiceRequest (Zlecone badania laboratoryjne i skierowania POZ)
    suggestedTests.forEach((test, idx) => {
      const srUuid = `urn:uuid:${this.generateUuid()}`;
      entries.push({
        fullUrl: srUuid,
        resource: {
          resourceType: 'ServiceRequest',
          id: srUuid.replace('urn:uuid:', ''),
          status: 'active',
          intent: 'order',
          category: [
            {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '108252007',
                  display: 'Laboratory procedure'
                }
              ]
            }
          ],
          code: {
            text: test
          },
          subject: {
            reference: patientUuid,
            display: fullName
          },
          encounter: {
            reference: encounterUuid
          },
          authoredOn: timestamp,
          requester: {
            reference: practitionerUuid,
            display: doctorName
          }
        }
      });
    });

    // Skompletowanie całego FHIR Bundle
    return {
      resourceType: 'Bundle',
      id: bundleUuid,
      meta: {
        lastUpdated: timestamp,
        profile: ['http://hl7.org/fhir/StructureDefinition/Bundle']
      },
      identifier: {
        system: 'http://adipoz.ai/fhir/bundles',
        value: `bundle-poz-${params.patientId}-${Date.now()}`
      },
      type: 'document',
      timestamp: timestamp,
      total: entries.length,
      entry: entries
    };
  }

  /**
   * Zwraca podsumowanie wygenerowanych zasobów do prezentacji lekarzowi w interfejsie
   */
  static summarizeBundle(bundle: Record<string, any>): FhirResourceSummary[] {
    if (!bundle?.entry || !Array.isArray(bundle.entry)) return [];

    return bundle.entry.map((e: any) => {
      const res = e.resource || {};
      let title = res.resourceType;
      let details = '';

      switch (res.resourceType) {
        case 'Composition':
          title = 'Dokument Kliniczny (Composition)';
          details = res.title || 'Notatka SOAP z wizyty';
          break;
        case 'Patient':
          title = 'Pacjent (Patient)';
          details = `${res.name?.[0]?.given?.[0] || ''} ${res.name?.[0]?.family || ''} (PESEL: ${res.identifier?.[0]?.value || '--'})`;
          break;
        case 'Practitioner':
          title = 'Lekarz Prowadzący (Practitioner)';
          details = `${res.name?.[0]?.text || 'Lekarz POZ'} (PWZ: ${res.identifier?.[0]?.value || '--'})`;
          break;
        case 'Encounter':
          title = 'Wizyta Lekarska (Encounter)';
          details = 'Konsultacja ambulatoryjna w POZ';
          break;
        case 'Condition':
          title = 'Rozpoznanie (Condition)';
          details = res.code?.text || res.code?.coding?.[0]?.display || 'Diagnoza kliniczna';
          break;
        case 'Observation':
          title = `Obserwacja: ${res.code?.text || 'Parametr życiowy'}`;
          if (res.component) {
            details = res.component.map((c: any) => `${c.code?.text}: ${c.valueQuantity?.value} ${c.valueQuantity?.unit}`).join(', ');
          } else if (res.valueQuantity) {
            details = `${res.valueQuantity.value} ${res.valueQuantity.unit}`;
          }
          break;
        case 'MedicationStatement':
          title = 'Lek / Farmakoterapia (MedicationStatement)';
          details = res.medicationCodeableConcept?.text || 'Lek';
          break;
        case 'ServiceRequest':
          title = 'Zlecenie Badania (ServiceRequest)';
          details = res.code?.text || 'Badanie laboratoryjne';
          break;
        default:
          title = res.resourceType;
          details = res.id || '';
      }

      return {
        resourceType: res.resourceType,
        id: res.id || '',
        title,
        details
      };
    });
  }

  /**
   * Pobiera plik JSON z FHIR Bundle na dysk użytkownika
   */
  static downloadBundleJson(params: FhirExportParams, filename?: string): void {
    const bundle = this.generateFhirBundle(params);
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/fhir+json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeDate = new Date().toISOString().split('T')[0];
    const defaultFilename = filename || `HL7_FHIR_Bundle_POZ_${params.patientId}_${safeDate}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Kopiuje JSON FHIR Bundle do schowka
   */
  static async copyBundleToClipboard(params: FhirExportParams): Promise<boolean> {
    try {
      const bundle = this.generateFhirBundle(params);
      const jsonStr = JSON.stringify(bundle, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      return true;
    } catch (err) {
      console.error('Błąd podczas kopiowania FHIR Bundle do schowka:', err);
      return false;
    }
  }

  // --- Metody pomocnicze ---

  private static generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static detectGender(pesel?: string, explicitGender?: string): 'male' | 'female' | 'other' | 'unknown' {
    if (explicitGender) {
      const lower = explicitGender.toLowerCase();
      if (lower.startsWith('m') || lower.includes('męż')) return 'male';
      if (lower.startsWith('k') || lower.includes('kob')) return 'female';
    }
    if (pesel && pesel.length === 11) {
      const genderDigit = parseInt(pesel.charAt(9), 10);
      if (!isNaN(genderDigit)) {
        return genderDigit % 2 === 0 ? 'female' : 'male';
      }
    }
    return 'unknown';
  }
}
