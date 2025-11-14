'use client';

import { useEffect, useState } from 'react';
import { getLocalStorage, setLocalStorage, STORAGE_KEYS } from '@/lib/ui/localStore';
import styles from '@/styles/chat.module.css';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [fontSize, setFontSize] = useState(16);
  const [model, setModel] = useState('llama3');

  useEffect(() => {
    if (isOpen) {
      // Load settings from localStorage
      setTheme(getLocalStorage(STORAGE_KEYS.THEME, 'light'));
      setFontSize(getLocalStorage(STORAGE_KEYS.FONT_SIZE, 16));
      setModel(getLocalStorage(STORAGE_KEYS.MODEL, 'llama3'));
    }
  }, [isOpen]);

  useEffect(() => {
    // Apply theme
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    setLocalStorage(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    // Apply font size
    document.documentElement.style.fontSize = `${fontSize}px`;
    setLocalStorage(STORAGE_KEYS.FONT_SIZE, fontSize);
  }, [fontSize]);

  useEffect(() => {
    // Save model preference
    setLocalStorage(STORAGE_KEYS.MODEL, model);
  }, [model]);

  useEffect(() => {
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.drawerOverlay} onClick={onClose} aria-hidden="true" />
      <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Settings">
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.drawerClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        <div className={styles.drawerContent}>
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Appearance</h3>
            <div className={styles.drawerOption}>
              <label className={styles.drawerLabel} htmlFor="theme-select">
                Theme
              </label>
              <select
                id="theme-select"
                className={styles.drawerSelect}
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                aria-label="Theme selection"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className={styles.drawerOption}>
              <div className={styles.drawerSliderLabel}>
                <label htmlFor="font-size-slider">Font Size</label>
                <span>{fontSize}px</span>
              </div>
              <input
                id="font-size-slider"
                type="range"
                min="14"
                max="18"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className={styles.drawerSlider}
                aria-label="Font size"
              />
            </div>
          </div>

          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Model</h3>
            <div className={styles.drawerOption}>
              <label className={styles.drawerLabel} htmlFor="model-select">
                LLM Model
              </label>
              <select
                id="model-select"
                className={styles.drawerSelect}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                aria-label="Model selection"
              >
                <option value="llama3">Llama 3</option>
                <option value="mistral">Mistral</option>
                <option value="llama2">Llama 2</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Note: Changing model requires restarting the server
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

