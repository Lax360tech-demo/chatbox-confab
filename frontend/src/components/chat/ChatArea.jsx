import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Pin,
  Image,
  Sparkles,
  ArrowLeft,
  X,
  Users,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import CustomWallpaperModal from './CustomWallpaperModal';
import { formatTime } from '../../utils/formatters';

export default function ChatArea({
  conversation,
  onBack,
  onOpenDetails,
}) {
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, emitTyping, onlineUsers } = useSocket();
  const { startCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState(conversation?.wallpaper || '');
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState({});

  // Composer reply & edit states
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const conversationId = conversation?.id;

  // Extract recipient details for 1-to-1 chats
  const isGroup = conversation?.type === 'group';
  const otherParticipant = !isGroup
    ? conversation?.participant_details?.find((p) => p.id !== user?.id) || {
        full_name: 'Contact',
        signature_emoji: '🚀',
      }
    : null;

  const chatTitle = isGroup ? conversation?.group_details?.group_name : otherParticipant?.full_name;
  const chatAvatar = isGroup ? conversation?.group_details?.group_picture : otherParticipant?.profile_picture;
  const chatEmoji = isGroup ? '👥' : otherParticipant?.signature_emoji;
  const isOtherOnline = !isGroup && (onlineUsers.has(otherParticipant?.id) || otherParticipant?.online_status);

  // Load messages
  const fetchMessages = async (search = '') => {
    if (!conversationId) return;
    try {
      const url = search
        ? `/messages/${conversationId}?q=${encodeURIComponent(search)}`
        : `/messages/${conversationId}`;
      const res = await api.get(url);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    setWallpaper(conversation?.wallpaper || '');
    fetchMessages();
    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId]);

  // Socket.IO event listeners for real-time messaging
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleReceiveMessage = (newMsg) => {
      if (newMsg.conversation_id === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      }
    };

    const handleMessageEdited = (edited) => {
      setMessages((prev) => prev.map((m) => (m.id === edited.id ? edited : m)));
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.message_id ? { ...m, content: 'This message was deleted.', deleted_for_everyone: true } : m
        )
      );
    };

    const handleMessageReaction = (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.message_id ? { ...m, reactions: data.reactions } : m))
      );
    };

    const handleMessagePinned = (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.message_id ? { ...m, is_pinned: data.is_pinned } : m))
      );
    };

    const handleMessageRead = (data) => {
      if (data.conversation_id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            read_by: [...new Set([...(m.read_by || []), data.read_by_user_id])],
          }))
        );
      }
    };

    const handleUserTyping = (data) => {
      if (data.conversation_id === conversationId && data.user_id !== user?.id) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.user_id]: data.is_typing ? data.user_name : null,
        }));
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_reaction', handleMessageReaction);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_read', handleMessageRead);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_reaction', handleMessageReaction);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_read', handleMessageRead);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, conversationId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (payload) => {
    try {
      const res = await api.post('/messages', {
        conversation_id: conversationId,
        ...payload,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      scrollToBottom();
    } catch (err) {
      alert('Failed to send message');
    }
  };

  const handleSaveEdit = async (messageId, newContent) => {
    try {
      const res = await api.put(`/messages/${messageId}`, { content: newContent });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? res.data : m)));
      setEditingMessage(null);
    } catch {
      alert('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId, isSender) => {
    const deleteFor = isSender
      ? window.confirm('Delete for everyone? Click Cancel to delete only for yourself.')
        ? 'everyone'
        : 'me'
      : 'me';

    try {
      await api.delete(`/messages/${messageId}`, { data: { delete_for: deleteFor } });
      if (deleteFor === 'me') {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch {
      alert('Failed to delete message');
    }
  };

  const handleTogglePin = async (messageId) => {
    try {
      await api.post(`/messages/${messageId}/pin`);
    } catch {
      alert('Failed to pin message');
    }
  };

  const handleToggleStar = async (messageId) => {
    try {
      const res = await api.post(`/messages/${messageId}/star`);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_starred: res.data.is_starred } : m))
      );
    } catch {
      alert('Failed to star message');
    }
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await api.post(`/messages/${messageId}/react`, { emoji });
    } catch {}
  };

  // WebRTC Call Triggers
  const handleStartCall = (callType) => {
    if (isGroup) {
      alert('Group calls are currently in preview. Starting 1-on-1 call with admin.');
      return;
    }
    startCall({
      receiverId: otherParticipant?.id,
      receiverName: otherParticipant?.full_name,
      receiverAvatar: otherParticipant?.profile_picture,
      receiverEmoji: otherParticipant?.signature_emoji,
      conversationId,
      callType,
    });
  };

  // Pinned message list
  const pinnedMessages = messages.filter((m) => m.is_pinned);

  // Active typing status
  const typingNames = Object.values(typingUsers).filter(Boolean);

  return (
    <div
      className="flex-1 h-full flex flex-col bg-cover bg-center overflow-hidden relative"
      style={{
        background: wallpaper || 'var(--bg-main)',
      }}
    >
      {/* Chat Header */}
      <header className="h-16 px-4 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Mobile Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Avatar */}
          <div
            className="cursor-pointer"
            onClick={onOpenDetails}
          >
            <Avatar
              src={chatAvatar}
              name={chatTitle}
              size="md"
              isOnline={isOtherOnline}
            />
          </div>

          {/* Title & Online / Last seen */}
          <div
            className="flex flex-col min-w-0 cursor-pointer"
            onClick={onOpenDetails}
          >
            <div className="flex items-center">
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                {chatTitle}
              </span>
              <SignatureEmoji emoji={chatEmoji} />
            </div>
            <span className="text-[11px] text-[var(--text-muted)] truncate">
              {isGroup ? (
                `${conversation?.group_details?.members_count || 2} members`
              ) : isOtherOnline ? (
                <span className="text-emerald-400 font-semibold">Online</span>
              ) : otherParticipant?.last_seen ? (
                `Last seen ${formatTime(otherParticipant.last_seen)}`
              ) : (
                'Offline'
              )}
            </span>
          </div>
        </div>

        {/* Action Buttons: Audio Call, Video Call, Wallpaper, Search */}
        <div className="flex items-center space-x-1 sm:space-x-2 text-[var(--text-secondary)]">
          {!isGroup && (
            <>
              <button
                type="button"
                onClick={() => handleStartCall('audio')}
                className="p-2 rounded-xl hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Start Audio Call"
              >
                <Phone size={19} />
              </button>

              <button
                type="button"
                onClick={() => handleStartCall('video')}
                className="p-2 rounded-xl hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Start Video Call"
              >
                <Video size={19} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Search Messages"
          >
            <Search size={19} />
          </button>

          <button
            type="button"
            onClick={() => setShowWallpaperModal(true)}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Custom Wallpaper"
          >
            <Sparkles size={19} />
          </button>
        </div>
      </header>

      {/* In-Chat Message Search Bar */}
      {showSearch && (
        <div className="p-2 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center space-x-2 px-4 animate-in slide-in-from-top-2">
          <Search size={16} className="text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search within this chat..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchMessages(e.target.value);
            }}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
              fetchMessages();
            }}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pinned Messages Header Bar */}
      {pinnedMessages.length > 0 && (
        <div className="bg-[var(--bg-card)]/90 backdrop-blur-sm border-b border-[var(--border-subtle)] px-4 py-2 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2 text-xs truncate">
            <Pin size={14} className="text-amber-300 fill-amber-300 shrink-0" />
            <span className="font-semibold text-amber-300">Pinned:</span>
            <span className="text-[var(--text-secondary)] truncate">
              {pinnedMessages[pinnedMessages.length - 1].content || `[${pinnedMessages[pinnedMessages.length - 1].message_type}]`}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
            {pinnedMessages.length} pinned
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 px-2 sm:px-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-muted)]">
            Loading conversations...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[var(--text-muted)]">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mb-3 text-2xl shadow-inner">
              💬
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No messages yet</p>
            <p className="text-xs max-w-xs mt-1">
              Send a friendly greeting or share a photo to connect beyond conversations!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isGroup={isGroup}
              onReply={(m) => setReplyingTo(m)}
              onEdit={(m) => setEditingMessage(m)}
              onDelete={handleDeleteMessage}
              onPin={handleTogglePin}
              onStar={handleToggleStar}
              onReact={handleReact}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingNames.length > 0 && (
        <div className="px-6 py-1 text-xs text-[var(--accent)] italic flex items-center space-x-1.5 animate-pulse bg-[var(--bg-secondary)]/70">
          <span>{typingNames.join(', ')} is typing...</span>
        </div>
      )}

      {/* Message Composer Area */}
      <MessageComposer
        conversationId={conversationId}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        onSendMessage={handleSendMessage}
        onSaveEdit={handleSaveEdit}
        onTyping={(isTyping) => emitTyping(conversationId, isTyping)}
      />

      {/* Custom Wallpaper Modal */}
      <CustomWallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        conversationId={conversationId}
        currentWallpaper={wallpaper}
        onWallpaperApplied={(newWp) => setWallpaper(newWp)}
      />
    </div>
  );
}
