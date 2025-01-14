// src/components/PlanManager/index.tsx
import React, { useState, useCallback } from 'react';
import { usePlanStore } from './store';
import { useServices } from '../../services/manager';
import { useSettingsStore } from '../../store/settings';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Plus, Check, X, AlertCircle } from 'lucide-react';

interface PlanManagerProps {
  canvasId: string;
  isActive?: boolean;
  onActivate?: () => void;
  onPlanComplete?: (planId: string) => void;
}

interface TaskWithStatus {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

export const PlanManager: React.FC<PlanManagerProps> = ({
  canvasId,
  isActive = false,
  onActivate,
  onPlanComplete
}) => {
  const { llm } = useServices(canvasId);
  const settings = useSettingsStore(state => state.getCanvasConfig(canvasId));
  const {
    plans,
    activePlanId,
    createPlan,
    updatePlan,
    deletePlan,
    setActivePlan
  } = usePlanStore();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [objective, setObjective] = useState('');

  const handleCreatePlan = useCallback(async () => {
    if (!objective.trim()) return;

    try {
      const response = await llm.complete([
        {
          role: 'system',
          content: 'You are a planning assistant. Break down this objective into clear, executable steps.'
        },
        {
          role: 'user',
          content: objective
        }
      ]);

      // Parse the LLM response to create tasks
      const tasks: TaskWithStatus[] = response.content
        .split('\n')
        .filter(line => line.trim())
        .map((step, index) => ({
          id: `task-${index}`,
          description: step,
          status: 'pending'
        }));

      const planId = createPlan({
        title: objective,
        description: 'Generated from objective',
        tasks,
        status: 'pending',
        createdAt: new Date().toISOString(),
        metadata: {
          model: settings?.llm.modelId,
          temperature: settings?.llm.temperature
        }
      });

      setActivePlan(planId);
      setObjective('');
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  }, [objective, llm, settings, createPlan, setActivePlan]);

  const executePlan = useCallback(async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan || isExecuting) return;

    setIsExecuting(true);
    try {
      updatePlan(planId, { status: 'running' });

      for (let i = 0; i < plan.tasks.length; i++) {
        const task = plan.tasks[i];
        if (task.status === 'completed') continue;

        // Update task status
        const updatedTasks = [...plan.tasks];
        updatedTasks[i] = { ...task, status: 'running' };
        updatePlan(planId, { tasks: updatedTasks });

        try {
          // Execute task using LLM
          const response = await llm.complete([
            {
              role: 'system',
              content: `You are executing the following task: ${task.description}\nProvide the result.`
            },
            {
              role: 'user',
              content: 'Execute this task and describe the result.'
            }
          ]);

          updatedTasks[i] = {
            ...task,
            status: 'completed',
            result: response.content
          };
        } catch (error) {
          updatedTasks[i] = {
            ...task,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Task execution failed'
          };
          updatePlan(planId, {
            tasks: updatedTasks,
            status: 'failed'
          });
          return;
        }

        updatePlan(planId, { tasks: updatedTasks });
      }

      updatePlan(planId, { status: 'completed' });
      onPlanComplete?.(planId);
    } finally {
      setIsExecuting(false);
    }
  }, [plans, isExecuting, llm, updatePlan, onPlanComplete]);

  const getProgress = (plan: typeof plans[0]) => {
    const completed = plan.tasks.filter(task => task.status === 'completed').length;
    return (completed / plan.tasks.length) * 100;
  };

  const activePlan = plans.find(p => p.id === activePlanId);

  return (
    <div 
      className={`flex flex-col h-full ${isActive ? 'border-blue-500' : 'border-gray-200'}`}
      onClick={onActivate}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-lg font-medium">Plans</h3>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Enter plan objective..."
            className="px-3 py-1 border rounded-md"
          />
          <Button onClick={handleCreatePlan} disabled={!objective.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Create Plan
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 gap-4">
        {/* Plans List */}
        <div className="w-64 border-r pr-4">
          <ScrollArea className="h-[600px]">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer ${
                  plan.id === activePlanId
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActivePlan(plan.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{plan.title}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                      plan.status === 'failed' ? 'bg-red-100 text-red-800' :
                      plan.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.status}
                  </div>
                </div>
                <Progress value={getProgress(plan)} className="mt-2" />
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Active Plan Details */}
        {activePlan ? (
          <div className="flex-1">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-medium">{activePlan.title}</h3>
                <p className="text-gray-500">{activePlan.description}</p>
              </div>
              <div className="space-x-2">
                {activePlan.status !== 'completed' && (
                  <Button
                    onClick={() => executePlan(activePlan.id)}
                    disabled={isExecuting || activePlan.status === 'completed'}
                  >
                    {isExecuting ? (
                      <>
                        <Pause className="w-4 h-4 mr-1" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Execute
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => deletePlan(activePlan.id)}
                  disabled={isExecuting}
                >
                  Delete
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              {activePlan.tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`mb-4 p-4 rounded-lg border ${
                    task.status === 'running' ? 'border-blue-300 bg-blue-50' :
                    task.status === 'completed' ? 'border-green-300 bg-green-50' :
                    task.status === 'failed' ? 'border-red-300 bg-red-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Step {index + 1}</span>
                      {task.status === 'completed' && <Check className="w-4 h-4 text-green-500" />}
                      {task.status === 'failed' && <X className="w-4 h-4 text-red-500" />}
                      {task.status === 'running' && <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />}
                    </div>
                    <span className="text-sm text-gray-500">{task.status}</span>
                  </div>
                  <p className="text-gray-700">{task.description}</p>
                  {task.result && (
                    <div className="mt-2 p-2 bg-white rounded">
                      <pre className="text-sm whitespace-pre-wrap">{task.result}</pre>
                    </div>
                  )}
                  {task.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{task.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No plan selected
          </div>
        )}
      </CardContent>
    </div>
  );
};

export default PlanManager;