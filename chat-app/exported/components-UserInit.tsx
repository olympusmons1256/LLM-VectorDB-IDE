// components/UserInit.tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveStateStore } from '@/store/save-state-store';

export function UserInit() {
  const [showUserSetup, setShowUserSetup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { currentUser, setCurrentUser } = useSaveStateStore();

  useEffect(() => {
    // Check if we need to show user setup
    if (!currentUser) {
      setShowUserSetup(true);
    }
  }, [currentUser]);

  const handleSetupUser = () => {
    if (!name.trim()) return;

    setCurrentUser({
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
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

    setShowUserSetup(false);
  };

  // Cannot be closed until user is set up
  return (
    <Dialog open={showUserSetup} onOpenChange={() => {}}>
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

// Update app/client-layout.tsx
'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { MainHeader } from '@/components/MainHeader';
import { UserInit } from '@/components/UserInit';
import { useSaveStateStore } from '@/store/save-state-store';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { currentUser, autoSaveEnabled } = useSaveStateStore();

  // Handle beforeunload event for unsaved changes
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

  // Set up auto-save logic
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

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="dark" 
      enableSystem 
      disableTransitionOnChange
    >
      <div className="h-full flex flex-col">
        {currentUser ? (
          <>
            <MainHeader />
            <main className="flex-1 min-h-0">
              {children}
            </main>
          </>
        ) : (
          <UserInit />
        )}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}