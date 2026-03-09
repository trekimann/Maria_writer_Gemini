import { useEffect, useMemo, useState, type RefObject } from 'react';
import { paginateReaderHtml } from '../../utils/readerPagination';

export type ReaderFontSize = 'small' | 'medium' | 'large';

type UseReaderPaginationOptions = {
  html: string;
  fontSize: ReaderFontSize;
  chapterContentRef: RefObject<HTMLDivElement>;
  pageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
};

type SizeSnapshot = {
  width: number;
  height: number;
  windowWidth: number;
  windowHeight: number;
};

const FONT_SIZE_MAP: Record<ReaderFontSize, string> = {
  small: '0.98rem',
  medium: '1.08rem',
  large: '1.18rem',
};

const FALLBACK_PAGE_SIZE: Record<ReaderFontSize, number> = {
  small: 1550,
  medium: 1300,
  large: 1050,
};

const PAGE_HORIZONTAL_PADDING = 32;
const PAGE_VERTICAL_PADDING = 32;
const LANDSCAPE_GAP = 16;
const MIN_LAYOUT_SIZE = 160;
const MEASURE_TOLERANCE = 1;

const normalizePageIndex = (pageIndex: number, isLandscape: boolean, maxPageIndex: number) => {
  const clampedIndex = Math.min(Math.max(0, pageIndex), maxPageIndex);

  if (!isLandscape) {
    return clampedIndex;
  }

  return Math.max(0, Math.min(maxPageIndex, clampedIndex - (clampedIndex % 2)));
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const serializeAttributes = (element: Element) => Array.from(element.attributes)
  .map((attribute) => ` ${attribute.name}="${escapeHtml(attribute.value)}"`)
  .join('');

const getTextTokens = (text: string): string[] => {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 1) {
    return sentences;
  }

  return normalized.split(' ').filter(Boolean);
};

const wrapNodeHtml = (node: ChildNode, textContent?: string): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return `<p>${escapeHtml(textContent ?? node.textContent ?? '')}</p>`;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const attributes = serializeAttributes(element);
  const content = textContent == null ? element.innerHTML : escapeHtml(textContent);
  return `<${tagName}${attributes}>${content}</${tagName}>`;
};

const paginateReaderHtmlByHeight = (
  html: string,
  pageWidth: number,
  pageHeight: number,
  fontSize: ReaderFontSize,
): string[] => {
  if (!html.trim()) {
    return ['<p></p>'];
  }

  if (typeof document === 'undefined' || pageWidth < MIN_LAYOUT_SIZE || pageHeight < MIN_LAYOUT_SIZE) {
    return paginateReaderHtml(html, FALLBACK_PAGE_SIZE[fontSize]);
  }

  const contentWidth = Math.max(MIN_LAYOUT_SIZE, Math.floor(pageWidth - PAGE_HORIZONTAL_PADDING));
  const contentHeight = Math.max(MIN_LAYOUT_SIZE, Math.floor(pageHeight - PAGE_VERTICAL_PADDING));

  const measureHost = document.createElement('div');
  const measureInner = document.createElement('div');

  measureHost.style.position = 'fixed';
  measureHost.style.left = '-99999px';
  measureHost.style.top = '0';
  measureHost.style.visibility = 'hidden';
  measureHost.style.pointerEvents = 'none';
  measureHost.style.width = `${contentWidth}px`;
  measureHost.style.maxWidth = `${contentWidth}px`;
  measureHost.style.contain = 'layout style paint';

  measureInner.style.width = `${contentWidth}px`;
  measureInner.style.maxWidth = `${contentWidth}px`;
  measureInner.style.boxSizing = 'border-box';
  measureInner.style.fontFamily = 'var(--font-serif)';
  measureInner.style.fontSize = FONT_SIZE_MAP[fontSize];
  measureInner.style.lineHeight = '1.9';
  measureInner.style.color = 'var(--color-text, #111827)';
  measureInner.style.wordBreak = 'break-word';

  measureHost.appendChild(measureInner);
  document.body.appendChild(measureHost);

  try {
    measureInner.innerHTML = '<p>reader pagination probe</p>';
    if (measureInner.scrollHeight <= 0) {
      return paginateReaderHtml(html, FALLBACK_PAGE_SIZE[fontSize]);
    }

    const fits = (candidateHtml: string) => {
      measureInner.innerHTML = candidateHtml;
      return measureInner.scrollHeight <= contentHeight + MEASURE_TOLERANCE;
    };

    const splitNode = (node: ChildNode): string[] => {
      const fullHtml = wrapNodeHtml(node);
      if (fits(fullHtml)) {
        return [fullHtml];
      }

      const textContent = node.textContent?.trim() ?? '';
      if (!textContent) {
        return [fullHtml];
      }

      const tokens = getTextTokens(textContent);
      if (tokens.length <= 1) {
        return [fullHtml];
      }

      const pieces: string[] = [];
      let startIndex = 0;

      while (startIndex < tokens.length) {
        let low = 1;
        let high = tokens.length - startIndex;
        let bestCount = 0;

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const nextText = tokens.slice(startIndex, startIndex + mid).join(' ');
          if (fits(wrapNodeHtml(node, nextText))) {
            bestCount = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        if (bestCount <= 0) {
          bestCount = 1;
        }

        pieces.push(wrapNodeHtml(node, tokens.slice(startIndex, startIndex + bestCount).join(' ')));
        startIndex += bestCount;
      }

      return pieces;
    };

    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = parsed.body.firstElementChild;

    if (!root) {
      return [html];
    }

    const pages: string[] = [];
    let currentPageParts: string[] = [];

    const flush = () => {
      if (currentPageParts.length > 0) {
        pages.push(currentPageParts.join(''));
        currentPageParts = [];
      }
    };

    const appendPiece = (piece: string) => {
      const nextCandidate = [...currentPageParts, piece].join('');
      if (currentPageParts.length === 0 || fits(nextCandidate)) {
        currentPageParts.push(piece);
        return;
      }

      flush();
      currentPageParts.push(piece);
    };

    const blocks = Array.from(root.childNodes).filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return Boolean(node.textContent?.trim());
      }

      return true;
    });

    for (const block of blocks) {
      const pieces = splitNode(block);
      pieces.forEach(appendPiece);
    }

    flush();

    return pages.length > 0 ? pages : [html];
  } finally {
    document.body.removeChild(measureHost);
  }
};

export const getReaderFontSizeValue = (fontSize: ReaderFontSize) => FONT_SIZE_MAP[fontSize];

export const useReaderPagination = ({
  html,
  fontSize,
  chapterContentRef,
  pageIndex,
  onPageIndexChange,
}: UseReaderPaginationOptions) => {
  const [sizeSnapshot, setSizeSnapshot] = useState<SizeSnapshot>({
    width: 0,
    height: 0,
    windowWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
    windowHeight: typeof window === 'undefined' ? 0 : window.innerHeight,
  });
  const [pages, setPages] = useState<string[]>(html.trim() ? [html] : ['<p></p>']);
  const [hasResolvedPagination, setHasResolvedPagination] = useState(false);

  useEffect(() => {
    const updateSnapshot = () => {
      const element = chapterContentRef.current;
      setSizeSnapshot({
        width: element?.clientWidth ?? 0,
        height: element?.clientHeight ?? 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
    };

    updateSnapshot();

    const element = chapterContentRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined' && element
      ? new ResizeObserver(() => updateSnapshot())
      : null;

    if (resizeObserver && element) {
      resizeObserver.observe(element);
    }

    window.addEventListener('resize', updateSnapshot);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateSnapshot);
    };
  }, [chapterContentRef, html]);

  const isLandscape = useMemo(
    () => sizeSnapshot.width >= 900
      && sizeSnapshot.windowWidth >= 1100
      && sizeSnapshot.windowWidth > sizeSnapshot.windowHeight,
    [sizeSnapshot.height, sizeSnapshot.width, sizeSnapshot.windowHeight, sizeSnapshot.windowWidth],
  );

  useEffect(() => {
    setHasResolvedPagination(false);
  }, [fontSize, html, isLandscape]);

  useEffect(() => {
    const pageCount = isLandscape ? 2 : 1;
    const gapWidth = isLandscape ? LANDSCAPE_GAP : 0;
    const pageWidth = sizeSnapshot.width > 0
      ? Math.floor((sizeSnapshot.width - gapWidth) / pageCount)
      : 0;
    const pageHeight = sizeSnapshot.height;

    setPages(paginateReaderHtmlByHeight(html, pageWidth, pageHeight, fontSize));
    setHasResolvedPagination(true);
  }, [fontSize, html, isLandscape, sizeSnapshot.height, sizeSnapshot.width]);

  const pageStep = isLandscape ? 2 : 1;
  const maxPageIndex = Math.max(0, pages.length - pageStep);

  useEffect(() => {
    if (!hasResolvedPagination) {
      return;
    }

    const normalizedPageIndex = normalizePageIndex(pageIndex, isLandscape, maxPageIndex);

    if (pageIndex !== normalizedPageIndex) {
      onPageIndexChange(normalizedPageIndex);
    }
  }, [hasResolvedPagination, isLandscape, maxPageIndex, onPageIndexChange, pageIndex]);

  const displayPageIndex = normalizePageIndex(pageIndex, isLandscape, maxPageIndex);
  const visiblePages = pages.slice(displayPageIndex, displayPageIndex + pageStep);

  return {
    currentPageIndex: displayPageIndex,
    isLandscape,
    maxPageIndex,
    pageStep,
    totalPages: pages.length,
    visiblePages,
  };
};
