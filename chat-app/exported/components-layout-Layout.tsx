// components/layout/Layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { LayoutCustomizer } from './LayoutCustomizer';
import type { LayoutMode } from './types';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLayout = localStorage.getItem('layout-mode');
    if (savedLayout) {
      setLayoutMode(savedLayout as LayoutMode);
    }
    setMounted(true);
  }, []);

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('layout-mode', mode);
  };

  if (!mounted) return null;

  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'compact':
        return 'grid grid-cols-[200px,1fr,200px] gap-4';
      case 'wide':
        return 'grid grid-cols-[300px,1fr,300px] gap-4';
      case 'stacked':
        return 'grid grid-rows-[1fr,auto] max-w-[1200px] mx-auto gap-4';
      default:
        return 'grid grid-cols-[280px,1fr,280px] gap-4 max-w-[1400px] mx-auto';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LayoutCustomizer currentLayout={layoutMode} onLayoutChange={handleLayoutChange} />
      <main className={`p-4 ${getLayoutClasses()}`}>
        {children}
      </main>
    </div>
  );
}