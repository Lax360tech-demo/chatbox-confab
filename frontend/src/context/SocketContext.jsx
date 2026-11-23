import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);
  const activeConversationIdRef = useRef(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to Socket.IO backend
    const getSocketUrl = () => {
      if (import.meta.env.VITE_SOCKET_URL) {
        return import.meta.env.VITE_SOCKET_URL.trim().replace(/\/+$/, '');
      }
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
      }
      return window.location.origin;
    };

    const socketUrl = getSocketUrl();
    const s = io(socketUrl, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('Socket.IO connected:', s.id);
      setConnected(true);
      if (activeConversationIdRef.current) {
        s.emit('join_conversation', { conversation_id: activeConversationIdRef.current });
      }
    });

    s.io.on('reconnect', () => {
      console.log('Socket.IO reconnected:', s.id);
      setConnected(true);
      if (activeConversationIdRef.current) {
        s.emit('join_conversation', { conversation_id: activeConversationIdRef.current });
      }
    });

    s.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setConnected(false);
    });

    s.on('user_status', (data) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.online) {
          next.add(data.user_id);
        } else {
          next.delete(data.user_id);
        }
        return next;
      });
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.id]);

  const joinConversation = (conversationId) => {
    activeConversationIdRef.current = conversationId;
    if (socketRef.current) {
      socketRef.current.emit('join_conversation', { conversation_id: conversationId });
    }
  };

  const leaveConversation = (conversationId) => {
    if (activeConversationIdRef.current === conversationId) {
      activeConversationIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_conversation', { conversation_id: conversationId });
    }
  };

  const emitTyping = (conversationId, isTyping) => {
    if (socketRef.current && user) {
      const eventName = isTyping ? 'typing_start' : 'typing_stop';
      socketRef.current.emit(eventName, {
        conversation_id: conversationId,
        user_name: user.full_name,
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlineUsers,
        joinConversation,
        leaveConversation,
        emitTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
