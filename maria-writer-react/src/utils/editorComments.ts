import { Comment } from '../types';

/**
 * Create comment markup for a given comment ID and text
 */
export function createCommentMarkup(commentId: string, text: string): string {
  return `<u data-comment-id="${commentId}" class="comment">${text}</u>`;
}

/**
 * Remove comment markup from content while preserving the text
 */
export function removeCommentMarkup(content: string, commentId: string): string {
  const regex = new RegExp(`<u[^>]*data-comment-id="${commentId}"[^>]*>(.*?)</u>`, 'g');
  return content.replace(regex, '$1');
}

/**
 * Replace text within a comment tag
 */
export function replaceCommentText(
  content: string,
  commentId: string,
  newText: string
): string {
  const regex = new RegExp(`(<u[^>]*data-comment-id="${commentId}"[^>]*>)([\\s\\S]*?)(</u>)`, 'g');
  return content.replace(regex, `$1${newText}$3`);
}

/**
 * Permanently apply a suggestion by removing the comment tag and keeping replacement text
 */
export function applySuggestionToContent(
  content: string,
  commentId: string,
  replacementText: string
): string {
  const regex = new RegExp(`<u[^>]*data-comment-id="${commentId}"[^>]*>.*?</u>`, 'g');
  return content.replace(regex, replacementText);
}

/**
 * Update CSS classes on comment elements in the DOM based on state
 */
export function updateCommentElementClasses(
  comments: Comment[],
  activeCommentId: string | null
): void {
  const commentElements = document.querySelectorAll('u[data-comment-id]');
  console.log('[CSS] Updating comment element classes, found:', commentElements.length, 'elements');
  
  commentElements.forEach(element => {
    const commentId = element.getAttribute('data-comment-id');
    if (!commentId) return;

    const comment = comments.find(c => c.id === commentId);
    
    // Update active class
    if (commentId === activeCommentId) {
      element.classList.add('comment-active');
    } else {
      element.classList.remove('comment-active');
    }

    // Update suggestion-applied class
    if (comment?.isSuggestion && comment.isPreviewing) {
      element.classList.add('suggestion-applied');
    } else {
      element.classList.remove('suggestion-applied');
    }
  });
}

/**
 * Check if a text selection overlaps with existing comment markup
 */
export function hasOverlappingComments(text: string): boolean {
  return text.includes('<u data-comment-id=') || text.includes('</u>');
}

/**
 * Find comment element in DOM and unwrap it (remove tag but keep text)
 */
export function unwrapCommentElement(
  container: HTMLElement,
  commentId: string
): void {
  const element = container.querySelector(`u[data-comment-id="${commentId}"]`);
  if (element) {
    const text = element.textContent || '';
    const textNode = document.createTextNode(text);
    element.parentNode?.replaceChild(textNode, element);
  }
}

/**
 * Wrap a DOM selection with a comment element
 */
export function wrapSelectionWithComment(
  selection: Selection,
  commentId: string,
  isPending: boolean = false
): boolean {
  if (selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  
  // Check if selection contains existing comment elements
  const fragment = range.cloneContents();
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);
  
  if (tempDiv.querySelector('u[data-comment-id]')) {
    return false; // Overlap detected
  }

  const u = document.createElement('u');
  u.className = isPending ? 'comment pending' : 'comment';
  u.setAttribute('data-comment-id', commentId);
  
  try {
    range.surroundContents(u);
    return true;
  } catch (e) {
    console.error('[Comment] Error wrapping selection', e);
    return false;
  }
}

/**
 * Update comment element ID (e.g., from pending to permanent)
 */
export function updateCommentElementId(
  container: HTMLElement,
  oldId: string,
  newId: string
): boolean {
  const element = container.querySelector(`u[data-comment-id="${oldId}"]`);
  if (element) {
    element.setAttribute('data-comment-id', newId);
    element.classList.remove('pending');
    return true;
  }
  return false;
}
