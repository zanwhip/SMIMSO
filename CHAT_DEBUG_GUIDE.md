# Hướng dẫn Debug Chat System

## Vấn đề: Các chức năng nhắn tin chưa thực hiện được

### Bước 1: Kiểm tra Socket Connection

Mở browser console (F12) và kiểm tra:

```javascript
// Kiểm tra socket connection
const socket = window.socketService?.getSocketSync();
console.log('Socket:', socket);
console.log('Connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

**Kỳ vọng**: 
- `Connected: true`
- `Socket ID` có giá trị

**Nếu không connected**:
1. Kiểm tra backend đang chạy: `http://localhost:5000`
2. Kiểm tra token: `localStorage.getItem('token')`
3. Kiểm tra CORS settings trong backend

### Bước 2: Kiểm tra Socket Events

Trong console, chạy:

```javascript
// Listen to all socket events
const socket = window.socketService?.getSocketSync();
if (socket) {
  socket.onAny((event, ...args) => {
    console.log('📡 Socket event:', event, args);
  });
}
```

Sau đó:
1. Gửi một tin nhắn
2. Xem có event `send_message` được emit không
3. Xem có event `new_message` được nhận không

### Bước 3: Kiểm tra Backend Logs

Xem backend console logs:
- `✅ User connected: {userId}`
- `📤 Emitted new_message to conversation:...`
- `📤 Emitted new_message to user:...`

### Bước 4: Kiểm tra API Endpoints

Test API endpoints:

```bash
# Get conversations
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/chat/conversations

# Get messages
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/chat/conversations/{conversationId}/messages
```

### Bước 5: Kiểm tra Database

Kiểm tra messages có được lưu vào database không:

```sql
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

## Common Issues & Solutions

### Issue 1: Socket không kết nối
**Nguyên nhân**: Token không hợp lệ hoặc backend không chạy

**Giải pháp**:
1. Kiểm tra token: `localStorage.getItem('token')`
2. Restart backend server
3. Kiểm tra `.env` có đúng không

### Issue 2: Messages không hiển thị
**Nguyên nhân**: Socket listeners chưa được setup hoặc event không được emit

**Giải pháp**:
1. Kiểm tra console logs: `✅ Registered new_message listener`
2. Kiểm tra `handleNewMessage` có được gọi không
3. Kiểm tra message có đúng `conversation_id` không

### Issue 3: Gửi message nhưng không thấy
**Nguyên nhân**: Socket chưa connected hoặc backend không nhận được

**Giải pháp**:
1. Kiểm tra socket connected trước khi gửi
2. Xem backend logs có nhận được `send_message` event không
3. Kiểm tra database có message mới không

## Test Checklist

- [ ] Socket connected (console: `✅ Socket connected`)
- [ ] Socket listeners registered (console: `✅ Registered new_message listener`)
- [ ] Can send message (console: `📤 Sending message`)
- [ ] Backend receives message (backend log: `send_message` event)
- [ ] Backend emits new_message (backend log: `📤 Emitted new_message`)
- [ ] Frontend receives message (console: `📨 New message received`)
- [ ] Message appears in UI

## Environment Variables

**Frontend (.env.local)**:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Backend (.env)**:
```
FRONTEND_URL=http://localhost:3000
PORT=5000
```

## Quick Fixes

1. **Restart cả frontend và backend**
2. **Clear browser cache và localStorage**
3. **Kiểm tra network tab trong DevTools**
4. **Xem backend logs để tìm errors**



