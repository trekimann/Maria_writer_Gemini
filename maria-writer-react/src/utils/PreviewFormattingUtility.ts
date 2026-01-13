/**
 * PreviewFormattingUtility.ts
 * Utilities for cleaning and stripping formatting markup from editor content
 * Used to generate a "clean" preview that shows text without comment/mention/event highlighting
 */

/**
 * Strip all formatting markup from markdown content using DOM parsing
 * Removes comment tags, character mentions, and event markers while preserving text content
 * Handles nested markup correctly (e.g., characters inside comments, events inside mentions, etc.)
 * 
 * @param content - Raw markdown content with formatting markup
 * @returns Cleaned markdown without any formatting markup
 */
export function stripFormattingMarkup(content: string): string {
  if (!content) return content;
  
  // Create a temporary DOM element to parse the content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // Remove all comment elements (<u data-comment-id>)
  const commentElements = tempDiv.querySelectorAll('u[data-comment-id]');
  commentElements.forEach(element => {
    const textContent = element.textContent || '';
    const textNode = document.createTextNode(textContent);
    element.parentNode?.replaceChild(textNode, element);
  });
  
  // Remove all character mention elements (<span data-character-id>)
  const mentionElements = tempDiv.querySelectorAll('span[data-character-id]');
  mentionElements.forEach(element => {
    const textContent = element.textContent || '';
    const textNode = document.createTextNode(textContent);
    element.parentNode?.replaceChild(textNode, element);
  });
  
  // Remove all event marker elements (<span data-event-id>)
  const eventElements = tempDiv.querySelectorAll('span[data-event-id]');
  eventElements.forEach(element => {
    const textContent = element.textContent || '';
    const textNode = document.createTextNode(textContent);
    element.parentNode?.replaceChild(textNode, element);
  });
  
  // Return the cleaned HTML
  return tempDiv.innerHTML;
}
/**
 * Get clean preview HTML for preview mode
 * Strips all formatting markup and returns HTML suitable for display without styling
 * 
 * @param content - Raw markdown content with formatting markup
 * @param markdownToHtml - The function to convert cleaned markdown to HTML
 * @returns HTML string with formatting removed but basic markdown structure preserved
 */
export function getCleanPreviewContent(
  content: string,
  markdownToHtml: (markdown: string) => string
): string {
  const cleanedContent = stripFormattingMarkup(content);
  return markdownToHtml(cleanedContent);
}
