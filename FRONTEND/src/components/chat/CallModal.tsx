'use client';

import { useEffect, useRef, useState } from 'react';
import { FiPhone, FiVideo, FiX, FiMic, FiMicOff, FiVideoOff } from 'react-icons/fi';
import Image from 'next/image';
import { User } from '@/types';
import { getImageUrl } from '@/lib/utils';
import { socketService } from '@/lib/socket';

interface CallModalProps {
  isOpen: boolean;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  caller?: User;
  conversationId?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  isMicMuted?: boolean;
  isVideoOff?: boolean;
  onDurationChange?: (duration: number) => void;
}

export default function CallModal({
  isOpen,
  callType,
  isIncoming,
  caller,
  conversationId,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
  onToggleMic,
  onToggleVideo,
  isMicMuted = false,
  isVideoOff = false,
  onDurationChange,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (localStream && videoElement) {
      console.log('📹 Setting local video stream:', localStream);
      videoElement.srcObject = localStream;
      videoElement.play().catch((error) => {
        console.error('Error playing local video:', error);
      });
      
      // Log video track status
      localStream.getVideoTracks().forEach(track => {
        console.log('📹 Local video track:', track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
      });
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
    
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [localStream]);

  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    if (remoteStream && videoElement) {
      console.log('📹 Setting remote video stream:', remoteStream);
      videoElement.srcObject = remoteStream;
      videoElement.play().catch((error) => {
        console.error('Error playing remote video:', error);
      });
      
      // Log video track status
      remoteStream.getVideoTracks().forEach(track => {
        console.log('📹 Remote video track:', track.label, 'enabled:', track.enabled, 'readyState:', track.readyState);
      });
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
    
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [remoteStream]);

  // Audio level visualization
  useEffect(() => {
    if (localStream && isOpen && !isIncoming) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(localStream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateAudioLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
            setAudioLevel(normalizedLevel);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        
        updateAudioLevel();
      } catch (error) {
        console.error('Failed to setup audio level visualization:', error);
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setAudioLevel(0);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [localStream, isOpen, isIncoming]);

  useEffect(() => {
    // Chỉ start timer khi:
    // 1. Call đang active (isOpen = true)
    // 2. Không phải incoming call (isIncoming = false - đã accept)
    // 3. Có REMOTE stream (đối phương đã connected)
    if (isOpen && !isIncoming && remoteStream) {
      console.log('⏱️ Starting call timer - remote connected');
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;
          // Notify parent component of duration change
          if (onDurationChange) {
            onDurationChange(newDuration);
          }
          return newDuration;
        });
      }, 1000);
    } else {
      // Clear timer nếu không đủ điều kiện
      if (durationTimerRef.current) {
        console.log('⏱️ Stopping call timer');
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      // Reset duration khi call không còn active
      if (!isOpen) {
        setCallDuration(0);
        if (onDurationChange) {
          onDurationChange(0);
        }
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isOpen, isIncoming, remoteStream, onDurationChange]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center" 
      onClick={(e) => {
        // Don't close on background click for incoming calls
        if (isIncoming) {
          e.stopPropagation();
        }
      }}
    >
      <div className="relative w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Remote video (main view) */}
        {callType === 'video' && (
          <div className="flex-1 relative bg-gray-900" style={{ paddingBottom: '120px' }}>
            {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                muted={false}
                onLoadedMetadata={() => {
                  console.log('✅ Remote video metadata loaded');
                  remoteVideoRef.current?.play().catch(console.error);
                }}
                onError={(e) => {
                  console.error('❌ Remote video error:', e);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                {caller && (
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      {caller.avatar_url ? (
                        <Image
                          src={getImageUrl(caller.avatar_url)}
                          alt={caller.first_name}
                          fill
                          className="rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white text-4xl font-semibold">
                          {caller.first_name[0]}{caller.last_name[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-xl font-medium">
                      {caller.first_name} {caller.last_name}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Audio Level Indicator for Video Call */}
            {!isIncoming && localStream && !isMicMuted && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex items-center justify-center space-x-1 h-8 bg-black bg-opacity-60 rounded-full px-4 py-2 backdrop-blur-sm">
                {Array.from({ length: 20 }).map((_, i) => {
                  const barHeight = audioLevel * 100;
                  const isActive = (i / 20) * 100 < barHeight;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isActive
                          ? 'bg-green-400'
                          : 'bg-gray-500'
                      }`}
                      style={{
                        height: `${Math.max(4, (i / 20) * 20)}px`,
                        opacity: isActive ? 1 : 0.3,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Local video (small view) */}
        {callType === 'video' && localStream && localStream.getVideoTracks().length > 0 && (
          <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden bg-gray-900 border-2 border-white shadow-lg z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              muted
              onLoadedMetadata={() => {
                console.log('✅ Local video metadata loaded');
                localVideoRef.current?.play().catch(console.error);
              }}
              onError={(e) => {
                console.error('❌ Local video error:', e);
              }}
            />
          </div>
        )}

        {/* Audio call view */}
        {callType === 'audio' && (
          <div className="flex-1 flex items-center justify-center bg-gray-900" style={{ paddingBottom: '120px' }}>
            <div className="text-center">
              {caller && (
                <>
                  <div className="relative w-48 h-48 mx-auto mb-6 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {caller.avatar_url ? (
                      <Image
                        src={getImageUrl(caller.avatar_url)}
                        alt={caller.first_name}
                        fill
                        className="rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-white text-6xl font-semibold">
                        {caller.first_name[0]}{caller.last_name[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-2xl font-medium mb-2">
                    {caller.first_name} {caller.last_name}
                  </p>
                </>
              )}
              <p className="text-gray-400 mb-4">
                {isIncoming ? 'Cuộc gọi đến...' : formatDuration(callDuration)}
              </p>
              
              {/* Audio Level Indicator */}
              {!isIncoming && localStream && !isMicMuted && (
                <div className="flex items-center justify-center space-x-1 h-10 mb-4">
                  {Array.from({ length: 25 }).map((_, i) => {
                    const barHeight = audioLevel * 100;
                    const isActive = (i / 25) * 100 < barHeight;
                    const barHeightPx = Math.max(6, (i / 25) * 32);
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-75 ${
                          isActive
                            ? i < 10
                              ? 'bg-green-400'
                              : i < 18
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                            : 'bg-gray-600'
                        }`}
                        style={{
                          height: `${barHeightPx}px`,
                          opacity: isActive ? 1 : 0.25,
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div 
          className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-4 z-[70] pointer-events-auto"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isIncoming ? (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('✅ Accept button clicked');
                  onAccept();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-4 bg-green-600 rounded-full text-white hover:bg-green-700 active:bg-green-800 transition cursor-pointer z-[70] relative shadow-lg"
                type="button"
                style={{ pointerEvents: 'auto', zIndex: 70 }}
              >
                {callType === 'video' ? <FiVideo className="w-6 h-6" /> : <FiPhone className="w-6 h-6" />}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('❌ Decline button clicked');
                  onDecline();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700 active:bg-red-800 transition cursor-pointer z-[70] relative shadow-lg"
                type="button"
                style={{ pointerEvents: 'auto', zIndex: 70 }}
              >
                <FiX className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleMic();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className={`p-4 rounded-full text-white transition cursor-pointer shadow-lg ${
                  isMicMuted ? 'bg-red-600 hover:bg-red-700 active:bg-red-800' : 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500'
                }`}
                type="button"
                style={{ pointerEvents: 'auto' }}
              >
                {isMicMuted ? <FiMicOff className="w-6 h-6" /> : <FiMic className="w-6 h-6" />}
              </button>
              {callType === 'video' && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleVideo();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className={`p-4 rounded-full text-white transition cursor-pointer shadow-lg ${
                    isVideoOff ? 'bg-red-600 hover:bg-red-700 active:bg-red-800' : 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500'
                  }`}
                  type="button"
                  style={{ pointerEvents: 'auto' }}
                >
                  {isVideoOff ? <FiVideoOff className="w-6 h-6" /> : <FiVideo className="w-6 h-6" />}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEnd();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700 active:bg-red-800 transition cursor-pointer shadow-lg"
                type="button"
                style={{ pointerEvents: 'auto' }}
              >
                <FiPhone className="w-6 h-6 rotate-[135deg]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


