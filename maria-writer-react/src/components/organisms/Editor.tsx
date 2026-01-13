import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Plus } from 'lucide-react';
import { Statistics } from '../atoms/Statistics';
import { CommentModal } from '../molecules/CommentModal';
import { CommentPane } from './CommentPane';
import { MentionSuggestions } from '../molecules/MentionSuggestions';
import { EditorContextMenu } from '../molecules/EditorContextMenu';
import { EditorModeSwitch } from '../molecules/EditorModeSwitch';
import { stripFormattingMarkup } from '../../utils/PreviewFormattingUtility';
import { extractMentionedCharacterIds } from '../../utils/mention';
import { htmlToMarkdown, markdownToHtml, extractTitleFromMarkdown } from '../../utils/editorMarkdown';
import { unwrapCommentElement } from '../../utils/editorComments';
import { useEditorContent } from '../../hooks/useEditorContent';
import { useEditorStatistics } from '../../hooks/useEditorStatistics';
import { useEditorMentions } from '../../hooks/useEditorMentions';
import { useEditorComments } from '../../hooks/useEditorComments';
import { useEditorEvents } from '../../hooks/useEditorEvents';
import { useEditorContextMenu } from '../../hooks/useEditorContextMenu';
import { useEditorFormatting } from '../../hooks/useEditorFormatting';
import styles from './Editor.module.scss';

export const Editor: React.FC = () => {
  const { state, dispatch } = useStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const activeChapter = state.chapters.find(c => c.id === state.activeChapterId);

  // Get comments for the active chapter
  const chapterComments = activeChapter?.commentIds
    ?.map(id => state.comments[id])
    .filter(Boolean) || [];

  // Initialize custom hooks
  const {
    content,
    setContent,
    syncStoreContent,
    getMarkdownHtml,
    lastStoreContent,
    turndownService
  } = useEditorContent({
    activeChapter,
    viewMode: state.viewMode,
    chapterComments,
    dispatch
  });

  const { wordCount, characterCount, readingTime } = useEditorStatistics(content);

  const {
    mentionQuery,
    mentionPosition,
    mentionStartIndex,
    mentionSelectedIndex,
    setMentionQuery,
    setMentionSelectedIndex,
    filteredCharacters,
    handleChange,
    handleContentEditableInput: hookHandleContentEditableInput,
    selectCharacter,
    handleEditorKeyDown
  } = useEditorMentions({
    viewMode: state.viewMode,
    textareaRef,
    contentEditableRef,
    content,
    characters: state.characters,
    setContent,
    dispatch,
    activeChapterId: activeChapter?.id
  });

  const {
    activeCommentId,
    showCommentModal,
    commentModalPosition,
    selectedText,
    isCommentPaneOpen,
    pendingCommentId,
    setActiveCommentId,
    setShowCommentModal,
    setCommentModalPosition,
    setIsCommentPaneOpen,
    setPendingCommentId,
    handleSaveComment,
    handleHideComment,
    handleDeleteComment,
    handlePreviewSuggestion,
    handleApplySuggestion,
    handleCommentClick,
    openCommentModal
  } = useEditorComments({
    activeChapterId: activeChapter?.id,
    viewMode: state.viewMode,
    textareaRef,
    contentEditableRef,
    chapterComments,
    content,
    setContent,
    dispatch,
    turndownService
  });

  const {
    pendingEventId,
    handleCreateEvent: hookHandleCreateEvent,
    handleEventModalClose
  } = useEditorEvents({
    activeChapterId: activeChapter?.id,
    activeChapterDate: activeChapter?.date,
    viewMode: state.viewMode,
    textareaRef,
    contentEditableRef,
    characters: state.characters,
    content,
    setContent,
    dispatch,
    turndownService,
    state
  });

  const {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    handleAutoTag,
    handleCopy,
    handlePaste
  } = useEditorContextMenu({
    viewMode: state.viewMode,
    textareaRef,
    contentEditableRef,
    getMarkdownHtml,
    syncStoreContent,
    characters: state.characters,
    turndownService,
    content
  });

  useEditorFormatting({
    viewMode: state.viewMode,
    textareaRef,
    contentEditableRef,
    activeChapterId: activeChapter?.id,
    onContentChange: (newContent: string) => {
      if (!activeChapter) return;
      setContent(newContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });
    },
    onWriteModeInput: () => {
      handleContentEditableInput();
    },
    onOpenCommentModal: openCommentModal,
    dispatch
  });

  // Debounced automation: Sync first line H1 and mentioned characters to chapter metadata
  useEffect(() => {
    if (!activeChapter) return;
    
    const timeoutId = setTimeout(() => {
      const updates: any = {};
      
      const h1Title = extractTitleFromMarkdown(content);
      if (h1Title && h1Title !== activeChapter.title) {
        updates.title = h1Title;
      }

      const currentMentionedIds = extractMentionedCharacterIds(content);
      const existingMentionedIds = activeChapter.mentionedCharacters || [];
      
      const sortedCurrent = [...currentMentionedIds].sort();
      const sortedExisting = [...existingMentionedIds].sort();
      
      if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedExisting)) {
        updates.mentionedCharacters = currentMentionedIds;
      }

      if (Object.keys(updates).length > 0) {
        dispatch({
          type: 'UPDATE_CHAPTER',
          payload: { id: activeChapter.id, updates }
        });
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [content, activeChapter?.id, activeChapter?.title, activeChapter?.mentionedCharacters, dispatch]);

  // Handle mode switches and initialization
  useEffect(() => {
    if (contentEditableRef.current && state.viewMode === 'write' && activeChapter) {
      const html = getMarkdownHtml(content);
      const currentHTML = contentEditableRef.current.innerHTML;
      
      if (currentHTML === '' || currentHTML === '<p><br></p>') {
        contentEditableRef.current.innerHTML = html;
      }
    }
  }, [state.viewMode, activeChapter?.id]);

  const handleContentEditableInput = () => {
    if (contentEditableRef.current && activeChapter) {
      const html = contentEditableRef.current.innerHTML;
      const newContent = htmlToMarkdown(html, turndownService);
      setContent(newContent);
      lastStoreContent.current = newContent;
      
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter.id, updates: { content: newContent } }
      });

      // Handle mentions
      hookHandleContentEditableInput(html);
    }
  };

  const handleCreateEvent = () => {
    let textToEvent = '';
    if (state.viewMode === 'write') {
      textToEvent = window.getSelection()?.toString() || '';
    } else if (state.viewMode === 'source' && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      textToEvent = textareaRef.current.value.substring(start, end);
    }

    if (!textToEvent.trim()) {
      alert('Please select some text to create an event');
      setContextMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    hookHandleCreateEvent(textToEvent);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    const commentSpan = target.closest('[data-comment-id]');
    if (commentSpan) {
      const commentId = commentSpan.getAttribute('data-comment-id');
      if (commentId) {
        handleCommentClick(commentId);
        return;
      }
    }
    
    setActiveCommentId(null);
  };

  const handleWriteModeClick = (e: React.MouseEvent) => {
    handlePreviewClick(e);
  };

  const handleCommentModalClose = () => {
    console.log('[Comment] Modal closed/cancelled');
    if (pendingCommentId && state.viewMode === 'write' && contentEditableRef.current) {
      unwrapCommentElement(contentEditableRef.current, pendingCommentId);
      console.log('[Comment] Removing pending element');
      const newHtml = contentEditableRef.current.innerHTML;
      const markdownContent = htmlToMarkdown(newHtml, turndownService);
      setContent(markdownContent);
      dispatch({
        type: 'UPDATE_CHAPTER',
        payload: { id: activeChapter?.id || '', updates: { content: markdownContent } }
      });
      setPendingCommentId(null);
    }
    setShowCommentModal(false);
  };

  const previewHtml = getMarkdownHtml(stripFormattingMarkup(content), true);

  if (!activeChapter) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateContent}>
          <p>Select a chapter or create a new one to start writing.</p>
          <button 
            className={styles.addChapterPrompt}
            onClick={() => dispatch({ type: 'ADD_CHAPTER' })}
          >
            <Plus size={20} />
            <span>Add New Chapter</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.editorMainColumn}>
        <div className={styles.editorContent}>
          <EditorModeSwitch
            viewMode={state.viewMode}
            content={content}
            textareaRef={textareaRef}
            contentEditableRef={contentEditableRef}
            onTextareaChange={handleChange}
            onContentEditableInput={handleContentEditableInput}
            onContextMenu={handleContextMenu}
            onKeyDown={handleEditorKeyDown}
            onWriteModeClick={handleWriteModeClick}
            onPreviewClick={handlePreviewClick}
            previewHtml={previewHtml}
          />
        </div>

        <Statistics
          wordCount={wordCount}
          characterCount={characterCount}
          readingTime={readingTime}
        />
      </div>

      <MentionSuggestions
        query={mentionQuery}
        position={mentionPosition}
        filteredCharacters={filteredCharacters}
        selectedIndex={mentionSelectedIndex}
        onSelectCharacter={selectCharacter}
      />

      <CommentPane
        comments={chapterComments}
        onHideComment={handleHideComment}
        onDeleteComment={handleDeleteComment}
        onCommentClick={setActiveCommentId}
        onPreviewSuggestion={handlePreviewSuggestion}
        onApplySuggestion={handleApplySuggestion}
        activeCommentId={activeCommentId}
        isOpen={isCommentPaneOpen}
      />

      <CommentModal
        isOpen={showCommentModal}
        onClose={handleCommentModalClose}
        onSave={handleSaveComment}
        position={commentModalPosition}
        selectedText={selectedText}
      />

      <EditorContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onCreateEvent={handleCreateEvent}
        onAutoTag={handleAutoTag}
      />
    </div>
  );
};
