'use client';

import { useState, useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator, useOthersTyping } from '@/hooks/useTypingIndicator';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import ChatMessage, { MessageStatus } from '@/components/ChatMessage';
import { Message } from '@/types/conversation';

interface OptimisticMessage extends Message {
  optimistic: boolean;
  status: MessageStatus;
  tempId: string;
}

/**
 * FloatingChatButton - WhatsApp-style chat window
 * Customer: Direct chat with seller (conversation auto-created on first message)
 * Seller: Can view list of customer chats
 */
export default function FloatingChatButton({ 
  userId, 
  userRole 
}: { 
  userId: string | null;
  userRole?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages: realMessages, loading: loadingMessages } = useMessages(
    conversationId || null, 
    userId || null
  );

  // Typing indicators (simplified - no Firestore, just local state)
  const { setTyping } = useTypingIndicator(conversationId, userId);
  const isOtherTyping = useOthersTyping();

  // Track unread messages and play sounds even when chat is closed
  useUnreadMessages(userId, userRole, unreadCount);

  // Combine real and optimistic messages
  const allMessages = [...realMessages, ...optimisticMessages].sort((a, b) => a.timestamp - b.timestamp);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Remove optimistic messages once real messages arrive
  useEffect(() => {
    if (realMessages.length > 0 && optimisticMessages.length > 0) {
      setOptimisticMessages(prev => 
        prev.filter(opt => {
          // Check if a real message exists with same text and similar timestamp (within 10 seconds)
          const hasRealMatch = realMessages.some(real => 
            real.text === opt.text && 
            real.senderId === opt.senderId &&
            Math.abs(real.timestamp - opt.timestamp) < 10000
          );
          return !hasRealMatch;
        })
      );
    }
  }, [realMessages, optimisticMessages.length]);

  // Fetch or create conversation + track unread counts
  useEffect(() => {
    if (!userId) return;
    
    const initConversation = async () => {
      try {
        // For customers, get/create conversation with their seller
        if (userRole === 'customer') {
          const response = await fetch('/api/conversations/get-or-create-seller-chat', {
            method: 'POST'
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Set conversation ID only if chat is open
            if (isOpen) {
              setConversationId(data.conversationId);
              setSelectedConversation(data.conversation);
              setShowConversationList(false);
              
              // Mark messages as read when customer opens chat
              if (data.conversationId) {
                try {
                  await fetch(`/api/conversations/${data.conversationId}/messages`, {
                    method: 'PATCH'
                  });
                  setUnreadCount(0); // Reset immediately
                } catch (error) {
                  console.error('Error marking messages as read:', error);
                }
              }
            }
            
            // Always update unread count (even when closed)
            const customerUnreadCount = data.conversation?.unreadCount?.[userId] || 0;
            setUnreadCount(customerUnreadCount);
          }
        } 
        // For sellers, fetch all customer conversations
        else if (userRole === 'seller') {
          const response = await fetch('/api/conversations?status=active&limit=50');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.conversations) {
              setConversations(data.conversations);
              
              if (isOpen) {
                setShowConversationList(true);
              }
              
              // Calculate unread count (always, even when closed)
              let total = 0;
              data.conversations.forEach((conv: any) => {
                total += conv.unreadCount?.[userId] || 0;
              });
              setUnreadCount(total);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initConversation();
    
    // Refresh every 5 seconds (more frequent for better unread tracking)
    const interval = setInterval(initConversation, 5000);
    return () => clearInterval(interval);
  }, [userId, userRole, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!messageText.trim() || sending || !userId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      conversationId: conversationId || '',
      senderId: userId,
      senderName: 'You',
      senderRole: (userRole as any) || 'customer',
      text: messageText.trim(),
      type: 'text',
      isRead: false,
      readBy: [userId],
      timestamp: Date.now(),
      createdAt: Date.now(),
      optimistic: true,
      status: 'sending'
    };

    // Add optimistic message immediately
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    const messageToSend = messageText.trim();
    setMessageText('');
    setSending(true);

    // If no conversation yet, create one (for customer first message)
    if (!conversationId && userRole === 'customer') {
      try {
        const response = await fetch('/api/conversations/get-or-create-seller-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initialMessage: messageToSend })
        });
        
        if (response.ok) {
          const data = await response.json();
          setConversationId(data.conversationId);
          setSelectedConversation(data.conversation);
          // Update optimistic message to 'sent' status
          // It will be automatically removed when real message arrives from polling
          setOptimisticMessages(prev => 
            prev.map(m => m.tempId === tempId ? { ...m, status: 'sent' as MessageStatus } : m)
          );
        } else {
          throw new Error('Failed to create conversation');
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        // Mark as failed
        setOptimisticMessages(prev => 
          prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' as MessageStatus } : m)
        );
      } finally {
        setSending(false);
      }
      return;
    }

    // Send message to existing conversation
    if (conversationId) {
      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: messageToSend })
        });

        if (response.ok) {
          // Message sent successfully - update status to 'sent'
          // The optimistic message will be automatically removed when real message arrives
          setOptimisticMessages(prev => 
            prev.map(m => m.tempId === tempId ? { ...m, status: 'sent' as MessageStatus } : m)
          );
        } else {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Mark as failed
        setOptimisticMessages(prev => 
          prev.map(m => m.tempId === tempId ? { ...m, status: 'failed' as MessageStatus } : m)
        );
      } finally {
        setSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = async (conv: any) => {
    setConversationId(conv.id);
    setSelectedConversation(conv);
    setShowConversationList(false);
    
    // Mark messages as read
    try {
      await fetch(`/api/conversations/${conv.id}/messages`, {
        method: 'PATCH'
      });
      // Update local state immediately
      setUnreadCount(prev => {
        const convUnread = conv.unreadCount?.[userId!] || 0;
        return Math.max(0, prev - convUnread);
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleBackToList = () => {
    setConversationId(null);
    setSelectedConversation(null);
    setShowConversationList(true);
  };

  if (!userId) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
          unreadCount > 0 ? 'animate-pulse' : ''
        }`}
        aria-label="Open chat"
      >
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[20px] sm:min-w-[24px] shadow-md animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-transparent z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Window */}
          <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-md bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200 flex flex-col h-[500px]">
            
            {/* SELLER: Conversation List View */}
            {userRole === 'seller' && showConversationList && (
              <>
                {/* Header */}
                <div className="bg-blue-600 text-white p-3 sm:p-4 flex justify-between items-center flex-shrink-0">
                  <h3 className="text-base sm:text-lg font-semibold">Customer Chats</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors p-1"
                    aria-label="Close chat"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center text-gray-500">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-base sm:text-lg font-medium mb-2">No conversations yet</p>
                      <p className="text-xs sm:text-sm">Waiting for customer messages</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {conversations.map((conversation) => {
                        const userUnreadCount = conversation.unreadCount?.[userId!] || 0;
                        return (
                          <li
                            key={conversation.id}
                            onClick={() => handleSelectConversation(conversation)}
                            className="p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {conversation.participantNames?.[conversation.participants.find((p: string) => p !== userId)] || 'Customer'}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 truncate mt-1">
                                  {conversation.lastMessage?.text || 'No messages yet'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {conversation.updatedAt
                                    ? new Date(conversation.updatedAt).toLocaleDateString()
                                    : ''}
                                </p>
                              </div>
                              {userUnreadCount > 0 && (
                                <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                                  {userUnreadCount}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}

            {/* CUSTOMER or SELLER with selected conversation: Chat View */}
            {((userRole === 'customer' && !showConversationList) || (userRole === 'seller' && !showConversationList && conversationId)) && (
              <>
                {/* Header */}
                <div className="bg-blue-600 text-white p-3 sm:p-4 flex items-center gap-3 flex-shrink-0">
                  {userRole === 'seller' && (
                    <button
                      onClick={handleBackToList}
                      className="text-white hover:text-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold">
                      {userRole === 'customer' ? 'Chat with Seller' : selectedConversation?.participantNames?.[selectedConversation.participants.find((p: string) => p !== userId)] || 'Customer'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors p-1"
                    aria-label="Close chat"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : allMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {allMessages.map((message) => {
                        const isCurrentUser = message.senderId === userId;
                        const isOptimistic = 'optimistic' in message && (message as OptimisticMessage).optimistic;
                        const status = 'status' in message ? (message as OptimisticMessage).status : 'delivered';
                        
                        return (
                          <ChatMessage
                            key={message.id}
                            message={message}
                            isCurrentUser={isCurrentUser}
                            showSenderName={!isCurrentUser && userRole === 'seller'}
                            status={status}
                            isOptimistic={isOptimistic}
                          />
                        );
                      })}
                      {isOtherTyping && !sending && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 rounded-bl-none">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        // Trigger typing indicator
                        if (e.target.value.length > 0) {
                          setTyping(true);
                        } else {
                          setTyping(false);
                        }
                      }}
                      onKeyPress={handleKeyPress}
                      onBlur={() => setTyping(false)}
                      placeholder="Type a message..."
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
