import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useHelp } from '../../context/HelpContext';
import styles from './HelpButton.module.scss';

interface HelpButtonProps {
  helpId: string;
  className?: string;
  size?: number;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ 
  helpId, 
  className,
  size = 18 
}) => {
  const { openHelp } = useHelp();

  return (
    <button 
      className={`${styles.helpButton} ${className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        openHelp(helpId);
      }}
      title="Get Help"
      aria-label="Get Help"
      type="button"
    >
      <HelpCircle size={size} />
    </button>
  );
};
