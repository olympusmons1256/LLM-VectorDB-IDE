// services/plans.ts
import type { EmbeddingConfig } from './embedding';

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
    complexity?: 'low' | 'medium' | 'high';
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
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
    rollback?: string;
    tests?: string[];
    [key: string]: any;
  };
}

interface PlanCache {
  plans: Map<string, Plan[]>;
  timestamps: Map<string, number>;
}

const planCache: PlanCache = {
  plans: new Map(),
  timestamps: new Map()
};

const CACHE_DURATION = 30000; // 30 seconds

function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const counter = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}-${counter}`;
}

export async function getActivePlans(
  config: EmbeddingConfig,
  namespace: string
): Promise<Plan[]> {
  try {
    console.log('Fetching active plans for namespace:', namespace);

    // Check cache first
    const cachedPlans = planCache.plans.get(namespace);
    const cachedTimestamp = planCache.timestamps.get(namespace);
    if (cachedPlans && cachedTimestamp && Date.now() - cachedTimestamp < CACHE_DURATION) {
      console.log('Returning cached plans');
      return cachedPlans;
    }

    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        text: 'list all plans',
        namespace,
        filter: { 
          $and: [
            { 'metadata.type': { $eq: 'plan' } },
            { 'metadata.section': { $eq: 'plans' } }
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch plans');
    }

    const data = await response.json();
    const plans = data.matches
      ?.filter((match: any) => match.metadata?.plan)
      .map((match: any) => {
        try {
          const plan = JSON.parse(match.metadata.plan);
          console.log('Parsed plan:', plan.id, plan.title);
          return validatePlan(plan);
        } catch (e) {
          console.error('Error parsing plan:', e);
          return null;
        }
      })
      .filter(Boolean);

    // Update cache
    if (plans) {
      planCache.plans.set(namespace, plans);
      planCache.timestamps.set(namespace, Date.now());
    }

    return plans || [];

  } catch (error: any) {
    console.error('Error fetching plans:', error);
    throw error;
  }
}

export async function createPlan(
  content: string,
  config: EmbeddingConfig,
  namespace: string
): Promise<Plan | null> {
  try {
    console.log('Creating plan from content');
    // Add more detailed plan detection
    const planMatch = content.match(/(?:## Plan:?|Plan:)\s*([^\n]+)\n([\s\S]*?)(?=\n#|$)/i);
    if (!planMatch) {
      console.log('No plan format found in content');
      return null;
    }

    const [, title, details] = planMatch;
    console.log('Extracted plan title:', title);
    
    const steps = extractSteps(details);
    if (steps.length === 0) {
      console.log('No steps found in plan');
      return null;
    }

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
      metadata: {
        ...extractMetadata(details),
        sourceMessage: content,
        complexity: detectComplexity(details),
        priority: detectPriority(details)
      }
    };

    // Ensure plan is stored before returning
    await storePlan(plan, config);
    console.log('Plan stored successfully:', plan.id);

    // Invalidate cache
    planCache.plans.delete(namespace);
    planCache.timestamps.delete(namespace);
    
    // Trigger events after successful storage
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
    
    // Add a delay to ensure proper indexing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch('/api/vector', {
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

    // Add additional delay for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify storage
    const verifyResponse = await fetch('/api/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        text: `plan-${plan.id}.json`,
        namespace: plan.namespace,
        filter: { 'metadata.planId': { $eq: plan.id } }
      })
    });

    if (!verifyResponse.ok || !(await verifyResponse.json()).matches?.length) {
      throw new Error('Plan storage verification failed');
    }

  } catch (error) {
    console.error('Error storing plan:', error);
    throw error;
  }
}

export async function deletePlan(
  plan: Plan,
  config: EmbeddingConfig
): Promise<void> {
  try {
    console.log('Deleting plan:', plan.id);

    // First verify the plan exists
    const verifyResponse = await fetch('/api/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        text: `plan-${plan.id}.json`,
        namespace: plan.namespace,
        filter: { 'metadata.planId': { $eq: plan.id } }
      })
    });

    if (!verifyResponse.ok) {
      throw new Error('Failed to verify plan existence');
    }

    const verifyData = await verifyResponse.json();
    if (!verifyData.matches?.length) {
      throw new Error('Plan not found');
    }

    const response = await fetch('/api/vector', {
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
      throw new Error('Failed to delete plan');
    }
    
    // Invalidate cache
    planCache.plans.delete(plan.namespace);
    planCache.timestamps.delete(plan.namespace);
    
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
  
  // Validate plan before update
  const validatedPlan = validatePlan(plan);
  if (!validatedPlan) {
    throw new Error('Invalid plan structure');
  }

  validatedPlan.updated = new Date().toISOString();
  await storePlan(validatedPlan, config);
  
  // Invalidate cache
  planCache.plans.delete(plan.namespace);
  planCache.timestamps.delete(plan.namespace);
  
  window.dispatchEvent(new CustomEvent('planUpdated'));
}

function validatePlan(plan: any): Plan | null {
  if (!plan.id || !plan.title || !Array.isArray(plan.steps)) {
    console.error('Invalid plan structure:', plan);
    return null;
  }

  // Ensure all steps have required fields
  plan.steps = plan.steps.map(step => ({
    id: step.id || generateUniqueId('step'),
    title: step.title,
    description: step.description || '',
    status: step.status || 'pending',
    dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
    created: step.created || new Date().toISOString(),
    updated: step.updated || new Date().toISOString(),
    metadata: step.metadata || {}
  })).filter(step => step.title);

  return {
    ...plan,
    metadata: plan.metadata || {},
    created: plan.created || new Date().toISOString(),
    updated: plan.updated || new Date().toISOString(),
    status: plan.status || 'active',
    type: validatePlanType(plan.type)
  };
}

function validatePlanType(type: string): Plan['type'] {
  const validTypes: Plan['type'][] = ['refactor', 'feature', 'bug', 'other'];
  return validTypes.includes(type as Plan['type']) ? type as Plan['type'] : 'other';
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
      description: description.trim(),
      status: 'pending',
      dependencies: extractDependencies(description),
      created: timestamp,
      updated: timestamp,
      metadata: {
        affectedFiles: extractAffectedFiles(description),
        commands: extractCommands(description),
        tests: extractTests(description),
        rollback: extractRollback(description)
      }
    });
  }

  // Add implicit dependencies based on order
  steps.forEach((step, index) => {
    if (index > 0 && !step.dependencies.includes(steps[index - 1].id)) {
      step.dependencies.push(steps[index - 1].id);
    }
  });

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

function detectComplexity(details: string): Plan['metadata']['complexity'] {
  const text = details.toLowerCase();
  if (text.includes('complex') || text.includes('extensive') || text.includes('major')) {
    return 'high';
  }
  if (text.includes('moderate') || text.includes('medium') || text.includes('several')) {
    return 'medium';
  }
  return 'low';
}

function detectPriority(details: string): Plan['metadata']['priority'] {
  const text = details.toLowerCase();
  if (text.includes('urgent') || text.includes('critical') || text.includes('high priority')) {
    return 'high';
  }
  if (text.includes('moderate') || text.includes('medium priority')) {
    return 'medium';
  }
  return 'low';
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

  const tagMatches = content.matchAll(/(?:tags?|labels?|categories?):\s*([\w\s,#]+)(?:\n|$)/gi);
  const tags = new Set<string>();
  for (const match of tagMatches) {
    match[1].split(/[,\s]+/).forEach(tag => {
      const cleanTag = tag.trim().replace(/^#/, '');
      if (cleanTag) tags.add(cleanTag);
    });
  }
  if (tags.size > 0) {
    metadata.tags = Array.from(tags);
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
 
 function extractDependencies(content: string): string[] {
  if (!content) return [];
  
  const dependencies = new Set<string>();
  const depMatches = content.matchAll(/(?:after|depends on|requires?|needs?)\s*([\w\s,]+)(?:\n|$)/gi);
  
  for (const match of depMatches) {
    match[1].split(/[,\s]+/).forEach(dep => {
      const cleanDep = dep.trim();
      if (cleanDep) dependencies.add(cleanDep);
    });
  }
 
  return Array.from(dependencies);
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
  
  const patterns = [
    /`([^`]+)`/g,
    /(?:run|execute|using)\s+(\S+[^.\s]*)/g,
    /\$\s*([^`\n]+)/g
  ];
  
  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const command = match[1] || match[2];
      if (command && !command.includes('*')) {
        commands.add(command.trim());
      }
    }
  });
 
  return Array.from(commands);
 }
 
 function extractTests(content: string): string[] {
  if (!content) return [];
  
  const tests = new Set<string>();
  const testMatches = content.matchAll(/(?:test|verify|check)\s+(?:that\s+)?([^.,]+)/gi);
  
  for (const match of testMatches) {
    const test = match[1].trim();
    if (test) {
      tests.add(test);
    }
  }
 
  return Array.from(tests);
 }
 
 function extractRollback(content: string): string | undefined {
  const rollbackMatch = content.match(/(?:rollback|revert):\s*([^.]+)/i);
  return rollbackMatch ? rollbackMatch[1].trim() : undefined;
 }
 
 export type { PlanStep };