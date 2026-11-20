import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, Upload, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SignatureEmoji from '../components/common/SignatureEmoji';
import Avatar from '../components/common/Avatar';
import api from '../services/api';

const DEFAULT_SIGNATURE_EMOJIS = ['🚀', '🔥', '💫', '🌻', '🦋', '🎧', '🌙', '⚡'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { sendOtp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [signatureEmoji, setSignatureEmoji] = useState('🚀');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfilePic(res.data.url);
    } catch {
      alert('Failed to upload picture');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the Terms and Conditions to proceed');
      return;
    }

    const cleanCode = countryCode.trim().startsWith('+') ? countryCode.trim() : '+' + countryCode.trim();
    const fullPhone = `${cleanCode}${mobileNumber.trim().replace(/^0+/, '')}`;

    setLoading(true);
    try {
      // 1. Send OTP to verify phone ownership
      const otpRes = await sendOtp(fullPhone);

      // 2. Navigate to OTP verification page with registration payload
      navigate('/verify-otp', {
        state: {
          fullPhone,
          debugOtp: otpRes.debug_otp,
          registrationData: {
            full_name: fullName.trim(),
            username: username.trim().toLowerCase(),
            phone_number: fullPhone,
            password: password,
            profile_picture: profilePic,
            signature_emoji: signatureEmoji,
          },
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send verification code. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 text-white flex items-center justify-center shadow-lg mb-3">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Join Confab</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Connect Beyond Conversations.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {/* Avatar and Emoji */}
          <div className="flex items-center justify-center space-x-6 pb-2">
            <div className="relative group cursor-pointer">
              <Avatar src={profilePic} name={fullName || 'Confab'} size="xl" />
              <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload size={18} />
                <span className="text-[9px] mt-0.5">Photo</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Signature Emoji
              </label>
              <div className="flex items-center space-x-1.5 flex-wrap">
                {DEFAULT_SIGNATURE_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSignatureEmoji(em)}
                    className={`text-xl p-1 rounded-xl cursor-pointer transition-transform hover:scale-125 ${
                      signatureEmoji === em ? 'bg-[var(--accent-light)] ring-2 ring-[var(--accent)]' : ''
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Rajesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                placeholder="rajesh_k"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
              Mobile Number (E.164 with Country Code) *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-20 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="+91"
              />
              <input
                type="tel"
                required
                placeholder="9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              We verify your mobile number with a secure SMS verification code.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center space-x-2 text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <span>I accept the Terms and Conditions</span>
            </label>

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center space-x-1 cursor-pointer"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showPassword ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg shadow-[var(--accent)]/30 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>{loading ? 'Sending OTP...' : 'Continue to Verification'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--accent)] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
