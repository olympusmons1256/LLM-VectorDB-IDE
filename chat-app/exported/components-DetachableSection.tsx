'use client';

import React, { useState, useRef } from 'react';
import { Maximize2, Minimize2, X, Move } from 'lucide-react';

interface DetachableSectionProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onDetach?: () => void;
  isDetached?: boolean;
  index?: number;
  onMoveSection?: (dragIndex: number, hoverIndex: number) => void;
}

export const DetachableSection: React.FC<DetachableSectionProps> = ({
  title,
  children,
  onClose,
  onDetach,
  isDetached,
  index,
  onMoveSection
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent) => {
    if (typeof index === 'number') {
      e.dataTransfer.setData('text/plain', index.toString());
      dragRef.current = index;
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (typeof index === 'number' && dragRef.current !== null && onMoveSection) {
      onMoveSection(dragRef.current, index);
      dragRef.current = index;
    }
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div 
      className={`flex flex-col border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 
                ${isDragging ? 'opacity-50' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
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
              {isDetached ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
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
      <div 
        className={`flex-1 transition-all duration-200 overflow-hidden ${
          isCollapsed ? 'h-0' : 'h-auto'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export function DetachedWindow({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const win = window.open('', title, 'width=600,height=400');
    if (win) {
      // Inject styles and content
      win.document.body.innerHTML = `
        <div id="root"></div>
        <style>
          body { margin: 0; font-family: system-ui; }
          .detached-window { padding: 16px; }
        </style>
      `;
      
      const root = win.document.getElementById('root');
      if (root) {
        root.appendChild(
          <div className="detached-window">
            <DetachableSection title={title} onClose={onClose} isDetached>
              {children}
            </DetachableSection>
          </div>
        );
      }

      win.addEventListener('beforeunload', onClose);
    }
    
    return () => {
      if (win) {
        win.close();
      }
    };
  }, [title, children, onClose]);

  return null;
}

export default DetachableSection;