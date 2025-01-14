// src/components/CodeBlocks/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExecutionResult {
  output: string;
  error?: string;
  annotations?: Array<{
    line: number;
    message: string;
    type: 'error' | 'warning' | 'info';
  }>;
}

interface CodeBlock {
  id: string;
  title: string;
  code: string;
  language: string;
  lastExecution?: {
    timestamp: string;
    result: ExecutionResult;
  };
  metadata?: Record<string, any>;
}

interface CodeBlocksState {
  blocks: CodeBlock[];
  activeBlockId: string | null;
  createBlock: (block: Omit<CodeBlock, 'id'>) => string;
  updateBlock: (id: string, updates: Partial<CodeBlock>) => void;
  deleteBlock: (id: string) => void;
  setActiveBlock: (id: string | null) => void;
  getBlockById: (id: string) => CodeBlock | undefined;
  clearBlocks: () => void;
}

export const useCodeBlocksStore = create<CodeBlocksState>()(
  persist(
    (set, get) => ({
      blocks: [],
      activeBlockId: null,

      createBlock: (block) => {
        const id = crypto.randomUUID();
        set((state) => ({
          blocks: [...state.blocks, { ...block, id }]
        }));
        return id;
      },

      updateBlock: (id, updates) => set((state) => ({
        blocks: state.blocks.map(block =>
          block.id === id ? { ...block, ...updates } : block
        )
      })),

      deleteBlock: (id) => set((state) => ({
        blocks: state.blocks.filter(block => block.id !== id),
        activeBlockId: state.activeBlockId === id ? null : state.activeBlockId
      })),

      setActiveBlock: (id) => set({ activeBlockId: id }),

      getBlockById: (id) => {
        return get().blocks.find(block => block.id === id);
      },

      clearBlocks: () => set({ blocks: [], activeBlockId: null })
    }),
    {
      name: 'code-blocks-storage',
      partialize: (state) => ({
        blocks: state.blocks
      })
    }
  )
);

// Helper hooks for common code block operations
export function useActiveBlock() {
  const { blocks, activeBlockId, updateBlock } = useCodeBlocksStore();
  const activeBlock = blocks.find(block => block.id === activeBlockId);

  return {
    block: activeBlock,
    updateBlock: activeBlock ? 
      (updates: Partial<CodeBlock>) => updateBlock(activeBlock.id, updates) : 
      undefined
  };
}

export function useBlockExecution(blockId: string) {
  const block = useCodeBlocksStore(state => state.blocks.find(b => b.id === blockId));
  const updateBlock = useCodeBlocksStore(state => state.updateBlock);

  return {
    lastExecution: block?.lastExecution,
    updateExecution: (result: ExecutionResult) => {
      updateBlock(blockId, {
        lastExecution: {
          timestamp: new Date().toISOString(),
          result
        }
      });
    }
  };
}

export function useBlocksManagement() {
  return useCodeBlocksStore(state => ({
    createBlock: state.createBlock,
    deleteBlock: state.deleteBlock,
    clearBlocks: state.clearBlocks
  }));
}