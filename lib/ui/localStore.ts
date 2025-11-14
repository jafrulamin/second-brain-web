/**
 * Safe localStorage helpers for UI state
 */

/**
 * Safely get JSON from localStorage
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely set JSON to localStorage
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to set localStorage key "${key}":`, error);
  }
}

/**
 * Remove a key from localStorage
 */
export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove localStorage key "${key}":`, error);
  }
}

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'sb_theme',
  FONT_SIZE: 'sb_fontsize',
  MODEL: 'sb_model',
  CONVERSATIONS: 'sb_conversations',
} as const;

