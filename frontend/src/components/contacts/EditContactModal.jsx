import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit3, Save, Smile } from 'lucide-react';
import api from '../../services/api';
import EmojiPickerModal from '../common/EmojiPickerModal';

export default function EditContactModal({ contact, isOpen, onClose, onContactUpdated, onContactDeleted }) {
  const [name, setName] = useState(contact?.contact_name || '');
  const [contactEmoji, setContactEmoji] = useState(contact?.contact_emoji || '👤');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [category, setCategory] = useState(contact?.categories?.[0] || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setName(contact.contact_name || '');
      setContactEmoji(contact.contact_emoji || '👤');
      setCategory(contact.categories?.[0] || '');
      setShowEmojiPicker(false);
    }
  }, [contact]);

  if (!isOpen || !contact) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put(`/contacts/${contact.id}`, {
        contact_name: name.trim(),
        contact_emoji: contactEmoji || null,
        categories: category ? [category] : [],
      });
      if (onContactUpdated) onContactUpdated(res.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${contact.contact_name} from contacts?`)) return;
    try {
      await api.delete(`/contacts/${contact.id}`);
      if (onContactDeleted) onContactDeleted(contact.id);
      onClose();
    } catch (err) {
      alert('Failed to delete contact');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-visible flex flex-col relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2">
            <Edit3 size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Edit Contact</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Contact Display Name & Emoji
            </label>
            <div className="flex space-x-2 relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="w-12 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] hover:border-[var(--accent)] text-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-sm"
                title="Click to choose custom emoji"
              >
                {contactEmoji || '👤'}
              </button>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
              />
              <EmojiPickerModal
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={(emoji) => {
                  setContactEmoji(emoji);
                  setShowEmojiPicker(false);
                }}
                className="top-12 left-0 z-[120]"
              />
            </div>

            {/* Quick Emoji Selection Bar */}
            <div className="flex items-center space-x-1.5 mt-2 overflow-x-auto py-1 no-scrollbar">
              <span className="text-[11px] text-[var(--text-muted)] shrink-0 mr-1">Quick:</span>
              {['👤', '⭐', '❤️', '🎉', '💼', '🏡', '🔥', '✨', '👑', '🚀', '💬'].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setContactEmoji(em);
                    setShowEmojiPicker(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                    contactEmoji === em
                      ? 'bg-[var(--accent)] text-white scale-110 shadow-sm'
                      : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {em}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`px-2 h-7 rounded-lg text-[11px] font-semibold flex items-center space-x-1 border cursor-pointer transition-all shrink-0 ${
                  showEmojiPicker
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Smile size={13} />
                <span>More</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
            >
              <option value="">None</option>
              <option value="Favorites">⭐ Favorites</option>
              <option value="Friends">🎉 Friends</option>
              <option value="Family">🏡 Family</option>
              <option value="Personal">💬 Personal</option>
              <option value="Business">💼 Business</option>
            </select>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Phone Number: <span className="font-mono">{contact.phone_number}</span>
          </p>

          <div className="pt-4 flex items-center justify-between border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Trash2 size={16} />
              <span>Delete Contact</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <Save size={16} />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
