import { Character } from '../types';

/**
 * Create HTML markup for a character mention
 */
export function createMentionMarkup(character: Character): string {
  return `<span data-character-id="${character.id}" data-character-name="${character.name}" class="character-mention">${character.name}</span>`;
}

/**
 * Filter characters by query string
 */
export function filterCharactersByQuery(characters: Character[], query: string): Character[] {
  const lowerQuery = query.toLowerCase();
  return characters.filter(char =>
    char.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Detect @ mention in text before cursor (for textarea)
 */
export function detectMentionInTextarea(
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null {
  const textBefore = text.substring(0, cursorPosition);
  const lastAt = textBefore.lastIndexOf('@');
  
  if (lastAt !== -1 && !textBefore.substring(lastAt).includes(' ')) {
    const query = textBefore.substring(lastAt + 1);
    return { query, startIndex: lastAt };
  }
  
  return null;
}

/**
 * Detect @ mention in contenteditable before cursor
 */
export function detectMentionInContentEditable(
  selection: Selection
): { query: string; range: Range } | null {
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const textNode = range.startContainer;
  const textContent = textNode.textContent || '';
  const offset = range.startOffset;
  const textBeforeCursor = textContent.substring(0, offset);
  const lastAt = textBeforeCursor.lastIndexOf('@');

  if (lastAt !== -1 && !textBeforeCursor.substring(lastAt).includes(' ')) {
    const query = textBeforeCursor.substring(lastAt + 1);
    return { query, range };
  }

  return null;
}

/**
 * Insert character mention in textarea
 */
export function insertMentionInTextarea(
  textarea: HTMLTextAreaElement,
  mentionStartIndex: number,
  mentionHtml: string
): { newContent: string; cursorPosition: number } {
  const text = textarea.value;
  const end = textarea.selectionStart;
  const before = text.substring(0, mentionStartIndex);
  const after = text.substring(end);
  
  const newContent = before + mentionHtml + ' ' + after;
  const cursorPosition = mentionStartIndex + mentionHtml.length + 1;
  
  return { newContent, cursorPosition };
}

/**
 * Insert character mention in contenteditable
 */
export function insertMentionInContentEditable(
  selection: Selection,
  character: Character
): boolean {
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const textNode = range.startContainer;
  const textContent = textNode.textContent || '';
  const lastAt = textContent.substring(0, range.startOffset).lastIndexOf('@');
  
  if (lastAt === -1) return false;

  try {
    // Remove the '@query' part
    range.setStart(textNode, lastAt);
    range.deleteContents();
    
    // Create the mention span
    const span = document.createElement('span');
    span.className = 'character-mention';
    span.setAttribute('data-character-id', character.id);
    span.setAttribute('data-character-name', character.name);
    span.textContent = character.name;
    span.contentEditable = 'false';
    
    // Create a space node after the span
    const spaceNode = document.createTextNode(' ');
    
    range.insertNode(span);
    span.after(spaceNode);
    
    // Position cursor after the space
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    
    return true;
  } catch (e) {
    console.error('[Mention] Error inserting mention', e);
    return false;
  }
}

/**
 * Get approximate position for mention popup in textarea
 */
export function getTextareaMentionPosition(textarea: HTMLTextAreaElement): { x: number; y: number } {
  const rect = textarea.getBoundingClientRect();
  // This is a rough approximation
  return { x: rect.left + 20, y: rect.top + 50 };
}

/**
 * Get precise position for mention popup in contenteditable
 */
export function getContentEditableMentionPosition(range: Range): { x: number; y: number } {
  const rect = range.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom + window.scrollY };
}
