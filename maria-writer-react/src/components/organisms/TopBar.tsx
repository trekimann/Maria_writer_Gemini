import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { Save, FolderOpen, BookOpen, Bold, Italic, Underline, MessageSquarePlus, Eye, PenLine, Feather, Code, Heading1, Heading2, Heading3 } from 'lucide-react';
import styles from './TopBar.module.scss';

export const TopBar: React.FC = () => {
  const { state, dispatch } = useStore();
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
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
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'save' } });
  };

  const handleOpen = () => {
    document.getElementById('file-input')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        dispatch({ type: 'LOAD_STATE', payload: json });
      } catch (err) {
        alert('Failed to load file: Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMetadata = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'metadata' } });
  };

  const setViewMode = (mode: 'write' | 'source' | 'preview') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  const handleFormat = (format: string) => {
    window.dispatchEvent(new CustomEvent('maria-editor-format', { detail: { format } }));
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <Feather className={styles.logoIcon} />
          <span>Maria Writer</span>
        </div>
        <div className={styles.divider}></div>
        
        <Button variant="ghost" size="sm" icon={Save} onClick={handleSave} title="Save" />
        <Button variant="ghost" size="sm" icon={FolderOpen} onClick={handleOpen} title="Open" />
        <Button variant="ghost" size="sm" icon={BookOpen} onClick={handleMetadata} title="Info" />
        <input 
          type="file" 
          id="file-input" 
          className={styles.hiddenInput} 
          accept=".maria,.json" 
          onChange={handleFileChange}
        />

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
        <span className={styles.saveStatus}>Saved locally</span>
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
      </div>
    </header>
  );
};
