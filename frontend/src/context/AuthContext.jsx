import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('confab_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('confab_access_token'));
  const [loading, setLoading] = useState(true);

  // Fetch current user from /users/me on app load
  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('confab_access_token');
      if (storedToken) {
        try {
          const res = await api.get('/users/me');
          setUser(res.data);
          localStorage.setItem('confab_user', JSON.stringify(res.data));
          if (res.data.theme) {
            localStorage.setItem('confab_theme', res.data.theme);
            document.documentElement.setAttribute('data-theme', res.data.theme);
          }
        } catch (err) {
          console.error("Auth check failed:", err);
        }
      }
      setLoading(false);
    };
    fetchMe();
  }, []);

  const sendOtp = async (phoneNumber) => {
    const res = await api.post('/auth/send-otp', { phone_number: phoneNumber });
    return res.data;
  };

  const verifyOtp = async (phoneNumber, otpCode) => {
    const res = await api.post('/auth/verify-otp', { phone_number: phoneNumber, otp_code: otpCode });
    return res.data;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { access_token, refresh_token, user: newUser } = res.data;
    localStorage.setItem('confab_access_token', access_token);
    localStorage.setItem('confab_refresh_token', refresh_token);
    localStorage.setItem('confab_user', JSON.stringify(newUser));
    setToken(access_token);
    setUser(newUser);
    return res.data;
  };

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    const { access_token, refresh_token, user: loggedUser } = res.data;
    localStorage.setItem('confab_access_token', access_token);
    localStorage.setItem('confab_refresh_token', refresh_token);
    localStorage.setItem('confab_user', JSON.stringify(loggedUser));
    setToken(access_token);
    setUser(loggedUser);
    if (loggedUser.theme) {
      localStorage.setItem('confab_theme', loggedUser.theme);
      document.documentElement.setAttribute('data-theme', loggedUser.theme);
    }
    return res.data;
  };

  const updateProfile = async (updateData) => {
    const res = await api.put('/users/me', updateData);
    setUser(res.data);
    localStorage.setItem('confab_user', JSON.stringify(res.data));
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('confab_access_token');
    localStorage.removeItem('confab_refresh_token');
    localStorage.removeItem('confab_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        sendOtp,
        verifyOtp,
        register,
        login,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
