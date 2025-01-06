// components/PlanManager.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plan, getActivePlans, updatePlan, deletePlan } from '@/services/plans';
import { Check, Clock, AlertCircle, PlayCircle, PauseCircle, RefreshCw, Trash2 } from 'lucide-react';
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
  const planCache = useRef(new Map<string, { data: Plan[], timestamp: number }>());
  const loadAttemptedRef = useRef(false);

  const refreshPlans = useCallback(async () => {
    if (!currentNamespace || isLoading) return;

    console.log('Refreshing plans for namespace:', currentNamespace);
    setIsLoading(true);
    
    try {
      const activePlans = await getActivePlans(config, currentNamespace);
      const sortedPlans = activePlans.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
      
      console.log('Fetched plans:', sortedPlans.length);
      setPlans(sortedPlans);
      loadAttemptedRef.current = true;

    } catch (error: any) {
      console.error('Error refreshing plans:', error);
      onError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentNamespace, config, isLoading, onError]);

  // Initial load when namespace changes
  useEffect(() => {
    if (currentNamespace && !loadAttemptedRef.current) {
      console.log('Initial load for namespace:', currentNamespace);
      refreshPlans();
    }
  }, [currentNamespace, refreshPlans]);

  // Reset loading flag when namespace changes
  useEffect(() => {
    loadAttemptedRef.current = false;
  }, [currentNamespace]);

  // Listen for plan events
  useEffect(() => {
    const handlePlanEvent = () => {
      console.log('Plan event triggered, refreshing...');
      refreshPlans();
    };

    window.addEventListener('planCreated', handlePlanEvent);
    window.addEventListener('planUpdated', handlePlanEvent);
    
    return () => {
      window.removeEventListener('planCreated', handlePlanEvent);
      window.removeEventListener('planUpdated', handlePlanEvent);
    };
  }, [refreshPlans]);

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

      // Update plan status based on steps
      const allCompleted = updatedPlan.steps.every(step => step.status === 'completed');
      const anyFailed = updatedPlan.steps.some(step => step.status === 'failed');
      
      if (allCompleted) {
        updatedPlan.status = 'completed';
      } else if (anyFailed) {
        updatedPlan.status = 'cancelled';
      }

      await updatePlan(updatedPlan, config);
      
      // Update local state
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
    setIsDeletingPlan(true);
    setDeleteError(null);
    try {
      await deletePlan(plan, config);
      
      // Update local state
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

  const getStepStatusIcon = (status: Plan['steps'][0]['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressText = (plan: Plan) => {
    const completed = plan.steps.filter(s => s.status === 'completed').length;
    const total = plan.steps.length;
    return `${completed}/${total} steps completed`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold">Project Plans</h2>
        <button
          onClick={refreshPlans}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {plans.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {isLoading ? 'Loading plans...' : 'No plans created yet'}
          </div>
        ) : (
          plans.map(plan => (
            <div
              key={plan.id}
              className={`border dark:border-gray-700 rounded-lg ${
                selectedPlanId === plan.id ? 'ring-2 ring-blue-500' : ''} 
                bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{plan.title}</h3>
                    {plan.status === 'completed' && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onPlanSelect(selectedPlanId === plan.id ? null : plan)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title={selectedPlanId === plan.id ? "Deactivate plan" : "Activate plan"}
                    >
                      {selectedPlanId === plan.id ? (
                        <PauseCircle className="h-4 w-4 text-blue-500" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setPlanToDelete(plan)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                      title="Delete plan"
                      disabled={isDeletingPlan}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} Plan • 
                  Created {new Date(plan.created).toLocaleDateString()} •
                  {getProgressText(plan)}
                </div>

                <div className="space-y-2">
                  {plan.steps.map(step => (
                    <div 
                      key={step.id}
                      className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-gray-900"
                    >
                      <div className="mt-1">
                        {getStepStatusIcon(step.status)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{step.title}</div>
                        {step.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {step.description}
                          </div>
                        )}
                        {step.metadata.affectedFiles && step.metadata.affectedFiles.length > 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Files: {step.metadata.affectedFiles.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStepStatusUpdate(plan.id, step.id, 'in_progress')}
                          className={`p-1 rounded ${
                            step.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-500'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title="Mark as in progress"
                        >
                          <Clock className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleStepStatusUpdate(plan.id, step.id, 'completed')}
                          className={`p-1 rounded ${
                            step.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900 text-green-500'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title="Mark as completed"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleStepStatusUpdate(plan.id, step.id, 'failed')}
                          className={`p-1 rounded ${
                            step.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900 text-red-500'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title="Mark as failed"
                        >
                          <AlertCircle className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
            <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPlan}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planToDelete && handleDeletePlan(planToDelete)}
              disabled={isDeletingPlan}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeletingPlan ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PlanManager;