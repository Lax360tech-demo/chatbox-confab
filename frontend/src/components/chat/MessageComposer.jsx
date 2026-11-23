import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image,
  FileText,
  BarChart2,
  Check,
} from 'lucide-react';
import api from '../../services/api';
import EmojiPickerModal from '../common/EmojiPickerModal';
import VoiceRecorder from './VoiceRecorder';

export default function MessageComposer({
  conversationId,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onSendMessage,
  onSaveEdit,
  onTyping,
}) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);

  // Poll Creator State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
    }
  }, [editingMessage]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleInsertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }
    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setShowEmojiPicker(false);
    setTimeout(() => {
      textarea.focus();
      const cursor = start + emoji.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 10);
  };

  const handleSend = () => {
    if (editingMessage) {
      if (text.trim()) {
        onSaveEdit(editingMessage.id, text.trim());
        setText('');
      }
      return;
    }

    if (text.trim()) {
      onSendMessage({
        message_type: 'text',
        content: text.trim(),
        reply_to: replyingTo?.id || null,
      });
      setText('');
      if (onTyping) onTyping(false);
      if (replyingTo && onCancelReply) onCancelReply();
    }
  };

  const handleKeyDown = (e) => {
    // If selecting emoji via native Windows (Win + .) or mobile IME, don't submit on Enter
    if (e.nativeEvent?.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Upload Media
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSendMessage({
        message_type: isVid ? 'video' : 'image',
        content: '',
        attachment: res.data,
        reply_to: replyingTo?.id || null,
      });
      setShowAttachMenu(false);
    } catch {
      alert('Failed to upload media');
    }
  };

  // Upload Document
  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSendMessage({
        message_type: 'document',
        content: '',
        attachment: res.data,
        reply_to: replyingTo?.id || null,
      });
      setShowAttachMenu(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload document');
    }
  };

  // Create Poll Submit
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const validOptions = pollOptions.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      alert('Please enter at least 2 options');
      return;
    }

    try {
      await api.post('/polls', {
        conversation_id: conversationId,
        question: pollQuestion.trim(),
        options: validOptions,
        allow_multiple: pollAllowMultiple,
      });
      setShowPollModal(false);
      setShowAttachMenu(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    } catch {
      alert('Failed to create poll');
    }
  };

  if (isRecordingVoice) {
    return (
      <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
        <VoiceRecorder
          onCancel={() => setIsRecordingVoice(false)}
          onSendVoice={(voiceData) => {
            onSendMessage({
              message_type: 'voice',
              content: '',
              attachment: voiceData,
            });
            setIsRecordingVoice(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-xl bg-[var(--bg-hover)] border-l-4 border-[var(--accent)] text-xs">
          <div className="truncate">
            <span className="font-bold text-[var(--accent)]">Replying to {replyingTo.sender_name}: </span>
            <span className="text-[var(--text-secondary)]">{replyingTo.content || `[${replyingTo.message_type}]`}</span>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded text-[var(--text-muted)] hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-xs text-amber-300">
          <span>Editing message</span>
          <button onClick={onCancelEdit} className="p-1 rounded hover:text-white cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-end space-x-2">
        {/* Attachment menu trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Attach file, photo or poll"
          >
            <Paperclip size={20} />
          </button>

          {/* Attachment Popup Menu */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl p-2 z-50 flex flex-col space-y-1 animate-in zoom-in-95">
              <label className="flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer">
                <Image size={18} className="text-purple-400" />
                <span>Photos & Videos</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>

              <label className="flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer">
                <FileText size={18} className="text-sky-400" />
                <span>Document</span>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleDocUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowPollModal(true);
                  setShowAttachMenu(false);
                }}
                className="flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer w-full text-left"
              >
                <BarChart2 size={18} className="text-emerald-400" />
                <span>Create Poll</span>
              </button>
            </div>
          )}
        </div>

        {/* Emoji trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Insert Emoji (or use Win + .)"
          >
            <Smile size={20} />
          </button>
        </div>

        {/* Floating Emoji Picker Modal placed above composer */}
        <EmojiPickerModal
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelect={handleInsertEmoji}
          className="bottom-16 left-2 sm:left-4 z-[100]"
        />

        {/* Text Input */}
        <div className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl flex items-center px-4 py-1.5 focus-within:ring-2 focus-within:ring-[var(--accent)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-[15px] focus:outline-none resize-none max-h-32"
          />
        </div>

        {/* Voice recorder or Send button */}
        {text.trim() || editingMessage ? (
          <button
            type="button"
            onClick={handleSend}
            className="p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
            title="Send"
          >
            {editingMessage ? <Check size={20} /> : <Send size={20} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRecordingVoice(true)}
            className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Record Voice Message"
          >
            <Mic size={20} />
          </button>
        )}
      </div>

      {/* Poll Creation Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
              <div className="flex items-center space-x-2 text-[var(--accent)]">
                <BarChart2 size={20} />
                <h3 className="font-bold text-[var(--text-primary)]">Create Poll</h3>
              </div>
              <button onClick={() => setShowPollModal(false)} className="text-[var(--text-muted)] hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ask a question..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      required
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  ))}
                </div>
                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="mt-2 text-xs text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pollMultiple"
                  checked={pollAllowMultiple}
                  onChange={(e) => setPollAllowMultiple(e.target.checked)}
                  className="rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                />
                <label htmlFor="pollMultiple" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Allow multiple answers
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white cursor-pointer"
                >
                  Send Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
