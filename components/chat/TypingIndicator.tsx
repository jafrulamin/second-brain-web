'use client';

import styles from '@/styles/chat.module.css';

export default function TypingIndicator() {
  return (
    <div className={styles.typingIndicator} aria-live="polite" aria-label="Assistant is typing">
      <span>Assistant is typing</span>
      <div className={styles.typingDots}>
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
      </div>
    </div>
  );
}

