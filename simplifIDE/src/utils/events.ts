export const enum EventType {
    CanvasCreated = 'canvas-created',
    CanvasUpdated = 'canvas-updated',
    CanvasDeleted = 'canvas-deleted',
    ComponentMounted = 'component-mounted',
    ComponentUnmounted = 'component-unmounted',
    // Add more event types as needed
  }
  
  export function dispatchEvent(type: EventType, detail?: any): void {
    const event = new CustomEvent(type, { detail });
    document.dispatchEvent(event);
  }
  
  export function onEvent(type: EventType, handler: (event: CustomEvent) => void): void {
    document.addEventListener(type, handler as EventListener);
  }
  
  export function offEvent(type: EventType, handler: (event: CustomEvent) => void): void {
    document.removeEventListener(type, handler as EventListener);
  }