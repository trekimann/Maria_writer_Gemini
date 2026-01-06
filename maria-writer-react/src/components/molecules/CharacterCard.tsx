import React from 'react';
import { Character } from '../../types';
import { User } from 'lucide-react';
import { getDisplayAge } from '../../utils/date';
import { useStore } from '../../context/StoreContext';
import styles from './CharacterCard.module.scss';

interface CharacterCardProps {
  character: Character;
  onClick: () => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, onClick }) => {
  const { state } = useStore();
  
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.imageWrapper} style={{ borderColor: character.color || 'transparent' }}>
        {character.picture ? (
          <img src={character.picture} alt={character.name} className={styles.image} />
        ) : (
          <div className={styles.placeholder} style={{ color: character.color || 'var(--color-text-muted)' }}>
            <User size={48} className={styles.icon} />
          </div>
        )}
      </div>
      <div className={styles.content}>
        <h4 className={styles.name}>{character.name}</h4>
        <div className={styles.meta}>
          {(() => {
            const displayAge = getDisplayAge(character.age, character.dob, state.meta.currentDate);
            return displayAge !== null && <span>{displayAge} yrs</span>;
          })()}
          {character.gender && <span>{character.gender}</span>}
        </div>
        <div className={styles.tags}>
          {character.tags?.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {(character.tags?.length || 0) > 3 && (
            <span className={styles.moreTags}>+{character.tags!.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
};
