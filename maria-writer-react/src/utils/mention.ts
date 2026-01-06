import { Chapter, Character } from '../types';

export interface MentionMatch {
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
  index: number;
}

/**
 * Scans chapters for mentions of a specific character and returns excerpts
 */
export const findCharacterMentions = (
  chapters: Chapter[],
  character: Character
): MentionMatch[] => {
  if (!character.id) return [];

  return chapters.flatMap(chapter => {
    // Escape double quotes in char.id for the regex
    const escapedId = character.id.replace(/"/g, '&quot;');
    // Match <span ... data-character-id="ID" ... >Name</span>
    // Supporting both double and single quotes and attribute order
    const regex = new RegExp(`<span[^>]*data-character-id=["'](${character.id}|${escapedId})["'][^>]*>([\\s\\S]*?)</span>`, 'g');
    const matches: MentionMatch[] = [];
    let match;
    
    while ((match = regex.exec(chapter.content)) !== null) {
      const start = Math.max(0, match.index - 60);
      const end = Math.min(chapter.content.length, match.index + match[0].length + 60);
      let excerpt = chapter.content.substring(start, end);
      
      const tagContent = match[2];
      const charColor = character.color || '#4f46e5';
      const colorWithAlpha = `${charColor}25`;
      
      // Highlight the mention in the excerpt
      // Use style-based highlight that matches what's expected in CharacterDetail
      excerpt = excerpt.replace(match[0], `<mark class="mention-highlight" style="background-color: ${colorWithAlpha}; color: ${charColor}">${tagContent}</mark>`);
      
      // Clean up other HTML tags except our highlight
      excerpt = excerpt.replace(/<(?!mark|\/mark)[^>]*>/g, '');
      
      matches.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        excerpt: excerpt,
        index: match.index
      });
    }
    return matches;
  });
};

/**
 * Extracts all character IDs mentioned in the given content
 */
export const extractMentionedCharacterIds = (content: string): string[] => {
  if (!content) return [];
  
  // Match <span ... data-character-id="ID" ... >
  // This version handles ", ', and &quot; specifically
  const regex = /data-character-id=(?:&quot;|["'])(.*?)(?:&quot;|["'])/g;
  const characterIds = new Set<string>();
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const id = match[1].trim();
    if (id) {
      characterIds.add(id);
    }
  }
  
  return Array.from(characterIds);
};
