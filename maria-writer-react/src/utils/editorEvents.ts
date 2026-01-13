
/**
 * Create event markup for a given event ID and text
 */
export function createEventMarkup(eventId: string, text: string, isPending: boolean = false): string {
  const pendingAttr = isPending ? ' data-event-pending="true"' : '';
  return `<span data-event-id="${eventId}"${pendingAttr} class="event-marker">${text}</span>`;
}

/**
 * Remove pending attribute from event markup
 */
export function finalizeEventMarkup(content: string, eventId: string): string {
  // Matches the span opening tag and removes data-event-pending="true"
  const regex = new RegExp(`(<span[^>]*data-event-id="${eventId}"[^>]*) data-event-pending="true"`, 'g');
  return content.replace(regex, '$1');
}

/**
 * Remove event markup from content while preserving the text
 */
export function removeEventMarkup(content: string, eventId: string): string {
  // Matches <span data-event-id="...">text</span>
  const regex = new RegExp(`<span[^>]*data-event-id="${eventId}"[^>]*>(.*?)</span>`, 'g');
  return content.replace(regex, '$1');
}
