import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useHelp } from '../../context/HelpContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import styles from './HelpModal.module.scss';
import { useStore } from '../../context/StoreContext';

export const HelpModal: React.FC = () => {
  const { isOpen, helpId, closeHelp } = useHelp();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && helpId) {
      setLoading(true);
      setError(null);
      
      // Fetch the help file
      fetch(`/help/${helpId}.md`)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Help file not found');
          }
          const text = await response.text();
          const html = await marked.parse(text);
          setContent(DOMPurify.sanitize(html));
        })
        .catch((err) => {
          console.error('Failed to load help file:', err);
          setError('Failed to load help content. Please try again later.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
        setContent('');
    }
  }, [isOpen, helpId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeHelp}
      title="Help"
      headerColor="indigo"
    >
      <div className={styles.helpContainer}>
        {loading && <div className={styles.loading}>Loading help content...</div>}
        
        {error && <div className={styles.error}>{error}</div>}
        
        {!loading && !error && (
          <div 
            className={styles.helpContent}
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        )}
      </div>
    </Modal>
  );
};
