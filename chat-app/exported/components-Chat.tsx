'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Message } from '@/types/message';
import type { CodeAnnotation } from '@/types/code-block';

export interface Model {
  provider: 'anthropic' | 'openai';
  id: string;
  name: string;
}

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string, model: Model) => void;
  hasApiKey?: (provider: Model['provider']) => boolean;
  onCodeBlockSelect?: (blockId: string) => void;
  selectedCodeBlockId?: string;
}

const MODEL_OPTIONS: Model[] = [
  { provider: 'anthropic', id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { provider: 'anthropic', id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { provider: 'anthropic', id: 'claude-3-haiku-20240229', name: 'Claude 3 Haiku' },
  { provider: 'openai', id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
  { provider: 'openai', id: 'gpt-4', name: 'GPT-4' },
  { provider: 'openai', id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
];

interface ChatMessageProps {
  message: Message;
  isUser?: boolean;
  onRegenerate?: () => void;
  onCodeBlockSelect?: (blockId: string) => void;
  className?: string;
}

function ChatMessage({ 
  message, 
  isUser = false,
  onRegenerate,
  onCodeBlockSelect,
  className = '' 
}: ChatMessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        } ${className}`}
      >
        <div className="prose dark:prose-invert max-w-none prose-sm prose-p:leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ inline, className, children }) => {
                if (inline) {
                  return <code className={className}>{children}</code>;
                }
                return null;
              },
              pre: ({ children }) => null,
              a: ({ href, children }) => {
                if (href?.startsWith('code-')) {
                  return (
                    <button
                      onClick={() => onCodeBlockSelect?.(href)}
                      className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      {children}
                      <span className="text-xs text-blue-500">↗</span>
                    </button>
                  );
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 dark:text-blue-400 hover:underline">
                    {children}
                  </a>
                );
              },
              ul: ({children}) => (
                <ul className="list-disc list-inside my-2">
                  {children}
                </ul>
              ),
              ol: ({children}) => (
                <ol className="list-decimal list-inside my-2">
                  {children}
                </ol>
              ),
              h1: ({children}) => <h1 className="text-2xl font-bold my-3">{children}</h1>,
              h2: ({children}) => <h2 className="text-xl font-bold my-2">{children}</h2>,
              h3: ({children}) => <h3 className="text-lg font-bold my-2">{children}</h3>,
              em: ({children}) => <em className="italic">{children}</em>,
              strong: ({children}) => <strong className="font-bold">{children}</strong>,
              blockquote: ({children}) => (
                <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.tools?.map((tool, index) => (
          <div key={index} className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
            <div className="text-xs text-gray-500 mb-1">{tool.language}</div>
            <pre className="overflow-x-auto">
              <code>{tool.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (message.trim() && !isLoading) {
                  onSendMessage(message);
                  setMessage('');
                }
              }
            }}
            placeholder={isLoading ? "Waiting for response..." : "Type your message... (Shift+Enter for new line)"}
            className="w-full p-2 pr-12 rounded-lg border dark:border-gray-700 bg-background text-foreground
                     disabled:opacity-50 resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-500 text-white 
                     disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors
                     w-8 h-8 flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

function ModelSelector({ 
  selectedModel, 
  onChange, 
  hasApiKey 
}: { 
  selectedModel: Model | null;
  onChange: (model: Model) => void;
  hasApiKey?: (provider: Model['provider']) => boolean;
}) {
  return (
    <div className="px-2">
      <select
        value={`${selectedModel?.provider}:${selectedModel?.id}`}
        onChange={(e) => {
          const [provider, modelId] = e.target.value.split(':') as [Model['provider'], string];
          const model = MODEL_OPTIONS.find(m => m.provider === provider && m.id === modelId);
          if (model) {
            onChange(model);
          }
        }}
        className="text-xs h-7 px-2 rounded border dark:border-gray-700 bg-background text-foreground
                hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 
                focus:ring-blue-500 min-w-[160px]"
      >
        {MODEL_OPTIONS.map((model) => {
          const disabled = hasApiKey && !hasApiKey(model.provider);
          return (
            <option
              key={`${model.provider}:${model.id}`}
              value={`${model.provider}:${model.id}`}
              disabled={disabled}
            >
              {model.name}{disabled ? ' (No API Key)' : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-4 bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
          <span>AI is thinking...</span>
        </div>
      </div>
    </div>
  );
}

export function Chat({ 
  messages, 
  isLoading, 
  error, 
  onSendMessage,
  hasApiKey,
  onCodeBlockSelect,
  selectedCodeBlockId 
}: ChatProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<CodeAnnotation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted || selectedModel) return;

    const defaultModel = MODEL_OPTIONS.find(m => 
      m.provider === 'anthropic' && m.id === 'claude-3-sonnet-20240229' && 
      (!hasApiKey || hasApiKey(m.provider))
    ) || MODEL_OPTIONS[0];
    
    setSelectedModel(defaultModel);
  }, [mounted, hasApiKey, selectedModel]);

  useEffect(() => {
    if (mounted && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, mounted, scrollToBottom]);

  const handleSendMessage = useCallback((content: string) => {
    if (!selectedModel) {
      setModelError('Please select a model first');
      return;
    }
    
    if (hasApiKey && !hasApiKey(selectedModel.provider)) {
      setModelError(`Please add your ${selectedModel.provider} API key in settings`);
      return;
    }
    
    setModelError(null);
    onSendMessage(content, selectedModel);
  }, [selectedModel, hasApiKey, onSendMessage]);

  const handleCodeBlockSelect = useCallback((blockId: string) => {
    onCodeBlockSelect?.(blockId);
  }, [onCodeBlockSelect]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {(error || modelError) && (
        <Alert variant="destructive" className="m-4 flex-shrink-0">
          <AlertDescription>{error || modelError}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage 
            key={`${message.id || index}-${index}`}
            message={message}
            isUser={message.role === 'user'}
            onCodeBlockSelect={handleCodeBlockSelect}
          />
        ))}
        {isLoading && <LoadingMessage />}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t dark:border-gray-700 bg-background">
        <div className="space-y-2">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
          <ModelSelector
            selectedModel={selectedModel}
            onChange={setSelectedModel}
            hasApiKey={hasApiKey}
          />
        </div>
      </div>
    </div>
  );
}