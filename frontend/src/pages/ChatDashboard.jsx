import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Pin,
  VolumeX,
  Sparkles,
  Archive,
  Star,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import RightPanel from '../components/layout/RightPanel';
import ChatArea from '../components/chat/ChatArea';
import ContactList from '../components/contacts/ContactList';
import CallsPage from '../components/calls/CallsPage';
import ChronicleBar from '../components/chronicle/ChronicleBar';
import CreateStoryModal from '../components/chronicle/CreateStoryModal';
import ChronicleViewerModal from '../components/chronicle/ChronicleViewerModal';
import AddContactModal from '../components/contacts/AddContactModal';
import EditContactModal from '../components/contacts/EditContactModal';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import SettingsModal from '../components/settings/SettingsModal';
import CallModal from '../components/calls/CallModal';
import Avatar from '../components/common/Avatar';
import SignatureEmoji from '../components/common/SignatureEmoji';
import { formatTime } from '../utils/formatters';

export default function ChatDashboard() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();

  // Navigation state
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'contacts', 'calls', 'archived', 'starred', 'settings', 'profile'
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState('all'); // 'all', 'unread', 'groups'

  // Modal triggers
  const [showAddContact, setShowAddContact] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStoryData, setActiveStoryData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts');
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await api.get('/contacts/categories/all');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchContacts();
    fetchCategories();
  }, []);

  // Socket events for conversation list updates
  useEffect(() => {
    if (!socket) return;

    socket.on('conversation_update', () => {
      fetchConversations();
    });

    socket.on('group_created', () => {
      fetchConversations();
    });

    return () => {
      socket.off('conversation_update');
      socket.off('group_created');
    };
  }, [socket]);

  // Handle starting a 1-to-1 conversation from contact list
  const handleStartChatWithUser = async (targetUserId) => {
    try {
      const res = await api.post('/conversations', {
        recipient_id: targetUserId,
        type: 'private',
      });
      setSelectedConversation(res.data);
      setActiveTab('chats');
      fetchConversations();
    } catch (err) {
      alert('Failed to start chat');
    }
  };

  // Calculate total unread messages
  const totalUnread = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const isGroup = c.type === 'group';
    const otherPart = !isGroup
      ? c.participant_details?.find((p) => p.id !== user?.id)
      : null;

    const name = isGroup ? c.group_details?.group_name : otherPart?.full_name;
    const matchesSearch = name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'archived') return c.is_archived;
    if (c.is_archived) return false;

    if (chatFilter === 'unread') return matchesSearch && c.unread_count > 0;
    if (chatFilter === 'groups') return matchesSearch && isGroup;
    return matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'settings' || tab === 'profile') {
            setShowSettings(true);
          } else {
            setActiveTab(tab);
          }
        }}
        unreadTotal={totalUnread}
      />

      {/* 2. Middle Panel: Conversations List OR Contacts OR Calls */}
      <div
        className={`${
          selectedConversation && activeTab === 'chats' ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 h-full flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-color)] shrink-0 overflow-hidden select-none`}
      >
        {activeTab === 'chats' || activeTab === 'archived' ? (
          <>
            {/* Top Chronicle Stories Bar */}
            <ChronicleBar
              onOpenCreate={() => setShowCreateStory(true)}
              onOpenViewer={(storyItem) => {
                setActiveStoryData(storyItem);
                setShowStoryViewer(true);
              }}
            />

            {/* Chats List Header */}
            <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                  {activeTab === 'archived' ? 'Archived Chats' : 'Messages'}
                </h2>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title="Create Group"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center space-x-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: 'Unread' },
                  { id: 'groups', label: 'Groups' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setChatFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      chatFilter === f.id
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
                  <MessageSquare size={32} className="mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">No conversations</p>
                  <p className="text-[11px] mt-1">Start a conversation from your contacts.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isGroup = conv.type === 'group';
                  const otherPart = !isGroup
                    ? conv.participant_details?.find((p) => p.id !== user?.id)
                    : null;

                  const title = isGroup ? conv.group_details?.group_name : otherPart?.full_name;
                  const avatar = isGroup ? conv.group_details?.group_picture : otherPart?.profile_picture;
                  const emoji = isGroup ? '👥' : otherPart?.signature_emoji;
                  const isOnline = !isGroup && (onlineUsers.has(otherPart?.id) || otherPart?.online_status);
                  const isSelected = selectedConversation?.id === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3.5 flex items-center space-x-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-light)] border-l-4 border-[var(--accent)]'
                          : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <Avatar
                        src={avatar}
                        name={title}
                        size="md"
                        isOnline={isOnline}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center space-x-1 min-w-0">
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {title}
                            </span>
                            <SignatureEmoji emoji={emoji} />
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0 ml-1">
                            {formatTime(conv.last_message?.created_at || conv.updated_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">
                            {conv.last_message?.content || 'No messages yet'}
                          </p>

                          <div className="flex items-center space-x-1 shrink-0 ml-2">
                            {conv.is_pinned && <Pin size={12} className="text-amber-300" />}
                            {conv.is_muted && <VolumeX size={12} className="text-[var(--text-muted)]" />}
                            {conv.unread_count > 0 && (
                              <span className="min-w-[18px] h-4 px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : activeTab === 'contacts' ? (
          <ContactList
            contacts={contacts}
            categories={categories}
            onAddContact={() => setShowAddContact(true)}
            onEditContact={(contact) => {
              setEditingContact(contact);
              setShowEditContact(true);
            }}
            onStartChat={handleStartChatWithUser}
            onManageCategories={() => {}}
          />
        ) : activeTab === 'calls' ? (
          <CallsPage />
        ) : null}
      </div>

      {/* 3. Main Chat Window */}
      <div
        className={`${
          selectedConversation && activeTab === 'chats' ? 'flex' : 'hidden md:flex'
        } flex-1 h-full overflow-hidden flex-col bg-[var(--bg-main)]`}
      >
        {selectedConversation ? (
          <ChatArea
            conversation={selectedConversation}
            onBack={() => setSelectedConversation(null)}
            onOpenDetails={() => setShowRightPanel(!showRightPanel)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 text-white flex items-center justify-center mb-4 shadow-xl shadow-[var(--accent)]/20 animate-pulse">
              <Sparkles size={40} />
            </div>
            <h3 className="text-2xl font-black text-[var(--text-primary)]">CONFAB</h3>
            <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mt-1">
              Connect Beyond Conversations
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mt-3 leading-relaxed">
              Select a conversation from the sidebar or start a new chat with your contacts to begin messaging in real time.
            </p>
          </div>
        )}
      </div>

      {/* 4. Optional Right Panel (Contact or Group Details) */}
      {showRightPanel && selectedConversation && (
        <RightPanel
          conversation={selectedConversation}
          onClose={() => setShowRightPanel(false)}
          onGroupUpdated={fetchConversations}
        />
      )}

      {/* 5. Modals and Call Overlays */}
      <CallModal />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onContactAdded={() => {
          fetchContacts();
          fetchConversations();
        }}
        onStartChat={handleStartChatWithUser}
      />

      <EditContactModal
        contact={editingContact}
        isOpen={showEditContact}
        onClose={() => setShowEditContact(false)}
        onContactUpdated={() => {
          fetchContacts();
          fetchConversations();
        }}
        onContactDeleted={() => {
          fetchContacts();
          fetchConversations();
        }}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        contacts={contacts}
        onGroupCreated={(newGroup) => {
          fetchConversations();
        }}
      />

      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {}}
      />

      <ChronicleViewerModal
        isOpen={showStoryViewer}
        onClose={() => setShowStoryViewer(false)}
        data={activeStoryData}
        onReplyToStory={async ({ recipientId, content }) => {
          try {
            const res = await api.post('/conversations', { recipient_id: recipientId, type: 'private' });
            setSelectedConversation(res.data);
            setActiveTab('chats');
            await api.post('/messages', { conversation_id: res.data.id, message_type: 'text', content });
          } catch {}
        }}
      />
    </div>
  );
}
