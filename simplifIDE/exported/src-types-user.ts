export interface User {
    id: string;
    email: string;
    name: string;
    lastActive: string;
    preferences: UserPreferences;
    settings: UserSettings;
  }
  
  export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    layout: 'default' | 'compact' | 'comfortable';
  }
  
  export interface UserSettings {
    autoSave: boolean;
    notifications: boolean;
    defaultCanvas?: string;
  }