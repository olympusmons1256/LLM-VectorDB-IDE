// app/ClientChatContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { Chat } from '@/components/Chat';
import { SettingsModal } from '@/components/SettingsModal';
import { CodeContainer } from '@/components/CodeContainer';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { PlanManager } from '@/components/PlanManager';
import { useChatStore } from '@/store/chat-store';
import type { Model } from '@/types/message';

interface Config {
  apiKeys: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
    vectorIndexName?: string;
    vectorCloud?: string;
    vectorRegion?: string;
  };
  vectordb: {
    provider: 'pinecone';
    indexName: string;
    cloud: string;
    region: string;
  };
  embedding: {
    provider: 'voyage';
  };
}

export function ClientChatContent() {
  const {
    messages,
    activePlan,
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
    setVectorDBConfig,
    layoutMode
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
    <main className="flex-1 overflow-hidden" style={{ height: `calc(100% - 48px)` }}>
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
    </main>
  );
}