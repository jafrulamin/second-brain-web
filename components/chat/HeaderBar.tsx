'use client';

import styles from '@/styles/chat.module.css';

interface HeaderBarProps {}

export default function HeaderBar({}: HeaderBarProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.headerTitle}>Second Brain</h1>
    </header>
  );
}

