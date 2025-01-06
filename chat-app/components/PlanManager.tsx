// components/PlanManager.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plan, getActivePlans, updatePlan, deletePlan } from '@/services/plans';
import { Check, Clock, AlertCircle, PlayCircle, PauseCircle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { EmbeddingConfig } from '@/services/embedding';
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

interface BadgeProps {
 children: React.ReactNode;
 variant?: 'default' | 'destructive' | 'outline' | 'success';
 className?: string;
}

const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
 const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
 const variantClasses = {
   default: 'bg-primary/10 text-primary-foreground',
   destructive: 'bg-destructive/10 text-destructive',
   outline: 'border border-input',
   success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
 };
 return (
   <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
     {children}
   </span>
 );
};

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

 const refreshPlans = useCallback(async () => {
   if (!currentNamespace) return;
   setIsLoading(true);
   
   try {
     const activePlans = await getActivePlans(config, currentNamespace);
     setPlans(activePlans);
   } catch (error: any) {
     onError(error.message);
   } finally {
     setIsLoading(false);
   }
 }, [currentNamespace, config, onError]);

 useEffect(() => {
   if (currentNamespace) {
     refreshPlans();
   }

   const handlePlanEvent = () => refreshPlans();
   window.addEventListener('planCreated', handlePlanEvent);
   window.addEventListener('planUpdated', handlePlanEvent);
   window.addEventListener('planDeleted', handlePlanEvent);
   
   return () => {
     window.removeEventListener('planCreated', handlePlanEvent);
     window.removeEventListener('planUpdated', handlePlanEvent);
     window.removeEventListener('planDeleted', handlePlanEvent);
   };
 }, [currentNamespace, refreshPlans]);

 const handleStepStatusUpdate = async (planId: string, stepId: string, newStatus: Plan['steps'][0]['status']) => {
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
     onError(error.message);
   }
 };

 const handleDeletePlan = async (plan: Plan) => {
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
     const errorMessage = error.message || 'Failed to delete plan';
     setDeleteError(errorMessage);
     onError(errorMessage);
   } finally {
     setIsDeletingPlan(false);
     setPlanToDelete(null);
   }
 };

 const getPriorityColor = (priority: string | undefined) => {
   switch (priority) {
     case 'high':
       return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
     case 'medium':
       return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
     case 'low':
       return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
     default:
       return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
   }
 };

 const getComplexityColor = (complexity: string | undefined) => {
  switch (complexity) {
    case 'high':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    case 'medium':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300';
  }
};

 const getProgressText = (plan: Plan) => {
   const completed = plan.steps.filter(s => s.status === 'completed').length;
   const total = plan.steps.length;
   return `${completed}/${total} steps completed`;
 };

 return (
   <div className="h-full flex flex-col text-foreground bg-background">
     <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
       <h2 className="text-lg font-semibold">Project Plans</h2>
       <button
         onClick={refreshPlans}
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
               selectedPlanId === plan.id ? 'ring-2 ring-blue-500' : ''} 
               bg-card hover:bg-accent/50 transition-colors`}
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
                     <Badge variant="success">Completed</Badge>
                   )}
                   {plan.metadata.priority && (
                     <Badge className={getPriorityColor(plan.metadata.priority)}>
                       {plan.metadata.priority} priority
                     </Badge>
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
                 <div className="flex items-center gap-2">
                   <span>{plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} Plan</span>
                   <span>•</span>
                   <span>Created {new Date(plan.created).toLocaleDateString()}</span>
                   <span>•</span>
                   <span>{getProgressText(plan)}</span>
                   {plan.metadata.complexity && (
                     <>
                       <span>•</span>
                       <Badge className={getComplexityColor(plan.metadata.complexity)}>
                         {plan.metadata.complexity} complexity
                       </Badge>
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
                 <div className="mt-4 space-y-4">
                   {plan.description && (
                     <div className="text-sm text-muted-foreground">
                       {plan.description}
                     </div>
                   )}

                   <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                     {plan.steps.map(step => (
                       <div 
                         key={step.id}
                         className="flex items-start gap-2 p-2 rounded bg-muted"
                       >
                         <div className="mt-1">
                           {step.status === 'completed' ? (
                             <Check className="h-4 w-4 text-green-500" />
                           ) : step.status === 'in_progress' ? (
                             <Clock className="h-4 w-4 text-primary" />
                           ) : step.status === 'failed' ? (
                             <AlertCircle className="h-4 w-4 text-destructive" />
                           ) : (
                             <Clock className="h-4 w-4 text-muted-foreground" />
                           )}
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
                         <Badge key={tag} variant="outline">{tag}</Badge>
                       ))}
                     </div>
                   )}
                 </div>
               )}
             </div>
           </div>
         ))
       )}
     </div>

     <AlertDialog open={!!planToDelete} onOpenChange={() => !isDeletingPlan && setPlanToDelete(null)}>
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