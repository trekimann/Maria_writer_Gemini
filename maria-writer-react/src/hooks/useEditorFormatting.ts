import { useEffect } from 'react';
import {
  applyTextareaFormatting,
  applyContentEditableFormatting
} from '../utils/editorFormatting';

interface UseEditorFormattingProps {
  viewMode: string;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentEditableRef: React.MutableRefObject<HTMLDivElement | null>;
  activeChapterId: string | undefined;
  onContentChange: (newContent: string) => void;
  onWriteModeInput: () => void;
  onOpenCommentModal: (selectedText: string, x: number, y: number) => boolean;
  dispatch: any;
}

export const useEditorFormatting = ({
  viewMode,
  textareaRef,
  contentEditableRef,
  activeChapterId,
  onContentChange,
  onWriteModeInput,
  onOpenCommentModal,
  dispatch
}: UseEditorFormattingProps) => {
  useEffect(() => {
    const handleFormat = (e: CustomEvent) => {
      if (!activeChapterId) return;
      
      const { format } = e.detail;

      // Handle comment format - open modal
      if (format === 'comment') {
        let selection: Selection | null = null;
        let selText = '';
        
        if (viewMode === 'source' && textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          if (start === end) {
            alert("Select text to comment on.");
            return;
          }
          selText = textareaRef.current.value.substring(start, end);
          
          const mouseX = (e as any).clientX || window.innerWidth / 2;
          const mouseY = (e as any).clientY || window.innerHeight / 2;
          onOpenCommentModal(selText, mouseX, mouseY);
        } else if (viewMode === 'write' && contentEditableRef.current) {
          selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            alert("Select text to comment on.");
            return;
          }
          selText = selection.toString();
          
          const mouseX = (e as any).clientX || window.innerWidth / 2;
          const mouseY = (e as any).clientY || window.innerHeight / 2;
          onOpenCommentModal(selText, mouseX, mouseY);
        } else {
          selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            alert("Select text to comment on.");
            return;
          }
          selText = selection.toString();
          
          const mouseX = (e as any).clientX || window.innerWidth / 2;
          const mouseY = (e as any).clientY || window.innerHeight / 2;
          onOpenCommentModal(selText, mouseX, mouseY);
        }
        return;
      }

      // Handle formatting for source mode (textarea)
      if (viewMode === 'source' && textareaRef.current) {
        const result = applyTextareaFormatting(textareaRef.current, format);

        if (result.success) {
          onContentChange(result.newContent);
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 0);
        }
      }

      // Handle formatting for write mode (contenteditable)
      if (viewMode === 'write' && contentEditableRef.current) {
        if (applyContentEditableFormatting(format)) {
          onWriteModeInput();
        }
      }
    };

    window.addEventListener('maria-editor-format', handleFormat as EventListener);
    return () => window.removeEventListener('maria-editor-format', handleFormat as EventListener);
  }, [viewMode, activeChapterId, onContentChange, onWriteModeInput, onOpenCommentModal, dispatch]);
};
