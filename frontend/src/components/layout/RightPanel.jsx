import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Video,
  ShieldCheck,
  UserPlus,
  UserMinus,
  LogOut,
  FileText,
  Image,
  Bell,
  Trash2,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import api from '../../services/api';

export default function RightPanel({ conversation, onClose, onGroupUpdated }) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'media'
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [contacts, setContacts] = useState([]);

  const isGroup = conversation?.type === 'group';

  // For 1-on-1 chats:
  const otherParticipant = !isGroup
    ? conversation?.participant_details?.find((p) => p.id !== user?.id)
    : null;

  // Fetch group data if group
  const fetchGroup = async () => {
    if (isGroup && conversation?.group_id) {
      try {
        const res = await api.get(`/groups/${conversation.group_id}`);
        setGroup(res.data);
      } catch {}
    }
  };

  useEffect(() => {
    fetchGroup();
    if (isGroup) {
      api.get('/contacts').then((res) => {
        setContacts(res.data.filter((c) => c.registration_status === 'registered'));
      }).catch(() => {});
    }
  }, [conversation?.id]);

  if (!conversation) return null;

  const isAdmin = isGroup && (group?.admins?.includes(user?.id) || group?.creator_id === user?.id);

  const handleAddMember = async (targetUserId) => {
    try {
      await api.post(`/groups/${conversation.group_id}/members`, { user_id: targetUserId });
      fetchGroup();
      setShowAddMember(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Remove this member from group?')) return;
    try {
      await api.delete(`/groups/${conversation.group_id}/members/${targetUserId}`);
      fetchGroup();
    } catch {
      alert('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await api.post(`/groups/${conversation.group_id}/leave`);
      onClose();
      window.location.reload();
    } catch {
      alert('Failed to leave group');
    }
  };

  return (
    <aside className="w-80 h-full bg-[var(--bg-secondary)] border-l border-[var(--border-color)] flex flex-col overflow-hidden shrink-0 z-20 animate-in slide-in-from-right duration-150">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <h4 className="text-sm font-bold text-[var(--text-primary)]">
          {isGroup ? 'Group Information' : 'Contact Details'}
        </h4>
        <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer">
          <X size={18} />
        </button>
      </div>

      {/* Main Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex flex-col items-center text-center">
          <Avatar
            src={isGroup ? group?.group_picture : otherParticipant?.profile_picture}
            name={isGroup ? group?.group_name : otherParticipant?.full_name}
            size="xl"
            zoomable={true}
            className="mb-3"
          />
          <div className="flex items-center text-base font-bold text-[var(--text-primary)]">
            <span>{isGroup ? group?.group_name : otherParticipant?.full_name}</span>
            <SignatureEmoji emoji={isGroup ? '👥' : otherParticipant?.signature_emoji} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isGroup ? `${group?.members?.length || 0} members` : `@${otherParticipant?.username || 'user'}`}
          </p>

          {!isGroup && (
            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={() =>
                  startCall({
                    receiverId: otherParticipant?.id,
                    receiverName: otherParticipant?.full_name,
                    receiverAvatar: otherParticipant?.profile_picture,
                    receiverEmoji: otherParticipant?.signature_emoji,
                    conversationId: conversation.id,
                    callType: 'audio',
                  })
                }
                className="p-3 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] border border-[var(--border-color)] transition-colors cursor-pointer"
                title="Audio Call"
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() =>
                  startCall({
                    receiverId: otherParticipant?.id,
                    receiverName: otherParticipant?.full_name,
                    receiverAvatar: otherParticipant?.profile_picture,
                    receiverEmoji: otherParticipant?.signature_emoji,
                    conversationId: conversation.id,
                    callType: 'video',
                  })
                }
                className="p-3 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] border border-[var(--border-color)] transition-colors cursor-pointer"
                title="Video Call"
              >
                <Video size={18} />
              </button>
            </div>
          )}
        </div>

        {/* About / Description */}
        <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            {isGroup ? 'Group Description' : 'About'}
          </span>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {isGroup
              ? group?.description || 'No description provided.'
              : otherParticipant?.about || 'Hey there! I am using Confab.'}
          </p>
        </div>

        {/* Group Members List */}
        {isGroup && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Members ({group?.member_details?.length || 0})
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="text-xs text-[var(--accent)] font-semibold flex items-center space-x-1 hover:underline cursor-pointer"
                >
                  <UserPlus size={13} />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Add Member Dropdown */}
            {showAddMember && (
              <div className="mb-3 p-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] block">Select contact to add:</span>
                {contacts
                  .filter((c) => !group?.members?.includes(c.registered_user_id))
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleAddMember(c.registered_user_id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] flex items-center justify-between cursor-pointer text-xs"
                    >
                      <span className="font-semibold text-[var(--text-primary)]">{c.contact_name}</span>
                      <span className="text-[10px] text-[var(--accent)]">+ Add</span>
                    </div>
                  ))}
              </div>
            )}

            <div className="space-y-1.5">
              {group?.member_details?.map((m) => {
                const isMemberAdmin = m.role === 'admin' || m.role === 'creator';
                const canRemove = isAdmin && m.id !== user?.id && m.role !== 'creator';
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Avatar src={m.profile_picture} name={m.full_name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center text-xs font-bold text-[var(--text-primary)]">
                          <span>{m.full_name}</span>
                          <SignatureEmoji emoji={m.signature_emoji} />
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]">@{m.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isMemberAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                          {m.role === 'creator' ? 'Creator' : 'Admin'}
                        </span>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                          title="Remove member"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leave group button */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={handleLeaveGroup}
                className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <LogOut size={15} />
                <span>Leave Group</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
