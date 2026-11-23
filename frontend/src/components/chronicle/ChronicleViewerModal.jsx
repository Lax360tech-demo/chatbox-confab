import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Heart, Flame, Send, Pause, Play } from 'lucide-react';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import { formatTime } from '../../utils/formatters';

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '😍'];

export default function ChronicleViewerModal({ data, isOpen, onClose, onReplyToStory }) {
  const stories = data?.stories || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [showViewers, setShowViewers] = useState(false);

  const timerRef = useRef(null);
  const videoRef = useRef(null);

  // Initialize starting index to the first unviewed story (FIFO queue progression)
  useEffect(() => {
    if (isOpen && stories.length > 0) {
      const firstUnviewed = stories.findIndex((s) => !s.has_viewed);
      setCurrentIndex(firstUnviewed !== -1 ? firstUnviewed : 0);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen, data?.userId, data?.user_id]);

  const currentStory = stories[currentIndex];

  // Mark current story as viewed
  useEffect(() => {
    if (!isOpen || !currentStory) return;
    api.post(`/stories/${currentStory.id}/view`).catch(() => {});
    setProgress(0);
  }, [isOpen, currentIndex, currentStory?.id]);

  // Video play/pause synchronization
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, currentIndex]);

  // Progress timer for text & image stories (smooth 40ms interval over 6000ms duration)
  useEffect(() => {
    if (!isOpen || !currentStory || currentStory.media_type === 'video') return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = 40;
    const durationMs = 6000;
    const step = (intervalMs / durationMs) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          handleNext();
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentIndex, isPaused, currentStory?.id, stories.length]);

  if (!isOpen || !currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleReact = async (emoji) => {
    try {
      await api.post(`/stories/${currentStory.id}/react`, { emoji });
    } catch {}
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onReplyToStory) {
      onReplyToStory({
        recipientId: data.userId || data.user_id,
        content: `Replied to your chronicle: "${replyText.trim()}"`,
      });
    }
    setReplyText('');
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this chronicle?')) return;
    try {
      await api.delete(`/stories/${currentStory.id}`);
      onClose();
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-sm sm:max-w-md h-full sm:h-[88vh] bg-black sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
        {/* Top Progress Bars with smooth synchronized elapsed width */}
        <div className="absolute top-3 left-4 right-4 z-30 flex items-center space-x-1.5">
          {stories.map((s, idx) => (
            <div key={s.id || idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-[width] ease-linear duration-75"
                style={{
                  width:
                    idx < currentIndex
                      ? '100%'
                      : idx === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top User Info Bar & Controls */}
        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between text-white drop-shadow">
          <div className="flex items-center space-x-3">
            <Avatar src={data.user_avatar} name={data.user_name} size="sm" allowDownload={false} />
            <div>
              <div className="flex items-center text-sm font-bold text-white">
                <span>{data.user_name}</span>
                <SignatureEmoji emoji={data.user_emoji} />
              </div>
              <span className="text-[10px] text-white/80">{formatTime(currentStory.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Play / Pause Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused((prev) => !prev);
              }}
              className="p-2 rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors"
              title={isPaused ? 'Resume Playback' : 'Pause Playback'}
            >
              {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
            </button>

            {data.isMine && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-full hover:bg-white/20 text-rose-400 cursor-pointer transition-colors"
                title="Delete chronicle"
              >
                <Trash2 size={18} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Center Story Content */}
        <div
          className="relative w-full flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Previous / Next click zones */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-1/3 z-20"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />

          {currentStory.media_type === 'text' ? (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-white"
              style={{ background: currentStory.background_color || '#1e1b4b' }}
            >
              <p className="text-2xl font-bold leading-relaxed max-w-xs">{currentStory.caption}</p>
            </div>
          ) : currentStory.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              autoPlay
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current && videoRef.current.duration) {
                  setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                }
              }}
              onEnded={handleNext}
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Caption banner if media */}
          {currentStory.media_type !== 'text' && currentStory.caption && (
            <div className="absolute bottom-16 left-4 right-4 z-20 p-3 bg-black/60 backdrop-blur-md rounded-2xl text-center text-white text-sm">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Bottom Bar: Reactions & Reply / Viewers */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col space-y-3">
          {data.isMine ? (
            <button
              onClick={() => setShowViewers(!showViewers)}
              className="w-full py-2 flex items-center justify-center space-x-2 text-white/80 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <Eye size={16} />
              <span>{currentStory.viewer_count || 0} Viewers</span>
            </button>
          ) : (
            <>
              {/* Quick Reactions */}
              <div className="flex items-center justify-around">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="text-2xl hover:scale-125 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <form onSubmit={handleSendReply} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Reply to ${data.user_name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2 rounded-full bg-[var(--accent)] text-white hover:scale-105 transition-transform disabled:opacity-40 cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Viewers Drawer for story author */}
        {showViewers && data.isMine && (
          <div className="absolute inset-x-0 bottom-0 max-h-72 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] rounded-t-3xl p-4 z-40 overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                Viewers ({currentStory.viewers?.length || 0})
              </span>
              <button onClick={() => setShowViewers(false)} className="text-[var(--text-muted)] cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="py-2 space-y-2">
              {currentStory.viewers && currentStory.viewers.length > 0 ? (
                currentStory.viewers.map((v, i) => (
                  <div key={i} className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-[var(--bg-hover)]">
                    <Avatar src={v.user_avatar} name={v.user_name} size="xs" allowDownload={false} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{v.user_name}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">No viewers yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
