import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CharacterCard } from '../molecules/CharacterCard';
import { Button } from '../atoms/Button';
import { HelpButton } from '../atoms/HelpButton';
import { Plus } from 'lucide-react';
import styles from './CharacterList.module.scss';

export const CharacterList: React.FC = () => {
  const { state, dispatch } = useStore();

  const handleAdd = () => {
    dispatch({ type: 'OPEN_MODAL', payload: { type: 'character' } });
  };

  const handleEdit = (id: string) => {
    dispatch({ type: 'SET_VIEWING_ITEM', payload: id });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <HelpButton helpId="character-list" />
        <Button variant="primary" icon={Plus} onClick={handleAdd}>Add Character</Button>
      </div>
      <div className={styles.grid}>
        {state.characters.map(char => (
          <CharacterCard 
            key={char.id} 
            character={char} 
            onClick={() => handleEdit(char.id)} 
          />
        ))}
        {state.characters.length === 0 && (
          <div className={styles.empty}>
            <p>No characters yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};
