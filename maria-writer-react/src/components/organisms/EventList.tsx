import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { Plus, Calendar, Users } from 'lucide-react';
import { formatDateTimeOrEmpty } from '../../utils/date';
import styles from './EventList.module.scss';

export const EventList: React.FC = () => {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');

  const handleAdd = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'event' } });
  };

  const handleView = (id: string) => {
    dispatch({ type: 'SET_VIEWING_ITEM', payload: id });
  };

  const filteredEvents = state.events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <input 
          type="text" 
          placeholder="Search events..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
        <Button variant="primary" icon={Plus} onClick={handleAdd}>Add Event</Button>
      </div>

      <div className={styles.list}>
        {filteredEvents.map(evt => (
          <div key={evt.id} className={styles.eventItem} onClick={() => handleView(evt.id)}>
            <div className={styles.eventHeader}>
              <h4 className={styles.title}>{evt.title}</h4>
              {evt.date && (
                <span className={styles.date}>
                  <Calendar size={12} /> {formatDateTimeOrEmpty(evt.date)}
                </span>
              )}
            </div>
            <p className={styles.desc}>{evt.description}</p>
            {evt.characters && evt.characters.length > 0 && (
              <div className={styles.chars}>
                <Users size={12} />
                {evt.characters.map(cid => {
                  const char = state.characters.find(c => c.id === cid);
                  return char ? <span key={cid} className={styles.charTag}>{char.name}</span> : null;
                })}
              </div>
            )}
          </div>
        ))}
        {filteredEvents.length === 0 && (
          <div className={styles.empty}>
            <p>No events found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
