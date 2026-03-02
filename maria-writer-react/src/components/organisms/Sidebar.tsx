import React, { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import { useStore } from '../../context/StoreContext';
import { ChapterItem } from '../molecules/ChapterItem';
import { Button } from '../atoms/Button';
import { HelpButton } from '../atoms/HelpButton';
import { Plus, PenTool, Book, ChevronLeft, ChevronRight, MoreVertical, BookPlus } from 'lucide-react';
import styles from './Sidebar.module.scss';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useStore();
  const listRef = useRef<HTMLUListElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showManuscriptMenu, setShowManuscriptMenu] = useState(false);
  const manuscriptMenuRef = useRef<HTMLDivElement>(null);

  // Close the manuscript dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (manuscriptMenuRef.current && !manuscriptMenuRef.current.contains(e.target as Node)) {
        setShowManuscriptMenu(false);
      }
    };
    if (showManuscriptMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showManuscriptMenu]);

  useEffect(() => {
    if (!listRef.current) return;

    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      ghostClass: styles.sortableGhost,
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          const newChapters = [...state.chapters];
          const [moved] = newChapters.splice(evt.oldIndex, 1);
          newChapters.splice(evt.newIndex, 0, moved);
          
          // Update order property
          const updatedChapters = newChapters.map((c, i) => ({ ...c, order: i }));
          dispatch({ type: 'REORDER_CHAPTERS', payload: updatedChapters });
        }
      }
    });

    return () => sortable.destroy();
  }, [state.chapters, dispatch]);

  const handleAddChapter = () => {
    dispatch({ type: 'ADD_CHAPTER' });
  };

  const handleDeleteChapter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this chapter?')) {
      dispatch({ type: 'DELETE_CHAPTER', payload: id });
    }
  };

  const handleChapterSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'chapter-metadata', itemId: id } });
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <button 
        className={styles.collapseBtn} 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      {!isCollapsed && (
        <>
          <div className={styles.header}>
            <span className={styles.headerTitle}>Chapters</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <HelpButton helpId="chapters_sidebar" size={16} />
              <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddChapter} />
            </div>
      </div>

      <div className={styles.listContainer}>
        <ul className={styles.list} ref={listRef}>
          {state.chapters.map(chapter => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isActive={chapter.id === state.activeChapterId}
              onClick={() => dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: chapter.id })}
              onDelete={(e) => handleDeleteChapter(chapter.id, e)}
              onSettings={(e) => handleChapterSettings(chapter.id, e)}
            />
          ))}
        </ul>
        <button className={styles.addChapterBtn} onClick={handleAddChapter}>
          <Plus size={16} />
          <span>New Chapter</span>
        </button>
      </div>

      <div className={styles.nav}>
        {/* Manuscript nav item with ⋮ menu */}
        <div className={styles.navItemWrapper} ref={manuscriptMenuRef}>
          <div
            className={`${styles.navItem} ${state.context === 'writer' ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'SET_CONTEXT_MODE', payload: 'writer' })}
          >
            <PenTool size={16} />
            <span>Manuscript</span>
            <button
              className={styles.navItemMenu}
              title="Manuscript options"
              aria-label="Manuscript options"
              onClick={e => { e.stopPropagation(); setShowManuscriptMenu(v => !v); }}
              data-testid="manuscript-menu-btn"
            >
              <MoreVertical size={14} />
            </button>
          </div>
          {showManuscriptMenu && (
            <div className={styles.navDropdown} data-testid="manuscript-dropdown">
              <button
                className={styles.navDropdownItem}
                onClick={() => {
                  setShowManuscriptMenu(false);
                  dispatch({ type: 'OPEN_MODAL', payload: { type: 'new-book' } });
                }}
                data-testid="new-book-menu-item"
              >
                <BookPlus size={14} />
                <span>New Book</span>
              </button>
            </div>
          )}
        </div>

        <div
          className={`${styles.navItem} ${state.context === 'codex' ? styles.active : ''}`}
          onClick={() => dispatch({ type: 'SET_CONTEXT_MODE', payload: 'codex' })}
        >
          <Book size={16} />
          <span>Codex</span>
        </div>
      </div>
        </>
      )}
    </aside>
  );
};
