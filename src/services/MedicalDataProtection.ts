export class MedicalDataProtection {
  private static PII_FIELDS = ['name', 'surname', 'pesel', 'address', 'phone', 'email', 'birthDate'];
  
  // Simple regex for common PII patterns (names, PESEL, emails)
  private static PII_REGEX = [
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Simple Name Surname
    /\b\d{11}\b/g, // PESEL
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b(?:\+48|0048)?\s?\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g // Phone
  ];

  static anonymize(data: any): any {
    if (typeof data === 'string') {
      let anonymized = data;
      this.PII_REGEX.forEach(regex => {
        anonymized = anonymized.replace(regex, '[PII_MASKED]');
      });
      return anonymized;
    }

    if (typeof data !== 'object' || data === null) return data;

    const anonymized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in anonymized) {
      if (this.PII_FIELDS.includes(key.toLowerCase())) {
        anonymized[key] = `[MASKED_${key.toUpperCase()}]`;
      } else {
        anonymized[key] = this.anonymize(anonymized[key]);
      }
    }
    return anonymized;
  }

  static encrypt(data: any): string {
    return btoa(JSON.stringify(data)); // Simplified for demo
  }
}
