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
    try {
      this.callEnded.set(config.conversationId, false);
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: config.callType === 'video',
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStreams.set(config.conversationId, localStream);
      config.onLocalStream(localStream);

      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
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
      toast.error('Failed to start call. Please check your camera/microphone permissions.');
      config.onCallEnd();
    }
  }

  async acceptCall(config: CallConfig, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      this.callEnded.set(config.conversationId, false);
      
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: config.callType === 'video',
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStreams.set(config.conversationId, localStream);
      config.onLocalStream(localStream);

      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
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
      toast.error('Failed to accept call. Please check your camera/microphone permissions.');
      config.onCallEnd();
    }
  }

  async handleAnswer(conversationId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      }
  }

  async handleIceCandidate(conversationId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) return;

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      }
  }

  endCall(conversationId: string): void {
    this.callEnded.set(conversationId, true);
    
    this.clearTimeouts(conversationId);
    
    const peerConnection = this.peerConnections.get(conversationId);
    const localStream = this.localStreams.get(conversationId);
    const startTime = this.callStartTime.get(conversationId);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        });
      this.localStreams.delete(conversationId);
    }

    if (peerConnection) {
      try {
        peerConnection.close();
        } catch (error) {
        }
      this.peerConnections.delete(conversationId);
    }

    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    this.callStartTime.delete(conversationId);

    this.remoteStreams.delete(conversationId);
    
    setTimeout(() => {
      this.callEnded.delete(conversationId);
    }, 5000);
    
    }

  toggleMic(conversationId: string): boolean {
    const localStream = this.localStreams.get(conversationId);
    if (!localStream) return false;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  toggleVideo(conversationId: string): boolean {
    const localStream = this.localStreams.get(conversationId);
    if (!localStream) return false;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
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

