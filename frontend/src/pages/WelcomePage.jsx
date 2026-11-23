import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MessageSquare, Phone, Compass, Shield, ArrowRight } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--accent)]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-teal-400 text-white flex items-center justify-center shadow-lg shadow-[var(--accent)]/30">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">CONFAB</h1>
            <p className="text-[10px] text-[var(--accent)] font-bold tracking-wider uppercase">
              Connect Beyond Conversations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md transition-all hover:scale-105"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 max-w-4xl mx-auto w-full text-center my-auto py-12 flex flex-col items-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[var(--accent-light)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold mb-6">
          <Sparkles size={14} />
          <span>Real-time Messaging • WebRTC Calls • 24h Chronicles</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
          Connect Beyond <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[var(--accent)] via-purple-400 to-pink-500 bg-clip-text text-transparent">
            Conversations.
          </span>
        </h2>

        <p className="mt-6 text-sm sm:text-lg text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          Experience ultra-responsive real-time chat, crystal-clear WebRTC audio & video calls, 24-hour Chronicles, polls, and rich signature emojis wrapped in an elegant dark interface.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 w-full max-w-3xl">
          {[
            { title: 'Real-Time Chat', desc: 'Instant WebSocket delivery', icon: MessageSquare },
            { title: 'WebRTC Calls', desc: 'Direct HD audio & video', icon: Phone },
            { title: 'Chronicles', desc: '24-hour disappearing updates', icon: Compass },
            { title: 'Signature Emojis', desc: 'Unique profile branding', icon: Sparkles },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-left shadow-sm hover:border-[var(--accent)] transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center mb-2">
                  <Icon size={18} />
                </div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">{f.title}</h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-xl shadow-[var(--accent)]/25 flex items-center justify-center space-x-2 transition-transform hover:scale-105"
          >
            <span>Create Your Account</span>
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)] font-bold text-sm transition-colors"
          >
            I already have an account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full text-center text-xs text-[var(--text-muted)] pt-6 border-t border-[var(--border-subtle)]">
        © 2026 CONFAB Platform. Built with Python FastAPI, MongoDB Atlas, React & WebSockets.
      </footer>
    </div>
  );
}
