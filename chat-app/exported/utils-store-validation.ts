// utils/store-validation.ts
import type { Message } from '@/types/message';
import type { CodeBlock, CodeAnnotation } from '@/types/code-block';
import type { Plan } from '@/services/plans';
import type { ChatState } from '@/store/chat-store';
import type { EmbeddingConfig } from '@/services/embedding';
import type { SavedProject, ProjectState, UserProfile } from '@/types/save-state';
import type { InitializationStage } from '@/store/initialization-store';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  path?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationContext {
  stage?: InitializationStage;
  namespace?: string;
  checkReferences?: boolean;
  strictMode?: boolean;
}

// Existing Message Validation
export function validateMessages(messages: Message[], context?: ValidationContext): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(messages)) {
    return {
      isValid: false,
      errors: [{
        field: 'messages',
        message: 'Messages must be an array',
        code: 'INVALID_TYPE'
      }]
    };
  }

  messages.forEach((message, index) => {
    // Validate required fields
    if (!message.role || !['user', 'assistant'].includes(message.role)) {
      errors.push({
        field: `messages[${index}].role`,
        message: 'Invalid message role',
        code: 'INVALID_ROLE',
        path: ['messages', index.toString(), 'role']
      });
    }

    if (!message.content || typeof message.content !== 'string') {
      errors.push({
        field: `messages[${index}].content`,
        message: 'Message content is required and must be a string',
        code: 'INVALID_CONTENT',
        path: ['messages', index.toString(), 'content']
      });
    }

    // Validate tools if present
    if (message.tools) {
      if (!Array.isArray(message.tools)) {
        errors.push({
          field: `messages[${index}].tools`,
          message: 'Tools must be an array',
          code: 'INVALID_TOOLS',
          path: ['messages', index.toString(), 'tools']
        });
      } else {
        message.tools.forEach((tool, toolIndex) => {
          if (tool.type !== 'code') {
            errors.push({
              field: `messages[${index}].tools[${toolIndex}].type`,
              message: 'Invalid tool type',
              code: 'INVALID_TOOL_TYPE',
              path: ['messages', index.toString(), 'tools', toolIndex.toString(), 'type']
            });
          }
          if (!tool.language || typeof tool.language !== 'string') {
            errors.push({
              field: `messages[${index}].tools[${toolIndex}].language`,
              message: 'Tool language is required',
              code: 'INVALID_TOOL_LANGUAGE',
              path: ['messages', index.toString(), 'tools', toolIndex.toString(), 'language']
            });
          }
          if (!tool.code || typeof tool.code !== 'string') {
            errors.push({
              field: `messages[${index}].tools[${toolIndex}].code`,
              message: 'Tool code is required',
              code: 'INVALID_TOOL_CODE',
              path: ['messages', index.toString(), 'tools', toolIndex.toString(), 'code']
            });
          }
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Existing Code Block Validation
export function validateCodeBlocks(blocks: CodeBlock[], context?: ValidationContext): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(blocks)) {
    return {
      isValid: false,
      errors: [{
        field: 'codeBlocks',
        message: 'Code blocks must be an array',
        code: 'INVALID_TYPE'
      }]
    };
  }

  blocks.forEach((block, index) => {
    // Validate required fields
    if (!block.id) {
      errors.push({
        field: `codeBlocks[${index}].id`,
        message: 'Block ID is required',
        code: 'MISSING_ID',
        path: ['codeBlocks', index.toString(), 'id']
      });
    }

    if (!block.language) {
      errors.push({
        field: `codeBlocks[${index}].language`,
        message: 'Block language is required',
        code: 'MISSING_LANGUAGE',
        path: ['codeBlocks', index.toString(), 'language']
      });
    }

    if (!block.code || typeof block.code !== 'string') {
      errors.push({
        field: `codeBlocks[${index}].code`,
        message: 'Block code is required and must be a string',
        code: 'INVALID_CODE',
        path: ['codeBlocks', index.toString(), 'code']
      });
    }

    // Validate references if requested
    if (context?.checkReferences && block.reference) {
      if (typeof block.reference.line !== 'number' || block.reference.line < 0) {
        errors.push({
          field: `codeBlocks[${index}].reference.line`,
          message: 'Reference line must be a non-negative number',
          code: 'INVALID_REFERENCE_LINE',
          path: ['codeBlocks', index.toString(), 'reference', 'line']
        });
      }

      if (typeof block.reference.messageIndex !== 'number' || block.reference.messageIndex < 0) {
        errors.push({
          field: `codeBlocks[${index}].reference.messageIndex`,
          message: 'Reference messageIndex must be a non-negative number',
          code: 'INVALID_REFERENCE_INDEX',
          path: ['codeBlocks', index.toString(), 'reference', 'messageIndex']
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Existing Document Validation
export function validateDocuments(
  documents: ChatState['documents'],
  context?: ValidationContext
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for required properties
  if (!documents.types || typeof documents.types !== 'object') {
    errors.push({
      field: 'documents.types',
      message: 'Document types must be an object',
      code: 'INVALID_TYPES',
      path: ['documents', 'types']
    });
  }

  // Validate lastRefreshed if present
  if (documents.lastRefreshed) {
    const timestamp = new Date(documents.lastRefreshed).getTime();
    if (isNaN(timestamp)) {
      errors.push({
        field: 'documents.lastRefreshed',
        message: 'Invalid lastRefreshed timestamp',
        code: 'INVALID_TIMESTAMP',
        path: ['documents', 'lastRefreshed']
      });
    }
  }

  // Validate selectedType if present
  if (documents.selectedType !== undefined && documents.selectedType !== null) {
    if (typeof documents.selectedType !== 'string') {
      errors.push({
        field: 'documents.selectedType',
        message: 'Selected type must be a string if present',
        code: 'INVALID_SELECTED_TYPE',
        path: ['documents', 'selectedType']
      });
    }
  }

  // Validate document type counts
  Object.entries(documents.types).forEach(([type, count]) => {
    if (typeof count !== 'number' || count < 0) {
      errors.push({
        field: `documents.types.${type}`,
        message: 'Document type count must be a non-negative number',
        code: 'INVALID_TYPE_COUNT',
        path: ['documents', 'types', type]
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Existing Annotation Validation
export function validateAnnotations(
  annotations: CodeAnnotation[],
  context?: ValidationContext
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(annotations)) {
    return {
      isValid: false,
      errors: [{
        field: 'annotations',
        message: 'Annotations must be an array',
        code: 'INVALID_TYPE'
      }]
    };
  }

  annotations.forEach((annotation, index) => {
    if (!annotation.blockId) {
      errors.push({
        field: `annotations[${index}].blockId`,
        message: 'Block ID is required',
        code: 'MISSING_BLOCK_ID',
        path: ['annotations', index.toString(), 'blockId']
      });
    }

    if (!annotation.messageId) {
      errors.push({
        field: `annotations[${index}].messageId`,
        message: 'Message ID is required',
        code: 'MISSING_MESSAGE_ID',
        path: ['annotations', index.toString(), 'messageId']
      });
    }

    if (!annotation.textContent) {
      errors.push({
        field: `annotations[${index}].textContent`,
        message: 'Text content is required',
        code: 'MISSING_TEXT_CONTENT',
        path: ['annotations', index.toString(), 'textContent']
      });
    }

    if (typeof annotation.index !== 'number' || annotation.index < 0) {
      errors.push({
        field: `annotations[${index}].index`,
        message: 'Index must be a non-negative number',
        code: 'INVALID_INDEX',
        path: ['annotations', index.toString(), 'index']
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Existing Plan Validation
export function validatePlan(plan: Plan | null, context?: ValidationContext): ValidationResult {
  const errors: ValidationError[] = [];

  // Allow null plan
  if (!plan) {
    return { isValid: true, errors: [] };
  }

  // Validate required fields
  if (!plan.id) {
    errors.push({
      field: 'plan.id',
      message: 'Plan ID is required',
      code: 'MISSING_PLAN_ID',
      path: ['plan', 'id']
    });
  }

  if (!plan.title) {
    errors.push({
      field: 'plan.title',
      message: 'Plan title is required',
      code: 'MISSING_TITLE',
      path: ['plan', 'title']
    });
  }

  if (!plan.steps || !Array.isArray(plan.steps)) {
    errors.push({
      field: 'plan.steps',
      message: 'Plan steps must be an array',
      code: 'INVALID_STEPS',
      path: ['plan', 'steps']
    });
  } else {
    plan.steps.forEach((step, index) => {
      if (!step.id) {
        errors.push({
          field: `plan.steps[${index}].id`,
          message: 'Step ID is required',
          code: 'MISSING_STEP_ID',
          path: ['plan', 'steps', index.toString(), 'id']
        });
      }

      if (!step.title) {
        errors.push({
          field: `plan.steps[${index}].title`,
          message: 'Step title is required',
          code: 'MISSING_STEP_TITLE',
          path: ['plan', 'steps', index.toString(), 'title']
        });
      }

      if (!['pending', 'in_progress', 'completed', 'failed'].includes(step.status)) {
        errors.push({
          field: `plan.steps[${index}].status`,
          message: 'Invalid step status',
          code: 'INVALID_STEP_STATUS',
          path: ['plan', 'steps', index.toString(), 'status']
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Existing Chat State Validation
export function validateChatState(state: ChatState, context?: ValidationContext): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate each state component
  const messageValidation = validateMessages(state.messages, context);
  const codeBlockValidation = validateCodeBlocks(state.codeBlocks, context);
  const documentValidation = validateDocuments(state.documents, context);
  const annotationValidation = validateAnnotations(state.annotations, context);
  const planValidation = validatePlan(state.activePlan, context);

  return {
    isValid: (
      messageValidation.isValid &&
      codeBlockValidation.isValid &&
      documentValidation.isValid &&
      annotationValidation.isValid &&
      planValidation.isValid
    ),
    errors: [
      ...messageValidation.errors,
      ...codeBlockValidation.errors,
      ...documentValidation.errors,
      ...annotationValidation.errors,
      ...planValidation.errors
    ]
  };
}

// New Configuration Validation
export function validateConfig(config: EmbeddingConfig): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate API Keys
  if (!config.apiKeys?.pinecone) {
    errors.push({
      field: 'apiKeys.pinecone',
      message: 'Pinecone API key is required',
      code: 'MISSING_API_KEY'
    });
  }

  if (!config.apiKeys?.voyage) {
    errors.push({
      field: 'apiKeys.voyage',
      message: 'Voyage API key is required',
      code: 'MISSING_API_KEY'
    });
  }

  // Validate Vector DB Configuration
  if (!config.vectordb) {
    errors.push({
      field: 'vectordb',
      message: 'Vector database configuration is required',
      code: 'MISSING_CONFIG'
    });
  } else {
    if (!config.vectordb.indexName) {
      errors.push({
        field: 'vectordb.indexName',
        message: 'Vector database index name is required',
        code: 'MISSING_INDEX'
      });
    }
    if (!config.vectordb.cloud) {
      errors.push({
        field: 'vectordb.cloud',
        message: 'Vector database cloud provider is required',
        code: 'MISSING_CLOUD'
      });
    }
    if (!config.vectordb.region) {
      errors.push({
        field: 'vectordb.region',
        message: 'Vector database region is required',
        code: 'MISSING_REGION'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// New Project State Validation
export function validateProjectState(project: SavedProject, context?: ValidationContext): ValidationResult {
  const errors: ValidationError[] = [];

  // Basic project structure
  if (!project.id) {
    errors.push({
      field: 'id',
      message: 'Project ID is required',
      code: 'MISSING_ID'
    });
  }

  if (!project.metadata) {
    errors.push({
      field: 'metadata',
      message: 'Project metadata is required',
      code: 'MISSING_METADATA'
    });
  } else {
    // Validate metadata fields
    if (!project.metadata.name) {
      errors.push({
        field: 'metadata.name',
        message: 'Project name is required',
        code: 'MISSING_NAME'
      });
    }
    if (!project.metadata.namespace) {
      errors.push({
        field: 'metadata.namespace',
        message: 'Project namespace is required',
        code: 'MISSING_NAMESPACE'
      });
    }
  }

  // Configuration validation if in config stage or later
  if (context?.stage && ['config', 'documents', 'chat', 'plans', 'complete'].includes(context.stage)) {
    const configValidation = validateConfig({
      apiKeys: project.config.apiKeys,
      vectordb: project.config.vectorDBConfig,
      embedding: { provider: 'voyage' }
    });
    
    errors.push(...configValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// New User Profile Validation
export function validateUserProfile(user: UserProfile): ValidationResult {
  const errors: ValidationError[] = [];

  if (!user.id) {
    errors.push({
      field: 'id',
      message: 'User ID is required',
      code: 'MISSING_ID'
    });
  }

  if (!user.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'User name is required',
      code: 'MISSING_NAME'
    });
  }

  if (user.email && !isValidEmail(user.email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL'
    });
  }

  if (!user.preferences) {
    errors.push({
      field: 'preferences',
      message: 'User preferences are required',
      code: 'MISSING_PREFERENCES'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// New Initialization Stage Validation
export function validateInitializationStage(
  currentStage: InitializationStage,
  targetStage: InitializationStage,
  context?: ValidationContext
): ValidationResult {
  const errors: ValidationError[] = [];
  const stages: InitializationStage[] = [
    'none',
    'auth',
    'project',
    'config',
    'documents',
    'chat',
    'plans',
    'complete'
  ];

  const currentIndex = stages.indexOf(currentStage);
  const targetIndex = stages.indexOf(targetStage);

  if (currentIndex === -1 || targetIndex === -1) {
    errors.push({
      field: 'stage',
      message: 'Invalid initialization stage',
      code: 'INVALID_STAGE'
    });
  } else if (context?.strictMode && targetIndex > currentIndex + 1) {
    errors.push({
      field: 'stage',
      message: 'Cannot skip initialization stages',
      code: 'STAGE_SKIP'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper Functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function ensureConfigured(config: EmbeddingConfig): void {
  const validation = validateConfig(config);
  if (!validation.isValid) {
    throw new Error(`Configuration error: ${validation.errors.map(e => e.message).join(', ')}`);
  }
}

export function ensureValidProject(project: SavedProject, context?: ValidationContext): void {
  const validation = validateProjectState(project, context);
  if (!validation.isValid) {
    throw new Error(`Invalid project state: ${validation.errors.map(e => e.message).join(', ')}`);
  }
}