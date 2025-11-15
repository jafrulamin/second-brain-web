'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import HeaderBar from './HeaderBar';
import MessageList, { Message } from './MessageList';
import TypingIndicator from './TypingIndicator';
import InputBar from './InputBar';
import ProgressBar from '@/components/common/ProgressBar';
import Toast from '@/components/common/Toast';

interface ChatPanelProps {
  selectedConversationId: number | null;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onConversationCreated: (id: number) => void;
}

export default function ChatPanel({ 
  selectedConversationId, 
  onOpenSettings,
  onNewChat,
  onConversationCreated
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inFlightRequest, setInFlightRequest] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamedContentRef = useRef<string>('');
  
  const isDraft = selectedConversationId === null;

  // Monitor messages state changes
  useEffect(() => {
    console.log('[ChatPanel] messages state changed, now has', messages.length, 'messages');
  }, [messages]);

  // Listen for auto-send-files event from InputBar
  useEffect(() => {
    const handleAutoSendFiles = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { conversationId: eventConvId, attachments } = customEvent.detail;
      
      console.log('[ChatPanel] Auto-send-files event received:', eventConvId, attachments);
      
      if (!eventConvId || !attachments || attachments.length === 0) {
        return;
      }
      
      const fileCount = attachments.length;
      const fileNames = attachments.map((f: any) => f.filename).join(', ');
      
      // Create user message showing uploaded files
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: `📎 Uploaded ${fileCount} file${fileCount > 1 ? 's' : ''}`,
        timestamp: new Date(),
        status: 'delivered',
        attachments: attachments,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      
      // Create welcome assistant message
      const welcomeMessage = `Perfect! I have reviewed the ${fileCount > 1 ? 'files' : 'file'} that you have uploaded successfully and I am ready to answer any questions that you have.`;
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        status: 'delivered',
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Persist these messages to database
      try {
        await fetch('/api/save-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `📎 Uploaded ${fileCount} file${fileCount > 1 ? 's' : ''}: ${fileNames}`,
            answer: welcomeMessage,
            conversationId: eventConvId,
          }),
        });
        console.log('[ChatPanel] Saved file upload welcome messages for conversation:', eventConvId);
      } catch (saveError) {
        console.error('[ChatPanel] Failed to save welcome messages:', saveError);
      }
    };
    
    window.addEventListener('auto-send-files', handleAutoSendFiles);
    return () => window.removeEventListener('auto-send-files', handleAutoSendFiles);
  }, []);

  // Load conversation messages when selectedConversationId changes
  useEffect(() => {
    console.log('[ChatPanel] selectedConversationId changed to:', selectedConversationId);
    
    if (selectedConversationId === null) {
      console.log('[ChatPanel] Draft mode - clearing messages');
      // Draft mode - clear messages
      setMessages([]);
      setLastUserMessage('');
    } else {
      console.log('[ChatPanel] Loading messages for conversation:', selectedConversationId);
      // Load messages for this conversation
      const loadMessages = async () => {
        try {
          const url = `/api/conversations/${selectedConversationId}`;
          console.log('[ChatPanel] Fetching from URL:', url);
          const response = await fetch(url);
          console.log('[ChatPanel] Response status:', response.status, response.statusText);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[ChatPanel] API returned data:', data);
            console.log('[ChatPanel] Number of messages in response:', data.messages?.length || 0);
            
            const loadedMessages: Message[] = data.messages.map((msg: any) => ({
              id: `msg-${msg.id}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt),
              status: 'delivered' as const,
              attachments: msg.attachments,
            }));
            console.log('[ChatPanel] Mapped messages:', loadedMessages);
            console.log('[ChatPanel] Setting', loadedMessages.length, 'messages for conversation:', selectedConversationId);
            setMessages(loadedMessages);
            console.log('[ChatPanel] Messages state updated');
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log('[ChatPanel] Failed to load conversation:', selectedConversationId, 'status:', response.status, 'error:', errorData);
          }
        } catch (error) {
          console.error('[ChatPanel] Error loading conversation:', error);
        }
      };
      loadMessages();
    }
  }, [selectedConversationId]);

  const handleSend = useCallback(async (content: string, attachments?: { filename: string; sizeBytes: number }[]) => {
    // Don't allow empty messages (unless it's from the auto-send-files event which is handled separately)
    if (!content.trim()) {
      return;
    }
    
    let activeConversationId = selectedConversationId;
    
    // If in draft mode, create a conversation first
    if (isDraft) {
      try {
        const conversationTitle = content.substring(0, 50) || 'New chat';
        
        const createResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: conversationTitle }),
        });
        
        if (!createResponse.ok) {
          throw new Error('Failed to create conversation');
        }
        
        const newConv = await createResponse.json();
        activeConversationId = newConv.id;
        onConversationCreated(newConv.id);
      } catch (error) {
        setToast({
          message: 'Failed to create conversation',
          type: 'error',
        });
        return;
      }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
      attachments: attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLastUserMessage(content);
    setInFlightRequest(true);
    setIsStreaming(true);

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Create placeholder assistant message for streaming
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/query-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: content, conversationId: activeConversationId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to get answer' }));
        throw new Error(data.error || 'Failed to get answer');
      }

      // Update user message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'delivered' as const } : msg
        )
      );

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      let buffer = '';
      streamedContentRef.current = ''; // Reset ref

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const data = JSON.parse(line);

            if (data.type === 'delta') {
              // Append streamed chunk to message and ref
              streamedContentRef.current += data.delta;
              const currentContent = streamedContentRef.current;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: currentContent }
                    : msg
                )
              );
            } else if (data.type === 'done') {
              console.log('[ChatPanel] Streaming completed');
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.error('[ChatPanel] Failed to parse stream line:', line, parseError);
          }
        }
      }
      
      // After streaming completes, reload messages from database to ensure sync
      if (activeConversationId) {
        try {
          const response = await fetch(`/api/conversations/${activeConversationId}`);
          if (response.ok) {
            const data = await response.json();
            const loadedMessages: Message[] = data.messages.map((msg: any) => ({
              id: `msg-${msg.id}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt),
              status: 'delivered' as const,
              attachments: msg.attachments,
            }));
            setMessages(loadedMessages);
            console.log('[ChatPanel] Reloaded messages from database after streaming');
          }
        } catch (reloadError) {
          console.error('[ChatPanel] Failed to reload messages:', reloadError);
        }
      }
    } catch (error: any) {
      // Don't show error toast if request was aborted by user
      if (error.name === 'AbortError') {
        console.log('[ChatPanel] Request aborted by user');
        
        // Save partial messages to database using ref value
        const partialAnswer = streamedContentRef.current;
        
        if (partialAnswer.trim().length > 0 && activeConversationId) {
          try {
            await fetch('/api/save-messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: content,
                answer: partialAnswer,
                conversationId: activeConversationId,
              }),
            });
            console.log('[ChatPanel] Saved partial messages after abort');
            
            // Reload messages from database
            const response = await fetch(`/api/conversations/${activeConversationId}`);
            if (response.ok) {
              const data = await response.json();
              const loadedMessages: Message[] = data.messages.map((msg: any) => ({
                id: `msg-${msg.id}`,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.createdAt),
                status: 'delivered' as const,
                attachments: msg.attachments,
              }));
              setMessages(loadedMessages);
            }
          } catch (saveError) {
            console.error('[ChatPanel] Failed to save partial messages:', saveError);
          }
        }
        
        setToast({
          message: 'Generation stopped - partial answer saved',
          type: 'info',
        });
      } else {
        // Remove failed assistant message
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));

        // Update user message status
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id ? { ...msg, status: 'error' as const } : msg
          )
        );

        setToast({
          message: error.message || 'Failed to get answer',
          type: 'error',
        });
      }
    } finally {
      setIsStreaming(false);
      setInFlightRequest(false);
      setAbortController(null);
    }
  }, [selectedConversationId, isDraft, onConversationCreated]);

  const handleRegenerate = useCallback(() => {
    if (lastUserMessage) {
      handleSend(lastUserMessage);
    }
  }, [lastUserMessage, handleSend]);

  const handleStop = useCallback(() => {
    console.log('[ChatPanel] Stop generation requested');
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  const handleUpload = useCallback(async (file: File) => {
    // This is now a no-op stub; InputBar handles uploads directly
    // Keeping for backward compatibility
    return Promise.resolve();
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const handleNewChatClick = useCallback(() => {
    // If current is draft and empty, do nothing
    if (isDraft && messages.length === 0) {
      setToast({
        message: 'Start by typing a message or uploading a file',
        type: 'info',
      });
      return;
    }
    // Otherwise, switch to new draft
    onNewChat();
  }, [isDraft, messages.length, onNewChat]);

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <HeaderBar />
        <ProgressBar visible={inFlightRequest} />
        <MessageList messages={messages} />
        {isTyping && <TypingIndicator />}
        
        {/* Stop button shown while streaming */}
        {isStreaming && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '0.5rem',
            borderTop: '1px solid var(--border)',
          }}>
            <button
              type="button"
              onClick={handleStop}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--error, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ⬛ Stop generating
            </button>
          </div>
        )}
        
        <InputBar
          conversationId={selectedConversationId}
          onSend={handleSend}
          onUpload={handleUpload}
          showToast={showToast}
          disabled={inFlightRequest}
          onEnsureConversation={async () => {
            // Create conversation if in draft mode
            if (isDraft) {
              try {
                const response = await fetch('/api/conversations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: 'New chat' }),
                });
                
                if (!response.ok) throw new Error('Failed to create conversation');
                
                const newConv = await response.json();
                onConversationCreated(newConv.id);
                return newConv.id;
              } catch (error) {
                console.error('Failed to create conversation:', error);
                throw error;
              }
            }
            return selectedConversationId;
          }}
        />
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 1000,
        }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}
    </>
  );
}

