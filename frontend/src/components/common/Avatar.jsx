import React from 'react';

export default function Avatar({ src, name, size = 'md', isOnline = false, className = '' }) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-2xl',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
  };

  const getInitial = (nameStr) => {
    if (!nameStr) return '?';
    return nameStr.trim().charAt(0).toUpperCase();
  };

  // Generate consistent color from name
  const getGradient = (nameStr) => {
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-violet-600 to-fuchsia-600',
    ];
    let hash = 0;
    const str = nameStr || 'Confab';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-[var(--border-subtle)] shadow-sm`}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${getGradient(name)} text-white font-semibold flex items-center justify-center shadow-sm ${src ? 'hidden' : 'flex'}`}
      >
        {getInitial(name)}
      </div>

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-emerald-500 border-2 border-[var(--bg-main)] rounded-full ring-1 ring-emerald-400`}
        />
      )}
    </div>
  );
}
