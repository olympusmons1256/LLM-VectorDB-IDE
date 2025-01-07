'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, X, Move } from 'lucide-react';

interface SectionLayout {
  id: string;
  title: string;
  isVisible: boolean;
  isDetached: boolean;
  order: number;
  width: number;
  content: React.ReactNode;
}

interface ResponsiveLayoutProps {
  children: React.ReactNode[];
  titles: string[];
}

const DEFAULT_WIDTH = 1200;
const MIN_SECTION_WIDTH = 250;

function SectionHeader({
  title,
  onClose,
  onDetach,
  onCollapse,
  isDetached,
  isCollapsed
}: {
  title: string;
  onClose?: () => void;
  onDetach?: () => void;
  onCollapse: () => void;
  isDetached?: boolean;
  isCollapsed: boolean;
}) {
  return (
    <div className="h-10 flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
      <div className="flex items-center gap-2">
        <Move className="h-4 w-4 text-gray-500 cursor-move" />
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      <div className="flex items-center gap-1">
        {onDetach && (
          <button
            onClick={onDetach}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title={isDetached ? "Dock window" : "Detach window"}
          >
            {isDetached ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={onCollapse}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function DetachedWindow({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const win = window.open('', title, 'width=800,height=600');
    if (win) {
      win.document.head.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
          :root {
            color-scheme: light dark;
          }
          body { 
            margin: 0; 
            font-family: Inter, system-ui, sans-serif;
            background: #ffffff;
            color: #000000;
            height: 100vh;
            overflow: hidden;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background: #1a1a1a;
              color: #ffffff;
            }
          }
          .detached-window { 
            padding: 16px;
            height: 100vh;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .content-wrapper {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            background: #ffffff;
            border-radius: 8px;
          }
          @media (prefers-color-scheme: dark) {
            .content-wrapper {
              background: #1a1a1a;
            }
          }
        </style>
      `;

      const container = win.document.createElement('div');
      container.className = 'detached-window';
      win.document.body.appendChild(container);

      const content = win.document.createElement('div');
      content.className = 'content-wrapper';
      container.appendChild(content);

      const cleanup = () => {
        onClose();
        win.close();
      };

      win.addEventListener('beforeunload', cleanup);
      return () => {
        win.removeEventListener('beforeunload', cleanup);
        win.close();
      };
    }
  }, [title, children, onClose]);

  return null;
}

const Section = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    children: React.ReactNode;
    onClose?: () => void;
    onDetach?: () => void;
    isDetached?: boolean;
    index?: number;
    onDragStart?: (e: React.DragEvent, index: number) => void;
    onDragOver?: (e: React.DragEvent, index: number) => void;
    onDragEnd?: () => void;
  }
>(({
  title,
  children,
  onClose,
  onDetach,
  isDetached,
  index,
  onDragStart,
  onDragOver,
  onDragEnd
}, ref) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div 
      ref={ref}
      className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg"
      draggable={!isDetached}
      onDragStart={(e) => index !== undefined && onDragStart?.(e, index)}
      onDragOver={(e) => index !== undefined && onDragOver?.(e, index)}
      onDragEnd={onDragEnd}
    >
      <SectionHeader
        title={title}
        onClose={onClose}
        onDetach={onDetach}
        onCollapse={() => setIsCollapsed(!isCollapsed)}
        isDetached={isDetached}
        isCollapsed={isCollapsed}
      />
      <div 
        className={`flex-1 min-h-0 overflow-hidden transition-all duration-200 ${
          isCollapsed ? 'h-0' : 'h-[calc(100%-2.5rem)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
});
Section.displayName = 'Section';

export function ResponsiveLayout({ children, titles }: ResponsiveLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [sections, setSections] = useState<SectionLayout[]>(() => 
    children.map((child, i) => ({
      id: `section-${i}`,
      title: titles[i] || `Section ${i + 1}`,
      content: child,
      isVisible: true,
      isDetached: false,
      order: i,
      width: DEFAULT_WIDTH / children.length
    }))
  );

  const calculateSectionWidths = useCallback(() => {
    if (!containerRef.current) return null;
    
    const totalWidth = containerRef.current.clientWidth;
    const visibleCount = sections.filter(s => s.isVisible && !s.isDetached).length;
    if (visibleCount === 0) return null;

    return Math.max(MIN_SECTION_WIDTH, totalWidth / visibleCount);
  }, [sections]);

  const handleResize = useCallback(() => {
    const newWidth = calculateSectionWidths();
    if (!newWidth) return;

    setSections(prev => {
      const firstSection = prev.find(s => s.isVisible && !s.isDetached);
      if (firstSection && Math.abs(firstSection.width - newWidth) < 1) return prev;

      return prev.map(section => ({
        ...section,
        width: section.isVisible && !section.isDetached ? newWidth : section.width
      }));
    });
  }, [calculateSectionWidths]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, hoverIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== hoverIndex) {
      setSections(prev => {
        const newSections = [...prev];
        const [draggedSection] = newSections.splice(draggedIndex, 1);
        newSections.splice(hoverIndex, 0, draggedSection);
        return newSections.map((section, index) => ({
          ...section,
          order: index
        }));
      });
      setDraggedIndex(hoverIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleClose = (index: number) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, isVisible: false } : section
    ));
  };

  const handleDetach = (index: number) => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, isDetached: !section.isDetached } : section
    ));
  };

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="flex flex-1 min-h-0 gap-4 p-4 max-w-[1200px] w-full mx-auto overflow-hidden"
      >
        {sections.map((section, index) => {
          if (section.isDetached) {
            return (
              <DetachedWindow
                key={section.id}
                title={section.title}
                onClose={() => handleDetach(index)}
              >
                <Section
                  title={section.title}
                  onClose={() => handleClose(index)}
                  onDetach={() => handleDetach(index)}
                  isDetached={true}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  {section.content}
                </Section>
              </DetachedWindow>
            );
          }

          return section.isVisible ? (
            <div 
              key={section.id}
              style={{ width: section.width }} 
              className="flex-shrink-0 h-full min-h-0"
            >
              <Section
                title={section.title}
                onClose={() => handleClose(index)}
                onDetach={() => handleDetach(index)}
                index={index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                {section.content}
              </Section>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}

export default ResponsiveLayout;