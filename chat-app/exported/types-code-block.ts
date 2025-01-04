// types/code-block.ts

export interface CodeBlock {
    id: string;
    type: 'code';
    language: string;
    code: string;
    reference?: {
      line: number;
      messageIndex: number;
    };
    metadata?: {
      filename?: string;
      path?: string;
      timestamp?: string;
      linkedMessageId?: string;
    };
  }
  
  export interface CodeReference {
    blockId: string;
    location: {
      startLine: number;
      endLine: number;
      startColumn?: number;
      endColumn?: number;
    };
  }
  
  export interface CodeAnnotation {
    blockId: string;
    messageId: string;
    textContent: string;
    index: number;
  }