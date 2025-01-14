// src/utils/persistence.ts
import { Canvas } from '@/types';

export const saveCanvas = (canvas: Canvas): void => {
  try {
    const storage = localStorage.getItem('canvas-storage');
    const data = storage ? JSON.parse(storage) : { state: { canvases: {} } };
    
    data.state.canvases[canvas.id] = canvas;
    
    localStorage.setItem('canvas-storage', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save canvas:', error);
    throw error;
  }
};

export const getCanvas = (id: string): Canvas | null => {
  try {
    const storage = localStorage.getItem('canvas-storage');
    if (!storage) return null;

    const data = JSON.parse(storage);
    return data.state.canvases[id] || null;
  } catch (error) {
    console.error('Failed to get canvas:', error);
    throw error;
  }
};

export const getAllCanvases = (): Record<string, Canvas> => {
  try {
    const storage = localStorage.getItem('canvas-storage');
    if (!storage) return {};

    const data = JSON.parse(storage);
    return data.state.canvases || {};
  } catch (error) {
    console.error('Failed to get all canvases:', error);
    throw error;
  }
};

export const deleteCanvasFromStorage = (id: string): void => {
  try {
    const storedCanvases = getAllCanvases();
    delete storedCanvases[id];
    localStorage.setItem('canvas-storage', JSON.stringify({
      state: { canvases: storedCanvases }
    }));
  } catch (error) {
    console.error('Failed to delete canvas from storage:', error);
    throw error;
  }
};

export const clearCanvasStorage = (): void => {
  try {
    localStorage.removeItem('canvas-storage');
  } catch (error) {
    console.error('Failed to clear canvas storage:', error);
    throw error;
  }
};

export const migrateStorage = (version: string): void => {
  try {
    const storage = localStorage.getItem('canvas-storage');
    if (!storage) return;

    const data = JSON.parse(storage);
    data.version = version;
    
    localStorage.setItem('canvas-storage', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to migrate storage:', error);
    throw error;
  }
};