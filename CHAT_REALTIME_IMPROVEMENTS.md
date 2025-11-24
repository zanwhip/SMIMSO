# Cải tiến Chat Realtime - Nhắn tin, Gọi thoại, Gọi video

## Tổng quan
Đã hoàn thiện các chức năng nhắn tin realtime, gọi thoại và gọi video với các cải tiến về hiệu năng, độ tin cậy và trải nghiệm người dùng.

## Các cải tiến chính

### 1. **Cải thiện Socket.IO - Nhắn tin realtime**

#### Backend (`BACKEND/src/socket/socket.ts`)
- ✅ Cải thiện logic emit message: Gửi message đến cả `conversation:${id}` room và `user:${userId}` room để đảm bảo nhận được message ngay cả khi chưa join conversation room
- ✅ Tối ưu thứ tự emit: Emit đến conversation room trước, sau đó emit đến từng user room
- ✅ Thêm logging chi tiết để debug

#### Frontend (`FRONTEND/src/lib/socket.ts`)
- ✅ Thêm xử lý reconnection: Tự động reconnect khi mất kết nối
- ✅ Thêm các event listeners: `reconnect`, `reconnect_attempt`, `reconnect_error`, `reconnect_failed`
- ✅ Cải thiện error handling trong callback `onNewMessage`
- ✅ Xử lý disconnect từ server: Tự động reconnect khi server disconnect

### 2. **Cải thiện WebRTC - Gọi thoại và video**

#### Frontend (`FRONTEND/src/lib/webrtc.ts`)
- ✅ Thêm TURN servers: Sử dụng public TURN servers (openrelay.metered.ca) để vượt qua NAT/firewall
- ✅ Thêm nhiều STUN servers: Google STUN servers để tăng khả năng kết nối
- ✅ Cải thiện ICE handling:
  - Tự động restart ICE khi connection failed
  - Logging chi tiết các trạng thái ICE
  - Xử lý `iceConnectionState` và `iceGatheringState`
- ✅ Cải thiện connection state handling:
  - Tự động restart ICE khi failed
  - Đợi 3 giây trước khi kết thúc call khi disconnected (có thể reconnect)
  - Logging chi tiết connection states
- ✅ Tối ưu SDP offer/answer: Thêm `offerToReceiveAudio` và `offerToReceiveVideo`

### 3. **Cải thiện UI/UX - Chat Page**

#### Frontend (`FRONTEND/src/app/chat/page.tsx`)
- ✅ Optimistic UI updates: Hiển thị message ngay khi gửi, sau đó thay thế bằng message từ server
- ✅ Xử lý temp messages: Tự động xóa temp messages khi nhận message thật từ server
- ✅ Cải thiện message receiving:
  - Validate message trước khi xử lý
  - Xử lý duplicate messages
  - Sắp xếp messages theo thời gian
- ✅ Cải thiện conversation joining:
  - Đảm bảo socket connected trước khi join
  - Tự động rejoin khi socket reconnect
  - Logging chi tiết
- ✅ Cải thiện error handling: Thêm try-catch và logging

### 4. **Cải thiện Call Modal**

#### Frontend (`FRONTEND/src/components/chat/CallModal.tsx`)
- ✅ Cải thiện video stream handling:
  - Tự động play video khi stream thay đổi
  - Cleanup stream khi component unmount
  - Xử lý lỗi play video
- ✅ Cải thiện call duration timer:
  - Chỉ bắt đầu timer khi call thực sự active (có stream)
  - Reset timer khi call kết thúc
  - Format duration với hours nếu cần

## Công nghệ sử dụng

### Nhắn tin realtime
- **Socket.IO**: WebSocket với fallback polling
- **Rooms**: Sử dụng Socket.IO rooms để quản lý conversations
- **User rooms**: Personal rooms cho mỗi user để đảm bảo delivery

### Gọi thoại/video
- **WebRTC**: Peer-to-peer connection
- **STUN servers**: Google STUN servers để discovery
- **TURN servers**: OpenRelay TURN servers để vượt qua NAT
- **ICE candidates**: Tự động gather và exchange ICE candidates

## Các tính năng đã hoàn thiện

### ✅ Nhắn tin realtime
- [x] Gửi/nhận message realtime
- [x] Typing indicators
- [x] Read receipts
- [x] Online status
- [x] Message reactions
- [x] Edit/delete messages
- [x] File/image/audio/video messages
- [x] Optimistic UI updates
- [x] Auto-reconnection
- [x] Error handling

### ✅ Gọi thoại
- [x] Initiate audio call
- [x] Accept/decline call
- [x] Mute/unmute microphone
- [x] Call duration tracking
- [x] Call history
- [x] NAT traversal với TURN servers
- [x] Auto-reconnect on failure

### ✅ Gọi video
- [x] Initiate video call
- [x] Accept/decline call
- [x] Toggle video on/off
- [x] Mute/unmute microphone
- [x] Local video preview (picture-in-picture)
- [x] Remote video display
- [x] Call duration tracking
- [x] NAT traversal với TURN servers
- [x] Auto-reconnect on failure

## Cách sử dụng

### Gửi message
```typescript
socketService.sendMessage({
  conversationId: 'conversation-id',
  messageType: 'text',
  content: 'Hello!',
});
```

### Bắt đầu gọi
```typescript
webrtcService.startCall({
  conversationId: 'conversation-id',
  callType: 'video', // hoặc 'audio'
  userId: 'user-id',
  onLocalStream: (stream) => { /* handle local stream */ },
  onRemoteStream: (stream) => { /* handle remote stream */ },
  onCallEnd: () => { /* handle call end */ },
});
```

### Nhận gọi
```typescript
webrtcService.acceptCall({
  conversationId: 'conversation-id',
  callType: 'video',
  userId: 'user-id',
  onLocalStream: (stream) => { /* handle local stream */ },
  onRemoteStream: (stream) => { /* handle remote stream */ },
  onCallEnd: () => { /* handle call end */ },
}, offer);
```

## Debugging

### Logging
Tất cả các events quan trọng đều có logging với emoji để dễ nhận biết:
- ✅ Success
- ❌ Error
- 📨 Message
- 📞 Call
- 🔌 Connection
- 🧊 ICE

### Console logs
Kiểm tra browser console để xem:
- Socket connection status
- Message sending/receiving
- Call signaling
- ICE candidate exchange
- Connection state changes

## Lưu ý

1. **TURN servers**: Hiện đang sử dụng public TURN servers miễn phí. Để production, nên sử dụng TURN servers riêng hoặc dịch vụ trả phí để đảm bảo chất lượng.

2. **Permissions**: Cần quyền truy cập microphone và camera cho gọi video/thoại.

3. **HTTPS**: WebRTC yêu cầu HTTPS (hoặc localhost) để hoạt động.

4. **Firewall/NAT**: TURN servers giúp vượt qua hầu hết firewall/NAT, nhưng một số mạng corporate có thể chặn.

## Tương lai

- [ ] Screen sharing
- [ ] Group calls (3+ participants)
- [ ] Call recording
- [ ] Better TURN server management
- [ ] Call quality metrics
- [ ] Bandwidth adaptation

