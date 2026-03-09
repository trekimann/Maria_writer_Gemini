import { AppState, Chapter } from '../types';
import {
  calculateCharacterCount,
  calculateWordCount,
  extractCleanText,
  formatPageEstimate,
  formatReadingTime,
} from './statistics';

export interface FrequentWordEntry {
  word: string;
  count: number;
}

interface StatisticsSummaryOptions {
  ignoredWords?: string[];
}

export interface ChapterStatisticsSummary {
  id: string;
  title: string;
  order: number;
  date: string;
  wordCount: number;
  characterCount: number;
  readingTime: string;
  pageEstimate: string;
  commentCount: number;
  relatedEventCount: number;
  mentionedCharacterCount: number;
  excerpt: string;
  frequentWords: FrequentWordEntry[];
}

export interface ProjectStatisticsSummary {
  title: string;
  chapterCount: number;
  totalWordCount: number;
  totalCharacterCount: number;
  totalReadingTime: string;
  totalPageEstimate: string;
  chapters: ChapterStatisticsSummary[];
  frequentWords: FrequentWordEntry[];
}

export type StatisticsProject = Pick<AppState, 'meta' | 'chapters'>;

function createExcerpt(text: string, maxLength = 220): string {
  if (!text) return 'No chapter content yet.';

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No chapter content yet.';
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function extractWords(text: string): string[] {
  return Array.from(text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? []);
}

export function calculateFrequentWords(text: string, ignoredWords: string[] = []): FrequentWordEntry[] {
  const frequencyMap = new Map<string, number>();
  const ignoredWordSet = new Set(ignoredWords.map((word) => word.toLowerCase()));

  extractWords(text).forEach((word) => {
    if (ignoredWordSet.has(word)) {
      return;
    }

    frequencyMap.set(word, (frequencyMap.get(word) ?? 0) + 1);
  });

  return Array.from(frequencyMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word));
}

export function summarizeChapterStatistics(chapter: Chapter, options: StatisticsSummaryOptions = {}): ChapterStatisticsSummary {
  const cleanText = extractCleanText(chapter.content ?? '');
  const wordCount = calculateWordCount(cleanText);
  const characterCount = calculateCharacterCount(cleanText);

  return {
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    date: chapter.date ?? '',
    wordCount,
    characterCount,
    readingTime: formatReadingTime(wordCount),
    pageEstimate: formatPageEstimate(wordCount),
    commentCount: chapter.commentIds?.length ?? 0,
    relatedEventCount: chapter.relatedEvents?.length ?? 0,
    mentionedCharacterCount: chapter.mentionedCharacters?.length ?? 0,
    excerpt: createExcerpt(cleanText),
    frequentWords: calculateFrequentWords(cleanText, options.ignoredWords),
  };
}

export function summarizeProjectStatistics(project: StatisticsProject, options: StatisticsSummaryOptions = {}): ProjectStatisticsSummary {
  const chapters = [...project.chapters]
    .sort((left, right) => left.order - right.order)
    .map((chapter) => summarizeChapterStatistics(chapter, options));

  const totalWordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
  const totalCharacterCount = chapters.reduce((sum, chapter) => sum + chapter.characterCount, 0);

  return {
    title: project.meta.title || 'Untitled Project',
    chapterCount: chapters.length,
    totalWordCount,
    totalCharacterCount,
    totalReadingTime: formatReadingTime(totalWordCount),
    totalPageEstimate: formatPageEstimate(totalWordCount),
    chapters,
    frequentWords: calculateFrequentWords(
      project.chapters.map((chapter) => extractCleanText(chapter.content ?? '')).join(' '),
      options.ignoredWords,
    ),
  };
}
