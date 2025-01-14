import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCanvasSettings } from '@/store/settings';
import { useServices } from '@/services/manager';
import { validateCanvasConfig } from '@/utils/settings-validation';
import type { CanvasConfig } from '@/types/settings';
import type { CanvasSettingsModalProps } from './types';
import { CLOUD_OPTIONS, REGION_OPTIONS, MODEL_OPTIONS } from './constants';
import ErrorBoundary from '@/components/ErrorBoundary';

export function CanvasSettingsModal({ isOpen, onClose, canvasId }: CanvasSettingsModalProps) {
  const { config: initialConfig, updateConfig } = useCanvasSettings(canvasId);
  const [config, setConfig] = useState<CanvasConfig | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig(initialConfig);
      setValidationError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialConfig]);

  const handleSave = async () => {
    if (!config) return;

    setLoading(true);
    setValidationError(null);
    setSuccessMessage(null);

    try {
      await validateCanvasConfig(config);
      await updateConfig(canvasId, config);
      const services = useServices(canvasId);
      await services.validate();
      setSuccessMessage('Settings saved and validated successfully');
      onClose();
    } catch (error) {
      console.error('Settings save error:', error);
      setValidationError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (!config) return null;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Canvas Settings</AlertDialogTitle>
          <AlertDialogDescription>
            Configure API keys and settings for this canvas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="api">
          <TabsList>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="vector">Vector DB</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Anthropic API Key</Label>
                <Input
                  type="password"
                  value={config.llm.apiKey || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    llm: { ...prev.llm, apiKey: e.target.value }
                  } : null)}
                  placeholder="sk-..."
                />
              </div>

              <div>
                <Label>Voyage AI API Key</Label>
                <Input
                  type="password"
                  value={config.embedding.apiKey || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    embedding: { ...prev.embedding, apiKey: e.target.value }
                  } : null)}
                  placeholder="vg-..."
                />
              </div>

              <div>
                <Label>Pinecone API Key</Label>
                <Input
                  type="password"
                  value={config.vectordb.apiKey || ''}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    vectordb: { ...prev.vectordb, apiKey: e.target.value }
                  } : null)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>LLM Model</Label>
                <Select 
                  value={`${config.llm.provider}/${config.llm.modelId}`}
                  onValueChange={(value) => {
                    const [provider, modelId] = value.split('/');
                    setConfig(prev => prev ? {
                      ...prev,
                      llm: {
                        ...prev.llm,
                        provider: provider as typeof prev.llm.provider,
                        modelId
                      }
                    } : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((model) => (
                      <SelectItem 
                        key={`${model.provider}/${model.id}`} 
                        value={`${model.provider}/${model.id}`}
                      >
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.llm.temperature}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    llm: { ...prev.llm, temperature: parseFloat(e.target.value) }
                  } : null)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vector" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Index Name</Label>
                <Input
                  value={config.vectordb.indexName}
                  onChange={(e) => setConfig(prev => prev ? {
                    ...prev,
                    vectordb: { ...prev.vectordb, indexName: e.target.value }
                  } : null)}
                />
              </div>

              <div>
                <Label>Cloud Provider</Label>
                <Select
                  value={config.vectordb.cloud}
                  onValueChange={(value) => {
                    setConfig(prev => prev ? {
                      ...prev,
                      vectordb: {
                        ...prev.vectordb,
                        cloud: value,
                        region: REGION_OPTIONS[value as keyof typeof REGION_OPTIONS][0].value
                      }
                    } : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOUD_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Region</Label>
                <Select
                  value={config.vectordb.region}
                  onValueChange={(value) => setConfig(prev => prev ? {
                    ...prev,
                    vectordb: { ...prev.vectordb, region: value }
                  } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS[config.vectordb.cloud as keyof typeof REGION_OPTIONS]?.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CanvasSettingsModalWithErrorBoundary(props: CanvasSettingsModalProps) {
  return (
    <ErrorBoundary>
      <CanvasSettingsModal {...props} />
    </ErrorBoundary>
  );
}