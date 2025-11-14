'use client';

import styles from '@/styles/chat.module.css';

interface ProgressBarProps {
  visible: boolean;
}

export default function ProgressBar({ visible }: ProgressBarProps) {
  if (!visible) return null;

  return (
    <div className={styles.progressBar} role="progressbar" aria-label="Processing request">
      <div className={styles.progressBarFill} />
    </div>
  );
}

