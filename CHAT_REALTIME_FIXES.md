# Sửa lỗi Chat Realtime và Video Call

## Các vấn đề đã sửa

### 1. ✅ Messages hiển thị realtime ngay lập tức

**Vấn đề**: User 2 đang trong khung chat, nhận tin nhắn từ User 1 nhưng không hiển thị ngay, phải back rồi vào lại mới thấy.

**Giải pháp**:
1. **Cải thiện scroll logic**:
   - Sử dụng `requestAnimationFrame` và `setTimeout` để đảm bảo DOM được update
   - Scroll cả container và messagesEndRef
   - Force scroll khi có message mới

2. **Cải thiện message handling**:
   - Force scroll ngay sau khi add message
   - Đảm bảo messages được sort đúng
   - Thêm logging để debug

3. **Auto scroll khi vào conversation**:
   - Tự động scroll xuống cuối khi fetch messages
   - Tự động scroll khi select conversation

**Files đã sửa**:
- `FRONTEND/src/app/chat/page.tsx`:
  - Cải thiện `handleNewMessage` với force scroll
  - Cải thiện `fetchMessages` với auto scroll
  - Cải thiện scroll useEffect với requestAnimationFrame

### 2. ✅ Tự động scroll xuống tin nhắn cuối cùng

**Vấn đề**: Khi vào conversation, không tự động scroll xuống tin nhắn cuối cùng.

**Giải pháp**:
1. **Auto scroll khi fetch messages**:
   - Scroll xuống cuối sau khi fetch messages (300ms delay)
   - Sử dụng `behavior: 'auto'` để scroll nhanh

2. **Auto scroll khi select conversation**:
   - Scroll xuống cuối khi conversation được select (300ms delay)

3. **Scroll khi có message mới**:
   - Scroll smooth khi có message mới (100ms delay)

**Code changes**:
```typescript
// Auto scroll when fetching messages
setTimeout(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
}, 300);

// Auto scroll when selecting conversation
useEffect(() => {
  if (selectedConversation) {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 300);
  }
}, [selectedConversation]);
```

### 3. ✅ Gọi video hoạt động đúng

**Vấn đề**: Gọi video chưa hoạt động.

**Giải pháp**:
1. **Cải thiện video stream handling**:
   - Thêm logging chi tiết cho video tracks
   - Kiểm tra video tracks trước khi render
   - Thêm error handling cho video elements

2. **Cải thiện CallModal**:
   - Chỉ render video khi có video tracks
   - Thêm `onLoadedMetadata` và `onError` handlers
   - Đảm bảo video elements được play đúng cách

3. **Cải thiện WebRTC logging**:
   - Log khi nhận local/remote streams
   - Log số lượng video/audio tracks
   - Log track status (enabled, readyState)

**Files đã sửa**:
- `FRONTEND/src/app/chat/page.tsx`:
  - Thêm logging cho startCall và acceptCall
  - Log stream details
  
- `FRONTEND/src/components/chat/CallModal.tsx`:
  - Cải thiện video stream useEffect
  - Thêm checks cho video tracks
  - Thêm error handlers
  - Chỉ render video khi có tracks

## Chi tiết kỹ thuật

### Message Realtime Flow

1. **Socket nhận message**:
   - `handleNewMessage` được gọi
   - Kiểm tra conversation ID
   - Add message vào state

2. **Force update và scroll**:
   - Update messages state
   - Force scroll sau 50ms
   - useEffect scroll sau 100ms (backup)

3. **Auto scroll khi vào conversation**:
   - Fetch messages
   - Scroll sau 300ms
   - Đảm bảo scroll xuống cuối

### Video Call Flow

1. **Start call**:
   - Request user media (audio + video)
   - Create peer connection
   - Add tracks to peer connection
   - Create and send offer
   - Log stream details

2. **Accept call**:
   - Request user media (audio + video)
   - Create peer connection
   - Set remote description (offer)
   - Create and send answer
   - Log stream details

3. **Display video**:
   - Check if stream has video tracks
   - Set srcObject to video element
   - Play video
   - Handle errors

## Testing

### Test messages realtime:
1. User A và User B đang trong conversation
2. User A gửi message
3. User B thấy message ngay lập tức (không cần reload)
4. Tự động scroll xuống cuối

### Test auto scroll:
1. Vào conversation có nhiều messages
2. Kiểm tra tự động scroll xuống cuối
3. Gửi message mới
4. Kiểm tra tự động scroll xuống cuối

### Test video call:
1. User A gọi video User B
2. User B accept
3. Kiểm tra cả 2 bên thấy video
4. Kiểm tra local video (picture-in-picture)
5. Kiểm tra remote video (main view)

## Logs để debug

Tất cả các events quan trọng đều có logging:
- `📨 New message received via socket`
- `✅ Message is for current conversation, adding to messages`
- `📹 Local stream received`
- `📹 Remote stream received`
- `📹 Local video track: ... enabled: ... readyState: ...`
- `✅ Local video metadata loaded`
- `✅ Remote video metadata loaded`

Kiểm tra browser console để xem logs và debug nếu có vấn đề.

## Lưu ý

1. **Scroll timing**: Sử dụng delays để đảm bảo DOM được update trước khi scroll
2. **Video tracks**: Luôn kiểm tra video tracks trước khi render video element
3. **Error handling**: Tất cả video operations đều có error handling
4. **Permissions**: Đảm bảo user đã cấp quyền camera và microphone

