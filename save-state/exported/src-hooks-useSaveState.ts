// hooks/useSaveState.ts
import { useContext } from 'react';
import { SaveStateContext } from '@/context/SaveStateContext';

export const useSaveState = () => {
  const context = useContext(SaveStateContext);
  
  if (!context) {
    throw new Error('useSaveState must be used within a SaveStateProvider');
  }
  
  return context;
};