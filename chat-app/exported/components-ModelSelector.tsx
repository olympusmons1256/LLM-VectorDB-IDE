// components/ModelSelector.tsx
import React from 'react';
import type { Model } from '@/types/message';

interface ModelSelectorProps {
  selectedModel: Model | null;
  onChange: (model: Model) => void;
  hasApiKey?: (provider: Model['provider']) => boolean;
  modelOptions: Model[];
}

export function ModelSelector({ selectedModel, onChange, hasApiKey, modelOptions }: ModelSelectorProps) {
  return (
    <div className="flex items-center justify-end text-sm text-muted-foreground px-2">
      <select
        value={`${selectedModel?.provider}:${selectedModel?.id}`}
        onChange={(e) => {
          const [provider, modelId] = e.target.value.split(':') as [Model['provider'], string];
          const model = modelOptions.find(m => m.provider === provider && m.id === modelId);
          if (model) {
            onChange(model);
          }
        }}
        className="text-xs py-1 px-2 rounded border dark:border-gray-700 bg-background text-foreground 
                hover:bg-accent hover:text-accent-foreground"
      >
        {modelOptions.map((model) => {
          const disabled = hasApiKey && !hasApiKey(model.provider);
          return (
            <option
              key={`${model.provider}:${model.id}`}
              value={`${model.provider}:${model.id}`}
              disabled={disabled}
              className={disabled ? 'opacity-50' : ''}
            >
              {model.name}
            </option>
          );
        })}
      </select>
    </div>
  );
}