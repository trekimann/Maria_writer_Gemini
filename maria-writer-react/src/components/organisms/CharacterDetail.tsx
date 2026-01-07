import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { ArrowLeft, Edit, Calendar, BookOpen } from 'lucide-react';
import { formatDateTimeOrEmpty, getDisplayAge } from '../../utils/date';
import { findCharacterMentions } from '../../utils/mention';
import styles from './CharacterDetail.module.scss';

export const CharacterDetail: React.FC = () => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<'info' | 'mentions'>('info');
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
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'event', itemId: eventId } });
  };

  const mentions = findCharacterMentions(state.chapters, char);

  const goToChapter = (chapterId: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: chapterId });
    dispatch({ type: 'SET_CONTEXT_MODE', payload: 'writer' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" icon={ArrowLeft} onClick={handleBack}>Back</Button>
        <div className={styles.headerActions}>
          <Button variant="secondary" icon={Edit} onClick={handleEdit}>Edit</Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar} style={{ outlineColor: char.color || '#4f46e5' }}>
            {char.picture ? (
              <img src={char.picture} alt={char.name} />
            ) : (
              <div className={styles.placeholder} style={{ color: char.color || '#4f46e5' }}>{char.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className={styles.info}>
            <h2 className={styles.name}>{char.name}</h2>
            <div className={styles.meta}>
              <span>{(() => {
                const displayAge = getDisplayAge(char.age, char.dob, state.meta.currentDate);
                return displayAge !== null ? `${displayAge} years old` : 'Age unknown';
              })()}</span>
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

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info & Events
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'mentions' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('mentions')}
          >
            Mentions ({mentions.length})
          </button>
        </div>

        {activeTab === 'info' ? (
          <>
            <div className={styles.section}>
              <h3>Description</h3>
              <p className={styles.description}>{char.description || 'No description provided.'}</p>
            </div>

            {char.nicknames && char.nicknames.length > 0 && (
              <div className={styles.section}>
                <h3>Aliases / Nicknames</h3>
                <div className={styles.tags}>
                  {char.nicknames.map(nick => (
                    <span key={nick} className={styles.tag} style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}>
                      {nick}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
          </>
        ) : (
          <div className={styles.section}>
            <h3>Character Mentions</h3>
            <p className={styles.tabDescription}>Occurrences of this character across your story chapters.</p>
            {mentions.length > 0 ? (
              <div className={styles.mentionList}>
                {mentions.map((mention, idx) => (
                  <div key={idx} className={styles.mentionItem} onClick={() => goToChapter(mention.chapterId)}>
                    <div className={styles.mentionHeader}>
                      <BookOpen size={14} className={styles.mentionIcon} />
                      <span className={styles.mentionChapter}>{mention.chapterTitle}</span>
                    </div>
                    <div className={styles.mentionExcerpt}>
                      ...<span dangerouslySetInnerHTML={{ __html: mention.excerpt }} />...
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyEvents}>No mentions found. Type @{char.name} in the editor to tag them.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
