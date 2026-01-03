import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { ArrowLeft, Edit, Calendar, Users } from 'lucide-react';
import { formatDateTimeOrEmpty } from '../../utils/date';
import styles from './EventDetail.module.scss';

export const EventDetail: React.FC = () => {
  const { state, dispatch } = useStore();
  const eventId = state.viewingItemId;
  const evt = state.events.find(e => e.id === eventId);

  if (!evt) {
    return (
      <div className={styles.error}>
        <p>Event not found.</p>
        <Button variant="secondary" onClick={() => dispatch({ type: 'SET_VIEWING_ITEM', payload: null })}>
          Back to List
        </Button>
      </div>
    );
  }

  const involvedCharacters = (evt.characters || [])
    .map(charId => state.characters.find(c => c.id === charId))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const handleBack = () => {
    dispatch({ type: 'SET_VIEWING_ITEM', payload: null });
  };

  const handleEdit = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'event', itemId: evt.id } });
  };

  const handleCharacterClick = (charId: string) => {
    // Switch to Characters tab and view that character
    dispatch({ type: 'SET_CODEX_TAB', payload: 'characters' });
    dispatch({ type: 'SET_VIEWING_ITEM', payload: charId });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" icon={ArrowLeft} onClick={handleBack}>Back</Button>
        <Button variant="secondary" icon={Edit} onClick={handleEdit}>Edit</Button>
      </div>

      <div className={styles.content}>
        {evt.image && (
          <div className={styles.heroImage}>
            <img src={evt.image} alt={evt.title} />
          </div>
        )}
        
        <div className={styles.details}>
          <h2 className={styles.title}>{evt.title}</h2>
          
          <div className={styles.meta}>
            {evt.date && (
              <div className={styles.metaItem}>
                <Calendar size={16} />
                <span>{formatDateTimeOrEmpty(evt.date)}</span>
              </div>
            )}
            <div className={styles.metaItem}>
              <Users size={16} />
              <span>{involvedCharacters.length} Characters</span>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Description</h3>
            <div className={styles.description}>
              {evt.description || "No description provided."}
            </div>
          </div>

          {involvedCharacters.length > 0 && (
            <div className={styles.section}>
              <h3>Involved Characters</h3>
              <div className={styles.characterList}>
                {involvedCharacters.map(char => (
                  <div 
                    key={char.id} 
                    className={styles.characterChip}
                    onClick={() => handleCharacterClick(char.id)}
                  >
                    <div className={styles.avatar}>
                      {char.picture ? (
                        <img src={char.picture} alt={char.name} />
                      ) : (
                        <span>{char.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span>{char.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
