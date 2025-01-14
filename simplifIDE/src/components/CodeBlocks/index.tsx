// src/components/CodeBlocks/index.tsx
import React, { useCallback, useState } from 'react';
import { useCodeBlocksStore } from './store';
import { useServices } from '../../services/manager';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Editor } from '@monaco-editor/react';
import { Play, Save, Trash2, Plus } from 'lucide-react';

interface CodeBlocksProps {
  canvasId: string;
  isActive?: boolean;
  onActivate?: () => void;
}

interface ExecutionResult {
  output: string;
  error?: string;
  annotations?: Array<{
    line: number;
    message: string;
    type: 'error' | 'warning' | 'info';
  }>;
}

export const CodeBlocks: React.FC<CodeBlocksProps> = ({
  canvasId,
  isActive = false,
  onActivate
}) => {
  const { llm } = useServices(canvasId);
  const {
    blocks,
    activeBlockId,
    createBlock,
    updateBlock,
    deleteBlock,
    setActiveBlock
  } = useCodeBlocksStore();
  const [executing, setExecuting] = useState<string | null>(null);

  const handleExecute = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setExecuting(blockId);
    try {
      // First, analyze code with LLM
      const analysis = await llm.analyze(block.code, block.language);

      // Execute code (this is a placeholder - implement actual execution)
      const executionResult: ExecutionResult = {
        output: `Analysis: ${analysis.content}\n\nExecution result would appear here.`,
        annotations: []
      };

      updateBlock(blockId, {
        lastExecution: {
          timestamp: new Date().toISOString(),
          result: executionResult
        }
      });
    } catch (error) {
      updateBlock(blockId, {
        lastExecution: {
          timestamp: new Date().toISOString(),
          result: {
            output: '',
            error: error instanceof Error ? error.message : 'Execution failed',
            annotations: [{
              line: 1,
              message: error instanceof Error ? error.message : 'Execution failed',
              type: 'error'
            }]
          }
        }
      });
    } finally {
      setExecuting(null);
    }
  }, [blocks, llm, updateBlock]);

  const handleCreateBlock = useCallback(() => {
    const id = createBlock({
      title: 'New Block',
      code: '// Enter your code here',
      language: 'javascript'
    });
    setActiveBlock(id);
  }, [createBlock, setActiveBlock]);

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  return (
    <div 
      className={`flex flex-col h-full ${isActive ? 'border-blue-500' : 'border-gray-200'}`}
      onClick={onActivate}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-medium">Code Blocks</h3>
        <Button onClick={handleCreateBlock} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Block
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 gap-4">
        {/* Blocks List */}
        <div className="w-64 border-r pr-4">
          <ScrollArea className="h-[600px]">
            {blocks.map(block => (
              <div
                key={block.id}
                className={`p-2 mb-2 rounded cursor-pointer ${
                  block.id === activeBlockId
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveBlock(block.id)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium truncate">{block.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlock(block.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-gray-500">{block.language}</div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Active Block Editor */}
        {activeBlock ? (
          <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
              <input
                type="text"
                value={activeBlock.title}
                onChange={(e) => updateBlock(activeBlock.id, { title: e.target.value })}
                className="text-lg font-medium bg-transparent border-none focus:outline-none"
              />
              <div className="space-x-2">
                <Button
                  onClick={() => handleExecute(activeBlock.id)}
                  disabled={executing === activeBlock.id}
                >
                  {executing === activeBlock.id ? (
                    'Executing...'
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="code">
              <TabsList>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="output">Output</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="h-[500px]">
                <Editor
                  height="100%"
                  defaultLanguage={activeBlock.language}
                  value={activeBlock.code}
                  onChange={(value) => value && updateBlock(activeBlock.id, { code: value })}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    readOnly: executing === activeBlock.id
                  }}
                />
              </TabsContent>

              <TabsContent value="output">
                <ScrollArea className="h-[500px] border rounded-md bg-black text-white p-4">
                  {activeBlock.lastExecution?.result.error ? (
                    <pre className="text-red-500">
                      {activeBlock.lastExecution.result.error}
                    </pre>
                  ) : (
                    <pre>{activeBlock.lastExecution?.result.output || 'No output yet'}</pre>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No block selected
          </div>
        )}
      </CardContent>
    </div>
  );
};

export default CodeBlocks;