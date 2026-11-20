import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle2, Circle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function PollCard({ pollId, initialPoll }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [poll, setPoll] = useState(initialPoll);
  const [loading, setLoading] = useState(!initialPoll);

  const fetchPoll = async () => {
    try {
      const res = await api.get(`/polls/${pollId}`);
      setPoll(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!poll && pollId) {
      fetchPoll();
    }
  }, [pollId]);

  useEffect(() => {
    if (!socket || !pollId) return;
    const handlePollUpdate = (updatedPoll) => {
      if (updatedPoll.id === pollId) {
        setPoll(updatedPoll);
      }
    };
    socket.on('poll_updated', handlePollUpdate);
    return () => {
      socket.off('poll_updated', handlePollUpdate);
    };
  }, [socket, pollId]);

  if (loading) {
    return <div className="p-4 text-xs text-[var(--text-muted)] animate-pulse">Loading poll...</div>;
  }

  if (!poll) return null;

  const handleVote = async (optionIndex) => {
    try {
      let selectedIndices = [];
      if (poll.allow_multiple) {
        if (poll.user_votes?.includes(optionIndex)) {
          selectedIndices = poll.user_votes.filter((i) => i !== optionIndex);
        } else {
          selectedIndices = [...(poll.user_votes || []), optionIndex];
        }
      } else {
        selectedIndices = [optionIndex];
      }

      const res = await api.post(`/polls/${poll.id}/vote`, {
        option_indices: selectedIndices,
      });
      setPoll(res.data);
    } catch (err) {
      alert('Failed to submit vote');
    }
  };

  return (
    <div className="w-full max-w-sm p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm text-left my-1 select-none">
      {/* Poll Header */}
      <div className="flex items-center space-x-2 text-[var(--accent)] mb-2">
        <BarChart2 size={18} />
        <span className="text-xs font-bold uppercase tracking-wider">Group Poll</span>
      </div>

      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">{poll.question}</h4>

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const isVoted = poll.user_votes?.includes(opt.index);
          return (
            <div
              key={opt.index}
              onClick={() => handleVote(opt.index)}
              className={`relative overflow-hidden rounded-xl border p-2.5 transition-all cursor-pointer ${
                isVoted
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border-color)] bg-[var(--bg-hover)]/30'
              }`}
            >
              {/* Animated Percentage Fill Bar */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-[var(--accent)]/20 transition-all duration-500 rounded-xl"
                style={{ width: `${opt.percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  {isVoted ? (
                    <CheckCircle2 size={16} className="text-[var(--accent)] shrink-0" />
                  ) : (
                    <Circle size={16} className="text-[var(--text-muted)] shrink-0" />
                  )}
                  <span className={`font-medium ${isVoted ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                    {opt.text}
                  </span>
                </div>
                <span className="font-semibold text-[var(--text-primary)] ml-2">{opt.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2">
        <span>{poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}</span>
        <span>{poll.allow_multiple ? 'Multiple choices allowed' : 'Select one'}</span>
      </div>
    </div>
  );
}
