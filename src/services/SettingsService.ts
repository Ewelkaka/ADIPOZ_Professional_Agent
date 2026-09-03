export interface UserSettings {
  units: 'metric' | 'imperial';
  notifications: boolean;
  autoSave: boolean;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: UserSettings = {
  units: 'metric',
  notifications: true,
  autoSave: true,
  theme: 'light',
};

export class SettingsService {
  private static STORAGE_KEY = 'sovereign_ai_settings';

  static getSettings(): UserSettings {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_SETTINGS;
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: UserSettings): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for settings:', e);
    }
  }
}
