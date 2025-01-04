// components/CodeContainer.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Copy, Terminal, ChevronDown, ChevronUp, Search, Link, ExternalLink } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  tools?: CodeBlock[];
}

interface CodeContainerProps {
  messages: Message[];
  onBlockSelect?: (blockId: string) => void;
  highlightedBlockId?: string;
  annotations?: CodeAnnotation[];
}

function CodeBlockGroup({ 
  blocks,
  index,
  title,
  onSelect,
  isHighlighted,
  annotations
}: { 
  blocks: CodeBlock[];
  index: number;
  title?: string;
  onSelect?: (blockId: string) => void;
  isHighlighted?: boolean;
  annotations?: CodeAnnotation[];
}) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const blockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && blockRef.current) {
      blockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const copyToClipboard = async () => {
    try {
      const combinedCode = blocks.map(block => 
        `// ${block.language}\n${block.code}\n`
      ).join('\n');
      
      await navigator.clipboard.writeText(combinedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getHighlightedCode = (code: string) => {
    if (!searchTerm) return code;
    
    const regex = new RegExp(searchTerm, 'gi');
    return code.replace(regex, match => `••${match}••`);
  };

  const getBlockAnnotations = (blockId: string) => {
    return annotations?.filter(a => a.blockId === blockId) || [];
  };

  return (
    <div 
      ref={blockRef}
      className={cn(
        "border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800",
        isHighlighted && "ring-2 ring-blue-500"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm">
            {title && (
              <span className="font-medium text-blue-500 dark:text-blue-400 mr-1">
                {title}
              </span>
            )}
            Block {index + 1} ({blocks.length} file{blocks.length > 1 ? 's' : ''})
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Search in code"
          >
            <Search className="h-4 w-4" />
          </button>
          {blocks[0]?.metadata?.linkedMessageId && (
            <button
              onClick={() => onSelect?.(blocks[0].id)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500"
              title="Go to reference in chat"
            >
              <Link className="h-4 w-4" />
            </button>
          )}
          {blocks[0]?.metadata?.path && (
            <button
              onClick={() => {/* Open in editor */}}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Open in editor"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Copy all blocks"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isSearching && (
        <div className="p-2 border-b dark:border-gray-700">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in code..."
            className="w-full p-1 text-sm border rounded dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
      )}

      {!isCollapsed && (
        <div className="divide-y dark:divide-gray-700">
          {blocks.map((block, blockIndex) => (
            <div key={blockIndex} className="p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{block.language}</span>
                  {block.metadata?.filename && (
                    <span className="text-xs text-gray-400">{block.metadata.filename}</span>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(block.code);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Copy block"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>

              <Highlight
                theme={themes.nightOwl}
                code={getHighlightedCode(block.code)}
                language={block.language.toLowerCase()}
              >
                {({ style, tokens, getLineProps, getTokenProps }) => (
                  <pre 
                    style={style} 
                    className="text-sm font-mono relative"
                  >
                    {tokens.map((line, i) => {
                      const lineNumber = i + 1;
                      const annotations = getBlockAnnotations(block.id)
                        .filter(a => a.index === lineNumber);
                      
                      return (
                        <div key={i} className="relative group">
                          <div {...getLineProps({ line })} className="flex">
                            <span className="select-none inline-block w-8 text-right mr-4 text-gray-500">
                              {lineNumber}
                            </span>
                            <span>
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                              ))}
                            </span>
                          </div>
                          {annotations.map((annotation, idx) => (
                            <div
                              key={idx}
                              className="hidden group-hover:block absolute left-full ml-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded shadow-lg max-w-xs text-xs"
                            >
                              {annotation.textContent}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </pre>
                )}
              </Highlight>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CodeContainer({ 
  messages,
  onBlockSelect,
  highlightedBlockId,
  annotations = []
}: CodeContainerProps) {
  // Group code blocks by planId and extract plan titles
  const groupedBlocks = messages.reduce<Array<{
    blocks: CodeBlock[];
    planId?: string;
    title?: string;
    messageId?: string;
  }>>((groups, msg) => {
    if (!msg.tools?.length) return groups;

    // Check for plan creation in the message
    const planMatch = msg.content.match(/## Plan:\s*([^\n]+)/);
    if (planMatch) {
      const planId = msg.id;
      const planTitle = planMatch[1].trim();

      groups.push({
        blocks: msg.tools.map(tool => ({
          ...tool,
          metadata: { ...tool.metadata, linkedMessageId: msg.id }
        })),
        planId,
        title: planTitle,
        messageId: msg.id
      });
      return groups;
    }

    groups.push({
      blocks: msg.tools.map(tool => ({
        ...tool,
        metadata: { ...tool.metadata, linkedMessageId: msg.id }
      })),
      messageId: msg.id
    });

    return groups;
  }, []);

  if (groupedBlocks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>No code blocks yet</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {groupedBlocks.map((group, index) => (
        <CodeBlockGroup
          key={group.messageId || index}
          blocks={group.blocks}
          index={index}
          title={group.title}
          onSelect={onBlockSelect}
          isHighlighted={group.blocks.some(b => b.id === highlightedBlockId)}
          annotations={annotations}
        />
      ))}
    </div>
  );
}

export type { Message as CodeContainerMessage };