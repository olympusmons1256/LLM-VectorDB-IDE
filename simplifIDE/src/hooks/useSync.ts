import { useEffect } from 'react';
import { dispatchEvent, EventType } from '../utils/events';
import { saveCanvas } from '../utils/persistence';

export function useSync(canvasId: string, componentType: string, state: any) {
  useEffect(() => {
    dispatchEvent(EventType.ComponentMounted, {
      canvasId,
      componentType,
      state,
    });

    return () => {
      dispatchEvent(EventType.ComponentUnmounted, {
        canvasId,
        componentType,
      });
    };
  }, [canvasId, componentType, state]);

  useEffect(() => {
    const canvas = getCanvas(canvasId);
    if (canvas) {
      const updatedCanvas = {
        ...canvas,
        componentState: {
          ...canvas.componentState,
          [componentType]: state,
        },
      };
      saveCanvas(updatedCanvas);
    }
  }, [canvasId, componentType, state]);
}