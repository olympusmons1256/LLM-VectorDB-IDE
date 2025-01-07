// components/layout/types.ts
export type LayoutMode = 'default' | 'compact' | 'wide' | 'stacked';

export interface LayoutState {
  mode: LayoutMode;
  leftSidebarWidth?: number;
  rightSidebarWidth?: number;
  leftSidebarVisible?: boolean;
  rightSidebarVisible?: boolean;
}