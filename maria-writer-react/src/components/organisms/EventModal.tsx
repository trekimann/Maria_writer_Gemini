import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { DateTimeInput } from '../molecules/DateTimeInput';
import { v4 as uuidv4 } from 'uuid';
import { Upload, X, Heart } from 'lucide-react';
import { normalizeDDMMYYYYHHMMSS } from '../../utils/date';
import { syncLifeEventToRelationships } from '../../utils/eventSync';
import { LifeEventType } from '../../types';
import styles from './EventModal.module.scss';

export const EventModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [showLifeEvents, setShowLifeEvents] = useState(false);
  const [selectedLifeEvent, setSelectedLifeEvent] = useState<LifeEventType | ''>('');

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
      } else {
        setTitle('');
        setDate('');
        setDescription('');
        setImage('');
        setSelectedChars([]);
        setSelectedLifeEvent('');
      }
    }
  }, [isOpen, isEditing, state.editingItemId, state.events]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSave = () => {
    if (!title.trim()) return alert('Title is required');

    // Validate life event requirements
    if (selectedLifeEvent) {
      if (selectedLifeEvent === 'marriage' && selectedChars.length !== 2) {
        return alert('Marriage requires exactly 2 characters');
      }
      if ((selectedLifeEvent === 'friendship' || selectedLifeEvent === 'birth-of-child') && selectedChars.length < 2) {
        return alert(`${selectedLifeEvent === 'friendship' ? 'Friendship' : 'Birth of Child'} requires at least 2 characters`);
      }
      if (!date.trim()) {
        return alert('Date is required for life events');
      }
    }

    const normalizedDate = date.trim() ? normalizeDDMMYYYYHHMMSS(date) : '';
    if (date.trim() && !normalizedDate) return alert('Event date must be in dd/MM/yyyy HH:mm:ss format');

    const eventData = {
      id: isEditing ? state.editingItemId! : uuidv4(),
      title,
      date: normalizedDate || '',
      description,
      image,
      characters: selectedChars
    };

    if (isEditing) {
      dispatch({ type: 'UPDATE_EVENT', payload: eventData });
    } else {
      dispatch({ type: 'ADD_EVENT', payload: eventData });
      
      // If this is a life event, also create a relationship and update characters
      if (selectedLifeEvent) {
        handleLifeEventCreation(eventData);
      }
    }

    handleClose();
  };

  const handleLifeEventCreation = (eventData: any) => {
    // Guard: Only proceed if a valid life event type is selected
    if (!selectedLifeEvent) return;
    
    // Use the centralized sync utility
    const syncResult = syncLifeEventToRelationships(
      selectedLifeEvent,
      eventData,
      state.relationships,
      state.characters
    );
    
    // Dispatch all the updates
    syncResult.relationships.forEach(rel => {
      // Only dispatch new relationships (check if they exist in current state)
      if (!state.relationships.find(r => r.id === rel.id)) {
        dispatch({ type: 'ADD_RELATIONSHIP', payload: rel });
      }
    });
    
    // Update all affected characters
    syncResult.characters.forEach(char => {
      const existingChar = state.characters.find(c => c.id === char.id);
      if (existingChar && JSON.stringify(existingChar.lifeEvents) !== JSON.stringify(char.lifeEvents)) {
        dispatch({ type: 'UPDATE_CHARACTER', payload: char });
      }
    });
  };

  const handleLifeEventSelect = (type: LifeEventType) => {
    setSelectedLifeEvent(type);
    
    // Pre-fill event data based on life event type
    if (type === 'marriage') {
      setTitle('Marriage');
      setDescription('Marriage ceremony');
    } else if (type === 'friendship') {
      setTitle('Friendship Formed');
      setDescription('Became friends');
    } else if (type === 'birth-of-child') {
      setTitle('Birth of Child');
      setDescription('Child was born');
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

      {!isEditing && (
        <div className={styles.field}>
          <div className={styles.lifeEventToggle}>
            <button
              type="button"
              className={`${styles.toggleButton} ${showLifeEvents ? styles.active : ''}`}
              onClick={() => setShowLifeEvents(!showLifeEvents)}
            >
              <Heart size={16} />
              {showLifeEvents ? 'Hide Life Events' : 'Create from Life Event'}
            </button>
          </div>

          {showLifeEvents && (
            <div className={styles.lifeEventSection}>
              <label>Life Event Type</label>
              <select
                value={selectedLifeEvent}
                onChange={(e) => handleLifeEventSelect(e.target.value as LifeEventType)}
                className={styles.select}
              >
                <option value="">Select a life event type...</option>
                <option value="marriage">Marriage - Requires 2 characters</option>
                <option value="friendship">Friendship - Requires 2+ characters</option>
                <option value="birth-of-child">Birth of Child - Requires 2+ characters</option>
              </select>
              
              {selectedLifeEvent && (
                <div className={styles.lifeEventHelp}>
                  {selectedLifeEvent === 'marriage' && (
                    <p>📋 Marriage will create a spouse relationship and add the event to both characters' timelines.</p>
                  )}
                  {selectedLifeEvent === 'friendship' && (
                    <p>📋 Friendship will create a friend relationship and add the event to all selected characters' timelines.</p>
                  )}
                  {selectedLifeEvent === 'birth-of-child' && (
                    <p>📋 Birth of Child will create a parent-child relationship and add the event to the characters' timelines.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
