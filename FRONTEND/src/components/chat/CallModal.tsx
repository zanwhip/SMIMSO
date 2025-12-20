'use client';

import { useEffect, useRef, useState } from 'react';
import { FiPhone, FiVideo, FiX, FiMic, FiMicOff, FiVideoOff, FiRefreshCw } from 'react-icons/fi';
import Image from 'next/image';
import { User } from '@/types';
import { getImageUrl } from '@/lib/utils';
import { socketService } from '@/lib/socket';
import { webrtcService } from '@/lib/webrtc';
import { soundEffects } from '@/lib/sound-effects';

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
  onSwitchCamera?: () => void;
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
  onSwitchCamera,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const remoteAnimationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const remoteAudioContextRef = useRef<AudioContext | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedConnectedSoundRef = useRef(false);

  // Check for multiple cameras
  useEffect(() => {
    if (callType === 'video' && !isIncoming && isOpen) {
      webrtcService.getMediaDevices().then((devices) => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      });
    }
  }, [callType, isIncoming, isOpen]);

  // Vibrate and play sound on incoming call
  useEffect(() => {
    if (isIncoming && isOpen) {
      // Vibrate
      if ('vibrate' in navigator) {
        const pattern = [200, 100, 200, 100, 200];
        navigator.vibrate(pattern);
        
        vibrationIntervalRef.current = setInterval(() => {
          navigator.vibrate(pattern);
        }, 3000);
      }

      // Play incoming call sound
      soundEffects.playIncomingCall();

      return () => {
        if (vibrationIntervalRef.current) {
          clearInterval(vibrationIntervalRef.current);
          if ('vibrate' in navigator) {
            navigator.vibrate(0);
          }
        }
        soundEffects.stopIncomingCall();
      };
    } else {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
      soundEffects.stopIncomingCall();
    }
  }, [isIncoming, isOpen]);

  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (localStream && videoElement) {
      videoElement.srcObject = localStream;
      
      const playVideo = async () => {
        try {
          await videoElement.play();
          if (videoElement.paused) {
            videoElement.play().catch(() => {});
          }
        } catch (error) {
          setTimeout(() => {
            videoElement.play().catch(() => {});
          }, 100);
        }
      };
      
      playVideo();
      
      localStream.getVideoTracks().forEach(track => {
        track.onended = () => {};
      });
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
    
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [localStream, isVideoOff]);

  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    if (remoteStream && videoElement) {
      videoElement.srcObject = remoteStream;
      
      const playVideo = async () => {
        try {
          await videoElement.play();
          if (videoElement.paused) {
            videoElement.play().catch(() => {});
          }
        } catch (error) {
          setTimeout(() => {
            videoElement.play().catch(() => {});
          }, 100);
        }
      };
      
      playVideo();
      
      // Play connected sound when remote stream is received (only once)
      if (!isIncoming && remoteStream.getAudioTracks().length > 0 && !hasPlayedConnectedSoundRef.current) {
        hasPlayedConnectedSoundRef.current = true;
        soundEffects.playConnected();
      }
      
      remoteStream.getVideoTracks().forEach(track => {
        track.onended = () => {};
      });
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
    
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [remoteStream, isIncoming]);

  // Reset connected sound flag when call ends
  useEffect(() => {
    if (!isOpen) {
      hasPlayedConnectedSoundRef.current = false;
    }
  }, [isOpen]);

  // Local audio level visualization
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
            const normalizedLevel = Math.min(average / 128, 1);
            setAudioLevel(normalizedLevel);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        
        updateAudioLevel();
      } catch (error) {
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
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
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [localStream, isOpen, isIncoming]);

  // Remote audio level visualization
  useEffect(() => {
    if (remoteStream && isOpen && !isIncoming && remoteStream.getAudioTracks().length > 0) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const remoteAudio = audioContext.createMediaStreamSource(remoteStream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        remoteAudio.connect(analyser);
        
        remoteAudioContextRef.current = audioContext;
        remoteAnalyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateRemoteAudioLevel = () => {
          if (remoteAnalyserRef.current) {
            remoteAnalyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const normalizedLevel = Math.min(average / 128, 1);
            setRemoteAudioLevel(normalizedLevel);
            remoteAnimationFrameRef.current = requestAnimationFrame(updateRemoteAudioLevel);
          }
        };
        
        updateRemoteAudioLevel();
      } catch (error) {
      }
    } else {
      if (remoteAnimationFrameRef.current) {
        cancelAnimationFrame(remoteAnimationFrameRef.current);
        remoteAnimationFrameRef.current = null;
      }
      if (remoteAudioContextRef.current) {
        remoteAudioContextRef.current.close().catch(() => {});
        remoteAudioContextRef.current = null;
      }
      remoteAnalyserRef.current = null;
      setRemoteAudioLevel(0);
    }
    
    return () => {
      if (remoteAnimationFrameRef.current) {
        cancelAnimationFrame(remoteAnimationFrameRef.current);
      }
      if (remoteAudioContextRef.current) {
        remoteAudioContextRef.current.close().catch(() => {});
      }
    };
  }, [remoteStream, isOpen, isIncoming]);

  useEffect(() => {
    if (isOpen && !isIncoming && remoteStream) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;
          if (onDurationChange) {
            onDurationChange(newDuration);
          }
          return newDuration;
        });
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
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
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        if ('vibrate' in navigator) {
          navigator.vibrate(0);
        }
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
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      }}
      onClick={(e) => {
        if (isIncoming) {
          e.stopPropagation();
        }
      }}
    >
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      
      <div className="relative w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {callType === 'video' && (
          <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden" style={{ paddingBottom: '140px' }}>
            {remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                muted={false}
                onLoadedMetadata={() => {
                  remoteVideoRef.current?.play().catch(() => {});
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
                {caller && (
                  <div className="text-center animate-float">
                    <div className="relative w-48 h-48 mx-auto mb-8">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 opacity-20 animate-pulse"></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 opacity-30" style={{ animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                      <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/20">
                        {caller.avatar_url ? (
                          <Image
                            src={getImageUrl(caller.avatar_url)}
                            alt={caller.first_name}
                            fill
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-white text-6xl font-bold">
                            {caller.first_name[0]}{caller.last_name[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-white text-3xl font-bold mb-3 drop-shadow-lg">
                      {caller.first_name} {caller.last_name}
                    </p>
                    {isIncoming ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-gray-200 text-xl font-medium">Đang gọi đến...</p>
                      </div>
                    ) : remoteStream && remoteStream.getVideoTracks().length > 0 && !remoteStream.getVideoTracks()[0].enabled ? (
                      <p className="text-gray-300 text-lg">Camera đã tắt</p>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-white text-2xl font-semibold">{formatDuration(callDuration)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Remote audio level visualization */}
            {!isIncoming && remoteStream && remoteAudioLevel > 0 && (
              <div className="absolute top-24 left-1/2 transform -translate-x-1/2 flex items-center justify-center space-x-1.5 h-10 bg-white/10 backdrop-blur-xl rounded-full px-6 py-2 border border-white/20 shadow-2xl">
                <span className="text-white text-xs mr-2 font-semibold">Remote:</span>
                {Array.from({ length: 20 }).map((_, i) => {
                  const barHeight = remoteAudioLevel * 100;
                  const isActive = (i / 20) * 100 < barHeight;
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isActive ? 'bg-blue-400' : 'bg-white/20'
                      }`}
                      style={{
                        height: `${Math.max(6, (i / 20) * 24)}px`,
                        opacity: isActive ? 1 : 0.4,
                        transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Local audio level visualization */}
            {!isIncoming && localStream && !isMicMuted && (
              <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex items-center justify-center space-x-1.5 h-10 bg-black/30 backdrop-blur-xl rounded-full px-6 py-2 border border-white/10 shadow-2xl">
                <span className="text-white text-xs mr-2 font-semibold">You:</span>
                {Array.from({ length: 20 }).map((_, i) => {
                  const barHeight = audioLevel * 100;
                  const isActive = (i / 20) * 100 < barHeight;
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isActive ? 'bg-green-400' : 'bg-white/20'
                      }`}
                      style={{
                        height: `${Math.max(6, (i / 20) * 24)}px`,
                        opacity: isActive ? 1 : 0.4,
                        transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {callType === 'video' && localStream && localStream.getVideoTracks().length > 0 && !isVideoOff && (
          <div className="absolute top-6 right-6 w-56 h-40 rounded-2xl overflow-hidden bg-gray-900 border-2 border-white/30 shadow-2xl z-10 transition-all duration-300 hover:scale-105 hover:border-white/50 backdrop-blur-sm">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                video.play().catch(() => {
                  setTimeout(() => video.play().catch(() => {}), 100);
                });
              }}
              onCanPlay={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
            />
            {hasMultipleCameras && onSwitchCamera && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchCamera();
                }}
                className="absolute bottom-3 right-3 p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all duration-200 z-20 shadow-lg hover:scale-110"
                title="Đổi camera"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {callType === 'video' && isVideoOff && (
          <div className="absolute top-6 right-6 w-56 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600/50 shadow-2xl z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gray-700/80 backdrop-blur-md flex items-center justify-center border-2 border-gray-600/50">
                <FiVideoOff className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-white text-sm font-medium">Camera đã tắt</p>
            </div>
          </div>
        )}

        {callType === 'audio' && (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black" style={{ paddingBottom: '140px' }}>
            <div className="text-center animate-float">
              {caller && (
                <>
                  <div className="relative w-72 h-72 mx-auto mb-10">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 opacity-20 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 opacity-30" style={{ animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
                    <div className="relative w-72 h-72 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/20">
                      {caller.avatar_url ? (
                        <Image
                          src={getImageUrl(caller.avatar_url)}
                          alt={caller.first_name}
                          fill
                          className="rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-white text-8xl font-bold">
                          {caller.first_name[0]}{caller.last_name[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-white text-4xl font-bold mb-4 drop-shadow-lg">
                    {caller.first_name} {caller.last_name}
                  </p>
                </>
              )}
              <div className="flex items-center justify-center space-x-3 mb-6">
                {isIncoming ? (
                  <>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-gray-200 text-xl font-semibold">Cuộc gọi đến...</p>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-white text-3xl font-bold">{formatDuration(callDuration)}</p>
                  </>
                )}
              </div>

              {/* Remote audio level for audio call */}
              {!isIncoming && remoteStream && remoteAudioLevel > 0 && (
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <span className="text-gray-300 text-sm mr-3 font-medium">Remote:</span>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const barHeight = remoteAudioLevel * 100;
                    const isActive = (i / 30) * 100 < barHeight;
                    const barHeightPx = Math.max(8, (i / 30) * 40);
                    return (
                      <div
                        key={i}
                        className={`w-2 rounded-full transition-all duration-100 ${
                          isActive
                            ? i < 12
                              ? 'bg-blue-400'
                              : i < 22
                              ? 'bg-blue-300'
                              : 'bg-blue-500'
                            : 'bg-white/10'
                        }`}
                        style={{
                          height: `${barHeightPx}px`,
                          opacity: isActive ? 1 : 0.3,
                          transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                        }}
                      />
                    );
                  })}
                </div>
              )}
              
              {/* Local audio level for audio call */}
              {!isIncoming && localStream && !isMicMuted && (
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <span className="text-gray-300 text-sm mr-3 font-medium">You:</span>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const barHeight = audioLevel * 100;
                    const isActive = (i / 30) * 100 < barHeight;
                    const barHeightPx = Math.max(8, (i / 30) * 40);
                    return (
                      <div
                        key={i}
                        className={`w-2 rounded-full transition-all duration-100 ${
                          isActive
                            ? i < 12
                              ? 'bg-green-400'
                              : i < 22
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                            : 'bg-white/10'
                        }`}
                        style={{
                          height: `${barHeightPx}px`,
                          opacity: isActive ? 1 : 0.3,
                          transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)',
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div 
          className="absolute bottom-10 left-0 right-0 flex justify-center items-center space-x-5 z-[70] pointer-events-auto px-4"
          onClick={(e) => e.stopPropagation()}
        >
          {isIncoming ? (
            <>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (vibrationIntervalRef.current) {
                    clearInterval(vibrationIntervalRef.current);
                    if ('vibrate' in navigator) {
                      navigator.vibrate(0);
                    }
                  }
                  soundEffects.stopIncomingCall();
                  await soundEffects.playAcceptCall();
                  onAccept();
                }}
                className="group relative p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full text-white hover:from-green-400 hover:to-green-500 active:from-green-600 active:to-green-700 transition-all duration-300 cursor-pointer z-[70] shadow-2xl hover:scale-110 active:scale-95 hover:shadow-green-500/50"
                type="button"
              >
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75"></div>
                {callType === 'video' ? (
                  <FiVideo className="w-8 h-8 relative z-10" />
                ) : (
                  <FiPhone className="w-8 h-8 relative z-10" />
                )}
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (vibrationIntervalRef.current) {
                    clearInterval(vibrationIntervalRef.current);
                    if ('vibrate' in navigator) {
                      navigator.vibrate(0);
                    }
                  }
                  soundEffects.stopIncomingCall();
                  await soundEffects.playDeclineCall();
                  onDecline();
                }}
                className="group relative p-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-white hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700 transition-all duration-300 cursor-pointer z-[70] shadow-2xl hover:scale-110 active:scale-95 hover:shadow-red-500/50"
                type="button"
              >
                <FiX className="w-8 h-8 relative z-10" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await soundEffects.playToggleMic();
                  onToggleMic();
                }}
                className={`group relative p-5 rounded-full text-white transition-all duration-300 cursor-pointer shadow-xl hover:scale-110 active:scale-95 backdrop-blur-md border-2 ${
                  isMicMuted 
                    ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 border-red-400/50 hover:shadow-red-500/50' 
                    : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 hover:shadow-white/20'
                }`}
                type="button"
                title={isMicMuted ? 'Bật micro' : 'Tắt micro'}
              >
                {isMicMuted ? (
                  <FiMicOff className="w-6 h-6 relative z-10" />
                ) : (
                  <FiMic className="w-6 h-6 relative z-10" />
                )}
              </button>
              {callType === 'video' && (
                <>
                  {hasMultipleCameras && onSwitchCamera && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await soundEffects.playSwitchCamera();
                        onSwitchCamera();
                      }}
                      className="group relative p-5 rounded-full text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/20 hover:border-white/30 transition-all duration-300 cursor-pointer shadow-xl hover:scale-110 active:scale-95 hover:shadow-white/20"
                      type="button"
                      title="Đổi camera"
                    >
                      <FiRefreshCw className="w-6 h-6 relative z-10" />
                    </button>
                  )}
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await soundEffects.playToggleVideo();
                      onToggleVideo();
                    }}
                    className={`group relative p-5 rounded-full text-white transition-all duration-300 cursor-pointer shadow-xl hover:scale-110 active:scale-95 backdrop-blur-md border-2 ${
                      isVideoOff 
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 border-red-400/50 hover:shadow-red-500/50' 
                        : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 hover:shadow-white/20'
                    }`}
                    type="button"
                    title={isVideoOff ? 'Bật camera' : 'Tắt camera'}
                  >
                    {isVideoOff ? (
                      <FiVideoOff className="w-6 h-6 relative z-10" />
                    ) : (
                      <FiVideo className="w-6 h-6 relative z-10" />
                    )}
                  </button>
                </>
              )}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await soundEffects.playEndCall();
                  onEnd();
                }}
                className="group relative p-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full text-white hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700 transition-all duration-300 cursor-pointer shadow-2xl hover:scale-110 active:scale-95 hover:shadow-red-500/50"
                type="button"
                title="Kết thúc cuộc gọi"
              >
                <FiPhone className="w-8 h-8 rotate-[135deg] relative z-10" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
