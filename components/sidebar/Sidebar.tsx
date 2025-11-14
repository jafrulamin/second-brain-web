'use client';

import { useEffect, useState } from 'react';
import styles from '@/styles/chat.module.css';

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SidebarProps {
  onNewChat: () => void;
  onOpenSettings: () => void;
  selectedConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onDeleteConversation?: (id: number) => void;
}

export default function Sidebar({ 
  onNewChat, 
  onOpenSettings,
  selectedConversationId,
  onSelectConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/conversations?limit=50');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always load conversations when component mounts
    loadConversations();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[Sidebar] Refresh event received, reloading conversations');
      loadConversations();
    };
    
    window.addEventListener('refresh-conversations', handleRefresh);
    return () => window.removeEventListener('refresh-conversations', handleRefresh);
  }, [loadConversations]);

  const handleDeleteConversation = async (conversationId: number, title: string) => {
    if (!confirm(`Delete "${title}"? This will remove all messages and files in this chat.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from list
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        
        // Notify parent about deletion
        if (onDeleteConversation) {
          onDeleteConversation(conversationId);
        }
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const handleNewChat = () => {
    // Just switch to draft mode, no DB creation
    onNewChat();
  };


  return (
    <aside
      className={styles.sidebarContainer}
      aria-label="Sidebar"
    >
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <button
              type="button"
              onClick={handleNewChat}
              className={styles.sidebarButton}
              aria-label="New chat"
            >
              + New Chat
            </button>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarSectionTitle}>Conversations</div>
            
            {/* Show draft indicator if in draft mode */}
            {selectedConversationId === null && (
              <div className={styles.sidebarItem} style={{ 
                background: 'var(--sidebar-item-active)', 
                fontStyle: 'italic',
                color: 'var(--muted)'
              }}>
                📝 Draft (unsaved)
              </div>
            )}
            
            {loading ? (
              <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                Loading...
              </div>
            ) : conversations.length === 0 && selectedConversationId !== null ? (
              <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
                No saved conversations
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
                >
                  <button
                    type="button"
                    className={`${styles.sidebarItem} ${selectedConversationId === conv.id ? styles.active : ''}`}
                    onClick={() => {
                      console.log('[Sidebar] Selecting conversation:', conv.id);
                      onSelectConversation(conv.id);
                    }}
                    aria-label={`Open conversation: ${conv.title}`}
                    style={{ flex: 1, paddingRight: '2.5rem' }}
                  >
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id, conv.title);
                    }}
                    className={styles.inputButton}
                    aria-label={`Delete conversation: ${conv.title}`}
                    title="Delete conversation"
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      minWidth: '1.75rem',
                      height: '1.75rem',
                      padding: '0.25rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 'auto', padding: '1rem' }}>
            <button
              type="button"
              onClick={onOpenSettings}
              className={styles.sidebarItem}
              aria-label="Settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
    </aside>
  );
}

