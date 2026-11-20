import React, { useState } from 'react';
import { X, Check, Image, Sparkles } from 'lucide-react';
import api from '../../services/api';

const SOLID_WALLPAPERS = [
  '#0b0f17',
  '#111827',
  '#0f172a',
  '#1e1b4b',
  '#064e3b',
  '#2a0845',
  '#f8fafc',
  '#ffffff',
];

const GRADIENT_WALLPAPERS = [
  'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0b0f17 100%)',
  'radial-gradient(circle at 10% 20%, #172554 0%, #0b0f17 90%)',
  'radial-gradient(circle at 80% 80%, #31103f 0%, #0b0f17 90%)',
  'radial-gradient(circle at 50% 10%, #064e3b 0%, #0b0f17 90%)',
  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
];

export default function CustomWallpaperModal({ isOpen, onClose, conversationId, currentWallpaper, onWallpaperApplied }) {
  const [selectedWallpaper, setSelectedWallpaper] = useState(currentWallpaper || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    setLoading(true);
    try {
      await api.put(`/conversations/${conversationId}/settings`, {
        wallpaper: selectedWallpaper,
      });
      if (onWallpaperApplied) onWallpaperApplied(selectedWallpaper);
      onClose();
    } catch {
      alert('Failed to update chat wallpaper');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedWallpaper(`url(${res.data.url})`);
    } catch {
      alert('Failed to upload background image');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center space-x-2">
            <Sparkles size={20} className="text-[var(--accent)]" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Custom Chat Wallpaper</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Preview Container */}
        <div className="p-6 space-y-4">
          <div
            className="w-full h-36 rounded-2xl border border-[var(--border-color)] flex items-center justify-center p-4 shadow-inner relative overflow-hidden transition-all bg-cover bg-center"
            style={{
              background: selectedWallpaper || 'var(--bg-main)',
            }}
          >
            <div className="bg-[var(--bubble-other)] text-[var(--bubble-other-text)] px-3 py-1.5 rounded-2xl text-xs shadow-md border border-white/5">
              Wallpaper Preview 💬
            </div>
          </div>

          {/* Gradients */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Atmospheric Gradients
            </p>
            <div className="grid grid-cols-5 gap-2">
              {GRADIENT_WALLPAPERS.map((bg, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWallpaper(bg)}
                  style={{ background: bg }}
                  className={`h-10 rounded-xl border border-white/10 transition-transform hover:scale-105 cursor-pointer flex items-center justify-center ${
                    selectedWallpaper === bg ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                >
                  {selectedWallpaper === bg && <Check size={14} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Solids */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Solid Colors
            </p>
            <div className="grid grid-cols-8 gap-2">
              {SOLID_WALLPAPERS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWallpaper(color)}
                  style={{ backgroundColor: color }}
                  className={`h-8 rounded-xl border border-white/10 transition-transform hover:scale-105 cursor-pointer flex items-center justify-center ${
                    selectedWallpaper === color ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                >
                  {selectedWallpaper === color && <Check size={12} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Custom Wallpaper */}
          <div className="pt-2">
            <label className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--accent)] flex items-center justify-center space-x-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors bg-[var(--bg-card)]">
              <Image size={16} />
              <span>Upload Custom Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-between border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setSelectedWallpaper('')}
              className="text-xs text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
            >
              Reset to Default
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
                type="button"
                onClick={handleApply}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Applying...' : 'Apply Wallpaper'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
