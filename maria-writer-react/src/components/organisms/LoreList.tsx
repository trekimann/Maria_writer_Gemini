import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Button } from '../atoms/Button';
import { HelpButton } from '../atoms/HelpButton';
import { Plus, Users, Calendar } from 'lucide-react';
import { formatDateTimeOrEmpty } from '../../utils/date';
import styles from './LoreList.module.scss';

export const LoreList: React.FC = () => {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');

  const loreEntries = state.chapters.filter(c => (c.chapterType ?? 'chapter') === 'lore');

  const filtered = loreEntries.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    dispatch({ type: 'ADD_LORE_ENTRY' });
  };

  const handleOpen = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAPTER', payload: id });
    dispatch({ type: 'SET_CONTEXT_MODE', payload: 'writer' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <input
          type="text"
          placeholder="Search lore entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <HelpButton helpId="lore-list" />
          <Button variant="primary" icon={Plus} onClick={handleAdd}>Add Lore Entry</Button>
        </div>
      </div>

      <div className={styles.list}>
        {filtered.map(entry => {
          const mentionedChars = (entry.mentionedCharacters || [])
            .map(id => state.characters.find(c => c.id === id))
            .filter(Boolean);
          const preview = entry.content.replace(/^#.*$/m, '').replace(/[#*_`]/g, '').trim().slice(0, 120);
          return (
            <div key={entry.id} className={styles.loreItem} onClick={() => handleOpen(entry.id)}>
              <div className={styles.loreHeader}>
                <h4 className={styles.title}>{entry.title}</h4>
                {entry.date && (
                  <span className={styles.date}>
                    <Calendar size={12} /> {formatDateTimeOrEmpty(entry.date)}
                  </span>
                )}
              </div>
              {preview && <p className={styles.preview}>{preview}{entry.content.length > 120 ? '…' : ''}</p>}
              {mentionedChars.length > 0 && (
                <div className={styles.chars}>
                  <Users size={12} />
                  {mentionedChars.map(c => c && (
                    <span key={c.id} className={styles.charTag}>{c.name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <p>{loreEntries.length === 0 ? 'No lore entries yet. Add one to start building your world.' : 'No lore entries match your search.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
