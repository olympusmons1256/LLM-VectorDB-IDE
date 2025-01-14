// src/services/llm.ts
import { LLMConfig, LLMProvider } from '../types/settings';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface APIErrorResponse {
  error: string;
  message?: string;
}

interface ContentItem {
  type: string;
  text: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    console.log('LLM Service Config:', {
      provider: config.provider,
      modelId: config.modelId,
      temperature: config.temperature
    });
    this.config = config;
  }

  private getEndpoint(provider: LLMProvider): string {
    switch (provider) {
      case 'anthropic':
        return '/api/chat';
      case 'openai':
        return '/api/openai';
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async anthropicCompletion(
    messages: Message[],
    options: CompletionOptions = {}
  ) {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('At least one message is required');
      }

      const systemMessage = messages.find(m => m.role === 'system')?.content;
      const chatMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.modelId,
          messages: chatMessages,
          system: systemMessage,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature ?? this.config.temperature,
          stop_sequences: options.stopSequences,
          stream: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'API request failed');
      }

      let content = '';
      if (data.content && Array.isArray(data.content)) {
        content = data.content
          .filter((item: ContentItem) => item.type === 'text')
          .map((item: ContentItem) => item.text)
          .join('\n');
      } else if (typeof data.content === 'string') {
        content = data.content;
      } else if (data.content?.text) {
        content = data.content.text;
      }

      return {
        content,
        model: data.model,
        usage: data.usage
      };

    } catch (error) {
      console.error('Anthropic API call failed:', error);
      throw error;
    }
  }

  private async openaiCompletion(
    messages: Message[],
    options: CompletionOptions = {}
  ) {
    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.modelId,
          messages,
          max_tokens: options.maxTokens,
          temperature: options.temperature ?? this.config.temperature,
          stop: options.stopSequences,
          stream: false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  async complete(
    messages: Message[],
    options: CompletionOptions = {}
  ) {
    try {
      switch (this.config.provider) {
        case 'anthropic':
          return await this.anthropicCompletion(messages, options);
        case 'openai':
          return await this.openaiCompletion(messages, options);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('LLM completion error:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.complete([{
        role: 'system',
        content: 'Test connection. Please respond with "ok".'
      }], {
        maxTokens: 10,
        temperature: 0
      });

      if (!response.content) {
        throw new Error('Invalid response format');
      }

      return true;
    } catch (error) {
      console.error('LLM connection test failed:', error);
      throw new Error(`LLM connection test failed: ${error.message}`);
    }
  }

  updateConfig(newConfig: Partial<LLMConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}