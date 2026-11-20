import React from 'react';

export default function SignatureEmoji({ emoji, className = '' }) {
  if (!emoji) return null;
  return (
    <span
      className={`inline-block ml-3 select-none text-base align-middle transition-transform hover:scale-125 ${className}`}
      title={`Signature Emoji: ${emoji}`}
    >
      {emoji}
    </span>
  );
}
