import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, RotateCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OtpVerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp, register, sendOtp } = useAuth();

  const state = location.state || {};
  const fullPhone = state.fullPhone || '';
  const registrationData = state.registrationData || null;
  const initialDebugOtp = state.debugOtp || '';

  const [otp, setOtp] = useState(initialDebugOtp || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    if (!fullPhone) {
      navigate('/register');
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [fullPhone, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setError('Please enter a valid OTP code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Verify OTP
      await verifyOtp(fullPhone, otp);

      // 2. Complete Registration
      if (registrationData) {
        await register(registrationData);
        navigate('/');
      } else {
        alert('Verified successfully. Please log in.');
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await sendOtp(fullPhone);
      setResendCooldown(30);
      if (res.debug_otp) {
        setOtp(res.debug_otp);
      }
      alert('A new verification code has been sent!');
    } catch {
      alert('Failed to resend verification code');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-4 ring-emerald-500/10">
          <ShieldCheck size={32} />
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Verify Mobile Number</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          We sent a 6-digit verification code to
        </p>
        <p className="text-sm font-bold font-mono text-[var(--accent)] mt-0.5">{fullPhone}</p>

        {/* Demo OTP Helper Notice */}
        {initialDebugOtp && (
          <div className="my-3 p-2.5 rounded-xl bg-[var(--accent-light)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-mono">
            Testing Demo OTP: <span className="font-bold underline">{initialDebugOtp}</span>
          </div>
        )}

        {error && (
          <div className="my-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              maxLength={6}
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] text-2xl font-mono px-4 py-3 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="w-full py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg shadow-[var(--accent)]/30 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            <span>{loading ? 'Verifying...' : 'Verify & Enter Confab'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-4">
          <button
            onClick={() => navigate('/register')}
            className="hover:text-[var(--text-primary)] cursor-pointer"
          >
            Change Number
          </button>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className={`flex items-center space-x-1 ${
              resendCooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'text-[var(--accent)] hover:underline cursor-pointer'
            }`}
          >
            <RotateCw size={12} className={resendCooldown > 0 ? '' : 'animate-spin'} />
            <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
