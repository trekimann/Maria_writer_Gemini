import { describe, expect, it } from 'vitest';
import { paginateReaderHtml } from './readerPagination';

describe('paginateReaderHtml', () => {
  it('returns a single page for short content', () => {
    const pages = paginateReaderHtml('<h1>Chapter</h1><p>Short text.</p>', 500);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain('Short text.');
  });

  it('splits long content into multiple pages', () => {
    const longParagraph = '<p>' + 'Sentence one. '.repeat(120) + '</p>';
    const pages = paginateReaderHtml(`<h1>Title</h1>${longParagraph}`, 700);
    expect(pages.length).toBeGreaterThan(1);
  });

  it('preserves paragraph wrappers when splitting oversized paragraphs', () => {
    const longParagraph = '<p>' + 'A very long paragraph. '.repeat(80) + '</p>';
    const pages = paginateReaderHtml(longParagraph, 400);
    expect(pages[0]).toContain('<p>');
    expect(pages[0]).toContain('</p>');
  });
});