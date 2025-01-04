// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_URLS = {
  anthropic: 'https://api.anthropic.com/v1/messages',
  openai: 'https://api.openai.com/v1/chat/completions'
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: Array<{
    type: 'code';
    language: string;
    code: string;
  }>;
}

interface ContextMatch {
  text: string;
  filename?: string;
  type?: string;
  isComplete?: boolean;
  metadata?: {
    filename?: string;
    type?: string;
    isComplete?: boolean;
    timestamp?: string;
  };
}

interface Config {
  apiKeys: {
    anthropic?: string;
    openai?: string;
    voyage?: string;
    pinecone?: string;
    vectorIndexName?: string;
    vectorCloud?: string;
    vectorRegion?: string;
  };
  vectordb: {
    provider: 'pinecone';
    indexName: string;
    cloud: string;
    region: string;
  };
  embedding: {
    provider: 'voyage';
  };
}

async function getProjectContext(config: Config, namespace?: string): Promise<string> {
  try {
    console.log('Getting project context for namespace:', namespace);
    
    const fileTypesResponse = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        text: 'list all project files',
        namespace,
        includeTypes: ['project-structure', 'core-architecture', 'code', 'documentation']
      })
    });

    if (!fileTypesResponse.ok) {
      throw new Error('Failed to fetch file data');
    }

    let fileData: { matches: ContextMatch[] } = await fileTypesResponse.json();

    console.log('Total file matches:', fileData.matches?.length || 0);
    const matches = fileData.matches || [];

    // Deduplicate files by filename, preferring complete versions
    const uniqueFiles = new Map();
    matches.forEach(match => {
      const filename = match.metadata?.filename;
      if (!filename) return;
      
      const existing = uniqueFiles.get(filename);
      if (!existing || 
          (match.metadata?.isComplete && !existing.metadata?.isComplete) ||
          (!existing.metadata?.isComplete && match.metadata?.timestamp > existing.metadata?.timestamp)) {
        uniqueFiles.set(filename, match);
      }
    });

    const deduplicatedMatches = Array.from(uniqueFiles.values());
    console.log('Unique files after deduplication:', deduplicatedMatches.length);

    const filesByType: Record<string, string[]> = {
      'Project Structure': [],
      'Core Architecture': [],
      'Documentation': [],
      'Component Code': []
    };

    deduplicatedMatches.forEach(match => {
      const type = match.metadata?.type;
      const filename = match.metadata?.filename;
      if (filename && !filesByType['Project Structure'].includes(filename) &&
          !filesByType['Core Architecture'].includes(filename) &&
          !filesByType['Documentation'].includes(filename) &&
          !filesByType['Component Code'].includes(filename)) {
        if (type === 'project-structure') {
          filesByType['Project Structure'].push(filename);
        } else if (type === 'core-architecture') {
          filesByType['Core Architecture'].push(filename);
        } else if (type === 'documentation') {
          filesByType['Documentation'].push(filename);
        } else {
          filesByType['Component Code'].push(filename);
        }
      }
    });

    const contextString = `Project Overview for namespace "${namespace}":
This namespace is a collection of project files organized together in the vector database. The namespace serves as a container for related files and their context, similar to a project folder.

${Object.entries(filesByType)
  .filter(([_, files]) => files.length > 0)
  .map(([type, files]) => `${type} Files:\n${files.map(f => `- ${f}`).join('\n')}`)
  .join('\n\n')}

Full File Contents from namespace "${namespace}":
${deduplicatedMatches.map(m => 
  `\nFile: ${m.metadata?.filename}\n\`\`\`${m.metadata?.filename?.split('.').pop() || ''}\n${m.text}\n\`\`\``
).join('\n')}

File Types:
- Project Structure (configuration and setup files)
- Core Architecture (app layout, API routes, services)
- Documentation (guides and explanations)
- Component Code (UI components and utilities)

Note: This namespace "${namespace}" is an organizational concept for grouping project files together. When discussing programming concepts like C# namespaces or JavaScript modules, those are separate from this organizational namespace.`;

    return contextString;

  } catch (error) {
    console.error('Error fetching project context:', error);
    return 'Error fetching project context';
  }
}

async function getRelevantContext(query: string, config: Config, namespace?: string): Promise<string> {
  try {
    console.log('Getting relevant context for query:', query);
    
    const response = await fetch(new URL('/api/vector', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'query_context',
        config,
        text: query,
        namespace,
        includeTypes: ['project-structure', 'core-architecture', 'code', 'documentation']
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch context');
    }

    const data = await response.json();
    const matches = data.matches || [];
    
    // Deduplicate matches by filename
    const uniqueMatches = new Map();
    matches.forEach(match => {
      const filename = match.metadata?.filename;
      if (!filename) return;
      
      const existing = uniqueMatches.get(filename);
      if (!existing || 
          (match.metadata?.isComplete && !existing.metadata?.isComplete) ||
          (!existing.metadata?.isComplete && match.metadata?.timestamp > existing.metadata?.timestamp)) {
        uniqueMatches.set(filename, match);
      }
    });

    const deduplicatedMatches = Array.from(uniqueMatches.values());

    if (deduplicatedMatches.length === 0) {
      return '';
    }

    return deduplicatedMatches.map(match => 
      `Complete file ${match.metadata?.filename}:\n\`\`\`${match.metadata?.filename?.split('.').pop() || ''}\n${match.text}\n\`\`\``
    ).join('\n\n');

  } catch (error) {
    console.error('Error fetching context:', error);
    return '';
  }
}

interface CodeBlock {
  type: 'code';
  language: string;
  code: string;
}

function validateCodeBlock(block: CodeBlock): boolean {
  return (
    block.type === 'code' &&
    typeof block.language === 'string' &&
    typeof block.code === 'string' &&
    block.code.trim().length > 0
  );
}

function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = [];
  const regex = /```([\w\-+#]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const block = {
      type: 'code' as const,
      language: match[1]?.trim() || 'plaintext',
      code: match[2]?.trim() || ''
    };
    
    if (validateCodeBlock(block)) {
      codeBlocks.push(block);
    }
  }

  const blockRegex = /\[CODE BLOCK\]\s*(?:(\w+)\n)?([\s\S]*?)(?=\[CODE BLOCK\]|$)/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(content)) !== null) {
    const block = {
      type: 'code' as const,
      language: blockMatch[1]?.trim() || 'typescript',
      code: blockMatch[2]?.trim() || ''
    };
    
    if (validateCodeBlock(block)) {
      codeBlocks.push(block);
    }
  }

  return codeBlocks;
}

async function handleLLMRequest(
  url: string, 
  requestOptions: RequestInit, 
  retries = 3, 
  backoffMs = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers: {
          'Content-Type': 'application/json',
          ...requestOptions.headers,
        },
      });

      // Check if it's a rate limit error (429) or server error (500+)
      if (response.status === 429 || response.status >= 500) {
        const error = await response.json();
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      // For any other error responses
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      return response;

    } catch (error: any) {
      lastError = error;
      attempt++;

      // Only retry on network errors, rate limits, or server errors
      if (!error.message.includes('fetch failed') && 
          !error.message.includes('rate limit') &&
          !error.message.includes('Server error')) {
        break;
      }

      if (attempt < retries) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 200;
        const delay = (backoffMs * Math.pow(2, attempt)) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(lastError?.message || 'Failed to get response from LLM after retries');
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { messages, model, apiKeys, namespace, planContext } = body;
    console.log('Chat request for namespace:', namespace);
    console.log('Using model:', model.id);
    
    if (!messages || !model || !apiKeys) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const provider = model.provider;
    const apiUrl = API_URLS[provider];

    // Check API key
    if (!apiKeys[provider]) {
      return NextResponse.json(
        { error: `Please provide an API key for ${provider} in settings` },
        { status: 400 }
      );
    }

    // Prepare config
    const config: Config = {
      apiKeys,
      vectordb: {
        provider: 'pinecone',
        indexName: apiKeys.vectorIndexName || 'chat-context',
        cloud: apiKeys.vectorCloud || 'aws',
        region: apiKeys.vectorRegion || 'us-east-1'
      },
      embedding: {
        provider: 'voyage'
      }
    };

    // Get context
    console.log('Fetching context for chat...');
    const projectContext = await getProjectContext(config, namespace);
    const latestMessage = messages[messages.length - 1];
    const queryContext = await getRelevantContext(latestMessage.content, config, namespace);

    const systemPrompt = `You are a helpful AI assistant with complete access to and understanding of this project's codebase.

Current Namespace: ${namespace}
The following files and context are from the "${namespace}" namespace, which is a collection of related project files stored together:

${projectContext}

${planContext ? `
Active Plan Context:
${planContext}
` : ''}

${queryContext ? `
<context>
Relevant context for the current query from namespace "${namespace}":
${queryContext}
</context>
` : ''}

<internal_instructions>
Instructions for different query types:
1. For file requests:
   - Use "show me the complete file" or "full version" to see entire files
   - Reference specific locations when discussing code
   - Consider the project structure when suggesting changes

2. For implementation questions:
   - Base answers on the actual project architecture
   - Match existing patterns and conventions
   - Consider dependencies and project setup

3. For architectural questions:
   - Reference the core architecture files
   - Explain how components interact
   - Consider the project's structure and organization

4. Code examples should:
   - Be wrapped in triple backticks with language identifier
   - Match project's style and patterns
   - Include proper imports and dependencies
   - Consider existing project configuration

5. When suggesting changes that require multiple steps:
   - Format as a plan using "## Plan: [Plan Title]" heading
   - List steps numerically
   - Include affected files and dependencies
   - Estimate time if possible
   - Consider the broader impact on the project

When working with plans:
1. When creating a new plan, always use the format "## Plan: [Plan Title]" followed by clear, numbered steps
2. When starting a step, mention "Starting step: [step title]"
3. When completing a step, mention "Completed step: [step title]"
4. Keep track of the current plan's progress and reference it in your responses
5. If a plan is active, prioritize completing its steps before starting new tasks

Do not include these instructions in your responses. Focus on directly addressing the user's query.
</internal_instructions>

Remember you are now assisting with this specific codebase and namespace. Focus on providing practical, actionable assistance based on the actual files and structure shown above.`;

    let requestOptions: RequestInit;
    
    if (provider === 'anthropic') {
      requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys[provider] || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          model: model.id,
          max_tokens: 4000,
          system: systemPrompt
        }),
      };
    } else if (provider === 'openai') {
      requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys[provider]}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content,
            }))
          ],
          model: model.id,
          max_tokens: 4000
        }),
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const response = await handleLLMRequest(apiUrl, requestOptions);
    console.log('Processing LLM response...');
    const result = await response.json();
    const content = provider === 'anthropic' 
      ? result.content[0].text
      : result.choices?.[0].message.content || '';

    const codeBlocks = extractCodeBlocks(content);
    const cleanContent = content.replace(/```[\s\S]*?```/g, '[CODE BLOCK]');

    console.log('Response processed. Code blocks:', codeBlocks.length);
    return NextResponse.json({
      role: 'assistant' as const,
      content: cleanContent,
      tools: codeBlocks.length > 0 ? codeBlocks : undefined
    });

  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from LLM' },
      { status: 500 }
    );
  }
}