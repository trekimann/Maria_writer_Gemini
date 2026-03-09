function chunkText(text: string, targetLength: number): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) {
    const words = normalized.split(/\s+/);
    const chunks: string[] = [];
    let current = '';

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > targetLength && current) {
        chunks.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > targetLength && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function splitOversizedNode(node: Element, pageSize: number): string[] {
  const text = node.textContent?.trim() || '';
  if (!text) return [];

  if (node.tagName.toLowerCase() === 'p') {
    return chunkText(text, Math.max(350, Math.floor(pageSize * 0.7))).map((chunk) => `<p>${chunk}</p>`);
  }

  return [node.outerHTML];
}

export function paginateReaderHtml(html: string, pageSize: number): string[] {
  if (!html.trim()) {
    return ['<p></p>'];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;

  if (!root) {
    return [html];
  }

  const blocks = Array.from(root.children);
  const pageChunks: string[] = [];
  let currentPage: string[] = [];
  let currentCount = 0;

  const flush = () => {
    if (currentPage.length > 0) {
      pageChunks.push(currentPage.join(''));
      currentPage = [];
      currentCount = 0;
    }
  };

  for (const block of blocks) {
    const blockLength = (block.textContent || '').trim().length;
    const pieces = blockLength > pageSize ? splitOversizedNode(block, pageSize) : [block.outerHTML];

    for (const piece of pieces) {
      const pieceLength = piece.replace(/<[^>]+>/g, '').trim().length;
      if (currentCount > 0 && currentCount + pieceLength > pageSize) {
        flush();
      }

      currentPage.push(piece);
      currentCount += pieceLength;
    }
  }

  flush();

  return pageChunks.length > 0 ? pageChunks : [html];
}