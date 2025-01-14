// src/components/CanvasView/index.tsx
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ComponentType } from '@/types/canvas';
import { useCanvasList } from '@/components/AppHeader/store';
import { useServices, ConfigurationError } from '@/services/manager';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toolbar } from './Toolbar';
import { CanvasSettingsModal } from '@/components/Settings/CanvasSettingsModal';

const Chat = lazy(() => import('@/components/Chat'));
const DocumentManager = lazy(() => import('@/components/DocumentManager'));
const CodeBlocks = lazy(() => import('@/components/CodeBlocks'));
const PlanManager = lazy(() => import('@/components/PlanManager'));

interface CanvasViewProps {
  canvasId: string;
  initialData?: any;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const ComponentWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4 p-4 bg-white rounded-lg shadow">
    <Suspense fallback={<LoadingSpinner />}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </Suspense>
  </div>
);

const CanvasView: React.FC<CanvasViewProps> = ({ canvasId, initialData }) => {
  const router = useRouter();
  const { canvases, getCanvas, updateCanvas, deleteCanvas } = useCanvasList();
  const [canvas, setCanvas] = useState(() => initialData || getCanvas(canvasId));
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(Boolean(router.query.settings));

  useEffect(() => {
    if (!canvas) {
      const loadCanvas = async () => {
        try {
          const foundCanvas = getCanvas(canvasId);
          if (foundCanvas) {
            setCanvas(foundCanvas);
            setError(null);
          } else {
            setError('Canvas not found');
          }
        } catch (err) {
          setError('Failed to load canvas');
        } finally {
          setLoading(false);
        }
      };

      loadCanvas();
    } else {
      setLoading(false);
    }
  }, [canvasId, canvas, getCanvas]);

  useEffect(() => {
    setShowSettings(Boolean(router.query.settings));
  }, [router.query.settings]);

  const handleDeleteCanvas = async () => {
    if (window.confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) {
      try {
        await deleteCanvas(canvas.id);
        router.push('/canvas');
      } catch (error) {
        console.error('Failed to delete canvas:', error);
        setError('Failed to delete canvas');
      }
    }
  };

  const handleToolRequest = async (type: ComponentType) => {
    if (canvas && !canvas.activeComponents.includes(type)) {
      console.log('Creating tool:', type);
      const updatedCanvas = {
        ...canvas,
        activeComponents: [...canvas.activeComponents, type]
      };
      updateCanvas(canvas.id, updatedCanvas);
      setCanvas(updatedCanvas);
    }
  };

  const handleComponentClose = (type: ComponentType) => {
    if (canvas) {
      console.log('Removing tool:', type);
      const updatedCanvas = {
        ...canvas,
        activeComponents: canvas.activeComponents.filter(t => t !== type)
      };
      updateCanvas(canvas.id, updatedCanvas);
      setCanvas(updatedCanvas);
    }
  };

  const getActiveTools = () => ({
    plans: canvas.activeComponents.includes('plans'),
    documents: canvas.activeComponents.includes('documents'),
    codeBlocks: canvas.activeComponents.includes('codeBlocks')
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Error</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={() => router.push('/canvas')}
          className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Return to Canvas List
        </button>
      </div>
    );
  }

  if (!canvas) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">Canvas Not Found</h3>
        <p className="text-yellow-600 mt-2">The requested canvas could not be found.</p>
        <button
          onClick={() => router.push('/canvas')}
          className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
        >
          Return to Canvas List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{canvas.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteCanvas}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete Canvas
          </button>
        </div>
      </div>

      <CanvasSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          const { pathname, query } = router;
          const { settings: _, ...restQuery } = query;
          router.replace({ pathname, query: restQuery }, undefined, { shallow: true });
        }}
        canvasId={canvasId}
      />

      <Toolbar 
        onAddComponent={handleToolRequest}
        canvasId={canvasId}
      />

      {canvas.activeComponents.map((type) => (
        <ComponentWrapper key={type}>
          <div className="relative">
            <button
              onClick={() => handleComponentClose(type)}
              className="absolute top-2 right-2 p-2 text-gray-500 hover:text-red-500"
              title="Remove component"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
            {(() => {
              const props = {
                id: canvasId,
                canvasId: canvasId,
                isActive: true,
                onActivate: () => handleToolRequest(type),
                onClose: () => handleComponentClose(type)
              };

              switch (type) {
                case 'chat':
                  return <Chat 
                    {...props} 
                    activeTools={getActiveTools()}
                    onToolRequest={handleToolRequest}
                  />;
                case 'documents':
                  return <DocumentManager {...props} />;
                case 'codeBlocks':
                  return <CodeBlocks {...props} />;
                case 'plans':
                  return <PlanManager {...props} />;
                default:
                  return null;
              }
            })()}
          </div>
        </ComponentWrapper>
      ))}
      
      {canvas.activeComponents.length === 0 && (
        <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow">
          <p className="mb-4">No tools are currently active on this canvas.</p>
          <p className="text-sm">Use the toolbar above to add tools to your canvas.</p>
        </div>
      )}
    </div>
  );
};

export default CanvasView;