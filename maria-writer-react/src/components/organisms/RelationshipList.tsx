import React from 'react';
import { useStore } from '../../context/StoreContext';
import { RelationshipType } from '../../types';
import { Plus, Users } from 'lucide-react';
import styles from './RelationshipList.module.scss';

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  'family': '#8B4513',
  'parent-child': '#4169E1',
  'sibling': '#20B2AA',
  'spouse': '#DC143C',
  'romantic': '#FF1493',
  'friend': '#FFD700',
  'colleague': '#4682B4',
  'mentor-student': '#9370DB',
  'rival': '#FF4500',
  'enemy': '#8B0000',
  'acquaintance': '#A9A9A9',
  'other': '#808080',
};

export const RelationshipList: React.FC = () => {
  const { state, dispatch } = useStore();

  const handleAdd = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'relationship' } });
  };

  const handleEdit = (relationshipId: string) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'relationship', itemId: relationshipId } });
  };

  const handleDelete = (relationshipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this relationship?')) {
      dispatch({ type: 'DELETE_RELATIONSHIP', payload: relationshipId });
    }
  };

  if (state.relationships.length === 0) {
    return (
      <div className={styles.relationshipList}>
        <div className={styles.header}>
          <h2>Relationships</h2>
          <button className={styles.addButton} onClick={handleAdd}>
            <Plus size={16} />
            Add Relationship
          </button>
        </div>
        <div className={styles.emptyState}>
          <Users size={64} />
          <p>No relationships yet</p>
          <p>Create relationships to connect your characters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.relationshipList}>
      <div className={styles.header}>
        <h2>Relationships</h2>
        <button className={styles.addButton} onClick={handleAdd}>
          <Plus size={16} />
          Add Relationship
        </button>
      </div>

      <div className={styles.relationships}>
        {state.relationships.map(rel => (
          <div
            key={rel.id}
            className={styles.relationshipCard}
            onClick={() => handleEdit(rel.id)}
          >
            <div className={styles.relationshipHeader}>
              <div className={styles.relationshipType}>
                {rel.type.replace('-', ' ')}
              </div>
              <div
                className={styles.relationshipBadge}
                style={{ backgroundColor: RELATIONSHIP_COLORS[rel.type] }}
              >
                {rel.characterIds.length} characters
              </div>
            </div>

            <div className={styles.characters}>
              {rel.characterIds.map(charId => {
                const char = state.characters.find(c => c.id === charId);
                return (
                  <span key={charId} className={styles.characterTag}>
                    {char?.name || 'Unknown'}
                  </span>
                );
              })}
            </div>

            {rel.description && (
              <div className={styles.description}>{rel.description}</div>
            )}

            {(rel.startDate || rel.endDate) && (
              <div className={styles.dates}>
                {rel.startDate && <span>From: {rel.startDate}</span>}
                {rel.endDate && <span>To: {rel.endDate}</span>}
              </div>
            )}

            <div className={styles.actions}>
              <button
                className={`${styles.actionButton} ${styles.delete}`}
                onClick={(e) => handleDelete(rel.id, e)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
