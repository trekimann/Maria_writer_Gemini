import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { RelationshipGraph } from './RelationshipGraph';
import { RelationshipList } from './RelationshipList';
import { Plus, Network, List } from 'lucide-react';
import { HelpButton } from '../atoms/HelpButton';
import styles from './RelationshipView.module.scss';

type ViewMode = 'graph' | 'list' | 'split';

export const RelationshipView: React.FC = () => {
  const { dispatch } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const handleAdd = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'relationship' } });
  };

  const handleNodeClick = (characterId: string) => {
    // Could navigate to character detail or open character modal
    console.log('Character clicked:', characterId);
  };

  const handleEdgeClick = (relationshipId: string) => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'relationship', itemId: relationshipId } });
  };

  return (
    <div className={styles.relationshipView}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2>Relationships</h2>
          <HelpButton helpId="relationship-view" />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleButton} ${viewMode === 'graph' ? styles.active : ''}`}
              onClick={() => setViewMode('graph')}
              title="Graph View"
            >
              <Network size={16} />
            </button>
            <button
              className={`${styles.toggleButton} ${viewMode === 'split' ? styles.active : ''}`}
              onClick={() => setViewMode('split')}
              title="Split View"
            >
              Split
            </button>
            <button
              className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
          <button className={styles.addButton} onClick={handleAdd}>
            <Plus size={16} />
            Add Relationship
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {viewMode === 'graph' && (
          <RelationshipGraph onNodeClick={handleNodeClick} onEdgeClick={handleEdgeClick} />
        )}
        
        {viewMode === 'list' && (
          <RelationshipList />
        )}
        
        {viewMode === 'split' && (
          <div className={styles.splitView}>
            <div className={styles.graphSection}>
              <RelationshipGraph onNodeClick={handleNodeClick} onEdgeClick={handleEdgeClick} />
            </div>
            <div className={styles.listSection}>
              <RelationshipList />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
