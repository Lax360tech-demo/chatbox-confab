import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

export default function ImageLightboxModal({ isOpen, src, alt = 'Image preview', onClose, allowDownload = true }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = (e) => {
    e.stopPropagation();
    setScale(1);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = alt.replace(/\s+/g, '_') || 'confab_image';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none cursor-zoom-out"
    >
      {/* Top Floating Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center space-x-2 bg-neutral-900/80 border border-white/10 rounded-2xl px-3 py-1.5 text-white shadow-2xl backdrop-blur-md z-10 cursor-default"
      >
        <button
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="p-1.5 hover:bg-white/10 rounded-xl transition disabled:opacity-30 cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-mono px-1 min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="p-1.5 hover:bg-white/10 rounded-xl transition disabled:opacity-30 cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer"
          title="Reset Zoom"
        >
          <RotateCcw size={17} />
        </button>
        {allowDownload && (
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/10 rounded-xl transition cursor-pointer text-emerald-400"
            title="Download Image"
          >
            <Download size={18} />
          </button>
        )}
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-rose-500/30 text-rose-300 rounded-xl transition cursor-pointer"
          title="Close (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center overflow-hidden cursor-default transition-transform duration-150 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl pointer-events-auto"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/600x400?text=Image+Unavailable';
          }}
        />
      </div>
    </div>
  );
}
