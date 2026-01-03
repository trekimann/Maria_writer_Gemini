import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { TagInput } from '../molecules/TagInput';
import { Button } from '../atoms/Button';
import { Download } from 'lucide-react';
import { exportFile } from '../../utils/storage';
import styles from './SaveModal.module.scss';

export const SaveModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [fileName, setFileName] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const isOpen = state.activeModal === 'save';

  useEffect(() => {
    if (isOpen) {
      setFileName(state.meta.title);
      setAuthor(state.meta.author);
      setDescription(state.meta.description);
      setTags(state.meta.tags);
    }
  }, [isOpen, state.meta]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleConfirm = () => {
    // Update meta first
    const newMeta = { title: fileName, author, description, tags };
    dispatch({
      type: 'SET_META',
      payload: newMeta
    });
    
    // Then export (using the updated state conceptually, but we pass the merged object)
    const stateToExport = { ...state, meta: { ...state.meta, ...newMeta } };
    exportFile(stateToExport);
    
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Save Project"
      headerColor="indigo"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Download} onClick={handleConfirm}>Export .Maria</Button>
        </>
      }
    >
      <div className={styles.field}>
        <label>File Name</label>
        <input 
          type="text" 
          value={fileName} 
          onChange={(e) => setFileName(e.target.value)} 
          className={styles.input}
          placeholder="My Novel"
        />
      </div>
      <div className={styles.field}>
        <label>Author</label>
        <input 
          type="text" 
          value={author} 
          onChange={(e) => setAuthor(e.target.value)} 
          className={styles.input}
          placeholder="Your name"
        />
      </div>
      <div className={styles.field}>
        <label>
          Short Description 
          <span className={`${styles.count} ${description.length > 500 ? styles.error : ''}`}>
            ({description.length}/500)
          </span>
        </label>
        <textarea 
          rows={2} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          maxLength={500}
          className={styles.textarea}
          placeholder="A brief summary of your novel..."
        />
      </div>
      <div className={styles.field}>
        <label>Tags</label>
        <TagInput tags={tags} onChange={setTags} color="indigo" />
      </div>
    </Modal>
  );
};
