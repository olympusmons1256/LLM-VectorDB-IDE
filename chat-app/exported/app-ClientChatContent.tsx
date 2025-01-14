// app/ClientChatContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Chat } from '@/components/Chat';
import { SettingsModal } from '@/components/SettingsModal';
import { CodeContainer } from '@/components/CodeContainer';
import { DocumentSidebar } from '@/components/DocumentSidebar';
import { PlanManager } from '@/components/PlanManager';
import { LayoutCustomizer } from '@/components/layout/LayoutCustomizer';
import { useChatStore, useCurrentProject } from '@/store/chat-store';
import { useInitializationStore } from '@/store/initialization-store';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { LayoutMode } from '@/components/layout/types';
import type { Model } from '@/types/message';
import type { VectorDBConfig } from '@/types/settings';

export function ClientChatContent() {
  const { stage, error, isConfigured, setAPIKeys, setVectorDBConfig } = useInitializationStore();
  const { theme, setTheme } = useTheme();
  const { messages, activePlan } = useCurrentProject();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const [showSettings, setShowSettings] = useState(false);
  const {
    isLoading,
    currentNamespace,
    sidebarOpen,
    setMessages,
    addMessage,
    setIsLoading,
    setError,
    setCurrentNamespace,
    setSidebarOpen,
    setActivePlan
  } = useChatStore();

  useEffect(() => {
    if (!isConfigured) {
      setShowSettings(true);
    }
  }, [isConfigured, setShowSettings]);

  if (stage !== 'complete') {
    return <LoadingScreen message={`Initializing (${stage})...`} />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

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
    // ... existing implementation ...
  };

  const getConfig = (): Config => ({
    embedding: { provider: 'voyage' },
    vectordb: { 
      provider: 'pinecone',
      cloud: useInitializationStore.getState().vectorDBConfig.cloud,
      region: useInitializationStore.getState().vectorDBConfig.region,
      indexName: useInitializationStore.getState().vectorDBConfig.indexName
    },
    apiKeys: useInitializationStore.getState().apiKeys
  });

  const handleSaveConfig = async (keys: typeof apiKeys, config: VectorDBConfig) => {
    setAPIKeys(keys);
    setVectorDBConfig(config);

    if (activeProject) {
      await saveProject(activeProject, {
        config: {
          apiKeys: keys,
          vectorDBConfig: config
        }
      });
      
      if (keys.anthropic && keys.pinecone && keys.voyage && config.indexName) {
        setShowSettings(false);
      }
    }
  };

  return (
    <div className="flex-1 overflow-hidden" style={{ height: `calc(100vh - 48px)` }}>
      {/* ... existing layout ... */}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => isConfigured ? setShowSettings(false) : null}
        apiKeys={useInitializationStore.getState().apiKeys}
        vectorDBConfig={useInitializationStore.getState().vectorDBConfig}
        onSave={handleSaveConfig}
      />
    </div>
  );
}