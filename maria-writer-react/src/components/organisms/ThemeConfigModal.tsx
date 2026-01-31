import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useTheme, ThemeColors, lightTheme, darkTheme } from '../../context/ThemeContext';
import { Modal } from '../molecules/Modal';
import { Button } from '../atoms/Button';
import { Palette, RotateCcw, Save, Trash2, Sun, Moon } from 'lucide-react';
import styles from './ThemeConfigModal.module.scss';

interface ColorOption {
  key: keyof ThemeColors;
  label: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { key: 'color-primary', label: 'Primary Color' },
  { key: 'color-primary-hover', label: 'Primary Hover' },
  { key: 'color-bg', label: 'Background' },
  { key: 'color-surface', label: 'Surface' },
  { key: 'color-text', label: 'Text' },
  { key: 'color-text-muted', label: 'Text Muted' },
  { key: 'color-border', label: 'Border' },
  { key: 'color-bg-secondary', label: 'Secondary Background' },
  { key: 'color-primary-light', label: 'Primary Light' },
  { key: 'comment-text', label: 'Comment Text' },
  { key: 'comment-text-hover', label: 'Comment Text Hover' },
  { key: 'event-text', label: 'Event Text' },
  { key: 'event-text-hover', label: 'Event Text Hover' },
  // Example: Add new color options here as features are added
  // { key: 'romantic-text', label: 'Romantic Scene Text' },
  // { key: 'romantic-text-hover', label: 'Romantic Scene Hover' },
];

export const ThemeConfigModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const { isDark, colors, applyCustomColors, setTheme } = useTheme();
  
  const [customColors, setCustomColors] = useState<Partial<ThemeColors>>({});
  const [themeName, setThemeName] = useState('My Custom Theme');
  const [savedThemes, setSavedThemes] = useState<Array<{ name: string; colors: Partial<ThemeColors> }>>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [tab, setTab] = useState<'editor' | 'presets'>('editor');

  const isOpen = state.activeModal === 'theme-config';

  useEffect(() => {
    if (isOpen) {
      // Load saved themes from app state
      setSavedThemes(state.themeCustomizations || []);
      setCustomColors({});
    }
  }, [isOpen, state.themeCustomizations]);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyColors = () => {
    applyCustomColors(customColors);
  };

  const handleSaveTheme = () => {
    if (!themeName.trim()) {
      alert('Please enter a theme name');
      return;
    }

    const newTheme = { name: themeName, colors: customColors };
    const updated = savedThemes.filter(t => t.name !== themeName);
    updated.push(newTheme);

    // Dispatch to update app state
    dispatch({
      type: 'LOAD_STATE',
      payload: {
        ...state,
        themeCustomizations: updated
      }
    });

    setSavedThemes(updated);
    setThemeName('My Custom Theme');
    setCustomColors({});
    alert(`Theme "${newTheme.name}" saved!`);
  };

  const handleLoadTheme = (themeName: string) => {
    const theme = savedThemes.find(t => t.name === themeName);
    if (theme) {
      setCustomColors(theme.colors);
      applyCustomColors(theme.colors);
      setSelectedTheme(themeName);
    }
  };

  const handleDeleteTheme = (themeName: string) => {
    const updated = savedThemes.filter(t => t.name !== themeName);
    dispatch({
      type: 'LOAD_STATE',
      payload: {
        ...state,
        themeCustomizations: updated
      }
    });
    setSavedThemes(updated);
    if (selectedTheme === themeName) {
      setSelectedTheme(null);
      setCustomColors({});
    }
  };

  const handleReset = () => {
    setCustomColors({});
    setThemeName('My Custom Theme');
  };

  const handleLoadLightTheme = () => {
    setCustomColors({});
    applyCustomColors({});
    setTheme('light');
  };

  const handleLoadDarkTheme = () => {
    setCustomColors({});
    applyCustomColors({});
    setTheme('dark');
  };

  const handleClose = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Theme Configuration"
      headerColor="indigo"
      helpId="theme-config"
      size="xl"
      footer={
        <div className={styles.footerContent}>
          <Button variant="secondary" onClick={handleClose}>Close</Button>
          {tab === 'editor' && (
            <>
              <Button variant="ghost" onClick={handleReset} icon={RotateCcw}>Reset</Button>
              <Button variant="primary" onClick={handleApplyColors} icon={Palette}>Apply Colors</Button>
              <Button variant="primary" onClick={handleSaveTheme} icon={Save}>Save Theme</Button>
            </>
          )}
        </div>
      }
    >
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${tab === 'editor' ? styles.active : ''}`}
          onClick={() => setTab('editor')}
        >
          Color Editor
        </button>
        <button 
          className={`${styles.tab} ${tab === 'presets' ? styles.active : ''}`}
          onClick={() => setTab('presets')}
        >
          Saved Themes ({savedThemes.length})
        </button>
      </div>

      {tab === 'editor' && (
        <div className={styles.editorContainer}>
          <div className={styles.section}>
            <h4>Quick Presets</h4>
            <div className={styles.presetButtons}>
              <Button 
                variant={!isDark ? 'primary' : 'secondary'} 
                icon={Sun}
                onClick={handleLoadLightTheme}
              >
                Light Mode
              </Button>
              <Button 
                variant={isDark ? 'primary' : 'secondary'} 
                icon={Moon}
                onClick={handleLoadDarkTheme}
              >
                Dark Mode
              </Button>
            </div>
          </div>

          <div className={styles.section}>
            <h4>Customize Colors</h4>
            <p className={styles.hint}>Currently editing: {isDark ? 'Dark' : 'Light'} theme</p>
          </div>

          <div className={styles.colorGrid}>
            {COLOR_OPTIONS.map(option => (
              <div key={option.key} className={styles.colorField}>
                <label>{option.label}</label>
                <div className={styles.colorInputContainer}>
                  <input
                    type="color"
                    value={customColors[option.key] || colors[option.key]}
                    onChange={(e) => handleColorChange(option.key, e.target.value)}
                    className={styles.colorWheel}
                  />
                  <input
                    type="text"
                    value={customColors[option.key] || colors[option.key]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('#') && val.length <= 7) {
                        handleColorChange(option.key, val);
                      }
                    }}
                    className={styles.hexInput}
                    placeholder="#000000"
                  />
                  <div 
                    className={styles.colorPreview} 
                    style={{ backgroundColor: customColors[option.key] || colors[option.key] }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <h4>Save as New Theme</h4>
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              className={styles.themeNameInput}
              placeholder="Enter theme name"
            />
          </div>
        </div>
      )}

      {tab === 'presets' && (
        <div className={styles.presetsContainer}>
          {savedThemes.length === 0 ? (
            <p className={styles.empty}>No saved themes yet. Create one in the Color Editor tab!</p>
          ) : (
            <div className={styles.themesList}>
              {savedThemes.map(theme => (
                <div 
                  key={theme.name} 
                  className={`${styles.themeItem} ${selectedTheme === theme.name ? styles.selected : ''}`}
                >
                  <div className={styles.themeInfo}>
                    <h4>{theme.name}</h4>
                    <div className={styles.colorPreview2}>
                      {Object.entries(theme.colors).slice(0, 4).map(([key, color]) => (
                        <div
                          key={key}
                          className={styles.colorSample}
                          style={{ backgroundColor: color }}
                          title={key}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.themeActions}>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleLoadTheme(theme.name)}
                    >
                      Apply
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      icon={Trash2}
                      onClick={() => handleDeleteTheme(theme.name)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
