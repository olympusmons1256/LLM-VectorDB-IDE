// src/components/Chat/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
  tools?: Array<{
    type: 'code' | 'document' | 'plan';
    content: any;
  }>;
}

interface ThreadState {
  messagesByCanvas: Record<string, Message[]>;
  threadsByCanvas: Record<string, Record<string, Message[]>>;
  activeThreadByCanvas: Record<string, string | null>;
}

interface ChatState extends ThreadState {
  addMessage: (canvasId: string, message: Message) => void;
  addMessageToThread: (canvasId: string, threadId: string, message: Message) => void;
  clearMessages: (canvasId: string) => void;
  clearThread: (canvasId: string, threadId: string) => void;
  setActiveThread: (canvasId: string, threadId: string | null) => void;
  createThread: (canvasId: string, title?: string) => string;
  deleteThread: (canvasId: string, threadId: string) => void;
  updateMessage: (canvasId: string, messageId: string, updates: Partial<Message>) => void;
  getCanvasMessages: (canvasId: string) => Message[];
  removeCanvas: (canvasId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messagesByCanvas: {},
      threadsByCanvas: {},
      activeThreadByCanvas: {},

      getCanvasMessages: (canvasId: string) => {
        const state = get();
        const activeThread = state.activeThreadByCanvas[canvasId];
        if (activeThread) {
          return state.threadsByCanvas[canvasId]?.[activeThread] || [];
        }
        return state.messagesByCanvas[canvasId] || [];
      },

      addMessage: (canvasId: string, message) => set((state) => {
        const activeThread = state.activeThreadByCanvas[canvasId];
        if (activeThread) {
          const updatedThreads = {
            ...state.threadsByCanvas,
            [canvasId]: {
              ...state.threadsByCanvas[canvasId],
              [activeThread]: [
                ...(state.threadsByCanvas[canvasId]?.[activeThread] || []),
                message
              ]
            }
          };
          return {
            ...state,
            threadsByCanvas: updatedThreads
          };
        }
        return {
          ...state,
          messagesByCanvas: {
            ...state.messagesByCanvas,
            [canvasId]: [...(state.messagesByCanvas[canvasId] || []), message]
          }
        };
      }),

      addMessageToThread: (canvasId, threadId, message) => set((state) => ({
        ...state,
        threadsByCanvas: {
          ...state.threadsByCanvas,
          [canvasId]: {
            ...state.threadsByCanvas[canvasId],
            [threadId]: [...(state.threadsByCanvas[canvasId]?.[threadId] || []), message]
          }
        }
      })),

      clearMessages: (canvasId) => set((state) => ({
        ...state,
        messagesByCanvas: {
          ...state.messagesByCanvas,
          [canvasId]: []
        }
      })),

      clearThread: (canvasId, threadId) => set((state) => ({
        ...state,
        threadsByCanvas: {
          ...state.threadsByCanvas,
          [canvasId]: {
            ...state.threadsByCanvas[canvasId],
            [threadId]: []
          }
        }
      })),

      setActiveThread: (canvasId, threadId) => set((state) => ({
        ...state,
        activeThreadByCanvas: {
          ...state.activeThreadByCanvas,
          [canvasId]: threadId
        }
      })),

      createThread: (canvasId, title) => {
        const threadId = crypto.randomUUID();
        set((state) => ({
          ...state,
          threadsByCanvas: {
            ...state.threadsByCanvas,
            [canvasId]: {
              ...state.threadsByCanvas[canvasId],
              [threadId]: []
            }
          },
          activeThreadByCanvas: {
            ...state.activeThreadByCanvas,
            [canvasId]: threadId
          }
        }));
        return threadId;
      },

      deleteThread: (canvasId, threadId) => set((state) => {
        const canvasThreads = state.threadsByCanvas[canvasId] || {};
        const { [threadId]: removedThread, ...remainingThreads } = canvasThreads;
        return {
          ...state,
          threadsByCanvas: {
            ...state.threadsByCanvas,
            [canvasId]: remainingThreads
          },
          activeThreadByCanvas: {
            ...state.activeThreadByCanvas,
            [canvasId]: state.activeThreadByCanvas[canvasId] === threadId ? 
              null : 
              state.activeThreadByCanvas[canvasId]
          }
        };
      }),

      updateMessage: (canvasId, messageId, updates) => set((state) => {
        const updateMessageInList = (messages: Message[]) =>
          messages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          );

        const activeThread = state.activeThreadByCanvas[canvasId];
        if (activeThread) {
          return {
            ...state,
            threadsByCanvas: {
              ...state.threadsByCanvas,
              [canvasId]: {
                ...state.threadsByCanvas[canvasId],
                [activeThread]: updateMessageInList(
                  state.threadsByCanvas[canvasId]?.[activeThread] || []
                )
              }
            }
          };
        }

        return {
          ...state,
          messagesByCanvas: {
            ...state.messagesByCanvas,
            [canvasId]: updateMessageInList(state.messagesByCanvas[canvasId] || [])
          }
        };
      }),

      removeCanvas: (canvasId) => set((state) => {
        const { 
          [canvasId]: removedMessages, 
          ...remainingMessages 
        } = state.messagesByCanvas;
        
        const {
          [canvasId]: removedThreads,
          ...remainingThreads
        } = state.threadsByCanvas;
        
        const {
          [canvasId]: removedActiveThread,
          ...remainingActiveThreads
        } = state.activeThreadByCanvas;

        return {
          messagesByCanvas: remainingMessages,
          threadsByCanvas: remainingThreads,
          activeThreadByCanvas: remainingActiveThreads
        };
      })
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        messagesByCanvas: state.messagesByCanvas,
        threadsByCanvas: state.threadsByCanvas
      })
    }
  )
);

export function useCanvasChat(canvasId: string) {
  return useChatStore(state => ({
    messages: state.getCanvasMessages(canvasId),
    addMessage: (message: Message) => state.addMessage(canvasId, message),
    clearMessages: () => state.clearMessages(canvasId),
    updateMessage: (messageId: string, updates: Partial<Message>) => 
      state.updateMessage(canvasId, messageId, updates)
  }));
}

export function useCanvasThreads(canvasId: string) {
  return useChatStore(state => ({
    threads: state.threadsByCanvas[canvasId] || {},
    activeThread: state.activeThreadByCanvas[canvasId],
    createThread: (title?: string) => state.createThread(canvasId, title),
    deleteThread: (threadId: string) => state.deleteThread(canvasId, threadId),
    setActiveThread: (threadId: string | null) => state.setActiveThread(canvasId, threadId)
  }));
}