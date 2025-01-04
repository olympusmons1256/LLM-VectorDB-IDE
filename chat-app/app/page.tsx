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
    if (savedLayout) {
      setLayoutMode(savedLayout as LayoutMode);
    }
  }, []);

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    localStorage.setItem('layout-mode', mode);
  };

  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'compact':
        return 'grid grid-cols-[200px,1fr,200px]';
      case 'wide':
        return 'grid grid-cols-[300px,1fr,300px]';
      case 'stacked':
        return 'grid grid-rows-[1fr,auto] max-w-[1200px] mx-auto';
      default:
        return 'grid grid-cols-[280px,1fr,280px] max-w-[1400px] mx-auto';
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
    <div className="h-screen flex flex-col">
      <LayoutCustomizer onLayoutChange={handleLayoutChange} currentLayout={layoutMode} />
      
      {/* Minimal top bar */}
      <div className="flex items-center justify-between h-12 px-4 border-b dark:border-gray-700">
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

      {/* Main layout */}
      <div className={`flex-1 p-4 ${getLayoutClasses()} gap-4 overflow-hidden`}>
        {/* Left sidebar */}
        <DocumentSidebar 
          config={getConfig()}
          onError={setError}
          onNamespaceChange={setCurrentNamespace}
          currentNamespace={currentNamespace}
          visible={sidebarOpen}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden border dark:border-gray-700 rounded-lg">
          {activePlan && (
            <div className="px-4 py-2 text-sm border-b dark:border-gray-700">
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

        {/* Right sidebar */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex-1 border-b dark:border-gray-700 overflow-auto">
            <CodeContainer messages={messages} />
          </div>
          <div className="flex-1 overflow-auto">
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

      <SettingsModal
        isOpen={showSettings}
        onClose={() => isConfigured ? setShowSettings(false) : null}
        apiKeys={apiKeys}
        vectorDBConfig={vectorDBConfig}
        onSave={(keys, config) => {
          setAPIKeys(keys);
          setVectorDBConfig(config);
          localStorage.setItem('apiKeys', JSON.stringify(keys));
          localStorage.setItem('vectorDBConfig', JSON.stringify(config));
          
          if (keys.anthropic && keys.pinecone && keys.voyage && config.indexName) {
            setShowSettings(false);
          }
        }}
      />
    </div>
  );
}