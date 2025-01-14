// src/pages/settings/[id].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useCanvasSettings } from '@/store/settings';
import { MODEL_OPTIONS, type CanvasConfig, type ModelOption } from '@/types/settings';
import { useServices } from '@/services/manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader } from 'lucide-react';

const CanvasSettings = () => {
  const router = useRouter();
  const { id } = router.query;
  const canvasId = id as string;

  const { config, updateConfig } = useCanvasSettings(canvasId);
  const { validate } = useServices(canvasId);
  
  const [settings, setSettings] = useState<CanvasConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setSettings(config);
    }
  }, [config]);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateConfig(canvasId, settings);
      setSuccessMessage('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!settings) return;

    setIsValidating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const isValid = await validate();
      if (isValid) {
        setSuccessMessage('Configuration validated successfully');
      } else {
        setError('Configuration validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Canvas Settings</h1>
        <p className="text-gray-600">Configure API keys and service settings for this canvas</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="api-keys">
        <TabsList className="mb-4">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="vector-db">Vector DB</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="embedding-api-key">Voyage AI API Key</Label>
                <Input
                  id="embedding-api-key"
                  type="password"
                  value={settings.embedding.apiKey || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    embedding: {
                      ...settings.embedding,
                      apiKey: e.target.value
                    }
                  })}
                  placeholder="Enter your Voyage AI API key"
                />
              </div>

              <div>
                <Label htmlFor="vector-api-key">Pinecone API Key</Label>
                <Input
                  id="vector-api-key"
                  type="password"
                  value={settings.vectordb.apiKey || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    vectordb: {
                      ...settings.vectordb,
                      apiKey: e.target.value
                    }
                  })}
                  placeholder="Enter your Pinecone API key"
                />
              </div>

              <div>
                <Label htmlFor="llm-api-key">LLM API Key</Label>
                <Input
                  id="llm-api-key"
                  type="password"
                  value={settings.llm.apiKey || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    llm: {
                      ...settings.llm,
                      apiKey: e.target.value
                    }
                  })}
                  placeholder="Enter your LLM API key"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vector-db">
          <Card>
            <CardHeader>
              <CardTitle>Vector Database Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="index-name">Index Name</Label>
                <Input
                  id="index-name"
                  value={settings.vectordb.indexName}
                  onChange={(e) => setSettings({
                    ...settings,
                    vectordb: {
                      ...settings.vectordb,
                      indexName: e.target.value
                    }
                  })}
                  placeholder="Enter your Pinecone index name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cloud">Cloud Provider</Label>
                  <Select
                    value={settings.vectordb.cloud}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      vectordb: {
                        ...settings.vectordb,
                        cloud: value
                      }
                    })}
                  >
                    <SelectTrigger id="cloud">
                      <SelectValue placeholder="Select cloud provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">AWS</SelectItem>
                      <SelectItem value="gcp">GCP</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={settings.vectordb.region}
                    onChange={(e) => setSettings({
                      ...settings,
                      vectordb: {
                        ...settings.vectordb,
                        region: e.target.value
                      }
                    })}
                    placeholder="e.g., us-west-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="llm-model">LLM Model</Label>
                <Select
                  value={`${settings.llm.provider}/${settings.llm.modelId}`}
                  onValueChange={(value) => {
                    const [provider, modelId] = value.split('/');
                    setSettings({
                      ...settings,
                      llm: {
                        ...settings.llm,
                        provider: provider as ModelOption['provider'],
                        modelId
                      }
                    });
                  }}
                >
                  <SelectTrigger id="llm-model">
                    <SelectValue placeholder="Select LLM model" />
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
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.llm.temperature}
                  onChange={(e) => setSettings({
                    ...settings,
                    llm: {
                      ...settings.llm,
                      temperature: parseFloat(e.target.value)
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max-steps">Maximum Plan Steps</Label>
                <Input
                  id="max-steps"
                  type="number"
                  min="1"
                  value={settings.planExecution.maxSteps}
                  onChange={(e) => setSettings({
                    ...settings,
                    planExecution: {
                      ...settings.planExecution,
                      maxSteps: parseInt(e.target.value)
                    }
                  })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-execute"
                  checked={settings.planExecution.autoExecute}
                  onChange={(e) => setSettings({
                    ...settings,
                    planExecution: {
                      ...settings.planExecution,
                      autoExecute: e.target.checked
                    }
                  })}
                  className="form-checkbox"
                />
                <Label htmlFor="auto-execute">Auto-execute plans</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving || isValidating}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={handleValidate}
          disabled={isSaving || isValidating}
        >
          {isValidating ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            'Validate Configuration'
          )}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isValidating}
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
};

export default CanvasSettings;