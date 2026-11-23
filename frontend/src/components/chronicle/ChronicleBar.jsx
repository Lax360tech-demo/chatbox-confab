import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';

export default function ChronicleBar({ onOpenCreate, onOpenViewer }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [chronicleData, setChronicleData] = useState({
    my_chronicle: { stories: [] },
    recent_updates: [],
    viewed_updates: [],
  });

  const fetchChronicles = async () => {
    try {
      const res = await api.get('/stories');
      setChronicleData(res.data);
    } catch (e) {
      console.error('Failed to load chronicles:', e);
    }
  };

  useEffect(() => {
    fetchChronicles();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('story_created', () => {
      fetchChronicles();
    });
    return () => {
      socket.off('story_created');
    };
  }, [socket]);

  const hasMyStories = chronicleData.my_chronicle?.stories?.length > 0;

  return (
    <div className="w-full px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-x-auto no-scrollbar flex items-center space-x-4 select-none shrink-0">
      {/* My Chronicle Circle */}
      <div className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group">
        <div
          className="relative"
          onClick={() => {
            if (hasMyStories) {
              onOpenViewer({
                userId: user.id,
                userName: 'My Chronicle',
                stories: chronicleData.my_chronicle.stories,
                isMine: true,
              });
            } else {
              onOpenCreate();
            }
          }}
        >
          <div
            className={`p-0.5 rounded-full ${
              hasMyStories
                ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 ring-2 ring-transparent'
                : 'ring-1 ring-[var(--border-color)]'
            }`}
          >
            <Avatar
              src={user?.profile_picture}
              name={user?.full_name}
              size="md"
              className="border-2 border-[var(--bg-secondary)]"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCreate();
            }}
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center border-2 border-[var(--bg-secondary)] shadow-sm hover:scale-110 transition-transform cursor-pointer"
            title="Add to Chronicle"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
        </div>
        <span className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          My Chronicle
        </span>
      </div>

      {/* Divider */}
      {(chronicleData.recent_updates.length > 0 || chronicleData.viewed_updates.length > 0) && (
        <div className="h-8 w-[1px] bg-[var(--border-subtle)] shrink-0" />
      )}

      {/* Recent Updates */}
      {chronicleData.recent_updates.map((item) => (
        <div
          key={item.user_id}
          onClick={() => onOpenViewer({ ...item, isMine: false })}
          className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group"
        >
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 hover:scale-105 transition-transform shadow-sm">
            <Avatar
              src={item.user_avatar}
              name={item.user_name}
              size="md"
              className="border-2 border-[var(--bg-secondary)]"
            />
          </div>
          <span className="text-[11px] font-medium text-[var(--text-primary)] max-w-[64px] truncate">
            {item.user_name}
          </span>
        </div>
      ))}

      {/* Viewed Updates */}
      {chronicleData.viewed_updates.map((item) => (
        <div
          key={item.user_id}
          onClick={() => onOpenViewer({ ...item, isMine: false })}
          className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
        >
          <div className="p-0.5 rounded-full ring-2 ring-[var(--border-color)]">
            <Avatar
              src={item.user_avatar}
              name={item.user_name}
              size="md"
              className="border-2 border-[var(--bg-secondary)]"
            />
          </div>
          <span className="text-[11px] font-medium text-[var(--text-muted)] max-w-[64px] truncate">
            {item.user_name}
          </span>
        </div>
      ))}
    </div>
  );
}
