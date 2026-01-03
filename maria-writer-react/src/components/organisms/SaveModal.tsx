import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Download } from 'lucide-react';
import { exportFile } from '../../utils/storage';
import styles from './SaveModal.module.scss';

export const SaveModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [fileName, setFileName] = useState('');

  const isOpen = state.activeModal === 'save';

  useEffect(() => {
    if (isOpen) {
      setFileName(state.meta.title || 'Untitled');
    }
  }, [isOpen, state.meta.title]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleConfirm = () => {
    exportFile(state, fileName);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Save Project"
      headerColor="indigo"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" icon={Download} onClick={handleConfirm}>Export .Maria</Button>
        </>
      }
    >
      <div className={styles.field}>
        <label>File Name</label>
        <input 
          type="text" 
          value={fileName} 
          onChange={(e) => setFileName(e.target.value)} 
          className={styles.input}
          placeholder="My Novel"
        />
      </div>
    </Modal>
  );
};
