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
  const chapterListRef = useRef<HTMLUListElement>(null);
  const loreListRef = useRef<HTMLUListElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showManuscriptMenu, setShowManuscriptMenu] = useState(false);
  const manuscriptMenuRef = useRef<HTMLDivElement>(null);

  const chapters = state.chapters.filter(c => (c.chapterType ?? 'chapter') === 'chapter');
  const loreEntries = state.chapters.filter(c => (c.chapterType ?? 'chapter') === 'lore');

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

  // Sortable for chapters
  useEffect(() => {
    if (!chapterListRef.current) return;
    const sortable = Sortable.create(chapterListRef.current, {
      animation: 150,
      ghostClass: styles.sortableGhost,
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          const reordered = [...chapters];
          const [moved] = reordered.splice(evt.oldIndex, 1);
          reordered.splice(evt.newIndex, 0, moved);
          const updated = reordered.map((c, i) => ({ ...c, order: i }));
          const all = [...updated, ...loreEntries];
          dispatch({ type: 'REORDER_CHAPTERS', payload: all });
        }
      }
    });
    return () => sortable.destroy();
  }, [chapters, loreEntries, dispatch]);

  // Sortable for lore entries
  useEffect(() => {
    if (!loreListRef.current) return;
    const sortable = Sortable.create(loreListRef.current, {
      animation: 150,
      ghostClass: styles.sortableGhost,
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          const reordered = [...loreEntries];
          const [moved] = reordered.splice(evt.oldIndex, 1);
          reordered.splice(evt.newIndex, 0, moved);
          const updated = reordered.map((c, i) => ({ ...c, order: i }));
          const all = [...chapters, ...updated];
          dispatch({ type: 'REORDER_CHAPTERS', payload: all });
        }
      }
    });
    return () => sortable.destroy();
  }, [chapters, loreEntries, dispatch]);

  const handleAddChapter = () => {
    dispatch({ type: 'ADD_CHAPTER' });
  };

  const handleAddLoreEntry = () => {
    dispatch({ type: 'ADD_LORE_ENTRY' });
  };

  const handleDeleteChapter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = state.chapters.find(c => c.id === id);
    const label = (item?.chapterType ?? 'chapter') === 'lore' ? 'lore entry' : 'chapter';
    if (confirm(`Delete this ${label}?`)) {
      dispatch({ type: 'DELETE_CHAPTER', payload: id });
    }
  };

  const handleChapterSettings = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'chapter-metadata', itemId: id } });
  };

  const handleItemClick = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: id });
    dispatch({ type: 'SET_CONTEXT_MODE', payload: 'writer' });
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
          {/* Chapters section */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>Chapters</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <HelpButton helpId="chapters_sidebar" size={16} />
              <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddChapter} />
            </div>
          </div>

          <div className={styles.listContainer}>
            <ul className={styles.list} ref={chapterListRef}>
              {chapters.map(chapter => (
                <ChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  isActive={chapter.id === state.activeChapterId}
                  onClick={() => handleItemClick(chapter.id)}
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

          {/* Lore section */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>Lore</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <HelpButton helpId="lore-sidebar" size={16} />
              <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddLoreEntry} />
            </div>
          </div>

          <div className={styles.listContainer}>
            <ul className={styles.list} ref={loreListRef}>
              {loreEntries.map(entry => (
                <ChapterItem
                  key={entry.id}
                  chapter={entry}
                  isActive={entry.id === state.activeChapterId}
                  onClick={() => handleItemClick(entry.id)}
                  onDelete={(e) => handleDeleteChapter(entry.id, e)}
                  onSettings={(e) => handleChapterSettings(entry.id, e)}
                />
              ))}
            </ul>
            <button className={styles.addChapterBtn} onClick={handleAddLoreEntry}>
              <Plus size={16} />
              <span>New Lore Entry</span>
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
