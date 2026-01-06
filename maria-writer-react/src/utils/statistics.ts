/**
 * Extract clean text from content, removing comment and mention markup
 */
export function extractCleanText(content: string): string {
  let cleanText = content;

  // Remove comment markup: <u data-comment-id="...">text</u>
  cleanText = cleanText.replace(/<u[^>]*data-comment-id="[^"]*"[^>]*>(.*?)<\/u>/g, '$1');

  // Remove character mention markup: <span data-character-id="...">name</span>
  cleanText = cleanText.replace(/<span[^>]*data-character-id="[^"]*"[^>]*>(.*?)<\/span>/g, '$1');

  // Remove any remaining HTML tags
  cleanText = cleanText.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = cleanText;
  cleanText = textarea.value;

  return cleanText;
}

/**
 * Calculate word count from clean text
 */
export function calculateWordCount(text: string): number {
  const cleanText = text.trim();
  if (!cleanText) return 0;
  return cleanText.split(/\s+/).length;
}

/**
 * Calculate character count from clean text
 */
export function calculateCharacterCount(text: string): number {
  return text.length;
}

/**
 * Calculate reading time in minutes (range from 150-300 wpm)
 * Returns [minTime, maxTime] in minutes
 */
export function calculateReadingTime(wordCount: number): [number, number] {
  const minTime = Math.ceil(wordCount / 300); // 300 wpm = fastest
  const maxTime = Math.ceil(wordCount / 150); // 150 wpm = slowest
  return [minTime, maxTime];
}

/**
 * Format reading time for display
 */
export function formatReadingTime(wordCount: number): string {
  if (wordCount === 0) return '0 min';

  const [minTime, maxTime] = calculateReadingTime(wordCount);

  if (minTime === maxTime && minTime === 1) {
    if (wordCount < 10) return '< 1 min';
    return '1 min';
  }

  if (minTime === maxTime) {
    return `${minTime} min`;
  }

  return `${minTime}-${maxTime} min`;
}
