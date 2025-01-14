// src/utils/validation.ts
import { Canvas, User, ComponentType } from '@/types';

export function validateCanvas(canvas: Canvas): boolean {
  if (!canvas.id || !canvas.name || !canvas.owner) {
    return false;
  }

  if (!Array.isArray(canvas.activeComponents)) {
    return false;
  }

  // Validate all active components are valid types
  const validTypes: ComponentType[] = ['chat', 'documents', 'codeBlocks', 'plans'];
  if (!canvas.activeComponents.every(type => validTypes.includes(type))) {
    return false;
  }

  // Validate dates
  const created = new Date(canvas.created);
  const updated = new Date(canvas.updated);
  if (isNaN(created.getTime()) || isNaN(updated.getTime())) {
    return false;
  }

  // Validate collaborators
  if (!Array.isArray(canvas.collaborators)) {
    return false;
  }

  const validRoles = ['owner', 'editor', 'viewer'];
  if (!canvas.collaborators.every(c => 
    c.id && 
    validRoles.includes(c.role)
  )) {
    return false;
  }

  return true;
}

export function validateUser(user: User): boolean {
  if (!user.id || !user.email || !user.name) {
    return false;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    return false;
  }

  // Validate preferences
  if (user.preferences) {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(user.preferences.theme)) {
      return false;
    }

    if (typeof user.preferences.fontSize !== 'number' || 
        user.preferences.fontSize < 8 || 
        user.preferences.fontSize > 32) {
      return false;
    }

    const validLayouts = ['default', 'compact', 'comfortable'];
    if (!validLayouts.includes(user.preferences.layout)) {
      return false;
    }
  }

  // Validate settings
  if (user.settings) {
    if (typeof user.settings.autoSave !== 'boolean') {
      return false;
    }
    if (typeof user.settings.notifications !== 'boolean') {
      return false;
    }
  }

  return true;
}

export function validateComponentType(type: string): type is ComponentType {
  const validTypes: ComponentType[] = ['chat', 'documents', 'codeBlocks', 'plans'];
  return validTypes.includes(type as ComponentType);
}

export function validateComponentState(componentType: ComponentType, state: unknown): boolean {
  if (!state || typeof state !== 'object') {
    return false;
  }

  switch (componentType) {
    case 'chat':
      return validateChatState(state);
    case 'documents':
      return validateDocumentState(state);
    case 'codeBlocks':
      return validateCodeBlockState(state);
    case 'plans':
      return validatePlanState(state);
    default:
      return false;
  }
}

function validateChatState(state: any): boolean {
  if (!Array.isArray(state.messages)) {
    return false;
  }

  return state.messages.every((msg: any) => 
    msg.id &&
    msg.content &&
    ['user', 'assistant'].includes(msg.sender) &&
    new Date(msg.timestamp).getTime() > 0
  );
}

function validateDocumentState(state: any): boolean {
  if (typeof state.files !== 'object') {
    return false;
  }

  return Object.values(state.files).every((doc: any) =>
    doc.id &&
    doc.name &&
    doc.content &&
    doc.format &&
    new Date(doc.created).getTime() > 0 &&
    new Date(doc.updated).getTime() > 0
  );
}

function validateCodeBlockState(state: any): boolean {
  if (!Array.isArray(state.blocks)) {
    return false;
  }

  return state.blocks.every((block: any) =>
    block.id &&
    block.name &&
    block.content &&
    block.language &&
    (!block.dependencies || Array.isArray(block.dependencies))
  );
}

function validatePlanState(state: any): boolean {
  if (!Array.isArray(state.items)) {
    return false;
  }

  return state.items.every((plan: any) =>
    plan.id &&
    plan.title &&
    Array.isArray(plan.steps) &&
    plan.steps.every((step: any) =>
      step.id &&
      step.title &&
      typeof step.status === 'string' &&
      (!step.dependencies || Array.isArray(step.dependencies))
    )
  );
}