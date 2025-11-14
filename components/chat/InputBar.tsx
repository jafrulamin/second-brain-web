'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import styles from '@/styles/chat.module.css';

interface InputBarProps {
  conversationId: number | null;
  onSend: (message: string, attachments?: { filename: string; sizeBytes: number }[]) => void;
  onUpload: (file: File) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  disabled?: boolean;
  onEnsureConversation?: () => Promise<number | null>;
}

const MAX_FILES = 10;

const QUICK_PROMPTS = [
  'Summarize my latest PDF',
  'List key terms',
  'What are action items?',
  'Explain main concepts',
  'Find relevant sections',
];

export default function InputBar({ conversationId, onSend, onUpload, showToast, disabled, onEnsureConversation }: InputBarProps) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{ filename: string; sizeBytes: number }[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    textareaRef.current?.focus();
    
    // Check if running in demo mode
    fetch('/api/env')
      .then(res => res.json())
      .then(data => {
        if (data.demo === true) {
          setIsDemoMode(true);
        }
      })
      .catch(err => {
        console.error('Failed to fetch environment config:', err);
      });
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+K to focus input
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      textareaRef.current?.focus();
      return;
    }

    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Require text content to send manually
      if (input.trim() && !disabled) {
        handleSend();
      }
    }
  };

  const handleSend = () => {
    // Require text content for manual send
    // File-only uploads are handled automatically via the auto-send-files event
    if (input.trim() && !disabled) {
      onSend(input.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined);
      setInput('');
      setPendingAttachments([]); // Clear attachments after sending
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const uploadFiles = async (files: File[]) => {
    // Ensure we have a conversation ID (create if in draft)
    let activeConversationId = conversationId;
    if (!activeConversationId && onEnsureConversation) {
      try {
        activeConversationId = await onEnsureConversation();
        if (!activeConversationId) {
          showToast('Failed to create conversation', 'error');
          return;
        }
      } catch (error) {
        showToast('Failed to create conversation', 'error');
        return;
      }
    }

    const selected = files.slice(0, MAX_FILES);
    const skipped = files.length - selected.length;
    
    if (skipped > 0) {
      showToast(`Only the first ${MAX_FILES} files will be uploaded.`, 'info');
    }

    setIsUploading(true);
    const newAttachments: { filename: string; sizeBytes: number }[] = [];

    for (const file of selected) {
      if (file.type !== 'application/pdf') {
        showToast(`Skipped non-PDF: ${file.name}`, 'error');
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', String(activeConversationId));

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const json = await res.json();

        if (!res.ok) {
          showToast(json?.error ?? `Failed upload: ${file.name}`, 'error');
          continue;
        }

        // Add to pending attachments to be sent with next message
        newAttachments.push({
          filename: json.filename,
          sizeBytes: json.sizeBytes,
        });
        
        // Show simple success message
        showToast('Successfully uploaded', 'success');
      } catch (error) {
        showToast(`Failed upload: ${file.name}`, 'error');
      }
    }

    // Add all successfully uploaded files to pending attachments
    if (newAttachments.length > 0) {
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
      
      // Signal that this chat has activity (files uploaded)
      console.log('[InputBar] Files uploaded, dispatching chat-activity event');
      window.dispatchEvent(new CustomEvent('chat-activity'));
      
      // Dispatch custom event with conversation ID and attachments
      // This ensures ChatPanel uses the correct conversation ID
      window.dispatchEvent(new CustomEvent('auto-send-files', {
        detail: {
          conversationId: activeConversationId,
          attachments: newAttachments,
        }
      }));
      
      setPendingAttachments([]);
    }

    setIsUploading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    await uploadFiles(filesArray);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    await uploadFiles(filesArray);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.inputContainer}>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '14px',
          color: '#856404',
        }}>
          📖 <strong>Demo Mode:</strong> File uploads are disabled. You can explore the pre-loaded documents.
        </div>
      )}
      
      {/* Pending Attachments - shown only when files uploaded but message not sent yet */}
      {pendingAttachments.length > 0 && (
        <div className={styles.uploadedFilesContainer}>
          <div className={styles.uploadedFilesLabel}>
            📄 {pendingAttachments.length} file{pendingAttachments.length !== 1 ? 's' : ''} will be attached:
          </div>
          <div className={styles.uploadedFilesList}>
            {pendingAttachments.map((file, idx) => (
              <div key={idx} className={styles.fileChip} title={`${file.filename} (${formatFileSize(file.sizeBytes)})`}>
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.fileName}>{file.filename}</span>
                <span className={styles.fileSize}>{formatFileSize(file.sizeBytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={styles.inputWrapper}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Auto-resize
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 8 * 24)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={disabled}
          rows={1}
          className={styles.textarea}
          aria-label="Message input"
        />
        <div className={styles.inputActions}>
          <button
            type="button"
            onClick={handleAttachClick}
            className={styles.inputButton}
            aria-label="Add files"
            title={isDemoMode ? "Uploads disabled in demo mode" : "Add PDF files (up to 10)"}
            disabled={disabled || isUploading || isDemoMode}
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-label="File input"
          />
          <button
            type="button"
            onClick={handleSend}
            className={`${styles.inputButton} ${styles.send}`}
            disabled={!input.trim() || disabled || isUploading}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>

      <div className={styles.quickActions}>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleQuickPrompt(prompt)}
            className={styles.quickAction}
            disabled={disabled}
          >
            {prompt}
          </button>
        ))}
      </div>

      {!isDemoMode && (
        <div
          className={`${styles.dragDropArea} ${isDragging ? styles.active : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ display: isDragging ? 'block' : 'none' }}
          aria-label="Drop PDF files here"
        >
          Drop PDF files here to upload (up to 10 files)
        </div>
      )}
    </div>
  );
}

