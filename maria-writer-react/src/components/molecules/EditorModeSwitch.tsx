import React from 'react';
import styles from '../organisms/Editor.module.scss';

interface EditorModeSwitchProps {
  viewMode: string;
  content: string;
  textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  contentEditableRef: React.MutableRefObject<HTMLDivElement | null>;
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onContentEditableInput: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onWriteModeClick: (e: React.MouseEvent) => void;
  onPreviewClick: (e: React.MouseEvent) => void;
  previewHtml: string;
}

export const EditorModeSwitch: React.FC<EditorModeSwitchProps> = ({
  viewMode,
  content,
  textareaRef,
  contentEditableRef,
  onTextareaChange,
  onContentEditableInput,
  onContextMenu,
  onKeyDown,
  onWriteModeClick,
  onPreviewClick,
  previewHtml
}) => {
  if (viewMode === 'source') {
    return (
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={content}
        onChange={onTextareaChange}
        onKeyDown={onKeyDown}
        onContextMenu={onContextMenu}
        placeholder="Start writing your masterpiece..."
        spellCheck={false}
      />
    );
  }

  if (viewMode === 'write') {
    return (
      <div 
        ref={contentEditableRef}
        className={`${styles.preview} ${styles.editable}`}
        contentEditable={true}
        onInput={onContentEditableInput}
        onKeyDown={onKeyDown}
        onClick={onWriteModeClick}
        onContextMenu={onContextMenu}
        suppressContentEditableWarning={true}
      />
    );
  }

  // Preview mode
  return (
    <div 
      className={styles.preview}
      onClick={onPreviewClick}
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );
};
