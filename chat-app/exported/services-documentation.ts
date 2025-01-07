// services/documentation.ts
import { processDocument } from './embedding';
import type { EmbeddingConfig } from './embedding';

interface FileStructure {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileStructure[];
}

export async function generateDocumentation(
  files: FileStructure[],
  namespace: string,
  config: EmbeddingConfig
): Promise<string> {
  // Generate documentation structure
  const docs = await generateStructuredDocs(files);
  
  // Store in vector database
  await processDocument(docs, config, `${namespace}-docs`);
  
  return docs;
}

async function generateStructuredDocs(files: FileStructure[]): Promise<string> {
  let documentation = '# Project Documentation\n\n';
  
  // Project Structure
  documentation += '## Project Structure\n\n';
  documentation += generateStructureDoc(files);
  
  // Component Documentation
  documentation += '\n## Components\n\n';
  const components = files.filter(f => 
    f.name.endsWith('.tsx') && f.name.includes('components/')
  );
  documentation += await generateComponentDocs(components);
  
  // API Documentation
  documentation += '\n## API Routes\n\n';
  const apiRoutes = files.filter(f => 
    f.name.includes('api/') && f.name.endsWith('.ts')
  );
  documentation += generateApiDocs(apiRoutes);
  
  // Configuration
  documentation += '\n## Configuration\n\n';
  const configFiles = files.filter(f => 
    f.name.endsWith('.config.ts') || f.name.endsWith('.json')
  );
  documentation += generateConfigDocs(configFiles);
  
  return documentation;
}

function generateStructureDoc(files: FileStructure[], level = 0): string {
  let doc = '';
  for (const file of files) {
    const indent = '  '.repeat(level);
    doc += `${indent}- ${file.type === 'directory' ? '📁' : '📄'} ${file.name}\n`;
    if (file.children) {
      doc += generateStructureDoc(file.children, level + 1);
    }
  }
  return doc;
}

async function generateComponentDocs(components: FileStructure[]): Promise<string> {
  let doc = '';
  for (const component of components) {
    if (!component.content) continue;
    
    doc += `### ${component.name.split('/').pop()?.replace('.tsx', '')}\n\n`;
    
    // Extract component props interface
    const propsMatch = component.content.match(/interface\s+\w+Props\s*{([^}]+)}/);
    if (propsMatch) {
      doc += '**Props:**\n\n';
      doc += '```typescript\n';
      doc += propsMatch[0];
      doc += '\n```\n\n';
    }
    
    // Extract component description from comments
    const descriptionMatch = component.content.match(/\/\*\*\s*([\s\S]*?)\s*\*\//);
    if (descriptionMatch) {
      doc += descriptionMatch[1].replace(/\s*\*\s*/g, '') + '\n\n';
    }
  }
  return doc;
}

function generateApiDocs(apiRoutes: FileStructure[]): string {
  let doc = '';
  for (const route of apiRoutes) {
    if (!route.content) continue;
    
    const routePath = route.name.replace(/^pages\/api\//, '/api/').replace(/\.ts$/, '');
    doc += `### ${routePath}\n\n`;
    
    // Extract HTTP methods
    const methods = route.content.match(/export async function (GET|POST|PUT|DELETE)/g);
    if (methods) {
      doc += '**Methods:**\n\n';
      methods.forEach(method => {
        doc += `- ${method.split(' ').pop()}\n`;
      });
      doc += '\n';
    }
  }
  return doc;
}

function generateConfigDocs(configFiles: FileStructure[]): string {
  let doc = '';
  for (const file of configFiles) {
    if (!file.content) continue;
    
    doc += `### ${file.name}\n\n`;
    doc += '```typescript\n';
    doc += file.content;
    doc += '\n```\n\n';
  }
  return doc;
}