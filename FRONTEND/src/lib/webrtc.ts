import { socketService } from './socket';
import toast from 'react-hot-toast';

export interface CallConfig {
  conversationId: string;
  callType: 'audio' | 'video';
  userId: string;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnd: () => void;
}

class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStreams: Map<string, MediaStream> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private callStartTime: Map<string, number> = new Map();
  private activeTimeouts: Map<string, NodeJS.Timeout[]> = new Map(); // Track timeouts per conversation
  private callEnded: Map<string, boolean> = new Map(); // Track if call has ended
  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
  };

  private addTimeout(conversationId: string, timeout: NodeJS.Timeout): void {
    if (!this.activeTimeouts.has(conversationId)) {
      this.activeTimeouts.set(conversationId, []);
    }
    this.activeTimeouts.get(conversationId)!.push(timeout);
  }

  private clearTimeouts(conversationId: string): void {
    const timeouts = this.activeTimeouts.get(conversationId);
    if (timeouts) {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      this.activeTimeouts.delete(conversationId);
    }
  }

  private isConnectionActive(conversationId: string): boolean {
    return !this.callEnded.get(conversationId) && this.peerConnections.has(conversationId);
  }

  private setupConnectionStateHandlers(peerConnection: RTCPeerConnection, config: CallConfig): void {
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
    peerConnection.onconnectionstatechange = () => {
      if (!this.isConnectionActive(config.conversationId)) {
        return;
      }
      
      const state = peerConnection.connectionState;
      if (state === 'connected') {
        reconnectAttempts = 0;
      } else if (state === 'connecting') {
        } else if (state === 'disconnected') {
        reconnectAttempts++;
        const timeout = setTimeout(() => {
          if (!this.isConnectionActive(config.conversationId)) return;
          
          const currentPeerConnection = this.peerConnections.get(config.conversationId);
          if (!currentPeerConnection) return;
          
          const currentState = currentPeerConnection.connectionState;
          if (currentState === 'disconnected' || currentState === 'failed') {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              try {
                currentPeerConnection.restartIce();
              } catch (error) {
              }
            } else {
              this.endCall(config.conversationId);
              config.onCallEnd();
            }
          }
        }, 10000);
        this.addTimeout(config.conversationId, timeout);
      } else if (state === 'failed') {
        reconnectAttempts++;
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.isConnectionActive(config.conversationId)) {
          try {
            peerConnection.restartIce();
            const timeout = setTimeout(() => {
              if (!this.isConnectionActive(config.conversationId)) return;
              
              const currentPeerConnection = this.peerConnections.get(config.conversationId);
              if (!currentPeerConnection) return;
              
              const currentState = currentPeerConnection.connectionState;
              if (currentState === 'failed' && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                this.endCall(config.conversationId);
                config.onCallEnd();
              }
            }, 5000);
            this.addTimeout(config.conversationId, timeout);
          } catch (err) {
          }
        } else {
          this.endCall(config.conversationId);
          config.onCallEnd();
        }
      } else if (state === 'closed') {
        reconnectAttempts = 0;
      }
    };

    let iceReconnectAttempts = 0;
    const MAX_ICE_RECONNECT_ATTEMPTS = 3;
    
    peerConnection.oniceconnectionstatechange = () => {
      if (!this.isConnectionActive(config.conversationId)) {
        return;
      }
      
      const iceState = peerConnection.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') {
        iceReconnectAttempts = 0;
      } else if (iceState === 'failed') {
        iceReconnectAttempts++;
        if (iceReconnectAttempts < MAX_ICE_RECONNECT_ATTEMPTS && this.isConnectionActive(config.conversationId)) {
          try {
            peerConnection.restartIce();
          } catch (err) {
          }
        } else {
          }
      }
    };

    peerConnection.onicegatheringstatechange = () => {
      if (this.isConnectionActive(config.conversationId)) {
        }
    };
  }

  async startCall(config: CallConfig): Promise<void> {
    try {
      this.callEnded.set(config.conversationId, false);
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: config.callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        } : false,
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Ensure stream is valid
      if (!localStream) {
        throw new Error('Failed to get media stream');
      }
      
      // For video calls, verify video track exists
      if (config.callType === 'video') {
        if (localStream.getVideoTracks().length === 0) {
          // Stop audio track if video failed
          localStream.getTracks().forEach(track => track.stop());
          throw new Error('Failed to get video stream. Please check camera permissions.');
        }
        
        // Verify video track is actually working
        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== 'live') {
          localStream.getTracks().forEach(track => track.stop());
          throw new Error('Video track is not active. Please check camera.');
        }
      }
      
      // Verify audio track for all calls
      if (localStream.getAudioTracks().length === 0) {
        if (config.callType === 'video') {
          localStream.getTracks().forEach(track => track.stop());
        }
        throw new Error('Failed to get audio stream. Please check microphone permissions.');
      }
      
      this.localStreams.set(config.conversationId, localStream);
      config.onLocalStream(localStream);

      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        
        // Handle track ended (e.g., camera disconnected)
        track.onended = () => {
          if (!this.callEnded.get(config.conversationId)) {
            toast.error('Camera hoặc microphone đã bị ngắt kết nối');
          }
        };
      });

      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
          
          // Handle remote track ended
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              if (!this.callEnded.get(config.conversationId)) {
                // Track ended, but connection might still be active
              }
            };
          });
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && !this.callEnded.get(config.conversationId)) {
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
      };

      peerConnection.onicegatheringstatechange = () => {
      };

      peerConnection.onconnectionstatechange = () => {
      };

      peerConnection.oniceconnectionstatechange = () => {
      };

      this.setupConnectionStateHandlers(peerConnection, config);

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.callType === 'video',
      });
      
      await peerConnection.setLocalDescription(offer);
      
      socketService.sendCallOffer(config.conversationId, config.callType, offer);

      this.callStartTime.set(config.conversationId, Date.now());

      this.setupCallListeners(config);
    } catch (error: any) {
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Vui lòng cho phép truy cập camera và microphone');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('Không tìm thấy camera hoặc microphone');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera hoặc microphone đang được sử dụng bởi ứng dụng khác');
      } else {
        toast.error(`Không thể bắt đầu cuộc gọi: ${error.message || 'Unknown error'}`);
      }
      config.onCallEnd();
    }
  }

  async acceptCall(config: CallConfig, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.callEnded.set(config.conversationId, false);
      
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: config.callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        } : false,
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Ensure stream is valid
      if (!localStream) {
        throw new Error('Failed to get media stream');
      }
      
      // For video calls, verify video track exists
      if (config.callType === 'video') {
        if (localStream.getVideoTracks().length === 0) {
          // Stop audio track if video failed
          localStream.getTracks().forEach(track => track.stop());
          throw new Error('Failed to get video stream. Please check camera permissions.');
        }
        
        // Verify video track is actually working
        const videoTrack = localStream.getVideoTracks()[0];
        if (!videoTrack || videoTrack.readyState !== 'live') {
          localStream.getTracks().forEach(track => track.stop());
          throw new Error('Video track is not active. Please check camera.');
        }
      }
      
      // Verify audio track for all calls
      if (localStream.getAudioTracks().length === 0) {
        if (config.callType === 'video') {
          localStream.getTracks().forEach(track => track.stop());
        }
        throw new Error('Failed to get audio stream. Please check microphone permissions.');
      }
      
      this.localStreams.set(config.conversationId, localStream);
      config.onLocalStream(localStream);

      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        
        // Handle track ended
        track.onended = () => {
          if (!this.callEnded.get(config.conversationId)) {
            toast.error('Camera hoặc microphone đã bị ngắt kết nối');
          }
        };
      });

      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
          
          // Handle remote track ended
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              if (!this.callEnded.get(config.conversationId)) {
                // Track ended
              }
            };
          });
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && !this.callEnded.get(config.conversationId)) {
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
      };

      peerConnection.onconnectionstatechange = () => {
      };

      peerConnection.oniceconnectionstatechange = () => {
      };

      this.setupConnectionStateHandlers(peerConnection, config);

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.callType === 'video',
      });
      
      await peerConnection.setLocalDescription(answer);
      
      socketService.sendCallAnswer(config.conversationId, answer);

      this.callStartTime.set(config.conversationId, Date.now());

      this.setupCallListeners(config);
    } catch (error: any) {
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Vui lòng cho phép truy cập camera và microphone');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        toast.error('Không tìm thấy camera hoặc microphone');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        toast.error('Camera hoặc microphone đang được sử dụng bởi ứng dụng khác');
      } else {
        toast.error(`Không thể chấp nhận cuộc gọi: ${error.message || 'Unknown error'}`);
      }
      config.onCallEnd();
    }
  }

  async handleAnswer(conversationId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) {
      return;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error: any) {
    }
  }

  async handleIceCandidate(conversationId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) {
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error: any) {
    }
  }

  endCall(conversationId: string): number {
    this.callEnded.set(conversationId, true);
    
    this.clearTimeouts(conversationId);
    
    const peerConnection = this.peerConnections.get(conversationId);
    const localStream = this.localStreams.get(conversationId);
    const remoteStream = this.remoteStreams.get(conversationId);
    const startTime = this.callStartTime.get(conversationId);

    // Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStreams.delete(conversationId);
    }

    // Stop all remote tracks
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.remoteStreams.delete(conversationId);
    }

    // Close peer connection
    if (peerConnection) {
      try {
        // Remove all tracks
        peerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
          try {
            peerConnection.removeTrack(sender);
          } catch (e) {
            // Ignore if already removed
          }
        });
        peerConnection.close();
      } catch (error) {
      }
      this.peerConnections.delete(conversationId);
    }

    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    this.callStartTime.delete(conversationId);
    
    // Clear call ended flag after a delay to allow cleanup
    setTimeout(() => {
      this.callEnded.delete(conversationId);
    }, 1000);
    
    return duration;
  }

  toggleMic(conversationId: string): boolean {
    const localStream = this.localStreams.get(conversationId);
    if (!localStream) return false;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack && audioTrack.readyState === 'live') {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  toggleVideo(conversationId: string): boolean {
    const localStream = this.localStreams.get(conversationId);
    if (!localStream) return false;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack && videoTrack.readyState === 'live') {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  getMicState(conversationId: string): boolean {
    const localStream = this.localStreams.get(conversationId);
    if (!localStream) return false;
    const audioTrack = localStream.getAudioTracks()[0];
    return audioTrack ? audioTrack.enabled : false;
  }

  getVideoState(conversationId: string): boolean {
    const localStream = this.localStreams.get(conversationId);
    if (!localStream) return false;
    const videoTrack = localStream.getVideoTracks()[0];
    return videoTrack ? videoTrack.enabled : false;
  }

  switchCamera(conversationId: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const localStream = this.localStreams.get(conversationId);
      if (!localStream) {
        resolve(false);
        return;
      }

      const videoTrack = localStream.getVideoTracks()[0];
      if (!videoTrack) {
        resolve(false);
        return;
      }

      try {
        const constraints = videoTrack.getConstraints();
        const facingMode = constraints.facingMode === 'user' ? 'environment' : 'user';
        
        await videoTrack.applyConstraints({
          facingMode: facingMode as any,
        });
        
        resolve(true);
      } catch (error) {
        // Fallback: stop old track and get new stream with different camera
        try {
          const oldTrack = videoTrack;
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          if (videoDevices.length < 2) {
            resolve(false);
            return;
          }

          const currentDeviceId = oldTrack.getSettings().deviceId;
          const otherDevice = videoDevices.find(device => device.deviceId !== currentDeviceId);
          
          if (!otherDevice) {
            resolve(false);
            return;
          }

          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: otherDevice.deviceId } },
            audio: true,
          });

          const newVideoTrack = newStream.getVideoTracks()[0];
          oldTrack.stop();
          localStream.removeTrack(oldTrack);
          localStream.addTrack(newVideoTrack);

          const peerConnection = this.peerConnections.get(conversationId);
          if (peerConnection) {
            const sender = peerConnection.getSenders().find(
              s => s.track && s.track.kind === 'video'
            );
            if (sender) {
              await sender.replaceTrack(newVideoTrack);
            }
          }

          resolve(true);
        } catch (err) {
          resolve(false);
        }
      }
    });
  }

  getMediaDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }

  private setupCallListeners(config: CallConfig): void {
    const handleAnswer = (data: { conversationId: string; answer: RTCSessionDescriptionInit; userId: string }) => {
      if (data.conversationId === config.conversationId && data.userId !== config.userId) {
        this.handleAnswer(data.conversationId, data.answer);
      }
    };

    const handleIceCandidate = (data: { conversationId: string; candidate: RTCIceCandidateInit; userId: string }) => {
      if (data.conversationId === config.conversationId && data.userId !== config.userId) {
        this.handleIceCandidate(data.conversationId, data.candidate);
      }
    };

    const handleCallEnd = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === config.conversationId) {
        this.endCall(data.conversationId);
        config.onCallEnd();
      }
    };

    socketService.onCallAnswer(handleAnswer);
    socketService.onCallIceCandidate(handleIceCandidate);
    socketService.onCallEnd(handleCallEnd);
  }
}

export const webrtcService = new WebRTCService();

