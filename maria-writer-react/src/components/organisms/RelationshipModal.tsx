import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../context/StoreContext';
import { Relationship, RelationshipType } from '../../types';
import { Modal } from '../molecules/Modal';
import styles from './RelationshipModal.module.scss';

export const RelationshipModal: React.FC = () => {
  const { state, dispatch } = useStore();
  
  const isOpen = state.activeModal === 'relationship';
  const editingRelationship = state.editingItemId 
    ? state.relationships.find(r => r.id === state.editingItemId)
    : null;

  const [formData, setFormData] = useState<Omit<Relationship, 'id'>>({
    type: 'friend',
    characterIds: [],
    description: '',
    startDate: '',
    endDate: '',
    tags: [],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingRelationship) {
      setFormData({
        type: editingRelationship.type,
        characterIds: editingRelationship.characterIds,
        description: editingRelationship.description || '',
        startDate: editingRelationship.startDate || '',
        endDate: editingRelationship.endDate || '',
        tags: editingRelationship.tags || [],
      });
    } else {
      setFormData({
        type: 'friend',
        characterIds: [],
        description: '',
        startDate: '',
        endDate: '',
        tags: [],
      });
    }
    setErrors({});
  }, [editingRelationship, isOpen]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (formData.characterIds.length < 2) {
      newErrors.characterIds = 'Please select at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (editingRelationship) {
      dispatch({
        type: 'UPDATE_RELATIONSHIP',
        payload: {
          ...formData,
          id: editingRelationship.id,
        },
      });
    } else {
      dispatch({
        type: 'ADD_RELATIONSHIP',
        payload: {
          ...formData,
          id: uuidv4(),
        },
      });
    }

    handleClose();
  };

  const handleCharacterToggle = (characterId: string) => {
    setFormData(prev => ({
      ...prev,
      characterIds: prev.characterIds.includes(characterId)
        ? prev.characterIds.filter(id => id !== characterId)
        : [...prev.characterIds, characterId],
    }));
  };

  const relationshipTypes: RelationshipType[] = [
    'family',
    'parent-child',
    'sibling',
    'spouse',
    'romantic',
    'friend',
    'colleague',
    'mentor-student',
    'rival',
    'enemy',
    'acquaintance',
    'other',
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingRelationship ? 'Edit Relationship' : 'New Relationship'}
    >
      <div className={styles.relationshipModal}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Relationship Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as RelationshipType })}
              required
            >
              {relationshipTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Characters *</label>
            <div className={styles.characterSelect}>
              {state.characters.length === 0 ? (
                <p style={{ margin: 0, color: '#666' }}>No characters available. Create characters first.</p>
              ) : (
                state.characters.map(char => (
                  <div key={char.id} className={styles.characterOption}>
                    <input
                      type="checkbox"
                      id={`char-${char.id}`}
                      checked={formData.characterIds.includes(char.id)}
                      onChange={() => handleCharacterToggle(char.id)}
                    />
                    <label htmlFor={`char-${char.id}`}>
                      {char.name}
                      {char.description && <span style={{ color: '#666', fontSize: '12px' }}> - {char.description.slice(0, 50)}</span>}
                    </label>
                  </div>
                ))
              )}
            </div>
            <div className={styles.selectedCount}>
              {formData.characterIds.length} character(s) selected
            </div>
            {errors.characterIds && (
              <div className={styles.error}>{errors.characterIds}</div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this relationship..."
            />
          </div>

          <div className={styles.dateInputs}>
            <div className={styles.formGroup}>
              <label>Start Date</label>
              <input
                type="text"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                placeholder="DD/MM/YYYY"
              />
            </div>

            <div className={styles.formGroup}>
              <label>End Date</label>
              <input
                type="text"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className={`${styles.button} ${styles.primary}`}>
              {editingRelationship ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
