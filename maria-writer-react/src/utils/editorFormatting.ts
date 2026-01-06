/**
 * Apply markdown formatting to textarea selection
 */
export function applyTextareaFormatting(
  textarea: HTMLTextAreaElement,
  format: string
): { newContent: string; success: boolean } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);

  let newText = text;

  if (format === 'bold') {
    newText = `${before}**${selected}**${after}`;
  } else if (format === 'italic') {
    newText = `${before}*${selected}*${after}`;
  } else if (format === 'underline') {
    newText = `${before}__${selected}__${after}`;
  } else if (format.startsWith('heading')) {
    const level = format.replace('heading', '');
    const hashes = '#'.repeat(parseInt(level));
    newText = `${before}${hashes} ${selected}${after}`;
  } else {
    return { newContent: text, success: false };
  }

  return { newContent: newText, success: newText !== text };
}

/**
 * Apply formatting in contenteditable using execCommand
 */
export function applyContentEditableFormatting(format: string): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  try {
    if (format === 'bold') {
      document.execCommand('bold', false);
      return true;
    } else if (format === 'italic') {
      document.execCommand('italic', false);
      return true;
    } else if (format === 'underline') {
      document.execCommand('underline', false);
      return true;
    } else if (format.startsWith('heading')) {
      const level = format.replace('heading', '');
      document.execCommand('formatBlock', false, `h${level}`);
      return true;
    } else if (format === 'paragraph') {
      document.execCommand('formatBlock', false, 'p');
      return true;
    }
  } catch (e) {
    console.error('[Formatting] Error applying format', e);
    return false;
  }

  return false;
}
