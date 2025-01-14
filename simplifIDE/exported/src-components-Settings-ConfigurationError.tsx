// src/components/settings/ConfigurationError.tsx
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CanvasSettingsModal } from './CanvasSettingsModal';
import type { ConfigurationErrorProps } from './types';

export function ConfigurationError({ canvasId, message }: ConfigurationErrorProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Required</h3>
            <p className="text-gray-500 mb-6">
              {message}
            </p>
            <Button
              onClick={() => setShowSettings(true)}
              className="bg-blue-500 text-white"
            >
              Configure Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <CanvasSettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        canvasId={canvasId}
      />
    </>
  );
}