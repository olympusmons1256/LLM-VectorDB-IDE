// src/components/Settings/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ApplicationSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  autosaveInterval: number;
  analyticsEnabled: boolean;
}

interface SettingsState {
  settings: ApplicationSettings;
  updateSettings: (updates: Partial<ApplicationSettings>) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  theme: 'light',
  notifications: true,
  autosaveInterval: 10,
  analyticsEnabled: false
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),
      
      resetToDefaults: () => set({ 
        settings: { ...DEFAULT_SETTINGS } 
      })
    }),
    {
      name: 'app-settings-storage',
      partialize: (state) => ({ settings: state.settings })
    }
  )
);