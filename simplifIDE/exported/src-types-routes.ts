// src/types/routes.ts
export type AppRoutes = {
    canvas: {
      id: string;
    };
    settings: {
      id: string;
    };
  };
  
  export type RouteParams<T extends keyof AppRoutes> = AppRoutes[T];
  
  export function getSettingsRoute(canvasId: string): string {
    return `/settings/${canvasId}`;
  }
  
  export function getCanvasRoute(canvasId: string): string {
    return `/canvas/${canvasId}`;
  }