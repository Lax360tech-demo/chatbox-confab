import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2 } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';
import SignatureEmoji from '../common/SignatureEmoji';
import { formatDuration } from '../../utils/formatters';

export default function CallModal() {
  const {
    callState,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoDisabled,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!callState) return null;

  const isIncoming = callState.direction === 'incoming' && callState.status === 'ringing';
  const isVideo = callState.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-6 text-center">
        {/* Calling Header */}
        <div className="mb-6 flex flex-col items-center">
          <Avatar
            src={callState.targetAvatar}
            name={callState.targetName}
            size="xl"
            className="mb-4 ring-4 ring-[var(--accent)]/30 animate-pulse"
          />
          <div className="flex items-center text-xl font-bold text-[var(--text-primary)]">
            <span>{callState.targetName}</span>
            <SignatureEmoji emoji={callState.targetEmoji} />
          </div>
          <p className="text-sm font-medium text-[var(--text-muted)] mt-1 capitalize">
            {callState.status === 'connected' ? (
              <span className="text-emerald-400 font-semibold">{formatDuration(callDuration)}</span>
            ) : isIncoming ? (
              `Incoming ${callState.callType} Call...`
            ) : (
              `Calling ${callState.targetName}...`
            )}
          </p>
        </div>

        {/* Video Containers if Video Call & Connected */}
        {isVideo && callState.status === 'connected' && (
          <div className="relative w-full h-72 sm:h-80 bg-black rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-[var(--text-muted)]">Connecting video stream...</div>
            )}
            {/* Self Video PiP */}
            <div className="absolute top-3 right-3 w-24 h-32 sm:w-28 sm:h-36 bg-gray-900 border-2 border-white/20 rounded-xl overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        {isIncoming ? (
          <div className="flex items-center space-x-12 mt-4">
            {/* Reject */}
            <button
              onClick={rejectCall}
              className="flex flex-col items-center space-y-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
                <PhoneOff size={28} />
              </div>
              <span className="text-xs text-[var(--text-muted)]">Decline</span>
            </button>

            {/* Accept */}
            <button
              onClick={acceptCall}
              className="flex flex-col items-center space-y-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 animate-bounce">
                <Phone size={28} />
              </div>
              <span className="text-xs text-[var(--text-muted)]">Accept</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-4 sm:space-x-6 mt-4">
            {/* Toggle Mic */}
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-active)]'
              }`}
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              {isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Toggle Video if video call */}
            {isVideo && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all cursor-pointer ${
                  isVideoDisabled
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-active)]'
                }`}
                title={isVideoDisabled ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoDisabled ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={endCall}
              className="px-6 py-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center space-x-2 shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <PhoneOff size={22} />
              <span>End Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
