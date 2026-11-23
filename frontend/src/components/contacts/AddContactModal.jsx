import React, { useState, useEffect } from 'react';
import { X, UserPlus, MessageCircle, Share2, Check, AlertCircle, Sparkles, Smile } from 'lucide-react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import EmojiPickerModal from '../common/EmojiPickerModal';

export default function AddContactModal({ isOpen, onClose, onContactAdded, onStartChat }) {
  const [name, setName] = useState('');
  const [contactEmoji, setContactEmoji] = useState('👤');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedContact, setSavedContact] = useState(null);
  const [liveCheck, setLiveCheck] = useState({ checking: false, registered: null, user: null });

  // Debounced live registration check while typing phone number
  useEffect(() => {
    const rawDigits = mobileNumber.replace(/\D/g, '');
    if (rawDigits.length < 10) {
      setLiveCheck({ checking: false, registered: null, user: null });
      return;
    }

    const timer = setTimeout(async () => {
      setLiveCheck((prev) => ({ ...prev, checking: true }));
      try {
        const fullPhone = `${countryCode}${rawDigits}`;
        const res = await api.get(`/contacts/check-registration?phone=${encodeURIComponent(fullPhone)}`);
        if (res.data.is_registered) {
          setLiveCheck({ checking: false, registered: true, user: res.data.user });
          if (!name && res.data.user?.full_name) {
            setName(res.data.user.full_name);
          }
        } else {
          setLiveCheck({ checking: false, registered: false, user: null });
        }
      } catch {
        setLiveCheck({ checking: false, registered: null, user: null });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [mobileNumber, countryCode]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/contacts', {
        contact_name: name.trim(),
        contact_emoji: contactEmoji || null,
        country_code: countryCode.trim(),
        mobile_number: mobileNumber.trim(),
        categories: category ? [category] : [],
      });

      const contact = res.data;
      setSavedContact(contact);
      if (onContactAdded) onContactAdded(contact);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setContactEmoji('👤');
    setShowEmojiPicker(false);
    setMobileNumber('');
    setCategory('');
    setError('');
    setSavedContact(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-visible flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2">
            <UserPlus size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Add New Contact</h3>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl flex items-center space-x-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {savedContact ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Check size={28} />
              </div>
              <h4 className="text-base font-bold text-[var(--text-primary)]">Contact Saved!</h4>
              
              {/* Profile Card if Registered */}
              {savedContact.registration_status === 'registered' ? (
                <div className="w-full mt-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center">
                  <Avatar
                    src={savedContact.profile_picture}
                    name={savedContact.contact_name}
                    size="lg"
                    isOnline={savedContact.online_status}
                    className="mb-2"
                  />
                  <div className="flex items-center text-base font-bold text-[var(--text-primary)]">
                    <span>{savedContact.contact_name}</span>
                    <SignatureEmoji emoji={savedContact.signature_emoji} />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">@{savedContact.username}</p>
                  <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Confab Member
                  </span>

                  <button
                    onClick={() => {
                      onStartChat(savedContact.registered_user_id);
                      handleReset();
                    }}
                    className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
                  >
                    <MessageCircle size={18} />
                    <span>Start Chat</span>
                  </button>
                </div>
              ) : (
                <div className="w-full mt-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                    {savedContact.contact_name} ({savedContact.phone_number})
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-3">
                    Not on Confab yet
                  </span>
                  <p className="text-xs text-[var(--text-muted)] text-center mb-4">
                    This person hasn't registered on Confab. You will automatically be able to message them as soon as they sign up!
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`Hey! Join me on Confab - Connect Beyond Conversations.`);
                      alert('Invite message copied to clipboard!');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] font-medium flex items-center justify-center space-x-2 border border-[var(--border-color)] cursor-pointer transition-all"
                  >
                    <Share2 size={18} />
                    <span>Invite to Confab</span>
                  </button>
                </div>
              )}

              <button
                onClick={handleReset}
                className="mt-4 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
              >
                Close & Add Another Contact
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Contact Name & Emoji *
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
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
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
                  Mobile Number *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-20 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-center text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    placeholder="+91"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
                  />
                </div>
                {liveCheck.checking && (
                  <p className="text-[11px] text-[var(--accent)] mt-1.5 flex items-center space-x-1 animate-pulse">
                    <span>Checking Confab registration status...</span>
                  </p>
                )}
                {!liveCheck.checking && liveCheck.registered === true && (
                  <div className="mt-2 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                    <span className="flex items-center space-x-1.5 font-medium">
                      <span>✨ On Confab: <b>@{liveCheck.user?.username}</b></span>
                      <SignatureEmoji emoji={liveCheck.user?.signature_emoji} />
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Ready to Chat</span>
                  </div>
                )}
                {!liveCheck.checking && liveCheck.registered === false && (
                  <p className="text-[11px] text-amber-400/90 mt-1.5 flex items-center space-x-1">
                    <span>ℹ️ Not on Confab yet (You can invite them once saved).</span>
                  </p>
                )}
                {!liveCheck.checking && liveCheck.registered === null && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Supports +91 (India) and all international country codes.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Category / List (Optional)
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

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {loading ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
