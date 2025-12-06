'use client';

import { useEffect, useState } from 'react';
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

  const isOnChatPage = pathname?.startsWith('/chat') || false;

  useEffect(() => {
    if (callState?.isActive && callState.conversationId && !isOnChatPage) {
      router.push(`/chat/${callState.conversationId}`);
    }
  }, [callState?.isActive, callState?.conversationId, router, isOnChatPage]);

  const acceptCall = async () => {
    if (!callState || !callState.callOffer || !callState.conversationId) {
      return;
    }

    try {
      router.push(`/chat/${callState.conversationId}`);
      
      setCallState(null);
      
      toast.success('Đang chuyển đến cuộc trò chuyện...');
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
    toast('Cuộc gọi đã bị từ chối', { icon: '📞' });
  };

  const endCall = async () => {
    const duration = callDuration;
    const conversationId = callState?.conversationId;

    if (conversationId) {
      webrtcService.endCall(conversationId);
      socketService.sendCallEnd(conversationId, callState?.callType || 'audio', duration);
    }

    setCallState(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  };

  const toggleMic = () => {
    if (!callState?.conversationId) return;
    const enabled = webrtcService.toggleMic(callState.conversationId);
    setIsMicMuted(!enabled);
  };

  const toggleVideo = () => {
    if (!callState?.conversationId) return;
    const enabled = webrtcService.toggleVideo(callState.conversationId);
    setIsVideoOff(!enabled);
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
    />
  );
}

