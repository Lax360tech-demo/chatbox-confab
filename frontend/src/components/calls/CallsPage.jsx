import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Trash2,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import { formatDate, formatTime, formatDuration } from '../../utils/formatters';

export default function CallsPage() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalls = async () => {
    try {
      const res = await api.get('/calls/history');
      setCalls(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all call logs?')) return;
    try {
      await api.delete('/calls/history');
      setCalls([]);
    } catch {
      alert('Failed to clear call history');
    }
  };

  const handleCallBack = (call) => {
    const isCaller = call.caller_id === user?.id;
    const targetId = isCaller ? call.receiver_ids?.[0] : call.caller_id;
    const targetName = isCaller ? call.receiver_name : call.caller_name;
    const targetAvatar = isCaller ? call.receiver_avatar : call.caller_avatar;
    const targetEmoji = isCaller ? call.receiver_emoji : call.caller_emoji;

    startCall({
      receiverId: targetId,
      receiverName: targetName,
      receiverAvatar: targetAvatar,
      receiverEmoji: targetEmoji,
      conversationId: call.conversation_id,
      callType: call.call_type || 'audio',
    });
  };

  const renderCallIcon = (call) => {
    const isCaller = call.caller_id === user?.id;
    if (isCaller) {
      return <PhoneOutgoing size={16} className="text-emerald-400" />;
    } else if (call.status === 'accepted') {
      return <PhoneIncoming size={16} className="text-sky-400" />;
    } else {
      return <PhoneMissed size={16} className="text-rose-400" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Phone size={22} className="text-[var(--accent)]" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Call History</h2>
        </div>
        {calls.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="py-1.5 px-3 rounded-xl hover:bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-muted)]">
            Loading calls...
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-[var(--text-muted)]">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mb-3 text-2xl shadow-inner">
              📞
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No call logs yet</p>
            <p className="text-xs max-w-xs mt-1">
              Start an audio or video call with any of your Confab contacts!
            </p>
          </div>
        ) : (
          calls.map((call) => {
            const isCaller = call.caller_id === user?.id;
            const targetName = isCaller ? call.receiver_name : call.caller_name;
            const targetAvatar = isCaller ? call.receiver_avatar : call.caller_avatar;
            const targetEmoji = isCaller ? call.receiver_emoji : call.caller_emoji;

            return (
              <div
                key={call.id}
                className="p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Avatar src={targetAvatar} name={targetName} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {targetName}
                      </span>
                      <SignatureEmoji emoji={targetEmoji} />
                    </div>

                    <div className="flex items-center space-x-2 mt-1 text-xs text-[var(--text-muted)]">
                      {renderCallIcon(call)}
                      <span>
                        {formatDate(call.started_at)} at {formatTime(call.started_at)}
                      </span>
                      {call.duration > 0 && (
                        <span>• {formatDuration(call.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCallBack(call)}
                  className="p-2.5 rounded-full bg-[var(--bg-card)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] border border-[var(--border-color)] transition-colors cursor-pointer shadow-sm"
                  title={`Call back (${call.call_type})`}
                >
                  {call.call_type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
