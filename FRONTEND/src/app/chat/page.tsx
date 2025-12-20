'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChat } from '@/contexts/ChatContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { socketService } from '@/lib/socket';
import { webrtcService } from '@/lib/webrtc';
import { Conversation, Message, User } from '@/types';
import { getImageUrl, formatDate } from '@/lib/utils';
import { 
  FiMessageCircle, 
  FiSend, 
  FiImage, 
  FiMic, 
  FiVideo, 
  FiPhone,
  FiSmile,
  FiPaperclip,
  FiCheck,
  FiCheckCircle,
  FiUsers,
  FiSettings
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

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const { setActiveConversation, resetUnread, incrementUnread, setUnreadCount, setCallState } = useChat();
  const { subscribe, isSubscribed, isSupported, permissionStatus } = usePushNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Map<string, string>>(new Map()); // messageId -> userId who read it
  const [onlineStatus, setOnlineStatus] = useState<Map<string, OnlineStatus>>(new Map());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [recommendedContacts, setRecommendedContacts] = useState<User[]>([]);
  const [suggestedPage, setSuggestedPage] = useState(1);
  const [suggestedHasMore, setSuggestedHasMore] = useState(true);
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
  const suggestedScrollRef = useRef<HTMLDivElement>(null);
  
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
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesRef = useRef<Message[]>([]);
  
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const handleNewMessage = useCallback((message: Message) => {
    if (!message?.id || !message?.conversation_id) {
      return;
    }
    
    updateConversationInList(message.conversation_id);
    
    const currentConversation = selectedConversationRef.current;
    const isCurrent = message.conversation_id === currentConversation?.id;
    
    if (isCurrent) {
      setMessages((prev) => {
        const existingIndex = prev.findIndex(m => m.id === message.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = message;
          return updated.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        
        // Remove temp messages matching this message (by content, file_url, or sender)
        const filtered = prev.filter(m => {
          if (!m.id.startsWith('temp-')) return true;
          if (m.sender_id !== message.sender_id) return true;
          
          // Match text messages
          if (message.content && m.content === message.content) return false;
          
          // Match file messages (sticker, gif, image, video, audio)
          if (message.file_url && m.file_url === message.file_url) return false;
          
          return true;
        });
        
        const updated = [...filtered, message].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        messagesRef.current = updated;
        
        requestAnimationFrame(() => {
          setTimeout(() => {
            const container = document.getElementById('messages-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 50);
        });
        
        return updated;
      });
      
      if (message.sender_id !== user?.id && currentConversation) {
        markAsRead(currentConversation.id);
      }
    } else {
      // Message is for another conversation - update unread count
      
      setConversations((prev) => prev.map(conv => 
        conv.id === message.conversation_id 
          ? { ...conv, unread_count: (conv.unread_count || 0) + 1, last_message_at: message.created_at }
          : conv
      ));
      
      incrementUnread(message.conversation_id);
      
      // Also refresh conversations to get accurate count from server
      setTimeout(() => {
        fetchConversations();
      }, 500);
      
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath.startsWith('/chat')) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const senderName = message.sender 
            ? `${message.sender.first_name} ${message.sender.last_name}` 
            : 'Someone';
          let body = '';
          
          if (message.message_type === 'image') body = '📷 sent an image';
          else if (message.message_type === 'audio') body = '🎤 sent an audio';
          else if (message.message_type === 'video') body = '🎥 sent a video';
          else if (message.message_type === 'sticker') body = '🎨 sent a sticker';
          else if (message.message_type === 'gif') body = '🎬 sent a GIF';
          else {
            body = message.content || 'sent a message';
            if (body.length > 50) body = body.substring(0, 50) + '...';
          }
          
          try {
            const notification = new Notification(senderName, {
              body,
              icon: message.sender?.avatar_url || '/icon-192x192.png',
              tag: `message-${message.conversation_id}`,
              badge: '/icon-192x192.png',
            });
            
            notification.onclick = () => {
              window.focus();
              router.push(`/chat/${message.conversation_id}`);
              notification.close();
            };
            
            setTimeout(() => notification.close(), 5000);
          } catch (error) {
            }
        }
      }
    }
  }, [user?.id, incrementUnread, router]);

  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 300);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(() => {}).catch(() => {});
      }
      
      const handleError = (error: { message: string; conversationId?: string }) => {
        if (error.message.includes('Not a participant')) {
          toast.error('Bạn không phải là thành viên của cuộc trò chuyện này');
          if (error.conversationId === selectedConversationRef.current?.id) {
            if (error.conversationId) {
              updateConversationInList(error.conversationId);
            }
          }
        } else if (error.message.includes('Failed to join')) {
          toast.error('Không thể tham gia cuộc trò chuyện');
        } else {
          toast.error(error.message || 'Có lỗi xảy ra');
        }
      };

      const setupSocketListeners = () => {
        socketService.offNewMessage(handleNewMessage);
        socketService.offError(handleError);
        
        socketService.onNewMessage(handleNewMessage);
        socketService.onConversationUpdated(handleConversationUpdated);
        socketService.onUserTyping(handleUserTyping);
        socketService.onError(handleError);
        
        socketService.onCallOffer(handleCallOffer);
        socketService.onCallAnswer(handleCallAnswer);
        socketService.onCallIceCandidate(handleCallIceCandidate);
        socketService.onCallEnd(handleCallEnd);
        socketService.onCallDecline(handleCallDecline);
        
        socketService.onMessageEdited(handleMessageEdited);
        socketService.onMessageDeleted(handleMessageDeleted);
        
        socketService.onUserOnlineStatus(handleUserOnlineStatus);
        
        socketService.onMemberAdded(handleMemberAdded);
        socketService.onMemberRemoved(handleMemberRemoved);
        
        socketService.updateOnlineStatus(true);
        
        const currentConv = selectedConversationRef.current;
        if (currentConv) {
          socketService.joinConversation(currentConv.id);
          }
        
        };

      socketService.connect().then((socket) => {
        if (socket) {
          if (socket.connected) {
            setupSocketListeners();
          } else {
            socket.once('connect', () => {
              setupSocketListeners();
            });
          }
        } else {
          toast.error('Không thể kết nối đến server chat');
        }
      }).catch((error) => {
        toast.error('Lỗi kết nối chat server');
      });

      if (isSupported && !isSubscribed && permissionStatus !== 'denied') {
        subscribe().catch(() => {});
      }

      fetchConversations();
      fetchRecommendedContacts();

      return () => {
        socketService.offNewMessage(handleNewMessage);
        socketService.offConversationUpdated(handleConversationUpdated);
        socketService.offUserTyping(handleUserTyping);
        socketService.offError(handleError);
        socketService.offCallOffer(handleCallOffer);
        socketService.offCallAnswer(handleCallAnswer);
        socketService.offCallIceCandidate(handleCallIceCandidate);
        socketService.offCallEnd(handleCallEnd);
        socketService.offCallDecline(handleCallDecline);
        socketService.offMessageEdited(handleMessageEdited);
        socketService.offMessageDeleted(handleMessageDeleted);
        socketService.offUserOnlineStatus(handleUserOnlineStatus);
        socketService.offMemberAdded(handleMemberAdded);
        socketService.offMemberRemoved(handleMemberRemoved);
        
        socketService.updateOnlineStatus(false);
      };
    }
  }, [isAuthenticated, handleNewMessage]);

  useEffect(() => {
    if (selectedConversation) {
      setActiveConversation(selectedConversation.id);
      
      const joinConversationRoom = async () => {
        try {
          const socket = await socketService.getSocket();
          if (socket && socket.connected) {
            socketService.joinConversation(selectedConversation.id);
            socketService.offNewMessage(handleNewMessage);
            socketService.onNewMessage(handleNewMessage);
            } else {
            socket?.once('connect', () => {
              socketService.joinConversation(selectedConversation.id);
              socketService.offNewMessage(handleNewMessage);
              socketService.onNewMessage(handleNewMessage);
              });
            if (!socket) {
              await socketService.connect();
              const newSocket = await socketService.getSocket();
              if (newSocket && newSocket.connected) {
                socketService.joinConversation(selectedConversation.id);
                socketService.offNewMessage(handleNewMessage);
                socketService.onNewMessage(handleNewMessage);
              }
            }
          }
        } catch (error) {
          }
      };
      
      joinConversationRoom();
      fetchMessages(selectedConversation.id);
      
      if (selectedConversation.type === 'direct' && selectedConversation.participants?.[0]?.user_id) {
        const participantId = selectedConversation.participants[0].user_id;
        fetchOnlineStatus([participantId]);
      } else if (selectedConversation.participants) {
        const participantIds = selectedConversation.participants.map(p => p.user_id);
        fetchOnlineStatus(participantIds);
      }
    } else {
      setActiveConversation(null);
    }

    return () => {
      if (selectedConversation) {
        socketService.leaveConversation(selectedConversation.id);
        }
    };
  }, [selectedConversation, setActiveConversation, handleNewMessage]);

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
      }
  };

  const handleConversationUpdated = (data: { conversationId: string; message: Message }) => {
    if (data.conversationId !== selectedConversation?.id) {
      updateConversationInList(data.conversationId);
    }
  };

  const handleUserTyping = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
    if (data.conversationId === selectedConversation?.id && data.userId !== user?.id) {
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
    if (message.conversation_id === selectedConversation?.id) {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m))
      );
    }
  };

  const handleMessageDeleted = (data: { messageId: string }) => {
    if (selectedConversation) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, is_deleted: true, content: undefined } : m
        )
      );
    }
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

  const handleMemberAdded = (data: { conversationId: string; userId: string; conversation: Conversation }) => {
    if (data.conversationId === selectedConversation?.id) {
      setSelectedConversation(data.conversation);
    }
    updateConversationInList(data.conversationId);
  };

  const handleMemberRemoved = (data: { conversationId: string; userId: string }) => {
    if (data.conversationId === selectedConversation?.id) {
      fetchConversations();
      if (data.userId === user?.id) {
        setSelectedConversation(null);
      } else {
        fetchMessages(data.conversationId);
      }
    }
    updateConversationInList(data.conversationId);
  };

  const handleCallOffer = async (data: {
    conversationId: string;
    callType: 'audio' | 'video';
    offer: RTCSessionDescriptionInit;
    callerId: string;
    caller?: User; // Caller info from backend
  }) => {
    if (data.callerId === user?.id) {
      return;
    }
    
    setCallState(null);
    
    let callerUser: User | undefined = data.caller; // Use caller from backend first
    let callConversation: Conversation | undefined;
    
    if (!callerUser) {
      if (data.conversationId === selectedConversation?.id) {
        callerUser = selectedConversation?.participants?.find(p => p.user_id === data.callerId)?.user;
        callConversation = selectedConversation;
      } else {
        const conv = conversations.find(c => c.id === data.conversationId);
        callerUser = conv?.participants?.find(p => p.user_id === data.callerId)?.user;
        callConversation = conv;
      }
    }
    
    if (!callerUser) {
      try {
        const response = await api.get(`/users/${data.callerId}`);
        callerUser = response.data.data;
      } catch (error) {
        callerUser = {
          id: data.callerId,
          first_name: 'Unknown',
          last_name: 'User',
        } as User;
      }
    }
    
    if (!callConversation) {
      try {
        const response = await api.get(`/chat/conversations/${data.conversationId}`);
        callConversation = response.data.data;
        setConversations((prev) => {
          const exists = prev.find(c => c.id === callConversation?.id);
          if (exists) return prev;
          return [callConversation!, ...prev];
        });
      } catch (error) {
        }
    }
    
    if (callerUser && callConversation) {
      setSelectedConversation(callConversation);
      
      setCaller(callerUser);
      setCallType(data.callType);
      setCallOffer(data.offer);
      setIsIncomingCall(true);
      setIsCallActive(true);
      
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {}); // Ignore if audio fails
      } catch (e) {
      }
      
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification(`Incoming ${data.callType === 'video' ? 'Video' : 'Audio'} Call`, {
            body: `${callerUser.first_name} ${callerUser.last_name} is calling you`,
            icon: callerUser.avatar_url || '/icon-192x192.png',
            tag: `call-${data.conversationId}`,
            requireInteraction: true,
            badge: '/icon-192x192.png',
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (error) {
          }
      }
    }
  };

  const handleCallAnswer = async (data: {
    conversationId: string;
    answer: RTCSessionDescriptionInit;
    userId: string;
  }) => {
    if (data.conversationId !== selectedConversation?.id) return;
    await webrtcService.handleAnswer(data.conversationId, data.answer);
  };

  const handleCallIceCandidate = async (data: {
    conversationId: string;
    candidate: RTCIceCandidateInit;
    userId: string;
  }) => {
    if (data.conversationId !== selectedConversation?.id) return;
    await webrtcService.handleIceCandidate(data.conversationId, data.candidate);
  };

  const handleCallEnd = (data: { conversationId: string; userId: string }) => {
    if (data.conversationId !== selectedConversation?.id) return;
    endCall();
  };

  const handleCallDecline = (data: { conversationId: string; userId: string }) => {
    if (data.conversationId !== selectedConversation?.id) return;
    endCall();
    toast('Call declined', { icon: '📞' });
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation) return;

    try {
      const socket = await socketService.getSocket();
      if (!socket || !socket.connected) {
        toast.error('Socket not connected. Please refresh the page.');
        return;
      }

      try {
        socketService.joinConversation(selectedConversation.id);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        }

      setCallState(null);

      setCallType(type);
      setIsIncomingCall(false);
      setIsCallActive(true);
      setCaller(null);

      await webrtcService.startCall({
        conversationId: selectedConversation.id,
        callType: type,
        userId: user?.id || '',
        onLocalStream: (stream) => {
          setLocalStream(stream);
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onCallEnd: () => {
          endCall();
        },
      });
      
      } catch (error: any) {
      toast.error('Failed to start call');
      endCall();
    }
  };

  const acceptCall = async () => {
    if (!selectedConversation || !caller || !callOffer) return;

    try {
      setCallState(null);
      
      setIsIncomingCall(false);
      
      await webrtcService.acceptCall({
        conversationId: selectedConversation.id,
        callType: callType,
        userId: user?.id || '',
        onLocalStream: (stream) => {
          setLocalStream(stream);
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onCallEnd: () => {
          endCall();
        },
      }, callOffer);
    } catch (error: any) {
      toast.error('Không thể chấp nhận cuộc gọi');
      endCall();
    }
  };

  const declineCall = () => {
    if (!selectedConversation) return;
    socketService.sendCallDecline(selectedConversation.id, callType);
    endCall();
  };

  const endCall = async () => {
    const duration = callDuration;
    const conversationId = selectedConversation?.id;
    const callTypeToEnd = callType;
    
    if (selectedConversation) {
      webrtcService.endCall(selectedConversation.id);
      socketService.sendCallEnd(selectedConversation.id, callTypeToEnd, duration);
    }
    
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
    
    // Ensure socket is still connected and ready for messages
    if (selectedConversation) {
      setTimeout(async () => {
        try {
          const socket = await socketService.getSocket();
          if (socket && socket.connected) {
            socketService.joinConversation(selectedConversation.id);
          }
        } catch (error) {
        }
      }, 500);
    }
  };

  const toggleMic = () => {
    if (!selectedConversation) return;
    const wasMuted = isMicMuted;
    const enabled = webrtcService.toggleMic(selectedConversation.id);
    if (enabled !== undefined && enabled !== null) {
      setIsMicMuted(!enabled);
    } else {
      setIsMicMuted(!wasMuted);
    }
  };

  const toggleVideo = () => {
    if (!selectedConversation) return;
    const wasVideoOff = isVideoOff;
    const enabled = webrtcService.toggleVideo(selectedConversation.id);
    if (enabled !== undefined && enabled !== null) {
      setIsVideoOff(!enabled);
    } else {
      setIsVideoOff(!wasVideoOff);
    }
  };

  const fetchRecommendedContacts = async (page: number = 1, append: boolean = false) => {
    try {
      setIsLoadingSuggested(true);
      const response = await api.get(`/chat/recommended-contacts?limit=20&page=${page}`);
      const newContacts = response.data.data || [];
      
      if (append) {
        setRecommendedContacts((prev) => {
          const combined = [...prev, ...newContacts];
          const unique = Array.from(
            new Map(combined.map(contact => [contact.id, contact])).values()
          );
          return unique;
        });
      } else {
        setRecommendedContacts(newContacts);
      }
      
      setSuggestedHasMore(newContacts.length === 20);
      setIsLoadingSuggested(false);
    } catch (error: any) {
      setIsLoadingSuggested(false);
    }
  };
  
  const handleSuggestedScroll = () => {
    const container = suggestedScrollRef.current;
    if (!container || isLoadingSuggested || !suggestedHasMore) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 100;
    
    if (isNearEnd) {
      const nextPage = suggestedPage + 1;
      setSuggestedPage(nextPage);
      fetchRecommendedContacts(nextPage, true);
    }
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/chat/conversations');
      const conversationsData = response.data.data;
      setConversations(conversationsData);
      
      conversationsData.forEach((conv: Conversation) => {
        if (conv.unread_count && conv.unread_count > 0) {
          setUnreadCount(conv.id, conv.unread_count);
        }
      });
      
      const userId = searchParams?.get('userId');
      if (userId && user && userId !== user.id) {
        const existingConv = conversationsData.find((conv: Conversation) => 
          conv.type === 'direct' && 
          conv.participants?.some(p => p.user_id === userId)
        );
        
        if (existingConv) {
          setSelectedConversation(existingConv);
          router.replace('/chat');
        } else {
          try {
            const convResponse = await api.get(`/chat/conversations/direct/${userId}`);
            const newConversation = convResponse.data.data;
            setSelectedConversation(newConversation);
            setConversations((prev) => [newConversation, ...prev]);
            
            try {
              socketService.joinConversation(newConversation.id);
            } catch (error) {
              }
            
            router.replace('/chat');
          } catch (error: any) {
            toast.error('Failed to start conversation');
          }
        }
      }
    } catch (error: any) {
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      const messages = response.data.data || [];
      setMessages(messages);
      
      markAsRead(conversationId);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 300);
    } catch (error: any) {
      toast.error('Failed to load messages');
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/read`);
      
      setReadReceipts((prev) => {
        const newMap = new Map(prev);
        messages.forEach((msg) => {
          if (msg.sender_id !== user?.id) {
            newMap.set(msg.id, user?.id || '');
          }
        });
        return newMap;
      });
      
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === conversationId) {
            return { ...conv, unread_count: 0 };
          }
          return conv;
        });
      });
      
      resetUnread(conversationId);
    } catch (error) {
      }
  };

  const updateConversationInList = (conversationId: string) => {
    api.get(`/chat/conversations/${conversationId}`)
      .then((response) => {
        const updatedConv = response.data.data;
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === conversationId);
          
          let newConvs: Conversation[];
          if (index >= 0) {
            newConvs = [...prev];
            newConvs[index] = updatedConv;
          } else {
            newConvs = [updatedConv, ...prev];
          }
          
          const uniqueConvs = Array.from(
            new Map(newConvs.map(conv => [conv.id, conv])).values()
          );
          
          if (updatedConv.unread_count && updatedConv.unread_count > 0) {
            setUnreadCount(conversationId, updatedConv.unread_count);
          } else {
            resetUnread(conversationId);
          }
          
          return uniqueConvs.sort((a, b) => {
            const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bTime - aTime;
          });
        });
      })
      .catch((error) => {
        });
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !user?.id) return;

    const content = messageInput.trim();
    setMessageInput('');
    socketService.stopTyping(selectedConversation.id);
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const socket = await socketService.getSocket();
    if (!socket || !socket.connected) {
      toast.error('Đang kết nối... Vui lòng thử lại');
      try {
        await socketService.connect();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        toast.error('Không thể kết nối. Vui lòng refresh trang');
        return;
      }
    }

    try {
      socketService.joinConversation(selectedConversation.id);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      }

    try {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_id: user?.id || '',
        message_type: 'text',
        content,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: user ? {
          ...user,
        } : undefined,
      };
      
      setMessages((prev) => {
        const newMessages = [...prev, tempMessage];
        return newMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      
      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'text',
        content,
      });
      
      } catch (error: any) {
      const errorMessage = error?.message || 'Không thể gửi tin nhắn';
      
      if (errorMessage.includes('Not a participant')) {
        toast.error('Bạn không phải là thành viên. Đang làm mới...');
        if (selectedConversation) {
          try {
            const response = await api.get(`/chat/conversations/${selectedConversation.id}`);
            const updatedConv = response.data.data;
            setSelectedConversation(updatedConv);
            setTimeout(() => {
              toast('Vui lòng thử gửi lại', { icon: 'ℹ️' });
            }, 1000);
          } catch (refreshError) {
            }
        }
      } else {
        toast.error(errorMessage);
      }
      
      setMessages((prev) => prev.filter(m => !m.id.startsWith('temp-')));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (!isTyping && selectedConversation) {
      setIsTyping(true);
      socketService.startTyping(selectedConversation.id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConversation) {
        setIsTyping(false);
        socketService.stopTyping(selectedConversation.id);
      }
    }, 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/posts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = uploadResponse.data.data.url;

      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'image',
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (error: any) {
      toast.error('Failed to send image');
    }
    
    e.target.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/posts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = uploadResponse.data.data.url;

      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'file',
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (error: any) {
      toast.error('Failed to send file');
    }
    
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/posts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = uploadResponse.data.data.url;

      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'video',
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (error: any) {
      toast.error('Failed to send video');
    }
    
    e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = async (gifUrl: string) => {
    if (!selectedConversation) return;

    try {
      // Optimistic update for GIF
      const tempGifMessage: Message = {
        id: `temp-gif-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_id: user?.id || '',
        message_type: 'gif',
        file_url: gifUrl,
        file_name: 'gif.gif',
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: user!,
      };
      
      setMessages((prev) => {
        const exists = prev.find(m => m.id === tempGifMessage.id);
        if (exists) return prev;
        return [...prev, tempGifMessage].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'gif',
        fileUrl: gifUrl,
        fileName: 'gif.gif',
      });
    } catch (error: any) {
      toast.error('Failed to send GIF');
    }
  };

  const handleStickerSelect = async (stickerUrl: string) => {
    if (!selectedConversation) return;

    try {
      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'sticker',
        fileUrl: stickerUrl,
        fileName: 'sticker.png',
      });
      // Optimistic update for sticker
      const tempStickerMessage: Message = {
        id: `temp-sticker-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_id: user?.id || '',
        message_type: 'sticker',
        file_url: stickerUrl,
        file_name: 'sticker.png',
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: user!,
      };
      
      setMessages((prev) => {
        const exists = prev.find(m => m.id === tempStickerMessage.id);
        if (exists) return prev;
        return [...prev, tempStickerMessage].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    } catch (error: any) {
      toast.error('Failed to send sticker');
    }
  };

  const handleMessageUpdate = () => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedConversation) return;

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');

      const uploadResponse = await api.post('/posts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileUrl = uploadResponse.data.data.url;

      socketService.sendMessage({
        conversationId: selectedConversation.id,
        messageType: 'audio',
        fileUrl,
        fileName: 'voice-message.webm',
        fileSize: audioBlob.size,
      });
    } catch (error: any) {
      toast.error('Failed to send voice message');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)]">
          
          <div className={`lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col ${
            selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Messages</h2>
            </div>

            {recommendedContacts.length > 0 && (
              <div className="p-2 sm:p-4 border-b border-gray-200">
                <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Gợi ý</h3>
                <div 
                  ref={suggestedScrollRef}
                  onScroll={handleSuggestedScroll}
                  className="flex space-x-2 overflow-x-auto pb-2 scroll-smooth"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {recommendedContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={async () => {
                        try {
                          const response = await api.get(`/chat/conversations/direct/${contact.id}`);
                          const conversation = response.data.data;
                          setSelectedConversation(conversation);
                          setConversations((prev) => {
                            const exists = prev.find(c => c.id === conversation.id);
                            if (exists) return prev;
                            return [conversation, ...prev];
                          });
                          
                          try {
                            socketService.joinConversation(conversation.id);
                          } catch (error) {
                            }
                        } catch (error: any) {
                          toast.error('Failed to start conversation');
                        }
                      }}
                      className="flex-shrink-0 flex flex-col items-center space-y-1 hover:opacity-80 transition"
                    >
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200">
                        {contact.avatar_url ? (
                          <Image
                            src={getImageUrl(contact.avatar_url)}
                            alt={`${contact.first_name} ${contact.last_name}`}
                            fill
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                            {contact.first_name[0]}{contact.last_name[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 truncate max-w-[60px]">
                        {contact.first_name}
                      </span>
                    </button>
                  ))}
                  {isLoadingSuggested && (
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12">
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="spinner"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => {
                  const hasUnread = (conv.unread_count || 0) > 0;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        if (window.innerWidth < 1024) {
                        }
                      }}
                      className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer transition ${
                        selectedConversation?.id === conv.id 
                          ? 'bg-gray-50' 
                          : hasUnread 
                            ? 'bg-red-50 hover:bg-red-100' 
                            : 'hover:bg-gray-50'
                      }`}
                    >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex-shrink-0">
                        {(() => {
                          const otherParticipant = conv.type === 'direct' 
                            ? conv.participants?.find(p => p.user_id !== user?.id)
                            : null;
                          
                          if (conv.type === 'direct' && otherParticipant?.user?.avatar_url) {
                            return (
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
                            );
                          } else {
                            return (
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                                {conv.type === 'direct'
                                  ? (() => {
                                      const otherParticipant = conv.participants?.find(p => p.user_id !== user?.id);
                                      return otherParticipant?.user?.first_name?.[0] || 'U';
                                    })()
                                  : conv.name?.[0] || 'G'}
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conv.type === 'direct'
                              ? (() => {
                                  const otherParticipant = conv.participants?.find(p => p.user_id !== user?.id);
                                  return otherParticipant?.user 
                                    ? `${otherParticipant.user.first_name} ${otherParticipant.user.last_name}`
                                    : 'Unknown User';
                                })()
                              : conv.name}
                          </p>
                          {conv.unread_count && conv.unread_count > 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium text-white bg-purple-600 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conv.last_message_at && formatDate(conv.last_message_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col ${
            !selectedConversation ? 'hidden lg:flex' : 'flex'
          }`}>
            {selectedConversation ? (
              <>
                
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden p-2 border-b border-gray-200 text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>

                <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const otherParticipant = selectedConversation.type === 'direct' 
                        ? selectedConversation.participants?.find(p => p.user_id !== user?.id)
                        : null;
                      
                      return (
                        <div className="relative w-10 h-10 rounded-full bg-gray-200">
                          {selectedConversation.type === 'direct' && otherParticipant?.user?.avatar_url ? (
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
                              {selectedConversation.type === 'direct'
                                ? (() => {
                                    const otherParticipant = selectedConversation.participants?.find(p => p.user_id !== user?.id);
                                    return otherParticipant?.user?.first_name?.[0] || 'U';
                                  })()
                                : selectedConversation.name?.[0] || 'G'}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {selectedConversation.type === 'direct'
                          ? (() => {
                              const otherParticipant = selectedConversation.participants?.find(p => p.user_id !== user?.id);
                              return otherParticipant?.user 
                                ? `${otherParticipant.user.first_name} ${otherParticipant.user.last_name}`
                                : 'Unknown User';
                            })()
                          : selectedConversation.name}
                      </h3>
                      {typingUsers.size > 0 ? (
                        <p className="text-xs text-gray-500">typing...</p>
                      ) : selectedConversation.type === 'direct' ? (() => {
                        const otherParticipant = selectedConversation.participants?.find(p => p.user_id !== user?.id);
                        return otherParticipant?.user_id ? (
                          <p className="text-xs text-gray-400">
                            {onlineStatus.get(otherParticipant.user_id)?.isOnline
                              ? 'Online'
                              : `Last seen ${formatDate(onlineStatus.get(otherParticipant.user_id)?.lastSeen || '')}`}
                          </p>
                        ) : null;
                      })() : (
                        <p className="text-xs text-gray-400">
                          {selectedConversation.participants?.length || 0} members
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedConversation.type === 'group' && (
                      <button
                        onClick={() => setShowGroupSettings(true)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                        title="Group settings"
                      >
                        <FiUsers className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => startCall('audio')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                      title="Voice call"
                    >
                      <FiPhone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                      title="Video call"
                    >
                      <FiVideo className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div 
                  className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4"
                  id="messages-container"
                >
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No messages yet. Start the conversation!
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

                <div className="p-2 sm:p-4 border-t border-gray-200">
                  {isRecording && (
                    <div className="mb-2 flex items-center justify-center space-x-2 text-red-600">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-xs sm:text-sm font-medium">Recording: {formatRecordingTime(recordingTime)}</span>
                      <button
                        onClick={stopVoiceRecording}
                        className="text-xs sm:text-sm underline hover:text-red-700"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="relative">
                      <label className="cursor-pointer p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                        <FiPaperclip className="w-5 h-5" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.type.startsWith('image/')) {
                              handleImageUpload(e as any);
                            } else if (file.type.startsWith('video/')) {
                              handleVideoUpload(e as any);
                            } else {
                              handleFileUpload(e as any);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <button
                      onMouseDown={startVoiceRecording}
                      onMouseUp={stopVoiceRecording}
                      onTouchStart={startVoiceRecording}
                      onTouchEnd={stopVoiceRecording}
                      className={`p-2 rounded-lg transition ${
                        isRecording
                          ? 'text-red-600 bg-red-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Hold to record voice"
                    >
                      <FiMic className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                      >
                        <FiSmile className="w-5 h-5" />
                      </button>
                      {showEmojiPicker && (
                        <EmojiPicker
                          onSelect={handleEmojiSelect}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </div>
                    <GifPicker onGifSelect={handleGifSelect} />
                    <StickerPicker onStickerSelect={handleStickerSelect} />
                    <input
                      type="text"
                      value={messageInput}
                      onChange={handleInputChange}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>

      {isCallActive && (
        <CallModal
          isOpen={isCallActive}
          callType={callType}
          isIncoming={isIncomingCall}
          caller={caller || undefined}
          conversationId={selectedConversation?.id}
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

      {showGroupSettings && selectedConversation && (
        <GroupSettings
          conversation={selectedConversation}
          currentUser={user!}
          onClose={() => setShowGroupSettings(false)}
          onMemberAdded={() => {
            fetchConversations();
            if (selectedConversation) {
              fetchMessages(selectedConversation.id);
            }
          }}
          onMemberRemoved={() => {
            fetchConversations();
            if (selectedConversation) {
              fetchMessages(selectedConversation.id);
            }
          }}
        />
      )}
    </div>
  );
}
