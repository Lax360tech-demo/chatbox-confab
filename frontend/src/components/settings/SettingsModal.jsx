import React, { useState } from 'react';
import {
  X,
  User,
  Palette,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  Upload,
  Sparkles,
  Check,
  Save,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES } from '../../context/ThemeContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import EmojiPickerModal from '../common/EmojiPickerModal';
import api from '../../services/api';

const SIGNATURE_EMOJI_SUGGESTIONS = ['🔥', '💫', '🌻', '🦋', '🚀', '🎧', '🌙', '⚡', '💎', '👑'];

export default function SettingsModal({ isOpen, onClose }) {
  const { user, updateProfile, logout } = useAuth();
  const { theme, switchTheme } = useTheme();

  const [activeSection, setActiveSection] = useState('account'); // account, appearance, privacy, notifications, help
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [profilePic, setProfilePic] = useState(user?.profile_picture || '');
  const [signatureEmoji, setSignatureEmoji] = useState(user?.signature_emoji || '🚀');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Privacy states
  const [lastSeen, setLastSeen] = useState(user?.privacy_settings?.last_seen || 'everyone');
  const [onlineStatus, setOnlineStatus] = useState(user?.privacy_settings?.online_status || 'everyone');
  const [readReceipts, setReadReceipts] = useState(user?.privacy_settings?.read_receipts ?? true);

  if (!isOpen) return null;

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfilePic(res.data.url);
    } catch {
      alert('Failed to upload profile picture');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (about.length > 150) {
      alert('About section cannot exceed 150 characters');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        username: username.trim(),
        about: about.trim(),
        profile_picture: profilePic,
        signature_emoji: signatureEmoji,
        privacy_settings: {
          last_seen: lastSeen,
          online_status: onlineStatus,
          read_receipts: readReceipts,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl h-[85vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row">
        {/* Left Settings Navigation */}
        <div className="w-full sm:w-56 bg-[var(--bg-card)] border-b sm:border-b-0 sm:border-r border-[var(--border-subtle)] p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Sparkles size={20} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--text-primary)]">Settings</h3>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'account', label: 'Account & Profile', icon: User },
                { id: 'appearance', label: 'Appearance', icon: Palette },
                { id: 'privacy', label: 'Privacy & Security', icon: Shield },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'help', label: 'About Confab', icon: HelpCircle },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Log out from Confab?')) logout();
            }}
            className="w-full mt-4 flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <h4 className="font-bold text-sm text-[var(--text-primary)] capitalize">
              {activeSection} Settings
            </h4>
            <button onClick={onClose} className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {/* Section Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Account & Profile */}
            {activeSection === 'account' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Avatar with Upload */}
                <div className="flex items-center space-x-4">
                  <div className="relative group cursor-pointer">
                    <Avatar src={profilePic} name={fullName} size="xl" />
                    <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Upload size={20} />
                      <span className="text-[9px] mt-1">Change</span>
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[var(--text-primary)] flex items-center">
                      <span>{fullName}</span>
                      <SignatureEmoji emoji={signatureEmoji} />
                    </h5>
                    <p className="text-xs text-[var(--text-muted)]">@{username}</p>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">
                      {user?.phone_number} (Verified)
                    </p>
                  </div>
                </div>

                {/* Signature Emoji Selector */}
                <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center">
                      Signature Emoji <SignatureEmoji emoji={signatureEmoji} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-xs text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      More Emojis
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mb-2">
                    Displayed prominently right next to your display name across Confab.
                  </p>
                  <div className="flex items-center space-x-2">
                    {SIGNATURE_EMOJI_SUGGESTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setSignatureEmoji(em)}
                        className={`text-xl p-1.5 rounded-xl transition-all cursor-pointer hover:scale-125 ${
                          signatureEmoji === em ? 'bg-[var(--accent-light)] ring-2 ring-[var(--accent)]' : ''
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  <EmojiPickerModal
                    isOpen={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                    onSelect={(em) => {
                      setSignatureEmoji(em);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">
                      About / Status
                    </label>
                    <span className={`text-[11px] font-mono ${about.length > 150 ? 'text-rose-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                      {about.length}/150
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={150}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                {saveSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
                    <Sparkles size={16} className="shrink-0" />
                    <span>Profile and status updated successfully!</span>
                  </div>
                )}

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={saving || about.length > 150}
                    className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFullName(user?.full_name || '');
                      setUsername(user?.username || '');
                      setAbout(user?.about || '');
                      setProfilePic(user?.profile_picture || '');
                      setSignatureEmoji(user?.signature_emoji || '🚀');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* 2. Appearance & Five Themes */}
            {activeSection === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                    Application Themes
                  </h5>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    Choose from 5 professionally tuned themes. Your preference is automatically saved to your account.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {THEMES.map((th) => {
                      const isSelected = theme === th.id;
                      return (
                        <div
                          key={th.id}
                          onClick={() => switchTheme(th.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-[var(--accent)] bg-[var(--accent-light)] shadow-sm'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className="w-6 h-6 rounded-full border border-white/20 shadow-inner"
                              style={{ backgroundColor: th.color }}
                            />
                            <div>
                              <p className="text-xs font-bold text-[var(--text-primary)]">{th.name}</p>
                              <span className="text-[10px] text-[var(--text-muted)]">
                                {th.id === 'night' && 'Default dark theme'}
                                {th.id === 'light' && 'Clean daylight aesthetic'}
                                {th.id === 'ocean' && 'Deep sea blues'}
                                {th.id === 'lavender' && 'Soft violet dusk'}
                                {th.id === 'forest' && 'Emerald & moss'}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check size={18} className="text-[var(--accent)]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Privacy Settings */}
            {activeSection === 'privacy' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                    Last Seen & Online
                  </label>
                  <select
                    value={lastSeen}
                    onChange={(e) => setLastSeen(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">Read Receipts</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      If turned off, you won't send or receive read receipts (blue double checks).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Privacy Settings
                </button>
              </div>
            )}

            {/* 4. Notifications */}
            {activeSection === 'notifications' && (
              <div className="space-y-3">
                {[
                  { title: 'Message Notifications', desc: 'Show alerts for new 1-on-1 messages' },
                  { title: 'Group Notifications', desc: 'Show alerts for group messages' },
                  { title: 'Call Ringtone & Sounds', desc: 'Play incoming ringtone and message sounds' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{item.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="w-4 h-4 rounded text-[var(--accent)] cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 5. About Confab */}
            {activeSection === 'help' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 text-white flex items-center justify-center mx-auto shadow-lg">
                  <Sparkles size={32} />
                </div>
                <h4 className="text-lg font-bold text-[var(--text-primary)]">CONFAB</h4>
                <p className="text-xs text-[var(--accent)] font-semibold">Connect Beyond Conversations.</p>
                <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                  Confab is an ultra-modern personal and group communication platform inspired by WhatsApp, Telegram, and Instagram with real-time messaging, WebSockets, WebRTC calling, and 24h Chronicle stories.
                </p>
                <div className="text-[11px] text-[var(--text-muted)] pt-4 border-t border-[var(--border-subtle)]">
                  Version 1.0.0 (Commercial Grade) • Built with FastAPI, MongoDB, React & Tailwind
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
