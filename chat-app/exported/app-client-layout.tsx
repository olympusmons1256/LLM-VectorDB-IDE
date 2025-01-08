'use client';

import { useEffect, useState } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { useSaveStateStore } from '@/store/save-state-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MainHeader } from '@/components/MainHeader';

interface ClientLayoutProps {
  children: React.ReactNode;
}

function UserSetupDialog() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const setCurrentUser = useSaveStateStore(state => state.setCurrentUser);

  const handleSetupUser = () => {
    if (!name.trim()) return;

    setCurrentUser({
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim() || undefined,
      preferences: {
        theme: 'dark',
        fontSize: 'medium',
        layout: 'default',
        autoSave: true,
        autoSaveInterval: 300000,
        showProjectPath: true,
        showRecentProjects: true
      },
      lastActive: new Date().toISOString()
    });
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to simplifIDE</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSetupUser} disabled={!name.trim()}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { currentUser, autoSaveEnabled } = useSaveStateStore();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useSaveStateStore.getState().pendingChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!autoSaveEnabled || !currentUser) return;

    const autoSaveInterval = setInterval(() => {
      const state = useSaveStateStore.getState();
      if (state.pendingChanges && state.activeProject) {
        state.saveProject(state.activeProject, {}).catch(console.error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(autoSaveInterval);
  }, [autoSaveEnabled, currentUser]);

  console.log('ClientLayout State:', { currentUser, autoSaveEnabled });

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem 
      disableTransitionOnChange
    >
      <div className="h-full flex flex-col">
        {!currentUser ? (
          <UserSetupDialog />
        ) : (
          <>
            <MainHeader />
            <main className="flex-1 min-h-0">
              {children}
            </main>
          </>
        )}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}