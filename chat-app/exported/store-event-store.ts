// store/event-store.ts
import { create } from 'zustand';
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock } from '@/types/code-block';
import { useChatStore } from './chat-store';
import { useInitializationStore } from './initialization-store';

export type EventType =
  | 'message_added'
  | 'message_updated'
  | 'message_deleted'
  | 'state_cleared'
  | 'state_loaded'
  | 'documents_refreshed'
  | 'plan_updated'
  | 'code_block_added'
  | 'error_occurred'
  | 'config_changed'
  | 'initialization_staged'
  | 'initialization_completed'
  | 'initialization_failed';

export interface EventPayload {
  message_added: { message: Message };
  message_updated: { id: string; update: Partial<Message> };
  message_deleted: { id: string };
  state_cleared: undefined;
  state_loaded: { projectId: string; namespace: string };
  documents_refreshed: { namespace: string; count: number };
  plan_updated: { plan: Plan };
  code_block_added: { block: CodeBlock };
  error_occurred: { error: string };
  config_changed: { configType: 'api_keys' | 'vector_db' };
  initialization_staged: { stage: string };
  initialization_completed: undefined;
  initialization_failed: { error: string };
}

export interface ChatEvent {
  id: string;
  type: EventType;
  payload: EventPayload[EventType];
  timestamp: number;
}

interface EventStore {
  events: ChatEvent[];
  recentEvents: ChatEvent[];
  maxEvents: number;
  retentionPeriod: number;

  // Event Actions
  logEvent: <T extends EventType>(
    type: T,
    payload: EventPayload[T]
  ) => void;
  getEvents: (since?: number) => ChatEvent[];
  getEventsByType: <T extends EventType>(type: T) => ChatEvent[];
  clearEvents: () => void;
  pruneEvents: () => void;

  // Settings
  setMaxEvents: (max: number) => void;
  setRetentionPeriod: (days: number) => void;

  // Initialization
  initializeEventHandling: () => void;
  initialize: () => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  recentEvents: [],
  maxEvents: 1000,
  retentionPeriod: 7, // days

  logEvent: (type, payload) => {
    const event: ChatEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now()
    };

    set(state => {
      // Add to main events array
      const newEvents = [event, ...state.events];
      if (newEvents.length > state.maxEvents) {
        newEvents.pop();
      }

      // Update recent events (last 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const newRecentEvents = [
        event,
        ...state.recentEvents.filter(e => e.timestamp > oneDayAgo)
      ];

      return {
        events: newEvents,
        recentEvents: newRecentEvents
      };
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Event] ${type}:`, payload);
    }
  },

  getEvents: (since = 0) => {
    return get().events.filter(event => event.timestamp > since);
  },

  getEventsByType: (type) => {
    return get().events.filter(event => event.type === type);
  },

  clearEvents: () => {
    set({ events: [], recentEvents: [] });
  },

  pruneEvents: () => {
    const state = get();
    const cutoff = Date.now() - (state.retentionPeriod * 24 * 60 * 60 * 1000);

    set(state => ({
      events: state.events.filter(event => event.timestamp > cutoff)
    }));
  },

  setMaxEvents: (max) => {
    set(state => {
      // Trim events if necessary
      const events = state.events.slice(0, max);
      return { maxEvents: max, events };
    });
  },

  setRetentionPeriod: (days) => {
    set({ retentionPeriod: days });
    // Trigger a prune with new retention period
    get().pruneEvents();
  },

  initializeEventHandling: () => {
    const eventStore = get();

    // Subscribe to chat store changes
    useChatStore.subscribe((state) => {
      if (state.error) {
        eventStore.logEvent('error_occurred', { error: state.error });
      }
    });

    // Subscribe to initialization store changes
    useInitializationStore.subscribe((state) => {
      if (state.stage) {
        eventStore.logEvent('initialization_staged', { stage: state.stage });
      }
      if (state.error) {
        eventStore.logEvent('initialization_failed', { error: state.error });
      }
      if (state.stage === 'complete') {
        eventStore.logEvent('initialization_completed', undefined);
      }
    });

    // Add cleanup for event subscriptions if needed
    return () => {};
  },

  initialize: () => {
    get().initializeEventHandling();
  }
}));

// Call initialize when the store is first imported
useEventStore.getState().initialize();

// Set up automatic pruning
setInterval(() => {
  useEventStore.getState().pruneEvents();
}, 24 * 60 * 60 * 1000); // Once per day