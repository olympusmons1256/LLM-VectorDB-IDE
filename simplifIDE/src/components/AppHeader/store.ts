// src/components/AppHeader/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { User, Canvas } from '@/types';
import { saveCanvas as saveCanvasToStorage, getAllCanvases, deleteCanvasFromStorage } from '@/utils/persistence';

// User Store
interface UserState {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Canvas Store
interface CanvasState {
  canvases: Record<string, Canvas>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

interface CanvasActions {
  getCanvas: (id: string) => Canvas | null;
  createCanvas: (canvasData: Partial<Canvas>) => Canvas;
  updateCanvas: (id: string, updates: Partial<Canvas>) => void;
  deleteCanvas: (id: string) => Promise<void>;
  loadCanvases: () => Promise<void>;
}

export const useCanvasList = create<CanvasState & CanvasActions>()((set, get) => ({
  canvases: {},
  loading: false,
  error: null,
  initialized: false,

  getCanvas: (id: string) => {
    console.log('getCanvas called for id:', id);
    
    // If store isn't initialized, load canvases
    if (!get().initialized) {
      console.log('Store not initialized, loading canvases');
      get().loadCanvases();
    }

    const canvas = get().canvases[id];
    if (canvas) {
      console.log('Canvas found in store:', canvas);
      return canvas;
    }

    // Try to load from storage
    console.log('Canvas not in store, checking storage');
    const storedCanvases = getAllCanvases();
    const storedCanvas = storedCanvases[id];
    
    if (storedCanvas) {
      console.log('Canvas found in storage:', storedCanvas);
      // Update store with found canvas
      set(state => ({
        canvases: {
          ...state.canvases,
          [id]: storedCanvas
        }
      }));
      return storedCanvas;
    }

    console.log('Canvas not found anywhere');
    return null;
  },

  createCanvas: (canvasData) => {
    console.log('Creating new canvas with data:', canvasData);
    
    const newCanvas: Canvas = {
      id: uuidv4(),
      name: canvasData.name || 'Untitled Canvas',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      owner: canvasData.owner || '',
      activeComponents: canvasData.activeComponents || [],
      componentState: canvasData.componentState || {},
      componentSettings: canvasData.componentSettings || {},
      collaborators: canvasData.collaborators || [],
    };

    set(state => ({
      canvases: {
        ...state.canvases,
        [newCanvas.id]: newCanvas
      }
    }));

    // Save to storage
    saveCanvasToStorage(newCanvas);
    console.log('New canvas created and saved:', newCanvas);

    return newCanvas;
  },

  updateCanvas: (id, updates) => {
    const current = get().canvases[id];
    if (!current) return;

    const updated: Canvas = {
      ...current,
      ...updates,
      updated: new Date().toISOString()
    };

    set(state => ({
      canvases: {
        ...state.canvases,
        [id]: updated
      }
    }));

    saveCanvasToStorage(updated);
  },

  deleteCanvas: async (id) => {
    try {
      console.log('Deleting canvas:', id);

      // Update state first
      set(state => {
        const { [id]: removed, ...rest } = state.canvases;
        return { 
          canvases: rest,
          error: null
        };
      });

      // Then update storage
      deleteCanvasFromStorage(id);

      console.log('Canvas deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting canvas:', error);
      set({ error: 'Failed to delete canvas' });
      throw error;
    }
  },

  loadCanvases: async () => {
    console.log('Loading all canvases');
    set({ loading: true, error: null });
    
    try {
      const storedCanvases = getAllCanvases();
      console.log('Loaded canvases from storage:', storedCanvases);

      set({
        canvases: storedCanvases,
        loading: false,
        initialized: true,
        error: null
      });
    } catch (error) {
      console.error('Error loading canvases:', error);
      set({
        error: 'Failed to load canvases',
        loading: false,
        initialized: true
      });
    }
  }
}));