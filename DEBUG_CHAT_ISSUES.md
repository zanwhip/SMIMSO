# Debug Guide - Chat Issues

## Vấn đề đã sửa

### 1. Realtime Messaging
**Vấn đề**: Cả 2 người đều không thấy tin nhắn

**Đã sửa**:
- ✅ Socket listeners được setup sau khi socket connected
- ✅ Backend emit `new_message` đến cả `conversation:` room và `user:` room
- ✅ Frontend listen `new_message` event và tự động update messages
- ✅ Thêm logging để debug

**Cách kiểm tra**:
1. Mở browser console (F12)
2. Kiểm tra log: `✅ Socket connected`
3. Gửi tin nhắn và xem log: `📤 Sending message` và `📨 New message received`
4. Nếu không thấy logs, socket chưa kết nối

### 2. Call Signaling
**Vấn đề**: Không gọi được

**Đã sửa**:
- ✅ Kiểm tra socket connected trước khi gọi
- ✅ Backend emit `call_offer` đến cả `user:` room và `conversation:` room
- ✅ Thêm caller info vào call_offer event
- ✅ Thêm logging để debug

**Cách kiểm tra**:
1. Mở browser console
2. Click gọi và xem log: `📞 Starting call` và `📞 Sending call offer`
3. Bên nhận xem log: `📞 Call offer from...` và `📤 Emitting call_offer to user:...`
4. Nếu không thấy logs, kiểm tra socket connection

### 3. Notifications
**Vấn đề**: Không có thông báo

**Đã sửa**:
- ✅ Request notification permission khi login
- ✅ Hiển thị browser notification khi có tin nhắn từ conversation khác
- ✅ Hiển thị browser notification khi có incoming call

**Cách kiểm tra**:
1. Kiểm tra browser permission: Settings > Site Settings > Notifications
2. Xem console log: `Notification permission: granted`
3. Gửi tin nhắn từ conversation khác → phải thấy notification

## Debug Steps

### Step 1: Kiểm tra Socket Connection

Mở browser console và chạy:
```javascript
// Kiểm tra socket connection
const socket = window.socketService?.getSocketSync();
console.log('Socket:', socket);
console.log('Connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

Nếu `connected: false`, socket chưa kết nối.

### Step 2: Kiểm tra Socket Events

Trong console:
```javascript
// Listen to all socket events
const socket = window.socketService?.getSocketSync();
if (socket) {
  socket.onAny((event, ...args) => {
    console.log('📡 Socket event:', event, args);
  });
}
```

Sau đó gửi tin nhắn và xem events được emit.

### Step 3: Kiểm tra Backend Logs

Xem backend console logs:
- `✅ User connected: {userId}`
- `📤 Emitted new_message to conversation:...`
- `📞 Call offer from...`

### Step 4: Kiểm tra Network

1. Mở DevTools > Network tab
2. Filter: WS (WebSocket)
3. Kiểm tra WebSocket connection status
4. Xem messages được gửi/nhận

## Common Issues

### Issue 1: Socket không kết nối
**Nguyên nhân**: Token không hợp lệ hoặc backend không chạy

**Giải pháp**:
1. Kiểm tra token trong localStorage: `localStorage.getItem('token')`
2. Kiểm tra backend đang chạy: `http://localhost:5000`
3. Kiểm tra CORS settings

### Issue 2: Messages không hiển thị
**Nguyên nhân**: Socket listeners chưa được setup hoặc event không được emit

**Giải pháp**:
1. Kiểm tra console logs
2. Đảm bảo `handleNewMessage` được gọi
3. Kiểm tra message có đúng `conversation_id` không

### Issue 3: Call không hoạt động
**Nguyên nhân**: Socket chưa connected hoặc WebRTC permissions

**Giải pháp**:
1. Kiểm tra socket connected
2. Kiểm tra camera/microphone permissions
3. Xem console logs cho call events

## Test Checklist

- [ ] Socket connected (console log: `✅ Socket connected`)
- [ ] Can send message (console log: `📤 Sending message`)
- [ ] Can receive message (console log: `📨 New message received`)
- [ ] Message appears in UI
- [ ] Can start call (console log: `📞 Starting call`)
- [ ] Call offer received (console log: `📞 Call offer from...`)
- [ ] Call modal appears
- [ ] Notification permission granted
- [ ] Browser notifications work

## Environment Variables

Đảm bảo các biến môi trường được set đúng:

**Frontend (.env.local)**:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Backend (.env)**:
```
FRONTEND_URL=http://localhost:3000
```

## Next Steps

Nếu vẫn không hoạt động sau khi kiểm tra:

1. **Restart cả frontend và backend**
2. **Clear browser cache và localStorage**
3. **Kiểm tra network tab trong DevTools**
4. **Xem backend logs để tìm errors**
5. **Kiểm tra CORS và authentication**



