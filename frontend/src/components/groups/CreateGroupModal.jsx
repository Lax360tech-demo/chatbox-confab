import React, { useState } from 'react';
import { X, Users, Upload, Check, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';

export default function CreateGroupModal({ isOpen, onClose, contacts, onGroupCreated }) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [groupPicture, setGroupPicture] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Only registered contacts can be added to groups
  const registeredContacts = contacts.filter((c) => c.registration_status === 'registered' && c.registered_user_id);

  const toggleSelect = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setGroupPicture(res.data.url);
    } catch {
      alert('Failed to upload group image');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length < 1) {
      setError('Please select at least 1 other registered contact to form a group.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/groups', {
        group_name: groupName.trim(),
        description: description.trim(),
        group_picture: groupPicture,
        member_ids: selectedUserIds,
      });

      if (onGroupCreated) onGroupCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2">
            <Users size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Create New Group</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Picture Upload */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <Avatar src={groupPicture} name={groupName || 'Group'} size="lg" />
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload size={18} />
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Group Icon</p>
              <p className="text-[11px] text-[var(--text-muted)]">Upload a photo to represent your group</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Group Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design Enthusiasts 🎨"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Select Members ({selectedUserIds.length} selected)
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">Registered contacts only</span>
            </div>

            {registeredContacts.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] p-3 text-center bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                No registered contacts found. Add contacts with registered Confab numbers first.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[var(--border-subtle)] rounded-xl p-2 bg-[var(--bg-card)]">
                {registeredContacts.map((contact) => {
                  const isSelected = selectedUserIds.includes(contact.registered_user_id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleSelect(contact.registered_user_id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected ? 'bg-[var(--accent-light)] border border-[var(--accent)]' : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar src={contact.profile_picture} name={contact.contact_name} size="sm" />
                        <div>
                          <div className="flex items-center text-xs font-bold text-[var(--text-primary)]">
                            <span>{contact.contact_name}</span>
                            <SignatureEmoji emoji={contact.signature_emoji} />
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]">@{contact.username}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : 'border-[var(--border-color)]'
                        }`}
                      >
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 flex justify-end space-x-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUserIds.length < 1}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
