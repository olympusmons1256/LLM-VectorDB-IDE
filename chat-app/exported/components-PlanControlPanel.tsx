// components/PlanControlPanel.tsx
import React from 'react';
import { Play, StepForward, Loader2 } from 'lucide-react';

interface PlanControlPanelProps {
  onExecuteNext: () => void;
  onAutoExecute: () => void;
  isProcessing?: boolean;
}

export function PlanControlPanel({ 
  onExecuteNext, 
  onAutoExecute,
  isProcessing = false 
}: PlanControlPanelProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium mb-1">Plan Execution Controls</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Choose how to proceed with the plan implementation
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={onExecuteNext}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white 
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'} 
              transition-colors`}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <StepForward className="h-4 w-4" />
            )}
            Execute Next Step
          </button>
          <button
            onClick={onAutoExecute}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500 text-white 
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'} 
              transition-colors`}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Auto-pilot Plan
          </button>
        </div>
      </div>
      {isProcessing && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Processing plan execution...
        </div>
      )}
    </div>
  );
}

export type { PlanControlPanelProps };
export default PlanControlPanel;