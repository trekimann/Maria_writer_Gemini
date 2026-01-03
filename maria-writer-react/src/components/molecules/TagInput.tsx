import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './TagInput.module.scss';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  color?: 'indigo' | 'emerald' | 'amber';
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange, color = 'indigo' }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={styles.container}>
      <div className={styles.tags}>
        {tags.map(tag => (
          <span key={tag} className={`${styles.tag} ${styles[color]}`}>
            {tag}
            <button onClick={() => removeTag(tag)} className={styles.removeBtn}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className={styles.input}
        />
        <button onClick={addTag} className={styles.addBtn} disabled={!input.trim()}>
          Add
        </button>
      </div>
    </div>
  );
};
