import React from 'react';
import { Character } from '../../types';
import styles from '../organisms/Editor.module.scss';

interface MentionSuggestionsProps {
  query: string | null;
  position: { x: number; y: number } | null;
  filteredCharacters: Character[];
  selectedIndex: number;
  onSelectCharacter: (character: Character) => void;
}

export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  query,
  position,
  filteredCharacters,
  selectedIndex,
  onSelectCharacter
}) => {
  if (query === null || !position) {
    return null;
  }

  return (
    <div 
      className={styles.mentionSuggestions}
      style={{ 
        position: 'fixed', 
        left: position.x, 
        top: position.y,
        zIndex: 1000
      }}
    >
      {filteredCharacters.length > 0 ? (
        filteredCharacters.map((char, index) => (
          <div
            key={char.id}
            className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelectCharacter(char);
            }}
          >
            <div className={styles.suggestionContent}>
              {char.picture ? (
                <img src={char.picture} alt={char.name} className={styles.suggestionAvatar} />
              ) : (
                <div className={styles.suggestionPlaceholder}>{char.name.charAt(0)}</div>
              )}
              <span className={styles.suggestionName}>{char.name}</span>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.noSuggestions}>No characters found</div>
      )}
    </div>
  );
};
