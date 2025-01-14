// src/components/Settings/types.ts
import { ComponentProps } from '@/types/canvas';

// Application Settings Types
export interface ApplicationSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  autosaveInterval: number;
  analyticsEnabled: boolean;
}

export interface SettingsStore {
  settings: ApplicationSettings;
  updateSettings: (updates: Partial<ApplicationSettings>) => void;
  resetToDefaults: () => void;
}

// Canvas Settings Modal Types
export interface CanvasSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
}

export interface ConfigurationErrorProps {
  canvasId: string;
  message: string;
}

// Cloud Provider Types
export type CloudProvider = 'aws' | 'gcp' | 'azure';
export type CloudRegion = string;

// Settings Component Props
export interface SettingsComponentProps extends ComponentProps {
  id: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}