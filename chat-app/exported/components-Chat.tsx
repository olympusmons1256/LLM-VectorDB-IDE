'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Message } from '@/types/message';
import type { CodeAnnotation } from '@/types/code-block';
import { useCurrentProject } from '@/store/chat-store';

export interface Model {
  provider: 'anthropic' | 'openai';
  id: string;
  name: string;
}

const MODEL_OPTIONS: Model[] = [
  { provider: 'anthropic', id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { provider: 'anthropic', id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { provider: 'anthropic', id: 'claude-3-haiku-20240229', name: 'Claude 3 Haiku' },
  { provider: 'openai', id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
  { provider: 'openai', id: 'gpt-4', name: 'GPT-4' },
  { provider: 'openai', id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
];

interface ChatProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (content: string, model: Model) => void;
  hasApiKey?: (provider: Model['provider']) => boolean;
  onCodeBlockSelect?: (blockId: string) => void;
  selectedCodeBlockId?: string;
  currentNamespace?: string;
}

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
    <div className="max-w-[900px] mx-auto">
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] rounded-lg p-4 ${
            isUser
              ? 'bg-blue-600 dark:bg-blue-700 text-white'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border dark:border-gray-700'
          } ${className}`}
        >
          <div className="prose dark:prose-invert max-w-none prose-sm prose-p:leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ inline, className, children }) => {
                  if (inline) {
                    return <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">{children}</code>;
                  }
                  return null;
                },
                pre: ({ children }) => null,
                a: ({ href, children }) => {
                  if (href?.startsWith('code-')) {
                    return (
                      <button
                        onClick={() => onCodeBlockSelect?.(href)}
                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        {children}
                        <span className="text-xs text-blue-500 dark:text-blue-400">↗</span>
                      </button>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                      {children}
                    </a>
                  );
                },
                ul: ({children}) => (
                  <ul className="list-disc list-inside my-2 text-gray-900 dark:text-gray-100">
                    {children}
                  </ul>
                ),
                ol: ({children}) => (
                  <ol className="list-decimal list-inside my-2 text-gray-900 dark:text-gray-100">
                    {children}
                  </ol>
                ),
                h1: ({children}) => <h1 className="text-2xl font-bold my-3 text-gray-900 dark:text-gray-100">{children}</h1>,
                h2: ({children}) => <h2 className="text-xl font-bold my-2 text-gray-900 dark:text-gray-100">{children}</h2>,
                h3: ({children}) => <h3 className="text-lg font-bold my-2 text-gray-900 dark:text-gray-100">{children}</h3>,
                em: ({children}) => <em className="italic text-gray-800 dark:text-gray-200">{children}</em>,
                strong: ({children}) => <strong className="font-bold text-gray-900 dark:text-gray-100">{children}</strong>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 my-2 italic text-gray-700 dark:text-gray-300">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {message.tools?.map((tool, index) => (
            <div key={index} className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{tool.language}</div>
              </div>
              <pre className="overflow-x-auto bg-gray-100 dark:bg-gray-900 rounded p-2">
                <code className="text-sm text-gray-800 dark:text-gray-200 font-mono">{tool.code}</code>
              </pre>
            </div>
          ))}
        </div>
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
            className="w-full p-2 pr-12 rounded-lg border dark:border-gray-700 
                     bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                     placeholder-gray-500 dark:placeholder-gray-400
                     disabled:opacity-50 resize-none 
                     min-h-[40px] max-h-[200px] overflow-y-auto
                     focus:outline-none focus:ring-1 focus:ring-blue-500 
                     dark:focus:ring-blue-400 transition-all"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 
                     rounded-lg bg-blue-500 text-white
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     hover:bg-blue-600 dark:hover:bg-blue-600 
                     transition-colors w-8 h-8 flex items-center justify-center
                     focus:outline-none focus:ring-2 focus:ring-blue-500 
                     dark:focus:ring-blue-400"
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
        className="text-xs h-7 px-2 rounded border dark:border-gray-700 
                bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                hover:bg-gray-100 dark:hover:bg-gray-700
                focus:outline-none focus:ring-1 focus:ring-blue-500 
                dark:focus:ring-blue-400 min-w-[160px]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
      >
        {MODEL_OPTIONS.map((model) => {
          const disabled = hasApiKey && !hasApiKey(model.provider);
          return (
            <option
              key={`${model.provider}:${model.id}`}
              value={`${model.provider}:${model.id}`}
              disabled={disabled}
              className={disabled ? 'opacity-50 text-gray-500' : ''}
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
    <div className="max-w-[900px] mx-auto">
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-lg p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <div className="animate-spin rounded-full h-4 w-4 
                          border-2 border-gray-500 dark:border-gray-400 
                          border-t-transparent" />
            <span>AI is thinking...</span>
          </div>
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
  selectedCodeBlockId,
  currentNamespace
}: ChatProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const { activePlan } = useCurrentProject();

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

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {(error || modelError) && (
        <Alert variant="destructive" 
              className="m-4 flex-shrink-0 bg-red-50 dark:bg-red-900/20 
                        border-red-200 dark:border-red-800">
                          <AlertDescription className="text-red-800 dark:text-red-200">
            {error || modelError}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 overflow-y-scroll p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index}
            message={message}
            isUser={message.role === 'user'}
            onCodeBlockSelect={onCodeBlockSelect}
          />
        ))}
        {isLoading && <LoadingMessage />}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t dark:border-gray-700 bg-background">
        <div className="max-w-[900px] mx-auto space-y-2 p-4">
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

export type { ChatProps, Model };