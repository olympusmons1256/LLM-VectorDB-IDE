// services/plans.ts
import { EmbeddingConfig } from './embedding';

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: 'active' | 'completed' | 'cancelled';
  created: string;
  updated: string;
  namespace: string;
  type: 'refactor' | 'feature' | 'bug' | 'other';
  metadata: {
    sourceMessage?: string;
    targetVersion?: string;
    affectedFiles?: string[];
    estimatedTime?: string;
    dependencies?: string[];
    [key: string]: any;
  };
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  created: string;
  updated: string;
  metadata: {
    estimatedTime?: string;
    affectedFiles?: string[];
    commands?: string[];
    [key: string]: any;
  };
}

function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const counter = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}-${counter}`;
}

export async function createPlan(
  content: string,
  config: EmbeddingConfig,
  namespace: string
): Promise<Plan | null> {
  try {
    console.log('Creating plan from content in namespace:', namespace);
    const planMatch = content.match(/(?:## Plan:?|Plan:)\s*([^\n]+)\n([\s\S]*?)(?=\n#|$)/i);
    if (!planMatch) {
      console.log('No plan format found in content');
      return null;
    }

    const [, title, details] = planMatch;
    console.log('Extracted plan title:', title);
    
    const steps = extractSteps(details);
    console.log('Extracted steps:', steps.length);
    
    const plan: Plan = {
      id: generateUniqueId('plan'),
      title: title.trim(),
      description: details.trim(),
      steps,
      status: 'active',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      namespace,
      type: detectPlanType(title, details),
      metadata: extractMetadata(details)
    };

    console.log('Created plan object:', plan);
    await storePlan(plan, config);
    console.log('Plan stored successfully');
    
    // Dispatch events for real-time update
    window.dispatchEvent(new CustomEvent('planCreated'));
    window.dispatchEvent(new CustomEvent('planUpdated'));

    return plan;
  } catch (error) {
    console.error('Error creating plan:', error);
    return null;
  }
}

async function storePlan(plan: Plan, config: EmbeddingConfig): Promise<void> {
  const planText = JSON.stringify(plan);

  try {
    console.log('Storing plan:', plan.id);
    console.log('Plan metadata:', {
      filename: `plan-${plan.id}.json`,
      namespace: plan.namespace,
      type: 'plan',
      section: 'plans'
    });
    
    // Add a slight delay to ensure index updates are processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'process_document',
        config,
        text: planText,
        filename: `plan-${plan.id}.json`,
        namespace: plan.namespace,
        metadata: {
          filename: `plan-${plan.id}.json`,
          type: 'plan',
          section: 'plans',
          planId: plan.id,
          status: plan.status,
          plan: planText,
          isComplete: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to store plan');
    }

    // Add another delay after storing to allow for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Plan stored successfully:', plan.id);

    // Verify the plan was stored correctly
    const verifyResponse = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'describe_namespace',
        config,
        namespace: plan.namespace
      })
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('Namespace verification after storing:', verifyData);
    }

  } catch (error) {
    console.error('Error storing plan:', error);
    throw error;
  }
}

export async function getActivePlans(
  config: EmbeddingConfig,
  namespace: string,
  retries = 3,
  delay = 1000
): Promise<Plan[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`getActivePlans attempt ${attempt + 1}/${retries} for namespace:`, namespace);

      // First get namespace stats to see what's actually stored
      const response1 = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'describe_namespace',
          config,
          namespace
        })
      });
      
      const stats = await response1.json();
      console.log('Namespace stats:', stats);

      // Try without filters first to see all documents
      const response2 = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'query_context',
          config,
          text: 'list all plans',
          namespace,
          filter: null  // Remove filter to see all docs
        })
      });

      const allDocs = await response2.json();
      console.log('All documents in namespace:', allDocs);
      
      // Now try with just the type filter
      const queryBody = {
        operation: 'query_context',
        config,
        text: 'list all plans',
        namespace,
        filter: { 'metadata.type': 'plan' }
      };
      
      console.log('Query body:', JSON.stringify(queryBody, null, 2));

      const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      });

      console.log('Response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      const data = JSON.parse(responseText);
      console.log('Query response data:', data);
      console.log('Raw matches:', data.matches?.length);
      
      if (data.matches?.length > 0) {
        console.log('Found matches, sample metadata:', data.matches[0].metadata);
      }
      
      const plans = data.matches
        ?.filter((match: any) => match.metadata?.plan)
        .map((match: any) => {
          try {
            const plan = JSON.parse(match.metadata.plan);
            console.log('Parsed plan:', plan.id, plan.title);
            return plan;
          } catch (e) {
            console.error('Error parsing plan:', e, match);
            return null;
          }
        })
        .filter(Boolean);
        
      if (plans && plans.length > 0) {
        console.log('Found plans, returning');
        return plans;
      }
      
      if (attempt < retries - 1) {
        console.log(`No plans found, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }

    } catch (error: any) {
      console.error(`Error in getActivePlans attempt ${attempt + 1}:`, error);
      if (attempt >= retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  
  console.log('No plans found after all retries');
  return [];
}

export async function deletePlan(
  plan: Plan,
  config: EmbeddingConfig
): Promise<void> {
  try {
    console.log('Deleting plan:', plan.id, 'from namespace:', plan.namespace);
    const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'delete_document',
        config,
        namespace: plan.namespace,
        filter: {
          $and: [
            { 'metadata.type': { $eq: 'plan' } },
            { 'metadata.planId': { $eq: plan.id } }
          ]
        }
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Server returned ${response.status}` };
      }
      console.error('Delete response error:', errorData);
      throw new Error(errorData.error || errorData.details || 'Failed to delete plan');
    }

    const data = await response.json();
    if (!data.success) {
      console.error('Delete operation failed:', data);
      throw new Error(data.error || data.details || 'Failed to delete plan');
    }
    
    console.log('Plan deleted successfully:', plan.id);
    
    // Dispatch event for real-time update
    window.dispatchEvent(new CustomEvent('planUpdated'));
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    throw error;
  }
}

export async function updatePlan(
  plan: Plan,
  config: EmbeddingConfig
): Promise<void> {
  console.log('Updating plan:', plan.id);
  plan.updated = new Date().toISOString();
  await storePlan(plan, config);
  
  // Dispatch event for real-time update
  window.dispatchEvent(new CustomEvent('planUpdated'));
}

export function getPlanContext(plan: Plan): string {
  if (!plan) return '';
  
  const completedSteps = plan.steps.filter(step => step.status === 'completed').length;
  const totalSteps = plan.steps.length;
  const currentStep = plan.steps.find(step => step.status === 'in_progress');
  const nextStep = plan.steps.find(step => step.status === 'pending');
  
  return `
Active Plan: ${plan.title}
Type: ${plan.type}
Progress: ${completedSteps}/${totalSteps} steps completed
Status: ${plan.status}

Description:
${plan.description}

Current Progress:
${plan.steps.map(step => 
  `${step.status === 'completed' ? '✓' : step.status === 'in_progress' ? '>' : '○'} ${step.title}`
).join('\n')}

${currentStep ? `Current Step: ${currentStep.title}` : ''}
${nextStep ? `Next Step: ${nextStep.title}` : ''}

Context:
${plan.metadata.targetVersion ? `- Target Version: ${plan.metadata.targetVersion}` : ''}
${plan.metadata.affectedFiles?.length ? `- Affected Files: ${plan.metadata.affectedFiles.join(', ')}` : ''}
${plan.metadata.dependencies?.length ? `- Dependencies: ${plan.metadata.dependencies.join(', ')}` : ''}
${plan.metadata.estimatedTime ? `- Estimated Time: ${plan.metadata.estimatedTime}` : ''}`;
}

function extractSteps(content: string): PlanStep[] {
  const stepMatches = content.matchAll(/(?:^|\n)(\d+)\.\s+([^\n]+)(?:\n([^1-9][^\n]+))?/g);
  const steps: PlanStep[] = [];
  const timestamp = new Date().toISOString();
  
  for (const match of stepMatches) {
    const [, number, title, description = ''] = match;
    steps.push({
      id: generateUniqueId('step'),
      title: title.trim(),
      description: description?.trim() || '',
      status: 'pending',
      dependencies: [],
      created: timestamp,
      updated: timestamp,
      metadata: {
        affectedFiles: extractAffectedFiles(description),
        commands: extractCommands(description)
      }
    });
  }

  return steps;
}

function detectPlanType(title: string, details: string): Plan['type'] {
  const text = `${title} ${details}`.toLowerCase();
  
  if (text.includes('refactor') || text.includes('upgrade') || text.includes('migration')) {
    return 'refactor';
  }
  if (text.includes('feature') || text.includes('implement') || text.includes('add')) {
    return 'feature';
  }
  if (text.includes('bug') || text.includes('fix') || text.includes('issue')) {
    return 'bug';
  }
  return 'other';
}

function extractMetadata(content: string): Plan['metadata'] {
  const metadata: Plan['metadata'] = {};
  
  const versionMatch = content.match(/(?:version|upgrade to|migrate to)\s*([\w.-]+)/i);
  if (versionMatch) {
    metadata.targetVersion = versionMatch[1];
  }

  metadata.affectedFiles = extractAffectedFiles(content);

  const timeMatch = content.match(/(?:estimated time|duration|takes?)\s*:?\s*(\d+\s*(?:min(?:ute)?|hour|day)s?)/i);
  if (timeMatch) {
    metadata.estimatedTime = timeMatch[1];
  }

  const depMatches = content.matchAll(/(?:requires?|depends? on|needs?)\s*([\w\s,@./]+)/gi);
  const dependencies = new Set<string>();
  for (const match of depMatches) {
    match[1].split(/[,\s]+/).forEach(dep => {
      if (dep.trim()) dependencies.add(dep.trim());
    });
  }
  if (dependencies.size > 0) {
    metadata.dependencies = Array.from(dependencies);
  }

  return metadata;
}

function extractAffectedFiles(content: string): string[] {
  if (!content) return [];
  
  const files = new Set<string>();
  
  const patterns = [
    /`([^`]+\.[a-z]+)`/g,
    /(?:^|\s)([\w-]+\.[\w-]+)(?:\s|$)/gm,
    /(?:modify|update|create|file|in)\s+([^\s,]+\.[a-z]+)/gi,
    /([^`\s,]+\/[^`\s,]+\.[a-z]+)/g
  ];

  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && !match[1].includes('*')) {
        files.add(match[1]);
      }
    }
  });

  return Array.from(files);
}

function extractCommands(content: string): string[] {
  if (!content) return [];
  
  const commands = new Set<string>();
  
  const commandMatches = content.matchAll(/(?:`([^`]+)`)|(?:(?:run|execute)\s+(\S+[^.\s]*))/g);
  
  for (const match of commandMatches) {
    const command = match[1] || match[2];
    if (command && !command.includes('*')) {
      commands.add(command);
    }
  }

  return Array.from(commands);
}

export type { PlanStep };