import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../services/api';

const CallContext = createContext();

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [callState, setCallState] = useState(null); // { callId, targetId, targetName, targetAvatar, targetEmoji, callType, direction, status }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef(null);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const pendingRemoteOfferRef = useRef(null);

  // Clean up streams & peer connection
  const cleanupCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    pendingRemoteOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setCallDuration(0);
    setIsAudioMuted(false);
    setIsVideoDisabled(false);
  };

  useEffect(() => {
    if (!socket) return;

    // Incoming call event
    socket.on('incoming_call', (data) => {
      console.log('Incoming call received:', data);
      setCallState({
        callId: data.call_id,
        targetId: data.caller_id,
        targetName: data.caller_name || data.caller_info?.name || 'Confab User',
        targetAvatar: data.caller_avatar || data.caller_info?.avatar || '',
        targetEmoji: data.caller_emoji || data.caller_info?.emoji || '🚀',
        callType: data.call_type || 'audio',
        direction: 'incoming',
        status: 'ringing',
        conversationId: data.conversation_id,
      });
    });

    // Call answered by other party
    socket.on('call_answered', async (data) => {
      if (!data.accepted) {
        cleanupCall();
        return;
      }
      setCallState((prev) => (prev ? { ...prev, status: 'connected' } : null));
      startTimer();
    });

    // WebRTC signaling
    socket.on('webrtc_signal', async ({ sender_id, signal }) => {
      try {
        if (signal.sdp) {
          if (!pcRef.current) {
            // Receiver hasn't accepted yet, store offer until accepted
            if (signal.sdp.type === 'offer') {
              pendingRemoteOfferRef.current = signal.sdp;
            }
            return;
          }

          await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Drain queued ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('Candidate queue add error:', e);
            }
          }

          if (signal.sdp.type === 'offer') {
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            socket.emit('webrtc_signal', {
              target_id: sender_id,
              signal: { sdp: pcRef.current.localDescription },
            });
          }
        } else if (signal.candidate) {
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            pendingCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('WebRTC signal handling error:', err);
      }
    });

    // Call ended by peer
    socket.on('call_ended', () => {
      cleanupCall();
    });

    // Call rejected
    socket.on('call_rejected', () => {
      cleanupCall();
    });

    return () => {
      socket.off('incoming_call');
      socket.off('call_answered');
      socket.off('webrtc_signal');
      socket.off('call_ended');
      socket.off('call_rejected');
    };
  }, [socket]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const setupPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_signal', {
          target_id: targetUserId,
          signal: { candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  };

  const startCall = async ({ receiverId, receiverName, receiverAvatar, receiverEmoji, conversationId, callType }) => {
    try {
      // 1. Log call to backend API
      const res = await api.post('/calls', {
        receiver_ids: [receiverId],
        conversation_id: conversationId,
        call_type: callType,
      });
      const callData = res.data;

      // 2. Request user media
      const constraints = {
        audio: true,
        video: callType === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 3. Setup WebRTC
      const pc = setupPeerConnection(receiverId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 4. Update state
      setCallState({
        callId: callData.id,
        targetId: receiverId,
        targetName: receiverName,
        targetAvatar: receiverAvatar,
        targetEmoji: receiverEmoji,
        callType,
        direction: 'outgoing',
        status: 'calling',
        conversationId,
      });

      // 5. Emit call_user so receiver gets ringing popup
      if (socket) {
        socket.emit('call_user', {
          receiver_id: receiverId,
          call_id: callData.id,
          call_type: callType,
          conversation_id: conversationId,
          caller_name: user?.full_name || 'Confab User',
          caller_avatar: user?.profile_picture || '',
          caller_emoji: user?.signature_emoji || '🚀',
          caller_info: {
            name: user?.full_name || 'Confab User',
            avatar: user?.profile_picture || '',
            emoji: user?.signature_emoji || '🚀',
          },
        });

        // Send offer SDP
        socket.emit('webrtc_signal', {
          target_id: receiverId,
          signal: { sdp: offer },
        });
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      cleanupCall();
      alert('Could not access microphone/camera. Please check permissions.');
    }
  };

  const acceptCall = async () => {
    if (!callState) return;
    try {
      // 1. Request user media
      const constraints = {
        audio: true,
        video: callState.callType === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Setup WebRTC
      const pc = setupPeerConnection(callState.targetId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // If remote offer arrived beforehand, apply it and create answer
      if (pendingRemoteOfferRef.current) {
        await pc.setRemoteDescription(new RTCSessionDescription(pendingRemoteOfferRef.current));
        pendingRemoteOfferRef.current = null;

        // Drain queued ICE candidates
        while (pendingCandidatesRef.current.length > 0) {
          const cand = pendingCandidatesRef.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn('Candidate queue drain error:', e);
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket) {
          socket.emit('webrtc_signal', {
            target_id: callState.targetId,
            signal: { sdp: pc.localDescription },
          });
        }
      }

      // 3. Notify backend
      await api.post(`/calls/${callState.callId}/action`, { action: 'accept' });

      // 4. Update status & timer
      setCallState((prev) => ({ ...prev, status: 'connected' }));
      startTimer();

      // 5. Emit call_answer to caller
      if (socket) {
        socket.emit('call_answer', {
          call_id: callState.callId,
          caller_id: callState.targetId,
          accepted: true,
        });
      }
    } catch (err) {
      console.error('Failed to accept call:', err);
      rejectCall();
    }
  };

  const rejectCall = async () => {
    if (!callState) return;
    try {
      await api.post(`/calls/${callState.callId}/action`, { action: 'reject' });
    } catch {}
    if (socket) {
      socket.emit('call_answer', {
        call_id: callState.callId,
        caller_id: callState.targetId,
        accepted: false,
      });
    }
    cleanupCall();
  };

  const endCall = async () => {
    if (!callState) return;
    try {
      await api.post(`/calls/${callState.callId}/action`, {
        action: 'end',
        duration: callDuration,
      });
    } catch {}
    if (socket) {
      socket.emit('call_end', {
        call_id: callState.callId,
        target_id: callState.targetId,
      });
    }
    cleanupCall();
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      });
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoDisabled(!track.enabled);
      });
    }
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        localStream,
        remoteStream,
        isAudioMuted,
        isVideoDisabled,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleAudio,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export const useCall = () => useContext(CallContext);
