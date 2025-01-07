'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, Settings } from 'lucide-react';
import { Chat } from '@/components/Chat';
import { SettingsModal } from '@/components/SettingsModal';
import { CodeContainer } from '@/components/CodeContainer';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { PlanManager } from '@/components/PlanManager';
import { LayoutCustomizer } from '@/components/layout/LayoutCustomizer';
import { useChatStore, useCurrentProject } from '@/store/chat-store';
import type { LayoutMode } from '@/components/layout/types';
import type { Model } from '@/types/message';

const HEADER_HEIGHT = '48px';

interface Config {
  embedding: {
    provider: 'voyage';
  };
  vectordb: {
    provider: 'pinecone';
    cloud: string;
    region: string;
    indexName: string;
  };
  apiKeys: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
  };
}

export default function ChatPage() {
  const { theme, setTheme } = useTheme();
  const { messages, activePlan } = useCurrentProject();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const {
    isLoading,
    error,
    currentNamespace,
    showSettings,
    sidebarOpen,
    apiKeys,
    vectorDBConfig,
    setMessages,
    addMessage,
    setIsLoading,
    setError,
    setCurrentNamespace,
    setShowSettings,
    setSidebarOpen,
    setActivePlan,
    setAPIKeys,
    setVectorDBConfig
  } = useChatStore();

  const isConfigured = Boolean(
    apiKeys.anthropic && 
    apiKeys.pinecone && 
    apiKeys.voyage && 
    vectorDBConfig.indexName
  );

  useEffect(() => {
    if (!isConfigured) {
      setShowSettings(true);
    }
  }, [isConfigured, setShowSettings]);

  useEffect(() => {
    const savedLayout = localStorage.getItem('layout-mode');
    setLayoutMode(savedLayout as LayoutMode || 'default');
  }, []);

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('layout-mode', mode);
  };

  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'compact':
        return 'grid grid-cols-[400px,1fr,400px] max-w-[1700px]';
      case 'wide':
        return 'grid grid-cols-[700px,1fr,700px] max-w-[2300px]';
      case 'stacked':
        return 'grid grid-rows-[1fr,auto] max-w-[900px]';
      default:
        return 'grid grid-cols-[600px,minmax(0,1fr),600px] max-w-[2100px]';
    }
  };

  const handleSendMessage = async (content: string, selectedModel: Model) => {
    if (!content.trim() || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const newMessages = [...messages, { role: 'user', content }];
      setMessages(newMessages);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          model: selectedModel,
          namespace: currentNamespace || 'default',
          planContext: activePlan ? activePlan : undefined,
          apiKeys: {
            ...apiKeys,
            vectorIndexName: vectorDBConfig.indexName,
            vectorCloud: vectorDBConfig.cloud,
            vectorRegion: vectorDBConfig.region
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      addMessage(data);

    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfig = (): Config => ({
    embedding: { provider: 'voyage' },
    vectordb: { 
      provider: 'pinecone',
      cloud: vectorDBConfig.cloud,
      region: vectorDBConfig.region,
      indexName: vectorDBConfig.indexName
    },
    apiKeys
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex-none" style={{ height: HEADER_HEIGHT }}>
        <div className="flex items-center justify-between h-full px-4 border-b dark:border-gray-700 bg-background">
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)} />
            <div className="flex items-center gap-2">
              <span className="font-medium">simplifIDE</span>
              {currentNamespace && (
                <span className="text-sm text-muted-foreground">/ {currentNamespace}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LayoutCustomizer onLayoutChange={handleLayoutChange} currentLayout={layoutMode} />
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-accent rounded-md"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-accent rounded-md"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden" style={{ height: `calc(100% - ${HEADER_HEIGHT})` }}>
        <div className={`h-full ${getLayoutClasses()} gap-4 mx-auto p-4`}>
          <div className="h-full min-w-0 flex overflow-hidden">
            <DocumentSidebar 
              config={getConfig()}
              onError={setError}
              onNamespaceChange={setCurrentNamespace}
              currentNamespace={currentNamespace}
              visible={sidebarOpen}
            />
          </div>

          <div className="h-full min-w-0 flex justify-center overflow-hidden">
            <div className="w-[900px] flex flex-col overflow-hidden border dark:border-gray-700 rounded-lg bg-background">
              {activePlan && (
                <div className="flex-none px-4 py-2 text-sm border-b dark:border-gray-700">
                  Active Plan: <span className="font-medium">{activePlan.title}</span>
                </div>
              )}
              <Chat
                messages={messages}
                isLoading={isLoading}
                error={error}
                onSendMessage={handleSendMessage}
                hasApiKey={provider => Boolean(apiKeys[provider])}
              />
            </div>
          </div>

          <div className="h-full min-w-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 border-b dark:border-gray-700 overflow-auto">
              <CodeContainer messages={messages} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <PlanManager
                config={getConfig()}
                currentNamespace={currentNamespace}
                onError={setError}
                onPlanSelect={setActivePlan}
                selectedPlanId={activePlan?.id}
              />
            </div>
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => isConfigured ? setShowSettings(false) : null}
        apiKeys={apiKeys}
        vectorDBConfig={vectorDBConfig}
        onSave={(keys, config) => {
          setAPIKeys(keys);
          setVectorDBConfig(config);
          if (keys.anthropic && keys.pinecone && keys.voyage && config.indexName) {
            setShowSettings(false);
          }
        }}
      />
    </div>
  );
}