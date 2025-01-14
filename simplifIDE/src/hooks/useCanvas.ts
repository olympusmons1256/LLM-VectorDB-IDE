// src/hooks/useCanvas.ts
import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@/types';
import { useCanvasList } from '@/components/AppHeader/store';

export function useCanvas(id: string) {
  console.log('useCanvas hook called with id:', id);
  const { canvases, getCanvas, updateCanvas } = useCanvasList();
  const [canvas, setCanvas] = useState<Canvas | null>(() => {
    console.log('Initial state calculation');
    const initialCanvas = getCanvas(id);
    console.log('Initial canvas:', initialCanvas);
    return initialCanvas;
  });
  const [loading, setLoading] = useState(!canvas);
  const [error, setError] = useState<string | null>(null);

  const loadCanvas = useCallback(async () => {
    console.log('loadCanvas called, current state:', { canvas, loading, error });
    if (!canvas && !error) {
      setLoading(true);
      try {
        console.log('Attempting to load canvas with id:', id);
        const foundCanvas = getCanvas(id);
        console.log('Found canvas:', foundCanvas);
        
        if (foundCanvas) {
          setCanvas(foundCanvas);
          setError(null);
        } else {
          console.log('Canvas not found');
          setError('Canvas not found');
        }
      } catch (err) {
        console.error('Error loading canvas:', err);
        setError('Failed to load canvas');
      } finally {
        setLoading(false);
      }
    }
  }, [id, canvas, error, getCanvas]);

  useEffect(() => {
    console.log('useEffect running, current state:', { canvas, loading, error });
    loadCanvas();
  }, [loadCanvas]);

  const handleUpdateCanvas = (updatedCanvas: Canvas) => {
    console.log('Updating canvas:', updatedCanvas);
    updateCanvas(updatedCanvas.id, updatedCanvas);
    setCanvas(updatedCanvas);
  };

  console.log('useCanvas hook returning state:', { canvas, loading, error });
  return {
    canvas,
    loading,
    error,
    updateCanvas: handleUpdateCanvas,
  };
}