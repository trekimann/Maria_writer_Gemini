import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { DateTimeInput } from '../molecules/DateTimeInput';
import { v4 as uuidv4 } from 'uuid';
import { Upload, X } from 'lucide-react';
import { normalizeDDMMYYYYHHMMSS } from '../../utils/date';
import styles from './EventModal.module.scss';

export const EventModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

  const isOpen = state.activeModal === 'event';
  const isEditing = !!state.editingItemId;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        const evt = state.events.find(e => e.id === state.editingItemId);
        if (evt) {
          setTitle(evt.title);
          setDate(evt.date || '');
          setDescription(evt.description || '');
          setImage(evt.image || '');
          setSelectedChars(evt.characters || []);
        }
      } else if (state.prefilledEventData) {
        setTitle(state.prefilledEventData.title || '');
        setDate(state.prefilledEventData.date || '');
        setDescription(state.prefilledEventData.description || '');
        setImage(state.prefilledEventData.image || '');
        setSelectedChars(state.prefilledEventData.characters || []);
      } else {
        setTitle('');
        setDate('');
        setDescription('');
        setImage('');
        setSelectedChars([]);
      }
    }
  }, [isOpen, isEditing, state.editingItemId, state.events, state.prefilledEventData]);

  const handleClose = () => {
    dispatch({ type: 'SET_PREFILLED_EVENT_DATA', payload: undefined });
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSave = () => {
    if (!title.trim()) return alert('Title is required');

    const normalizedDate = date.trim() ? normalizeDDMMYYYYHHMMSS(date) : '';
    if (date.trim() && !normalizedDate) return alert('Event date must be in dd/MM/yyyy HH:mm:ss format');

    const eventData = {
      id: isEditing ? state.editingItemId! : (state.prefilledEventData?.id || uuidv4()),
      title,
      date: normalizedDate || '',
      description,
      image,
      characters: selectedChars
    };

    if (isEditing) {
      dispatch({ type: 'UPDATE_EVENT', payload: eventData });
    } else {
      dispatch({ 
        type: 'ADD_EVENT', 
        payload: { 
          event: eventData, 
          chapterId: state.prefilledEventData ? state.activeChapterId : undefined 
        } 
      });
    }

    handleClose();
  };

  const handleDelete = () => {
    if (isEditing && confirm('Delete this event?')) {
      dispatch({ type: 'DELETE_EVENT', payload: state.editingItemId! });
      handleClose();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 1024;
            let w = img.width;
            let h = img.height;
            
            if (w > h) {
              if (w > maxSize) {
                h *= maxSize / w;
                w = maxSize;
              }
            } else {
              if (h > maxSize) {
                w *= maxSize / h;
                h = maxSize;
              }
            }
            
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, w, h);
            setImage(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleChar = (id: string) => {
    setSelectedChars(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Edit Event" : "New Event"}
      headerColor="amber"
      helpId="event-modal"
      footer={
        <div className={styles.footerContent}>
          {isEditing && (
            <Button variant="danger" onClick={handleDelete} className={styles.deleteBtn}>Delete</Button>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} className={styles.saveBtn}>Save Event</Button>
          </div>
        </div>
      }
    >
      <div className={styles.imageSection}>
        <div className={styles.imagePreview}>
          {image ? (
            <div className={styles.previewContainer}>
              <img src={image} alt="Event" />
              <button className={styles.removeImage} onClick={() => setImage('')}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.placeholder}>
              <Upload size={24} />
              <span>Add Image</span>
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className={styles.fileInput}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>Event Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label>Date (dd/MM/yyyy HH:mm:ss)</label>
        <DateTimeInput value={date} onChange={setDate} className={styles.input} placeholder="dd/MM/yyyy HH:mm:ss" />
      </div>

      <div className={styles.field}>
        <label>Description</label>
        <textarea 
          rows={3} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className={styles.textarea}
        />
      </div>

      <div className={styles.field}>
        <label>Characters Involved</label>
        <div className={styles.charSelect}>
          {state.characters.map(char => (
            <label key={char.id} className={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={selectedChars.includes(char.id)}
                onChange={() => toggleChar(char.id)}
              />
              <span>{char.name}</span>
            </label>
          ))}
          {state.characters.length === 0 && (
            <p className={styles.noChars}>No characters available.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
