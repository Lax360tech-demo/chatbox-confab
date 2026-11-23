import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  Pin,
  Star,
  MoreVertical,
  Reply,
  Copy,
  Edit2,
  Trash2,
  Download,
  FileText,
  Play,
  Pause,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SignatureEmoji from '../common/SignatureEmoji';
import Avatar from '../common/Avatar';
import PollCard from './PollCard';
import ImageLightboxModal from '../common/ImageLightboxModal';
import { formatTime, formatFileSize, formatDuration } from '../../utils/formatters';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🙏'];

export default function MessageBubble({
  message,
  isGroup,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onStar,
  onReact,
}) {
  const { user } = useAuth();
  const isMe = message.sender_id === user?.id;
  const [showMenu, setShowMenu] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const toggleAudio = (url) => {
    if (!audioPlayer) {
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
      setAudioPlayer(audio);
      setIsPlayingAudio(true);
    } else {
      if (isPlayingAudio) {
        audioPlayer.pause();
        setIsPlayingAudio(false);
      } else {
        audioPlayer.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard?.writeText(message.content);
      alert('Message copied to clipboard');
    }
  };

  // Status check icons
  const renderStatus = () => {
    if (!isMe) return null;
    const isRead = message.read_by?.length > 1;
    const isDelivered = message.delivered_to?.length > 1;

    if (message.status === 'sending') {
      return <Clock size={12} className="text-[var(--text-muted)]" />;
    } else if (isRead) {
      return <CheckCheck size={14} className="text-sky-400" />;
    } else if (isDelivered) {
      return <CheckCheck size={14} className="text-white/70" />;
    } else {
      return <Check size={14} className="text-white/70" />;
    }
  };

  return (
    <div
      className={`relative group flex flex-col mb-2.5 px-4 ${
        isMe ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Sender name for group chats if other person */}
      {!isMe && isGroup && (
        <div className="flex items-center space-x-1.5 mb-1 pl-1">
          <Avatar src={message.sender_avatar} name={message.sender_name} size="xs" />
          <span className="text-xs font-semibold text-[var(--accent)]">{message.sender_name}</span>
          <SignatureEmoji emoji={message.sender_emoji} />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm transition-all ${
          isMe
            ? 'bg-[var(--bubble-me)] text-[var(--bubble-me-text)] rounded-tr-sm'
            : 'bg-[var(--bubble-other)] text-[var(--bubble-other-text)] rounded-tl-sm border border-[var(--border-subtle)]'
        }`}
      >
        {/* Pinned & Starred Badges */}
        <div className="flex items-center space-x-1.5 mb-1">
          {message.is_pinned && (
            <span className="flex items-center space-x-1 text-[10px] font-semibold text-amber-300">
              <Pin size={10} className="fill-amber-300" />
              <span>Pinned</span>
            </span>
          )}
          {message.is_starred && (
            <Star size={10} className="fill-amber-400 text-amber-400" />
          )}
        </div>

        {/* Reply Preview */}
        {message.reply_to && (
          <div
            className={`mb-2 p-2 rounded-xl text-xs border-l-4 border-[var(--accent)] ${
              isMe ? 'bg-black/20 text-white/90' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
            }`}
          >
            <p className="font-bold text-[var(--accent)] text-[11px]">{message.reply_to.sender_name}</p>
            <p className="truncate opacity-80">{message.reply_to.content || `[${message.reply_to.message_type}]`}</p>
          </div>
        )}

        {/* Content by Message Type */}
        {message.message_type === 'text' && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.message_type === 'image' && (
          <div className="rounded-xl overflow-hidden my-1">
            <img
              src={message.attachment?.url}
              alt="Shared Photo"
              className="max-h-80 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => setIsLightboxOpen(true)}
            />
            {message.content && <p className="text-sm mt-2 whitespace-pre-wrap">{message.content}</p>}
            <ImageLightboxModal
              isOpen={isLightboxOpen}
              src={message.attachment?.url}
              alt={message.content || 'Shared Photo'}
              onClose={() => setIsLightboxOpen(false)}
            />
          </div>
        )}

        {message.message_type === 'video' && (
          <div className="rounded-xl overflow-hidden my-1">
            <video
              src={message.attachment?.url}
              controls
              className="max-h-80 w-full rounded-xl bg-black"
            />
            {message.content && <p className="text-sm mt-2 whitespace-pre-wrap">{message.content}</p>}
          </div>
        )}

        {message.message_type === 'document' && (
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-black/10 border border-white/10 my-1">
            <div className="p-2.5 rounded-lg bg-[var(--accent)] text-white">
              <FileText size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{message.attachment?.filename || 'Document'}</p>
              <p className="text-[10px] opacity-70">
                {message.attachment?.file_type} • {formatFileSize(message.attachment?.file_size)}
              </p>
            </div>
            <a
              href={message.attachment?.url}
              download={message.attachment?.filename}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg hover:bg-black/20 text-white cursor-pointer"
              title="Download Document"
            >
              <Download size={18} />
            </a>
          </div>
        )}

        {message.message_type === 'voice' && (
          <div className="flex items-center space-x-3 my-1">
            <button
              onClick={() => toggleAudio(message.attachment?.url)}
              className="p-2 rounded-full bg-white/20 text-white hover:scale-105 transition-transform cursor-pointer"
            >
              {isPlayingAudio ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="flex-1">
              <div className="flex items-center space-x-1">
                {[...Array(16)].map((_, i) => (
                  <span
                    key={i}
                    className="w-1 bg-white/60 rounded-full"
                    style={{ height: `${8 + ((i * 7) % 18)}px` }}
                  />
                ))}
              </div>
              <span className="text-[10px] opacity-80 mt-1 block">
                {formatDuration(message.attachment?.duration || 0)}
              </span>
            </div>
          </div>
        )}

        {message.message_type === 'poll' && (
          <PollCard pollId={message.attachment?.poll_id} />
        )}

        {/* Footer: timestamp, (edited) label, status icon */}
        <div
          className={`flex items-center space-x-1.5 mt-1 text-[10px] ${
            isMe ? 'text-white/80 justify-end' : 'text-[var(--text-muted)] justify-end'
          }`}
        >
          {message.is_edited && <span className="italic font-light">(edited)</span>}
          <span>{formatTime(message.created_at)}</span>
          {renderStatus()}
        </div>

        {/* Reactions Summary Footer */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="absolute -bottom-2.5 right-2 flex items-center space-x-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2 py-0.5 rounded-full shadow-sm text-xs cursor-pointer select-none">
            {Object.entries(message.reactions).map(([emoji, userIds]) => (
              <span key={emoji} title={`${userIds.length} reaction(s)`}>
                {emoji} {userIds.length > 1 ? userIds.length : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Floating Hover Actions Bar */}
      <div
        className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] p-1 rounded-2xl shadow-lg z-10 ${
          isMe ? 'right-6' : 'left-6'
        }`}
      >
        {/* Quick Reactions */}
        <div className="flex items-center space-x-0.5 border-r border-[var(--border-subtle)] pr-1 mr-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className="hover:scale-125 transition-transform text-sm p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Action icons */}
        <button
          onClick={() => onReply(message)}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
          title="Reply"
        >
          <Reply size={14} />
        </button>

        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
          title="Copy"
        >
          <Copy size={14} />
        </button>

        <button
          onClick={() => onStar(message.id)}
          className={`p-1.5 rounded-lg cursor-pointer ${
            message.is_starred ? 'text-amber-400' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
          title={message.is_starred ? 'Unstar' : 'Star'}
        >
          <Star size={14} />
        </button>

        <button
          onClick={() => onPin(message.id)}
          className={`p-1.5 rounded-lg cursor-pointer ${
            message.is_pinned ? 'text-amber-300' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
          title={message.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={14} />
        </button>

        {isMe && (
          <button
            onClick={() => onEdit(message)}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        )}

        <button
          onClick={() => onDelete(message.id, isMe)}
          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
