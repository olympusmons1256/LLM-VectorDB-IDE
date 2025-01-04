// components/Chat/ChatInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to measure scrollHeight correctly
      textarea.style.height = 'auto';
      // Set new height based on content
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
      // Reset height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading) {
        onSendMessage(message);
        setMessage('');
        // Reset height after sending
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Waiting for response..." : "Type your message... (Shift+Enter for new line)"}
          className="flex-1 p-2 rounded-lg border dark:border-gray-700 bg-background text-foreground
                   disabled:opacity-50 resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
          disabled={isLoading}
          rows={1}
        />
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="flex-shrink-0 p-2 rounded-lg bg-blue-500 text-white w-10 h-10
                   disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 
                   transition-colors flex items-center justify-center"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}