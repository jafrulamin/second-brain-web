'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar/Sidebar';
import ChatPanel from '@/components/chat/ChatPanel';
import SettingsDrawer from '@/components/settings/SettingsDrawer';
import styles from '@/styles/chat.module.css';

export default function ChatShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse conversation ID from URL
  const conversationIdParam = searchParams.get('c');
  const selectedConversationId = conversationIdParam ? parseInt(conversationIdParam, 10) : null;
  
  console.log('[ChatShell] Selected from URL:', selectedConversationId, 'raw param:', conversationIdParam);

  // Monitor selectedConversationId changes
  useEffect(() => {
    console.log('[ChatShell] selectedConversationId changed to:', selectedConversationId);
  }, [selectedConversationId]);

  const selectConversation = (id: number) => {
    console.log('[ChatShell] selectConversation called with:', id);
    // Update URL with conversation ID
    const newUrl = `/?c=${id}`;
    router.push(newUrl);
    console.log('[ChatShell] Pushed URL:', newUrl);
  };

  const newDraft = () => {
    console.log('[ChatShell] newDraft called - switching to draft mode');
    // Remove conversation ID from URL (go to draft mode)
    router.push('/');
    console.log('[ChatShell] Pushed URL: /');
  };

  const handleDeleteConversation = (deletedId: number) => {
    // If the deleted conversation was selected, switch to draft
    if (selectedConversationId === deletedId) {
      newDraft();
    }
  };

  const handleConversationCreated = (id: number) => {
    console.log('[ChatShell] handleConversationCreated called with:', id);
    // When a conversation is created from draft, update URL
    selectConversation(id);
    // Trigger sidebar refresh
    window.dispatchEvent(new CustomEvent('refresh-conversations'));
  };

  return (
    <div className={styles.container}>
      <Sidebar
        onNewChat={newDraft}
        onOpenSettings={() => setSettingsOpen(true)}
        selectedConversationId={selectedConversationId}
        onSelectConversation={selectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className={styles.chatContainer}>
        <ChatPanel
          selectedConversationId={selectedConversationId}
          onOpenSettings={() => setSettingsOpen(true)}
          onNewChat={newDraft}
          onConversationCreated={handleConversationCreated}
        />
      </div>
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
