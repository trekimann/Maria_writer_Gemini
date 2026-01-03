import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CharacterList } from './CharacterList';
import { CharacterDetail } from './CharacterDetail';
import { EventList } from './EventList';
import { EventDetail } from './EventDetail';
import { TimelineView } from './TimelineView';
import { RelationshipView } from './RelationshipView';
import styles from './Codex.module.scss';

export const Codex: React.FC = () => {
  const { state, dispatch } = useStore();

  const tabs = [
    { id: 'timeline', label: 'Timeline' },
    { id: 'characters', label: 'Characters' },
    { id: 'events', label: 'Events' },
    { id: 'relationships', label: 'Relationships' }
  ] as const;

  return (
    <div className={styles.codex}>
      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${state.activeCodexTab === tab.id ? styles.active : ''}`}
            onClick={() => dispatch({ type: 'SET_CODEX_TAB', payload: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {state.activeCodexTab === 'timeline' && (
          <TimelineView />
        )}
        {state.activeCodexTab === 'characters' && (
          state.viewingItemId ? <CharacterDetail /> : <CharacterList />
        )}
        {state.activeCodexTab === 'events' && (
          state.viewingItemId ? <EventDetail /> : <EventList />
        )}
        {state.activeCodexTab === 'relationships' && (
          <RelationshipView />
        )}
      </div>
    </div>
  );
};
