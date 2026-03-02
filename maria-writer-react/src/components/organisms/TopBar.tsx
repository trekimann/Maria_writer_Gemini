import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { ThemeToggle } from '../atoms/ThemeToggle';
import { Save, FolderOpen, BookOpen, Bold, Italic, Underline, MessageSquarePlus, Eye, PenLine, Feather, Code, Heading1, Heading2, Heading3, Palette, Cloud, MoreVertical } from 'lucide-react';
import { HelpButton } from '../atoms/HelpButton';
import { UserProfileModal } from './UserProfileModal';
import styles from './TopBar.module.scss';

export const TopBar: React.FC = () => {
  const { state, dispatch } = useStore();
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const headingMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(event.target as Node)) {
        setShowHeadingMenu(false);
      }
    };

    if (showHeadingMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeadingMenu]);

  const handleSave = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'save-settings' } });
  };

  const handleOpen = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'load-project' } });
  };

  const handleMetadata = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'metadata' } });
  };

  const handleThemeConfig = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'theme-config' } });
  };

  const setViewMode = (mode: 'write' | 'source' | 'preview') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const handleFormat = (format: string) => {
    window.dispatchEvent(new CustomEvent('maria-editor-format', { detail: { format } }));
  };

  return (
    <>
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <Feather className={styles.logoIcon} />
          <span>Maria Writer</span>
          <button
            className={styles.profileMenuBtn}
            onClick={() => setShowProfile(v => !v)}
            title="Account"
            aria-label="Open account menu"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        <div className={styles.divider}></div>
        
        <Button variant="ghost" size="sm" icon={Save} onClick={handleSave} title="Save" />
        <Button variant="ghost" size="sm" icon={FolderOpen} onClick={handleOpen} title="Open" />
        <Button variant="ghost" size="sm" icon={BookOpen} onClick={handleMetadata} title="Info" />
        
        <div className={styles.divider}></div>
        <ThemeToggle />
        
        <Button variant="ghost" size="sm" icon={Palette} onClick={handleThemeConfig} title="Theme Configuration" />
        <div className={styles.divider}></div>

        <div className={styles.formatting}>
          <div className={styles.headingDropdown} ref={headingMenuRef}>
            <Button 
              variant="ghost" 
              size="sm" 
              icon={Heading1} 
              title="Headings"
              onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            />
            {showHeadingMenu && (
              <div className={styles.dropdownMenu}>
                <button onClick={() => { handleFormat('paragraph'); setShowHeadingMenu(false); }}>
                  Paragraph
                </button>
                <button onClick={() => { handleFormat('heading1'); setShowHeadingMenu(false); }}>
                  <Heading1 size={16} /> Heading 1
                </button>
                <button onClick={() => { handleFormat('heading2'); setShowHeadingMenu(false); }}>
                  <Heading2 size={16} /> Heading 2
                </button>
                <button onClick={() => { handleFormat('heading3'); setShowHeadingMenu(false); }}>
                  <Heading3 size={16} /> Heading 3
                </button>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={Bold} title="Bold" onClick={() => handleFormat('bold')} />
          <Button variant="ghost" size="sm" icon={Italic} title="Italic" onClick={() => handleFormat('italic')} />
          <Button variant="ghost" size="sm" icon={Underline} title="Underline" onClick={() => handleFormat('underline')} />
          <Button variant="ghost" size="sm" icon={MessageSquarePlus} title="Add Comment" className={styles.commentBtn} onClick={() => handleFormat('comment')} />
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.saveStatus}>
          {state.cloudSync?.isSyncing
            ? <><Cloud size={12} style={{ marginRight: 4 }} /> Saving to cloud...</>
            : state.saveSettings?.saveToCloud && state.cloudSync?.lastSyncedAt
              ? <><Cloud size={12} style={{ marginRight: 4 }} /> Saved to cloud</>
              : 'Saved locally'}
        </span>
        <div className={styles.viewModes}>
          <Button 
            variant={state.viewMode === 'write' ? 'primary' : 'ghost'}
            size="sm" 
            icon={PenLine} 
            label="Write" 
            onClick={() => setViewMode('write')}
            title="Write Mode"
          />
          <Button 
            variant={state.viewMode === 'source' ? 'primary' : 'ghost'}
            size="sm" 
            icon={Code} 
            label="Source" 
            onClick={() => setViewMode('source')}
            title="Source Mode"
          />
          <Button 
            variant={state.viewMode === 'preview' ? 'primary' : 'ghost'}
            size="sm" 
            icon={Eye} 
            label="Preview" 
            onClick={() => setViewMode('preview')}
            title="Preview Mode"
          />
        </div>
        <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center' }}>
          <HelpButton helpId="manuscript-editor" />
        </div>
      </div>
    </header>

    {showProfile && (
      <UserProfileModal onClose={() => setShowProfile(false)} />
    )}
    </>
  );
};
