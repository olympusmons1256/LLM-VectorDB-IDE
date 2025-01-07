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

function generateUniqueId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const counter = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}-${counter}`;
}

function extractPlanDetails(content: string): { title: string; details: string } | null {
  console.log('Extracting plan from content');

  // Try explicit plan patterns first
  const patterns = [
    /## Plan:\s*([^\n]+)\n([\s\S]*?)(?=\n##|\s*$)/i,
    /\bPlan:\s*([^\n]+)\n([\s\S]*?)(?=\n##|\s*$)/i,
    /Here(?:'s| is) (?:the |a )?plan:?\s*([^\n]+)\n([\s\S]*?)(?=\n##|\s*$)/i,
    /Let(?:'s| us) (create |make |implement |develop )(?:a |the )?plan:?\s*([^\n]+)\n([\s\S]*?)(?=\n##|\s*$)/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const title = match[1].trim();
      const details = match[2]?.trim() || content.trim();
      if (details) {
        console.log('Found plan with explicit pattern:', { title });
        return { title, details };
      }
    }
  }

  // Look for numbered lists as a fallback
  const numberedListMatch = content.match(/(?:^|\n)\s*1\.\s+([^\n]+)(?:\n[\s\S]*)/);
  if (numberedListMatch) {
    const firstLine = numberedListMatch[1].trim();
    const details = content.trim();
    console.log('Found numbered list plan:', { firstLine });
    return {
      title: `Plan: ${firstLine}`,
      details
    };
  }

  console.log('No plan format found');
  return null;
}

function extractSteps(content: string): PlanStep[] {
  const stepPattern = /(?:^|\n)\s*(\d+)\.?\s*([^\n]+)(?:\n(?:\s*[-•].+\n?)*)?/gm;
  const steps: PlanStep[] = [];
  const timestamp = new Date().toISOString();
  
  let match;
  while ((match = stepPattern.exec(content)) !== null) {
    const [fullMatch, number, title] = match;
    
    const bulletPoints = fullMatch.match(/\s*[-•]\s*([^\n]+)/g) || [];
    const description = bulletPoints
      .map(point => point.replace(/^\s*[-•]\s*/, '').trim())
      .join('\n');
    
    const stepId = generateUniqueId('step');
    console.log('Found step:', { number, title: title.trim(), id: stepId });

    steps.push({
      id: stepId,
      title: title.trim(),
      description: description || '',
      status: 'pending',
      dependencies: [],
      created: timestamp,
      updated: timestamp,
      metadata: {
        estimatedTime: extractEstimatedTime(fullMatch),
        affectedFiles: extractAffectedFiles(fullMatch),
        commands: extractCommands(fullMatch),
        tests: extractTests(fullMatch),
        rollback: extractRollback(fullMatch)
      }
    });
  }

  // Add dependencies between consecutive steps
  steps.forEach((step, index) => {
    if (index > 0) {
      step.dependencies.push(steps[index - 1].id);
    }
  });

  return steps;
}

export async function getActivePlans(
  config: EmbeddingConfig,
  namespace: string
): Promise<Plan[]> {
  try {
    console.log('Fetching plans for namespace:', namespace);

    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        text: 'list all plans',
        namespace,
        filter: { 
          type: { $eq: 'plan' }
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch plans');
    }

    const data = await response.json();
    console.log('Received plans data:', data);
    
    const plans = data.matches
      ?.filter((match: any) => match.metadata?.plan)
      .map((match: any) => {
        try {
          return JSON.parse(match.metadata.plan);
        } catch (e) {
          console.error('Error parsing plan:', e);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: Plan, b: Plan) => 
        new Date(b.updated).getTime() - new Date(a.updated).getTime()
      );

    console.log('Parsed plans:', plans.length);
    return plans;

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
    const planDetails = extractPlanDetails(content);
    if (!planDetails) {
      console.log('No valid plan format found');
      return null;
    }

    console.log('Extracted plan details:', {
      title: planDetails.title,
      detailsLength: planDetails.details.length
    });

    const { title, details } = planDetails;
    const steps = extractSteps(details);
    if (steps.length === 0) {
      console.log('No steps found in plan');
      return null;
    }

    const planId = generateUniqueId('plan');
    const timestamp = new Date().toISOString();

    const plan: Plan = {
      id: planId,
      title: title.trim(),
      description: details.trim(),
      steps,
      status: 'active',
      created: timestamp,
      updated: timestamp,
      namespace,
      type: detectPlanType(title, details),
      metadata: {
        sourceMessage: content,
        complexity: detectComplexity(details),
        priority: detectPriority(details),
        ...extractMetadata(details)
      }
    };

    console.log('Created plan:', {
      id: plan.id,
      title: plan.title,
      steps: steps.length
    });

    await storePlan(plan, config);
    console.log('Plan stored successfully');

    window.dispatchEvent(new CustomEvent('planCreated', { detail: plan }));
    return plan;

  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
}

async function storePlan(plan: Plan, config: EmbeddingConfig): Promise<void> {
  try {
    console.log('Storing plan:', plan.id);
    
    const planText = JSON.stringify(plan);
    const metadata = {
      filename: `plan-${plan.id}.json`,
      type: 'plan',
      planId: plan.id,
      status: plan.status,
      plan: planText,
      isComplete: true,
      timestamp: new Date().toISOString()
    };

    console.log('Storing plan with metadata:', metadata);

    const storeResponse = await fetch('/api/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'process_document',
        config,
        text: planText,
        filename: metadata.filename,
        namespace: plan.namespace,
        metadata
      })
    });

    if (!storeResponse.ok) {
      throw new Error('Failed to store plan');
    }

    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('Error storing plan:', error);
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
  window.dispatchEvent(new CustomEvent('planUpdated', { detail: plan }));
}

export async function deletePlan(
  plan: Plan,
  config: EmbeddingConfig
): Promise<void> {
  try {
    console.log('Deleting plan:', plan.id);

    const response = await fetch('/api/vector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'delete_document',
        config,
        namespace: plan.namespace,
        filter: {
          $and: [
            { type: { $eq: 'plan' } },
            { planId: { $eq: plan.id } }
          ]
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete plan');
    }
    
    window.dispatchEvent(new CustomEvent('planDeleted', { detail: plan.id }));

  } catch (error: any) {
    console.error('Error deleting plan:', error);
    throw error;
  }
}

function detectPlanType(title: string, details: string): Plan['type'] {
  const text = `${title} ${details}`.toLowerCase();
  
  if (text.includes('refactor') || text.includes('upgrade') || text.includes('migration')) {
    return 'refactor';
  }
  if (text.includes('feature') || text.includes('implement') || text.includes('add') || text.includes('enhance')) {
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
  
  const timeMatch = content.match(/Estimated time:\s*(\d+(?:\s*(?:min(?:ute)?|hour|day)s?))/i);
  if (timeMatch) {
    metadata.estimatedTime = timeMatch[1];
  }

  metadata.affectedFiles = extractAffectedFiles(content);
  
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

function extractEstimatedTime(content: string): string | undefined {
  const timeMatch = content.match(/Estimated time:\s*([^\n]+)/);
  return timeMatch ? timeMatch[1].trim() : undefined;
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

function validatePlan(plan: any): Plan | null {
  if (!plan?.id || !plan?.title || !Array.isArray(plan?.steps)) {
    console.error('Invalid plan structure:', plan);
    return null;
  }

  const timestamp = new Date().toISOString();
  const steps = plan.steps
    .map(step => ({
      id: step.id || generateUniqueId('step'),
      title: step.title,
      description: step.description || '',
      status: step.status || 'pending',
      dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
      created: step.created || timestamp,
      updated: step.updated || timestamp,
      metadata: step.metadata || {}
    }))
    .filter(step => step.title);

  if (steps.length === 0) {
    console.error('No valid steps found in plan');
    return null;
  }

  return {
    ...plan,
    steps,
    metadata: plan.metadata || {},
    created: plan.created || timestamp,
    updated: plan.updated || timestamp,
    status: plan.status || 'active',
    type: validatePlanType(plan.type)
  };
}

function validatePlanType(type: string): Plan['type'] {
  const validTypes: Plan['type'][] = ['refactor', 'feature', 'bug', 'other'];
  return validTypes.includes(type as Plan['type']) ? type as Plan['type'] : 'other';
}