import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { Save, FolderOpen, BookOpen, Bold, Italic, Underline, MessageSquarePlus, Eye, PenLine, Feather } from 'lucide-react';
import styles from './TopBar.module.scss';

export const TopBar: React.FC = () => {
  const { state, dispatch } = useStore();

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

  const toggleViewMode = () => {
    dispatch({ type: 'SET_VIEW_MODE', payload: state.viewMode === 'edit' ? 'preview' : 'edit' });
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
          <Button variant="ghost" size="sm" icon={Bold} title="Bold" onClick={() => handleFormat('bold')} />
          <Button variant="ghost" size="sm" icon={Italic} title="Italic" onClick={() => handleFormat('italic')} />
          <Button variant="ghost" size="sm" icon={Underline} title="Underline" onClick={() => handleFormat('underline')} />
          <Button variant="ghost" size="sm" icon={MessageSquarePlus} title="Add Comment" className={styles.commentBtn} onClick={() => handleFormat('comment')} />
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.saveStatus}>Saved locally</span>
        <Button 
          variant="secondary" 
          size="sm" 
          icon={state.viewMode === 'edit' ? Eye : PenLine} 
          label={state.viewMode === 'edit' ? 'Preview' : 'Edit'} 
          onClick={toggleViewMode}
        />
      </div>
    </header>
  );
};
