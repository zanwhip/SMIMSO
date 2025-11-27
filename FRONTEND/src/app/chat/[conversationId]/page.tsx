'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChat } from '@/contexts/ChatContext';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { socketService } from '@/lib/socket';
import { webrtcService } from '@/lib/webrtc';
import { Conversation, Message, User } from '@/types';
import { getImageUrl, formatDate } from '@/lib/utils';
import { 
  FiSend, 
  FiImage, 
  FiMic, 
  FiVideo, 
  FiPhone,
  FiSmile,
  FiPaperclip,
  FiUsers,
  FiArrowLeft,
} from 'react-icons/fi';
import Image from 'next/image';
import toast from 'react-hot-toast';
import CallModal from '@/components/chat/CallModal';
import MessageItem from '@/components/chat/MessageItem';
import EmojiPicker from '@/components/chat/EmojiPicker';
import GifPicker from '@/components/chat/GifPicker';
import StickerPicker from '@/components/chat/StickerPicker';
import GroupSettings from '@/components/chat/GroupSettings';
import { OnlineStatus } from '@/types';

export default function ConversationDetailPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const { setActiveConversation, resetUnread, setCallState } = useChat();
  const router = useRouter();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Map<string, string>>(new Map());
  const [onlineStatus, setOnlineStatus] = useState<Map<string, OnlineStatus>>(new Map());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  
  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [caller, setCaller] = useState<User | null>(null);
  const [callOffer, setCallOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const messagesRef = useRef<Message[]>([]);
  
  // Keep refs in sync with state
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      });
    }
  }, [messages]);

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle new message
  const handleNewMessage = useCallback((message: Message) => {
    console.log('📨 [ConversationDetail] Received message:', {
      id: message.id,
      convId: message.conversation_id,
      senderId: message.sender_id,
      currentConvId: conversationId,
    });
    
    if (!message?.id || !message?.conversation_id) {
      console.error('❌ Invalid message:', message);
      return;
    }
    
    // Only handle messages for this conversation
    if (message.conversation_id !== conversationId) {
      console.log('⚠️ Message for different conversation, ignoring');
      return;
    }
    
    console.log('✅ Message for current conversation - updating UI');
    
    setMessages((prev) => {
      // Check if message already exists
      const existingIndex = prev.findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        console.log('📝 Updating existing message');
        const updated = [...prev];
        updated[existingIndex] = message;
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      
      console.log('➕ Adding new message');
      
      // Remove temp messages
      const filtered = prev.filter(m => 
        !(m.id.startsWith('temp-') && m.content === message.content && m.sender_id === message.sender_id)
      );
      
      return [...filtered, message].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
    
    // Mark as read if not our own message
    if (message.sender_id !== user?.id) {
      markAsRead(conversationId);
    }
  }, [conversationId, user?.id]);

  // Fetch conversation and setup socket
  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    console.log('📂 Loading conversation:', conversationId);
    setActiveConversation(conversationId);
    
    // Fetch conversation details
    const fetchConversation = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/chat/conversations/${conversationId}`);
        const conv = response.data.data;
        setConversation(conv);
        
        // Verify user is participant - if not, try to refresh
        if (conv && user?.id) {
          const isParticipant = conv.participants?.some((p: any) => p.user_id === user.id);
          if (!isParticipant && conv.type === 'direct') {
            // For direct conversations, refresh to get updated participant list
            console.warn('User not in participant list, refreshing...');
            try {
              const refreshResponse = await api.get(`/chat/conversations/${conversationId}`);
              const refreshedConv = refreshResponse.data.data;
              setConversation(refreshedConv);
            } catch (refreshError) {
              console.error('Failed to refresh conversation:', refreshError);
            }
          }
        }
        
        // Fetch online status for participants
        if (conv.participants) {
          const participantIds = conv.participants.map((p: any) => p.user_id);
          fetchOnlineStatus(participantIds);
        }
      } catch (error: any) {
        console.error('Failed to fetch conversation:', error);
        if (error.response?.status === 403 || error.response?.status === 404) {
          toast.error('Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập');
        } else {
          toast.error('Failed to load conversation');
        }
        router.push('/chat');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversation();
    fetchMessages(conversationId);

    // Setup socket listeners
    const setupSocket = async () => {
      const socket = await socketService.getSocket();
      if (socket && socket.connected) {
        socketService.joinConversation(conversationId);
        console.log('✅ Joined conversation room:', conversationId);
        
        // Register message handler
        socketService.onNewMessage(handleNewMessage);
        socketService.onUserTyping(handleUserTyping);
        socketService.onMessageEdited(handleMessageEdited);
        socketService.onMessageDeleted(handleMessageDeleted);
        socketService.onUserOnlineStatus(handleUserOnlineStatus);
        
        // Reaction handlers
        socketService.onReactionAdded(handleReactionAdded);
        socketService.onReactionRemoved(handleReactionRemoved);
        
        // Call handlers
        socketService.onCallOffer(handleCallOffer);
        socketService.onCallAnswer(handleCallAnswer);
        socketService.onCallIceCandidate(handleCallIceCandidate);
        socketService.onCallEnd(handleCallEnd);
        socketService.onCallDecline(handleCallDecline);
      }
    };

    setupSocket();

    return () => {
      console.log('👋 Leaving conversation:', conversationId);
      setActiveConversation(null);
      socketService.leaveConversation(conversationId);
      socketService.offNewMessage(handleNewMessage);
      socketService.offUserTyping(handleUserTyping);
      socketService.offMessageEdited(handleMessageEdited);
      socketService.offMessageDeleted(handleMessageDeleted);
      socketService.offUserOnlineStatus(handleUserOnlineStatus);
      socketService.offReactionAdded(handleReactionAdded);
      socketService.offReactionRemoved(handleReactionRemoved);
      socketService.offCallOffer(handleCallOffer);
      socketService.offCallAnswer(handleCallAnswer);
      socketService.offCallIceCandidate(handleCallIceCandidate);
      socketService.offCallEnd(handleCallEnd);
      socketService.offCallDecline(handleCallDecline);
    };
  }, [isAuthenticated, conversationId]);

  const fetchMessages = async (convId: string) => {
    try {
      console.log('📥 Fetching messages for conversation:', convId);
      const response = await api.get(`/chat/conversations/${convId}/messages`);
      const msgs = response.data.data || [];
      console.log('📥 Fetched messages:', msgs.length);
      setMessages(msgs);
      
      // Mark as read
      markAsRead(convId);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 300);
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const markAsRead = async (convId: string) => {
    try {
      await api.post(`/chat/conversations/${convId}/read`);
      resetUnread(convId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const fetchOnlineStatus = async (userIds: string[]) => {
    try {
      const response = await api.get(`/chat/status?userIds=${userIds.join(',')}`);
      const statusData = response.data.data;
      setOnlineStatus((prev) => {
        const newMap = new Map(prev);
        Object.entries(statusData).forEach(([userId, status]: [string, any]) => {
          newMap.set(userId, {
            userId,
            isOnline: status.isOnline,
            lastSeen: status.lastSeen,
          });
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to fetch online status:', error);
    }
  };

  const handleUserTyping = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
    if (data.conversationId === conversationId && data.userId !== user?.id) {
      if (data.isTyping) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      } else {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    }
  };

  const handleMessageEdited = (message: Message) => {
    if (message.conversation_id === conversationId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    }
  };

  const handleMessageDeleted = (data: { messageId: string }) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === data.messageId ? { ...m, is_deleted: true, content: undefined } : m
      )
    );
  };

  const handleUserOnlineStatus = (data: { userId: string; isOnline: boolean; lastSeen: string }) => {
    setOnlineStatus((prev) => {
      const newMap = new Map(prev);
      newMap.set(data.userId, {
        userId: data.userId,
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
      });
      return newMap;
    });
  };

  const handleReactionAdded = (data: { messageId: string; userId: string; emoji: string }) => {
    console.log('📝 Reaction added:', data);
    // Reload messages to get updated reactions
    fetchMessages(conversationId);
  };

  const handleReactionRemoved = (data: { messageId: string; userId: string; emoji: string }) => {
    console.log('📝 Reaction removed:', data);
    // Reload messages to get updated reactions
    fetchMessages(conversationId);
  };

  // Call handlers
  const handleCallOffer = async (data: {
    conversationId: string;
    callType: 'audio' | 'video';
    offer: RTCSessionDescriptionInit;
    callerId: string;
    caller?: User;
  }) => {
    if (data.callerId === user?.id || data.conversationId !== conversationId) {
      return;
    }
    
    // Clear global call state - we're handling it locally
    setCallState(null);
    
    let callerUser: User | undefined = data.caller;
    
    if (!callerUser && conversation?.participants) {
      callerUser = conversation.participants.find(p => p.user_id === data.callerId)?.user;
    }
    
    if (!callerUser) {
      try {
        const response = await api.get(`/users/${data.callerId}`);
        callerUser = response.data.data;
      } catch (error) {
        console.error('Failed to fetch caller info:', error);
      }
    }
    
    if (callerUser) {
      setCaller(callerUser);
      setCallType(data.callType);
      setCallOffer(data.offer);
      setIsIncomingCall(true);
      setIsCallActive(true);
      
      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {
        // Ignore
      }
    }
  };

  const handleCallAnswer = async (data: {
    conversationId: string;
    answer: RTCSessionDescriptionInit;
    userId: string;
  }) => {
    if (data.conversationId !== conversationId) return;
    await webrtcService.handleAnswer(data.conversationId, data.answer);
  };

  const handleCallIceCandidate = async (data: {
    conversationId: string;
    candidate: RTCIceCandidateInit;
    userId: string;
  }) => {
    if (data.conversationId !== conversationId) return;
    await webrtcService.handleIceCandidate(data.conversationId, data.candidate);
  };

  const handleCallEnd = (data: { conversationId: string; userId: string }) => {
    if (data.conversationId !== conversationId) return;
    endCall();
  };

  const handleCallDecline = (data: { conversationId: string; userId: string }) => {
    if (data.conversationId !== conversationId) return;
    endCall();
    toast('Cuộc gọi bị từ chối', { icon: '📞' });
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!conversation) return;

    try {
      const socket = await socketService.getSocket();
      if (!socket || !socket.connected) {
        toast.error('Chưa kết nối. Vui lòng thử lại.');
        return;
      }

      // Ensure we're joined to the conversation room
      try {
        socketService.joinConversation(conversationId);
        // Wait a bit for join to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Failed to join conversation:', error);
        // Continue anyway - backend will auto-join
      }

      // Clear global call state
      setCallState(null);

      setCallType(type);
      setIsIncomingCall(false);
      setIsCallActive(true);
      setCaller(null);

      await webrtcService.startCall({
        conversationId,
        callType: type,
        userId: user?.id || '',
        onLocalStream: (stream) => setLocalStream(stream),
        onRemoteStream: (stream) => setRemoteStream(stream),
        onCallEnd: () => endCall(),
      });
    } catch (error: any) {
      console.error('Failed to start call:', error);
      toast.error('Không thể bắt đầu cuộc gọi');
      endCall();
    }
  };

  const acceptCall = async () => {
    if (!conversation || !caller || !callOffer) return;

    try {
      // Clear global call state
      setCallState(null);
      
      setIsIncomingCall(false);
      
      await webrtcService.acceptCall({
        conversationId,
        callType: callType,
        userId: user?.id || '',
        onLocalStream: (stream) => setLocalStream(stream),
        onRemoteStream: (stream) => setRemoteStream(stream),
        onCallEnd: () => endCall(),
      }, callOffer);
      
      toast.success('Đã chấp nhận cuộc gọi');
    } catch (error: any) {
      console.error('Failed to accept call:', error);
      toast.error('Không thể chấp nhận cuộc gọi');
      endCall();
    }
  };

  const declineCall = () => {
    if (!conversation) return;
    socketService.sendCallDecline(conversationId, callType);
    endCall();
  };

  const endCall = async () => {
    const duration = callDuration;
    
    if (conversation) {
      webrtcService.endCall(conversationId);
      socketService.sendCallEnd(conversationId, callType, duration);
    }
    
    // Clear global call state
    setCallState(null);
    
    setIsCallActive(false);
    setIsIncomingCall(false);
    setLocalStream(null);
    setRemoteStream(null);
    setCaller(null);
    setCallOffer(null);
    setIsMicMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  };

  const toggleMic = () => {
    if (!conversation) return;
    const enabled = webrtcService.toggleMic(conversationId);
    setIsMicMuted(!enabled);
  };

  const toggleVideo = () => {
    if (!conversation) return;
    const enabled = webrtcService.toggleVideo(conversationId);
    setIsVideoOff(!enabled);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !conversation || !user?.id) return;

    const content = messageInput.trim();
    setMessageInput('');
    socketService.stopTyping(conversationId);
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Ensure socket is connected and joined to conversation
    try {
      const socket = await socketService.getSocket();
      if (!socket || !socket.connected) {
        toast.error('Chưa kết nối. Vui lòng thử lại.');
        return;
      }

      // Ensure we're joined to the conversation room
      socketService.joinConversation(conversationId);
      // Wait a bit for join to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Failed to setup socket:', error);
      toast.error('Không thể kết nối. Vui lòng refresh trang');
      return;
    }

    // Optimistically add message
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user?.id || '',
      message_type: 'text',
      content,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: user,
    };
    
    setMessages((prev) => [...prev, tempMessage].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ));
    
    try {
      socketService.sendMessage({
        conversationId,
        messageType: 'text',
        content,
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorMessage = error?.message || 'Không thể gửi tin nhắn';
      
      // If "Not a participant" error, try to refresh conversation
      if (errorMessage.includes('Not a participant')) {
        toast.error('Bạn không phải là thành viên. Đang làm mới...');
        // Refresh conversation
        try {
          const response = await api.get(`/chat/conversations/${conversationId}`);
          const updatedConv = response.data.data;
          setConversation(updatedConv);
          // Try sending again after refresh
          setTimeout(() => {
            toast('Vui lòng thử gửi lại', { icon: 'ℹ️' });
          }, 1000);
        } catch (refreshError) {
          console.error('Failed to refresh conversation:', refreshError);
          // Redirect to chat page if conversation doesn't exist
          router.push('/chat');
        }
      } else {
        toast.error(errorMessage);
      }
      
      setMessages((prev) => prev.filter(m => !m.id.startsWith('temp-')));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(conversationId);
    }, 2000);
  };

  const handleMessageUpdate = () => {
    fetchMessages(conversationId);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !conversation) {
    return null;
  }

  // Get other participant
  const otherParticipant = conversation.type === 'direct' 
    ? conversation.participants?.find(p => p.user_id !== user?.id)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-[calc(100vh-120px)]">
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Back button */}
              <button
                onClick={() => router.push('/chat')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>

              {/* Avatar and name */}
              <div className="relative w-10 h-10 rounded-full bg-gray-200">
                {conversation.type === 'direct' && otherParticipant?.user?.avatar_url ? (
                  <>
                    <Image
                      src={getImageUrl(otherParticipant.user.avatar_url)}
                      alt="Avatar"
                      fill
                      className="rounded-full object-cover"
                      unoptimized
                    />
                    {otherParticipant.user_id && 
                     onlineStatus.get(otherParticipant.user_id)?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                    {conversation.type === 'direct' && otherParticipant?.user
                      ? otherParticipant.user.first_name[0]
                      : conversation.name?.[0] || 'G'}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {conversation.type === 'direct' && otherParticipant?.user
                    ? `${otherParticipant.user.first_name} ${otherParticipant.user.last_name}`
                    : conversation.name}
                </h3>
                {typingUsers.size > 0 ? (
                  <p className="text-xs text-gray-500">đang nhập...</p>
                ) : conversation.type === 'direct' && otherParticipant?.user_id ? (
                  <p className="text-xs text-gray-400">
                    {onlineStatus.get(otherParticipant.user_id)?.isOnline
                      ? 'Đang hoạt động'
                      : `Hoạt động ${formatDate(onlineStatus.get(otherParticipant.user_id)?.lastSeen || '')}`}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    {conversation.participants?.length || 0} thành viên
                  </p>
                )}
              </div>
            </div>

            {/* Call buttons */}
            <div className="flex items-center space-x-2">
              {conversation.type === 'group' && (
                <button
                  onClick={() => setShowGroupSettings(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  title="Cài đặt nhóm"
                >
                  <FiUsers className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => startCall('audio')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Gọi thoại"
              >
                <FiPhone className="w-5 h-5" />
              </button>
              <button
                onClick={() => startCall('video')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Gọi video"
              >
                <FiVideo className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4"
            id="messages-container"
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
              </div>
            ) : (
              messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isOwnMessage={message.sender_id === user?.id}
                  currentUser={user!}
                  readReceipts={readReceipts}
                  onMessageUpdate={handleMessageUpdate}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-2 sm:p-4 border-t border-gray-200">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  <FiSmile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setMessageInput((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-2 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="p-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Call Modal */}
      {isCallActive && (
        <CallModal
          isOpen={isCallActive}
          callType={callType}
          isIncoming={isIncomingCall}
          caller={caller || undefined}
          conversationId={conversationId}
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
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && conversation && (
        <GroupSettings
          conversation={conversation}
          currentUser={user!}
          onClose={() => setShowGroupSettings(false)}
          onMemberAdded={() => {
            // Reload conversation
            api.get(`/chat/conversations/${conversationId}`)
              .then((response) => setConversation(response.data.data))
              .catch(console.error);
            fetchMessages(conversationId);
          }}
          onMemberRemoved={() => {
            // Reload conversation
            api.get(`/chat/conversations/${conversationId}`)
              .then((response) => setConversation(response.data.data))
              .catch(console.error);
            fetchMessages(conversationId);
          }}
        />
      )}
    </div>
  );
}

