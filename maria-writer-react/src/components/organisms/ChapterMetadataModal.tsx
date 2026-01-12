import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { DateTimeInput } from '../molecules/DateTimeInput';
import { Button } from '../atoms/Button';
import { Check, X } from 'lucide-react';
import styles from './ChapterMetadataModal.module.scss';
import { normalizeDDMMYYYYHHMMSS } from '../../utils/date';

export const ChapterMetadataModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

  const isOpen = state.activeModal === 'chapter-metadata';
  const activeChapter = state.chapters.find(c => c.id === state.editingItemId);

  useEffect(() => {
    if (isOpen && activeChapter) {
      setTitle(activeChapter.title);
      setDate(activeChapter.date || '');
      setSelectedEvents(activeChapter.relatedEvents || []);
      setSelectedChars(activeChapter.mentionedCharacters || []);
    }
  }, [isOpen, activeChapter]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSave = () => {
    if (!activeChapter) return;

    const normalizedDate = date.trim() ? normalizeDDMMYYYYHHMMSS(date) : '';
    if (date.trim() && !normalizedDate) return alert('Date must be in dd/MM/yyyy HH:mm:ss format');

    const updates: any = {
      title,
      date: normalizedDate || '',
      relatedEvents: selectedEvents,
      mentionedCharacters: selectedChars
    };

    // Automation: if title is set in modal, sync to content (first line H1)
    let newContent = activeChapter.content;
    const lines = newContent.split('\n');
    const firstLine = lines[0].trim();

    if (title.trim()) {
      const h1Title = `# ${title}`;
      if (firstLine.startsWith('# ')) {
        lines[0] = h1Title;
      } else {
        lines.unshift(h1Title, '');
      }
      updates.content = lines.join('\n');
    }

    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { id: activeChapter.id, updates }
    });
    handleClose();
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const toggleCharacter = (charId: string) => {
    setSelectedChars(prev => 
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Chapter Metadata"
      headerColor="indigo"
      helpId="chapter-metadata"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Check} onClick={handleSave} className={styles.saveBtn}>Save Changes</Button>
        </>
      }
    >
      <div className={styles.field}>
        <label>Chapter Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className={styles.input}
          placeholder="Enter chapter title..."
        />
        <span className={styles.hint}>Updating the title will also update the H1 heading in the chapter content.</span>
      </div>

      <div className={styles.field}>
        <label>Setting Date</label>
        <DateTimeInput 
          value={date} 
          onChange={setDate} 
          className={styles.input} 
          placeholder="dd/MM/yyyy HH:mm:ss"
        />
      </div>

      <div className={styles.field}>
        <label>Related Events</label>
        <div className={styles.multiSelect}>
          {selectedEvents.map(id => {
            const evt = state.events.find(e => e.id === id);
            return (
              <span key={id} className={styles.selectItem}>
                {evt?.title || 'Unknown Event'}
                <button className={styles.removeBtn} onClick={() => toggleEvent(id)}><X size={12} /></button>
              </span>
            );
          })}
        </div>
        <div className={styles.options}>
          {state.events.filter(e => !selectedEvents.includes(e.id)).map(e => (
            <div key={e.id} className={styles.option} onClick={() => toggleEvent(e.id)}>
              {e.title}
            </div>
          ))}
          {state.events.length === 0 && <div className={styles.option}>No events found</div>}
        </div>
      </div>

      <div className={styles.field}>
        <label>Mentioned Characters</label>
        <div className={styles.multiSelect}>
          {selectedChars.map(id => {
            const char = state.characters.find(c => c.id === id);
            return (
              <span key={id} className={styles.selectItem}>
                {char?.name || 'Unknown Character'}
                <button className={styles.removeBtn} onClick={() => toggleCharacter(id)}><X size={12} /></button>
              </span>
            );
          })}
        </div>
        <div className={styles.options}>
          {state.characters.filter(c => !selectedChars.includes(c.id)).map(c => (
            <div key={c.id} className={styles.option} onClick={() => toggleCharacter(c.id)}>
              {c.name}
            </div>
          ))}
          {state.characters.length === 0 && <div className={styles.option}>No characters found</div>}
        </div>
      </div>
    </Modal>
  );
};
