// components/PlanManager.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plan, getActivePlans, updatePlan, deletePlan } from '@/services/plans';
import { Check, Clock, AlertCircle, PlayCircle, PauseCircle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { EmbeddingConfig } from '@/services/embedding';
import { debounce } from '@/lib/utils';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
 StatusBadge,
 PriorityBadge,
 ComplexityBadge,
 MetadataBadge,
 TypeBadge,
 CountBadge
} from '@/components/badges';
import { useInitializationStore } from '@/store/initialization-store';
import { useSaveStateStore } from '@/store/save-state-store';
import { useCurrentProject } from '@/store/chat-store';

interface PlanManagerProps {
 config: EmbeddingConfig;
 currentNamespace: string;
 onError: (error: string | null) => void;
 onPlanSelect: (plan: Plan | null) => void;
 selectedPlanId?: string;
}

export function PlanManager({ 
 config, 
 currentNamespace,
 onError,
 onPlanSelect,
 selectedPlanId 
}: PlanManagerProps) {
 const [plans, setPlans] = useState<Plan[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
 const [isDeletingPlan, setIsDeletingPlan] = useState(false);
 const [deleteError, setDeleteError] = useState<string | null>(null);
 const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
 const planCache = useRef(new Map<string, { data: Plan[]; timestamp: number }>());
 const { currentUser } = useSaveStateStore();
 const { activeProject } = useCurrentProject();
 const { stage } = useInitializationStore();

 useEffect(() => {
   if (!currentUser || !activeProject || stage !== 'complete') {
     return;
   }

   refreshPlans();
 }, [currentUser?.id, activeProject?.id, stage]);

 const refreshPlans = useCallback(
   debounce(async () => {
     if (!currentNamespace || !currentUser || !activeProject) return;

     const cached = planCache.current.get(currentNamespace);
     const now = Date.now();
     
     if (cached && now - cached.timestamp < 30000) {
       setPlans(cached.data);
       return;
     }

     setIsLoading(true);
     try {
       const activePlans = await getActivePlans(config, currentNamespace);
       const sortedPlans = activePlans.sort(
         (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
       );

       planCache.current.set(currentNamespace, {
         data: sortedPlans,
         timestamp: now
       });
       
       setPlans(sortedPlans);
     } catch (error: any) {
       console.error('Error refreshing plans:', error);
       onError(error.message);
     } finally {
       setIsLoading(false);
     }
   }, 1000),
   [currentNamespace, config, onError, currentUser?.id, activeProject?.id]
 );

 useEffect(() => {
   const handlePlanEvent = () => refreshPlans();
   window.addEventListener('planCreated', handlePlanEvent);
   window.addEventListener('planUpdated', handlePlanEvent);
   window.addEventListener('planDeleted', handlePlanEvent);
   return () => {
     window.removeEventListener('planCreated', handlePlanEvent);
     window.removeEventListener('planUpdated', handlePlanEvent);
     window.removeEventListener('planDeleted', handlePlanEvent);
   };
 }, [refreshPlans]);

 const handleStepStatusUpdate = async (
   planId: string,
   stepId: string, 
   newStatus: Plan['steps'][0]['status']
 ) => {
   const plan = plans.find(p => p.id === planId);
   if (!plan) return;

   try {
     const updatedPlan: Plan = {
       ...plan,
       steps: plan.steps.map(step => 
         step.id === stepId ? { ...step, status: newStatus, updated: new Date().toISOString() } : step
       ),
       updated: new Date().toISOString()
     };

     const allCompleted = updatedPlan.steps.every(step => step.status === 'completed');
     const anyFailed = updatedPlan.steps.some(step => step.status === 'failed');
     
     if (allCompleted) {
       updatedPlan.status = 'completed';
     } else if (anyFailed) {
       updatedPlan.status = 'cancelled';
     }

     await updatePlan(updatedPlan, config);
     
     setPlans(prevPlans => 
       prevPlans.map(p => p.id === planId ? updatedPlan : p)
     );
     
     if (selectedPlanId === planId) {
       onPlanSelect(updatedPlan);
     }

   } catch (error: any) {
     console.error('Error updating plan step:', error);
     onError(error.message);
   }
 };

 const handleDeletePlan = async (plan: Plan) => {
   if (!currentUser) return;
   
   setIsDeletingPlan(true);
   setDeleteError(null);
   try {
     await deletePlan(plan, config);
     setPlans(prevPlans => prevPlans.filter(p => p.id !== plan.id));
     
     if (selectedPlanId === plan.id) {
       onPlanSelect(null);
     }

     onError(null);
     
   } catch (error: any) {
     console.error('Error deleting plan:', error);
     const errorMessage = error.message || 'Failed to delete plan';
     setDeleteError(errorMessage);
     onError(errorMessage);
   } finally {
     setIsDeletingPlan(false);
     setPlanToDelete(null);
   }
 };

 if (!currentUser || !activeProject) {
   return null;
 }

 return (
   <div className="h-full flex flex-col">
     <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
       <h2 className="text-lg font-semibold">Project Plans</h2>
       <button
         onClick={() => refreshPlans()}
         className="p-1 hover:bg-accent rounded"
         disabled={isLoading}
       >
         <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
       </button>
     </div>

     <div className="flex-1 overflow-y-auto p-4 space-y-4">
       {plans.length === 0 ? (
         <div className="text-center text-muted-foreground py-8">
           {isLoading ? 'Loading plans...' : 'No plans created yet'}
         </div>
       ) : (
         plans.map(plan => (
           <div
             key={plan.id}
             className={`border dark:border-gray-700 rounded-lg ${
               selectedPlanId === plan.id ? 'ring-2 ring-primary' : ''
             } bg-card hover:bg-accent/50 transition-colors`}
           >
             <div className="p-4">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => setExpandedPlans(prev => {
                       const newSet = new Set(prev);
                       prev.has(plan.id) ? newSet.delete(plan.id) : newSet.add(plan.id);
                       return newSet;
                     })}
                     className="p-1 hover:bg-accent rounded"
                   >
                     {expandedPlans.has(plan.id) ? (
                       <ChevronUp className="h-4 w-4" />
                     ) : (
                       <ChevronDown className="h-4 w-4" />
                     )}
                   </button>
                   <h3 className="font-medium">{plan.title}</h3>
                   {plan.status === 'completed' && (
                     <StatusBadge status="completed" />
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={() => onPlanSelect(selectedPlanId === plan.id ? null : plan)}
                     className="p-1 hover:bg-accent rounded"
                     title={selectedPlanId === plan.id ? "Deactivate plan" : "Activate plan"}
                   >
                     {selectedPlanId === plan.id ? (
                       <PauseCircle className="h-4 w-4 text-primary" />
                     ) : (
                       <PlayCircle className="h-4 w-4" />
                     )}
                   </button>
                   <button
                     onClick={() => setPlanToDelete(plan)}
                     className="p-1 hover:bg-accent rounded text-destructive"
                     title="Delete plan"
                     disabled={isDeletingPlan}
                   >
                     <Trash2 className="h-4 w-4" />
                   </button>
                 </div>
               </div>

               <div className="text-sm text-muted-foreground mb-4">
                 <div className="flex flex-wrap items-center gap-2">
                   <TypeBadge type={plan.type} />
                   <span>•</span>
                   <span>Created {new Date(plan.created).toLocaleDateString()}</span>
                   <span>•</span>
                   <CountBadge 
                     count={plan.steps.filter(s => s.status === 'completed').length}
                     total={plan.steps.length}
                   />
                   {plan.metadata.complexity && (
                     <>
                       <span>•</span>
                       <ComplexityBadge complexity={plan.metadata.complexity} />
                     </>
                   )}
                   {plan.metadata.priority && (
                     <>
                       <span>•</span>
                       <PriorityBadge priority={plan.metadata.priority} />
                     </>
                   )}
                 </div>
                 {plan.metadata.estimatedTime && (
                   <div className="mt-1">
                     Estimated time: {plan.metadata.estimatedTime}
                   </div>
                 )}
               </div>

               {expandedPlans.has(plan.id) && (
                 <>
                   {plan.description && (
                     <div className="text-sm text-muted-foreground mb-4">
                       {plan.description}
                     </div>
                   )}
                   
                   <div className="space-y-2">
                     {plan.steps.map(step => (
                       <div 
                         key={step.id}
                         className="flex items-start gap-2 p-2 rounded bg-muted"
                       >
                         <div className="flex items-center gap-2">
                           <div className="mt-1">
                             {step.status === 'completed' ? (
                               <Check className="h-4 w-4 text-green-500" />
                             ) : step.status === 'in_progress' ? (
                               <Clock className="h-4 w-4 text-blue-500" />
                             ) : step.status === 'failed' ? (
                               <AlertCircle className="h-4 w-4 text-red-500" />
                             ) : (
                               <Clock className="h-4 w-4 text-gray-400" />
                             )}
                           </div>
                           <StatusBadge status={step.status} />
                         </div>
                         <div className="flex-1">
                           <div className="font-medium text-sm">{step.title}</div>
                           {step.description && (
                             <div className="text-sm text-muted-foreground mt-1">
                               {step.description}
                             </div>
                           )}
                           {step.metadata.affectedFiles && step.metadata.affectedFiles.length > 0 && (
                             <div className="text-xs text-muted-foreground mt-1">
                               Files: {step.metadata.affectedFiles.join(', ')}
                             </div>
                           )}
                         </div>
                         <div className="flex gap-1">
                           <button
                             onClick={() => handleStepStatusUpdate(plan.id, step.id, 'in_progress')}
                             className={`p-1 rounded ${
                               step.status === 'in_progress'
                                 ? 'bg-primary/10 text-primary'
                                 : 'hover:bg-accent'
                             }`}
                             title="Mark as in progress"
                           >
                             <Clock className="h-3 w-3" />
                           </button>
                           <button
                             onClick={() => handleStepStatusUpdate(plan.id, step.id, 'completed')}
                             className={`p-1 rounded ${
                               step.status === 'completed'
                                 ? 'bg-green-100 dark:bg-green-900/30 text-green-500'
                                 : 'hover:bg-accent'
                             }`}
                             title="Mark as completed"
                           >
                             <Check className="h-3 w-3" />
                           </button>
                           <button
                             onClick={() => handleStepStatusUpdate(plan.id, step.id, 'failed')}
                             className={`p-1 rounded ${
                               step.status === 'failed'
                                 ? 'bg-red-100 dark:bg-red-900/30 text-destructive'
                                 : 'hover:bg-accent'
                             }`}
                             title="Mark as failed"
                           >
                             <AlertCircle className="h-3 w-3" />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>

                   {plan.metadata.tags && plan.metadata.tags.length > 0 && (
                     <div className="mt-4 flex items-center gap-2">
                       <span className="text-sm text-muted-foreground">Tags:</span>
                       {plan.metadata.tags.map(tag => (
                         <MetadataBadge key={tag} label={tag} />
                       ))}
                     </div>
                   )}
                 </>
               )}
             </div>
           </div>
         ))
       )}
     </div>

     <AlertDialog 
       open={!!planToDelete} 
       onOpenChange={(open) => !isDeletingPlan && setPlanToDelete(null)}
     >
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Delete Plan</AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to delete the plan "{planToDelete?.title}"? 
             This action cannot be undone.
           </AlertDialogDescription>
         </AlertDialogHeader>

         {deleteError && (
            <div className="text-destructive text-sm p-2 bg-destructive/10 rounded">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPlan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planToDelete && handleDeletePlan(planToDelete)}
              disabled={isDeletingPlan}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeletingPlan ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type { PlanManagerProps };
export default PlanManager;