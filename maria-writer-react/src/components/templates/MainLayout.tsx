import React from 'react';
import { useStore } from '../../context/StoreContext';
import { TopBar } from '../organisms/TopBar';
import { Sidebar } from '../organisms/Sidebar';
import { Editor } from '../organisms/Editor';
import { Codex } from '../organisms/Codex';
import { MetadataModal } from '../organisms/MetadataModal';
import { SaveModal } from '../organisms/SaveModal';
import { CharacterModal } from '../organisms/CharacterModal';
import { EventModal } from '../organisms/EventModal';
import { RelationshipModal } from '../organisms/RelationshipModal';
import styles from './MainLayout.module.scss';

export const MainLayout: React.FC = () => {
  const { state } = useStore();

  return (
    <div className={styles.layout}>
      <TopBar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          {state.context === 'writer' ? <Editor key={state.activeChapterId} /> : <Codex />}
        </main>
      </div>
      <MetadataModal />
      <SaveModal />
      <CharacterModal />
      <EventModal />
      <RelationshipModal />
    </div>
  );
};
