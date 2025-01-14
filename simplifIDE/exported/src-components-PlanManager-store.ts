// src/components/PlanManager/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PlanStoreState, 
  PlanActions, 
  Plan, 
  PlanStep, 
  PlanKnowledge, 
  Reference 
} from './types';

const initialState: PlanStoreState = {
  plans: [],
  activePlanId: null,
  loading: false,
  error: null,
  initialized: false
};

export const usePlanStore = create<PlanStoreState & PlanActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      createPlan: (plan) => {
        const id = crypto.randomUUID();
        const newPlan = {
          ...plan,
          id,
          knowledge: plan.knowledge || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set((state) => ({
          plans: [...state.plans, newPlan],
          activePlanId: id
        }));

        return id;
      },

      updatePlan: (id, updates) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === id ? {
            ...plan,
            ...updates,
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      updateStep: (planId, stepId, updates) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            steps: plan.steps.map(step =>
              step.id === stepId ? { ...step, ...updates } : step
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      deletePlan: (id) => set((state) => ({
        plans: state.plans.filter(plan => plan.id !== id),
        activePlanId: state.activePlanId === id ? null : state.activePlanId
      })),

      setActivePlan: (id) => set({ activePlanId: id }),

      addKnowledge: (planId, knowledge) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            knowledge: [...plan.knowledge, knowledge],
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      updateKnowledge: (planId, knowledgeId, updates) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            knowledge: plan.knowledge.map(k =>
              k.id === knowledgeId ? {
                ...k,
                ...updates,
                updatedAt: new Date().toISOString()
              } : k
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      deleteKnowledge: (planId, knowledgeId) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            knowledge: plan.knowledge.filter(k => k.id !== knowledgeId),
            steps: plan.steps.map(step => ({
              ...step,
              knowledgeRefs: step.knowledgeRefs?.filter(ref => ref !== knowledgeId)
            })),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      addReference: (planId, knowledgeId, reference) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            knowledge: plan.knowledge.map(k =>
              k.id === knowledgeId ? {
                ...k,
                references: [...k.references, reference],
                updatedAt: new Date().toISOString()
              } : k
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      updateReference: (planId, knowledgeId, referenceId, updates) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            knowledge: plan.knowledge.map(k =>
              k.id === knowledgeId ? {
                ...k,
                references: k.references.map(ref =>
                  ref.id === referenceId ? {
                    ...ref,
                    ...updates,
                    updatedAt: new Date().toISOString()
                  } : ref
                ),
                updatedAt: new Date().toISOString()
              } : k
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      deleteReference: (planId, knowledgeId, referenceId) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            knowledge: plan.knowledge.map(k =>
              k.id === knowledgeId ? {
                ...k,
                references: k.references.filter(ref => ref.id !== referenceId),
                updatedAt: new Date().toISOString()
              } : k
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      linkKnowledgeToStep: (planId, stepId, knowledgeId) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            steps: plan.steps.map(step =>
              step.id === stepId ? {
                ...step,
                knowledgeRefs: [...(step.knowledgeRefs || []), knowledgeId]
              } : step
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      unlinkKnowledgeFromStep: (planId, stepId, knowledgeId) => set((state) => ({
        plans: state.plans.map(plan =>
          plan.id === planId ? {
            ...plan,
            steps: plan.steps.map(step =>
              step.id === stepId ? {
                ...step,
                knowledgeRefs: step.knowledgeRefs?.filter(ref => ref !== knowledgeId)
              } : step
            ),
            updatedAt: new Date().toISOString()
          } : plan
        )
      })),

      getPlanById: (id) => {
        return get().plans.find(plan => plan.id === id);
      },

      clearPlans: () => set({
        plans: [],
        activePlanId: null,
        error: null
      })
    }),
    {
      name: 'plan-storage',
      partialize: (state) => ({
        plans: state.plans
      })
    }
  )
);

// Helper hook for working with plan knowledge
export function usePlanKnowledge(planId: string) {
  const { 
    plans,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    addReference,
    updateReference,
    deleteReference
  } = usePlanStore();

  const plan = plans.find(p => p.id === planId);

  return {
    knowledge: plan?.knowledge || [],
    addKnowledge: (knowledge: PlanKnowledge) => addKnowledge(planId, knowledge),
    updateKnowledge: (knowledgeId: string, updates: Partial<PlanKnowledge>) => 
      updateKnowledge(planId, knowledgeId, updates),
    deleteKnowledge: (knowledgeId: string) => deleteKnowledge(planId, knowledgeId),
    addReference: (knowledgeId: string, reference: Reference) => 
      addReference(planId, knowledgeId, reference),
    updateReference: (knowledgeId: string, referenceId: string, updates: Partial<Reference>) => 
      updateReference(planId, knowledgeId, referenceId, updates),
    deleteReference: (knowledgeId: string, referenceId: string) => 
      deleteReference(planId, knowledgeId, referenceId)
  };
}

// Helper hook for working with step-specific knowledge
export function useStepKnowledge(planId: string, stepId: string) {
  const { 
    plans,
    linkKnowledgeToStep,
    unlinkKnowledgeFromStep 
  } = usePlanStore();

  const plan = plans.find(p => p.id === planId);
  const step = plan?.steps.find(s => s.id === stepId);
  const knowledgeRefs = step?.knowledgeRefs || [];
  const linkedKnowledge = plan?.knowledge.filter(k => knowledgeRefs.includes(k.id)) || [];

  return {
    linkedKnowledge,
    linkKnowledge: (knowledgeId: string) => linkKnowledgeToStep(planId, stepId, knowledgeId),
    unlinkKnowledge: (knowledgeId: string) => unlinkKnowledgeFromStep(planId, stepId, knowledgeId)
  };
}

// Helper hook for plan execution
export function usePlanExecution(planId: string) {
  const plan = usePlanStore(state => state.plans.find(p => p.id === planId));
  const updatePlan = usePlanStore(state => state.updatePlan);
  const updateStep = usePlanStore(state => state.updateStep);

  return {
    plan,
    updatePlan: (updates: Partial<Plan>) => updatePlan(planId, updates),
    updateStep: (stepId: string, updates: Partial<PlanStep>) => 
      updateStep(planId, stepId, updates)
  };
}