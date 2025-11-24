# Tóm tắt các sửa lỗi Chat

## Các vấn đề đã sửa

### 1. ✅ Gọi chỉ hiển thị popup cho người được gọi

**Vấn đề**: Cả người gọi và người được gọi đều thấy popup call.

**Giải pháp**: 
- Thêm kiểm tra trong `handleCallOffer` để chỉ hiển thị popup khi `data.callerId !== user?.id`
- Người gọi không nhận được `call_offer` event (vì backend chỉ emit cho người được gọi)
- Người gọi thấy CallModal với controls (mute, video, end) nhưng không phải popup "incoming call"

**File đã sửa**: `FRONTEND/src/app/chat/page.tsx`
```typescript
// CHỈ hiển thị popup cho người được gọi (không phải người gọi)
if (data.callerId === user?.id) {
  console.log('📞 Ignoring call offer - this is our own call');
  return;
}
```

### 2. ✅ List hiển thị đúng người trong tin nhắn

**Vấn đề**: Danh sách conversations hiển thị sai người (có thể hiển thị chính user hiện tại thay vì người còn lại).

**Giải pháp**:
- Lọc ra user hiện tại khỏi participants
- Lấy người còn lại (không phải user hiện tại) để hiển thị tên và avatar
- Áp dụng cho cả avatar và tên trong conversation list

**File đã sửa**: `FRONTEND/src/app/chat/page.tsx`
```typescript
// Lấy người còn lại (không phải user hiện tại) trong direct conversation
const otherParticipant = conv.type === 'direct' 
  ? conv.participants?.find(p => p.user_id !== user?.id)
  : null;
```

### 3. ✅ Nhắn tin realtime (không cần reload)

**Vấn đề**: Messages không được nhận realtime, phải reload trang mới thấy.

**Giải pháp**:
1. **Cải thiện socket listeners**:
   - Sử dụng Set để quản lý callbacks, tránh duplicate
   - Tự động re-register listeners khi socket reconnect
   - Thêm backup listener trực tiếp trên socket

2. **Cải thiện message handling**:
   - Xử lý messages cho cả conversation đang xem và conversations khác
   - Cập nhật unread count cho conversations khác
   - Thêm logging chi tiết để debug

3. **Đảm bảo socket join rooms**:
   - Backend tự động join `user:${userId}` room khi connect
   - Backend tự động join tất cả conversation rooms của user
   - Frontend đảm bảo join conversation room khi select conversation

**Files đã sửa**:
- `FRONTEND/src/lib/socket.ts`: Cải thiện callback management
- `FRONTEND/src/app/chat/page.tsx`: Cải thiện message handling và logging

## Chi tiết kỹ thuật

### Socket Message Flow

1. **Backend emit**:
   - Emit đến `conversation:${id}` room (tất cả participants đã join)
   - Emit đến `user:${userId}` room (đảm bảo delivery cho từng user)

2. **Frontend receive**:
   - Listen qua `socketService.onNewMessage()` (managed callbacks)
   - Listen trực tiếp trên socket (backup)
   - Tự động re-register khi reconnect

### Conversation List Display

- **Direct conversation**: Hiển thị người còn lại (không phải user hiện tại)
- **Group conversation**: Hiển thị tên group
- **Avatar**: Lấy từ `otherParticipant.user.avatar_url`
- **Online status**: Hiển thị cho `otherParticipant.user_id`

### Call Flow

1. **Người gọi**:
   - Click call button → `startCall()`
   - `setIsIncomingCall(false)` → Không thấy popup "incoming"
   - Thấy CallModal với controls (mute, video, end)

2. **Người được gọi**:
   - Nhận `call_offer` event
   - Kiểm tra `callerId !== user.id` → Hiển thị popup
   - `setIsIncomingCall(true)` → Thấy nút Accept/Decline

## Testing

### Test nhắn tin realtime:
1. Mở 2 browser windows với 2 user khác nhau
2. Gửi message từ user A
3. Kiểm tra user B nhận message ngay lập tức (không cần reload)

### Test call:
1. User A gọi User B
2. User A: Thấy CallModal với controls (không phải popup incoming)
3. User B: Thấy popup "Incoming call" với nút Accept/Decline

### Test conversation list:
1. Kiểm tra conversation list hiển thị đúng tên người còn lại
2. Kiểm tra avatar hiển thị đúng
3. Kiểm tra online status hiển thị đúng

## Logs để debug

Tất cả các events quan trọng đều có logging:
- `📨 New message received via socket`
- `📞 Starting call`
- `📞 Ignoring call offer - this is our own call`
- `✅ Socket connected`
- `✅ Registered new_message listener`

Kiểm tra browser console để xem logs và debug nếu có vấn đề.
