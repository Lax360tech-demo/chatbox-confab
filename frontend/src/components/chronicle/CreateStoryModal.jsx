import React, { useState } from 'react';
import { X, Image, Video, Type, Upload, Sparkles } from 'lucide-react';
import api from '../../services/api';

const BG_GRADIENTS = [
  '#1e1b4b',
  '#31103f',
  '#064e3b',
  '#701a75',
  '#1e293b',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

export default function CreateStoryModal({ isOpen, onClose, onStoryCreated }) {
  const [mode, setMode] = useState('text'); // "text", "media"
  const [textContent, setTextContent] = useState('');
  const [bgStyle, setBgStyle] = useState(BG_GRADIENTS[5]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(res.data.url);
      setMediaType(isVid ? 'video' : 'image');
      setMode('media');
    } catch {
      alert('Failed to upload media');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        media_url: mode === 'text' ? 'text_mode' : mediaUrl,
        media_type: mode === 'text' ? 'text' : mediaType,
        caption: mode === 'text' ? textContent.trim() : caption.trim(),
        background_color: bgStyle,
        visibility: 'contacts',
      };

      const res = await api.post('/stories', payload);
      if (onStoryCreated) onStoryCreated(res.data);
      onClose();
    } catch (err) {
      alert('Failed to publish chronicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2">
            <Sparkles size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Add to Chronicle</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              mode === 'text'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Type size={16} />
            <span>Text Chronicle</span>
          </button>
          <label
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              mode === 'media'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Image size={16} />
            <span>Upload Photo/Video</span>
            <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Content Preview */}
        <div className="p-6 space-y-4">
          {mode === 'text' ? (
            <div
              className="w-full h-64 rounded-2xl p-6 flex items-center justify-center text-center shadow-inner relative overflow-hidden transition-all"
              style={{ background: bgStyle }}
            >
              <textarea
                rows={4}
                maxLength={200}
                placeholder="Type your chronicle here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full bg-transparent text-white placeholder-white/60 text-lg font-semibold text-center focus:outline-none resize-none"
              />
              <span className="absolute bottom-3 right-4 text-[10px] text-white/70">
                {textContent.length}/200
              </span>
            </div>
          ) : (
            <div className="w-full h-64 rounded-2xl bg-black overflow-hidden relative flex items-center justify-center">
              {mediaUrl ? (
                mediaType === 'video' ? (
                  <video src={mediaUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                )
              ) : (
                <label className="flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-white cursor-pointer">
                  <Upload size={32} className="mb-2" />
                  <span className="text-xs">Click to select photo or video</span>
                  <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
          )}

          {/* Color palette for text mode */}
          {mode === 'text' && (
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Background Theme
              </p>
              <div className="flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
                {BG_GRADIENTS.map((bg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBgStyle(bg)}
                    style={{ background: bg }}
                    className={`w-7 h-7 rounded-full shrink-0 ring-2 cursor-pointer transition-transform hover:scale-110 ${
                      bgStyle === bg ? 'ring-[var(--accent)] ring-offset-2' : 'ring-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Caption for media mode */}
          {mode === 'media' && (
            <div>
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">
              Expires automatically in 24 hours
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (mode === 'text' && !textContent.trim()) || (mode === 'media' && !mediaUrl)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Sharing...' : 'Share Chronicle'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
