import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  performCopy,
  getAutoTaggedHtml,
  getPasteData
} from '../utils/editorContextMenu';
import { htmlToMarkdown } from '../utils/editorMarkdown';

interface UseEditorContextMenuProps {
  viewMode: string;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentEditableRef: React.MutableRefObject<HTMLDivElement | null>;
  getMarkdownHtml: (markdownOverride?: string) => string;
  syncStoreContent: (newMarkdown: string) => void;
  characters: any[];
  turndownService: any;
  content: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

interface UseEditorContextMenuReturn {
  contextMenu: ContextMenuState;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState>>;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleAutoTag: () => void;
  handleCopy: () => Promise<void>;
  handlePaste: () => Promise<void>;
}

export const useEditorContextMenu = ({
  viewMode,
  textareaRef,
  contentEditableRef,
  getMarkdownHtml,
  syncStoreContent,
  characters,
  turndownService,
  content
}: UseEditorContextMenuProps): UseEditorContextMenuReturn => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    visible: false
  });

  // Click-away effect
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (viewMode === 'source' && !textareaRef.current) return;
    if (viewMode === 'write' && !contentEditableRef.current) return;

    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  const handleAutoTag = () => {
    const newHtml = getAutoTaggedHtml(
      viewMode,
      content,
      characters,
      contentEditableRef,
      getMarkdownHtml
    );

    if (newHtml) {
      const newMarkdown = htmlToMarkdown(newHtml, turndownService);
      syncStoreContent(newMarkdown);
      if (viewMode === 'write' && contentEditableRef.current) {
        contentEditableRef.current.innerHTML = newHtml;
      }
    }
    
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCopy = async () => {
    await performCopy(viewMode, textareaRef);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePaste = async () => {
    try {
      const result = await getPasteData(viewMode, textareaRef, contentEditableRef);
      
      if (result?.type === 'source') {
        syncStoreContent(result.value);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(result.cursor, result.cursor);
          }
        }, 0);
      } else if (result?.type === 'write') {
        // handleContentEditableInput will be called in component
      }
    } catch (err) {
      alert('Could not access clipboard. Please use Ctrl+V.');
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    handleAutoTag,
    handleCopy,
    handlePaste
  };
};
