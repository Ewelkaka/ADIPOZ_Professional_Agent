import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Bell, Ruler, Save, Moon, Sun } from 'lucide-react';
import { SettingsService, UserSettings } from '../services/SettingsService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<UserSettings>(SettingsService.getSettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(SettingsService.getSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    SettingsService.saveSettings(settings);
    onSettingsChange(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ustawienia Systemu</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Units */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Ruler size={18} className="text-emerald-500" />
              <span className="text-sm font-bold uppercase tracking-wider">Jednostki Miary</span>
            </div>
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button 
                onClick={() => setSettings({ ...settings, units: 'metric' })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${settings.units === 'metric' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                Metryczne (°C, mmHg)
              </button>
              <button 
                onClick={() => setSettings({ ...settings, units: 'imperial' })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${settings.units === 'imperial' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                Imperialne (°F, psi)
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Bell size={18} className="text-emerald-500" />
              <span className="text-sm font-bold uppercase tracking-wider">Powiadomienia</span>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.notifications ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.notifications ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Auto Save */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Save size={18} className="text-emerald-500" />
              <span className="text-sm font-bold uppercase tracking-wider">Auto-zapis Notatek</span>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoSave ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoSave ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              {settings.theme === 'light' ? <Sun size={18} className="text-emerald-500" /> : <Moon size={18} className="text-emerald-500" />}
              <span className="text-sm font-bold uppercase tracking-wider">Tryb Ciemny</span>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Anuluj
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Zapisz Zmiany
          </button>
        </div>
      </div>
    </div>
  );
};
