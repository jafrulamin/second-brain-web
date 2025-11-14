'use client';

import { useState } from 'react';
import styles from '@/styles/chat.module.css';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'delivered' | 'error';
  attachments?: {
    filename: string;
    sizeBytes: number;
  }[];
}

interface MessageListProps {
  messages: Message[];
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

function renderCodeBlock(text: string): React.ReactNode {
  // Simple code block detection (between ```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.substring(lastIndex, match.index)}</span>
      );
    }

    // Add code block
    parts.push(
      <pre key={key++} className={styles.codeBlock}>
        <code>{match[2]}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

export default function MessageList({ messages }: MessageListProps) {
  const [reactions, setReactions] = useState<Record<string, 'like' | 'flag' | null>>({});

  const handleReaction = (messageId: string, reaction: 'like' | 'flag') => {
    setReactions((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === reaction ? null : reaction,
    }));
  };

  if (messages.length === 0) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--muted)',
        fontSize: '0.875rem'
      }}>
        Start a conversation by asking a question
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.messageList}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`${styles.message} ${styles[message.role]}`}
        >
          {/* Show attachments above message content for user messages */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={styles.messageAttachments}>
              {message.attachments.map((file, idx) => (
                <div key={idx} className={styles.attachmentChip}>
                  <span className={styles.attachmentIcon}>📄</span>
                  <span className={styles.attachmentName}>{file.filename}</span>
                  <span className={styles.attachmentSize}>{formatFileSize(file.sizeBytes)}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className={styles.messageBubble}>
            {message.role === 'assistant' ? renderCodeBlock(message.content) : message.content}
          </div>
          <div className={styles.messageMeta}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {message.role === 'user' && message.status && (
              <span>• {message.status === 'delivered' ? '✓' : message.status === 'sending' ? '…' : '✗'}</span>
            )}
          </div>
          {message.role === 'assistant' && (
            <div className={styles.messageReactions}>
              <button
                type="button"
                onClick={() => handleReaction(message.id, 'like')}
                aria-label="Like message"
                title="Like"
              >
                {reactions[message.id] === 'like' ? '👍' : '👍'}
              </button>
              <button
                type="button"
                onClick={() => handleReaction(message.id, 'flag')}
                aria-label="Flag message"
                title="Flag"
              >
                {reactions[message.id] === 'flag' ? '🚩' : '🚩'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

