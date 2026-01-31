import React from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import styles from './ThemeToggle.module.scss';

export const ThemeToggle: React.FC = () => {
  const { themeMode, setTheme } = useTheme();

  const cycleTheme = () => {
    if (themeMode === 'light') {
      setTheme('dark');
    } else if (themeMode === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun size={18} />;
      case 'dark':
        return <Moon size={18} />;
      case 'system':
        return <MonitorSmartphone size={18} />;
    }
  };

  const getLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'Auto';
    }
  };

  return (
    <button 
      className={styles.toggle} 
      onClick={cycleTheme}
      title={`Theme: ${getLabel()} (click to cycle)`}
    >
      {getIcon()}
      <span className={styles.label}>{getLabel()}</span>
    </button>
  );
};
