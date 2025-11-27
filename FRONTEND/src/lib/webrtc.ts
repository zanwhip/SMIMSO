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
      // TURN servers for better NAT traversal (free public TURN servers)
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

  // Helper to track timeouts
  private addTimeout(conversationId: string, timeout: NodeJS.Timeout): void {
    if (!this.activeTimeouts.has(conversationId)) {
      this.activeTimeouts.set(conversationId, []);
    }
    this.activeTimeouts.get(conversationId)!.push(timeout);
  }

  // Helper to clear all timeouts for a conversation
  private clearTimeouts(conversationId: string): void {
    const timeouts = this.activeTimeouts.get(conversationId);
    if (timeouts) {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      this.activeTimeouts.delete(conversationId);
    }
  }

  // Helper to check if connection is still active
  private isConnectionActive(conversationId: string): boolean {
    return !this.callEnded.get(conversationId) && this.peerConnections.has(conversationId);
  }

  // Setup connection state change handlers (reusable for both startCall and acceptCall)
  private setupConnectionStateHandlers(peerConnection: RTCPeerConnection, config: CallConfig): void {
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 3;
    
    peerConnection.onconnectionstatechange = () => {
      // Check if call has ended
      if (!this.isConnectionActive(config.conversationId)) {
        console.log('⚠️ Call already ended, ignoring state change');
        return;
      }
      
      const state = peerConnection.connectionState;
      console.log(`🔌 [${config.conversationId}] Connection State: ${state}`);
      
      if (state === 'connected') {
        console.log('✅ WebRTC Connected');
        reconnectAttempts = 0;
      } else if (state === 'connecting') {
        console.log('🔄 WebRTC Connecting...');
      } else if (state === 'disconnected') {
        console.log('⚠️ WebRTC Disconnected, waiting 10s before considering failed...');
        reconnectAttempts++;
        const timeout = setTimeout(() => {
          if (!this.isConnectionActive(config.conversationId)) return;
          
          const currentPeerConnection = this.peerConnections.get(config.conversationId);
          if (!currentPeerConnection) return;
          
          const currentState = currentPeerConnection.connectionState;
          if (currentState === 'disconnected' || currentState === 'failed') {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
              currentPeerConnection.restartIce().catch(console.error);
            } else {
              console.log('❌ Max reconnect attempts reached, ending call');
              this.endCall(config.conversationId);
              config.onCallEnd();
            }
          }
        }, 10000);
        this.addTimeout(config.conversationId, timeout);
      } else if (state === 'failed') {
        reconnectAttempts++;
        console.log(`❌ WebRTC Failed (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}), restarting ICE...`);
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.isConnectionActive(config.conversationId)) {
          peerConnection.restartIce().catch((err) => {
            console.error('ICE restart failed:', err);
            const timeout = setTimeout(() => {
              if (!this.isConnectionActive(config.conversationId)) return;
              
              const currentPeerConnection = this.peerConnections.get(config.conversationId);
              if (!currentPeerConnection) return;
              
              const currentState = currentPeerConnection.connectionState;
              if (currentState === 'failed' && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log('❌ Max attempts reached, ending call');
                this.endCall(config.conversationId);
                config.onCallEnd();
              }
            }, 5000);
            this.addTimeout(config.conversationId, timeout);
          });
        } else {
          console.log('❌ Max attempts reached, ending call');
          this.endCall(config.conversationId);
          config.onCallEnd();
        }
      } else if (state === 'closed') {
        console.log('🔒 WebRTC Connection closed');
        reconnectAttempts = 0;
      }
    };

    // Handle ICE connection state
    let iceReconnectAttempts = 0;
    const MAX_ICE_RECONNECT_ATTEMPTS = 3;
    
    peerConnection.oniceconnectionstatechange = () => {
      if (!this.isConnectionActive(config.conversationId)) {
        console.log('⚠️ Call already ended, ignoring ICE state change');
        return;
      }
      
      const iceState = peerConnection.iceConnectionState;
      console.log(`🧊 [${config.conversationId}] ICE State: ${iceState}`);
      
      if (iceState === 'connected' || iceState === 'completed') {
        iceReconnectAttempts = 0;
      } else if (iceState === 'failed') {
        iceReconnectAttempts++;
        console.log(`❌ ICE failed (attempt ${iceReconnectAttempts}/${MAX_ICE_RECONNECT_ATTEMPTS}), restarting...`);
        if (iceReconnectAttempts < MAX_ICE_RECONNECT_ATTEMPTS && this.isConnectionActive(config.conversationId)) {
          peerConnection.restartIce().catch((err) => {
            console.error('ICE restart error:', err);
          });
        } else {
          console.log('❌ Max ICE reconnect attempts reached');
        }
      }
    };

    peerConnection.onicegatheringstatechange = () => {
      if (this.isConnectionActive(config.conversationId)) {
        console.log(`🧊 [${config.conversationId}] Gathering: ${peerConnection.iceGatheringState}`);
      }
    };
  }

  async startCall(config: CallConfig): Promise<void> {
    try {
      // Reset call ended flag
      this.callEnded.set(config.conversationId, false);
      
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: config.callType === 'video',
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStreams.set(config.conversationId, localStream);
      config.onLocalStream(localStream);

      // Create peer connection
      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);

      // Add local tracks to peer connection
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
      };

      // Setup connection state handlers
      this.setupConnectionStateHandlers(peerConnection, config);

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.callType === 'video',
      });
      await peerConnection.setLocalDescription(offer);
      socketService.sendCallOffer(config.conversationId, config.callType, offer);

      // Store call start time
      this.callStartTime.set(config.conversationId, Date.now());

      // Set up event listeners
      this.setupCallListeners(config);
    } catch (error: any) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call. Please check your camera/microphone permissions.');
      config.onCallEnd();
    }
  }

  async acceptCall(config: CallConfig, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      // Reset call ended flag
      this.callEnded.set(config.conversationId, false);
      
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: config.callType === 'video',
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStreams.set(config.conversationId, localStream);
      config.onLocalStream(localStream);

      // Create peer connection
      const peerConnection = new RTCPeerConnection(this.iceServers);
      this.peerConnections.set(config.conversationId, peerConnection);

      // Add local tracks to peer connection
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          this.remoteStreams.set(config.conversationId, remoteStream);
          config.onRemoteStream(remoteStream);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendCallIceCandidate(config.conversationId, event.candidate);
        }
      };

      // Setup connection state handlers
      this.setupConnectionStateHandlers(peerConnection, config);

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.callType === 'video',
      });
      await peerConnection.setLocalDescription(answer);
      socketService.sendCallAnswer(config.conversationId, answer);

      // Store call start time
      this.callStartTime.set(config.conversationId, Date.now());

      // Set up event listeners
      this.setupCallListeners(config);
    } catch (error: any) {
      console.error('Failed to accept call:', error);
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
      console.error('Failed to handle answer:', error);
    }
  }

  async handleIceCandidate(conversationId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.peerConnections.get(conversationId);
    if (!peerConnection) return;

    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  }

  endCall(conversationId: string): void {
    console.log(`🔚 Ending call for conversation: ${conversationId}`);
    
    // Set call ended flag first to prevent any further actions
    this.callEnded.set(conversationId, true);
    
    // Clear all timeouts
    this.clearTimeouts(conversationId);
    
    const peerConnection = this.peerConnections.get(conversationId);
    const localStream = this.localStreams.get(conversationId);
    const startTime = this.callStartTime.get(conversationId);

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`🛑 Stopped track: ${track.kind}`);
      });
      this.localStreams.delete(conversationId);
    }

    // Close peer connection
    if (peerConnection) {
      try {
        peerConnection.close();
        console.log(`🔒 Closed peer connection`);
      } catch (error) {
        console.error('Error closing peer connection:', error);
      }
      this.peerConnections.delete(conversationId);
    }

    // Calculate call duration
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    this.callStartTime.delete(conversationId);

    // Clean up remote stream
    this.remoteStreams.delete(conversationId);
    
    // Clean up call ended flag after a delay to prevent race conditions
    setTimeout(() => {
      this.callEnded.delete(conversationId);
    }, 5000);
    
    console.log(`✅ Call cleanup complete for conversation: ${conversationId}`);
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
    // Handle call answer
    const handleAnswer = (data: { conversationId: string; answer: RTCSessionDescriptionInit; userId: string }) => {
      if (data.conversationId === config.conversationId && data.userId !== config.userId) {
        this.handleAnswer(data.conversationId, data.answer);
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = (data: { conversationId: string; candidate: RTCIceCandidateInit; userId: string }) => {
      if (data.conversationId === config.conversationId && data.userId !== config.userId) {
        this.handleIceCandidate(data.conversationId, data.candidate);
      }
    };

    // Handle call end
    const handleCallEnd = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === config.conversationId) {
        this.endCall(data.conversationId);
        config.onCallEnd();
      }
    };

    // Register listeners
    socketService.onCallAnswer(handleAnswer);
    socketService.onCallIceCandidate(handleIceCandidate);
    socketService.onCallEnd(handleCallEnd);

    // Cleanup function (will be called when component unmounts)
    return () => {
      socketService.offCallAnswer(handleAnswer);
      socketService.offCallIceCandidate(handleIceCandidate);
      socketService.offCallEnd(handleCallEnd);
    };
  }
}

export const webrtcService = new WebRTCService();


