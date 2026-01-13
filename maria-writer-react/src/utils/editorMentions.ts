import { Character } from '../types';

/**
 * Find characters mentioned in plain text
 */
export function findCharactersInPlainText(text: string, characters: Character[]): string[] {
  const foundIds = new Set<string>();
  
  characters.forEach(char => {
    const names = [char.name, ...(char.nicknames || [])];
    const isFound = names.some(name => {
      if (!name || !name.trim()) return false;
      // Escape special regex chars
      const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // match word boundaries or common punctuation
      const regex = new RegExp(`(^|\\s|[.,;!?("'\u201C\u201D-])${escaped}($|\\s|[.,;!?)"'\u201C\u201D-]s?)`, 'i');
      return regex.test(text);
    });
    
    if (isFound) {
      foundIds.add(char.id);
    }
  });

  return Array.from(foundIds);
}

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

/**
 * Auto-tag characters in the provided HTML content
 * Scans for character names and nicknames in text nodes that aren't already tagged
 */
export function autoTagCharacters(htmlContent: string, characters: Character[]): string {
  // Create a temporary DOM element to parse content
  const div = document.createElement('div');
  div.innerHTML = htmlContent;

  // Prepare search terms (names + nicknames)
  // Sort by length descending to match longest possible names first
  const terms: { text: string; char: Character }[] = [];
  characters.forEach(c => {
    const addTerm = (rawText: string) => {
      if (!rawText || !rawText.trim()) return;
      const t = rawText.trim();
      // Add literal name/nickname
      terms.push({ text: t, char: c });
      // Add possessive form (e.g. "Nick's")
      terms.push({ text: t + "'s", char: c });
      // We could add smart quote '’s' if strictly needed, but standard 's is usually enough for input.
    };

    addTerm(c.name);
    
    if (c.nicknames && c.nicknames.length > 0) {
      c.nicknames.forEach(nick => addTerm(nick));
    }
  });
  
  terms.sort((a, b) => b.text.length - a.text.length);

  if (terms.length === 0) return htmlContent;

  // Find all text nodes that are NOT inside a character-mention
  const textNodes: Text[] = [];
  const treeWalker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Check if any ancestor is a mention
      if (node.parentElement?.closest('.character-mention')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (treeWalker.nextNode()) {
    textNodes.push(treeWalker.currentNode as Text); 
  }
  
  textNodes.forEach(node => {
    const text = node.textContent;
    if (!text) return;

    const fragment = document.createDocumentFragment();
    let head = 0;
    let foundMatch = false;

    // We scan the text linearly. At each position, check if any term matches.
    for (let i = 0; i < text.length; i++) {
        let bestMatch: { text: string; char: Character } | null = null;

        for (const term of terms) {
            if (text.startsWith(term.text, i)) {
                // Check word boundaries
                const prevChar = i > 0 ? text[i - 1] : ' ';
                const nextChar = (i + term.text.length < text.length) ? text[i + term.text.length] : ' ';
                
                // Punctuation characters that indicate a word boundary
                const isWordStart = /[\s\.,;:!?("'\u201C\u201D-]/.test(prevChar);
                const isWordEnd = /[\s\.,;:!?)"'\u201C\u201D-]/.test(nextChar);

                if (isWordStart && isWordEnd) {
                    bestMatch = term;
                    break; // Since terms are sorted by length desc, first match is best
                }
            }
        }

        if (bestMatch) {
            // Found a match
            // Append text before match
            if (i > head) {
                fragment.appendChild(document.createTextNode(text.substring(head, i)));
            }

            // Create mention span
            const span = document.createElement('span');
            span.className = 'character-mention';
            span.setAttribute('data-character-id', bestMatch.char.id);
            span.setAttribute('data-character-name', bestMatch.char.name);
            span.textContent = bestMatch.text; // Use the matched text (e.g. nickname)
            span.contentEditable = 'false';
            fragment.appendChild(span);

            // Advance head and i
            head = i + bestMatch.text.length;
            i = head - 1; // loop increment will handle +1
            foundMatch = true;
        }
    }

    if (foundMatch) {
        if (head < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(head)));
        }
        node.parentNode?.replaceChild(fragment, node);
    }
  });

  return div.innerHTML;
}
