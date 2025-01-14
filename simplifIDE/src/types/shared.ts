export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }
  
  export interface Document {
    id: string;
    name: string;
    content: string;
    format: string;
    created: string;
    updated: string;
    version: number;
  }
  
  export interface CodeBlock {
    id: string;
    code: string;
    language: string;
    created: string;
    updated: string;
    dependencies?: string[];
  }
  
  export interface Plan {
    id: string;
    title: string;
    description?: string;
    steps: PlanStep[];
    status: 'active' | 'completed' | 'abandoned';
    created: string;
    updated: string;
  }
  
  export interface PlanStep {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'active' | 'completed' | 'blocked';
    dependencies?: string[];
  }