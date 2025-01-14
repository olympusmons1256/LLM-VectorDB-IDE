// src/components/PlanManager/types.ts
export interface Reference {
    id: string;
    title: string;
    url?: string;
    content?: string;
    type: 'link' | 'text' | 'code';
    embeddings?: number[];
    vectorId?: string;
    addedAt: string;
    updatedAt: string;
  }
  
  export interface PlanKnowledge {
    id: string;
    title: string;
    description?: string;
    references: Reference[];
    tags?: string[];
    addedAt: string;
    updatedAt: string;
  }
  
  export interface PlanStep {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
    knowledgeRefs?: string[]; // IDs of related knowledge items
  }
  
  export interface Plan {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    steps: PlanStep[];
    knowledge: PlanKnowledge[];
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
  }
  
  export interface PlanStoreState {
    plans: Plan[];
    activePlanId: string | null;
    loading: boolean;
    error: string | null;
    initialized: boolean;
  }
  
  export interface PlanActions {
    createPlan: (plan: Omit<Plan, 'id'>) => string;
    updatePlan: (id: string, updates: Partial<Plan>) => void;
    updateStep: (planId: string, stepId: string, updates: Partial<PlanStep>) => void;
    deletePlan: (id: string) => void;
    setActivePlan: (id: string | null) => void;
    addKnowledge: (planId: string, knowledge: PlanKnowledge) => void;
    updateKnowledge: (planId: string, knowledgeId: string, updates: Partial<PlanKnowledge>) => void;
    deleteKnowledge: (planId: string, knowledgeId: string) => void;
    addReference: (planId: string, knowledgeId: string, reference: Reference) => void;
    updateReference: (planId: string, knowledgeId: string, referenceId: string, updates: Partial<Reference>) => void;
    deleteReference: (planId: string, knowledgeId: string, referenceId: string) => void;
    linkKnowledgeToStep: (planId: string, stepId: string, knowledgeId: string) => void;
    unlinkKnowledgeFromStep: (planId: string, stepId: string, knowledgeId: string) => void;
    getPlanById: (id: string) => Plan | undefined;
    clearPlans: () => void;
  }