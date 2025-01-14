// src/context/SaveStateContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import { localStorageUtil } from '@/lib/localStorage';
import { SaveStateContextType } from '@/lib/types';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/hooks/useAuth';

// Create the context with a default value
export const SaveStateContext = createContext<SaveStateContextType>({
  saveState: () => {},
  loadState: () => null,
  clearState: () => {},
  getCurrentState: () => ({})
});

export const SaveStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectState, setProjectState] = useState<Record<string, any>>({});
  const { currentProject } = useProject();
  const { user } = useAuth();

  // Generate a unique storage key based on the current project and user
  const getProjectStateKey = () => {
    if (!currentProject || !user) return null;
    return `project-${currentProject.id}-user-${user.id}-state`;
  };

  // Load project state when project or user changes
  useEffect(() => {
    // Reset state if no current project or user
    if (!currentProject || !user) {
      setProjectState({});
      return;
    }

    const stateKey = getProjectStateKey();
    if (!stateKey) return;

    // Try to load state from localStorage
    const savedState = localStorageUtil.getItem<Record<string, any>>(stateKey);
    
    console.log('Loading project state:', {
      key: stateKey,
      savedState
    });

    if (savedState) {
      setProjectState(savedState);
    } else {
      // Initialize empty state if no saved state exists
      setProjectState({});
    }
  }, [currentProject, user]);

  const saveState = (key: string, value: any) => {
    // Ensure we have a project and user before saving
    if (!currentProject || !user) {
      console.warn('Cannot save state: No current project or user');
      return;
    }

    const stateKey = getProjectStateKey();
    if (!stateKey) return;

    // Create new state object
    const newState = { ...projectState, [key]: value };
    
    console.log('Saving project state:', {
      key: stateKey,
      state: newState
    });

    // Update local state
    setProjectState(newState);
    
    // Save to localStorage
    localStorageUtil.setItem(stateKey, newState);
  };

  const loadState = (key: string) => {
    console.log('Loading state for key:', key);
    console.log('Current project state:', projectState);
    return projectState[key] || null;
  };

  const clearState = () => {
    if (!currentProject || !user) return;

    const stateKey = getProjectStateKey();
    if (!stateKey) return;

    setProjectState({});
    localStorageUtil.removeItem(stateKey);
  };

  const getCurrentState = () => {
    return projectState;
  };

  const value = {
    saveState,
    loadState,
    clearState,
    getCurrentState
  };

  return <SaveStateContext.Provider value={value}>{children}</SaveStateContext.Provider>;
};