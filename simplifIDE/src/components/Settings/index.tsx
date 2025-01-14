// src/components/Settings/index.tsx
import React, { useState } from 'react';
import { ComponentProps } from '@/types/canvas';
import { useSettingsStore } from './store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

// Re-export other settings components and types
export * from './types';
export * from './constants';
export { CanvasSettingsModal } from './CanvasSettingsModal';
export { ConfigurationError } from './ConfigurationError';

export const Settings: React.FC<ComponentProps> = ({ 
  id, 
  isActive, 
  onActivate, 
  onClose 
}) => {
  const { 
    settings, 
    updateSettings, 
    resetToDefaults 
  } = useSettingsStore(id);
  
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleUpdateSetting = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
  };

  return (
    <Card 
      className={`${isActive ? 'border-blue-500' : 'border-gray-200'}`}
      onClick={onActivate}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h2 className="text-xl font-semibold">Application Settings</h2>
        <div className="space-x-2">
          <Button 
            variant="ghost"
            onClick={resetToDefaults}
          >
            Reset Defaults
          </Button>
          <Button 
            variant="ghost"
            onClick={onClose}
            className="text-red-500 hover:text-red-700"
          >
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Theme Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Theme</h3>
            <div className="flex items-center space-x-4">
              <Label className="flex items-center space-x-2">
                <input 
                  type="radio"
                  name="theme"
                  value="light"
                  checked={localSettings.theme === 'light'}
                  onChange={() => handleUpdateSetting('theme', 'light')}
                  className="radio"
                />
                <span>Light</span>
              </Label>
              <Label className="flex items-center space-x-2">
                <input 
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={localSettings.theme === 'dark'}
                  onChange={() => handleUpdateSetting('theme', 'dark')}
                  className="radio"
                />
                <span>Dark</span>
              </Label>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-lg font-medium mb-2">Notifications</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="notifications"
                checked={localSettings.notifications}
                onCheckedChange={(checked) => handleUpdateSetting('notifications', checked)}
              />
              <Label htmlFor="notifications">Enable Notifications</Label>
            </div>
          </div>

          {/* Autosave Interval */}
          <div>
            <h3 className="text-lg font-medium mb-2">Autosave Interval</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-grow">
                <Slider
                  min={1}
                  max={30}
                  step={1}
                  value={[localSettings.autosaveInterval]}
                  onValueChange={(value) => handleUpdateSetting('autosaveInterval', value[0])}
                />
              </div>
              <span className="w-16 text-right">{localSettings.autosaveInterval} min</span>
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <h3 className="text-lg font-medium mb-2">Privacy</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="analytics"
                checked={localSettings.analyticsEnabled}
                onCheckedChange={(checked) => handleUpdateSetting('analyticsEnabled', checked)}
              />
              <Label htmlFor="analytics">Enable Analytics</Label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div>
          <Button 
            className="w-full"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Settings;