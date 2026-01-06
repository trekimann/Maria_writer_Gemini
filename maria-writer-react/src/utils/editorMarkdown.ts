import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { Character, StoryComment } from '../types';

/**
 * Initialize Turndown service with custom rules for comments and mentions
 */
export function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**'
  });

  // Configure turndown to keep <u> tags with attributes for comments
  turndownService.addRule('keep-u', {
    filter: ['u'],
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const commentId = el.getAttribute('data-comment-id');
      const className = el.getAttribute('class');
      const attrs = [];
      if (commentId) attrs.push(`data-comment-id="${commentId}"`);
      if (className) attrs.push(`class="${className}"`);
      const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
      return `<u${attrString}>${content}</u>`;
    }
  });

  // Configure turndown to keep character mentions
  turndownService.addRule('character-mention', {
    filter: (node) => {
      return node.nodeName === 'SPAN' && (node as HTMLElement).getAttribute('data-character-id') !== null;
    },
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const charId = el.getAttribute('data-character-id');
      const charName = el.getAttribute('data-character-name');
      return `<span data-character-id="${charId}" data-character-name="${charName}" class="character-mention">${content}</span>`;
    }
  });

  return turndownService;
}

/**
 * Convert HTML back to Markdown using turndown
 */
export function htmlToMarkdown(html: string, turndownService: TurndownService): string {
  return turndownService.turndown(html);
}

/**
 * Process markdown content and convert to HTML with sanitization
 * Handles hidden comments and character color injection
 */
export function markdownToHtml(
  markdownContent: string,
  comments: StoryComment[],
  characters: Character[],
  viewMode: 'preview' | 'write' | 'source'
): string {
  if (!markdownContent) return '';
  
  let processedContent = markdownContent;

  // Handle hidden comments - remove the markup but keep the text
  comments.forEach(comment => {
    if (comment.isHidden) {
      const regex = new RegExp(`<u[^>]*data-comment-id="${comment.id}"[^>]*>(.*?)</u>`, 'g');
      processedContent = processedContent.replace(regex, '$1');
    }
  });

  // Inject character-specific colors into spans
  characters.forEach(char => {
    if (char.color) {
      const escapedId = char.id.replace(/"/g, '&quot;');
      const regex = new RegExp(`(<span[^>]*data-character-id=["'](${char.id}|${escapedId})["'][^>]*>)([\\s\\S]*?)(</span>)`, 'g');
      const colorWithAlpha = `${char.color}25`; // 15% opacity for highlight
      const ceAttr = viewMode === 'write' ? ' contenteditable="false"' : '';
      processedContent = processedContent.replace(regex, `$1<span style="background-color: ${colorWithAlpha}; color: ${char.color}; border-bottom: 2px solid ${char.color}; padding: 0 4px; border-radius: 4px; font-weight: 500;"${ceAttr}>$3</span>$4`);
    }
  });
  
  // Parse markdown and then sanitize
  const rawHtml = marked.parse(processedContent) as string;
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['u', 'span'],
    ADD_ATTR: ['class', 'data-comment-id', 'data-character-id', 'data-character-name', 'style', 'contenteditable']
  });
}

/**
 * Extract title from markdown content (first H1)
 */
export function extractTitleFromMarkdown(content: string): string | null {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  if (firstLine.startsWith('# ')) {
    const h1Title = firstLine.substring(2).trim();
    return h1Title || null;
  }
  return null;
}
