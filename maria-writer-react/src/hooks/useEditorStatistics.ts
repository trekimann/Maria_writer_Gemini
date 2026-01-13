import { useEffect, useState } from 'react';
import {
  extractCleanText,
  calculateWordCount,
  calculateCharacterCount,
  formatReadingTime
} from '../utils/statistics';

interface UseEditorStatisticsReturn {
  wordCount: number;
  characterCount: number;
  readingTime: string;
}

export const useEditorStatistics = (content: string): UseEditorStatisticsReturn => {
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [readingTime, setReadingTime] = useState('Less than 1 min');

  // Update statistics whenever content changes
  useEffect(() => {
    const cleanText = extractCleanText(content);
    const newWordCount = calculateWordCount(cleanText);
    const newCharacterCount = calculateCharacterCount(cleanText);
    const newReadingTime = formatReadingTime(newWordCount);

    setWordCount(newWordCount);
    setCharacterCount(newCharacterCount);
    setReadingTime(newReadingTime);
  }, [content]);

  return {
    wordCount,
    characterCount,
    readingTime
  };
};
