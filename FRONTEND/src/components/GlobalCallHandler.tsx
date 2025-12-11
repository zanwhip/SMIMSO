'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChat } from '@/contexts/ChatContext';
import { socketService } from '@/lib/socket';
import { webrtcService } from '@/lib/webrtc';
import CallModal from '@/components/chat/CallModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function GlobalCallHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { callState, setCallState } = useChat();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isOnChatPage = pathname?.startsWith('/chat') || false;

  // Only redirect when accepting call, not when receiving incoming call
  // useEffect removed - no auto-redirect on incoming call

  const acceptCall = async () => {
    if (!callState || !callState.callOffer || !callState.conversationId) {
      return;
    }

    try {
      // Stop vibration
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }

      // Accept call immediately without redirecting
      await webrtcService.acceptCall({
        conversationId: callState.conversationId,
        callType: callState.callType,
        userId: user?.id || '',
        onLocalStream: (stream) => {
          setLocalStream(stream);
          // Update mic/video state based on actual tracks
          setIsMicMuted(!stream.getAudioTracks()[0]?.enabled);
          setIsVideoOff(!stream.getVideoTracks()[0]?.enabled);
        },
        onRemoteStream: (stream) => setRemoteStream(stream),
        onCallEnd: () => endCall(),
      }, callState.callOffer);
      
      // Update call state to show active call
      setCallState({
        ...callState,
        isIncoming: false,
      });
    } catch (error: any) {
      toast.error('Không thể chấp nhận cuộc gọi');
      endCall();
    }
  };

  const declineCall = () => {
    if (!callState || !callState.conversationId) {
      return;
    }

    socketService.sendCallDecline(callState.conversationId, callState.callType);
    endCall();
  };

  const endCall = async () => {
    const conversationId = callState?.conversationId;
    const callTypeToEnd = callState?.callType || 'audio';

    if (conversationId) {
      const actualDuration = webrtcService.endCall(conversationId);
      const finalDuration = Math.max(actualDuration, callDuration);
      socketService.sendCallEnd(conversationId, callTypeToEnd, finalDuration);
    }

    // Clear all call-related state
    setCallState(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    
    // Stop vibration
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  const toggleMic = () => {
    if (!callState?.conversationId) return;
    const wasMuted = isMicMuted;
    const enabled = webrtcService.toggleMic(callState.conversationId);
    if (enabled !== undefined && enabled !== null) {
      setIsMicMuted(!enabled);
    } else {
      setIsMicMuted(!wasMuted);
    }
  };

  const toggleVideo = () => {
    if (!callState?.conversationId) return;
    const wasVideoOff = isVideoOff;
    const enabled = webrtcService.toggleVideo(callState.conversationId);
    if (enabled !== undefined && enabled !== null) {
      setIsVideoOff(!enabled);
    } else {
      setIsVideoOff(!wasVideoOff);
    }
  };

  const switchCamera = async () => {
    if (!callState?.conversationId) return;
    try {
      const success = await webrtcService.switchCamera(callState.conversationId);
      if (!success) {
        toast.error('Không thể đổi camera');
      }
    } catch (error) {
      toast.error('Không thể đổi camera');
    }
  };

  if (!callState || !callState.isActive || isOnChatPage) {
    return null;
  }

  return (
    <CallModal
      isOpen={callState.isActive}
      callType={callState.callType}
      isIncoming={callState.isIncoming}
      caller={callState.caller || undefined}
      conversationId={callState.conversationId || undefined}
      localStream={localStream || undefined}
      remoteStream={remoteStream || undefined}
      onAccept={acceptCall}
      onDecline={declineCall}
      onEnd={endCall}
      onToggleMic={toggleMic}
      onToggleVideo={toggleVideo}
      isMicMuted={isMicMuted}
      isVideoOff={isVideoOff}
      onDurationChange={(duration) => setCallDuration(duration)}
      onSwitchCamera={switchCamera}
    />
  );
}

