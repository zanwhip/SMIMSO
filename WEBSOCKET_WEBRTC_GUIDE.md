# 🚀 WebSocket & WebRTC Implementation Guide

## Overview

Hướng dẫn chi tiết để implement WebSocket (messaging) và WebRTC (video calls) cho SMIMSO.

---

## Part 1: WebSocket - Real-Time Messaging

### 1.1 Install Dependencies

```bash
# Backend
cd BACKEND
npm install ws @types/ws uuid

# Frontend
cd FRONTEND
npm install socket.io-client
```

### 1.2 Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'group')),
  name VARCHAR(255), -- For group chats
  avatar_url TEXT, -- For group chats
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio', 'video')),
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
```

### 1.3 Backend Implementation

#### Create WebSocket Server

**File: `BACKEND/src/websocket/chat.server.ts`**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface WSClient {
  userId: string;
  ws: WebSocket;
}

export class ChatServer {
  private wss: WebSocketServer;
  private clients: Map<string, WSClient[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/chat' });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      // Extract token from query param
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'No token provided');
        return;
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const userId = decoded.id;

        // Add client
        this.addClient(userId, ws);

        // Handle messages
        ws.on('message', (data) => {
          this.handleMessage(userId, data.toString());
        });

        // Handle disconnect
        ws.on('close', () => {
          this.removeClient(userId, ws);
        });

        // Send connected message
        ws.send(JSON.stringify({ type: 'connected', userId }));
      } catch (error) {
        ws.close(1008, 'Invalid token');
      }
    });
  }

  private addClient(userId: string, ws: WebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push({ userId, ws });
    console.log(`✅ User ${userId} connected (Total: ${this.clients.get(userId)!.length})`);
  }

  private removeClient(userId: string, ws: WebSocket) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        userClients.splice(index, 1);
      }
      if (userClients.length === 0) {
        this.clients.delete(userId);
      }
    }
    console.log(`🔌 User ${userId} disconnected`);
  }

  private handleMessage(userId: string, data: string) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'message':
          this.handleChatMessage(userId, message);
          break;
        case 'typing':
          this.handleTyping(userId, message);
          break;
        case 'read':
          this.handleRead(userId, message);
          break;
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  private handleChatMessage(senderId: string, message: any) {
    // Save to database
    // Send to all participants in conversation
    const { conversationId, content } = message;
    
    // TODO: Get conversation participants from database
    // TODO: Send to all participants
  }

  private handleTyping(userId: string, message: any) {
    // Broadcast typing indicator to conversation participants
  }

  private handleRead(userId: string, message: any) {
    // Update last_read_at in database
  }

  public sendToUser(userId: string, message: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const data = JSON.stringify(message);
      userClients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(data);
        }
      });
    }
  }
}
```

#### Update Server Entry Point

**File: `BACKEND/src/index.ts`**

```typescript
import { ChatServer } from './websocket/chat.server';

// After creating HTTP server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Initialize WebSocket server
const chatServer = new ChatServer(server);
```

### 1.4 Frontend Implementation

#### Create Chat Hook

**File: `FRONTEND/src/hooks/useChat.ts`**

```typescript
import { useEffect, useState, useCallback } from 'use';
import { useAuthStore } from '@/store/authStore';

export function useChat() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const baseURL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
    const socket = new WebSocket(`${baseURL}/ws/chat?token=${token}`);

    socket.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message':
          setMessages(prev => [...prev, data.message]);
          break;
        case 'typing':
          // Handle typing indicator
          break;
      }
    };

    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [token]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        conversationId,
        content,
      }));
    }
  }, [ws]);

  return { messages, connected, sendMessage };
}
```

---

## Part 2: WebRTC - Video/Audio Calls

### 2.1 Install Dependencies

```bash
# Frontend
cd FRONTEND
npm install simple-peer
```

### 2.2 Backend - Signaling Server

Use WebSocket server for signaling (offer/answer/ICE candidates)

**Add to `BACKEND/src/websocket/chat.server.ts`:**

```typescript
private handleMessage(userId: string, data: string) {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'call-offer':
      this.handleCallOffer(userId, message);
      break;
    case 'call-answer':
      this.handleCallAnswer(userId, message);
      break;
    case 'ice-candidate':
      this.handleIceCandidate(userId, message);
      break;
  }
}

private handleCallOffer(senderId: string, message: any) {
  const { targetUserId, offer } = message;
  this.sendToUser(targetUserId, {
    type: 'call-offer',
    senderId,
    offer,
  });
}
```

### 2.3 Frontend - WebRTC Implementation

**File: `FRONTEND/src/hooks/useWebRTC.ts`**

```typescript
import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';

export function useWebRTC(ws: WebSocket | null) {
  const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const startCall = async (targetUserId: string) => {
    try {
      // Get user media
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);

      // Create peer (initiator)
      const p = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: mediaStream,
      });

      p.on('signal', (data) => {
        // Send offer to target user via WebSocket
        ws?.send(JSON.stringify({
          type: 'call-offer',
          targetUserId,
          offer: data,
        }));
      });

      p.on('stream', (remoteStream) => {
        // Display remote stream
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      setPeer(p);
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  return { startCall, localVideoRef, remoteVideoRef };
}
```

---

## Summary

**WebSocket**: Real-time messaging, typing indicators, online status
**WebRTC**: Video/audio calls, screen sharing

Cần implement đầy đủ các features này! 🚀

