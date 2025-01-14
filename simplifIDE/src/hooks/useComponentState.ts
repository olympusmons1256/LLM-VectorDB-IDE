import { useState, useEffect } from 'react';
import { ComponentType, ComponentState } from '../types';
import { useCanvas } from './useCanvas';

export function useComponentState<T extends ComponentType>(
  canvasId: string,
  componentType: T
): [ComponentState[T] | undefined, (state: ComponentState[T]) => void] {
  const [canvas, updateCanvas] = useCanvas(canvasId);
  const [state, setState] = useState<ComponentState[T]>();

  useEffect(() => {
    if (canvas) {
      setState(canvas.componentState[componentType]);
    }
  }, [canvas, componentType]);

  function updateComponentState(newState: ComponentState[T]) {
    if (canvas) {
      const updatedCanvas = {
        ...canvas,
        componentState: {
          ...canvas.componentState,
          [componentType]: newState,
        },
      };
      updateCanvas(updatedCanvas);
    }
  }

  return [state, updateComponentState];
}