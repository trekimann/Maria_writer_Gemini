import { useEffect, useState } from 'react';
import {
  extractCleanText,
  calculateWordCount,
  calculateCharacterCount,
  formatReadingTime,
  formatPageEstimate
} from '../utils/statistics';

interface UseEditorStatisticsReturn {
  wordCount: number;
  characterCount: number;
  readingTime: string;
  pageEstimate: string;
}

export const useEditorStatistics = (content: string): UseEditorStatisticsReturn => {
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [readingTime, setReadingTime] = useState('Less than 1 min');
  const [pageEstimate, setPageEstimate] = useState('0 pages');

  // Update statistics whenever content changes
  useEffect(() => {
    const cleanText = extractCleanText(content);
    const newWordCount = calculateWordCount(cleanText);
    const newCharacterCount = calculateCharacterCount(cleanText);
    const newReadingTime = formatReadingTime(newWordCount);
    const newPageEstimate = formatPageEstimate(newWordCount);

    setWordCount(newWordCount);
    setCharacterCount(newCharacterCount);
    setReadingTime(newReadingTime);
    setPageEstimate(newPageEstimate);
  }, [content]);

  return {
    wordCount,
    characterCount,
    readingTime,
    pageEstimate
  };
};
