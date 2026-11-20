import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Phone, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: request OTP, 2: enter OTP & new password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugOtp, setDebugOtp] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone_number: phone.trim() });
      if (res.data.debug_otp) setDebugOtp(res.data.debug_otp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        phone_number: phone.trim(),
        otp_code: otp.trim(),
        new_password: newPassword,
      });
      alert('Password updated successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--accent)] to-purple-500 text-white flex items-center justify-center shadow-lg mb-3">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Reset Password</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {step === 1 ? 'Enter your registered mobile number' : 'Enter the OTP and your new password'}
          </p>
        </div>

        {debugOtp && step === 2 && (
          <div className="mb-3 p-2.5 rounded-xl bg-[var(--accent-light)] border border-[var(--accent)]/30 text-[var(--accent)] text-xs text-center font-mono">
            Demo OTP: <span className="font-bold underline">{debugOtp}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Sending OTP...' : 'Send Verification Code'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-sm text-center font-mono text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4 || newPassword.length < 6}
              className="w-full mt-4 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Resetting...' : 'Update Password'}</span>
              <Check size={16} />
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Remember your password?{' '}
          <Link to="/login" className="text-[var(--accent)] font-semibold hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
