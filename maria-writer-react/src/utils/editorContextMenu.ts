import { Character } from '../types';
import { autoTagCharacters } from './editorMentions';

/**
 * Logic for auto-tagging characters
 */
export function getAutoTaggedHtml(
  viewMode: 'write' | 'source' | 'preview',
  content: string,
  characters: Character[],
  contentEditableRef: React.RefObject<HTMLDivElement>,
  getMarkdownHtml: (markdown?: string) => string
): string | null {
  let currentHtml = '';
  if (viewMode === 'write' && contentEditableRef.current) {
    currentHtml = contentEditableRef.current.innerHTML;
  } else {
    currentHtml = getMarkdownHtml(content);
  }

  const newHtml = autoTagCharacters(currentHtml, characters);
  return newHtml !== currentHtml ? newHtml : null;
}

/**
 * Handle copy operation
 */
export async function performCopy(
  viewMode: 'write' | 'source' | 'preview',
  textareaRef: React.RefObject<HTMLTextAreaElement>
) {
  let textToCopy = '';
  if (viewMode === 'source' && textareaRef.current) {
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    textToCopy = textareaRef.current.value.substring(start, end);
  } else if (viewMode === 'write') {
    textToCopy = window.getSelection()?.toString() || '';
  }

  if (textToCopy) {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
}

/**
 * Logic for paste operation
 * Returns the new content or a signal for DOM update
 */
export async function getPasteData(
  viewMode: 'write' | 'source' | 'preview',
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  contentEditableRef: React.RefObject<HTMLDivElement>
): Promise<{ type: 'source'; value: string; cursor: number } | { type: 'write' } | null> {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return null;

    if (viewMode === 'source' && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const val = textareaRef.current.value;
      const newVal = val.substring(0, start) + text + val.substring(end);
      
      return { 
        type: 'source', 
        value: newVal, 
        cursor: start + text.length 
      };
    } else if (viewMode === 'write' && contentEditableRef.current) {
      contentEditableRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        return { type: 'write' };
      }
    }
  } catch (err) {
    console.error('Failed to paste text: ', err);
    throw err;
  }
  return null;
}
