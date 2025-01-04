// components/ChatMessage.tsx
'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/types/message';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import { PlanControlPanel } from './PlanControlPanel';
import { useChatStore } from '@/store/chat-store';
import { createPlan, updatePlan } from '@/services/plans';

interface ChatMessageProps {
  message: Message;
  onSendMessage: (content: string) => void;
  onCodeBlockReference?: (blockId: string) => void;
  annotations?: CodeAnnotation[];
}

export default function ChatMessage({ 
  message, 
  onSendMessage,
  onCodeBlockReference,
  annotations = []
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const messageContent = typeof message.content === 'string' 
    ? message.content 
    : 'Invalid message format';

  const [showControls, setShowControls] = useState(false);
  const [isProcessingPlan, setIsProcessingPlan] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);

  const activePlan = useChatStore((state) => state.projects[state.currentNamespace]?.activePlan);
  const setActivePlan = useChatStore((state) => state.setActivePlan);
  const apiKeys = useChatStore((state) => state.apiKeys);
  const vectorDBConfig = useChatStore((state) => state.vectorDBConfig);
  const currentNamespace = useChatStore((state) => state.currentNamespace);

  useEffect(() => {
    if (!isUser && message.tools?.length) {
      // Process code blocks and create annotations
      const blocks = message.tools.map((tool, idx) => ({
        ...tool,
        id: `${message.id}-${idx}`,
        metadata: {
          ...tool.metadata,
          linkedMessageId: message.id
        }
      }));
      setCodeBlocks(blocks);
    }
  }, [message, isUser]);

  // Handle code block references in content
  const processContent = (content: string) => {
    let processedContent = content;
    const codeBlockPattern = /\[CODE BLOCK\](?:\s*\((\d+)\))?/g;
    let match;
    let blockIndex = 0;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      const referencedIndex = match[1] ? parseInt(match[1]) - 1 : blockIndex;
      const block = codeBlocks[referencedIndex];
      if (block) {
        const reference = `[CODE BLOCK (${referencedIndex + 1})](${block.id})`;
        processedContent = processedContent.replace(match[0], reference);
        blockIndex++;
      }
    }

    return processedContent;
  };

  // Auto-update steps based on LLM response
  useEffect(() => {
    if (!isUser && activePlan && message.content) {
      const updatePlanStatus = async () => {
        try {
          let shouldUpdate = false;
          const updatedPlan = { ...activePlan };

          // Check for completed steps
          const completedStepMatch = message.content.match(/(?:Completed step:?\s*|Step completed:?\s*)(.+?)(?:\.|$)/i);
          const altCompletedMatch = message.content.match(/Completed:\s*(.+?)(?:\.|$)/i);
          const startingStepMatch = message.content.match(/Starting step:?\s*(.+?)(?:\.|$)/i);

          if (completedStepMatch || altCompletedMatch) {
            const stepTitle = (completedStepMatch?.[1] || altCompletedMatch?.[1])?.trim();
            updatedPlan.steps = updatedPlan.steps.map(step => 
              step.title.toLowerCase().includes(stepTitle.toLowerCase())
                ? { ...step, status: 'completed' as const, updated: new Date().toISOString() }
                : step
            );
            shouldUpdate = true;

            // Check if all steps are completed
            const allStepsCompleted = updatedPlan.steps.every(step => step.status === 'completed');
            if (allStepsCompleted) {
              updatedPlan.status = 'completed';
            }
          } else if (startingStepMatch) {
            const stepTitle = startingStepMatch[1].trim();
            updatedPlan.steps = updatedPlan.steps.map(step => 
              step.title.toLowerCase().includes(stepTitle.toLowerCase())
                ? { ...step, status: 'in_progress' as const, updated: new Date().toISOString() }
                : step
            );
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            const config = {
              apiKeys,
              vectordb: vectorDBConfig,
              embedding: { provider: 'voyage' as const }
            };

            updatedPlan.updated = new Date().toISOString();
            await updatePlan(updatedPlan, config);
            setActivePlan(updatedPlan);
            window.dispatchEvent(new CustomEvent('planUpdated'));
          }
        } catch (error) {
          console.error('Error updating plan status:', error);
          setProcessingError('Failed to update plan status');
        }
      };

      updatePlanStatus();
    }
  }, [message, isUser, activePlan, currentNamespace]);

  // Handle code block reference clicks
  const handleCodeBlockClick = (blockId: string) => {
    if (onCodeBlockReference) {
      onCodeBlockReference(blockId);
    }
  };

  // Check if message contains plan-related content
  useEffect(() => {
    if (!isUser) {
      const isPlanRelated = 
        message.content.includes('## Plan:') ||
        message.content.includes('Plan:') ||
        message.content.includes('Next Step:') ||
        message.content.includes('Current Step:') ||
        message.content.includes('Completed step:') ||
        (message.content.includes('Starting step:') && message.content.includes('Let me know if you would like to proceed'));
      
      setShowControls(isPlanRelated);
    }
  }, [message, isUser]);

  const handleExecuteNext = async () => {
    setIsProcessingPlan(true);
    setProcessingError(null);

    try {
      if (!activePlan) {
        // Create new plan if none exists
        const config = {
          apiKeys,
          vectordb: vectorDBConfig,
          embedding: { provider: 'voyage' as const }
        };

        const newPlan = await createPlan(message.content, config, currentNamespace);
        if (newPlan) {
          setActivePlan(newPlan);
          // Execute first step
          const firstStep = newPlan.steps[0];
          onSendMessage(`Please proceed with step "${firstStep.title}" of the plan.`);
        }
      } else {
        // Find next pending step
        const nextStep = activePlan.steps.find(step => step.status === 'pending');
        if (nextStep) {
          onSendMessage(`Please proceed with step "${nextStep.title}" of the plan.`);
        } else {
          setProcessingError('No remaining steps to execute');
        }
      }
    } catch (error) {
      console.error('Error executing next step:', error);
      setProcessingError('Failed to execute next step');
    } finally {
      setIsProcessingPlan(false);
    }
  };

  const handleAutoPilot = async () => {
    setIsProcessingPlan(true);
    setProcessingError(null);

    try {
      if (!activePlan) {
        // Create new plan if none exists
        const config = {
          apiKeys,
          vectordb: vectorDBConfig,
          embedding: { provider: 'voyage' as const }
        };

        const newPlan = await createPlan(message.content, config, currentNamespace);
        if (newPlan) {
          setActivePlan(newPlan);
          // Start with first step
          onSendMessage(`Please execute the entire plan automatically, starting with step "${newPlan.steps[0].title}". After each step, mark it as completed and proceed to the next step until all steps are done.`);
        }
      } else {
        // Continue from first pending step
        const nextStep = activePlan.steps.find(step => step.status === 'pending');
        if (nextStep) {
          onSendMessage(`Please continue executing the remaining steps automatically, starting with "${nextStep.title}". After each step, mark it as completed and proceed to the next step until all steps are done.`);
        } else {
          setProcessingError('No remaining steps to execute');
        }
      }
    } catch (error) {
      console.error('Error starting auto-pilot:', error);
      setProcessingError('Failed to start auto-pilot');
    } finally {
      setIsProcessingPlan(false);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        <div className="prose dark:prose-invert max-w-none prose-sm prose-p:leading-relaxed prose-pre:p-0">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ inline, className, children }) => {
                if (inline) {
                  return <code className={className}>{children}</code>;
                }
                // Don't render code blocks in markdown
                return null;
              },
              pre: ({ children }) => null,
              a: ({ href, children }) => {
                // Check if this is a code block reference
                if (href?.startsWith('code-')) {
                  return (
                    <button
                      onClick={() => handleCodeBlockClick(href)}
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
            {processContent(messageContent)}
          </ReactMarkdown>
        </div>
        
        {showControls && !isUser && (
          <div className="mt-4 border-t dark:border-gray-700 pt-4">
            {processingError && (
              <div className="mb-4 p-2 text-sm text-red-500 bg-red-100 dark:bg-red-900/20 rounded">
                {processingError}
              </div>
            )}
            <PlanControlPanel 
              onExecuteNext={handleExecuteNext}
              onAutoExecute={handleAutoPilot}
              isProcessing={isProcessingPlan}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export type { ChatMessageProps };