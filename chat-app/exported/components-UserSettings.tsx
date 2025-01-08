// components/UserSettings.tsx
'use client';

import { useState } from 'react';
import { User, Settings, LogOut, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSaveStateStore } from '@/store/save-state-store';
import type { UserPreferences } from '@/types/save-state';

export function UserSettings() {
  const [showSettings, setShowSettings] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const { 
    currentUser, 
    autoSaveEnabled,
    toggleAutoSave,
    setCurrentUser
  } = useSaveStateStore();

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
          >
            <User className="h-5 w-5" />
            {currentUser?.name && (
              <span className="sr-only">{currentUser.name}</span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {currentUser.name || 'User Settings'}
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
            onClick={() => setCurrentUser(null)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">General</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save Projects</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes every 5 minutes
                  </p>
                </div>
                <Switch
                  checked={autoSaveEnabled}
                  onCheckedChange={toggleAutoSave}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme Preference</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred theme
                  </p>
                </div>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="p-2 rounded-md border dark:border-gray-700 bg-background"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Profile</h3>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <input
                  type="text"
                  value={currentUser.name || ''}
                  onChange={(e) => {
                    const updatedUser = {
                      ...currentUser,
                      name: e.target.value
                    };
                    setCurrentUser(updatedUser);
                  }}
                  className="w-full p-2 rounded-md border dark:border-gray-700 bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <input
                  type="email"
                  value={currentUser.email || ''}
                  onChange={(e) => {
                    const updatedUser = {
                      ...currentUser,
                      email: e.target.value
                    };
                    setCurrentUser(updatedUser);
                  }}
                  className="w-full p-2 rounded-md border dark:border-gray-700 bg-background"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Editor Preferences</h3>
              
              <div className="space-y-2">
                <Label>Font Size</Label>
                <select
                  value={currentUser.preferences?.fontSize || 'medium'}
                  onChange={(e) => {
                    const updatedUser = {
                      ...currentUser,
                      preferences: {
                        ...currentUser.preferences,
                        fontSize: e.target.value as UserPreferences['fontSize']
                      }
                    };
                    setCurrentUser(updatedUser);
                  }}
                  className="w-full p-2 rounded-md border dark:border-gray-700 bg-background"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Layout Mode</Label>
                <select
                  value={currentUser.preferences?.layout || 'default'}
                  onChange={(e) => {
                    const updatedUser = {
                      ...currentUser,
                      preferences: {
                        ...currentUser.preferences,
                        layout: e.target.value as UserPreferences['layout']
                      }
                    };
                    setCurrentUser(updatedUser);
                  }}
                  className="w-full p-2 rounded-md border dark:border-gray-700 bg-background"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="wide">Wide</option>
                  <option value="stacked">Stacked</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Auto-save Settings</h3>
              
              <div className="space-y-2">
                <Label>Auto-save Interval</Label>
                <select
                  value={currentUser.preferences?.autoSaveInterval || 300000}
                  onChange={(e) => {
                    const updatedUser = {
                      ...currentUser,
                      preferences: {
                        ...currentUser.preferences,
                        autoSaveInterval: parseInt(e.target.value)
                      }
                    };
                    setCurrentUser(updatedUser);
                  }}
                  className="w-full p-2 rounded-md border dark:border-gray-700 bg-background"
                >
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={600000}>10 minutes</option>
                  <option value={1800000}>30 minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save on Close</Label>
                  <p className="text-sm text-muted-foreground">
                    Save changes when closing projects
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences?.autoSave || false}
                  onCheckedChange={(checked) => {
                    const updatedUser = {
                      ...currentUser,
                      preferences: {
                        ...currentUser.preferences,
                        autoSave: checked
                      }
                    };
                    setCurrentUser(updatedUser);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Project Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Project Path</Label>
                  <p className="text-sm text-muted-foreground">
                    Display full path in project list
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences?.showProjectPath || false}
                  onCheckedChange={(checked) => {
                    const updatedUser = {
                      ...currentUser,
                      preferences: {
                        ...currentUser.preferences,
                        showProjectPath: checked
                      }
                    };
                    setCurrentUser(updatedUser);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Recent Projects</Label>
                  <p className="text-sm text-muted-foreground">
                    Display recently opened projects
                  </p>
                </div>
                <Switch
                  checked={currentUser.preferences?.showRecentProjects || false}
                  onCheckedChange={(checked) => {
                    const updatedUser = {
                      ...currentUser,
                      preferences: {
                        ...currentUser.preferences,
                        showRecentProjects: checked
                      }
                    };
                    setCurrentUser(updatedUser);
                  }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}