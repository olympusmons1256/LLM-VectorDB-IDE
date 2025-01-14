// components/UserInit.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInitializationStore } from '@/store/initialization-store';
import { useSaveStateStore } from '@/store/save-state-store';
import type { UserProfile } from '@/types/save-state';

export function UserInit() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { advanceStage } = useInitializationStore();
  const { currentUser, setCurrentUser } = useSaveStateStore();

  // Handle session restoration
  useEffect(() => {
    setMounted(true);
    const initSession = async () => {
      setLoading(true);
      try {
        // Check for existing session
        const savedUser = localStorage.getItem('simplifide-current-user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          await setCurrentUser(user);
          advanceStage(); // Move to project stage
          return;
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('simplifide-current-user');
        setError('Failed to restore session');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [setCurrentUser, advanceStage]);

  const handleSetupUser = async () => {
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Create user profile
      const user: UserProfile = {
        id: `user_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        preferences: {
          theme: 'dark',
          fontSize: 'medium',
          layout: 'default',
          autoSave: true,
          autoSaveInterval: 300000, // 5 minutes
          showProjectPath: true,
          showRecentProjects: true
        },
        lastActive: new Date().toISOString()
      };

      // Save user to local storage
      localStorage.setItem('simplifide-current-user', JSON.stringify(user));
      
      // Update store
      await setCurrentUser(user);

      // Advance to project stage
      advanceStage();

    } catch (error) {
      console.error('Error setting up user:', error);
      setError(error instanceof Error ? error.message : 'Failed to create user profile');
      setLoading(false);
    }
  };

  // Prevent closing dialog until user is set up
  const handleOpenChange = () => {
    // Dialog cannot be closed while loading or if user isn't set
    return !loading && currentUser !== null;
  };

  if (!mounted) return null;

  return (
    <Dialog open={!currentUser} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to simplifIDE</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSetupUser();
                }
              }}
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
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSetupUser();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSetupUser} 
            disabled={loading || !name.trim()}
          >
            {loading ? 'Setting up...' : 'Get Started'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}