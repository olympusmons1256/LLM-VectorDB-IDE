// services/code-annotations.ts
import type { CodeAnnotation } from '@/types/code-block';

interface ExtractedReference {
  blockIndex: number;
  startLine: number;
  endLine?: number;
  content: string;
}

export function extractCodeBlockReferences(content: string): ExtractedReference[] {
  const references: ExtractedReference[] = [];
  const regex = /\[CODE BLOCK\](?:\s*\((\d+)\))?(?:\s*L(\d+)(?:-L(\d+))?)?/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const blockIndex = match[1] ? parseInt(match[1]) - 1 : references.length;
    const startLine = match[2] ? parseInt(match[2]) : 1;
    const endLine = match[3] ? parseInt(match[3]) : undefined;
    
    // Find related content by looking for explanatory text after the reference
    let relatedContent = '';
    const remainingText = content.slice(match.index + match[0].length);
    const nextMatch = remainingText.match(/(?:\.\s+|\n\n|$)/);
    if (nextMatch) {
      relatedContent = remainingText.slice(0, nextMatch.index).trim();
    }

    references.push({
      blockIndex,
      startLine,
      endLine,
      content: relatedContent
    });
  }

  return references;
}

export function createCodeAnnotations(
  references: ExtractedReference[],
  messageId: string,
  codeBlocks: Array<{ id: string }>
): CodeAnnotation[] {
  return references.map(ref => {
    const block = codeBlocks[ref.blockIndex];
    if (!block) return null;

    return {
      blockId: block.id,
      messageId,
      textContent: ref.content,
      index: ref.startLine
    };
  }).filter((a): a is CodeAnnotation => a !== null);
}

export function findCodeBlockReferences(content: string): string[] {
  const references: string[] = [];
  const regex = /\[CODE BLOCK\](?:\s*\((\d+)\))?/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      references.push(match[1]);
    }
  }

  return references;
}

export function linkCodeBlockReferences(
  content: string,
  blocks: Array<{ id: string }>
): string {
  let linkedContent = content;
  const regex = /\[CODE BLOCK\](?:\s*\((\d+)\))?/g;
  let match;
  let defaultIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    const index = match[1] ? parseInt(match[1]) - 1 : defaultIndex;
    const block = blocks[index];
    if (block) {
      const reference = `[CODE BLOCK (${index + 1})](code-${block.id})`;
      linkedContent = linkedContent.replace(match[0], reference);
      defaultIndex++;
    }
  }

  return linkedContent;
}