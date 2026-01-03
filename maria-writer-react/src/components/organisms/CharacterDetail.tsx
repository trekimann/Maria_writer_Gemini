import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { ArrowLeft, Edit, Calendar } from 'lucide-react';
import { formatDateTimeOrEmpty } from '../../utils/date';
import styles from './CharacterDetail.module.scss';

export const CharacterDetail: React.FC = () => {
  const { state, dispatch } = useStore();
  const charId = state.viewingItemId;
  const char = state.characters.find(c => c.id === charId);

  if (!char) {
    return (
      <div className={styles.error}>
        <p>Character not found.</p>
        <Button variant="secondary" onClick={() => dispatch({ type: 'SET_VIEWING_ITEM', payload: null })}>
          Back to List
        </Button>
      </div>
    );
  }

  const relatedEvents = state.events.filter(e => (e.characters || []).includes(char.id));

  const handleBack = () => {
    dispatch({ type: 'SET_VIEWING_ITEM', payload: null });
  };

  const handleEdit = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'character', itemId: char.id } });
  };

  const handleEventClick = (eventId: string) => {
    // Switch to Events tab and view that event? 
    // Or just view event detail in place?
    // For now, let's switch to Events tab and maybe we can implement event detail later.
    // But the user asked for "list of events they are tagged in".
    // If we click, maybe we should open the event modal or switch to event detail view if we had one.
    // Let's just open the event modal for now as a quick way to see details.
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'event', itemId: eventId } });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" icon={ArrowLeft} onClick={handleBack}>Back</Button>
        <Button variant="secondary" icon={Edit} onClick={handleEdit}>Edit</Button>
      </div>

      <div className={styles.content}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {char.picture ? (
              <img src={char.picture} alt={char.name} />
            ) : (
              <div className={styles.placeholder}>{char.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className={styles.info}>
            <h2 className={styles.name}>{char.name}</h2>
            <div className={styles.meta}>
              <span>{char.age ? `${char.age} years old` : 'Age unknown'}</span>
              {char.gender && <span> • {char.gender}</span>}
              {char.deathDate && <span className={styles.deceased}> • Deceased</span>}
            </div>
            <div className={styles.dates}>
              {char.dob && <div>Born: {formatDateTimeOrEmpty(char.dob)}</div>}
              {char.deathDate && <div>Died: {formatDateTimeOrEmpty(char.deathDate)}</div>}
            </div>
            {char.tags && char.tags.length > 0 && (
              <div className={styles.tags}>
                {char.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3>Description</h3>
          <p className={styles.description}>{char.description || 'No description provided.'}</p>
        </div>

        <div className={styles.section}>
          <h3>Related Events</h3>
          {relatedEvents.length > 0 ? (
            <div className={styles.eventList}>
              {relatedEvents.map(evt => (
                <div key={evt.id} className={styles.eventItem} onClick={() => handleEventClick(evt.id)}>
                  <div className={styles.eventTitle}>{evt.title}</div>
                  {evt.date && (
                    <div className={styles.eventDate}>
                      <Calendar size={12} /> {formatDateTimeOrEmpty(evt.date)}
                    </div>
                  )}
                  <p className={styles.eventDesc}>{evt.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyEvents}>No events linked to this character.</p>
          )}
        </div>
      </div>
    </div>
  );
};
