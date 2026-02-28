import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { TagInput } from '../molecules/TagInput';
import { DateTimeInput } from '../molecules/DateTimeInput';
import { Button } from '../atoms/Button';
import { Check } from 'lucide-react';
import styles from './MetadataModal.module.scss';
import { APP_VERSION } from '../../constants/version';

export const MetadataModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [bookVersion, setBookVersion] = useState('1.0.0');
  const [bookRevision, setBookRevision] = useState('0');

  const isOpen = state.activeModal === 'metadata';

  useEffect(() => {
    if (isOpen) {
      setTitle(state.meta.title);
      setAuthor(state.meta.author);
      setDescription(state.meta.description);
      setTags(state.meta.tags);
      setCurrentDate(state.meta.currentDate || '');
      setBookVersion(state.meta.bookVersion || '1.0.0');
      setBookRevision(state.meta.bookRevision || '0');
    }
  }, [isOpen, state.meta]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSave = () => {
    dispatch({
      type: 'SET_META',
      payload: {
        title,
        author,
        description,
        tags,
        currentDate: currentDate || undefined,
        bookVersion,
        bookRevision,
        appVersion: APP_VERSION,
      }
    });
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Book Metadata"
      headerColor="emerald"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Check} onClick={handleSave} className={styles.saveBtn}>Save Metadata</Button>
        </>
      }
    >
      <div className={styles.field}>
        <label>Book Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label>Author</label>
        <input 
          type="text" 
          value={author} 
          onChange={(e) => setAuthor(e.target.value)} 
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label>
          Description 
          <span className={`${styles.count} ${description.length > 500 ? styles.error : ''}`}>
            ({description.length}/500)
          </span>
        </label>
        <textarea 
          rows={3} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          maxLength={500}
          className={styles.textarea}
        />
      </div>
      <div className={styles.field}>
        <label>Tags</label>
        <TagInput tags={tags} onChange={setTags} color="emerald" />
      </div>
      <div className={styles.field}>
        <label>Book Version</label>
        <input
          type="text"
          value={bookVersion}
          onChange={(e) => setBookVersion(e.target.value)}
          className={styles.input}
          placeholder="e.g. 1.0.0"
        />
      </div>
      <div className={styles.field}>
        <label>Book Revision</label>
        <input
          type="text"
          value={bookRevision}
          onChange={(e) => setBookRevision(e.target.value)}
          className={styles.input}
          placeholder="e.g. 0"
        />
      </div>
      <div className={styles.field}>
        <label>App Version (used for compatibility)</label>
        <input
          type="text"
          value={APP_VERSION}
          className={styles.input}
          readOnly
        />
      </div>
      <div className={styles.field}>
        <label>Current Story Date (optional)</label>
        <DateTimeInput 
          value={currentDate} 
          onChange={setCurrentDate} 
          className={styles.input} 
          placeholder="dd/MM/yyyy HH:mm:ss"
        />
        <span className={styles.hint}>
          Set the "current" date in your story world. Used for calculating character ages.
        </span>
      </div>
    </Modal>
  );
};
