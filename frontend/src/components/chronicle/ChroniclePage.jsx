import React, { useState, useEffect } from 'react';
import { Plus, Compass, Sparkles, Clock, Eye, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import { formatTime } from '../../utils/formatters';

export default function ChroniclePage({ onOpenCreate, onOpenViewer }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [chronicleData, setChronicleData] = useState({
    my_chronicle: { stories: [] },
    recent_updates: [],
    viewed_updates: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchChronicles = async () => {
    try {
      const res = await api.get('/stories');
      setChronicleData(res.data);
    } catch (e) {
      console.error('Failed to load chronicles:', e);
    } finally {
      setLoading(false);
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

  const myStories = chronicleData.my_chronicle?.stories || [];
  const hasMyStories = myStories.length > 0;
  const recentUpdates = chronicleData.recent_updates || [];
  const viewedUpdates = chronicleData.viewed_updates || [];

  const latestMyStory = hasMyStories ? myStories[myStories.length - 1] : null;

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
            <Compass size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Chronicle
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">24-hour stories & status</p>
          </div>
        </div>

        <button
          onClick={onOpenCreate}
          className="py-1.5 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-[var(--accent)]/20 transition-all cursor-pointer hover:scale-105"
          title="Create Story"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Story</span>
        </button>
      </div>

      {/* Stories Scrollable Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] no-scrollbar">
        {/* My Status / Chronicle Section */}
        <div className="p-4">
          <div
            onClick={() => {
              if (hasMyStories) {
                onOpenViewer({
                  userId: user?.id,
                  userName: 'My Chronicle',
                  stories: myStories,
                  isMine: true,
                });
              } else {
                onOpenCreate();
              }
            }}
            className="flex items-center space-x-3.5 p-2 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
          >
            {/* Avatar with add/story ring */}
            <div className="relative shrink-0">
              <div
                className={`p-0.5 rounded-full ${
                  hasMyStories
                    ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 ring-2 ring-[var(--accent)]/40 shadow-sm'
                    : 'ring-2 ring-dashed ring-[var(--border-color)]'
                }`}
              >
                <Avatar
                  src={user?.profile_picture}
                  name={user?.full_name || 'My Story'}
                  size="lg"
                  className="border-2 border-[var(--bg-secondary)]"
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreate();
                }}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center border-2 border-[var(--bg-secondary)] shadow-md hover:scale-110 transition-transform cursor-pointer"
                title="Add new story"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  My Story
                </span>
                {hasMyStories && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-semibold">
                    {myStories.length} {myStories.length === 1 ? 'story' : 'stories'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {hasMyStories
                  ? `Last updated ${latestMyStory?.created_at ? formatTime(latestMyStory.created_at) : 'recently'}`
                  : 'Tap to add a story update'}
              </p>
            </div>

            <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Recent Updates */}
        {recentUpdates.length > 0 && (
          <div className="p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-2">
              Recent Updates
            </h3>
            <div className="space-y-1">
              {recentUpdates.map((item) => {
                const latest = item.stories?.[item.stories.length - 1];
                return (
                  <div
                    key={item.user_id}
                    onClick={() => onOpenViewer({ ...item, isMine: false })}
                    className="flex items-center space-x-3.5 p-2 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                  >
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <Avatar
                        src={item.user_avatar}
                        name={item.user_name}
                        size="md"
                        className="border-2 border-[var(--bg-secondary)]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {item.user_name}
                        </span>
                        <SignatureEmoji emoji={item.user_emoji} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {latest?.created_at ? formatTime(latest.created_at) : 'Just now'} • {item.stories?.length || 1} {item.stories?.length === 1 ? 'story' : 'stories'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Viewed Updates */}
        {viewedUpdates.length > 0 && (
          <div className="p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">
              Viewed Updates
            </h3>
            <div className="space-y-1 opacity-75 hover:opacity-100 transition-opacity">
              {viewedUpdates.map((item) => {
                const latest = item.stories?.[item.stories.length - 1];
                return (
                  <div
                    key={item.user_id}
                    onClick={() => onOpenViewer({ ...item, isMine: false })}
                    className="flex items-center space-x-3.5 p-2 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                  >
                    <div className="p-0.5 rounded-full ring-2 ring-[var(--border-color)] shrink-0">
                      <Avatar
                        src={item.user_avatar}
                        name={item.user_name}
                        size="md"
                        className="border-2 border-[var(--bg-secondary)]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-[var(--text-secondary)] truncate">
                          {item.user_name}
                        </span>
                        <SignatureEmoji emoji={item.user_emoji} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {latest?.created_at ? formatTime(latest.created_at) : 'Viewed'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State when no contact updates */}
        {recentUpdates.length === 0 && viewedUpdates.length === 0 && !loading && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
              <Sparkles size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">No updates yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[220px]">
                Stories from your contacts will appear here. Share your moments with friends!
              </p>
            </div>
            <button
              onClick={onOpenCreate}
              className="mt-2 py-2 px-4 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] transition-colors cursor-pointer"
            >
              Post a Story
            </button>
          </div>
        )}

        {/* Privacy Footer */}
        <div className="p-4 text-center">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center space-x-1">
            <Clock size={12} className="inline mr-1" />
            <span>Stories automatically disappear after 24 hours</span>
          </p>
        </div>
      </div>
    </div>
  );
}
