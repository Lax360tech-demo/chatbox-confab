import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  MessageCircle,
  Share2,
  Edit2,
  FolderPlus,
  Star,
  Users,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';

export default function ContactList({
  contacts,
  categories,
  onAddContact,
  onEditContact,
  onStartChat,
  onManageCategories,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter contacts by category and search
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.username?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number?.includes(search);

    const matchesCategory =
      selectedCategory === 'All' || c.categories?.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const categoryList = ['All', 'Favorites', 'Personal', 'Business', 'Family', 'Friends'];

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-color)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users size={22} className="text-[var(--accent)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Contacts</h2>
          </div>
          <button
            onClick={onAddContact}
            className="py-1.5 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-transform hover:scale-105 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, username or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Categories / Custom Lists filter pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          {categoryList.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {cat === 'Favorites' ? '⭐ Favorites' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)]">
            <p className="text-sm font-semibold">No contacts found</p>
            <p className="text-xs mt-1">Try adjusting your search or add a new contact.</p>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isRegistered = contact.registration_status === 'registered';
            return (
              <div
                key={contact.id}
                className="p-3.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors group cursor-default"
              >
                {/* Contact Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <Avatar
                    src={contact.profile_picture}
                    name={contact.contact_name}
                    size="md"
                    isOnline={contact.online_status}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {contact.contact_name}
                      </span>
                      <SignatureEmoji emoji={contact.signature_emoji} />
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {contact.phone_number}
                      </span>
                      {contact.categories?.[0] && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                          {contact.categories[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {isRegistered ? (
                    <button
                      onClick={() => onStartChat(contact.registered_user_id)}
                      className="py-1.5 px-3 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                      title="Start Chat"
                    >
                      <MessageCircle size={15} />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(
                          `Hey ${contact.contact_name}, connect with me on Confab! Download and join at https://confab.app`
                        );
                        alert(`Invite copied for ${contact.contact_name}!`);
                      }}
                      className="py-1.5 px-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-active)] text-[var(--text-secondary)] text-xs font-medium flex items-center space-x-1 border border-[var(--border-color)] transition-colors cursor-pointer"
                      title="Invite to Confab"
                    >
                      <Share2 size={13} />
                      <span className="hidden sm:inline">Invite</span>
                    </button>
                  )}

                  <button
                    onClick={() => onEditContact(contact)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] cursor-pointer"
                    title="Edit Contact"
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
