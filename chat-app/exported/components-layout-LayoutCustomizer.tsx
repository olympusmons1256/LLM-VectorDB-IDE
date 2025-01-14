'use client';

import { Columns, MonitorSmartphone, LayoutDashboard, Monitor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LayoutMode } from './types';

interface LayoutCustomizerProps {
  onLayoutChange: (mode: LayoutMode) => void;
  currentLayout: LayoutMode;
}

const LAYOUT_OPTIONS = [
  { 
    id: 'default',
    icon: MonitorSmartphone,
    label: 'Default Layout'
  },
  {
    id: 'compact',
    icon: Columns,
    label: 'Compact Layout'
  },
  {
    id: 'wide',
    icon: Monitor,
    label: 'Wide Layout'
  },
  {
    id: 'stacked',
    icon: LayoutDashboard,
    label: 'Stacked Layout'
  }
] as const;

export function LayoutCustomizer({ onLayoutChange, currentLayout }: LayoutCustomizerProps) {
  return (
    <TooltipProvider>
      <div className="flex p-1 gap-1">
        {LAYOUT_OPTIONS.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onLayoutChange(id as LayoutMode)}
                className={`p-1 h-8 w-8 rounded-md flex items-center justify-center
                           transition-colors hover:bg-accent
                           ${currentLayout === id ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}