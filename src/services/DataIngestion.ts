import { z } from 'zod';
import Papa from 'papaparse';

export const PatientDataSchema = z.object({
  age: z.number().min(0).max(150),
  weight: z.number().min(0).max(500),
  height: z.number().min(0).max(300),
  symptoms: z.array(z.string()),
  medications: z.array(z.string()),
});

export type PatientData = z.infer<typeof PatientDataSchema>;

export class DataIngestionService {
  static parseCSV(csvText: string): PatientData[] {
    const result = Papa.parse(csvText, { header: true, dynamicTyping: true });
    // Simplified parsing logic - assuming CSV structure matches schema
    return result.data.map((item: any) => PatientDataSchema.parse({
      age: item.age,
      weight: item.weight,
      height: item.height,
      symptoms: typeof item.symptoms === 'string' ? item.symptoms.split(',') : [],
      medications: typeof item.medications === 'string' ? item.medications.split(',') : [],
    }));
  }

  static parseJSON(jsonText: string): PatientData[] {
    const data = JSON.parse(jsonText);
    return z.array(PatientDataSchema).parse(data);
  }
}
