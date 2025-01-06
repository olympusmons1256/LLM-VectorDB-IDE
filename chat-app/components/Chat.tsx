'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Message } from '@/types/message';
import type { CodeAnnotation } from '@/types/code-block';
import { useCurrentProject } from '@/store/chat-store';

interface Model {
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
              ? 'bg-gray-800 text-white'
              : 'bg-background border dark:border-gray-700'
          } ${className}`}
        >
          <div className="prose dark:prose-invert dark:text-foreground max-w-none prose-sm prose-p:leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ inline, className, children }) => {
                  if (inline) {
                    return <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{children}</code>;
                  }
                  return null;
                },
                pre: ({ children }) => null,
                a: ({ href, children }) => {
                  if (href?.startsWith('code-')) {
                    return (
                      <button
                        onClick={() => onCodeBlockSelect?.(href)}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {children}
                        <span className="text-xs text-primary/80">↗</span>
                      </button>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" 
                       className="text-primary hover:underline transition-colors">
                      {children}
                    </a>
                  );
                },
                ul: ({children}) => (
                  <ul className="list-disc list-inside my-2 text-foreground">
                    {children}
                  </ul>
                ),
                ol: ({children}) => (
                  <ol className="list-decimal list-inside my-2 text-foreground">
                    {children}
                  </ol>
                ),
                h1: ({children}) => <h1 className="text-2xl font-bold my-3 text-foreground">{children}</h1>,
                h2: ({children}) => <h2 className="text-xl font-bold my-2 text-foreground">{children}</h2>,
                h3: ({children}) => <h3 className="text-lg font-bold my-2 text-foreground">{children}</h3>,
                em: ({children}) => <em className="italic text-foreground/90">{children}</em>,
                strong: ({children}) => <strong className="font-bold text-foreground">{children}</strong>,
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-primary/20 pl-4 my-2 italic text-foreground">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {message.tools?.map((tool, index) => (
            <div key={index} className="mt-2 p-2 bg-muted rounded border dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-muted-foreground font-mono">{tool.language}</div>
              </div>
              <pre className="overflow-x-auto bg-background rounded p-2">
                <code className="text-sm text-foreground font-mono">{tool.code}</code>
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
      <div className="flex relative">
        <div className="w-full">
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
                     bg-background text-foreground
                     placeholder:text-muted-foreground/70
                     disabled:opacity-50 resize-none 
                     min-h-[40px] max-h-[200px] overflow-y-auto
                     focus:outline-none focus:ring-1 focus:ring-primary
                     transition-all"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 
                     rounded-lg bg-primary text-primary-foreground
                     disabled:opacity-50 disabled:cursor-not-allowed 
                     hover:bg-primary/90
                     transition-colors w-8 h-8 flex items-center justify-center
                     focus:outline-none focus:ring-2 focus:ring-primary
                     z-10"
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
                bg-background text-foreground
                hover:bg-muted
                focus:outline-none focus:ring-1 focus:ring-primary
                min-w-[160px]
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
              className={disabled ? 'opacity-50' : ''}
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
        <div className="max-w-[80%] rounded-lg p-4 bg-background border dark:border-gray-700">
          <div className="flex items-center gap-2 text-foreground">
            <div className="animate-spin rounded-full h-4 w-4 
                          border-2 border-muted-foreground
                          border-t-transparent" />
            <span>AI is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chat({ 
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
    <div className="flex flex-col h-screen overflow-hidden">
      {(error || modelError) && (
        <Alert variant="destructive" 
              className="m-4 flex-shrink-0 bg-destructive/10 border-destructive/20">
          <AlertDescription className="text-destructive">
            {error || modelError}
          </AlertDescription>
        </Alert>
      )}

      <div className="relative flex-1 overflow-y-auto h-[calc(100vh-180px)] p-4 space-y-4">
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

      <div className="flex-shrink-0 border-t dark:border-gray-700 bg-background h-[130px]">
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

export { Chat, type ChatProps, type Model };