import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { TagInput } from '../molecules/TagInput';
import { DateTimeInput } from '../molecules/DateTimeInput';
import { Button } from '../atoms/Button';
import { User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { normalizeDDMMYYYYHHMMSS } from '../../utils/date';
import styles from './CharacterModal.module.scss';

export const CharacterModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [gender, setGender] = useState('');
  const [description, setDescription] = useState('');
  const [picture, setPicture] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [nicknames, setNicknames] = useState<string[]>([]);
  const [color, setColor] = useState('#4f46e5'); // Default indigo
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOpen = state.activeModal === 'character';
  const isEditing = !!state.editingItemId;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        const char = state.characters.find(c => c.id === state.editingItemId);
        if (char) {
          setName(char.name);
          setAge(char.age || '');
          setDob(char.dob || '');
          setDeathDate(char.deathDate || '');
          setGender(char.gender || '');
          setDescription(char.description || '');
          setPicture(char.picture || '');
          setTags(char.tags || []);
          setNicknames(char.nicknames || []);
          setColor(char.color || '#4f46e5');
        }
      } else {
        // Reset for new character
        setName('');
        setAge('');
        setDob('');
        setDeathDate('');
        setGender('');
        setDescription('');
        setPicture('');
        setTags([]);
        setNicknames([]);
        setColor('#4f46e5');
        setSelectedParentIds([]);
      }
    }
  }, [isOpen, isEditing, state.editingItemId, state.characters]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleSave = () => {
    if (!name.trim()) return alert('Name is required');

    const normalizedDob = dob.trim() ? normalizeDDMMYYYYHHMMSS(dob) : '';
    if (dob.trim() && !normalizedDob) return alert('DOB must be in dd/MM/yyyy HH:mm:ss format');

    const normalizedDeath = deathDate.trim() ? normalizeDDMMYYYYHHMMSS(deathDate) : '';
    if (deathDate.trim() && !normalizedDeath) return alert('Death date must be in dd/MM/yyyy HH:mm:ss format');

    const characterId = isEditing ? state.editingItemId! : uuidv4();

    const charData = {
      id: characterId,
      name,
      age,
      dob: normalizedDob || '',
      deathDate: normalizedDeath || '',
      gender,
      description,
      picture,
      tags,
      nicknames,
      color
    };

    console.log('CharacterModal: handleSave charData=', charData);

    if (isEditing) {
      dispatch({ type: 'UPDATE_CHARACTER', payload: charData });
    } else {
      dispatch({ type: 'ADD_CHARACTER', payload: charData });
      
      // Create parent-child relationships if parents were selected
      if (selectedParentIds.length > 0) {
        selectedParentIds.forEach(parentId => {
          const relationship = {
            id: uuidv4(),
            type: 'parent-child' as const,
            characterIds: [parentId, characterId],
            description: 'Parent-child relationship',
            startDate: normalizedDob || undefined,
          };
          dispatch({ type: 'ADD_RELATIONSHIP', payload: relationship });
        });
      }
    }
    handleClose();
  };



  const handleDelete = () => {
    if (isEditing && confirm('Delete this character?')) {
      dispatch({ type: 'DELETE_CHARACTER', payload: state.editingItemId! });
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
            const maxSize = 256;
            let w = img.width;
            let h = img.height;
            
            if (w > h) {
              if (w > maxSize) {
                h = h * maxSize / w;
                w = maxSize;
              }
            } else {
              if (h > maxSize) {
                w = w * maxSize / h;
                h = maxSize;
              }
            }
            
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const base64 = canvas.toDataURL('image/jpeg', 0.8);
              setPicture(base64);
            }
          };
          img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Edit Character" : "New Character"}
      headerColor="indigo"
      footer={
        <div className={styles.footerContent}>
          {isEditing && (
            <Button variant="danger" onClick={handleDelete} className={styles.deleteBtn}>Delete</Button>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Character</Button>
          </div>
        </div>
      }
    >
      <div className={styles.field}>
        <label>Name</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className={styles.input}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.picSection}>
          <div className={styles.picPreview} onClick={() => fileInputRef.current?.click()}>
            {picture ? (
              <img src={picture} alt="Preview" />
            ) : (
              <div className={styles.placeholder}>
                <User size={32} />
                <span>Upload</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className={styles.hiddenInput} 
            accept="image/*"
            onChange={handleFileChange}
          />
          {picture && (
            <button className={styles.removePic} onClick={() => setPicture('')}>Remove</button>
          )}
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.field}>
            <label>Age</label>
            <input type="text" value={age} onChange={(e) => setAge(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label>Gender</label>
            <input type="text" value={gender} onChange={(e) => setGender(e.target.value)} className={styles.input} />
          </div>
          <div className={styles.field}>
            <label>DOB (dd/MM/yyyy HH:mm:ss)</label>
            <DateTimeInput value={dob} onChange={setDob} className={styles.input} placeholder="dd/MM/yyyy HH:mm:ss" />
          </div>
          <div className={styles.field}>
            <label>Died (dd/MM/yyyy HH:mm:ss)</label>
            <DateTimeInput value={deathDate} onChange={setDeathDate} className={styles.input} placeholder="dd/MM/yyyy HH:mm:ss" />
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <label>Tags</label>
        <TagInput tags={tags} onChange={setTags} color="indigo" />
      </div>

      <div className={styles.field}>
        <label>Nicknames / Aliases</label>
        <TagInput tags={nicknames} onChange={setNicknames} color="emerald" />
      </div>

      <div className={styles.field}>
        <label>Description / Bio</label>
        <textarea 
          rows={4} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className={styles.textarea}
        />
      </div>

      <div className={styles.field}>
        <label>Highlight Color</label>
        <div className={styles.colorPickerContainer}>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className={styles.colorWheel}
          />
          <input 
            type="text" 
            value={color} 
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('#') && val.length <= 7) {
                setColor(val);
              }
            }} 
            className={styles.hexInput}
            placeholder="#000000"
          />
          <div className={styles.colorPreview} style={{ backgroundColor: color }}></div>
        </div>
      </div>

      {/* Parent Selection - only show when creating new character */}
      {!isEditing && state.characters.length > 0 && (
        <div className={styles.field}>
          <label>Parents (optional)</label>
          <div className={styles.parentSelection}>
            {state.characters.map(char => (
              <div key={char.id} className={styles.parentOption}>
                <input
                  type="checkbox"
                  id={`parent-${char.id}`}
                  checked={selectedParentIds.includes(char.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedParentIds(prev => [...prev, char.id]);
                    } else {
                      setSelectedParentIds(prev => prev.filter(id => id !== char.id));
                    }
                  }}
                />
                <label htmlFor={`parent-${char.id}`}>{char.name}</label>
              </div>
            ))}
          </div>
          {selectedParentIds.length > 0 && (
            <div className={styles.selectedParentsInfo}>
              {selectedParentIds.length} parent(s) selected
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
