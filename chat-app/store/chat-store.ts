// store/chat-store.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@/types/message';
import type { Plan } from '@/services/plans';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import type { LayoutMode } from '@/components/layout/types';
import type { VectorDBConfig } from '@/types/settings';

export type ChatEvent = {
 type: 'message_added' | 'state_cleared' | 'state_loaded' | 'error_occurred';
 payload?: any;
 timestamp: number;
};

export interface ProjectState {
 messages: Message[];
 activePlan: Plan | null;
 documents: {
   types: Record<string, number>;
   lastRefreshed?: string;
 };
 codeBlocks: CodeBlock[];
 annotations: CodeAnnotation[];
 metadata?: {
   lastModified: string;
   modifiedBy: string;
 };
}

interface ChatState {
 // Configuration
 config: any;
 isConfigured: boolean;
 apiKeys: {
   anthropic?: string;
   openai?: string;
   voyage?: string;
   pinecone?: string;
 };
 vectorDBConfig: VectorDBConfig;

 // Project State
 projects: Record<string, any>;
 currentNamespace: string;
 messages: Message[];
 activePlan: Plan | null;
 documents: {
   types: Record<string, number>;
   lastRefreshed?: string;
 };
 codeBlocks: CodeBlock[];
 annotations: CodeAnnotation[];
 eventLog: ChatEvent[];
 pendingChanges: boolean;
 lastSaved: string | null;

 // Loading States
 isLoading: boolean;
 error: string | null;
 lastError: Error | null;

 // UI State
 showSettings: boolean;
 sidebarOpen: boolean;
 layoutMode: LayoutMode;

 // Actions
 setShowSettings: (show: boolean) => void;
 setSidebarOpen: (open: boolean) => void;
 setLayoutMode: (mode: LayoutMode) => void;
 setCurrentNamespace: (namespace: string) => void;
 setAPIKeys: (keys: ChatState['apiKeys']) => void;
 setVectorDBConfig: (config: VectorDBConfig) => void;
 setMessages: (messages: Message[]) => void;
 addMessage: (message: Message) => void;
 updateMessage: (id: string, update: Partial<Message>) => void;
 removeMessage: (id: string) => void;
 clearMessages: () => void;
 setActivePlan: (plan: Plan | null) => void;
 updatePlan: (update: Partial<Plan>) => void;
 setDocuments: (documents: ChatState['documents']) => void;
 updateDocuments: (update: Partial<ChatState['documents']>) => void;
 refreshDocuments: (namespace: string) => Promise<void>;
 setCodeBlocks: (blocks: CodeBlock[]) => void;
 addCodeBlock: (block: CodeBlock) => void;
 updateCodeBlock: (id: string, update: Partial<CodeBlock>) => void;
 removeCodeBlock: (id: string) => void;
 setAnnotations: (annotations: CodeAnnotation[]) => void;
 addAnnotation: (annotation: CodeAnnotation) => void;
 clearState: () => void;
 loadState: (projectId: string) => Promise<void>;
 getState: () => ProjectState;
 validateState: () => boolean;
 setIsLoading: (loading: boolean) => void;
 setError: (error: string | null) => void;
 logError: (error: Error) => void;
 clearError: () => void;
 logEvent: (event: Omit<ChatEvent, 'timestamp'>) => void;
 getEvents: (since?: number) => ChatEvent[];
 clearEvents: () => void;
}

function validateDocuments(documents: any): boolean {
 return typeof documents === 'object' && 
        documents !== null &&
        typeof documents.types === 'object';
}

function validateMessages(messages: any): boolean {
 return Array.isArray(messages) &&
        messages.every(msg => 
          typeof msg === 'object' && 
          msg !== null &&
          typeof msg.role === 'string' &&
          typeof msg.content === 'string'
        );
}

function validateCodeBlocks(blocks: any): boolean {
 return Array.isArray(blocks) &&
        blocks.every(block => 
          typeof block === 'object' &&
          block !== null &&
          typeof block.id === 'string' &&
          typeof block.language === 'string' &&
          typeof block.code === 'string'
        );
}

export const useChatStore = create<ChatState>((set, get) => ({
 config: null,
 isConfigured: false,
 apiKeys: {},
 vectorDBConfig: {
   cloud: 'aws',
   region: 'us-east-1',
   indexName: ''
 },

 projects: {},
 currentNamespace: '',
 messages: [],
 activePlan: null,
 documents: { types: {} },
 codeBlocks: [],
 annotations: [],
 eventLog: [],
 pendingChanges: false,
 lastSaved: null,

 isLoading: false,
 error: null,
 lastError: null,

 showSettings: false,
 sidebarOpen: true,
 layoutMode: 'default',

 setShowSettings: (show) => set({ showSettings: show }),
 setSidebarOpen: (open) => set({ sidebarOpen: open }),
 setLayoutMode: (mode) => set({ layoutMode: mode }),

 setAPIKeys: (keys) => {
   console.log('Setting API keys');
   set({ apiKeys: keys, isConfigured: true });
 },

 setVectorDBConfig: (config) => {
   console.log('Setting vector DB config:', config);
   set({ vectorDBConfig: config });
 },

 setCurrentNamespace: async (namespace) => {
   console.log('Setting current namespace:', namespace);
   const state = get();
   
   // Clear current state when changing namespace
   state.clearState();
   set({ currentNamespace: namespace });
   
   if (namespace) {
     try {
       await state.refreshDocuments(namespace);
     } catch (error) {
       console.error('Error refreshing documents for namespace:', error);
       state.setError('Failed to load namespace documents');
     }
   }
   
   state.logEvent({ type: 'state_loaded', payload: { namespace } });
 },

 setMessages: (messages) => {
   if (!validateMessages(messages)) {
     console.error('Invalid messages format');
     return;
   }
   console.log('Setting messages:', messages.length);
   set({ messages, pendingChanges: true });
 },
 
 addMessage: (message) => {
   const messageWithId = { ...message, id: message.id || uuidv4() };
   console.log('Adding message:', messageWithId.id);
   set(state => ({ 
     messages: [...state.messages, messageWithId],
     pendingChanges: true 
   }));
   get().logEvent({ type: 'message_added', payload: { messageId: messageWithId.id } });
 },

 updateMessage: (id, update) => {
   console.log('Updating message:', id);
   set(state => ({
     messages: state.messages.map(msg => 
       msg.id === id ? { ...msg, ...update } : msg
     ),
     pendingChanges: true
   }));
 },

 removeMessage: (id) => {
   console.log('Removing message:', id);
   set(state => ({
     messages: state.messages.filter(msg => msg.id !== id),
     pendingChanges: true
   }));
 },

 clearMessages: () => {
   console.log('Clearing all messages');
   set({ messages: [], pendingChanges: true });
 },

 setActivePlan: (plan) => {
   console.log('Setting active plan:', plan?.id);
   set({ 
     activePlan: plan,
     pendingChanges: true
   });
 },

 updatePlan: (update) => {
   console.log('Updating plan:', update);
   set(state => ({
     activePlan: state.activePlan ? { ...state.activePlan, ...update } : null,
     pendingChanges: true
   }));
 },

 setDocuments: (documents) => {
   if (!validateDocuments(documents)) {
     console.error('Invalid documents format');
     return;
   }
   console.log('Setting documents:', documents);
   set({ documents });
 },

 updateDocuments: (update) => {
   console.log('Updating documents:', update);
   set(state => ({
     documents: { ...state.documents, ...update }
   }));
 },

 refreshDocuments: async (namespace) => {
   console.log('Refreshing documents for namespace:', namespace);
   const state = get();
   if (!state.isConfigured || !namespace) {
     console.log('Cannot refresh - not configured or no namespace');
     return;
   }

   state.setIsLoading(true);
   let retryCount = 0;
   const maxRetries = 3;
   const retryDelay = 1000;

   while (retryCount < maxRetries) {
     try {
       console.log(`Refresh attempt ${retryCount + 1} of ${maxRetries}`);
       
       const config = {
         apiKeys: state.apiKeys,
         vectordb: state.vectorDBConfig,
         embedding: { provider: 'voyage' as const }
       };

       if (!config.apiKeys.pinecone || !config.vectordb.indexName) {
         throw new Error('Missing required configuration');
       }

       const response = await fetch('/api/vector', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           operation: 'query_context',
           config,
           text: 'list all documents',
           namespace,
           filter: {
             $and: [
               { isComplete: { $eq: true } }
             ]
           }
         })
       });

       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || `Server responded with ${response.status}`);
       }

       const data = await response.json();
       console.log('Documents refreshed successfully:', data);
       
       if (!data.matches) {
         console.log('No documents found in namespace');
         state.setDocuments({ types: {} });
       } else {
         state.setDocuments({ types: {}, ...data });
       }

       state.setIsLoading(false);
       state.setError(null);
       return;

     } catch (error: any) {
       console.error(`Refresh attempt ${retryCount + 1} failed:`, error);
       retryCount++;
       
       if (retryCount === maxRetries) {
         state.setError(`Failed to refresh documents: ${error.message}`);
         state.setIsLoading(false);
         return;
       }
       
       await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
     }
   }
 },

 setCodeBlocks: (blocks) => {
   if (!validateCodeBlocks(blocks)) {
     console.error('Invalid code blocks format');
     return;
   }
   console.log('Setting code blocks:', blocks.length);
   set({ codeBlocks: blocks });
 },

 addCodeBlock: (block) => {
   console.log('Adding code block:', block.id);
   set(state => ({
     codeBlocks: [...state.codeBlocks, block],
     pendingChanges: true
   }));
 },

 updateCodeBlock: (id, update) => {
   console.log('Updating code block:', id);
   set(state => ({
     codeBlocks: state.codeBlocks.map(block => 
       block.id === id ? { ...block, ...update } : block
     ),
     pendingChanges: true
   }));
 },

 removeCodeBlock: (id) => {
   console.log('Removing code block:', id);
   set(state => ({
     codeBlocks: state.codeBlocks.filter(block => block.id !== id),
     pendingChanges: true
   }));
 },

 setAnnotations: (annotations) => {
   console.log('Setting annotations:', annotations.length);
   set({ annotations });
 },

 addAnnotation: (annotation) => {
   console.log('Adding annotation:', annotation);
   set(state => ({
     annotations: [...state.annotations, annotation],
     pendingChanges: true
   }));
 },

 clearState: () => {
   console.log('Clearing project state');
   set({
     messages: [],
     activePlan: null,
     documents: { types: {} },
     codeBlocks: [],
     annotations: [],
     error: null,
     pendingChanges: false,
     lastSaved: null
   });
   get().logEvent({ type: 'state_cleared' });
 },

 loadState: async (projectId) => {
   console.log('Loading project state:', projectId);
   try {
     const state = get();
     const project = state.projects[projectId];
     
     if (!project) {
       throw new Error('Project not found');
     }

     // First clear existing state
     state.clearState();

     // Then load new state with validation
     if (validateMessages(project.state.messages)) {
       set({ messages: project.state.messages });
     }

     if (project.state.activePlan) {
       set({ activePlan: project.state.activePlan });
     }

     if (validateDocuments(project.state.documents)) {
       set({ documents: project.state.documents });
     }

     if (validateCodeBlocks(project.state.codeBlocks)) {
       set({ codeBlocks: project.state.codeBlocks });
     }

     if (Array.isArray(project.state.annotations)) {
       set({ annotations: project.state.annotations });
     }

     set({
       error: null,
       isLoading: false,
       pendingChanges: false
     });

     state.logEvent({ type: 'state_loaded', payload: { projectId } });

   } catch (error) {
     console.error('Error loading project state:', error);
     get().logError(error as Error);
     throw error;
   }
 },

 getState: () => {
   const state = get();
   return {
     messages: state.messages,
     activePlan: state.activePlan,
     documents: state.documents,
     codeBlocks: state.codeBlocks,
     annotations: state.annotations,
     metadata: {
       lastModified: new Date().toISOString(),
       modifiedBy: 'current-user'
     }
   };
 },

 validateState: () => {
   const state = get().getState();
   return (
     validateMessages(state.messages) &&
     validateCodeBlocks(state.codeBlocks) &&
     validateDocuments(state.documents) &&
     Array.isArray(state.annotations)
   );
 },

 setIsLoading: (loading) => set({ isLoading: loading }),
 
 setError: (error) => {
   console.log('Setting error:', error);
   set({ error });
 },
 
 logError: (error: Error) => {
   console.error('Chat store error:', error);
   set({ 
     lastError: error,
     error: error.message 
   });
   get().logEvent({ type: 'error_occurred', payload: { error: error.message } });
 },
 
 clearError: () => {
   console.log('Clearing error state');
   set({ error: null, lastError: null });
 },

 logEvent: (event) => {
  console.log('Logging event:', event.type);
  set(state => ({
    eventLog: [...state.eventLog, { ...event, timestamp: Date.now() }]
  }));
},

getEvents: (since = 0) => get().eventLog.filter(event => event.timestamp > since),

clearEvents: () => {
  console.log('Clearing event log');
  set({ eventLog: [] });
}
}));

export const useCurrentProject = () => {
const messages = useChatStore(state => state.messages);
const activePlan = useChatStore(state => state.activePlan);
return { messages, activePlan };
};

export const useMessages = () => useChatStore(state => state.messages);
export const useActivePlan = () => useChatStore(state => state.activePlan);
export const useDocuments = () => useChatStore(state => state.documents);
export const useCodeBlocks = () => useChatStore(state => state.codeBlocks);
export const useAnnotations = () => useChatStore(state => state.annotations);

export const useHasChanges = () => {
const state = useChatStore.getState();
return state.pendingChanges;
};