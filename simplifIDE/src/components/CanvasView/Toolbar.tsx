// src/components/CanvasView/Toolbar.tsx
import React, { useState, useCallback } from 'react';
import { Settings, Plus } from 'lucide-react';
import { ComponentType } from '@/types/canvas';
import { CanvasSettingsModal } from '@/components/Settings/CanvasSettingsModal';
import { useServices, ConfigurationError } from '@/services/manager';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ToolbarProps {
  onAddComponent: (type: ComponentType) => void;
  canvasId: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddComponent,
  canvasId
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToolRequest = useCallback(async (type: ComponentType) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      useServices(canvasId);
      onAddComponent(type);
      setConfigError(null);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        setConfigError(error.message);
        setShowSettings(true);
      } else {
        console.error('Error adding component:', error);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [canvasId, onAddComponent, isProcessing]);

  const components: { type: ComponentType; label: string; description: string }[] = [
    {
      type: 'chat',
      label: 'Chat',
      description: 'Add a real-time chat component'
    },
    {
      type: 'documents',
      label: 'Documents',
      description: 'Manage and edit documents'
    },
    {
      type: 'codeBlocks',
      label: 'Code Blocks',
      description: 'Write and share code snippets'
    },
    {
      type: 'plans',
      label: 'Plans',
      description: 'Create and track plans'
    }
  ];

  return (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      {configError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {configError}
            <Button
              variant="outline"
              size="sm"
              className="ml-2"
              onClick={() => setShowSettings(true)}
            >
              Configure Settings
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-4">
        {components.map(({ type, label, description }) => (
          <button
            key={type}
            onClick={() => handleToolRequest(type)}
            disabled={isProcessing}
            className="flex flex-col items-start p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group flex-1 min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-lg font-medium text-gray-800 group-hover:text-blue-600">
              {label}
            </span>
            <span className="text-sm text-gray-500 mt-1">
              {description}
            </span>
          </button>
        ))}

        <button
          onClick={() => setShowSettings(true)}
          className="flex flex-col justify-center items-center p-3 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors min-w-[100px]"
        >
          <Settings className="w-5 h-5 text-gray-600 mb-2" />
          <span className="text-sm font-medium text-gray-700">Settings</span>
        </button>
      </div>

      <CanvasSettingsModal 
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setConfigError(null);
        }}
        canvasId={canvasId}
      />
    </div>
  );
};

export default Toolbar;