import { z } from 'zod';

const PatientDataSchema = z.object({
  age: z.number().positive("Wiek musi być liczbą dodatnią"),
  weight: z.number().positive("Waga musi być liczbą dodatnią"),
  height: z.number().positive("Wzrost musi być liczbą dodatnią"),
  symptoms: z.array(z.string()).min(1, "Wymagane jest przynajmniej jedno objaw"),
});

export function validatePatientData(data: any) {
  const result = PatientDataSchema.safeParse(data);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.success) {
    errors.push(...result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
  } else {
    // Logical BMI check
    const bmi = data.weight / Math.pow(data.height / 100, 2);
    if (bmi < 10 || bmi > 100) {
      warnings.push(`Wartość BMI (${bmi.toFixed(2)}) wydaje się nielogiczna. Sprawdź wagę i wzrost.`);
    }
  }

  return {
    errors,
    warnings,
    validated_data: result.success ? result.data : null
  };
}
