// src/components/Chat/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useServices } from '@/services/manager';
import { useChatStore, useCanvasChat } from './store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ComponentProps } from '@/types/canvas';

interface ChatProps extends ComponentProps {
 canvasId: string;
 activeTools?: Record<string, boolean>;
 onToolRequest?: (tool: string) => void;
}

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

export const Chat: React.FC<ChatProps> = ({
 id,
 canvasId,
 isActive,
 onActivate,
 onClose,
 activeTools,
 onToolRequest
}) => {
 const { llm } = useServices(canvasId);
 const { messages, addMessage, clearMessages } = useCanvasChat(canvasId);
 const [message, setMessage] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isServiceReady, setIsServiceReady] = useState(false);
 const [serviceError, setServiceError] = useState<string | null>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const getSystemMessage = () => {
   return `You are a helpful AI assistant with access to Gepetto, a tool coordinator who can create and manage specialized tools for different tasks.

Available tools through Gepetto include:
- "Plan Manager" for creating and managing plans, tasks, and objectives
- "Document Manager" for handling documents, text analysis, and content management
- "Code Blocks" for code creation, analysis, and management

When a user's request would benefit from any of these tools, you should:
1. Mention the specific tool by its exact name (e.g., "Plan Manager")
2. If the tool isn't currently available, request it from Gepetto
3. Explain how the tool will help accomplish the user's goal

Always maintain context of the conversation and any active tools. Current active tools: ${
     Object.entries(activeTools || {})
       .filter(([_, isActive]) => isActive)
       .map(([tool]) => tool)
       .join(', ') || 'None'
   }

For example:
- When users want to create plans: "Let me ask Gepetto to bring up the Plan Manager..."
- For document tasks: "I'll have Gepetto activate the Document Manager..."
- For code work: "Let me get Gepetto to set up the Code Blocks tool..."`;
 };

 const parseResponseForTools = (content: string) => {
   const toolMentions = {
     'Plan Manager': 'plans',
     'Document Manager': 'documents',
     'Code Blocks': 'codeBlocks'
   };

   Object.entries(toolMentions).forEach(([mention, toolType]) => {
     if (content.includes(mention) && onToolRequest) {
       onToolRequest(toolType);
     }
   });
 };

 const initializeServices = async () => {
   try {
     const response = await llm.complete([
       {
         role: 'system',
         content: getSystemMessage()
       },
       { 
         role: 'user', 
         content: 'Hi' 
       }
     ], {
       maxTokens: 100
     });
     
     if (response.content) {
       setIsServiceReady(true);
       setServiceError(null);
     } else {
       throw new Error('Invalid service response');
     }
   } catch (error) {
     console.error('Failed to initialize chat services:', error);
     setServiceError(error instanceof Error ? error.message : 'Service initialization failed');
     setIsServiceReady(false);
   }
 };

 useEffect(() => {
   initializeServices();
 }, [llm]);

 const scrollToBottom = () => {
   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 useEffect(() => {
   scrollToBottom();
 }, [messages]);

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   if (!message.trim() || isLoading || !isServiceReady) return;

   const userMessage: Message = {
     id: crypto.randomUUID(),
     role: 'user',
     content: message,
     timestamp: new Date().toISOString()
   };

   addMessage(userMessage);
   setMessage('');
   setIsLoading(true);

   try {
     const response = await llm.complete([
       {
         role: 'system',
         content: getSystemMessage()
       },
       ...messages.map(m => ({
         role: m.role,
         content: m.content
       })),
       {
         role: 'user',
         content: message
       }
     ]);

     if (response.content) {
       const assistantMessage: Message = {
         id: crypto.randomUUID(),
         role: 'assistant',
         content: response.content,
         timestamp: new Date().toISOString(),
         metadata: {
           model: response.model,
           usage: response.usage
         }
       };
       addMessage(assistantMessage);

       // Check for tool mentions and activate if needed
       parseResponseForTools(response.content);
     } else {
       throw new Error('Invalid response format from LLM');
     }
   } catch (error) {
     console.error('Error sending message:', error);
     const errorMessage: Message = {
       id: crypto.randomUUID(),
       role: 'assistant',
       content: 'Sorry, there was an error processing your message. Please try again.',
       timestamp: new Date().toISOString(),
       metadata: {
         error: error instanceof Error ? error.message : 'Unknown error'
       }
     };
     addMessage(errorMessage);
   } finally {
     setIsLoading(false);
   }
 };

 if (serviceError) {
   return (
     <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
       <h3 className="text-lg font-semibold text-red-800">Service Error</h3>
       <p className="text-red-600 mt-2">{serviceError}</p>
     </div>
   );
 }

 if (!isServiceReady) {
   return (
     <div className="flex items-center justify-center h-64">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
     </div>
   );
 }

 return (
   <div 
     className={`flex flex-col h-full ${isActive ? 'border-blue-500' : 'border-gray-200'}`}
     onClick={onActivate}
   >
     <div className="flex justify-between items-center p-4 border-b">
       <h3 className="text-lg font-semibold">Chat</h3>
       <div className="space-x-2">
         <button
           onClick={() => clearMessages()}
           className="text-gray-500 hover:text-gray-700"
         >
           Clear
         </button>
         {onClose && (
           <button
             onClick={onClose}
             className="text-gray-500 hover:text-red-500"
           >
             Close
           </button>
         )}
       </div>
     </div>

     <div className="flex-1 overflow-y-auto p-4 space-y-4">
       {messages.map((msg) => (
         <div
           key={msg.id}
           className={`flex ${
             msg.role === 'user' ? 'justify-end' : 'justify-start'
           }`}
         >
           <div
             className={`max-w-[80%] rounded-lg p-4 ${
               msg.role === 'user'
                 ? 'bg-blue-500 text-white'
                 : 'bg-gray-100'
             }`}
           >
             <ReactMarkdown
               remarkPlugins={[remarkGfm]}
               components={{
                 code: ({ node, inline, className, children, ...props }) => {
                   const content = String(children).replace(/\n$/, '');
                   if (inline) {
                     return (
                       <code className="bg-gray-800 px-1 rounded" {...props}>
                         {content}
                       </code>
                     );
                   }
                   return (
                     <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                       <code className={className} {...props}>
                         {content}
                       </code>
                     </pre>
                   );
                 }
               }}
             >
               {String(msg.content)}
             </ReactMarkdown>
           </div>
         </div>
       ))}
       {isLoading && (
         <div className="flex justify-start">
           <div className="bg-gray-100 rounded-lg p-4 flex items-center space-x-2">
             <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
             <span>Thinking...</span>
           </div>
         </div>
       )}
       <div ref={messagesEndRef} />
     </div>

     <form onSubmit={handleSubmit} className="p-4 border-t">
       <div className="flex space-x-2">
         <input
           type="text"
           value={message}
           onChange={(e) => setMessage(e.target.value)}
           placeholder={isLoading ? 'Waiting for response...' : 'Type your message...'}
           className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
           disabled={isLoading || !isServiceReady}
         />
         <button
           type="submit"
           disabled={isLoading || !message.trim() || !isServiceReady}
           className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           Send
         </button>
       </div>
     </form>
   </div>
 );
};

export default Chat;