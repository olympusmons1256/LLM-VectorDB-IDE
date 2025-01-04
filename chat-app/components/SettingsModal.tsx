// components/SettingsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import type { VectorDBConfig } from '@/types/settings';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface APIKeys {
  anthropic?: string;
  openai?: string;
  voyage?: string;
  pinecone?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: APIKeys;
  vectorDBConfig: VectorDBConfig;
  onSave: (keys: APIKeys, config: VectorDBConfig) => void;
}

const CLOUD_OPTIONS = [
  { value: 'aws', label: 'AWS' },
  { value: 'gcp', label: 'Google Cloud' },
  { value: 'azure', label: 'Azure' }
] as const;

const REGION_OPTIONS = {
  aws: [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' }
  ],
  gcp: [
    { value: 'us-central1', label: 'US Central (Iowa)' },
    { value: 'us-east1', label: 'US East (South Carolina)' },
    { value: 'europe-west1', label: 'Europe West (Belgium)' },
    { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' }
  ],
  azure: [
    { value: 'eastus', label: 'East US' },
    { value: 'westus2', label: 'West US 2' },
    { value: 'northeurope', label: 'North Europe' },
    { value: 'southeastasia', label: 'Southeast Asia' }
  ]
} as const;

const SERVERLESS_CONFIG = {
  apiKeys: {
    anthropic: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
    voyage: process.env.NEXT_PUBLIC_VOYAGE_API_KEY,
    pinecone: process.env.NEXT_PUBLIC_PINECONE_API_KEY
  },
  vectordb: {
    cloud: process.env.NEXT_PUBLIC_PINECONE_CLOUD || 'gcp',
    region: process.env.NEXT_PUBLIC_PINECONE_REGION || 'us-central1',
    indexName: process.env.NEXT_PUBLIC_PINECONE_INDEX || 'simplifide'
  }
};

export function SettingsModal({ 
  isOpen, 
  onClose, 
  apiKeys, 
  vectorDBConfig,
  onSave 
}: SettingsModalProps) {
  const [isServerless, setIsServerless] = useState(false);
  const [keys, setKeys] = useState<APIKeys>(apiKeys);
  const [config, setConfig] = useState<VectorDBConfig>(vectorDBConfig);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debug log to verify environment variables
  useEffect(() => {
    console.log('Environment variables available:', {
      anthropic: !!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
      voyage: !!process.env.NEXT_PUBLIC_VOYAGE_API_KEY,
      pinecone: !!process.env.NEXT_PUBLIC_PINECONE_API_KEY,
      cloud: process.env.NEXT_PUBLIC_PINECONE_CLOUD,
      region: process.env.NEXT_PUBLIC_PINECONE_REGION,
      index: process.env.NEXT_PUBLIC_PINECONE_INDEX
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setKeys(apiKeys);
      setConfig(vectorDBConfig);
      setValidationError(null);
      setIsServerless(false);
    }
  }, [isOpen, apiKeys, vectorDBConfig]);

  useEffect(() => {
    if (isServerless && SERVERLESS_CONFIG.apiKeys) {
      setKeys({
        ...keys,
        anthropic: SERVERLESS_CONFIG.apiKeys.anthropic,
        voyage: SERVERLESS_CONFIG.apiKeys.voyage,
        pinecone: SERVERLESS_CONFIG.apiKeys.pinecone
      });
      setConfig({
        cloud: SERVERLESS_CONFIG.vectordb.cloud as string,
        region: SERVERLESS_CONFIG.vectordb.region,
        indexName: SERVERLESS_CONFIG.vectordb.indexName
      });
    }
  }, [isServerless]);

  const validateSettings = () => {
    if (isServerless) {
      if (!SERVERLESS_CONFIG.apiKeys?.anthropic || 
          !SERVERLESS_CONFIG.apiKeys?.pinecone || 
          !SERVERLESS_CONFIG.apiKeys?.voyage) {
        setValidationError('Serverless configuration is incomplete. Please check environment variables.');
        return false;
      }
      return true;
    }

    if (!keys.anthropic?.trim()) {
      setValidationError('Anthropic API Key is required');
      return false;
    }
    if (!keys.pinecone?.trim()) {
      setValidationError('Pinecone API Key is required');
      return false;
    }
    if (!keys.voyage?.trim()) {
      setValidationError('Voyage API Key is required');
      return false;
    }
    if (!config.indexName?.trim()) {
      setValidationError('Vector DB Index Name is required');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (validateSettings()) {
      onSave(keys, config);
    }
  };

  const canEnableServerless = Boolean(
    SERVERLESS_CONFIG.apiKeys?.anthropic &&
    SERVERLESS_CONFIG.apiKeys?.pinecone &&
    SERVERLESS_CONFIG.apiKeys?.voyage
  );

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Settings</AlertDialogTitle>
          <AlertDialogDescription>
            Configure your API keys and vector database settings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="border-b pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Serverless Mode</h3>
              <p className="text-sm text-muted-foreground">
                Use preconfigured serverless endpoints
              </p>
              {!canEnableServerless && (
                <p className="text-sm text-red-500">
                  Serverless mode not available - environment variables not configured
                </p>
              )}
            </div>
            <Switch
              checked={isServerless}
              onCheckedChange={setIsServerless}
              disabled={!canEnableServerless}
            />
          </div>
        </div>

        <div className="grid gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">LLM Providers</h3>
            <div className="grid gap-4">
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Anthropic API Key {isServerless && '(Serverless)'}
                </Label>
                <input
                  type="password"
                  value={keys.anthropic || ''}
                  onChange={(e) => setKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  placeholder="sk-..."
                  disabled={isServerless}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-1">
                  OpenAI API Key (Optional)
                </Label>
                <input
                  type="password"
                  value={keys.openai || ''}
                  onChange={(e) => setKeys(prev => ({ ...prev, openai: e.target.value }))}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  placeholder="sk-..."
                  disabled={isServerless}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vector Database</h3>
            <div className="grid gap-4">
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Voyage AI API Key {isServerless && '(Serverless)'}
                </Label>
                <input
                  type="password"
                  value={keys.voyage || ''}
                  onChange={(e) => setKeys(prev => ({ ...prev, voyage: e.target.value }))}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  placeholder="vg-..."
                  disabled={isServerless}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Pinecone API Key {isServerless && '(Serverless)'}
                </Label>
                <input
                  type="password"
                  value={keys.pinecone || ''}
                  onChange={(e) => setKeys(prev => ({ ...prev, pinecone: e.target.value }))}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  placeholder="..."
                  disabled={isServerless}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Index Name {isServerless && '(Serverless)'}
                </Label>
                <input
                  type="text"
                  value={config.indexName || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, indexName: e.target.value }))}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  placeholder="e.g., my-vector-index"
                  disabled={isServerless}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Cloud Provider {isServerless && '(Serverless)'}
                </Label>
                <select
                  value={config.cloud || 'aws'}
                  onChange={(e) => {
                    const newCloud = e.target.value as keyof typeof REGION_OPTIONS;
                    setConfig(prev => ({
                      ...prev,
                      cloud: newCloud,
                      region: REGION_OPTIONS[newCloud][0].value
                    }));
                  }}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  disabled={isServerless}
                >
                  {CLOUD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-1">
                  Region {isServerless && '(Serverless)'}
                </Label>
                <select
                  value={config.region || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full p-2 border rounded dark:border-gray-600 dark:bg-gray-700"
                  disabled={isServerless}
                >
                  {REGION_OPTIONS[config.cloud as keyof typeof REGION_OPTIONS]?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>
            Save Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}