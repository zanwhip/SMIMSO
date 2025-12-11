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
              currentPeerConnection.restartIce().catch(console.error);
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
          peerConnection.restartIce().catch((err) => {
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
          });
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
          peerConnection.restartIce().catch((err) => {
            });
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
    console.log('[WebRTC] startCall called', { 
      conversationId: config.conversationId, 
      callType: config.callType,
      userId: config.userId 
    });
    
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

      console.log('[WebRTC] Requesting user media with constraints:', constraints);
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] Got local stream', {
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
        videoTrackReady: localStream.getVideoTracks()[0]?.readyState,
        audioTrackReady: localStream.getAudioTracks()[0]?.readyState,
      });
      
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
      console.log('[WebRTC] Local stream set and callback called');

      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);
      console.log('[WebRTC] PeerConnection created');

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.log('[WebRTC] Added track to peer connection', { 
          kind: track.kind, 
          enabled: track.enabled,
          readyState: track.readyState 
        });
        
        // Handle track ended (e.g., camera disconnected)
        track.onended = () => {
          console.warn('[WebRTC] Track ended', { kind: track.kind });
          if (!this.callEnded.get(config.conversationId)) {
            toast.error('Camera hoặc microphone đã bị ngắt kết nối');
          }
        };
      });

      peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Remote track received', {
          streams: event.streams.length,
          tracks: event.track ? [{ kind: event.track.kind, enabled: event.track.enabled }] : [],
        });
        const remoteStream = event.streams[0];
        if (remoteStream) {
          console.log('[WebRTC] Remote stream details', {
            id: remoteStream.id,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
          });
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
          
          // Handle remote track ended
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              console.warn('[WebRTC] Remote track ended', { kind: track.kind });
              if (!this.callEnded.get(config.conversationId)) {
                // Track ended, but connection might still be active
              }
            };
          });
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && !this.callEnded.get(config.conversationId)) {
          console.log('[WebRTC] ICE candidate generated', {
            candidate: event.candidate.candidate?.substring(0, 50),
          });
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        } else if (!event.candidate) {
          console.log('[WebRTC] ICE gathering complete');
        }
      };

      peerConnection.onicegatheringstatechange = () => {
        console.log('[WebRTC] ICE gathering state changed', {
          state: peerConnection.iceGatheringState,
        });
        if (peerConnection.iceGatheringState === 'complete' && !this.callEnded.get(config.conversationId)) {
          console.log('[WebRTC] ICE gathering complete');
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state changed', {
          state: peerConnection.connectionState,
          conversationId: config.conversationId,
        });
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state changed', {
          state: peerConnection.iceConnectionState,
          conversationId: config.conversationId,
        });
      };

      this.setupConnectionStateHandlers(peerConnection, config);

      console.log('[WebRTC] Creating offer...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.callType === 'video',
      });
      console.log('[WebRTC] Offer created', { 
        type: offer.type,
        sdp: offer.sdp?.substring(0, 100) 
      });
      
      await peerConnection.setLocalDescription(offer);
      console.log('[WebRTC] Local description set');
      
      console.log('[WebRTC] Sending call offer via socket...');
      socketService.sendCallOffer(config.conversationId, config.callType, offer);
      console.log('[WebRTC] Call offer sent');

      this.callStartTime.set(config.conversationId, Date.now());
      console.log('[WebRTC] Call started, setup listeners');

      this.setupCallListeners(config);
    } catch (error: any) {
      console.error('[WebRTC] Error in startCall', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        conversationId: config.conversationId,
      });
      
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
    console.log('[WebRTC] acceptCall called', { 
      conversationId: config.conversationId, 
      callType: config.callType,
      userId: config.userId,
      offerType: offer.type,
    });
    
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

      console.log('[WebRTC] Requesting user media for accept call');
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] Got local stream for accept', {
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
      });
      
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
      console.log('[WebRTC] Local stream set for accept call');

      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);
      console.log('[WebRTC] PeerConnection created for accept');

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        console.log('[WebRTC] Added track for accept', { 
          kind: track.kind, 
          enabled: track.enabled 
        });
        
        // Handle track ended
        track.onended = () => {
          console.warn('[WebRTC] Track ended in accept call', { kind: track.kind });
          if (!this.callEnded.get(config.conversationId)) {
            toast.error('Camera hoặc microphone đã bị ngắt kết nối');
          }
        };
      });

      peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Remote track received in accept', {
          streams: event.streams.length,
          tracks: event.track ? [{ kind: event.track.kind }] : [],
        });
        const remoteStream = event.streams[0];
        if (remoteStream) {
          console.log('[WebRTC] Remote stream in accept', {
            id: remoteStream.id,
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
          });
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
          
          // Handle remote track ended
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              console.warn('[WebRTC] Remote track ended in accept', { kind: track.kind });
              if (!this.callEnded.get(config.conversationId)) {
                // Track ended
              }
            };
          });
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && !this.callEnded.get(config.conversationId)) {
          console.log('[WebRTC] ICE candidate in accept', {
            candidate: event.candidate.candidate?.substring(0, 50),
          });
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state in accept', {
          state: peerConnection.connectionState,
        });
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state in accept', {
          state: peerConnection.iceConnectionState,
        });
      };

      this.setupConnectionStateHandlers(peerConnection, config);

      console.log('[WebRTC] Setting remote description...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description set');
      
      console.log('[WebRTC] Creating answer...');
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.callType === 'video',
      });
      console.log('[WebRTC] Answer created', { 
        type: answer.type,
        sdp: answer.sdp?.substring(0, 100) 
      });
      
      await peerConnection.setLocalDescription(answer);
      console.log('[WebRTC] Local description set for answer');
      
      console.log('[WebRTC] Sending call answer via socket...');
      socketService.sendCallAnswer(config.conversationId, answer);
      console.log('[WebRTC] Call answer sent');

      this.callStartTime.set(config.conversationId, Date.now());
      console.log('[WebRTC] Call accepted, setup listeners');

      this.setupCallListeners(config);
    } catch (error: any) {
      console.error('[WebRTC] Error in acceptCall', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        conversationId: config.conversationId,
      });
      
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
    console.log('[WebRTC] handleAnswer called', {
      conversationId,
      answerType: answer.type,
    });
    
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) {
      console.warn('[WebRTC] No peer connection found for answer', { conversationId });
      return;
    }

    try {
      console.log('[WebRTC] Setting remote description from answer');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Remote description set from answer successfully');
    } catch (error: any) {
      console.error('[WebRTC] Error setting remote description from answer', {
        error: error.message,
        conversationId,
      });
    }
  }

  async handleIceCandidate(conversationId: string, candidate: RTCIceCandidateInit): Promise<void> {
    console.log('[WebRTC] handleIceCandidate called', {
      conversationId,
      candidate: candidate.candidate?.substring(0, 50),
    });
    
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) {
      console.warn('[WebRTC] No peer connection found for ICE candidate', { conversationId });
      return;
    }

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] ICE candidate added successfully');
    } catch (error: any) {
      console.error('[WebRTC] Error adding ICE candidate', {
        error: error.message,
        conversationId,
      });
    }
  }

  endCall(conversationId: string): number {
    console.log('[WebRTC] endCall called', { conversationId });
    
    this.callEnded.set(conversationId, true);
    
    this.clearTimeouts(conversationId);
    
    const peerConnection = this.peerConnections.get(conversationId);
    const localStream = this.localStreams.get(conversationId);
    const remoteStream = this.remoteStreams.get(conversationId);
    const startTime = this.callStartTime.get(conversationId);

    console.log('[WebRTC] Cleaning up call resources', {
      hasPeerConnection: !!peerConnection,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
      startTime,
    });

    // Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log('[WebRTC] Stopping local track', { kind: track.kind });
        track.stop();
      });
      this.localStreams.delete(conversationId);
    }

    // Stop all remote tracks
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        console.log('[WebRTC] Stopping remote track', { kind: track.kind });
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
        console.log('[WebRTC] PeerConnection closed');
      } catch (error) {
        console.error('[WebRTC] Error closing peer connection', error);
      }
      this.peerConnections.delete(conversationId);
    }

    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    this.callStartTime.delete(conversationId);
    
    console.log('[WebRTC] Call ended', {
      conversationId,
      duration,
    });
    
    // Clear call ended flag after a delay to allow cleanup
    setTimeout(() => {
      this.callEnded.delete(conversationId);
      console.log('[WebRTC] Call ended flag cleared', { conversationId });
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

    return () => {
      socketService.offCallAnswer(handleAnswer);
      socketService.offCallIceCandidate(handleIceCandidate);
      socketService.offCallEnd(handleCallEnd);
    };
  }
}

export const webrtcService = new WebRTCService();

