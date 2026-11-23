import React, { useState, useEffect, useRef } from 'react';
import { Smile, Heart, Coffee, Car, Lightbulb, Compass, Sparkles, X } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    id: 'signatures',
    name: 'Signatures',
    icon: Sparkles,
    emojis: ['🔥','💫','🌻','🦋','🚀','🎧','🌙','⚡','💎','👑','🍀','🦄','🔮','🌈','✨','🌟','🎯','🎨','🏆','🪄'],
  },
  {
    id: 'hearts',
    name: 'Hearts & Gestures',
    icon: Heart,
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','👐','🤲','🤝','🙏','💪'],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Coffee,
    emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🍜','🍝','🍣','🍱','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭','☕','🍵','🧃','🥤','🍺','🍻','🥂','🍷'],
  },
  {
    id: 'travel',
    name: 'Travel & Nature',
    icon: Compass,
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚲','🛵','🏍️','✈️','🛫','🛬','🚀','🛸','🚁','⛵','🚤','🛳️','🏔️','🌋','🏕️','🏖️','🏝️','🌲','🌳','🌴','🌵','🌸','🌺','🌼','☀️','⭐','🌧️','❄️'],
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: Lightbulb,
    emojis: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','📷','📸','📹','🎥','📽️','📞','☎️','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','💡','🔦','🏮','📦','🎁','🎈','🎉','🎊','✉️','📧','📩','📨','📝','📖','📚'],
  },
];

export default function EmojiPickerModal({ onSelect, onClose, isOpen, className = '' }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const modalRef = useRef(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentEmojis = EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis || [];

  return (
    <div
      ref={modalRef}
      className={`absolute z-[100] w-80 sm:w-96 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-3 flex flex-col animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md ${className || 'bottom-16 left-2 sm:left-4'}`}
    >
      {/* Category header tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
                title={cat.name}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Grid of emojis */}
      <div className="grid grid-cols-8 gap-1.5 py-3 h-56 overflow-y-auto pr-1">
        {currentEmojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              onSelect(emoji);
            }}
            className="text-2xl h-10 w-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] hover:scale-125 transition-transform cursor-pointer select-none"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
