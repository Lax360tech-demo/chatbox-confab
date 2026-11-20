import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import api from '../../services/api';
import { formatDuration } from '../../utils/formatters';

export default function VoiceRecorder({ onSendVoice, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Could not access microphone. Please enable microphone permissions in your browser.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handlePlayPause = () => {
    if (!audioPlayerRef.current && audioUrl) {
      audioPlayerRef.current = new Audio(audioUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_message.webm');
      const res = await api.post('/uploads/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSendVoice({
        url: res.data.url,
        duration: recordingDuration,
      });
    } catch {
      alert('Failed to send voice message');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-3 w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2.5 rounded-2xl shadow-lg animate-in fade-in duration-150">
      {/* Waveform / Visual status */}
      <div className="flex items-center space-x-2 flex-1">
        {isRecording ? (
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-semibold text-rose-400 font-mono">
              {formatDuration(recordingDuration)}
            </span>
            <div className="flex items-center space-x-1 pl-2">
              <span className="w-1 h-3 bg-rose-400 rounded-full animate-pulse" />
              <span className="w-1 h-5 bg-rose-400 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-rose-400 rounded-full animate-pulse delay-150" />
              <span className="w-1 h-6 bg-rose-400 rounded-full animate-pulse delay-100" />
              <span className="w-1 h-4 bg-rose-400 rounded-full animate-pulse delay-200" />
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePlayPause}
              className="p-1.5 rounded-full bg-[var(--accent)] text-white cursor-pointer hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-2 rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-active)] cursor-pointer"
            title="Stop Recording"
          >
            <Square size={16} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
          title="Cancel"
        >
          <Trash2 size={16} />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading || isRecording}
          className="p-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md disabled:opacity-40 cursor-pointer"
          title="Send Voice Message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
