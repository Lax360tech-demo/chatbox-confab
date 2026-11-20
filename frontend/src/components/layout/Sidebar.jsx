import React from 'react';
import {
  MessageSquare,
  Users,
  Compass,
  Phone,
  Archive,
  Star,
  Settings,
  User,
  LogOut,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';

export default function Sidebar({ activeTab, setActiveTab, unreadTotal = 0 }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadTotal > 0 ? unreadTotal : null },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'chronicle', label: 'Chronicle', icon: Compass },
    { id: 'calls', label: 'Calls', icon: Phone },
    { id: 'archived', label: 'Archived', icon: Archive },
    { id: 'starred', label: 'Starred', icon: Star },
  ];

  return (
    <aside className="w-16 sm:w-20 md:w-20 h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col items-center justify-between py-4 select-none shrink-0 z-20">
      {/* Top Logo */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => setActiveTab('chats')}
          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 cursor-pointer relative group"
          title="Confab - Connect Beyond Conversations"
        >
          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--bg-sidebar)]" />
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
                title={item.label}
              >
                <Icon size={22} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--bg-sidebar)]">
                    {item.badge}
                  </span>
                )}
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute -left-2 top-3 bottom-3 w-1 bg-white rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Settings */}
      <div className="flex flex-col items-center space-y-2">
        {/* Settings button */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[var(--accent)] text-white shadow-md'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
          title="Settings"
        >
          <Settings size={22} />
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`relative p-0.5 rounded-full transition-transform hover:scale-105 cursor-pointer ${
            activeTab === 'profile' ? 'ring-2 ring-[var(--accent)]' : ''
          }`}
          title={`${user?.full_name || 'My Profile'} ${user?.signature_emoji || ''}`}
        >
          <Avatar
            src={user?.profile_picture}
            name={user?.full_name}
            size="sm"
            isOnline={true}
          />
        </button>
      </div>
    </aside>
  );
}
